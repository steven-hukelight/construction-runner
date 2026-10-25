import {
  DEFAULT_ATTENDANCE_ALERT_PREFERENCES,
  applyAttendanceAlertPatch,
  canReceiveAttendanceAlerts,
  parseAttendanceAlertPreferences,
  withAttendancePreferences,
  type AttendanceAlertPreferences,
} from "@/lib/attendanceAlerts/preferences";
import { dueSummaryWindow, inQuietHours, isStale } from "@/lib/attendanceAlerts/schedule";
import { alertContent, alertNotificationType, formatDuration, summaryContent } from "@/lib/attendanceAlerts/format";
import { deliveryFor, managerCoversEvent, type AlertManager } from "@/lib/attendanceAlerts/recipients";

function prefs(overrides: Partial<AttendanceAlertPreferences> = {}): AttendanceAlertPreferences {
  return { ...DEFAULT_ATTENDANCE_ALERT_PREFERENCES, enabled: true, ...overrides };
}

const london = (iso: string) => new Date(iso);

describe("attendance alert preferences", () => {
  it("is off by default, with automatic sign-out the only event on", () => {
    const p = parseAttendanceAlertPreferences({});
    expect(p.enabled).toBe(false);
    expect(p.events).toEqual({ checkIn: false, checkOut: false, autoSignOut: true });
    expect(p.channels).toEqual({ mobile: true, web: true, bell: true });
    expect(p.sites).toBe("all");
    expect(p.frequency).toBe("instant");
  });

  it("ignores junk in storage", () => {
    const p = parseAttendanceAlertPreferences({
      attendance: { enabled: "yes", frequency: "weekly", timeZone: "Mars/Base", dailySummaryTime: "25:00", sites: 7 },
    });
    expect(p.enabled).toBe(false);
    expect(p.frequency).toBe("instant");
    expect(p.timeZone).toBe("Europe/London");
    expect(p.dailySummaryTime).toBe("17:00");
    expect(p.sites).toBe("all");
  });

  it("only offers alerts to admins, site admins and supervisors", () => {
    expect(canReceiveAttendanceAlerts("admin")).toBe(true);
    expect(canReceiveAttendanceAlerts("site_admin")).toBe(true);
    expect(canReceiveAttendanceAlerts("Supervisor")).toBe(true);
    expect(canReceiveAttendanceAlerts("operative")).toBe(false);
    expect(canReceiveAttendanceAlerts("superuser")).toBe(false);
    expect(canReceiveAttendanceAlerts("sub_admin")).toBe(false);
  });

  it("applies a partial update and keeps the rest", () => {
    const current = parseAttendanceAlertPreferences({});
    const res = applyAttendanceAlertPatch(
      current,
      { enabled: true, channels: { web: false }, events: { checkIn: true }, quietHours: { enabled: true, start: "20:00" } },
      new Set(),
    );
    expect("value" in res && res.value).toMatchObject({
      enabled: true,
      channels: { mobile: true, web: false, bell: true },
      events: { checkIn: true, checkOut: false, autoSignOut: true },
      quietHours: { enabled: true, start: "20:00", end: "06:00" },
    });
  });

  it("rejects sites the person cannot see, and an empty site list", () => {
    const current = parseAttendanceAlertPreferences({});
    expect(applyAttendanceAlertPatch(current, { sites: ["s1", "s9"] }, new Set(["s1"]))).toEqual({
      error: "You can only choose sites you look after",
    });
    expect(applyAttendanceAlertPatch(current, { sites: [] }, new Set(["s1"]))).toHaveProperty("error");
    const ok = applyAttendanceAlertPatch(current, { sites: ["s1", "s1"] }, new Set(["s1"]));
    expect("value" in ok && ok.value.sites).toEqual(["s1"]);
  });

  it("rejects wrong types instead of guessing", () => {
    const current = parseAttendanceAlertPreferences({});
    expect(applyAttendanceAlertPatch(current, { enabled: "true" }, new Set())).toHaveProperty("error");
    expect(applyAttendanceAlertPatch(current, { frequency: "weekly" }, new Set())).toHaveProperty("error");
    expect(applyAttendanceAlertPatch(current, { quietHours: { end: "6am" } }, new Set())).toHaveProperty("error");
    expect(applyAttendanceAlertPatch(current, { timeZone: "Nowhere/Here" }, new Set())).toHaveProperty("error");
  });

  it("stores the block without dropping other preferences", () => {
    const root = withAttendancePreferences({ other: 1 }, prefs());
    expect(root.other).toBe(1);
    expect(parseAttendanceAlertPreferences(root).enabled).toBe(true);
  });
});

