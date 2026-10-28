import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canViewTeamAttendance } from "@/lib/auth/roles";
import { loadSites, staffSiteIds } from "@/lib/siteAlarms/service";
import type { SiteAlarmRow } from "@/lib/siteAlarms/types";

/** Alarm and drill history for the sites the caller looks after. `?siteId=`, `?drills=only|exclude`. */
export async function GET(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    if (!canViewTeamAttendance(auth.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const url = new URL(req.url);
    const siteId = url.searchParams.get("siteId")?.trim() || null;
    const drills = url.searchParams.get("drills");
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 100));

    const managed = await staffSiteIds(auth);
    let query = supabaseAdmin.from("site_alarms").select("*").order("raised_at", { ascending: false }).limit(limit);
    if (managed === null) {
      const companyId = (auth.companyId ?? "").trim();
      if (companyId) query = query.eq("company_id", companyId);
      else return NextResponse.json({ alarms: [] });
    } else {
      if (!managed.length) return NextResponse.json({ alarms: [] });
      query = query.in("site_id", managed);
    }
    if (siteId) query = query.eq("site_id", siteId);
    if (drills === "only") query = query.eq("is_drill", true);
    if (drills === "exclude") query = query.eq("is_drill", false);

    const { data, error } = await query;
    if (error) {
      console.error("GET /api/alarms:", error);
      return NextResponse.json({ alarms: [] });
    }
    const alarms = (data ?? []) as SiteAlarmRow[];
    const sites = await loadSites(alarms.map((a) => a.site_id));
    const ids = alarms.map((a) => a.id);
    const { data: responses } = ids.length
      ? await supabaseAdmin.from("site_alarm_responses").select("alarm_id, user_id, status").in("alarm_id", ids)
      : { data: [] };
    const byAlarm = new Map<string, { user_id: string; status: string }[]>();
    for (const r of responses ?? []) {
      const row = r as { alarm_id: string; user_id: string; status: string };
      byAlarm.set(row.alarm_id, [...(byAlarm.get(row.alarm_id) ?? []), row]);
    }

    return NextResponse.json({
      alarms: alarms.map((a) => {
        const rs = byAlarm.get(a.id) ?? [];
        const onSite = (a.audience_snapshot ?? []).filter((m) => m.on_site);
        const responded = new Set(rs.map((r) => r.user_id));
        return {
          id: a.id,
          site_id: a.site_id,
          site_name: sites.get(a.site_id)?.name ?? "Site",
          type: a.type,
          status: a.status,
          is_drill: a.is_drill,
          raised_by_name: a.raised_by_name,
          raised_by_role: a.raised_by_role,
          raised_at: a.raised_at,
          additional_raisers: a.additional_raisers ?? [],
          stood_down_by_name: a.stood_down_by_name,
          stood_down_at: a.stood_down_at,
          stand_down_reason: a.stand_down_reason,
          outcome: a.outcome,
          counts: {
            on_site: onSite.length,
            safe: rs.filter((r) => r.status === "safe").length,
            need_help: rs.filter((r) => r.status === "need_help").length,
            responding: rs.filter((r) => r.status === "responding").length,
            unaccounted: onSite.filter((m) => !responded.has(m.user_id)).length,
          },
        };
      }),
    });
  } catch (e) {
    console.error("GET /api/alarms failed:", e);
    return NextResponse.json({ alarms: [] });
  }
}
