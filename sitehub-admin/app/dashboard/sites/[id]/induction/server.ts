"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type SiteInductionStatus =
  | "Inducted"
  | "Grandfathered"
  | "Pre-Induction Required"
  | "Pre-Induction Override"
  | "Induction Required"
  | "Expired";

export type SiteInductionOperative = {
  operativeId: string;
  operativeName: string;
  companyId: string;
  companyName: string;
  status: SiteInductionStatus;
  /** ISO string — required for Server Component → client serialization */
  completedAt: string | null;
};

export type SiteInductionData = {
  site: { id: string; name: string; mainContractorId: string | null };
  operatives: SiteInductionOperative[];
  companyOptions: { id: string; name: string }[];
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

export async function getSiteInductionData(
  siteId: string,
  auth: { role: string | undefined; companyId: string | undefined }
): Promise<SiteInductionData | null> {
  if (!(await canAccessSite(siteId, auth))) return null;

  const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).maybeSingle();
  if (!site) return null;
  const siteName = (site.name ?? siteId) as string;
  const mainContractorId = cid(site);

  const { data: assigned } = await supabaseAdmin.from("assigned_operatives").select("user_id").eq("site_id", siteId);
  const { data: subs } = await supabaseAdmin.from("site_subcontractors").select("company_id").eq("site_id", siteId);

  const companyIds = new Set<string>();
  if (mainContractorId) companyIds.add(mainContractorId);
  (subs ?? []).forEach((s) => companyIds.add(s.company_id));

  const { data: companies } = companyIds.size
    ? await supabaseAdmin.from("companies").select("id, name").in("id", [...companyIds])
    : { data: [] };
  const companyNames = Object.fromEntries((companies ?? []).map((c) => [c.id, c.name ?? c.id]));

  const companyOptions: { id: string; name: string }[] = [];
  if (mainContractorId) companyOptions.push({ id: mainContractorId, name: companyNames[mainContractorId] ?? "Main Contractor" });
  (subs ?? []).forEach((s) => {
    if (s.company_id !== mainContractorId) companyOptions.push({ id: s.company_id, name: companyNames[s.company_id] ?? s.company_id });
  });

  const now = new Date();
  const operatives: SiteInductionOperative[] = [];

  for (const a of assigned ?? []) {
    const operativeId = a.user_id;
    const { data: user } = await supabaseAdmin.from("users").select("display_name, email, company_id, admin_pre_induction_override, pre_induction_status").eq("id", operativeId).maybeSingle();
    const { data: ind } = await supabaseAdmin.from("user_site_inductions").select("*").eq("user_id", operativeId).eq("site_id", siteId).maybeSingle();

    const operativeName = user ? (user.display_name ?? user.email ?? operativeId) : operativeId;
    const companyId = user?.company_id ?? "";
    const companyName = companyNames[companyId] ?? companyId;

    let status: SiteInductionOperative["status"] = "Induction Required";
    let completedAtDate: Date | null = null;
    const adminOverride = (user as { admin_pre_induction_override?: boolean })?.admin_pre_induction_override === true;
    const preInductionComplete = (user?.pre_induction_status as string) === "complete";

    if (ind) {
      completedAtDate = ind.completed_at ? new Date(ind.completed_at) : null;
      const statusVal = (ind.status ?? "completed") as string;
      const grandfathered = ind.grandfathered === true;
      const isExpired =
        completedAtDate &&
        now.getTime() - completedAtDate.getTime() > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
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

    operatives.push({
      operativeId,
      operativeName,
      companyId,
      companyName,
      status,
      completedAt:
        completedAtDate && !isNaN(completedAtDate.getTime())
          ? completedAtDate.toISOString()
          : null,
    });
  }

  return { site: { id: siteId, name: siteName, mainContractorId }, operatives, companyOptions };
}
