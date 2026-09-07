-- Foreground location pings: store whether the last ping was outside the site fence.
-- Server fallback auto sign-out: require last_location_outside_fence = true AND stale > 45s
-- (or legacy NULL flag → keep computing outside from coordinates).

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS last_location_outside_fence boolean;

COMMENT ON COLUMN public.attendance.last_location_outside_fence IS
  'Server-computed from ping coordinates vs site geofence; true = last ping was outside the fence.';

CREATE OR REPLACE FUNCTION public.attendance_apply_location_ping(
  p_attendance_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_acc double precision
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.attendance%ROWTYPE;
  site_row public.sites%ROWTYPE;
  inside_f boolean;
  server_now timestamptz := clock_timestamp();
BEGIN
  SELECT * INTO rec FROM public.attendance WHERE id = p_attendance_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF NOT public._attendance_action_is_sign_in(rec.action) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_signed_in');
  END IF;

  SELECT * INTO site_row FROM public.sites s WHERE s.id::text = rec.site_id::text LIMIT 1;
  IF NOT FOUND THEN
    UPDATE public.attendance
    SET
      last_location_lat = p_lat,
      last_location_lng = p_lng,
      last_location_accuracy = p_acc,
      last_location_timestamp = server_now,
      last_location_outside_fence = NULL
    WHERE id = p_attendance_id;

    RETURN jsonb_build_object(
      'ok', true,
      'lastLocationTimestamp', server_now,
      'lastLocationOutsideFence', null,
      'siteMissing', true
    );
  END IF;

  inside_f := public.point_inside_site(
    p_lat,
    p_lng,
    coalesce(p_acc, 0)::double precision,
    site_row
  );

  UPDATE public.attendance
  SET
    last_location_lat = p_lat,
    last_location_lng = p_lng,
    last_location_accuracy = p_acc,
    last_location_timestamp = server_now,
    last_location_outside_fence = NOT inside_f
  WHERE id = p_attendance_id;

  RETURN jsonb_build_object(
    'ok', true,
    'lastLocationTimestamp', server_now,
    'lastLocationOutsideFence', NOT inside_f,
    'insideFence', inside_f
  );
END;
$$;

REVOKE ALL ON FUNCTION public.attendance_apply_location_ping(uuid, double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendance_apply_location_ping(uuid, double precision, double precision, double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.attendance_apply_location_ping(uuid, double precision, double precision, double precision) TO postgres;

-- Fallback sign-out: if last ping explicitly reported outside the fence (last_location_outside_fence = true)
-- and the ping is stale > 45s, close the session. If last_location_outside_fence IS NULL (legacy rows),
-- keep prior behaviour: stale + coordinates computed outside the fence.
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
  meta text;
  now_ts timestamptz := now();
  use_lat double precision;
  use_lng double precision;
  use_acc double precision;
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
    WHERE coalesce(a.last_location_lat, a.latitude) IS NOT NULL
      AND coalesce(a.last_location_lng, a.longitude) IS NOT NULL
      AND coalesce(a.last_location_timestamp, a.created_at) < (now_ts - interval '45 seconds')
  LOOP
    use_lat := coalesce(rec.last_location_lat, rec.latitude)::double precision;
    use_lng := coalesce(rec.last_location_lng, rec.longitude)::double precision;
    use_acc := coalesce(rec.last_location_accuracy, rec.accuracy, 0)::double precision;

    SELECT * INTO site_row FROM public.sites s WHERE s.id::text = rec.site_id::text LIMIT 1;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF rec.last_location_outside_fence IS NULL THEN
      outside_effective := NOT public.point_inside_site(use_lat, use_lng, use_acc, site_row);
    ELSE
      outside_effective := rec.last_location_outside_fence = true;
    END IF;

    IF NOT outside_effective THEN
      CONTINUE;
    END IF;

    RAISE LOG 'attendance_fallback_auto_sign_out attendance_id=% user_id=% last_location_timestamp=% last_location_outside_fence=% use_lat=% use_lng=% reason=%',
      rec.id,
      rec.user_id,
      rec.last_location_timestamp,
      rec.last_location_outside_fence,
      use_lat,
      use_lng,
      CASE
        WHEN rec.last_location_outside_fence IS NULL THEN 'stale_coords_outside_legacy'
        ELSE 'stale_last_ping_marked_outside'
      END;

    meta := jsonb_build_object(
      'auto_sign_out', true,
      'exit_time', coalesce(rec.last_location_timestamp, rec.created_at, rec.timestamp),
      'exit_time_millis', (extract(epoch from coalesce(rec.last_location_timestamp, rec.created_at, rec.timestamp)) * 1000)::bigint,
      'auto_sign_out_reason', 'fallback'
    )::text;

    UPDATE public.attendance
    SET
      action = 'SIGN OUT',
      exit_time = coalesce(rec.last_location_timestamp, rec.created_at, rec.timestamp),
      exit_time_millis = (extract(epoch from coalesce(rec.last_location_timestamp, rec.created_at, rec.timestamp)) * 1000)::bigint,
      exit_lat = use_lat,
      exit_lng = use_lng,
      exit_accuracy = use_acc,
      auto_sign_out = true,
      auto_sign_out_reason = 'fallback',
      sign_out_time = now_ts,
      latitude = coalesce(use_lat, latitude),
      longitude = coalesce(use_lng, longitude),
      accuracy = coalesce(use_acc, accuracy),
      notes = CASE
        WHEN rec.notes IS NULL OR btrim(rec.notes) = '' THEN meta
        ELSE rec.notes || E'\n' || meta
      END
    WHERE id = rec.id;

    INSERT INTO public.notifications (user_id, topic, type, title, body, data, sent_at)
    VALUES (
      rec.user_id,
      'attendance',
      'attendance_auto_sign_out',
      'Attendance',
      'You were signed out after leaving the site boundary.',
      jsonb_build_object('type', 'attendance_auto_sign_out', 'reason', 'fallback'),
      now_ts
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.perform_attendance_fallback() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.perform_attendance_fallback() TO postgres;
GRANT EXECUTE ON FUNCTION public.perform_attendance_fallback() TO service_role;