describe("quiet hours and staleness", () => {
  const quiet = prefs({ quietHours: { enabled: true, start: "19:00", end: "06:00" } });

  it("wraps past midnight in the person's time zone", () => {
    // 20:30 BST = 19:30 UTC
    expect(inQuietHours(london("2026-07-01T19:30:00Z"), quiet)).toBe(true);
    expect(inQuietHours(london("2026-07-01T04:30:00Z"), quiet)).toBe(true);
    expect(inQuietHours(london("2026-07-01T05:00:00Z"), quiet)).toBe(false);
    expect(inQuietHours(london("2026-07-01T12:00:00Z"), quiet)).toBe(false);
  });

  it("does nothing when switched off", () => {
    expect(inQuietHours(london("2026-07-01T22:00:00Z"), prefs())).toBe(false);
  });

  it("treats events over 30 minutes old as stale", () => {
    const now = london("2026-07-01T12:00:00Z");
    expect(isStale(london("2026-07-01T11:31:00Z"), now)).toBe(false);
    expect(isStale(london("2026-07-01T11:29:00Z"), now)).toBe(true);
  });
});

describe("summary windows", () => {
  it("sends the previous local hour just after the hour", () => {
    const p = prefs({ frequency: "hourly" });
    const w = dueSummaryWindow(london("2026-07-01T08:03:20Z"), p);
    expect(w?.kind).toBe("hourly");
    expect(w?.from.toISOString()).toBe("2026-07-01T07:00:00.000Z");
    expect(w?.to.toISOString()).toBe("2026-07-01T08:00:00.000Z");
    expect(dueSummaryWindow(london("2026-07-01T08:30:00Z"), p)).toBeNull();
  });

  it("sends the end-of-day summary at the chosen local time, covering since midnight", () => {
    const p = prefs({ frequency: "daily", dailySummaryTime: "17:00" });
    // 17:02 BST
    const w = dueSummaryWindow(london("2026-07-01T16:02:00Z"), p);
    expect(w?.kind).toBe("daily");
    expect(w?.key).toBe("daily:2026-07-01");
    expect(w?.to.toISOString()).toBe("2026-07-01T16:00:00.000Z");
    expect(w?.from.toISOString()).toBe("2026-06-30T23:00:00.000Z");
    expect(dueSummaryWindow(london("2026-07-01T15:59:00Z"), p)).toBeNull();
    expect(dueSummaryWindow(london("2026-07-01T16:20:00Z"), p)).toBeNull();
  });

  it("never runs for instant or disabled settings", () => {
    expect(dueSummaryWindow(london("2026-07-01T08:01:00Z"), prefs())).toBeNull();
    expect(dueSummaryWindow(london("2026-07-01T08:01:00Z"), prefs({ enabled: false, frequency: "hourly" }))).toBeNull();
  });
});

