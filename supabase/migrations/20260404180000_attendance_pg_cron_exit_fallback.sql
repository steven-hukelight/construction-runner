-- Exit-time fallback: column names aligned with API, sign_out_time, notifications queue,
-- pg_cron + perform_attendance_fallback() (in-DB geofence check, same rules as siteGeofenceServer.ts).

-- ── 1) Rename columns (idempotent) ─────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'last_known_latitude'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'last_location_lat'
  ) THEN
    ALTER TABLE public.attendance RENAME COLUMN last_known_latitude TO last_location_lat;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'last_known_longitude'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'last_location_lng'
  ) THEN
    ALTER TABLE public.attendance RENAME COLUMN last_known_longitude TO last_location_lng;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'last_known_accuracy'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'last_location_accuracy'
  ) THEN
    ALTER TABLE public.attendance RENAME COLUMN last_known_accuracy TO last_location_accuracy;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'last_activity_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'last_location_timestamp'
  ) THEN
    ALTER TABLE public.attendance RENAME COLUMN last_activity_at TO last_location_timestamp;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'exit_latitude'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'exit_lat'
  ) THEN
    ALTER TABLE public.attendance RENAME COLUMN exit_latitude TO exit_lat;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'exit_longitude'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'exit_lng'
  ) THEN
    ALTER TABLE public.attendance RENAME COLUMN exit_longitude TO exit_lng;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_archive' AND column_name = 'last_known_latitude'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_archive' AND column_name = 'last_location_lat'
  ) THEN
    ALTER TABLE public.attendance_archive RENAME COLUMN last_known_latitude TO last_location_lat;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_archive' AND column_name = 'last_known_longitude'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_archive' AND column_name = 'last_location_lng'
  ) THEN
    ALTER TABLE public.attendance_archive RENAME COLUMN last_known_longitude TO last_location_lng;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_archive' AND column_name = 'last_known_accuracy'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_archive' AND column_name = 'last_location_accuracy'
  ) THEN
    ALTER TABLE public.attendance_archive RENAME COLUMN last_known_accuracy TO last_location_accuracy;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_archive' AND column_name = 'last_activity_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_archive' AND column_name = 'last_location_timestamp'
  ) THEN
    ALTER TABLE public.attendance_archive RENAME COLUMN last_activity_at TO last_location_timestamp;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_archive' AND column_name = 'exit_latitude'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_archive' AND column_name = 'exit_lat'
  ) THEN
    ALTER TABLE public.attendance_archive RENAME COLUMN exit_latitude TO exit_lat;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_archive' AND column_name = 'exit_longitude'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'attendance_archive' AND column_name = 'exit_lng'
  ) THEN
    ALTER TABLE public.attendance_archive RENAME COLUMN exit_longitude TO exit_lng;
  END IF;
END $$;

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS last_location_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_location_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_location_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_location_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exit_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS exit_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS sign_out_time TIMESTAMPTZ;

ALTER TABLE public.attendance_archive
  ADD COLUMN IF NOT EXISTS last_location_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_location_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_location_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_location_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exit_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS exit_lng DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS sign_out_time TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_attendance_auto_sign_out ON public.attendance (auto_sign_out);
CREATE INDEX IF NOT EXISTS idx_attendance_last_location_timestamp ON public.attendance (last_location_timestamp);

-- ── 2) Notifications queue (push / in-app; edge-function placeholders expect this name) ──
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  topic TEXT,
  type TEXT NOT NULL DEFAULT 'push',
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  push_dispatched_at TIMESTAMPTZ
);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS push_dispatched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_push_pending
  ON public.notifications (created_at DESC)
  WHERE push_dispatched_at IS NULL AND user_id IS NOT NULL;

-- ── 3) Geofence helpers (polygon or circle + radius, aligned with siteGeofenceServer) ──
CREATE OR REPLACE FUNCTION public._geo_distance_meters(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
) RETURNS double precision
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT (
    6371000.0 * 2.0 * asin(sqrt(
      power(sin(radians(lat2 - lat1) / 2.0), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2.0), 2)
    ))
  )::double precision;
$$;

CREATE OR REPLACE FUNCTION public._jsonb_num(obj jsonb, keys text[], fallback double precision)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  k text;
  v text;
BEGIN
  IF obj IS NULL THEN RETURN fallback; END IF;
  FOREACH k IN ARRAY keys LOOP
    v := obj ->> k;
    IF v IS NOT NULL AND v <> '' AND v ~ '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' THEN
      RETURN v::double precision;
    END IF;
  END LOOP;
  RETURN fallback;
END;
$$;

CREATE OR REPLACE FUNCTION public._vertex_from_jsonb(pt jsonb, OUT lat double precision, OUT lng double precision)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  m jsonb;
BEGIN
  lat := NULL;
  lng := NULL;
  IF pt IS NULL OR jsonb_typeof(pt) <> 'object' THEN RETURN; END IF;
  m := pt;
  lat := public._jsonb_num(m, ARRAY['lat', 'latitude'], NULL::double precision);
  lng := public._jsonb_num(m, ARRAY['lng', 'longitude', 'lon'], NULL::double precision);
