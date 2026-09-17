/**
 * Keep in sync with `perform_attendance_fallback()` in Supabase migrations
 * (staleness: `now - coalesce(last_location_timestamp, created_at, timestamp)`).
 * Section K: 2 minutes. Coarse GPS still cannot confirm an exit.
 */
export const ATTENDANCE_FALLBACK_STALE_MS = 2 * 60 * 1000;

/** Whole minutes for supervisor-facing copy. Keep in sync with `ATTENDANCE_FALLBACK_STALE_MS`. */
export const ATTENDANCE_FALLBACK_STALE_MINUTES = ATTENDANCE_FALLBACK_STALE_MS / 60_000;

/** Alias for logs / docs (same value as pg_cron stale threshold). */
export const AUTO_SIGN_OUT_TIMEOUT_MS = ATTENDANCE_FALLBACK_STALE_MS;
