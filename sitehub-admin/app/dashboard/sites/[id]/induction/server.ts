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
  /** ISO string, required for Server Component → client serialization */
  completedAt: string | null;
};

export type SiteInductionData = {
  site: { id: string; name: string; mainContractorId: string | null };
  operatives: SiteInductionOperative[];
  companyOptions: { id: string; name: string }[];
};

const EXPIRY_DAYS = 365;
const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

function cid(x: { company_id?: string | null; main_contractor_id?: string | null }): string | null {
  return (x.main_contractor_id ?? x.company_id ?? null) as string | null;
}

type SiteRow = {
  id: string;
  name: string | null;
  company_id?: string | null;
  main_contractor_id?: string | null;
};

async function loadAccessibleSite(
  siteId: string,
  auth: { role?: string; companyId?: string }
): Promise<SiteRow | null> {
  const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).maybeSingle();
  if (!site) return null;
  if (auth.role === "superuser") return site;
  if (!auth.companyId) return null;
  if (cid(site) === auth.companyId) return site;
  const { data: sub } = await supabaseAdmin
    .from("site_subcontractors")
    .select("company_id")
    .eq("site_id", siteId)
    .eq("company_id", auth.companyId)
    .maybeSingle();
  return sub ? site : null;
}

function statusForOperative(
  user: {
    admin_pre_induction_override?: boolean | null;
    pre_induction_status?: string | null;
  } | undefined,
  ind:
    | {
        status?: string | null;
        completed_at?: string | null;
        grandfathered?: boolean | null;
      }
    | undefined,
  nowMs: number
): { status: SiteInductionStatus; completedAtDate: Date | null } {
  const adminOverride = user?.admin_pre_induction_override === true;
  const preInductionComplete = user?.pre_induction_status === "complete";
  const incomplete: SiteInductionStatus = adminOverride
    ? "Pre-Induction Override"
    : !preInductionComplete
      ? "Pre-Induction Required"
      : "Induction Required";

  if (!ind) return { status: incomplete, completedAtDate: null };

  const completedAtDate = ind.completed_at ? new Date(ind.completed_at) : null;
  const statusVal = (ind.status ?? "completed") as string;
  const grandfathered = ind.grandfathered === true;
  const isExpired = Boolean(completedAtDate && nowMs - completedAtDate.getTime() > EXPIRY_MS);
  if (isExpired) return { status: "Expired", completedAtDate };
  if (statusVal === "completed") {
    return { status: grandfathered ? "Grandfathered" : "Inducted", completedAtDate };
  }
  return { status: incomplete, completedAtDate };
}

export async function getSiteInductionData(
  siteId: string,
  auth: { role: string | undefined; companyId: string | undefined }
): Promise<SiteInductionData | null> {
  const site = await loadAccessibleSite(siteId, auth);
  if (!site) return null;

  const siteName = (site.name ?? siteId) as string;
  const mainContractorId = cid(site);

  const [{ data: assigned }, { data: subs }, { data: inductions }] = await Promise.all([
    supabaseAdmin.from("assigned_operatives").select("user_id").eq("site_id", siteId),
    supabaseAdmin.from("site_subcontractors").select("company_id").eq("site_id", siteId),
    supabaseAdmin
      .from("user_site_inductions")
      .select("user_id, site_id, status, completed_at, grandfathered")
      .eq("site_id", siteId),
  ]);

  const assignedRows = assigned ?? [];
  const operativeIds = assignedRows.map((a) => a.user_id).filter(Boolean);

  const companyIds = new Set<string>();
  if (mainContractorId) companyIds.add(mainContractorId);
  (subs ?? []).forEach((s) => {
    if (s.company_id) companyIds.add(s.company_id);
  });

  const [{ data: users }, { data: companies }] = await Promise.all([
    operativeIds.length
      ? supabaseAdmin
          .from("users")
          .select("id, display_name, email, company_id, admin_pre_induction_override, pre_induction_status")
          .in("id", operativeIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null; email: string | null; company_id: string | null; admin_pre_induction_override: boolean | null; pre_induction_status: string | null }[] }),
    companyIds.size
      ? supabaseAdmin.from("companies").select("id, name").in("id", [...companyIds])
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
  ]);

  const companyNames = Object.fromEntries((companies ?? []).map((c) => [c.id, c.name ?? c.id]));
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const indMap = new Map((inductions ?? []).map((i) => [i.user_id, i]));

  const companyOptions: { id: string; name: string }[] = [];
  if (mainContractorId) {
    companyOptions.push({
      id: mainContractorId,
      name: companyNames[mainContractorId] ?? "Main Contractor",
    });
  }
  (subs ?? []).forEach((s) => {
    if (s.company_id && s.company_id !== mainContractorId) {
      companyOptions.push({ id: s.company_id, name: companyNames[s.company_id] ?? s.company_id });
    }
  });

  const nowMs = Date.now();
  const operatives: SiteInductionOperative[] = assignedRows.map((a) => {
    const operativeId = a.user_id;
    const user = userMap.get(operativeId);
    const { status, completedAtDate } = statusForOperative(user, indMap.get(operativeId), nowMs);
    const companyId = user?.company_id ?? "";
    return {
      operativeId,
      operativeName: user ? (user.display_name ?? user.email ?? operativeId) : operativeId,
      companyId,
      companyName: companyNames[companyId] ?? companyId,
      status,
      completedAt:
        completedAtDate && !isNaN(completedAtDate.getTime()) ? completedAtDate.toISOString() : null,
    };
  });

  return { site: { id: siteId, name: siteName, mainContractorId }, operatives, companyOptions };
}