describe("alert text", () => {
  const base = {
    operativeName: "Jane Smith",
    siteName: "Riverside Park",
    timeZone: "Europe/London",
    reason: null,
  };

  it("says who checked in, where and when", () => {
    expect(
      alertContent({ ...base, event: "check_in", occurredAt: london("2026-07-01T06:42:00Z"), signedInAt: null }),
    ).toEqual({ title: "Jane Smith checked in", body: "Riverside Park · 07:42" });
  });

  it("adds time on site to a check-out", () => {
    expect(
      alertContent({
        ...base,
        event: "check_out",
        occurredAt: london("2026-07-01T15:30:00Z"),
        signedInAt: london("2026-07-01T06:42:00Z"),
      }),
    ).toEqual({ title: "Jane Smith checked out", body: "Riverside Park · 16:30 · 8h 48m on site" });
  });

  it("explains automatic sign-outs", () => {
    const left = alertContent({ ...base, event: "auto_sign_out", occurredAt: london("2026-07-01T15:05:00Z"), signedInAt: null });
    expect(left).toEqual({ title: "Jane Smith was signed out automatically", body: "Left Riverside Park · 16:05" });
    const longShift = alertContent({
      ...base,
      event: "auto_sign_out",
      reason: "fallback_max_shift",
      occurredAt: london("2026-07-01T18:42:00Z"),
      signedInAt: null,
    });
    expect(longShift.body).toBe("Riverside Park · still signed in after 12 hours · 19:42");
  });

  it("uses distinct notification types from the operative's own sign-out rows", () => {
    expect(alertNotificationType("auto_sign_out")).toBe("attendance_auto_sign_out_alert");
    expect(alertNotificationType("check_in")).toBe("attendance_check_in");
  });

  it("formats durations", () => {
    expect(formatDuration(45 * 60_000)).toBe("45m");
    expect(formatDuration(2 * 3_600_000)).toBe("2h");
    expect(formatDuration(0)).toBeNull();
  });

  it("builds a summary per site", () => {
    const w = dueSummaryWindow(london("2026-07-01T08:01:00Z"), prefs({ frequency: "hourly" }))!;
    expect(
      summaryContent({
        siteName: "Riverside Park",
        counts: { checkIns: 14, checkOuts: 2, autoSignOuts: 1 },
        window: w,
        timeZone: "Europe/London",
      }),
    ).toEqual({
      title: "Riverside Park: 14 in, 3 out since 08:00",
      body: "1 signed out automatically. Tap to see the list.",
    });
  });
});

describe("recipients", () => {
  const event = { companyId: "co-1", siteId: "site-a", operativeId: "op-1", event: "check_in" as const };
  const manager = (overrides: Partial<AlertManager> = {}): AlertManager => ({
    id: "m-1",
    role: "supervisor",
    companyId: "co-1",
    prefs: prefs({ events: { checkIn: true, checkOut: true, autoSignOut: true } }),
    assignedSiteIds: new Set(["site-a"]),
    ...overrides,
  });

  it("alerts a supervisor about their own site", () => {
    expect(managerCoversEvent(manager(), event)).toBe(true);
  });

  it("does not alert a supervisor about a site they are not assigned to", () => {
    expect(managerCoversEvent(manager({ assignedSiteIds: new Set(["site-b"]) }), event)).toBe(false);
    expect(managerCoversEvent(manager({ assignedSiteIds: new Set() }), event)).toBe(false);
  });

  it("covers every company site for an admin, but never another company", () => {
    expect(managerCoversEvent(manager({ role: "admin", assignedSiteIds: null }), event)).toBe(true);
    expect(managerCoversEvent(manager({ role: "admin", assignedSiteIds: null, companyId: "co-2" }), event)).toBe(false);
    expect(managerCoversEvent(manager(), { ...event, companyId: null })).toBe(false);
  });

  it("respects the person's event and site choices", () => {
    const noCheckIns = manager({ prefs: prefs({ events: { checkIn: false, checkOut: true, autoSignOut: true } }) });
    expect(managerCoversEvent(noCheckIns, event)).toBe(false);
    const otherSiteOnly = manager({ role: "admin", assignedSiteIds: null, prefs: prefs({ events: { checkIn: true, checkOut: true, autoSignOut: true }, sites: ["site-z"] }) });
    expect(managerCoversEvent(otherSiteOnly, event)).toBe(false);
  });

  it("never alerts someone about their own sign-in, or when alerts are off", () => {
    expect(managerCoversEvent(manager({ id: "op-1" }), event)).toBe(false);
    expect(managerCoversEvent(manager({ prefs: prefs({ enabled: false }) }), event)).toBe(false);
    expect(managerCoversEvent(manager({ role: "operative" }), event)).toBe(false);
  });

  it("keeps channels separate and holds pushes for quiet hours and stale events", () => {
    const now = london("2026-07-01T12:00:00Z");
    expect(
      deliveryFor(prefs({ channels: { mobile: true, web: false, bell: false } }), { now, occurredAt: now }),
    ).toEqual({ bell: false, mobile: true, web: false });
    expect(deliveryFor(prefs(), { now, occurredAt: london("2026-07-01T11:00:00Z") })).toEqual({
      bell: true,
      mobile: false,
      web: false,
    });
    const quiet = prefs({ quietHours: { enabled: true, start: "12:00", end: "14:00" } });
    expect(deliveryFor(quiet, { now, occurredAt: now })).toEqual({ bell: true, mobile: false, web: false });
  });
});
