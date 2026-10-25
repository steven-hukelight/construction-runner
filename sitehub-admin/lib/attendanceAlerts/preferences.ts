/**
 * Attendance alert settings, stored under `attendance` in `users.notification_preferences` (JSONB).
 * Alerts stay off until the person turns them on.
 */

export const ATTENDANCE_ALERT_ROLES: ReadonlySet<string> = new Set(["admin", "site_admin", "supervisor"]);

export function canReceiveAttendanceAlerts(role: string | null | undefined): boolean {
  return ATTENDANCE_ALERT_ROLES.has((role ?? "").toLowerCase().trim());
}

export type AlertFrequency = "instant" | "hourly" | "daily";

export type AttendanceAlertPreferences = {
  enabled: boolean;
  channels: { mobile: boolean; web: boolean; bell: boolean };
  events: { checkIn: boolean; checkOut: boolean; autoSignOut: boolean };
  /** `all` = every site the person can see. */
  sites: "all" | string[];
  frequency: AlertFrequency;
  /** Local time the end-of-day summary goes out, `HH:MM`. */
  dailySummaryTime: string;
  quietHours: { enabled: boolean; start: string; end: string };
  /** IANA zone used for quiet hours, summaries and the times shown in alerts. */
  timeZone: string;
};

export const DEFAULT_TIME_ZONE = "Europe/London";
export const MAX_SELECTED_SITES = 200;

export const DEFAULT_ATTENDANCE_ALERT_PREFERENCES: AttendanceAlertPreferences = {
  enabled: false,
  channels: { mobile: true, web: true, bell: true },
  events: { checkIn: false, checkOut: false, autoSignOut: true },
  sites: "all",
  frequency: "instant",
  dailySummaryTime: "17:00",
  quietHours: { enabled: false, start: "19:00", end: "06:00" },
  timeZone: DEFAULT_TIME_ZONE,
};

const FREQUENCIES: ReadonlySet<string> = new Set(["instant", "hourly", "daily"]);
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function time(value: unknown, fallback: string): string {
  return typeof value === "string" && HH_MM.test(value) ? value : fallback;
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim() || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function siteList(value: unknown): "all" | string[] | null {
  if (value === "all") return "all";
  if (!Array.isArray(value)) return null;
  const ids = [...new Set(value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean))];
  return ids.length > MAX_SELECTED_SITES ? null : ids;
}

/** Read the attendance block from the whole `notification_preferences` value, filling defaults. */
export function parseAttendanceAlertPreferences(root: unknown): AttendanceAlertPreferences {
  const d = DEFAULT_ATTENDANCE_ALERT_PREFERENCES;
  const o = asRecord(asRecord(root).attendance);
  const channels = asRecord(o.channels);
  const events = asRecord(o.events);
  const quiet = asRecord(o.quietHours);
  return {
    enabled: o.enabled === true,
    channels: {
      mobile: bool(channels.mobile, d.channels.mobile),
      web: bool(channels.web, d.channels.web),
      bell: bool(channels.bell, d.channels.bell),
    },
    events: {
      checkIn: bool(events.checkIn, d.events.checkIn),
      checkOut: bool(events.checkOut, d.events.checkOut),
      autoSignOut: bool(events.autoSignOut, d.events.autoSignOut),
    },
    sites: siteList(o.sites) ?? d.sites,
    frequency: typeof o.frequency === "string" && FREQUENCIES.has(o.frequency) ? (o.frequency as AlertFrequency) : d.frequency,
    dailySummaryTime: time(o.dailySummaryTime, d.dailySummaryTime),
    quietHours: {
      enabled: quiet.enabled === true,
      start: time(quiet.start, d.quietHours.start),
      end: time(quiet.end, d.quietHours.end),
    },
    timeZone: isValidTimeZone(o.timeZone) ? o.timeZone : d.timeZone,
  };
}

/**
 * Apply a partial update from PATCH. Unknown keys are ignored; a wrong type is an error.
 * Chosen sites must be in `visibleSiteIds`.
 */
export function applyAttendanceAlertPatch(
  current: AttendanceAlertPreferences,
  body: unknown,
  visibleSiteIds: ReadonlySet<string>,
): { value: AttendanceAlertPreferences } | { error: string } {
  const patch = asRecord(body);
  const next: AttendanceAlertPreferences = {
    ...current,
    channels: { ...current.channels },
    events: { ...current.events },
    quietHours: { ...current.quietHours },
  };

  if ("enabled" in patch) {
    if (typeof patch.enabled !== "boolean") return { error: "enabled must be true or false" };
    next.enabled = patch.enabled;
  }

  const groups = [
    ["channels", ["mobile", "web", "bell"]],
    ["events", ["checkIn", "checkOut", "autoSignOut"]],
  ] as const;
  for (const [group, keys] of groups) {
    if (!(group in patch)) continue;
    const g = asRecord(patch[group]);
    for (const key of keys) {
      if (!(key in g)) continue;
      if (typeof g[key] !== "boolean") return { error: `${group}.${key} must be true or false` };
      (next[group] as Record<string, boolean>)[key] = g[key] as boolean;
    }
  }

  if ("sites" in patch) {
    const sites = siteList(patch.sites);
    if (sites === null) return { error: `sites must be "all" or a list of up to ${MAX_SELECTED_SITES} site ids` };
    if (sites !== "all") {
      const unknown = sites.filter((id) => !visibleSiteIds.has(id));
      if (unknown.length > 0) return { error: "You can only choose sites you look after" };
      if (sites.length === 0) return { error: "Choose at least one site, or all my sites" };
    }
    next.sites = sites;
  }

  if ("frequency" in patch) {
    if (typeof patch.frequency !== "string" || !FREQUENCIES.has(patch.frequency)) {
      return { error: "frequency must be instant, hourly or daily" };
    }
    next.frequency = patch.frequency as AlertFrequency;
  }

  if ("dailySummaryTime" in patch) {
    if (typeof patch.dailySummaryTime !== "string" || !HH_MM.test(patch.dailySummaryTime)) {
      return { error: "dailySummaryTime must be HH:MM" };
    }
    next.dailySummaryTime = patch.dailySummaryTime;
  }

  if ("quietHours" in patch) {
    const q = asRecord(patch.quietHours);
    if ("enabled" in q) {
      if (typeof q.enabled !== "boolean") return { error: "quietHours.enabled must be true or false" };
      next.quietHours.enabled = q.enabled;
    }
    for (const key of ["start", "end"] as const) {
      if (!(key in q)) continue;
      if (typeof q[key] !== "string" || !HH_MM.test(q[key] as string)) {
        return { error: `quietHours.${key} must be HH:MM` };
      }
      next.quietHours[key] = q[key] as string;
    }
  }

  if ("timeZone" in patch) {
    if (!isValidTimeZone(patch.timeZone)) return { error: "timeZone is not a recognised time zone" };
    next.timeZone = patch.timeZone;
  }

  return { value: next };
}

/** Store the attendance block without touching other keys in `notification_preferences`. */
export function withAttendancePreferences(
  root: unknown,
  attendance: AttendanceAlertPreferences,
): Record<string, unknown> {
  return { ...asRecord(root), attendance };
}
