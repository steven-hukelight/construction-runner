/**
 * Convert a calendar YYYY-MM-DD from the browser (user's local timezone) to UTC ISO
 * bounds for filtering timestamptz columns. Server-side `new Date(y,m,d)` uses the
 * deployment TZ (UTC on Vercel), which mismatches the admin's local "today".
 */
export function localCalendarDayToUtcIsoBounds(ymd: string): { start: string; end: string } | null {
  const parts = ymd.split("-").map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return null;
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  return { start: start.toISOString(), end: end.toISOString() };
}
