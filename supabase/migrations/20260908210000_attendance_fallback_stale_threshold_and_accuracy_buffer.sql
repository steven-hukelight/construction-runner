-- Section I: Make pg_cron auto sign-out fallback conservative.
--
-- Field report (Sep 2026): operatives signed in and physically on-site are
-- being auto signed out with reason `fallback_stale_outside`. Two root
-- causes:
--
--   1. The stale threshold in `perform_attendance_fallback()` is 25 s.
--      iOS pauses foreground location updates within a second of the app
--      backgrounding, so `last_location_timestamp` becomes "stale" almost
--      immediately. If the last recorded position happened to be near the
--      fence edge, the fallback closes the shift on the next cron tick.
--
--   2. The fence check in `point_inside_site()` (used as
--      `NOT point_inside_site(...)` in the fallback for legacy rows) has
--      no accuracy buffer for polygons, and *subtracts* accuracy from the
--      radius for circles (`eff_radius := greatest(20, radius - acc)`).
--      Both make "outside" too easy when GPS accuracy is 20–40 m near a
--      boundary — a normal condition on a smartphone.
--
-- This migration only touches the fallback path — sign-in / RAMS gates
-- keep the existing `point_inside_site()` semantics. Changes:
--
--   * New helper `point_definitely_outside_site(lat, lng, acc, site)` that
--     returns TRUE only when the point is outside the fence by more than
--     `max(20, 2*accuracy)` metres (circle) or the equivalent buffered
--     polygon test.
--   * `perform_attendance_fallback()` stale threshold: 25 s → 600 s
--     (10 minutes). Native geofence exit remains the primary fast-path;
--     the fallback is now genuinely a "last resort".
--   * Fallback uses `point_definitely_outside_site` when
--     `last_location_outside_fence` is NULL / FALSE. When it's already
--     TRUE (set by a foreground ping while inside the app), we still
--     honour it — that flag was written when accuracy was known good.
--
-- Rollback: re-run the previous section-H migration
-- (20260412134500_section_h_attendance_auto_signout_tune.sql).

