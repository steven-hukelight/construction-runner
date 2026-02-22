import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRamsStatusForSite, type RamsStatus } from "@/lib/ramsCompliance";

const EXPIRY_DAYS = 365;

export type SupervisorOperativeStatus =
  | "Inducted"
  | "Grandfathered"
  | "Pre-Induction Required"
  | "Pre-Induction Override"
  | "Induction Required"
  | "Expired";

export type SupervisorOperativeRow = {
  operativeId: string;
  operativeName: string;
  companyId: string;
  companyName: string;
  trade: string;
  siteId: string;
  siteName: string;
  inductionStatus: SupervisorOperativeStatus;
  preInductionStatus: string;
  completedAt: Date | null;
  grandfathered: boolean;
  overrideApplied: boolean;
  complianceScore: number | null;
  missingItems: string[];
  expiringItems: string[];
  ramsStatus: RamsStatus;
  ramsVersion: string | null;
  ramsAcceptedVersion: string | null;
  ramsAcceptedAt: Date | null;
};

export type SupervisorComplianceSummary = {
  total: number;
  compliant: number;
  partiallyCompliant: number;
  nonCompliant: number;
  grandfathered: number;
  overrideApplied: number;
  expiringSoon: number;
  missingCritical: number;
};

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof (v as { toDate?: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate();
  }
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function cid(x: { main_contractor_id?: string | null; maincontractorid?: string | null; company_id?: string | null; companyid?: string | null }): string | null {
  return (x.main_contractor_id ?? x.maincontractorid ?? x.company_id ?? x.companyid ?? null) as string | null;
}

async function canAccessSite(siteId: string, auth: { role?: string; companyId?: string }): Promise<boolean> {
  if (auth.role === "superuser") return true;
  if (!auth.companyId) return false;
  const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).single();
  if (!site) return false;
  const mainId = cid(site);
  if (mainId === auth.companyId) return true;
  const { data: sub } = await supabaseAdmin.from("site_subcontractors").select("company_id").eq("site_id", siteId).eq("company_id", auth.companyId).maybeSingle();
  return !!sub;
}

