-- Section F: require clearance beyond polygon/circle edge before last_location_outside_fence = true.
-- Aligns large OS circular geofence with real polygon geometry (hysteresis).

CREATE OR REPLACE FUNCTION public._point_to_segment_distance_min_meters(
  p_lat double precision,
  p_lng double precision,
  a_lat double precision,
  a_lng double precision,
  b_lat double precision,
  b_lng double precision
) RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  best double precision := 1e18;
  i int;
  t double precision;
  slat double precision;
  slng double precision;
  d double precision;
BEGIN
  FOR i IN 0..24 LOOP
    t := i / 24.0;
    slat := a_lat + t * (b_lat - a_lat);
    slng := a_lng + t * (b_lng - a_lng);
    d := public._geo_distance_meters(p_lat, p_lng, slat, slng);
    IF d < best THEN
      best := d;
    END IF;
  END LOOP;
  RETURN best;
END;
$$;

CREATE OR REPLACE FUNCTION public._min_distance_to_polygon_boundary_meters(
  p_lat double precision,
  p_lng double precision,
  poly_lat double precision[],
  poly_lng double precision[]
) RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
AS $$
DECLARE
  n int;
  best double precision := 1e18;
  i int;
  a_lat double precision;
  a_lng double precision;
  b_lat double precision;
  b_lng double precision;
  d double precision;
  j int;
BEGIN
  IF poly_lat IS NULL OR poly_lng IS NULL THEN
    RETURN NULL;
  END IF;
  n := array_length(poly_lat, 1);
  IF n IS NULL OR n < 2 THEN
    RETURN NULL;
  END IF;
  FOR i IN 1..n LOOP
    a_lat := poly_lat[i];
    a_lng := poly_lng[i];
    j := CASE WHEN i = n THEN 1 ELSE i + 1 END;
    b_lat := poly_lat[j];
    b_lng := poly_lng[j];
    d := public._point_to_segment_distance_min_meters(p_lat, p_lng, a_lat, a_lng, b_lat, b_lng);
    IF d < best THEN
      best := d;
    END IF;
  END LOOP;
  RETURN best;
END;
$$;

DROP FUNCTION IF EXISTS public.attendance_apply_location_ping(text, double precision, double precision, double precision);

