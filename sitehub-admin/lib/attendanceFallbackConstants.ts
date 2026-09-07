/**
 * Keep in sync with `perform_attendance_fallback()` in Supabase migrations
 * (staleness: `now - coalesce(last_location_timestamp, created_at)`).
 * Section H: 25s threshold; pg_cron remains minute-granularity (see migration notes).
 */
export const ATTENDANCE_FALLBACK_STALE_MS = 25 * 1000;

/** Alias for logs / docs (same value as pg_cron stale threshold). */
export const AUTO_SIGN_OUT_TIMEOUT_MS = ATTENDANCE_FALLBACK_STALE_MS;
