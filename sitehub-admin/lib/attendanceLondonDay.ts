/** Europe/London calendar-day helpers for attendance archive (UK midnight). */

const LONDON = "Europe/London";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function addCalendarDayYmd(ymd: string, days = 1): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** YYYY-MM-DD in Europe/London for an instant. */
export function londonYmd(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) {
    throw new Error("Could not format Europe/London calendar date");
  }
  return `${y}-${m}-${d}`;
}

function tzOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    dtf
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value])
  ) as Record<string, string>;
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

/** UTC instant when Europe/London is 00:00:00 on `ymd`. */
export function londonStartOfCalendarDayUtc(ymd: string): Date {
  const [y, mo, d] = ymd.split("-").map(Number);
  if (!y || !mo || !d) {
    throw new Error(`Invalid YYYY-MM-DD: ${ymd}`);
  }
  const utcMidnight = Date.UTC(y, mo - 1, d, 0, 0, 0);
  const offset1 = tzOffsetMs(LONDON, new Date(utcMidnight));
  const first = new Date(utcMidnight - offset1);
  const offset2 = tzOffsetMs(LONDON, first);
  return new Date(utcMidnight - offset2);
}

/** Half-open [start, end) UTC ISO bounds for a London calendar day. */
export function londonCalendarDayUtcBounds(ymd: string): { start: string; end: string } {
  const start = londonStartOfCalendarDayUtc(ymd);
  const end = londonStartOfCalendarDayUtc(addCalendarDayYmd(ymd, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export function parseYmd(ymd: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m, d };
}