END;
$$;

CREATE OR REPLACE FUNCTION public._polygon_vertices_geofence(p_geofence jsonb)
RETURNS TABLE (ord int, v_lat double precision, v_lng double precision)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  poly jsonb;
  i int;
  n int;
  va double precision;
  vo double precision;
  pts_lat double precision[] := ARRAY[]::double precision[];
  pts_lng double precision[] := ARRAY[]::double precision[];
BEGIN
  IF p_geofence IS NULL THEN RETURN; END IF;
  poly := p_geofence -> 'polygon';
  IF poly IS NULL OR jsonb_typeof(poly) <> 'array' THEN RETURN; END IF;
  n := jsonb_array_length(poly);
  FOR i IN 0..(n - 1) LOOP
    SELECT * INTO va, vo FROM public._vertex_from_jsonb(poly -> i);
    IF va IS NOT NULL AND vo IS NOT NULL THEN
      pts_lat := array_append(pts_lat, va);
      pts_lng := array_append(pts_lng, vo);
    END IF;
  END LOOP;
  IF array_length(pts_lat, 1) IS NULL OR array_length(pts_lat, 1) < 3 THEN RETURN; END IF;
  IF pts_lat[1] = pts_lat[array_length(pts_lat, 1)] AND pts_lng[1] = pts_lng[array_length(pts_lng, 1)] THEN
    pts_lat := pts_lat[1:(array_length(pts_lat, 1) - 1)];
    pts_lng := pts_lng[1:(array_length(pts_lng, 1) - 1)];
  END IF;
  FOR i IN 1..array_length(pts_lat, 1) LOOP
    ord := i;
    v_lat := pts_lat[i];
    v_lng := pts_lng[i];
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._polygon_vertices_location_geojson(p_location jsonb)
RETURNS TABLE (ord int, v_lat double precision, v_lng double precision)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  t text;
  ring jsonb;
  seg jsonb;
  i int;
  n int;
  a double precision;
  b double precision;
  pts_lat double precision[] := ARRAY[]::double precision[];
  pts_lng double precision[] := ARRAY[]::double precision[];
