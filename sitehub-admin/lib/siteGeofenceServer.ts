/**
 * Server-side site boundary checks (aligned with worker app SiteGeofence.withinSite).
 */

export type SiteRow = Record<string, unknown>;

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

function numFrom(m: Record<string, unknown>, keys: string[], fallback: number): number {
  for (const k of keys) {
    const v = m[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return fallback;
}

function vertexFromDynamic(raw: unknown): { lat: number; lng: number } | null {
  const m = asRecord(raw);
  if (!m) return null;
  const lat = m.lat ?? m.latitude;
  const lng = m.lng ?? m.longitude ?? m.lon;
  if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  return null;
}

function polygonFromGeofenceJson(site: SiteRow): { lat: number; lng: number }[] {
  const gf = asRecord(site.geofence);
  if (!gf) return [];
  const poly = gf.polygon;
  if (!Array.isArray(poly)) return [];
  const out: { lat: number; lng: number }[] = [];
  for (const item of poly) {
    const v = vertexFromDynamic(item);
    if (v) out.push(v);
  }
  if (
    out.length >= 2 &&
    out[0].lat === out[out.length - 1].lat &&
    out[0].lng === out[out.length - 1].lng
  ) {
    out.pop();
  }
  return out;
}

function polygonFromLocationGeoJson(site: SiteRow): { lat: number; lng: number }[] {
  const loc = asRecord(site.location);
  if (!loc) return [];
  const type = String(loc.type ?? "").toLowerCase();
  if (type !== "polygon") return [];
  const coords = loc.coordinates;
  if (!Array.isArray(coords) || coords.length === 0) return [];
  const ring = coords[0];
  if (!Array.isArray(ring)) return [];
  const out: { lat: number; lng: number }[] = [];
  for (const p of ring) {
    if (Array.isArray(p) && p.length >= 2) {
      const a = p[0];
      const b = p[1];
      if (typeof a === "number" && typeof b === "number") {
        out.push({ lat: b, lng: a });
      }
    }
  }
  if (
    out.length >= 2 &&
    out[0].lat === out[out.length - 1].lat &&
    out[0].lng === out[out.length - 1].lng
  ) {
    out.pop();
  }
  return out;
}

export function polygonPoints(site: SiteRow): { lat: number; lng: number }[] {
  const fromGf = polygonFromGeofenceJson(site);
  if (fromGf.length >= 3) return fromGf;
  const fromLoc = polygonFromLocationGeoJson(site);
  if (fromLoc.length >= 3) return fromLoc;
  return [];
}

export function siteCenter(site: SiteRow): { lat: number; lng: number } | null {
  const poly = polygonPoints(site);
  if (poly.length >= 3) {
    let slat = 0;
    let slng = 0;
    for (const p of poly) {
      slat += p.lat;
      slng += p.lng;
    }
    return { lat: slat / poly.length, lng: slng / poly.length };
  }
  const gf = asRecord(site.geofence);
  const c = gf ? asRecord(gf.center) : null;
  if (c) {
    const lat = c.lat ?? c.latitude;
    const lng = c.lng ?? c.longitude ?? c.lon;
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }
  const loc = asRecord(site.location);
  if (loc) {
    const lat = loc.lat ?? loc.latitude;
    const lng = loc.lng ?? loc.longitude ?? loc.lon;
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }
  const lat = site.latitude;
  const lng = site.longitude;
  if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  return null;
}

export function allowedRadiusMeters(site: SiteRow): number {
  const gf = asRecord(site.geofence);
  if (gf) {
    const r = gf.radiusMeters ?? gf.radius_meters;
    if (typeof r === "number" && r > 0) return r;
  }
  return numFrom(site as Record<string, unknown>, ["radiusMeters", "radius_meters"], 500);
}

function pointInPolygon(lat: number, lng: number, poly: { lat: number; lng: number }[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const pi = poly[i];
    const pj = poly[j];
    const intersect =
      pi.lng > lng !== pj.lng > lng &&
      lat < ((pj.lat - pi.lat) * (lng - pi.lng)) / (pj.lng - pi.lng + 1e-12) + pi.lat;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const φ1 = (aLat * Math.PI) / 180;
  const φ2 = (bLat * Math.PI) / 180;
  const Δφ = ((bLat - aLat) * Math.PI) / 180;
  const Δλ = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

/**
 * True if the point is inside the site boundary (polygon or circle + radius), matching app logic.
 */
export function withinSite(
  lat: number,
  lng: number,
  accuracyMeters: number,
  site: SiteRow
): boolean {
  const poly = polygonPoints(site);
  if (poly.length >= 3) {
    return pointInPolygon(lat, lng, poly);
  }
  const center = siteCenter(site);
  if (!center) return false;
  const distance = distanceMeters(lat, lng, center.lat, center.lng);
  const acc = Number.isFinite(accuracyMeters) ? Math.max(0, accuracyMeters) : 0;
  const radius = allowedRadiusMeters(site);
  const effectiveRadius = Math.max(20, radius - acc);
  return distance <= effectiveRadius;
}

export function hasBoundary(site: SiteRow): boolean {
  return polygonPoints(site).length >= 3 || siteCenter(site) != null;
}
