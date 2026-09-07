/** Stored at start of attendance.notes for ABSENT rows; followed by YYYY-MM-DD (UTC calendar day). */
export const ABSENT_FOR_PREFIX = "__ABSENT_FOR__:";

export function formatAbsentNotes(absentDateUtcYmd: string, userNote?: string | null): string {
  const base = `${ABSENT_FOR_PREFIX}${absentDateUtcYmd}`;
  const t = userNote?.trim();
  if (t) return `${base} | ${t}`;
  return base;
}

export function parseAbsentForDate(notes: string | null | undefined): string | null {
  if (!notes || !notes.startsWith(ABSENT_FOR_PREFIX)) return null;
  const rest = notes.slice(ABSENT_FOR_PREFIX.length);
  const m = /^([0-9]{4}-[0-9]{2}-[0-9]{2})/.exec(rest);
  return m ? m[1] : null;
}

/** Today's UTC calendar date as YYYY-MM-DD */
export function utcTodayYmd(d = new Date()): string {
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const day = d.getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(mo + 1)}-${pad(day)}`;
}

export function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

/** True if a is strictly before b (UTC calendar dates YYYY-MM-DD). */
export function ymdBefore(a: string, b: string): boolean {
  return a < b;
}
