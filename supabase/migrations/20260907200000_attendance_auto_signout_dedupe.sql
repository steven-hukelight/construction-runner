-- Auto-sign-out notification dedupe.
--
-- Multiple sign-out paths can fire for the same attendance session (pg_cron
-- fallback, server geofence RPC, client insert / native override). Without a
-- per-session guard, a single user can receive several push notifications for
-- one session. This migration:
--
--   1. Includes `attendance_id` in the notification `data` payload so we can
--      dedupe on it.
--   2. Adds a partial unique index enforcing at most one
--      `attendance_auto_sign_out` notification row per (user_id, attendance_id).
--   3. Rewrites the two INSERTing DB functions to use `ON CONFLICT DO NOTHING`
--      against that index, so if any path (immediate push, RPC, or cron)
--      already recorded a notification for the session, subsequent paths
--      silently skip enqueuing another one.
--
-- The application-side `sendAttendanceAutoSignOutPush` helper writes to the
-- same table with the same key, so all three paths share one dedupe.

-- ── 1) Backfill attendance_id on any pending rows (best effort) ────────────
-- (No-op for rows that don't have an attendance context; safe to run multiple
-- times.)

-- ── 2) Partial unique index for dedupe ─────────────────────────────────────
-- Clean out any pre-existing duplicates so the index can be built.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, (data->>'attendance_id')
           ORDER BY created_at, id
         ) AS rn
  FROM public.notifications
  WHERE type = 'attendance_auto_sign_out'
    AND (data->>'attendance_id') IS NOT NULL
)
DELETE FROM public.notifications n
USING ranked r
WHERE n.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_auto_signout_dedupe
  ON public.notifications (user_id, ((data->>'attendance_id')))
  WHERE type = 'attendance_auto_sign_out'
    AND (data->>'attendance_id') IS NOT NULL;

