-- Align server fallback auto sign-out with:
-- - 45s since last location activity (was 10 minutes)
-- - Latest open SIGN_IN row per user (created_at DESC, timestamp DESC) — matches app/API ordering
-- - Staleness uses coalesce(last_location_timestamp, created_at); position uses last_location_* or sign-in lat/lng
-- - pg_cron every minute so 45s threshold can be honored (was */5)

CREATE OR REPLACE FUNCTION public.perform_attendance_fallback()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  site_row public.sites%ROWTYPE;
  outside boolean;
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

    outside := NOT public.point_inside_site(
      use_lat,
      use_lng,
      use_acc,
      site_row
    );

    IF NOT outside THEN
      CONTINUE;
    END IF;

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

-- Reschedule cron: every minute (was every 5 minutes)
DO $cron_unsched$
DECLARE
  jid bigint;
BEGIN
  FOR jid IN SELECT jobid FROM cron.job WHERE jobname = 'attendance_fallback'
  LOOP
    PERFORM cron.unschedule(jid);
  END LOOP;
END;
$cron_unsched$;

SELECT cron.schedule(
  'attendance_fallback',
  '* * * * *',
  $$SELECT public.perform_attendance_fallback();$$
);
