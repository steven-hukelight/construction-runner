import { SIGN_IN_GRACE_MS } from "@/lib/attendanceImmediateGeofence";

/** Same window as GPS settle after sign-in: a quick re-sign-in is a correction, not a new shift. */
export const AUTO_SIGN_OUT_RESUME_MS = SIGN_IN_GRACE_MS;

const BLOCKED_RESUME_REASONS = new Set(["fallback_max_shift"]);

function asDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = value > 1e12 ? value : value * 1000;
    const d = new Date(n);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function autoSignOutExitAt(row: {
  exit_time?: unknown;
  sign_out_time?: unknown;
  exit_time_millis?: unknown;
}): Date | null {
  return asDate(row.exit_time) ?? asDate(row.sign_out_time) ?? asDate(row.exit_time_millis);
}

export function isResumableAutoSignOutReason(reason: unknown): boolean {
  const key = String(reason ?? "")
    .trim()
    .toLowerCase();
  return !BLOCKED_RESUME_REASONS.has(key);
}

export function shouldResumeAfterAutoSignOut(args: {
  autoSignOut: boolean;
  lastActionNorm: string;
  lastSiteId?: string | null;
  signInSiteId: string;
  reason?: unknown;
  exitAt: Date | null;
  now?: Date;
}): boolean {
  if (!args.autoSignOut) return false;
  if (!isResumableAutoSignOutReason(args.reason)) return false;

  const lastAct = String(args.lastActionNorm ?? "").toUpperCase().replace(/\s+/g, "_");
  const isOut =
    lastAct === "SIGN_OUT" || lastAct === "OUT" || lastAct === "SIGNOUT" || lastAct === "CHECKOUT";
  if (!isOut) return false;

  const lastSite = String(args.lastSiteId ?? "").trim();
  const nextSite = String(args.signInSiteId ?? "").trim();
  if (!lastSite || !nextSite || lastSite !== nextSite) return false;

  if (!args.exitAt) return false;
  const now = args.now ?? new Date();
  const ageMs = now.getTime() - args.exitAt.getTime();
  return ageMs >= 0 && ageMs <= AUTO_SIGN_OUT_RESUME_MS;
}
