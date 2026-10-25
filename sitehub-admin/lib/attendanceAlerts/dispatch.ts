import { usesAssignedSites } from "@/lib/auth/roles";
import { sendPushToUsers } from "@/lib/onesignal";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerPublicOrigin } from "@/lib/url";
import {
  alertContent,
  alertNotificationType,
  summaryContent,
  type AttendanceEventKind,
  type SummaryCounts,
} from "./format";
import { ATTENDANCE_ALERT_ROLES, parseAttendanceAlertPreferences } from "./preferences";
import { deliveryFor, managerCoversEvent, type AlertManager, type Delivery } from "./recipients";
import { dueSummaryWindow, localTime, type SummaryWindow } from "./schedule";

export const ATTENDANCE_ALERT_TOPIC = "attendance_alerts";
export const ATTENDANCE_SUMMARY_TYPE = "attendance_summary";

const CLAIM_BATCH = 100;
const MAX_CLAIM_ROUNDS = 5;

type EventRow = {
  id: string;
  attendance_id: string;
  company_id: string | null;
  site_id: string;
  operative_id: string | null;
  event: AttendanceEventKind;
  occurred_at: string;
  signed_in_at: string | null;
  reason: string | null;
};

type ManagerRow = { id: string; role: string | null; company_id: string | null; notification_preferences: unknown };

export type DispatchResult = {
  events: number;
  bellRows: number;
  pushes: number;
  summaries: number;
  errors: string[];
};

async function toManagers(rows: ManagerRow[]): Promise<AlertManager[]> {
  const enabled = rows
    .map((r) => ({ row: r, prefs: parseAttendanceAlertPreferences(r.notification_preferences) }))
    .filter(({ row, prefs }) => prefs.enabled && row.company_id && ATTENDANCE_ALERT_ROLES.has(String(row.role ?? "").toLowerCase()));

  const scopedIds = enabled.filter(({ row }) => usesAssignedSites(row.role)).map(({ row }) => row.id);
  const sitesByUser = new Map<string, Set<string>>();
  if (scopedIds.length > 0) {
    const { data, error } = await supabaseAdmin.from("user_sites").select("user_id, site_id").in("user_id", scopedIds);
    if (error) throw new Error(`user_sites: ${error.message}`);
    for (const r of (data ?? []) as { user_id: string; site_id: string }[]) {
      const set = sitesByUser.get(r.user_id) ?? new Set<string>();
      set.add(String(r.site_id));
      sitesByUser.set(r.user_id, set);
    }
  }

  return enabled.map(({ row, prefs }) => ({
    id: row.id,
    role: String(row.role ?? "").toLowerCase(),
    companyId: String(row.company_id),
    prefs,
    assignedSiteIds: usesAssignedSites(row.role) ? (sitesByUser.get(row.id) ?? new Set<string>()) : null,
  }));
}

async function loadManagersForCompanies(companyIds: string[]): Promise<AlertManager[]> {
  if (companyIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, role, company_id, notification_preferences")
    .in("company_id", companyIds)
    .in("role", [...ATTENDANCE_ALERT_ROLES])
    .filter("notification_preferences->attendance->>enabled", "eq", "true");
  if (error) throw new Error(`users: ${error.message}`);
  return toManagers((data ?? []) as ManagerRow[]);
}

async function loadSummaryManagers(): Promise<AlertManager[]> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, role, company_id, notification_preferences")
    .in("role", [...ATTENDANCE_ALERT_ROLES])
    .filter("notification_preferences->attendance->>enabled", "eq", "true")
    .in("notification_preferences->attendance->>frequency", ["hourly", "daily"]);
  if (error) throw new Error(`users: ${error.message}`);
  return toManagers((data ?? []) as ManagerRow[]);
}

class NameBook {
  private people = new Map<string, string>();
  private sites = new Map<string, string>();

  async load(operativeIds: string[], siteIds: string[]): Promise<void> {
    const newPeople = [...new Set(operativeIds)].filter((id) => id && !this.people.has(id));
    if (newPeople.length > 0) {
      const { data } = await supabaseAdmin.from("users").select("id, name, display_name, email").in("id", newPeople);
      for (const u of (data ?? []) as { id: string; name?: string | null; display_name?: string | null; email?: string | null }[]) {
        const name = (u.name ?? "").trim() || (u.display_name ?? "").trim();
        if (name) this.people.set(u.id, name);
      }
      const missing = newPeople.filter((id) => !this.people.has(id));
      if (missing.length > 0) {
        const { data: personal } = await supabaseAdmin
          .from("pre_induction_personal")
          .select("user_id, full_name")
          .in("user_id", missing);
        for (const p of (personal ?? []) as { user_id: string; full_name?: string | null }[]) {
          const name = (p.full_name ?? "").trim();
          if (name) this.people.set(p.user_id, name);
        }
      }
    }

    const newSites = [...new Set(siteIds)].filter((id) => id && !this.sites.has(id));
    if (newSites.length > 0) {
      const { data } = await supabaseAdmin.from("sites").select("id, name").in("id", newSites);
      for (const s of (data ?? []) as { id: string; name?: string | null }[]) {
        const name = (s.name ?? "").trim();
        if (name) this.sites.set(String(s.id), name);
      }
    }
  }