-- ── point_definitely_outside_site ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.point_definitely_outside_site(
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
  buffer_m double precision;
  center_lat double precision;
  center_lng double precision;
  dist double precision;
  radius double precision;
  eff_radius_outside double precision;
BEGIN
  IF p_site IS NULL OR p_lat IS NULL OR p_lng IS NULL THEN RETURN false; END IF;
  acc := coalesce(p_accuracy, 0);
  IF acc < 0 OR acc <> acc THEN acc := 0; END IF;

  -- Safety buffer: never call someone "outside" until they're beyond both
  -- (a) 20 metres of pure slack and (b) twice the reported accuracy.
  -- Two-sigma-ish coverage handles the tail of typical smartphone drift.
  buffer_m := greatest(20::double precision, acc * 2::double precision);

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

  -- Polygon site: raw point-in-polygon, then if outside require distance
  -- to nearest polygon vertex to exceed the buffer. This is an approximation
  -- of "buffered polygon"; for typical rectangular sites it's tight enough.
  IF array_length(poly_lat, 1) IS NOT NULL AND array_length(poly_lat, 1) >= 3 THEN
    IF public._point_in_polygon(p_lat, p_lng, poly_lat, poly_lng) THEN
      RETURN false;
    END IF;
    -- Outside the raw polygon. Check nearest-vertex distance as a proxy for
    -- distance-to-polygon-edge (safe: vertex distance >= edge distance so
    -- we may err on the side of NOT signing out, which is desired).
    DECLARE
      i int;
      d_min double precision := NULL;
      d_here double precision;
    BEGIN
      FOR i IN 1..array_length(poly_lat, 1) LOOP
        d_here := public._geo_distance_meters(p_lat, p_lng, poly_lat[i], poly_lng[i]);
        IF d_min IS NULL OR d_here < d_min THEN
          d_min := d_here;
        END IF;
      END LOOP;
      IF d_min IS NULL THEN RETURN false; END IF;
      RETURN d_min > buffer_m;
    END;
  END IF;

  -- Circle mode: definitely-outside iff dist > radius + buffer.
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

  eff_radius_outside := radius + buffer_m;
  dist := public._geo_distance_meters(p_lat, p_lng, center_lat, center_lng);
  RETURN dist > eff_radius_outside;
END;
$$;

REVOKE ALL ON FUNCTION public.point_definitely_outside_site(double precision, double precision, double precision, public.sites) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.point_definitely_outside_site(double precision, double precision, double precision, public.sites) TO postgres;
GRANT EXECUTE ON FUNCTION public.point_definitely_outside_site(double precision, double precision, double precision, public.sites) TO service_role;

-- ── perform_attendance_fallback: 25s → 600s + buffered fence ───────────────
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
  -- Was 25s (Section H). iOS suspends foreground location updates within
  -- ~1s of backgrounding; 25s produced daily false positives for
  -- on-site operatives. 600s = 10 min gives the native geofence path
  -- ample time to fire and lets legitimate background pauses ride out.
  threshold_sec double precision := 600;
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
    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] --- latest open SIGN_IN row user_id=% activeAttendanceId=% site_id=% action=%',
      rec.user_id, rec.id, rec.site_id, rec.action;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] row_state exit_time=% exit_time_millis=% auto_sign_out=%',
      rec.exit_time, rec.exit_time_millis, rec.auto_sign_out;

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
      use_lat, use_lng, use_acc;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] lastLocationTimestamp(raw)=% coalesce(created_at)=%',
      rec.last_location_timestamp, stale_ref;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] elapsed_sec=% timeoutThresholdSec=% stale_ok=%',
      elapsed_sec, threshold_sec, stale_ok;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] last_location_outside_fence=%',
      rec.last_location_outside_fence;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] Condition: has_coordinates=%',
      has_coords;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] Condition: stale_ok=%',
      stale_ok;

    IF NOT has_coords THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=%',
        rec.user_id, rec.id, 'missing_last_location_or_signin_latlng';
      CONTINUE;
    END IF;

    IF NOT stale_ok THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=% details=%',
        rec.user_id, rec.id, 'stale_below_threshold',
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
        rec.user_id, rec.id, 'site_not_found_for_site_id';
      CONTINUE;
    END IF;

    -- Fence evaluation.
    --
    -- If a foreground ping already set `last_location_outside_fence = TRUE`
    -- while we had a fresh accuracy read, trust it (it was recorded with
    -- accuracy-aware logic on the client). Otherwise use the new
    -- `point_definitely_outside_site` which requires the position to be
    -- outside the fence by max(20, 2*accuracy) metres. This closes the
    -- "GPS drift near edge" false-positive that was signing on-site
    -- operatives out.
    IF rec.last_location_outside_fence IS TRUE THEN
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

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] fence_eval source=% outside_effective=% inside_fence=%',
      fence_source, outside_effective, inside_fence;

    RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] Condition: outsideFence=% (want true to trigger)',
      outside_effective;

    IF NOT outside_effective THEN
      RAISE LOG '[AUTO-SIGN-OUT][FALLBACK] NOT TRIGGERED user_id=% attendance_id=% reason=% details=%',
        rec.user_id, rec.id,
        CASE
          WHEN fence_source LIKE '%after_false_flag' THEN 'still_inside_by_buffered_geometry_after_stale'
          ELSE 'inside_fence_or_geometry_buffer'
        END,
        jsonb_build_object('fence_source', fence_source, 'buffer', 'max(20, 2*acc)')::text;
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
      'You were signed out after leaving the site boundary.',
      jsonb_build_object(
        'type', 'attendance_auto_sign_out',
        'reason', 'fallback_stale_outside',
        'trigger_source', 'cron',
        'attendance_id', rec.id
      ),
      now_ts
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.perform_attendance_fallback() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.perform_attendance_fallback() TO postgres;
GRANT EXECUTE ON FUNCTION public.perform_attendance_fallback() TO service_role;
