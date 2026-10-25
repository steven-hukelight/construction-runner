import type { AttendanceEventKind } from "./format";
import { canReceiveAttendanceAlerts, type AttendanceAlertPreferences } from "./preferences";
import { inQuietHours, isStale } from "./schedule";

export type AlertManager = {
  id: string;
  role: string;
  companyId: string;
  prefs: AttendanceAlertPreferences;
  /** Sites from `user_sites` for site admins and supervisors; `null` = every company site (admin). */
  assignedSiteIds: ReadonlySet<string> | null;
};

export type AlertEvent = {
  companyId: string | null;
  siteId: string;
  operativeId: string | null;
  event: AttendanceEventKind;
};

const EVENT_TOGGLE: Record<AttendanceEventKind, keyof AttendanceAlertPreferences["events"]> = {
  check_in: "checkIn",
  check_out: "checkOut",
  auto_sign_out: "autoSignOut",
};

/** Whether this person can see the site right now and has asked for this kind of event there. */
export function managerCoversEvent(manager: AlertManager, ev: AlertEvent): boolean {
  if (!canReceiveAttendanceAlerts(manager.role)) return false;
  if (!ev.companyId || manager.companyId !== ev.companyId) return false;
  if (ev.operativeId && manager.id === ev.operativeId) return false;
  if (manager.assignedSiteIds && !manager.assignedSiteIds.has(ev.siteId)) return false;
  const { prefs } = manager;
  if (!prefs.enabled) return false;
  if (!prefs.events[EVENT_TOGGLE[ev.event]]) return false;
  if (prefs.sites !== "all" && !prefs.sites.includes(ev.siteId)) return false;
  return true;
}

export type Delivery = { bell: boolean; mobile: boolean; web: boolean };

/** Where one alert goes. Pushes are held in quiet hours and for stale events; the bell still gets it. */
export function deliveryFor(
  prefs: AttendanceAlertPreferences,
  opts: { now: Date; occurredAt: Date | null },
): Delivery {
  const canPush = !inQuietHours(opts.now, prefs) && !(opts.occurredAt && isStale(opts.occurredAt, opts.now));
  return {
    bell: prefs.channels.bell,
    mobile: canPush && prefs.channels.mobile,
    web: canPush && prefs.channels.web,
  };
}