  person(id: string | null): string {
    return (id && this.people.get(id)) || "An operative";
  }

  site(id: string): string {
    return this.sites.get(id) || "Site";
  }
}

function attendanceUrl(siteId: string, at: Date, timeZone: string): string {
  const date = localTime(at, timeZone).ymd;
  return `${getServerPublicOrigin()}/dashboard/attendance?siteId=${encodeURIComponent(siteId)}&date=${date}`;
}

type Outgoing = {
  recipients: { manager: AlertManager; delivery: Delivery }[];
  type: string;
  siteId: string;
  /** Moment the alert is about, used for the link date and the bell timestamp text. */
  at: Date;
  eventKey: (managerId: string) => string;
  content: (timeZone: string) => { title: string; body: string };
  data: Record<string, string>;
};

async function insertBellRows(rows: Record<string, unknown>[], errors: string[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error } = await supabaseAdmin.from("notifications").insert(rows);
  if (!error) return rows.length;
  if ((error as { code?: string }).code !== "23505") {
    errors.push(`notifications insert: ${error.message}`);
    return 0;
  }
  let inserted = 0;
  for (const row of rows) {
    const { error: oneErr } = await supabaseAdmin.from("notifications").insert(row);
    if (!oneErr) inserted += 1;
    else if ((oneErr as { code?: string }).code !== "23505") errors.push(`notifications insert: ${oneErr.message}`);
  }
  return inserted;
}

/** Write bell rows, then one push request per channel and time zone with every recipient in it. */
async function deliver(out: Outgoing, errors: string[]): Promise<{ bellRows: number; pushes: number }> {
  const nowIso = new Date().toISOString();
  const bell = out.recipients
    .filter((r) => r.delivery.bell)
    .map(({ manager }) => {
      const { title, body } = out.content(manager.prefs.timeZone);
      return {
        user_id: manager.id,
        topic: ATTENDANCE_ALERT_TOPIC,
        type: out.type,
        title,
        body,
        data: { ...out.data, event_key: out.eventKey(manager.id) },
        sent_at: nowIso,
        push_dispatched_at: nowIso,
      };
    });
  const bellRows = await insertBellRows(bell, errors);

  const batches = new Map<string, { platform: "mobile" | "web"; timeZone: string; ids: string[] }>();
  for (const { manager, delivery } of out.recipients) {
    for (const platform of ["mobile", "web"] as const) {
      if (!delivery[platform]) continue;
      const key = `${platform}|${manager.prefs.timeZone}`;
      const batch = batches.get(key) ?? { platform, timeZone: manager.prefs.timeZone, ids: [] };
      batch.ids.push(manager.id);
      batches.set(key, batch);
    }
  }

  let pushes = 0;
  for (const batch of batches.values()) {
    const { title, body } = out.content(batch.timeZone);
    const res = await sendPushToUsers(batch.ids, title, body, out.data, {
      platform: batch.platform,
      webUrl: batch.platform === "web" ? attendanceUrl(out.siteId, out.at, batch.timeZone) : undefined,
      groupId: `attendance-${out.siteId}`,
    });
    if (res.sent) pushes += 1;
    else if (res.error) errors.push(`push (${batch.platform}): ${res.error}`);
  }
  return { bellRows, pushes };
}

async function dispatchEvents(now: Date, names: NameBook, result: DispatchResult): Promise<void> {
  const managersByCompany = new Map<string, AlertManager[]>();

  for (let round = 0; round < MAX_CLAIM_ROUNDS; round++) {
    const { data, error } = await supabaseAdmin.rpc("claim_attendance_events", { p_limit: CLAIM_BATCH });
    if (error) {
      result.errors.push(`claim: ${error.message}`);
      return;
    }
    const events = (data ?? []) as EventRow[];
    if (events.length === 0) return;
    result.events += events.length;

    const newCompanies = [...new Set(events.map((e) => e.company_id).filter((c): c is string => !!c))].filter(
      (c) => !managersByCompany.has(c),
    );
    if (newCompanies.length > 0) {
      const managers = await loadManagersForCompanies(newCompanies);
      for (const c of newCompanies) managersByCompany.set(c, []);
      for (const m of managers) managersByCompany.get(m.companyId)?.push(m);
    }

    const relevant = events
      .map((ev) => ({
        ev,
        recipients: (managersByCompany.get(ev.company_id ?? "") ?? []).filter(
          (m) =>
            m.prefs.frequency === "instant" &&
            managerCoversEvent(m, {
              companyId: ev.company_id,
              siteId: ev.site_id,
              operativeId: ev.operative_id,
              event: ev.event,
            }),
        ),
      }))
      .filter((x) => x.recipients.length > 0);
    if (relevant.length === 0) {
      if (events.length < CLAIM_BATCH) return;
      continue;
    }

    await names.load(
      relevant.map((x) => x.ev.operative_id ?? ""),
      relevant.map((x) => x.ev.site_id),
    );

    for (const { ev, recipients } of relevant) {
      const occurredAt = new Date(ev.occurred_at);
      const signedInAt = ev.signed_in_at ? new Date(ev.signed_in_at) : null;
      const type = alertNotificationType(ev.event);
      const sent = await deliver(
        {
          recipients: recipients.map((manager) => ({
            manager,
            delivery: deliveryFor(manager.prefs, { now, occurredAt }),
          })),
          type,
          siteId: ev.site_id,
          at: occurredAt,
          eventKey: () => `event:${ev.id}`,
          content: (timeZone) =>
            alertContent({
              event: ev.event,
              operativeName: names.person(ev.operative_id),
              siteName: names.site(ev.site_id),
              occurredAt,
              signedInAt,
              reason: ev.reason,
              timeZone,
            }),
          data: {
            type,
            screen: "site_attendance",
            site_id: ev.site_id,
            attendance_id: ev.attendance_id,
            occurred_at: occurredAt.toISOString(),
          },
        },
        result.errors,
      );
      result.bellRows += sent.bellRows;
      result.pushes += sent.pushes;
    }

    if (events.length < CLAIM_BATCH) return;
  }
}

