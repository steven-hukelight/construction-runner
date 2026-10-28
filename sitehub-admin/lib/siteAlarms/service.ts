import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { MobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { normalizeRole, usesAssignedSites } from "@/lib/auth/roles";
import { currentSignedInSiteId } from "@/lib/auth/siteScope";
import {
  EMERGENCY_PLAN_BUCKET,
  type AlarmInstructions,
  type MusterPoint,
  type ResponseRow,
  type SiteAlarmRow,
} from "@/lib/siteAlarms/types";

export type AlarmCaller = Pick<MobileApiAuth, "uid" | "role" | "companyId" | "isSuperuser">;

export type SiteRef = { id: string; company_id: string; name: string; manager_id: string | null };

const SIGNED_URL_SECONDS = 60 * 60;

export async function loadSite(siteId: string): Promise<SiteRef | null> {
  const id = siteId.trim();
  if (!id) return null;
  const { data } = await supabaseAdmin.from("sites").select("id, company_id, name, manager_id").eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as { id: string; company_id: string | null; name: string | null; manager_id: string | null };
  return { id: row.id, company_id: String(row.company_id ?? ""), name: row.name?.trim() || "Site", manager_id: row.manager_id };
}

export async function loadSites(siteIds: string[]): Promise<Map<string, SiteRef>> {
  const ids = [...new Set(siteIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const { data } = await supabaseAdmin.from("sites").select("id, company_id, name, manager_id").in("id", ids);
  return new Map(
    (data ?? []).map((row) => {
      const r = row as { id: string; company_id: string | null; name: string | null; manager_id: string | null };
      return [r.id, { id: r.id, company_id: String(r.company_id ?? ""), name: r.name?.trim() || "Site", manager_id: r.manager_id }];
    }),
  );
}

export async function personDetails(
  userIds: string[],
): Promise<Map<string, { name: string; role: string | null; phone: string | null }>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const out = new Map<string, { name: string; role: string | null; phone: string | null }>();
  if (!ids.length) return out;
  const { data } = await supabaseAdmin.from("users").select("id, name, display_name, email, role, phone").in("id", ids);
  for (const row of data ?? []) {
    const u = row as { id: string; name?: string | null; display_name?: string | null; email?: string | null; role?: string | null; phone?: string | null };
    const name = u.name?.trim() || u.display_name?.trim() || (u.email ? u.email.split("@")[0] : "") || "Unknown";
    out.set(u.id, { name, role: u.role ?? null, phone: u.phone?.trim() || null });
  }
  return out;
}

/**
 * Supervisors and admins who look after a site: platform superusers, the company's admins,
 * site admins / supervisors assigned to it, and the site manager.
 */
export async function isStaffForSite(caller: AlarmCaller, site: SiteRef): Promise<boolean> {
  const role = normalizeRole(caller.role);
  if (role === "superuser" || caller.isSuperuser) return true;
  const uid = (caller.uid ?? "").trim();
  if (!uid || !caller.companyId || caller.companyId !== site.company_id) return false;
  if (role === "admin") return true;
  if (site.manager_id && site.manager_id === uid) return true;
  if (!usesAssignedSites(role)) return false;
  const { data } = await supabaseAdmin.from("user_sites").select("site_id").eq("user_id", uid).eq("site_id", site.id).maybeSingle();
  return Boolean(data);
}

/** Sites the caller manages, for history and the active alarm banner. Null = every site in the company. */
export async function staffSiteIds(caller: AlarmCaller): Promise<string[] | null> {
  const role = normalizeRole(caller.role);
  const uid = (caller.uid ?? "").trim();
  if (!uid) return [];
  if (role === "superuser" || caller.isSuperuser || role === "admin") return null;
  const ids = new Set<string>();
  if (usesAssignedSites(role)) {
    const { data } = await supabaseAdmin.from("user_sites").select("site_id").eq("user_id", uid);
    for (const row of data ?? []) ids.add(String((row as { site_id: string }).site_id));
  }
  if (caller.companyId) {
    const { data } = await supabaseAdmin.from("sites").select("id").eq("manager_id", uid).eq("company_id", caller.companyId);
    for (const row of data ?? []) ids.add(String((row as { id: string }).id));
  }
  return [...ids];
}

export async function loadAlarm(alarmId: string): Promise<SiteAlarmRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(alarmId)) return null;
  const { data } = await supabaseAdmin.from("site_alarms").select("*").eq("id", alarmId).maybeSingle();
  return (data as SiteAlarmRow | null) ?? null;
}

export async function loadActiveAlarm(siteId: string): Promise<SiteAlarmRow | null> {
  const { data } = await supabaseAdmin.from("site_alarms").select("*").eq("site_id", siteId).eq("status", "active").maybeSingle();
  return (data as SiteAlarmRow | null) ?? null;
}

export type AlarmAccess = { allowed: boolean; staff: boolean };