BEGIN
  IF p_location IS NULL THEN RETURN; END IF;
  t := lower(coalesce(p_location ->> 'type', ''));
  IF t <> 'polygon' THEN RETURN; END IF;
  ring := p_location -> 'coordinates' -> 0;
  IF ring IS NULL OR jsonb_typeof(ring) <> 'array' THEN RETURN; END IF;
  n := jsonb_array_length(ring);
  FOR i IN 0..(n - 1) LOOP
    seg := ring -> i;
    IF seg IS NOT NULL AND jsonb_typeof(seg) = 'array' AND jsonb_array_length(seg) >= 2 THEN
      a := (seg ->> 0)::double precision;
      b := (seg ->> 1)::double precision;
      IF a IS NOT NULL AND b IS NOT NULL THEN
        pts_lng := array_append(pts_lng, a);
        pts_lat := array_append(pts_lat, b);
      END IF;
    END IF;
  END LOOP;
  IF array_length(pts_lat, 1) IS NULL OR array_length(pts_lat, 1) < 3 THEN RETURN; END IF;
  IF pts_lat[1] = pts_lat[array_length(pts_lat, 1)] AND pts_lng[1] = pts_lng[array_length(pts_lng, 1)] THEN
    pts_lat := pts_lat[1:(array_length(pts_lat, 1) - 1)];
    pts_lng := pts_lng[1:(array_length(pts_lng, 1) - 1)];
  END IF;
  FOR i IN 1..array_length(pts_lat, 1) LOOP
    ord := i;
    v_lat := pts_lat[i];
    v_lng := pts_lng[i];
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public._point_in_polygon(
  p_lat double precision,
  p_lng double precision,
  poly_lat double precision[],
  poly_lng double precision[]
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  n int;
  inside boolean := false;
  i int;
  j int;
  pi_lat double precision;
  pi_lng double precision;
  pj_lat double precision;
  pj_lng double precision;
  edge_crosses boolean;
BEGIN
  IF poly_lat IS NULL OR poly_lng IS NULL THEN RETURN false; END IF;
  n := array_length(poly_lat, 1);
  IF n IS NULL OR n < 3 THEN RETURN false; END IF;
  i := 1;
  j := n;
  WHILE i <= n LOOP
    pi_lat := poly_lat[i];
    pi_lng := poly_lng[i];
    pj_lat := poly_lat[j];
    pj_lng := poly_lng[j];
    edge_crosses := (pi_lng > p_lng) <> (pj_lng > p_lng)
      AND p_lat < (pj_lat - pi_lat) * (p_lng - pi_lng) / (pj_lng - pi_lng + 1e-12) + pi_lat;
    IF edge_crosses THEN inside := NOT inside; END IF;
    j := i;
    i := i + 1;
  END LOOP;
  RETURN inside;
END;
$$;

CREATE OR REPLACE FUNCTION public.point_inside_site(
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision,
  p_site public.sites
) RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
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
  slat double precision := 0;
  slng double precision := 0;
  cnt int := 0;
BEGIN
  IF p_site IS NULL OR p_lat IS NULL OR p_lng IS NULL THEN RETURN false; END IF;
  acc := coalesce(p_accuracy, 0);
  IF acc < 0 OR acc <> acc THEN acc := 0; END IF;

  gf := p_site.geofence;
  loc := p_site.location;

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
    RETURN public._point_in_polygon(p_lat, p_lng, poly_lat, poly_lng);
  END IF;

  -- Circle mode: center from geofence.center, else location / columns
  center_lat := NULL;
  center_lng := NULL;
  IF gf IS NOT NULL AND jsonb_typeof(gf -> 'center') = 'object' THEN
    SELECT * INTO center_lat, center_lng FROM public._vertex_from_jsonb(gf -> 'center');
  END IF;
  IF center_lat IS NULL AND loc IS NOT NULL AND jsonb_typeof(loc) = 'object' THEN
    center_lat := public._jsonb_num(loc, ARRAY['lat', 'latitude'], NULL::double precision);
    center_lng := public._jsonb_num(loc, ARRAY['lng', 'longitude', 'lon'], NULL::double precision);
  END IF;
  IF center_lat IS NULL AND p_site.latitude IS NOT NULL AND p_site.longitude IS NOT NULL THEN
    center_lat := p_site.latitude::double precision;
    center_lng := p_site.longitude::double precision;
  END IF;
  IF center_lat IS NULL OR center_lng IS NULL THEN RETURN false; END IF;

  radius := public._jsonb_num(
    coalesce(gf, '{}'::jsonb),
    ARRAY['radiusMeters', 'radius_meters'],
    NULL::double precision
  );
  IF radius IS NULL OR radius <= 0 THEN
    IF p_site.radius_meters IS NOT NULL AND (p_site.radius_meters)::double precision > 0 THEN
      radius := (p_site.radius_meters)::double precision;
    ELSE
      radius := 500::double precision;
    END IF;
  END IF;
  IF radius IS NULL OR radius <= 0 THEN radius := 500::double precision; END IF;

  eff_radius := greatest(20::double precision, radius - acc);
  dist := public._geo_distance_meters(p_lat, p_lng, center_lat, center_lng);
  RETURN dist <= eff_radius;
END;
$$;

CREATE OR REPLACE FUNCTION public._attendance_action_is_sign_in(p_action text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT upper(replace(coalesce(trim(p_action), ''), ' ', '_')) IN
    ('SIGN_IN', 'IN', 'SIGNIN', 'CHECKIN');
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
  outside boolean;
  meta text;
  now_ts timestamptz := now();
BEGIN
  FOR rec IN
    SELECT a.*
    FROM public.attendance a
    WHERE coalesce(a.auto_sign_out, false) = false
      AND a.exit_time IS NULL
      AND a.last_location_timestamp IS NOT NULL
      AND a.last_location_lat IS NOT NULL
      AND a.last_location_lng IS NOT NULL
      AND a.last_location_timestamp < (now_ts - interval '10 minutes')
      AND public._attendance_action_is_sign_in(a.action)
  LOOP
    SELECT * INTO site_row FROM public.sites s WHERE s.id::text = rec.site_id::text LIMIT 1;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    outside := NOT public.point_inside_site(
      rec.last_location_lat::double precision,
      rec.last_location_lng::double precision,
      coalesce(rec.last_location_accuracy, 0)::double precision,
      site_row
    );

    IF NOT outside THEN
      CONTINUE;
    END IF;

    meta := jsonb_build_object(
      'auto_sign_out', true,
      'exit_time', rec.last_location_timestamp,
      'exit_time_millis', (extract(epoch from rec.last_location_timestamp) * 1000)::bigint,
      'auto_sign_out_reason', 'fallback'
    )::text;

    UPDATE public.attendance
    SET
      action = 'SIGN OUT',
      exit_time = rec.last_location_timestamp,
      exit_time_millis = (extract(epoch from rec.last_location_timestamp) * 1000)::bigint,
      exit_lat = rec.last_location_lat,
      exit_lng = rec.last_location_lng,
      exit_accuracy = rec.last_location_accuracy,
      auto_sign_out = true,
      auto_sign_out_reason = 'fallback',
      sign_out_time = now_ts,
      latitude = coalesce(rec.last_location_lat, latitude),
      longitude = coalesce(rec.last_location_lng, longitude),
      accuracy = coalesce(rec.last_location_accuracy, accuracy),
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

-- ── 4) pg_cron ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

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
  '*/5 * * * *',
  $$SELECT public.perform_attendance_fallback();$$
);
