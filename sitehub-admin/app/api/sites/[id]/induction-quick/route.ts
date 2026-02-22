import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const EXPIRY_DAYS = 365;

function cid(x: { company_id?: string | null; main_contractor_id?: string | null }): string | null {
  return (x.main_contractor_id ?? x.company_id ?? null) as string | null;
}

async function canAccessSite(siteId: string): Promise<boolean> {
  const role = (await cookies()).get("role")?.value;
  const companyId = (await cookies()).get("companyId")?.value;
  if (role === "superuser") return true;
  if (!companyId) return false;
  const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).maybeSingle();
  if (!site) return false;
  if (cid(site) === companyId) return true;
  const { data: sub } = await supabaseAdmin
    .from("site_subcontractors")
    .select("company_id")
    .eq("site_id", siteId)
    .eq("company_id", companyId)
    .maybeSingle();
  return !!sub;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = await params;
  if (!siteId) return NextResponse.json({ error: "Site ID required" }, { status: 400 });
  if (!(await canAccessSite(siteId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: site } = await supabaseAdmin.from("sites").select("name").eq("id", siteId).single();
  if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
  const siteName = site.name ?? siteId;

  const { data: assigned } = await supabaseAdmin.from("assigned_operatives").select("user_id").eq("site_id", siteId);
  const operativeIds = (assigned ?? []).map((a) => a.user_id).filter(Boolean);
  if (operativeIds.length === 0) {
    return NextResponse.json({ site: { id: siteId, name: siteName }, operatives: [], summary: { total: 0, completed: 0, notStarted: 0, expired: 0 } });
  }

  const { data: users } = await supabaseAdmin.from("users").select("id, display_name, email, company_id, admin_pre_induction_override, pre_induction_status").in("id", operativeIds);
  const { data: inductions } = await supabaseAdmin.from("user_site_inductions").select("*").eq("site_id", siteId).in("user_id", operativeIds);
  const { data: companies } = await supabaseAdmin
    .from("companies")
    .select("id, name")
    .in("id", [...new Set((users ?? []).map((u) => u.company_id).filter(Boolean))]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const indMap = new Map((inductions ?? []).map((i) => [`${i.user_id}-${i.site_id}`, i]));
  const companyMap = new Map((companies ?? []).map((c) => [c.id, c.name]));

  const now = new Date();
  let completed = 0, notStarted = 0, expiredCount = 0;
  const operatives: Array<{ operativeId: string; operativeName: string; companyId: string; companyName: string; status: string; completedAt: string | null }> = [];

  for (const a of assigned ?? []) {
    const operativeId = a.user_id;
    const user = userMap.get(operativeId);
    const ind = indMap.get(`${operativeId}-${siteId}`);
    const companyId = user?.company_id ?? "";
    const operativeName = user ? (user.display_name ?? user.email ?? operativeId) : operativeId;
    const companyName = companyMap.get(companyId) ?? companyId;

    let status = "Induction Required";
    let completedAt: string | null = null;
    const adminOverride = (user as { admin_pre_induction_override?: boolean })?.admin_pre_induction_override === true;
    const preInductionComplete = (user?.pre_induction_status as string) === "complete";

    if (ind) {
      completedAt = ind.completed_at ? new Date(ind.completed_at).toISOString() : null;
      const statusVal = (ind.status ?? "completed") as string;
      const grandfathered = ind.grandfathered === true;
      const completedDate = ind.completed_at ? new Date(ind.completed_at) : null;
      const isExpired = completedDate && now.getTime() - completedDate.getTime() > EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      if (isExpired) status = "Expired";
      else if (statusVal === "completed") status = grandfathered ? "Grandfathered" : "Inducted";
      else {
        if (adminOverride) status = "Pre-Induction Override";
        else if (!preInductionComplete) status = "Pre-Induction Required";
        else status = "Induction Required";
      }
    } else {
      if (adminOverride) status = "Pre-Induction Override";
      else if (!preInductionComplete) status = "Pre-Induction Required";
      else status = "Induction Required";
    }

    if (status === "Inducted" || status === "Grandfathered") completed++;
    else if (status === "Expired") expiredCount++;
    else notStarted++;

    operatives.push({ operativeId, operativeName, companyId, companyName, status, completedAt });
  }

  return NextResponse.json({
    site: { id: siteId, name: siteName },
    operatives,
    summary: { total: operatives.length, completed, notStarted, expired: expiredCount },
  });
}
