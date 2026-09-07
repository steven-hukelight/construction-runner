-- Some deployments store sign-in latitude/longitude/accuracy as TEXT (schema drift) while
-- last_location_* are numeric. `coalesce(last_location_lat, latitude)` then errors:
-- COALESCE types numeric and text cannot be matched.
-- Cast each branch to double precision; write back latitude/longitude/accuracy as text when those columns are text.

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
  threshold_sec double precision := 45;
  has_coords boolean;
  stale_ok boolean;
  site_found boolean;
  fence_source text;
  exit_ev timestamptz;
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
    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] --- latest open SIGN_IN row user_id=% activeAttendanceId=% site_id=% action=%',
      rec.user_id,
      rec.id,
      rec.site_id,
      rec.action;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] row_state exit_time=% exit_time_millis=% auto_sign_out=%',
      rec.exit_time,
      rec.exit_time_millis,
      rec.auto_sign_out;

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

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] lastLocation lat=% lng=% accuracy=%',
      use_lat,
      use_lng,
      use_acc;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] lastLocationTimestamp(raw)=% coalesce(created_at)=%',
      rec.last_location_timestamp,
      stale_ref;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] elapsed_sec=% timeoutThresholdSec=% stale_ok=%',
      elapsed_sec,
      threshold_sec,
      stale_ok;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] last_location_outside_fence=%',
      rec.last_location_outside_fence;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] Condition: has_coordinates=%',
      has_coords;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] Condition: stale_ok=%',
      stale_ok;

    IF NOT has_coords THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=%',
        rec.user_id,
        rec.id,
        'missing_last_location_or_signin_latlng';
      CONTINUE;
    END IF;

    IF NOT stale_ok THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=% details=%',
        rec.user_id,
        rec.id,
        'stale_below_threshold',
        jsonb_build_object(
          'elapsed_sec', elapsed_sec,
          'threshold_sec', threshold_sec,
          'stale_ref', stale_ref
        )::text;
      CONTINUE;
    END IF;

    SELECT * INTO site_row
    FROM public.sites s
    WHERE s.id::text = trim(both from coalesce(rec.site_id::text, ''))
    LIMIT 1;
    site_found := FOUND;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] Condition: site_row_exists=%',
      site_found;

    IF NOT site_found THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=%',
        rec.user_id,
        rec.id,
        'site_not_found_for_site_id';
      CONTINUE;
    END IF;

    IF rec.last_location_outside_fence IS NULL THEN
      outside_effective := NOT public.point_inside_site(use_lat, use_lng, use_acc, site_row);
      fence_source := 'legacy_point_inside_site';
    ELSE
      outside_effective := rec.last_location_outside_fence = true;
      fence_source := 'last_location_outside_fence_flag';
    END IF;

    inside_fence := NOT outside_effective;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] fence_eval source=% outside_effective=% inside_fence=%',
      fence_source,
      outside_effective,
      inside_fence;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] Condition: outsideFence=% (want true to trigger)',
      outside_effective;

    IF NOT outside_effective THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=%',
        rec.user_id,
        rec.id,
        'inside_fence_or_ping_said_inside';
      CONTINUE;
    END IF;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] TRIGGERING auto sign-out user_id=% attendance_id=%',
      rec.user_id,
      rec.id;

    exit_ev := coalesce(
      rec.last_location_timestamp,
      rec.created_at,
      rec.timestamp::timestamptz
    );

    meta := jsonb_build_object(
      'auto_sign_out', true,
      'exit_time', exit_ev,
      'exit_time_millis', (extract(epoch from exit_ev) * 1000)::bigint,
      'auto_sign_out_reason', 'fallback'
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
      auto_sign_out_reason = 'fallback',
      sign_out_time = now_ts,
      latitude = coalesce(use_lat::text, latitude::text),
      longitude = coalesce(use_lng::text, longitude::text),
      accuracy = coalesce(use_acc::text, accuracy::text),
      notes = CASE
        WHEN rec.notes IS NULL OR btrim(rec.notes) = '' THEN meta
        ELSE rec.notes || E'\n' || meta
      END
    WHERE id::text = rec.id::text;

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
