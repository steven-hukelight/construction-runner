import { AUTO_SIGN_OUT_TIMEOUT_MS } from "@/lib/attendanceFallbackConstants";

/**
 * Structured logs for grep: `[AUTO-SIGN-OUT]` (API paths). DB cron uses `[AUTO-SIGN-OUT][FALLBACK]` via RAISE LOG.
 */

export function logAutoSignOutApiContext(
  phase: string,
  userId: string,
  row: Record<string, unknown> | null | undefined,
  extra?: Record<string, unknown>
): void {
  const now = Date.now();
  const activeAttendanceId = row?.id != null ? String(row.id) : null;
  const lastLat = row?.last_location_lat ?? row?.latitude;
  const lastLng = row?.last_location_lng ?? row?.longitude;
  const lastLocationTimestamp =
    row?.last_location_timestamp != null
      ? String(row.last_location_timestamp)
      : row?.created_at != null
        ? String(row.created_at)
        : null;
  let elapsedMs: number | null = null;
  if (lastLocationTimestamp) {
    const t = Date.parse(lastLocationTimestamp);
    if (!Number.isNaN(t)) elapsedMs = now - t;
  }
  const flag = row?.last_location_outside_fence;
  const outsideFence = flag === true;
  const insideFence = flag === false;
  const fenceUnknown = flag == null;

  console.log(`[AUTO-SIGN-OUT] ${phase} Checking user:`, userId);
  console.log(`[AUTO-SIGN-OUT] ${phase} activeAttendanceId:`, activeAttendanceId);
  console.log(`[AUTO-SIGN-OUT] ${phase} lastLocation:`, { lat: lastLat, lng: lastLng });
  console.log(`[AUTO-SIGN-OUT] ${phase} lastLocationTimestamp:`, lastLocationTimestamp);
  console.log(`[AUTO-SIGN-OUT] ${phase} now:`, now);
  console.log(`[AUTO-SIGN-OUT] ${phase} elapsedMs:`, elapsedMs);
  console.log(`[AUTO-SIGN-OUT] ${phase} insideFence (from last_location_outside_fence=false):`, insideFence);
  console.log(`[AUTO-SIGN-OUT] ${phase} outsideFence (from last_location_outside_fence=true):`, outsideFence);
  console.log(`[AUTO-SIGN-OUT] ${phase} fenceUnknown (null flag, server uses coordinate check in SQL):`, fenceUnknown);
  console.log(`[AUTO-SIGN-OUT] ${phase} timeoutThresholdMs:`, AUTO_SIGN_OUT_TIMEOUT_MS);
  if (elapsedMs != null) {
    console.log(
      `[AUTO-SIGN-OUT] ${phase} Condition: elapsed > timeout =`,
      elapsedMs > AUTO_SIGN_OUT_TIMEOUT_MS
    );
  }
  console.log(`[AUTO-SIGN-OUT] ${phase} Condition: activeAttendanceRowExists =`, !!activeAttendanceId);
  if (extra && Object.keys(extra).length > 0) {
    console.log(`[AUTO-SIGN-OUT] ${phase} extra:`, extra);
  }
}

export function logAutoSignOutNotTriggeredApi(
  phase: string,
  reason: string,
  detail: Record<string, unknown>
): void {
  console.log(`[AUTO-SIGN-OUT] ${phase} NOT TRIGGERED — reason:`, reason, detail);
}

export function logAutoSignOutTriggeredApi(phase: string, userId: string, detail?: Record<string, unknown>): void {
  console.log(`[AUTO-SIGN-OUT] ${phase} TRIGGERING auto sign-out for user:`, userId, detail ?? {});
}
