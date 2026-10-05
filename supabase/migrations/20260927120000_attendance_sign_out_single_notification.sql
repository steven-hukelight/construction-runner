-- attendance_immediate_geofence_exit_sign_out: refuse a SIGN IN that already has a later
-- SIGN OUT row. The app inserts its own SIGN OUT row, so a trailing location ping must not
-- close the original SIGN IN a second time (duplicate record + second push).

CREATE OR REPLACE FUNCTION public.attendance_immediate_geofence_exit_sign_out(p_attendance_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF EXISTS (
    SELECT 1
    FROM public.attendance later
    WHERE later.user_id = rec.user_id
      AND later.id IS DISTINCT FROM rec.id
      AND public._attendance_action_is_sign_out(later.action)
      AND coalesce(later.timestamp, later.created_at)
          >= coalesce(rec.timestamp, rec.created_at)
  ) THEN
    RAISE LOG '[AUTO-SIGN-OUT][IMMEDIATE] skipped attendance_id=% reason=later_sign_out_already_exists', rec.id;
    RETURN jsonb_build_object('ok', false, 'error', 'later_sign_out_exists');
  END IF;

  IF coalesce(rec.last_location_outside_fence, false) IS NOT TRUE THEN
    RAISE LOG '[AUTO-SIGN-OUT][IMMEDIATE] skipped attendance_id=% reason=outside_flag_not_set', rec.id;
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
    RAISE LOG '[AUTO-SIGN-OUT][IMMEDIATE] skipped attendance_id=% reason=missing_coordinates', rec.id;
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

  RAISE LOG '[AUTO-SIGN-OUT][IMMEDIATE] signed_out attendance_id=% user_id=% trigger_source=server_geofence', rec.id, rec.user_id;

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
$function$;
