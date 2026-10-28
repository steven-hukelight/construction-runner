import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { currentSignedInSiteId } from "@/lib/auth/siteScope";
import { alarmView, loadSites, staffSiteIds } from "@/lib/siteAlarms/service";
import type { SiteAlarmRow } from "@/lib/siteAlarms/types";

/**
 * Active alarms the caller should see: the site they are signed in to, plus every site they
 * look after as staff. The app checks this on open / resume so a missed push still shows the alarm.
 * `?plan=0` skips the emergency plan (the web banner only needs the summary).
 */
export async function GET(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const uid = (auth.uid ?? "").trim();
    if (!uid) return NextResponse.json({ alarms: [] });
    const withPlan = new URL(req.url).searchParams.get("plan") !== "0";

    const [signedInSite, managed] = await Promise.all([currentSignedInSiteId(uid), staffSiteIds(auth)]);

    let query = supabaseAdmin.from("site_alarms").select("*").eq("status", "active").order("raised_at", { ascending: false });
    if (managed === null) {
      const scopeCompany = (auth.companyId ?? "").trim();
      if (scopeCompany) {
        query = signedInSite
          ? query.or(`company_id.eq.${scopeCompany},site_id.eq.${signedInSite}`)
          : query.eq("company_id", scopeCompany);
      } else {
        // Superuser with no company selected, or a caller with no company: do not dump every company's alarms.
        if (!signedInSite) return NextResponse.json({ alarms: [] });
        query = query.eq("site_id", signedInSite);
      }
    } else {
      const sites = [...new Set([...managed, ...(signedInSite ? [signedInSite] : [])])];
      if (!sites.length) return NextResponse.json({ alarms: [] });
      query = query.in("site_id", sites);
    }

    const { data, error } = await query.limit(20);
    if (error) {
      console.error("GET /api/me/active-alarm:", error);
      return NextResponse.json({ alarms: [] });
    }
    const alarms = (data ?? []) as SiteAlarmRow[];
    const sites = await loadSites(alarms.map((a) => a.site_id));
    const managedSet = managed === null ? null : new Set(managed);
    const views = await Promise.all(
      alarms.map((alarm) => {
        const site = sites.get(alarm.site_id);
        if (!site) return null;
        const staff = managedSet === null ? auth.isSuperuser || site.company_id === auth.companyId : managedSet.has(site.id);
        return alarmView(alarm, site, { callerId: uid, staff, withPlan });
      }),
    );
    return NextResponse.json({ alarms: views.filter(Boolean) });
  } catch (e) {
    console.error("GET /api/me/active-alarm failed:", e);
    return NextResponse.json({ alarms: [] });
  }
}