export async function buildSupervisorComplianceDataset(
  siteId: string,
  auth: { role: string | undefined; companyId: string | undefined }
): Promise<{
  site: { id: string; name: string };
  operatives: SupervisorOperativeRow[];
  summary: SupervisorComplianceSummary;
  companyOptions: { id: string; name: string }[];
  tradeOptions: string[];
} | null> {
  const allowed = await canAccessSite(siteId, auth);
  if (!allowed) return null;

  const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).single();
  if (!site) return null;
  const siteData = site as Record<string, unknown>;
  const siteName = (siteData?.name ?? siteId) as string;

  const { data: assigned } = await supabaseAdmin.from("assigned_operatives").select("*").or(`site_id.eq.${siteId},siteid.eq.${siteId}`);
  const { data: subs } = await supabaseAdmin.from("site_subcontractors").select("company_id").eq("site_id", siteId);

  const companyIds = new Set<string>();
  const mainContractorId = cid(site);
  if (mainContractorId) companyIds.add(mainContractorId);
  (subs ?? []).forEach((d) => companyIds.add(d.company_id));

  const companyNames: Record<string, string> = {};
  for (const cidVal of companyIds) {
    const { data: co } = await supabaseAdmin.from("companies").select("name").eq("id", cidVal).single();
    companyNames[cidVal] = (co?.name as string) ?? cidVal;
  }

  const companyOptions: { id: string; name: string }[] = [];
  if (mainContractorId) companyOptions.push({ id: mainContractorId, name: companyNames[mainContractorId] ?? "Main Contractor" });
  (subs ?? []).forEach((d) => {
    if (d.company_id !== mainContractorId) companyOptions.push({ id: d.company_id, name: companyNames[d.company_id] ?? d.company_id });
  });

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const operatives: SupervisorOperativeRow[] = [];
  const siteRamsVersion = (siteData?.rams_version ?? siteData?.ramsversion ?? null) as string | null;

  for (const doc of assigned ?? []) {
    const d = doc as Record<string, unknown>;
    const operativeId = (d.operativeId ?? d.user_id ?? d.userid ?? doc.id) as string;

    const [userRes, indRes, profileRes, personalRes, rightToWorkRes, certsRes, medicalRes, trainingRes, declarationsRes] = await Promise.all([
      supabaseAdmin.from("users").select("*").eq("id", operativeId).single(),
      supabaseAdmin.from("user_site_inductions").select("*").eq("user_id", operativeId).eq("site_id", siteId).maybeSingle(),
      supabaseAdmin.from("user_profile_data").select("*").or(`user_id.eq.${operativeId},userid.eq.${operativeId}`).maybeSingle(),
      supabaseAdmin.from("pre_induction_personal").select("*").eq("user_id", operativeId).maybeSingle(),
      supabaseAdmin.from("pre_induction_right_to_work").select("*").eq("user_id", operativeId).maybeSingle(),
      supabaseAdmin.from("pre_induction_certifications").select("*").eq("user_id", operativeId).maybeSingle(),
      supabaseAdmin.from("pre_induction_medical").select("*").eq("user_id", operativeId).maybeSingle(),
      supabaseAdmin.from("pre_induction_training").select("*").eq("user_id", operativeId).maybeSingle(),
      supabaseAdmin.from("pre_induction_declarations").select("*").eq("user_id", operativeId).maybeSingle(),
    ]);

    const userData = (userRes.data ?? {}) as Record<string, unknown>;
    const operativeName = (userData.name ?? userData.display_name ?? userData.email ?? operativeId) as string;
    const companyId = (userData.company_id ?? userData.companyid ?? d.companyId ?? d.company_id ?? d.companyid ?? "") as string;
    const companyName = companyNames[companyId] ?? companyId;

    let trade = "";
    if (profileRes.data) trade = ((profileRes.data as Record<string, unknown>)?.job_title ?? (profileRes.data as Record<string, unknown>)?.jobTitle ?? "") as string;

    const personal = personalRes.data;
    const rightToWork = rightToWorkRes.data as Record<string, unknown> | null;
    const certifications = certsRes.data;
    const medical = medicalRes.data as Record<string, unknown> | null;
    const training = trainingRes.data as Record<string, unknown> | null;
    const declarations = declarationsRes.data as Record<string, unknown> | null;

    const missingItems: string[] = [];
    if (!(personal && ((personal as Record<string, unknown>).full_name || (personal as Record<string, unknown>).email))) missingItems.push("Personal details");
    if (!(rightToWork && (rightToWork.right_to_work_verified ?? rightToWork.rightToWorkVerified))) missingItems.push("Passport");
    const certArr = Array.isArray((certifications as Record<string, unknown>)?.certifications) ? ((certifications as Record<string, unknown>).certifications as Record<string, unknown>[]) : [];
    const hasCSCS = certArr.some((c) => String(c.type || "").toUpperCase() === "CSCS");
    if (!hasCSCS || certArr.length === 0) missingItems.push("CSCS");
    if (!(medical && (medical.medical_verified ?? medical.medicalVerified))) missingItems.push("Medical");
    const ramsStatus = getRamsStatusForSite(training, siteId, siteRamsVersion);
    if (ramsStatus === "pending") missingItems.push("RAMS not accepted");
    else if (ramsStatus === "outdated") missingItems.push("RAMS outdated");
    if (!(declarations && (declarations.operative_declaration_accepted ?? declarations.operativeDeclarationAccepted))) missingItems.push("Declarations");
    const trArr = (training?.training_records ?? training?.trainingRecords ?? []) as unknown[];
    if (trArr.length === 0) missingItems.push("Training");

    const expiringItems: string[] = [];
    for (const c of certArr) {
      const exp = toDate(c.expiryDate ?? c.expiry_date);
      if (exp) {
        if (exp.getTime() < now.getTime()) expiringItems.push(`CSCS expired (${exp.toLocaleDateString()})`);
        else if (exp.getTime() - now.getTime() < 60 * day) expiringItems.push(`CSCS expiring (${exp.toLocaleDateString()})`);
      }
    }
    const visaExp = toDate(rightToWork?.visa_expiry ?? rightToWork?.visaExpiry);
    if (visaExp) {
      if (visaExp.getTime() < now.getTime()) expiringItems.push(`Visa expired (${visaExp.toLocaleDateString()})`);
      else if (visaExp.getTime() - now.getTime() < 60 * day) expiringItems.push(`Visa expiring (${visaExp.toLocaleDateString()})`);
    }
    const ramsUpdatedAt = toDate(siteData?.rams_updated_at ?? siteData?.ramsUpdatedAt);
    if (ramsUpdatedAt && siteRamsVersion && ramsStatus !== "accepted") {
      const sevenDays = 7 * day;
      if (now.getTime() - ramsUpdatedAt.getTime() < sevenDays) expiringItems.push("RAMS updated recently — acceptance required");
    }

    const preInductionStatus = (userData.pre_induction_status ?? userData.preInductionStatus ?? "not_started") as string;
    const adminOverride = (userData.admin_pre_induction_override ?? userData.adminPreInductionOverride) === true;
    const preInductionComplete = preInductionStatus === "complete";

    let inductionStatus: SupervisorOperativeStatus = "Induction Required";
    let completedAt: Date | null = null;
    let grandfathered = false;

    if (indRes.data) {
      const ind = indRes.data as Record<string, unknown>;
      const raw = ind.completed_at ?? ind.completedAt;
      completedAt = toDate(raw);
      grandfathered = ind.grandfathered === true;
      const statusVal = (ind.status ?? "completed") as string;
      const isExpired = completedAt && now.getTime() - completedAt.getTime() > EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      if (isExpired) inductionStatus = "Expired";
      else if (statusVal === "completed") inductionStatus = grandfathered ? "Grandfathered" : "Inducted";
      else inductionStatus = adminOverride ? "Pre-Induction Override" : !preInductionComplete ? "Pre-Induction Required" : "Induction Required";
    } else {
      inductionStatus = adminOverride ? "Pre-Induction Override" : !preInductionComplete ? "Pre-Induction Required" : "Induction Required";
    }

    const complianceScore = (userData.compliance_score ?? userData.complianceScore ?? null) as number | null;
    const ramsAcceptedAt = toDate(training?.rams_accepted_at ?? training?.ramsAcceptedAt);

    operatives.push({
      operativeId,
      operativeName,
      companyId,
      companyName,
      trade,
      siteId,
      siteName,
      inductionStatus,
      preInductionStatus,
      completedAt,
      grandfathered,
      overrideApplied: adminOverride,
      complianceScore,
      missingItems,
      expiringItems,
      ramsStatus,
      ramsVersion: siteRamsVersion,
      ramsAcceptedVersion: (training?.rams_version ?? training?.ramsVersion ?? null) as string | null,
      ramsAcceptedAt,
    });
  }

  const summary: SupervisorComplianceSummary = {
    total: operatives.length,
    compliant: operatives.filter((o) => o.inductionStatus === "Inducted").length,
    partiallyCompliant: operatives.filter((o) => (o.inductionStatus === "Pre-Induction Required" || o.inductionStatus === "Induction Required") && o.missingItems.length <= 3).length,
    nonCompliant: operatives.filter((o) => o.inductionStatus === "Expired" || ((o.inductionStatus === "Pre-Induction Required" || o.inductionStatus === "Induction Required") && o.missingItems.length > 3)).length,
    grandfathered: operatives.filter((o) => o.grandfathered).length,
    overrideApplied: operatives.filter((o) => o.overrideApplied).length,
    expiringSoon: operatives.filter((o) => o.expiringItems.length > 0).length,
    missingCritical: operatives.filter((o) => o.missingItems.some((m) => ["CSCS", "Passport", "Medical", "Personal details"].includes(m))).length,
  };

  const tradeOptions = [...new Set(operatives.map((o) => o.trade).filter(Boolean))].sort();

  return {
    site: { id: siteId, name: siteName },
    operatives,
    summary,
    companyOptions,
    tradeOptions,
  };
}
