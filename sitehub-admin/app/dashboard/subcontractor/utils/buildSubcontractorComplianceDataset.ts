import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRamsStatusForSite, type RamsStatus } from "@/lib/ramsCompliance";

const EXPIRY_WINDOW_DAYS = 60;
const RAMS_EXPIRY_DAYS = 7;

export type SubcontractorOperativeRow = {
  userId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  trade: string;
  siteIds: string[];
  siteNames: string[];
  preInductionStatus: string;
  inductionStatus: string;
  missingItems: string[];
  expiringItems: string[];
  hasMissing: boolean;
  hasExpiring: boolean;
  ramsStatus: RamsStatus;
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

function formatExpiryLabel(label: string, expiry: Date): string {
  return `${label} (${expiry.toLocaleDateString("en-GB", { month: "2-digit", year: "numeric" })})`;
}

export async function buildSubcontractorComplianceDataset(companyId: string): Promise<SubcontractorOperativeRow[]> {
  const { data: usersRows } = await supabaseAdmin.from("users").select("*").or(`company_id.eq.${companyId},companyid.eq.${companyId}`);
  if (!usersRows || usersRows.length === 0) return [];

  const { data: subs } = await supabaseAdmin.from("site_subcontractors").select("site_id").eq("company_id", companyId);
  const linkedSiteIds = new Set<string>((subs ?? []).map((s) => s.site_id).filter(Boolean));

  const siteNames: Record<string, string> = {};
  if (linkedSiteIds.size > 0) {
    const { data: sites } = await supabaseAdmin.from("sites").select("id, name").in("id", Array.from(linkedSiteIds));
    for (const s of sites ?? []) siteNames[s.id] = (s.name as string) ?? s.id;
  }

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const expiryThreshold = now.getTime() + EXPIRY_WINDOW_DAYS * dayMs;
  const rows: SubcontractorOperativeRow[] = [];

  for (const userRow of usersRows) {
    const userId = userRow.id;
    const userData = userRow as Record<string, unknown>;

    const [profileRes, personalRes, rightToWorkRes, certsRes, medicalRes, trainingRes, declarationsRes] = await Promise.all([
      supabaseAdmin.from("user_profile_data").select("*").or(`user_id.eq.${userId},userid.eq.${userId}`).maybeSingle(),
      supabaseAdmin.from("pre_induction_personal").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_right_to_work").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_certifications").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_medical").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_training").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_declarations").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const personal = personalRes.data as Record<string, unknown> | null;
    const rightToWork = rightToWorkRes.data as Record<string, unknown> | null;
    const certsData = certsRes.data;
    const medical = medicalRes.data as Record<string, unknown> | null;
    const training = trainingRes.data as Record<string, unknown> | null;
    const declarations = declarationsRes.data as Record<string, unknown> | null;

    const certArr = Array.isArray((certsData as Record<string, unknown>)?.certifications) ? ((certsData as Record<string, unknown>).certifications as Record<string, unknown>[]) : [];
    const trArr = Array.isArray((training as Record<string, unknown>)?.trainingRecords) ? ((training as Record<string, unknown>).trainingRecords as Record<string, unknown>[]) : [];

    let trade = (personal?.trade as string) ?? "";
    if (!trade && profileRes.data) {
      trade = ((profileRes.data as Record<string, unknown>)?.job_title ?? (profileRes.data as Record<string, unknown>)?.jobTitle ?? "") as string;
    }

    const missingItems: string[] = [];
    if (!(personal && (personal.full_name || personal.email))) missingItems.push("Personal details");
    if (!(rightToWork && (rightToWork.passport_url || rightToWork.visa_url))) missingItems.push("Right to Work (passport/visa)");
    const hasCSCS = certArr.some((c) => String(c.type || "").toUpperCase() === "CSCS");
    if (!hasCSCS || certArr.length === 0) missingItems.push("CSCS");
    if (!(medical && medical.medical_certificate_url)) missingItems.push("Medical");
    if (!(declarations && (declarations.operative_declaration_accepted ?? declarations.operativeDeclarationAccepted))) missingItems.push("Declarations");
    if (trArr.length === 0) missingItems.push("Training");

    const expiringItems: string[] = [];
    for (const c of certArr) {
      const exp = toDate(c.expiryDate ?? c.expiry_date);
      if (exp) {
        if (exp.getTime() < now.getTime()) {
          expiringItems.push(formatExpiryLabel(`CSCS/${(c.type as string) || "Cert"} expired`, exp));
        } else if (exp.getTime() < expiryThreshold) {
          expiringItems.push(formatExpiryLabel(`${(c.type as string) || "Cert"} expiring`, exp));
        }
      }
    }
    const visaExp = toDate(rightToWork?.visa_expiry ?? rightToWork?.visaExpiry);
    if (visaExp) {
      if (visaExp.getTime() < now.getTime()) expiringItems.push(formatExpiryLabel("Visa expired", visaExp));
      else if (visaExp.getTime() < expiryThreshold) expiringItems.push(formatExpiryLabel("Visa expiring", visaExp));
    }

    const preInductionStatus = (userData.pre_induction_status ?? userData.preInductionStatus ?? "not_started") as string;

    const siteIds: string[] = [];
    const siteNamesList: string[] = [];
    let ramsStatus: RamsStatus = "not_required";
    let ramsExpiryAdded = false;

    for (const siteId of linkedSiteIds) {
      const { data: assign } = await supabaseAdmin.from("assigned_operatives").select("id").eq("site_id", siteId).eq("user_id", userId).maybeSingle();
      if (assign) {
        siteIds.push(siteId);
        siteNamesList.push(siteNames[siteId] ?? siteId);
        const { data: siteRow } = await supabaseAdmin.from("sites").select("rams_version, ramsversion, rams_updated_at, ramsUpdatedAt").eq("id", siteId).single();
        const siteData: Record<string, unknown> = (siteRow ?? {}) as Record<string, unknown>;
        const siteRamsVersion = (siteData.rams_version ?? siteData.ramsversion ?? null) as string | null;
        const s = getRamsStatusForSite(training, siteId, siteRamsVersion);
        if (s === "outdated" || s === "pending") ramsStatus = s;
        else if (s === "accepted" && ramsStatus === "not_required") ramsStatus = "accepted";
        if (!ramsExpiryAdded && siteRamsVersion && s !== "accepted" && s !== "not_required") {
          const siteRamsUpdatedAt = toDate(siteData.rams_updated_at ?? siteData.ramsUpdatedAt);
          if (siteRamsUpdatedAt) {
            const sevenDays = RAMS_EXPIRY_DAYS * dayMs;
            if (now.getTime() - siteRamsUpdatedAt.getTime() < sevenDays) {
              expiringItems.push("RAMS updated recently — acceptance required");
              ramsExpiryAdded = true;
            }
          }
        }
      }
    }

    if (ramsStatus === "pending") missingItems.push("RAMS not accepted");
    else if (ramsStatus === "outdated") missingItems.push("RAMS outdated");

    let inductionStatus = "Not assigned";
    if (siteIds.length > 0) {
      const { data: ind } = await supabaseAdmin.from("user_site_inductions").select("*").eq("user_id", userId).eq("site_id", siteIds[0]).maybeSingle();
      if (ind) {
        const indData = ind as Record<string, unknown>;
        const completedAt = toDate(indData.completed_at ?? indData.completedAt);
        const isExpired = completedAt && now.getTime() - completedAt.getTime() > 365 * dayMs;
        if (isExpired) inductionStatus = "Expired";
        else if (indData.grandfathered) inductionStatus = "Grandfathered";
        else inductionStatus = (indData.status === "completed" ? "Inducted" : "Induction Required") as string;
      } else {
        inductionStatus = preInductionStatus === "complete" ? "Induction Required" : "Pre-Induction Required";
      }
    } else {
      inductionStatus = preInductionStatus === "complete" ? "Induction Required" : "Pre-Induction Required";
    }

    rows.push({
      userId,
      name: (userData.name ?? userData.display_name ?? userData.email ?? userId) as string,
      email: (userData.email as string) ?? null,
      avatar: (userData.avatar as string) ?? null,
      trade,
      siteIds,
      siteNames: siteNamesList,
      preInductionStatus,
      inductionStatus,
      missingItems,
      expiringItems,
      hasMissing: missingItems.length > 0,
      hasExpiring: expiringItems.length > 0,
      ramsStatus,
    });
  }

  return rows;
}