CREATE OR REPLACE FUNCTION public.attendance_apply_location_ping(
  p_attendance_id text,
  p_lat double precision,
  p_lng double precision,
  p_acc double precision,
  p_outside_threshold_m double precision DEFAULT 35
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
  outside_flag boolean;
  server_now timestamptz := clock_timestamp();
  aid text := trim(both from coalesce(p_attendance_id, ''));
  gf jsonb;
  loc jsonb;
  poly_lat double precision[];
  poly_lng double precision[];
  r record;
  acc double precision;
  center_lat double precision;
  center_lng double precision;
  dist double precision;
  radius double precision;
  eff_radius double precision;
  d_boundary double precision;
  clearance double precision;
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

  acc := coalesce(p_acc, 0);
  IF acc < 0 OR acc <> acc THEN
    acc := 0;
  END IF;

  inside_f := public.point_inside_site(
    p_lat,
    p_lng,
    acc::double precision,
    site_row
  );

  gf := site_row.geofence;
  loc := site_row.location;

  poly_lat := ARRAY[]::double precision[];
  poly_lng := ARRAY[]::double precision[];
  FOR r IN SELECT v_lat, v_lng FROM public._polygon_vertices_geofence(gf) LOOP
    poly_lat := array_append(poly_lat, r.v_lat);
    poly_lng := array_append(poly_lng, r.v_lng);
  END LOOP;

  IF array_length(poly_lat, 1) IS NULL OR array_length(poly_lat, 1) < 3 THEN
    poly_lat := ARRAY[]::double precision[];
    poly_lng := ARRAY[]::double precision[];
    FOR r IN SELECT v_lat, v_lng FROM public._polygon_vertices_location_geojson(loc) LOOP
      poly_lat := array_append(poly_lat, r.v_lat);
      poly_lng := array_append(poly_lng, r.v_lng);
    END LOOP;
  END IF;

  IF array_length(poly_lat, 1) IS NOT NULL AND array_length(poly_lat, 1) >= 3 THEN
    IF inside_f THEN
      outside_flag := false;
      clearance := 0;
    ELSE
      d_boundary := public._min_distance_to_polygon_boundary_meters(p_lat, p_lng, poly_lat, poly_lng);
      IF d_boundary IS NULL THEN
        outside_flag := NOT inside_f;
        clearance := NULL;
      ELSE
        clearance := d_boundary;
        outside_flag := d_boundary > p_outside_threshold_m;
      END IF;
    END IF;
  ELSE
    center_lat := NULL;
    center_lng := NULL;
    IF gf IS NOT NULL AND jsonb_typeof(gf -> 'center') = 'object' THEN
      SELECT * INTO center_lat, center_lng FROM public._vertex_from_jsonb(gf -> 'center');
    END IF;
    IF center_lat IS NULL AND loc IS NOT NULL AND jsonb_typeof(loc) = 'object' THEN
      center_lat := public._jsonb_num(loc, ARRAY['lat', 'latitude'], NULL::double precision);
      center_lng := public._jsonb_num(loc, ARRAY['lng', 'longitude', 'lon'], NULL::double precision);
    END IF;
    IF center_lat IS NULL AND site_row.latitude IS NOT NULL AND site_row.longitude IS NOT NULL THEN
      center_lat := site_row.latitude::double precision;
      center_lng := site_row.longitude::double precision;
    END IF;

    IF center_lat IS NULL OR center_lng IS NULL THEN
      outside_flag := NOT inside_f;
      clearance := NULL;
    ELSE
      radius := public._jsonb_num(
        coalesce(gf, '{}'::jsonb),
        ARRAY['radiusMeters', 'radius_meters'],
        NULL::double precision
      );
      IF radius IS NULL OR radius <= 0 THEN
        IF site_row.radius_meters IS NOT NULL AND (site_row.radius_meters)::double precision > 0 THEN
          radius := (site_row.radius_meters)::double precision;
        ELSE
          radius := 500::double precision;
        END IF;
      END IF;
      IF radius IS NULL OR radius <= 0 THEN
        radius := 500::double precision;
      END IF;

      eff_radius := greatest(20::double precision, radius - acc);
      dist := public._geo_distance_meters(p_lat, p_lng, center_lat, center_lng);

      IF inside_f THEN
        outside_flag := false;
        clearance := 0;
      ELSE
        clearance := greatest(0::double precision, dist - eff_radius);
        outside_flag := clearance > p_outside_threshold_m;
      END IF;
    END IF;
  END IF;

  UPDATE public.attendance
  SET
    last_location_lat = p_lat,
    last_location_lng = p_lng,
    last_location_accuracy = p_acc,
    last_location_timestamp = server_now,
    last_location_outside_fence = outside_flag
  WHERE id::text = aid;

  RETURN jsonb_build_object(
    'ok', true,
    'lastLocationTimestamp', server_now,
    'lastLocationOutsideFence', outside_flag,
    'insideFence', inside_f,
    'outsideThresholdMeters', p_outside_threshold_m,
    'outsideClearanceMeters', clearance
  );
END;
$$;

REVOKE ALL ON FUNCTION public.attendance_apply_location_ping(text, double precision, double precision, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attendance_apply_location_ping(text, double precision, double precision, double precision, double precision) TO service_role;
GRANT EXECUTE ON FUNCTION public.attendance_apply_location_ping(text, double precision, double precision, double precision, double precision) TO postgres;

REVOKE ALL ON FUNCTION public._point_to_segment_distance_min_meters(double precision, double precision, double precision, double precision, double precision, double precision) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._min_distance_to_polygon_boundary_meters(double precision, double precision, double precision[], double precision[]) FROM PUBLIC;
