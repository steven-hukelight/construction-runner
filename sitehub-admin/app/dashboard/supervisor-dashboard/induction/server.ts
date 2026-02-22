"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type QuickInductionOperative = {
  operativeId: string;
  operativeName: string;
  companyId: string;
  companyName: string;
  status: "completed" | "not_started" | "expired";
  completedAt: Date | null;
};

export type QuickInductionData = {
  site: { id: string; name: string };
  operatives: QuickInductionOperative[];
  summary: { total: number; completed: number; notStarted: number; expired: number };
};

const EXPIRY_DAYS = 365;

function cid(x: { company_id?: string | null; main_contractor_id?: string | null }): string | null {
  return (x.main_contractor_id ?? x.company_id ?? null) as string | null;
}

async function canAccessSite(siteId: string, auth: { role?: string; companyId?: string }): Promise<boolean> {
  if (auth.role === "superuser") return true;
  if (!auth.companyId) return false;
  const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).maybeSingle();
  if (!site) return false;
  if (cid(site) === auth.companyId) return true;
  const { data: sub } = await supabaseAdmin
    .from("site_subcontractors")
    .select("company_id")
    .eq("site_id", siteId)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  return !!sub;
}

export async function getQuickInductionData(
  siteId: string,
  auth: { role: string | undefined; companyId: string | undefined }
): Promise<QuickInductionData | null> {
  if (!(await canAccessSite(siteId, auth))) return null;

  const { data: site } = await supabaseAdmin.from("sites").select("name").eq("id", siteId).maybeSingle();
  if (!site) return null;
  const siteName = site.name ?? siteId;

  const { data: assigned } = await supabaseAdmin.from("assigned_operatives").select("user_id").eq("site_id", siteId);
  const operativeIds = (assigned ?? []).map((a) => a.user_id).filter(Boolean);
  if (operativeIds.length === 0) {
    return { site: { id: siteId, name: siteName }, operatives: [], summary: { total: 0, completed: 0, notStarted: 0, expired: 0 } };
  }

  const { data: users } = await supabaseAdmin.from("users").select("id, display_name, email, company_id").in("id", operativeIds);
  const { data: inductions } = await supabaseAdmin.from("user_site_inductions").select("*").eq("site_id", siteId).in("user_id", operativeIds);
  const { data: companies } = await supabaseAdmin.from("companies").select("id, name").in("id", [...new Set((users ?? []).map((u) => u.company_id).filter(Boolean))]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const indMap = new Map((inductions ?? []).map((i) => [`${i.user_id}-${i.site_id}`, i]));
  const companyMap = new Map((companies ?? []).map((c) => [c.id, c.name]));

  const now = new Date();
  let completed = 0, notStarted = 0, expiredCount = 0;
  const operatives: QuickInductionOperative[] = [];

  for (const a of assigned ?? []) {
    const operativeId = a.user_id;
    const user = userMap.get(operativeId);
    const ind = indMap.get(`${operativeId}-${siteId}`);
    const companyId = user?.company_id ?? "";
    const operativeName = user ? (user.display_name ?? user.email ?? operativeId) : operativeId;
    const companyName = companyMap.get(companyId) ?? companyId;

    let status: QuickInductionOperative["status"] = "not_started";
    let completedAt: Date | null = null;
    if (ind) {
      completedAt = ind.completed_at ? new Date(ind.completed_at) : null;
      const statusVal = (ind.status ?? "completed") as string;
      const isExpired = completedAt && now.getTime() - completedAt.getTime() > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      status = isExpired ? "expired" : statusVal === "completed" ? "completed" : "not_started";
    }
    if (status === "completed") completed++;
    else if (status === "expired") expiredCount++;
    else notStarted++;

    operatives.push({ operativeId, operativeName, companyId, companyName, status, completedAt });
  }

  return { site: { id: siteId, name: siteName }, operatives, summary: { total: operatives.length, completed, notStarted, expired: expiredCount } };
}
