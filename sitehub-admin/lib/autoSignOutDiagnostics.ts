import { AUTO_SIGN_OUT_TIMEOUT_MS } from "@/lib/attendanceFallbackConstants";

/**
 * Structured logs for grep: `[AUTO-SIGN-OUT]` (API paths). DB cron uses `[AUTO-SIGN-OUT][FALLBACK]` via RAISE LOG.
 * Off by default (they fire on every location ping); set AUTO_SIGN_OUT_DEBUG=1 to enable.
 * Uses console.info because production builds strip console.log (next.config.js removeConsole).
 */
const enabled = () => process.env.AUTO_SIGN_OUT_DEBUG === "1";

export function logAutoSignOutApiContext(
  phase: string,
  userId: string,
  row: Record<string, unknown> | null | undefined,
  extra?: Record<string, unknown>
): void {
  if (!enabled()) return;
  const now = Date.now();
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
  const activeAttendanceId = row?.id != null ? String(row.id) : null;

  console.info(`[AUTO-SIGN-OUT] ${phase} check`, {
    userId,
    activeAttendanceId,
    lastLocation: { lat: row?.last_location_lat ?? row?.latitude, lng: row?.last_location_lng ?? row?.longitude },
    lastLocationTimestamp,
    now,
    elapsedMs,
    insideFence: flag === false,
    outsideFence: flag === true,
    fenceUnknown: flag == null,
    timeoutThresholdMs: AUTO_SIGN_OUT_TIMEOUT_MS,
    elapsedOverTimeout: elapsedMs != null ? elapsedMs > AUTO_SIGN_OUT_TIMEOUT_MS : null,
    activeAttendanceRowExists: !!activeAttendanceId,
    ...(extra && Object.keys(extra).length > 0 ? { extra } : {}),
  });
}

export function logAutoSignOutNotTriggeredApi(
  phase: string,
  reason: string,
  detail: Record<string, unknown>
): void {
  if (!enabled()) return;
  console.info(`[AUTO-SIGN-OUT] ${phase} NOT TRIGGERED — reason:`, reason, detail);
}

export function logAutoSignOutTriggeredApi(phase: string, userId: string, detail?: Record<string, unknown>): void {
  if (!enabled()) return;
  console.info(`[AUTO-SIGN-OUT] ${phase} TRIGGERING auto sign-out for user:`, userId, detail ?? {});
}