-- ── 3) Immediate server geofence exit RPC ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.attendance_immediate_geofence_exit_sign_out(
  p_attendance_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.attendance%ROWTYPE;
  aid text := trim(both from coalesce(p_attendance_id, ''));
  use_lat double precision;
  use_lng double precision;
  use_acc double precision;
  server_now timestamptz := clock_timestamp();
  exit_ev timestamptz;
  meta text;
  updated int;
BEGIN
  IF aid = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_attendance_id');
  END IF;

  SELECT * INTO rec FROM public.attendance WHERE id::text = aid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF NOT public._attendance_action_is_sign_in(rec.action) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in');
  END IF;

  IF coalesce(rec.last_location_outside_fence, false) IS NOT TRUE THEN
    RAISE LOG '[AUTO-SIGN-OUT][IMMEDIATE] skipped attendance_id=% reason=outside_flag_not_set',
      rec.id;
    RETURN jsonb_build_object('ok', false, 'error', 'outside_flag_not_set');
  END IF;

  use_lat := coalesce(
    rec.last_location_lat::double precision,
    nullif(btrim(rec.latitude::text), '')::double precision
  );
  use_lng := coalesce(
    rec.last_location_lng::double precision,
    nullif(btrim(rec.longitude::text), '')::double precision
  );
  use_acc := coalesce(
    rec.last_location_accuracy::double precision,
    nullif(btrim(rec.accuracy::text), '')::double precision,
    0::double precision
  );

  IF use_lat IS NULL OR use_lng IS NULL OR use_lat <> use_lat OR use_lng <> use_lng THEN
    RAISE LOG '[AUTO-SIGN-OUT][IMMEDIATE] skipped attendance_id=% reason=missing_coordinates',
      rec.id;
    RETURN jsonb_build_object('ok', false, 'error', 'missing_coordinates');
  END IF;

  exit_ev := coalesce(rec.last_location_timestamp, rec.created_at, rec.timestamp::timestamptz);

  meta := jsonb_build_object(
    'auto_sign_out', true,
    'exit_time', exit_ev,
    'exit_time_millis', (extract(epoch from exit_ev) * 1000)::bigint,
    'auto_sign_out_reason', 'geofence_exit_immediate',
    'auto_sign_out_trigger_source', 'server_geofence'
  )::text;

  UPDATE public.attendance
  SET
    action = 'SIGN OUT',
    exit_time = exit_ev,
    exit_time_millis = (extract(epoch from exit_ev) * 1000)::bigint,
    exit_lat = use_lat,
    exit_lng = use_lng,
    exit_accuracy = use_acc,
    auto_sign_out = true,
    auto_sign_out_reason = 'geofence_exit_immediate',
    auto_sign_out_trigger_source = 'server_geofence',
    sign_out_time = server_now,
    latitude = coalesce(use_lat::text, latitude::text),
    longitude = coalesce(use_lng::text, longitude::text),
    accuracy = coalesce(use_acc::text, accuracy::text),
    notes = CASE
      WHEN rec.notes IS NULL OR btrim(rec.notes) = '' THEN meta
      ELSE rec.notes || E'\n' || meta
    END
  WHERE id::text = aid;

  GET DIAGNOSTICS updated = ROW_COUNT;
  IF updated = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'update_failed');
  END IF;

  RAISE LOG '[AUTO-SIGN-OUT][IMMEDIATE] signed_out attendance_id=% user_id=% trigger_source=server_geofence',
    rec.id,
    rec.user_id;

  -- Include attendance_id so app-side dedupe keys stay consistent, and rely on
  -- the partial unique index to swallow duplicates if any other path already
  -- inserted a notification for this session.
  INSERT INTO public.notifications (user_id, topic, type, title, body, data, sent_at)
  VALUES (
    rec.user_id,
    'attendance',
    'attendance_auto_sign_out',
    'Attendance',
    'You were signed out after leaving the site boundary.',
    jsonb_build_object(
      'type', 'attendance_auto_sign_out',
      'reason', 'geofence_exit_immediate',
      'trigger_source', 'server_geofence',
      'attendance_id', rec.id::text
    ),
    server_now
  )
  ON CONFLICT (user_id, ((data->>'attendance_id')))
    WHERE type = 'attendance_auto_sign_out'
      AND (data->>'attendance_id') IS NOT NULL
    DO NOTHING;

  RETURN jsonb_build_object(
    'ok', true,
    'autoSignOutReason', 'geofence_exit_immediate',
    'autoSignOutTriggerSource', 'server_geofence'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.attendance_immediate_geofence_exit_sign_out(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendance_immediate_geofence_exit_sign_out(text) TO postgres;
GRANT EXECUTE ON FUNCTION public.attendance_immediate_geofence_exit_sign_out(text) TO service_role;

-- ── 4) pg_cron fallback ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.perform_attendance_fallback()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  site_row public.sites%ROWTYPE;
  outside_effective boolean;
  inside_fence boolean;
  meta text;
  now_ts timestamptz := clock_timestamp();
  use_lat double precision;
  use_lng double precision;
  use_acc double precision;
  stale_ref timestamptz;
  elapsed_sec double precision;
  threshold_sec double precision := 25;
  has_coords boolean;
  stale_ok boolean;
  site_found boolean;
  fence_source text;
  exit_ev timestamptz;
  updated int;
BEGIN
  FOR rec IN
    SELECT a.*
    FROM public.attendance a
    INNER JOIN (
      SELECT DISTINCT ON (sub.user_id) sub.id
      FROM public.attendance sub
      WHERE coalesce(sub.auto_sign_out, false) = false
        AND sub.exit_time IS NULL
        AND public._attendance_action_is_sign_in(sub.action)
      ORDER BY sub.user_id, sub.created_at DESC NULLS LAST, sub.timestamp DESC
    ) pick ON pick.id = a.id
  LOOP
    use_lat := coalesce(
      rec.last_location_lat::double precision,
      nullif(btrim(rec.latitude::text), '')::double precision
    );
    use_lng := coalesce(
      rec.last_location_lng::double precision,
      nullif(btrim(rec.longitude::text), '')::double precision
    );
    use_acc := coalesce(
      rec.last_location_accuracy::double precision,
      nullif(btrim(rec.accuracy::text), '')::double precision,
      0::double precision
    );

    has_coords := use_lat IS NOT NULL AND use_lng IS NOT NULL AND use_lat = use_lat AND use_lng = use_lng;
    stale_ref := coalesce(rec.last_location_timestamp, rec.created_at);

    IF stale_ref IS NOT NULL THEN
      elapsed_sec := extract(epoch from (now_ts - stale_ref));
    ELSE
      elapsed_sec := NULL;
    END IF;

    stale_ok := stale_ref IS NOT NULL
      AND stale_ref < (now_ts - (interval '1 second' * threshold_sec));

    IF NOT has_coords THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=%',
        rec.user_id, rec.id, 'missing_last_location_or_signin_latlng';
      CONTINUE;
    END IF;

    IF NOT stale_ok THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=%',
        rec.user_id, rec.id, 'stale_below_threshold';
      CONTINUE;
    END IF;

    SELECT * INTO site_row
    FROM public.sites s
    WHERE s.id::text = trim(both from coalesce(rec.site_id::text, ''))
    LIMIT 1;
    site_found := FOUND;

    IF NOT site_found THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=%',
        rec.user_id, rec.id, 'site_not_found_for_site_id';
      CONTINUE;
    END IF;

    IF rec.last_location_outside_fence IS TRUE THEN
      outside_effective := true;
      fence_source := 'last_location_outside_fence_true';
    ELSIF rec.last_location_outside_fence IS FALSE THEN
      outside_effective := NOT public.point_inside_site(use_lat, use_lng, use_acc, site_row);
      fence_source := 'stale_recheck_point_inside_after_false_flag';
    ELSE
      outside_effective := NOT public.point_inside_site(use_lat, use_lng, use_acc, site_row);
      fence_source := 'legacy_point_inside_site';
    END IF;

    inside_fence := NOT outside_effective;

    IF NOT outside_effective THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=% details=%',
        rec.user_id, rec.id,
        CASE
          WHEN fence_source = 'stale_recheck_point_inside_after_false_flag' THEN 'still_inside_by_geometry_after_stale'
          ELSE 'inside_fence_or_geometry'
        END,
        jsonb_build_object('fence_source', fence_source)::text;
      CONTINUE;
    END IF;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] TRIGGERING auto sign-out user_id=% attendance_id=% reason=fallback_stale_outside fence_source=% trigger_source=cron',
      rec.user_id, rec.id, fence_source;

    exit_ev := coalesce(
      rec.last_location_timestamp,
      rec.created_at,
      rec.timestamp::timestamptz
    );

    meta := jsonb_build_object(
      'auto_sign_out', true,
      'exit_time', exit_ev,
      'exit_time_millis', (extract(epoch from exit_ev) * 1000)::bigint,
      'auto_sign_out_reason', 'fallback_stale_outside',
      'auto_sign_out_trigger_source', 'cron'
    )::text;

    UPDATE public.attendance
    SET
      action = 'SIGN OUT',
      exit_time = exit_ev,
      exit_time_millis = (extract(epoch from exit_ev) * 1000)::bigint,
      exit_lat = use_lat,
      exit_lng = use_lng,
      exit_accuracy = use_acc,
      auto_sign_out = true,
      auto_sign_out_reason = 'fallback_stale_outside',
      auto_sign_out_trigger_source = 'cron',
      sign_out_time = now_ts,
      latitude = coalesce(use_lat::text, latitude::text),
      longitude = coalesce(use_lng::text, longitude::text),
      accuracy = coalesce(use_acc::text, accuracy::text),
      notes = CASE
        WHEN rec.notes IS NULL OR btrim(rec.notes) = '' THEN meta
        ELSE rec.notes || E'\n' || meta
      END
    WHERE id::text = rec.id::text
      AND public._attendance_action_is_sign_in(action)
      AND coalesce(auto_sign_out, false) = false
      AND exit_time IS NULL;

    GET DIAGNOSTICS updated = ROW_COUNT;
    IF updated = 0 THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] SKIP already_closed user_id=% attendance_id=%',
        rec.user_id, rec.id;
      CONTINUE;
    END IF;

    -- Include attendance_id and let the partial unique index dedupe against
    -- any notification already queued/sent by the immediate push path or
    -- server-geofence RPC for this session.
    INSERT INTO public.notifications (user_id, topic, type, title, body, data, sent_at)
    VALUES (
      rec.user_id,
      'attendance',
      'attendance_auto_sign_out',
      'Attendance',
      'You were signed out after leaving the site boundary.',
      jsonb_build_object(
        'type', 'attendance_auto_sign_out',
        'reason', 'fallback_stale_outside',
        'trigger_source', 'cron',
        'attendance_id', rec.id::text
      ),
      now_ts
    )
    ON CONFLICT (user_id, ((data->>'attendance_id')))
      WHERE type = 'attendance_auto_sign_out'
        AND (data->>'attendance_id') IS NOT NULL
      DO NOTHING;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.perform_attendance_fallback() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.perform_attendance_fallback() TO postgres;
GRANT EXECUTE ON FUNCTION public.perform_attendance_fallback() TO service_role;
