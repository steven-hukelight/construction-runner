export function normalizeAttendanceAction(raw: string | null | undefined): string {
  return (raw ?? "").toString().toUpperCase().replace(/\s+/g, "_");
}

function isSignOutNorm(norm: string): boolean {
  return norm === "SIGN_OUT" || norm === "OUT" || norm === "SIGNOUT" || norm === "CHECKOUT";
}

/** API-facing fields for admin + mobile clients */
export function enrichAttendanceApiFields(r: Record<string, unknown>): Record<string, unknown> {
  const actionStr =
    r.action != null && String(r.action).trim() ? String(r.action).trim() : "SIGN IN";
  const norm = normalizeAttendanceAction(actionStr);
  const isSignOut = isSignOutNorm(norm);
  const ts = r.timestamp != null ? String(r.timestamp) : undefined;
  const exitTimeCol = r.exit_time != null ? String(r.exit_time) : null;
  const exitMillis = r.exit_time_millis != null ? Number(r.exit_time_millis) : null;

  let exitLocation: { lat: number; lng: number; accuracy: number } | null = null;
  const exLat = r.exit_lat ?? r.exit_latitude;
  const exLng = r.exit_lng ?? r.exit_longitude;
  if (
    exLat != null &&
    exLng != null &&
    Number.isFinite(Number(exLat)) &&
    Number.isFinite(Number(exLng))
  ) {
    exitLocation = {
      lat: Number(exLat),
      lng: Number(exLng),
      accuracy:
        r.exit_accuracy != null && Number.isFinite(Number(r.exit_accuracy))
          ? Number(r.exit_accuracy)
          : 0,
    };
  }

  const lastLocTs =
    r.last_location_timestamp != null
      ? String(r.last_location_timestamp)
      : r.last_activity_at != null
        ? String(r.last_activity_at)
        : null;

  const signOutCol = r.sign_out_time != null ? String(r.sign_out_time) : null;

  return {
    ...r,
    action: actionStr,
    exit_time: exitTimeCol,
    exitTime: exitTimeCol,
    exit_time_millis: exitMillis,
    exitTimeMillis: Number.isFinite(exitMillis as number) ? exitMillis : null,
    exit_location: exitLocation,
    exitLocation,
    sign_out_time: signOutCol ?? (isSignOut && ts ? ts : null),
    signOutTime: signOutCol ?? (isSignOut && ts ? ts : null),
    last_location_timestamp: lastLocTs,
    lastLocationTimestamp: lastLocTs,
  };
}

export function exitIsoFromBody(exitTimeRaw: unknown, exitMillisRaw: unknown): string | null {
  if (exitTimeRaw != null && String(exitTimeRaw).trim()) {
    const d = new Date(String(exitTimeRaw));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (exitMillisRaw != null && !Number.isNaN(Number(exitMillisRaw))) {
    const d = new Date(Number(exitMillisRaw));
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}