/** Staff for the site, anyone notified when it was raised, or anyone signed in there now. */
export async function alarmAccess(caller: AlarmCaller, alarm: SiteAlarmRow, site: SiteRef): Promise<AlarmAccess> {
  if (await isStaffForSite(caller, site)) return { allowed: true, staff: true };
  const uid = (caller.uid ?? "").trim();
  if (!uid) return { allowed: false, staff: false };
  if ((alarm.audience_snapshot ?? []).some((m) => m.user_id === uid)) return { allowed: true, staff: false };
  return { allowed: (await currentSignedInSiteId(uid)) === site.id, staff: false };
}

export type EmergencyPlanView = {
  site_id: string;
  muster_points: MusterPoint[];
  instructions: AlarmInstructions;
  first_aid_info: string | null;
  fire_strategy: { url: string; mime: string | null; name: string | null } | null;
  site_plan: { url: string; width: number | null; height: number | null } | null;
  updated_at: string | null;
};

async function signed(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage.from(EMERGENCY_PLAN_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) {
    console.error("site emergency plan signed url:", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

export type EmergencyPlanRow = {
  site_id: string;
  company_id: string;
  muster_points: MusterPoint[] | null;
  fire_strategy_path: string | null;
  fire_strategy_mime: string | null;
  fire_strategy_name: string | null;
  site_plan_path: string | null;
  site_plan_width: number | null;
  site_plan_height: number | null;
  instructions: AlarmInstructions | null;
  first_aid_info: string | null;
  updated_at: string | null;
};

export async function loadPlanRow(siteId: string): Promise<EmergencyPlanRow | null> {
  const { data } = await supabaseAdmin.from("site_emergency_plans").select("*").eq("site_id", siteId).maybeSingle();
  return (data as EmergencyPlanRow | null) ?? null;
}

export async function emergencyPlanView(siteId: string, row?: EmergencyPlanRow | null): Promise<EmergencyPlanView> {
  const plan = row === undefined ? await loadPlanRow(siteId) : row;
  const [strategyUrl, planUrl] = await Promise.all([signed(plan?.fire_strategy_path), signed(plan?.site_plan_path)]);
  return {
    site_id: siteId,
    muster_points: Array.isArray(plan?.muster_points) ? plan!.muster_points : [],
    instructions: plan?.instructions ?? {},
    first_aid_info: plan?.first_aid_info ?? null,
    fire_strategy: strategyUrl ? { url: strategyUrl, mime: plan?.fire_strategy_mime ?? null, name: plan?.fire_strategy_name ?? null } : null,
    site_plan: planUrl ? { url: planUrl, width: plan?.site_plan_width ?? null, height: plan?.site_plan_height ?? null } : null,
    updated_at: plan?.updated_at ?? null,
  };
}

export async function loadResponses(alarmId: string): Promise<ResponseRow[]> {
  const { data } = await supabaseAdmin.from("site_alarm_responses").select("*").eq("alarm_id", alarmId);
  return (data ?? []) as ResponseRow[];
}

/** Public shape of an alarm. Staff also get the raiser's phone number. */
export async function alarmView(
  alarm: SiteAlarmRow,
  site: SiteRef,
  opts: { callerId: string | null; staff: boolean; withPlan?: boolean },
) {
  const [responses, raiser, plan] = await Promise.all([
    loadResponses(alarm.id),
    opts.staff && alarm.raised_by ? personDetails([alarm.raised_by]) : Promise.resolve(null),
    opts.withPlan ? emergencyPlanView(site.id) : Promise.resolve(null),
  ]);
  const mine = opts.callerId ? responses.find((r) => r.user_id === opts.callerId) ?? null : null;
  const counts = { safe: 0, need_help: 0, responding: 0 };
  for (const r of responses) counts[r.status] += 1;
  const onSite = (alarm.audience_snapshot ?? []).filter((m) => m.on_site);
  const respondedOnSite = onSite.filter((m) => responses.some((r) => r.user_id === m.user_id)).length;
  return {
    id: alarm.id,
    site_id: alarm.site_id,
    site_name: site.name,
    type: alarm.type,
    status: alarm.status,
    is_drill: alarm.is_drill,
    raised_by: alarm.raised_by,
    raised_by_name: alarm.raised_by_name,
    raised_by_role: alarm.raised_by_role,
    raised_by_phone: raiser && alarm.raised_by ? raiser.get(alarm.raised_by)?.phone ?? null : null,
    raised_at: alarm.raised_at,
    raised_lat: alarm.raised_lat,
    raised_lng: alarm.raised_lng,
    note: alarm.note,
    additional_raisers: alarm.additional_raisers ?? [],
    stood_down_by_name: alarm.stood_down_by_name,
    stood_down_at: alarm.stood_down_at,
    stand_down_reason: alarm.stand_down_reason,
    outcome: alarm.outcome,
    my_response: mine ? { status: mine.status, responded_at: mine.responded_at } : null,
    counts: { ...counts, on_site: onSite.length, unaccounted: onSite.length - respondedOnSite },
    can_manage: opts.staff,
    plan,
  };
}
