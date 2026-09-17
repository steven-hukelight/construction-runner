/** Matches client `SiteGeofence.maxAccuracyForExitConfirmM`. */
export const MAX_FALLBACK_ACCURACY_M = 80;

/**
 * Coarse fused/cell pings must not run fence geometry (cell jumps of 0.5–2 km
 * are common on site). They also must not refresh `last_location_timestamp`,
 * or `perform_attendance_fallback` never sees a stale ping.
 */
export function shouldSkipCoarseFallbackOutsideEval(args: {
  fallbackPing: boolean;
  accuracyM: number;
  clientAgeOk: boolean;
  maxAccuracyM?: number;
}): boolean {
  const cap = args.maxAccuracyM ?? MAX_FALLBACK_ACCURACY_M;
  return args.fallbackPing && (args.accuracyM > cap || !args.clientAgeOk);
}
