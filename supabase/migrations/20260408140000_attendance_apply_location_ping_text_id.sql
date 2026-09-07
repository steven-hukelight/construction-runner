-- attendance.id may be TEXT (opaque ids) while this RPC used p_attendance_id uuid.
-- `WHERE id = p_attendance_id` then fails: operator does not exist: text = uuid.
-- Replace with a text parameter and compare via id::text (works for uuid or text id columns).

DROP FUNCTION IF EXISTS public.attendance_apply_location_ping(uuid, double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION public.attendance_apply_location_ping(
  p_attendance_id text,
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
  aid text := trim(both from coalesce(p_attendance_id, ''));
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

  SELECT * INTO site_row
  FROM public.sites s
  WHERE s.id::text = trim(both from coalesce(rec.site_id::text, ''))
  LIMIT 1;

  IF NOT FOUND THEN
    UPDATE public.attendance
    SET
      last_location_lat = p_lat,
      last_location_lng = p_lng,
      last_location_accuracy = p_acc,
      last_location_timestamp = server_now,
      last_location_outside_fence = NULL
    WHERE id::text = aid;

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
  WHERE id::text = aid;

  RETURN jsonb_build_object(
    'ok', true,
    'lastLocationTimestamp', server_now,
    'lastLocationOutsideFence', NOT inside_f,
    'insideFence', inside_f
  );
END;
$$;

REVOKE ALL ON FUNCTION public.attendance_apply_location_ping(text, double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendance_apply_location_ping(text, double precision, double precision, double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.attendance_apply_location_ping(text, double precision, double precision, double precision) TO postgres;
