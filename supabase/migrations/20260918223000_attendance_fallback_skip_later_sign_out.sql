-- App/native sign-out inserts a new SIGN OUT row and leaves the original
-- SIGN IN open (exit_time null). pg_cron then treated that orphan as still
-- on shift and closed it 12h later with fallback_max_shift — duplicate
-- sign-out for Tom/Richard on 18 Sep 2026. Skip any SIGN IN that already
-- has a later SIGN OUT for the same user.

CREATE OR REPLACE FUNCTION public._attendance_action_is_sign_out(p_action text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(replace(coalesce(trim(p_action), ''), ' ', '_')) IN
    ('SIGN_OUT', 'OUT', 'SIGNOUT', 'CHECKOUT');
$$;

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
  threshold_sec double precision := 120;
  max_shift_sec double precision := 12 * 3600;
  has_coords boolean;
  stale_ok boolean;
  site_found boolean;
  fence_source text;
  close_reason text;
  sign_in_ref timestamptz;
  session_age_sec double precision;
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
        AND NOT EXISTS (
          SELECT 1
          FROM public.attendance later
          WHERE later.user_id = sub.user_id
            AND later.id IS DISTINCT FROM sub.id
            AND public._attendance_action_is_sign_out(later.action)
            AND coalesce(later.timestamp, later.created_at)
                >= coalesce(sub.timestamp, sub.created_at)
        )
      ORDER BY sub.user_id, sub.created_at DESC NULLS LAST, sub.timestamp DESC
    ) pick ON pick.id = a.id
  LOOP
    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] --- latest open SIGN_IN row user_id=% activeAttendanceId=% site_id=% action=%',
      rec.user_id, rec.id, rec.site_id, rec.action;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] row_state exit_time=% exit_time_millis=% auto_sign_out=%',
      rec.exit_time, rec.exit_time_millis, rec.auto_sign_out;

    IF EXISTS (
      SELECT 1
      FROM public.attendance later
      WHERE later.user_id = rec.user_id
        AND later.id IS DISTINCT FROM rec.id
        AND public._attendance_action_is_sign_out(later.action)
        AND coalesce(later.timestamp, later.created_at)
            >= coalesce(rec.timestamp, rec.created_at)
    ) THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=later_sign_out_already_exists',
        rec.user_id, rec.id;
      CONTINUE;
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

    has_coords := use_lat IS NOT NULL AND use_lng IS NOT NULL AND use_lat = use_lat AND use_lng = use_lng;

    stale_ref := coalesce(
      rec.last_location_timestamp,
      rec.created_at,
      rec.timestamp::timestamptz
    );

    IF stale_ref IS NOT NULL THEN
      elapsed_sec := extract(epoch from (now_ts - stale_ref));
    ELSE
      elapsed_sec := NULL;
    END IF;

    stale_ok := stale_ref IS NOT NULL
      AND stale_ref < (now_ts - (interval '1 second' * threshold_sec));

    sign_in_ref := coalesce(rec.timestamp::timestamptz, rec.created_at, rec.last_location_timestamp);
    IF sign_in_ref IS NOT NULL THEN
      session_age_sec := extract(epoch from (now_ts - sign_in_ref));
    ELSE
      session_age_sec := NULL;
    END IF;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] lastLocation lat=% lng=% accuracy=%',
      use_lat, use_lng, use_acc;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] lastLocationTimestamp(raw)=% coalesce(created_at,timestamp)=%',
      rec.last_location_timestamp, stale_ref;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] elapsed_sec=% timeoutThresholdSec=% stale_ok=% session_age_sec=%',
      elapsed_sec, threshold_sec, stale_ok, session_age_sec;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] last_location_outside_fence=%',
      rec.last_location_outside_fence;

    IF NOT has_coords THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=%',
        rec.user_id, rec.id, 'missing_last_location_or_signin_latlng';
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

    IF use_acc > 80 THEN
      outside_effective := false;
      fence_source := 'accuracy_too_poor_to_confirm_exit';
    ELSIF rec.last_location_outside_fence IS TRUE THEN
      outside_effective := true;
      fence_source := 'last_location_outside_fence_true';
    ELSE
      outside_effective := public.point_definitely_outside_site(
        use_lat, use_lng, use_acc, site_row
      );
      fence_source := CASE
        WHEN rec.last_location_outside_fence IS FALSE
          THEN 'stale_recheck_definitely_outside_after_false_flag'
        ELSE 'legacy_definitely_outside'
      END;
    END IF;

    inside_fence := NOT outside_effective;
    close_reason := NULL;

    IF outside_effective AND stale_ok THEN
      close_reason := 'fallback_stale_outside';
    ELSIF session_age_sec IS NOT NULL AND session_age_sec >= max_shift_sec THEN
      close_reason := 'fallback_max_shift';
      fence_source := 'max_shift_12h';
    END IF;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] fence_eval source=% outside_effective=% inside_fence=% close_reason=%',
      fence_source, outside_effective, inside_fence, close_reason;

    IF close_reason IS NULL THEN
      IF NOT stale_ok THEN
        RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=% details=%',
          rec.user_id, rec.id, 'stale_below_threshold',
          jsonb_build_object(
            'elapsed_sec', elapsed_sec,
            'threshold_sec', threshold_sec,
            'stale_ref', stale_ref,
            'session_age_sec', session_age_sec
          )::text;
      ELSE
        RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=% details=%',
          rec.user_id, rec.id, 'inside_fence_below_max_shift',
          jsonb_build_object(
            'fence_source', fence_source,
            'session_age_sec', session_age_sec,
            'max_shift_sec', max_shift_sec
          )::text;
      END IF;
      CONTINUE;
    END IF;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] TRIGGERING auto sign-out user_id=% attendance_id=% reason=% fence_source=% trigger_source=cron',
      rec.user_id, rec.id, close_reason, fence_source;

    IF close_reason = 'fallback_max_shift' THEN
      exit_ev := now_ts;
    ELSE
      exit_ev := coalesce(
        rec.last_location_timestamp,
        rec.created_at,
        rec.timestamp::timestamptz,
        now_ts
      );
    END IF;

    meta := jsonb_build_object(
      'auto_sign_out', true,
      'exit_time', exit_ev,
      'exit_time_millis', (extract(epoch from exit_ev) * 1000)::bigint,
      'auto_sign_out_reason', close_reason,
      'auto_sign_out_trigger_source', 'cron',
      'last_seen_at', rec.last_location_timestamp,
      'last_location_outside_fence', rec.last_location_outside_fence
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
      auto_sign_out_reason = close_reason,
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
      AND exit_time IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.attendance later
        WHERE later.user_id = rec.user_id
          AND later.id IS DISTINCT FROM rec.id
          AND public._attendance_action_is_sign_out(later.action)
          AND coalesce(later.timestamp, later.created_at)
              >= coalesce(rec.timestamp, rec.created_at)
      );

    GET DIAGNOSTICS updated = ROW_COUNT;
    IF updated = 0 THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] SKIP already_closed user_id=% attendance_id=% (session ended before update)',
        rec.user_id, rec.id;
      CONTINUE;
    END IF;

    INSERT INTO public.notifications (user_id, topic, type, title, body, data, sent_at)
    VALUES (
      rec.user_id,
      'attendance',
      'attendance_auto_sign_out',
      'Attendance',
      CASE
        WHEN close_reason = 'fallback_max_shift'
          THEN 'You were signed out after a 12-hour open shift with no confirmed site exit.'
        ELSE 'You were signed out after leaving the site boundary.'
      END,
      jsonb_build_object(
        'type', 'attendance_auto_sign_out',
        'reason', close_reason,
        'trigger_source', 'cron',
        'attendance_id', rec.id::text
      ),
      now_ts
    )
    ON CONFLICT (user_id, ((data->>'attendance_id')))
      WHERE type = 'attendance_auto_sign_out'
        AND (data->>'attendance_id') IS NOT NULL
      DO NOTHING;

    PERFORM public.send_attendance_auto_sign_out_push(
      rec.user_id::text,
      'Signed out',
      CASE
        WHEN close_reason = 'fallback_max_shift'
          THEN 'You were signed out after a 12-hour open shift with no confirmed site exit.'
        ELSE 'You were signed out after leaving the site boundary.'
      END,
      rec.id::text,
      close_reason
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public._attendance_action_is_sign_out(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._attendance_action_is_sign_out(text) TO postgres;
GRANT EXECUTE ON FUNCTION public._attendance_action_is_sign_out(text) TO service_role;

REVOKE ALL ON FUNCTION public.perform_attendance_fallback() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.perform_attendance_fallback() TO postgres;
GRANT EXECUTE ON FUNCTION public.perform_attendance_fallback() TO service_role;