async function summaryAlreadySent(userId: string, key: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("topic", ATTENDANCE_ALERT_TOPIC)
    .eq("type", ATTENDANCE_SUMMARY_TYPE)
    .filter("data->>summary_key", "eq", key)
    .limit(1);
  return (data ?? []).length > 0;
}

async function dispatchSummaries(now: Date, names: NameBook, result: DispatchResult): Promise<void> {
  const managers = await loadSummaryManagers();
  const eventCache = new Map<string, EventRow[]>();

  for (const manager of managers) {
    const window = dueSummaryWindow(now, manager.prefs);
    if (!window) continue;
    if (await summaryAlreadySent(manager.id, window.key)) continue;

    const cacheKey = `${manager.companyId}|${window.from.toISOString()}|${window.to.toISOString()}`;
    let events = eventCache.get(cacheKey);
    if (!events) {
      const { data, error } = await supabaseAdmin
        .from("attendance_events")
        .select("id, attendance_id, company_id, site_id, operative_id, event, occurred_at, signed_in_at, reason")
        .eq("company_id", manager.companyId)
        .gte("occurred_at", window.from.toISOString())
        .lt("occurred_at", window.to.toISOString())
        .limit(5000);
      if (error) {
        result.errors.push(`summary events: ${error.message}`);
        continue;
      }
      events = (data ?? []) as EventRow[];
      eventCache.set(cacheKey, events);
    }

    const bySite = new Map<string, SummaryCounts>();
    for (const ev of events) {
      if (
        !managerCoversEvent(manager, {
          companyId: ev.company_id,
          siteId: ev.site_id,
          operativeId: ev.operative_id,
          event: ev.event,
        })
      ) {
        continue;
      }
      const counts = bySite.get(ev.site_id) ?? { checkIns: 0, checkOuts: 0, autoSignOuts: 0 };
      if (ev.event === "check_in") counts.checkIns += 1;
      else if (ev.event === "check_out") counts.checkOuts += 1;
      else counts.autoSignOuts += 1;
      bySite.set(ev.site_id, counts);
    }
    if (bySite.size === 0) continue;

    await names.load([], [...bySite.keys()]);
    const delivery = deliveryFor(manager.prefs, { now, occurredAt: null });
    for (const [siteId, counts] of bySite) {
      const sent = await sendSummary(manager, delivery, siteId, counts, window, names, result.errors);
      result.bellRows += sent.bellRows;
      result.pushes += sent.pushes;
      result.summaries += 1;
    }
  }
}

function sendSummary(
  manager: AlertManager,
  delivery: Delivery,
  siteId: string,
  counts: SummaryCounts,
  window: SummaryWindow,
  names: NameBook,
  errors: string[],
) {
  return deliver(
    {
      recipients: [{ manager, delivery }],
      type: ATTENDANCE_SUMMARY_TYPE,
      siteId,
      at: window.to,
      eventKey: () => `summary:${window.key}:${siteId}`,
      content: (timeZone) => summaryContent({ siteName: names.site(siteId), counts, window, timeZone }),
      data: {
        type: ATTENDANCE_SUMMARY_TYPE,
        screen: "site_attendance",
        site_id: siteId,
        summary_key: window.key,
        occurred_at: window.to.toISOString(),
      },
    },
    errors,
  );
}

/** Send instant alerts for new attendance events, then any summaries that are due. */
export async function dispatchAttendanceAlerts(now = new Date()): Promise<DispatchResult> {
  const result: DispatchResult = { events: 0, bellRows: 0, pushes: 0, summaries: 0, errors: [] };
  const names = new NameBook();
  try {
    await dispatchEvents(now, names, result);
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
  }
  try {
    await dispatchSummaries(now, names, result);
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
  }
  result.errors = result.errors.slice(0, 20);
  return result;
}
