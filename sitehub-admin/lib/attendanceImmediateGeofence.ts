import { distanceMeters } from "@/lib/siteGeofenceServer";

/** GPS is often still settling immediately after sign-in. */
export const SIGN_IN_GRACE_MS = 3 * 60_000;

/** Immediate sign-out needs a tighter fix than the 80 m coarse-skip cap. */
export const MAX_IMMEDIATE_EXIT_ACCURACY_M = 50;

/** Do not treat a cached client fix as a live geofence exit. */
export const MAX_EXIT_CLIENT_AGE_MS = 90_000;

/** One-sample urban-canyon hops of this size are not a confirmed leave. */
export const GPS_JUMP_METERS = 150;

export type ImmediateGeofenceAction =
  | "sign_out"
  | "hold_outside"
  | "ignore_restore"
  | "ignore_clear";

export type ImmediateGeofenceDecision = {
  action: ImmediateGeofenceAction;
  reason: string;
};

function finiteNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseCoord(value: unknown): number | null {
  return finiteNumber(value);
}

export function decideImmediateGeofenceExit(args: {
  geofenceExitPing: boolean;
  geometryOutside: boolean;
  skippedCoarsePing?: boolean;
  signInAt: Date | string | null;
  now?: Date;
  accuracyM: number;
  clientTimestampMs?: number | null;
  previousOutside: boolean;
  previousLat?: number | null;
  previousLng?: number | null;
  currentLat: number;
  currentLng: number;
  outsideClearanceM?: number | null;
}): ImmediateGeofenceDecision {
  if (args.skippedCoarsePing) {
    return { action: "ignore_restore", reason: "coarse_ping_skipped" };
  }
  if (!args.geofenceExitPing || !args.geometryOutside) {
    return { action: "hold_outside", reason: "not_an_exit_candidate" };
  }

  const now = args.now ?? new Date();
  const signInAt =
    args.signInAt instanceof Date
      ? args.signInAt
      : args.signInAt
        ? new Date(args.signInAt)
        : null;
  const signInAgeMs =
    signInAt && !Number.isNaN(signInAt.getTime()) ? now.getTime() - signInAt.getTime() : null;
  if (signInAgeMs != null && signInAgeMs < SIGN_IN_GRACE_MS) {
    return ignoreDisposition(args, "sign_in_grace");
  }

  const clientTs = finiteNumber(args.clientTimestampMs);
  if (clientTs != null && Math.abs(now.getTime() - clientTs) > MAX_EXIT_CLIENT_AGE_MS) {
    return ignoreDisposition(args, "stale_client_fix");
  }

  const accuracyM = Number.isFinite(args.accuracyM) ? Math.max(0, args.accuracyM) : 0;
  if (accuracyM > MAX_IMMEDIATE_EXIT_ACCURACY_M) {
    return ignoreDisposition(args, "accuracy_too_coarse");
  }

  const clearance = finiteNumber(args.outsideClearanceM);
  if (clearance != null && clearance <= accuracyM) {
    return ignoreDisposition(args, "clearance_within_accuracy");
  }

  const prevLat = finiteNumber(args.previousLat);
  const prevLng = finiteNumber(args.previousLng);
  if (prevLat != null && prevLng != null && !args.previousOutside) {
    const jump = distanceMeters(prevLat, prevLng, args.currentLat, args.currentLng);
    if (jump > GPS_JUMP_METERS) {
      return ignoreDisposition(args, "gps_jump");
    }
  }

  if (!args.previousOutside) {
    return { action: "hold_outside", reason: "awaiting_second_outside_ping" };
  }

  return { action: "sign_out", reason: "confirmed_outside" };
}

function ignoreDisposition(
  args: { previousLat?: number | null; previousLng?: number | null },
  reason: string
): ImmediateGeofenceDecision {
  const prevLat = finiteNumber(args.previousLat);
  const prevLng = finiteNumber(args.previousLng);
  if (prevLat != null && prevLng != null) {
    return { action: "ignore_restore", reason };
  }
  return { action: "ignore_clear", reason };
}
