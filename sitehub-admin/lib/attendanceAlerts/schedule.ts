import type { AttendanceAlertPreferences } from "./preferences";

/** A push older than this would be misleading, so it only goes to the bell. */
export const MAX_PUSH_AGE_MS = 30 * 60 * 1000;

/** Summaries are built during the first minutes after they fall due; later sweeps skip them. */
export const SUMMARY_SEND_WINDOW_MIN = 10;

const MINUTE_MS = 60_000;

export type LocalTime = { ymd: string; hour: number; minute: number; minutesOfDay: number };

export function localTime(at: Date, timeZone: string): LocalTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  return {
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    hour,
    minute,
    minutesOfDay: hour * 60 + minute,
  };
}

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** True when pushes should be held. Windows may wrap past midnight (19:00–06:00). */
export function inQuietHours(at: Date, prefs: Pick<AttendanceAlertPreferences, "quietHours" | "timeZone">): boolean {
  if (!prefs.quietHours.enabled) return false;
  const start = minutesOf(prefs.quietHours.start);
  const end = minutesOf(prefs.quietHours.end);
  if (start === end) return false;
  const now = localTime(at, prefs.timeZone).minutesOfDay;
  return start < end ? now >= start && now < end : now >= start || now < end;
}

export function isStale(occurredAt: Date, now: Date): boolean {
  return now.getTime() - occurredAt.getTime() > MAX_PUSH_AGE_MS;
}

export type SummaryWindow = {
  kind: "hourly" | "daily";
  from: Date;
  to: Date;
  /** Stable per person and window, used to send each summary once. */
  key: string;
};

/**
 * The summary that is due now, if any.
 * Hourly: the previous full local hour, sent just after the hour.
 * Daily: local midnight up to the chosen time, sent just after that time.
 */
export function dueSummaryWindow(now: Date, prefs: AttendanceAlertPreferences): SummaryWindow | null {
  if (!prefs.enabled || prefs.frequency === "instant") return null;
  const local = localTime(now, prefs.timeZone);
  const startOfMinute = new Date(Math.floor(now.getTime() / MINUTE_MS) * MINUTE_MS);

  if (prefs.frequency === "hourly") {
    if (local.minute >= SUMMARY_SEND_WINDOW_MIN) return null;
    const to = new Date(startOfMinute.getTime() - local.minute * MINUTE_MS);
    const from = new Date(to.getTime() - 60 * MINUTE_MS);
    return { kind: "hourly", from, to, key: `hourly:${to.toISOString()}` };
  }

  const target = minutesOf(prefs.dailySummaryTime);
  const late = local.minutesOfDay - target;
  if (late < 0 || late >= SUMMARY_SEND_WINDOW_MIN) return null;
  const to = new Date(startOfMinute.getTime() - late * MINUTE_MS);
  const from = new Date(to.getTime() - target * MINUTE_MS);
  return { kind: "daily", from, to, key: `daily:${local.ymd}` };
}
