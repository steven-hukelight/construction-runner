import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRamsStatusForSite } from "@/lib/ramsCompliance";

const EXPIRY_DAYS = 365;

export type ExportFilters = {
  status?: string;
  companyId?: string;
  trade?: string;
  siteId?: string;
  role?: string;
  expiry?: string;
};

export type ComplianceExportRow = {
  uid: string;
  name: string;
  companyName: string;
  trade: string;
  siteName: string;
  siteId: string;
  preInductionStatus: string;
  inductionStatus: string;
  overrideApplied: boolean;
  grandfathered: boolean;
  complianceScore: number | null;
  missingItems: string[];
  expiringItems: string[];
  rightToWork: { verified: boolean; expiry: Date | null };
  certifications: Array<{ type: string; verified: boolean; expiry: Date | null }>;
  medical: { verified: boolean };
  training: Array<{ title?: string; expiry?: Date | null }>;
  declarations: { operativeAccepted: boolean };
  ramsStatus: string;
  ramsVersion: string | null;
  ramsAcceptedAt: Date | null;
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

function cid(u: { company_id?: string | null; companyid?: string | null }): string {
  return (u.company_id ?? u.companyid ?? "") as string;
}

export async function buildComplianceDataset(
  auth: { role: string | undefined; companyId: string | undefined },
  filters: ExportFilters
): Promise<ComplianceExportRow[]> {
  const companyId = auth.companyId;
  if (!companyId && auth.role !== "superuser") return [];
  if (auth.role === "superuser" && !companyId) return [];

  const isSubcontractorAdmin = auth.role === "sub_admin";
  const effectiveCompanyId = companyId ?? "";

  if (isSubcontractorAdmin && !companyId) return [];

  let siteDocs: { id: string; data: () => Record<string, unknown> }[];

  if (isSubcontractorAdmin && companyId) {
    // site_subcontractors: (site_id, company_id) - subcontractor company is linked to sites
    const { data: subs } = await supabaseAdmin
      .from("site_subcontractors")
      .select("site_id")
      .eq("company_id", companyId);
    const linkedSiteIds = new Set((subs ?? []).map((s) => s.site_id).filter(Boolean));
    if (linkedSiteIds.size === 0) return [];
    const { data: siteRows } = await supabaseAdmin
      .from("sites")
      .select("*")
      .in("id", Array.from(linkedSiteIds));
    siteDocs = (siteRows ?? []).map((s) => ({
      id: s.id,
      data: () => (s as Record<string, unknown>) ?? {},
    }));
  } else {
    const { data: siteRows } = await supabaseAdmin
      .from("sites")
      .select("*")
      .or(`company_id.eq.${effectiveCompanyId},companyid.eq.${effectiveCompanyId}`);
    siteDocs = (siteRows ?? []).map((s) => ({
      id: s.id,
      data: () => (s as Record<string, unknown>) ?? {},
    }));
  }

  const { data: usersRows } = await supabaseAdmin
    .from("users")
    .select("*")
    .or(`company_id.eq.${isSubcontractorAdmin ? companyId! : effectiveCompanyId},companyid.eq.${isSubcontractorAdmin ? companyId! : effectiveCompanyId}`);

  const userDocs = usersRows ?? [];

  const companyIds = new Set<string>();
  userDocs.forEach((u) => companyIds.add(cid(u) || ""));
  const companyNames: Record<string, string> = {};
  for (const cidVal of companyIds) {
    if (!cidVal) continue;
    const { data: co } = await supabaseAdmin.from("companies").select("name").eq("id", cidVal).single();
    companyNames[cidVal] = (co?.name as string) ?? cidVal;
  }

  const siteNames: Record<string, string> = {};
  siteDocs.forEach((d) => {
    const data = d.data();
    siteNames[d.id] = (data?.name as string) ?? d.id;
  });

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  const userDataCache: Record<
    string,
    {
      trade: string;
      preInductionStatus: string;
      adminOverride: boolean;
      complianceScore: number | null;
      sections: {
        personal: Record<string, unknown> | null;
        rightToWork: Record<string, unknown> | null;
        certifications: Record<string, unknown>[] | null;
        medical: Record<string, unknown> | null;
        training: Record<string, unknown>[] | null;
        trainingFull: Record<string, unknown> | null;
        declarations: Record<string, unknown> | null;
      };
      missingItems: string[];
      expiringItems: string[];
    }
  > = {};

  await Promise.all(
    userDocs.map(async (userDoc) => {
      const userId = userDoc.id;
      const userData = userDoc as Record<string, unknown>;
      const [profileRes, personalRes, rightToWorkRes, certsRes, medicalRes, trainingRes, declarationsRes] = await Promise.all([
        supabaseAdmin.from("user_profile_data").select("*").or(`user_id.eq.${userId},userid.eq.${userId}`).maybeSingle(),
        supabaseAdmin.from("pre_induction_personal").select("*").eq("user_id", userId).maybeSingle(),
        supabaseAdmin.from("pre_induction_right_to_work").select("*").eq("user_id", userId).maybeSingle(),
        supabaseAdmin.from("pre_induction_certifications").select("*").eq("user_id", userId).maybeSingle(),
        supabaseAdmin.from("pre_induction_medical").select("*").eq("user_id", userId).maybeSingle(),
        supabaseAdmin.from("pre_induction_training").select("*").eq("user_id", userId).maybeSingle(),
        supabaseAdmin.from("pre_induction_declarations").select("*").eq("user_id", userId).maybeSingle(),
      ]);

      const personal = personalRes.data ? (personalRes.data as Record<string, unknown>) : null;
      const rightToWork = rightToWorkRes.data ? (rightToWorkRes.data as Record<string, unknown>) : null;
      const certsData = certsRes.data;
      const medical = medicalRes.data ? (medicalRes.data as Record<string, unknown>) : null;
      const training = trainingRes.data ? (trainingRes.data as Record<string, unknown>) : null;
      const declarations = declarationsRes.data ? (declarationsRes.data as Record<string, unknown>) : null;

      const certArr = Array.isArray((certsData as Record<string, unknown>)?.certifications)
        ? ((certsData as Record<string, unknown>).certifications as Record<string, unknown>[])
        : [];
      const trArr = Array.isArray((training as Record<string, unknown>)?.trainingRecords)
        ? ((training as Record<string, unknown>).trainingRecords as Record<string, unknown>[])
        : [];

      const missingItems: string[] = [];
      if (!(personal && ((personal as Record<string, unknown>).full_name || (personal as Record<string, unknown>).email)))
        missingItems.push("Personal details");
      if (!(rightToWork && ((rightToWork as Record<string, unknown>).right_to_work_verified ?? (rightToWork as Record<string, unknown>).rightToWorkVerified)))
        missingItems.push("Right to Work");
      const hasCSCS = certArr.some((c) => String(c.type || "").toUpperCase() === "CSCS");
      if (!hasCSCS || certArr.length === 0) missingItems.push("CSCS");
      if (!(medical && ((medical as Record<string, unknown>).medical_verified ?? (medical as Record<string, unknown>).medicalVerified)))
        missingItems.push("Medical");
      if (!(declarations && ((declarations as Record<string, unknown>).operative_declaration_accepted ?? (declarations as Record<string, unknown>).operativeDeclarationAccepted)))
        missingItems.push("Declarations");

      const expiringItems: string[] = [];
      for (const c of certArr) {
        const exp = toDate(c.expiryDate ?? c.expiry_date);
        if (exp) {
          if (exp.getTime() < now.getTime()) {
            expiringItems.push(formatExpiryLabel(`CSCS/${(c.type as string) || "Cert"} expired`, exp));
          } else if (exp.getTime() - now.getTime() < 60 * day) {
            expiringItems.push(formatExpiryLabel(`${(c.type as string) || "Cert"} expiring`, exp));
          }
        }
      }
      const visaExp = toDate((rightToWork as Record<string, unknown>)?.visa_expiry ?? (rightToWork as Record<string, unknown>)?.visaExpiry);
      if (visaExp) {
        if (visaExp.getTime() < now.getTime()) expiringItems.push(formatExpiryLabel("Visa expired", visaExp));
        else if (visaExp.getTime() - now.getTime() < 60 * day) {
          expiringItems.push(formatExpiryLabel("Visa expiring", visaExp));
        }
      }

      let trade = "";
      if (profileRes.data) {
        const p = profileRes.data as Record<string, unknown>;
        trade = (p?.job_title ?? p?.jobTitle ?? "") as string;
      }

      userDataCache[userId] = {
        trade,
        preInductionStatus: (userData.pre_induction_status ?? userData.preInductionStatus ?? "not_started") as string,
        adminOverride: (userData.admin_pre_induction_override ?? userData.adminPreInductionOverride) === true,
        complianceScore: (userData.compliance_score ?? userData.complianceScore ?? null) as number | null,
        sections: {
          personal,
          rightToWork,
          certifications: certArr,
          medical,
          training: trArr,
          trainingFull: training as Record<string, unknown> | null,
          declarations,
        },
        missingItems,
        expiringItems,
      };
    })
  );

  const rows: ComplianceExportRow[] = [];

  for (const userDoc of userDocs) {
    const userId = userDoc.id;
    const userData = userDoc as Record<string, unknown>;
    const cache = userDataCache[userId];
    if (!cache) continue;

    if (filters.role && filters.role !== "all") {
      const userRole = (userData.role as string) ?? "OPERATIVE";
      if (userRole !== filters.role) continue;
    }

    const companyIdVal = cid(userDoc);
    const companyName = companyNames[companyIdVal] ?? companyIdVal;

    const inductionRows = await Promise.all(
      siteDocs.map((s) =>
        supabaseAdmin
          .from("user_site_inductions")
          .select("*")
          .eq("user_id", userId)
          .eq("site_id", s.id)
          .maybeSingle()
      )
    );

    for (let i = 0; i < siteDocs.length; i++) {
      const siteDoc = siteDocs[i];
      const siteId = siteDoc.id;
      const siteName = siteNames[siteId] ?? siteId;

      if (filters.siteId && filters.siteId !== "all" && siteId !== filters.siteId) continue;
      if (filters.companyId && filters.companyId !== "all" && companyIdVal !== filters.companyId) continue;
      if (filters.trade && filters.trade !== "all" && cache.trade !== filters.trade) continue;

      const indRow = inductionRows[i]?.data;
      let inductionStatus = "Induction Required";
      let grandfathered = false;
      let completedAt: Date | null = null;

      if (indRow) {
        const ind = indRow as Record<string, unknown>;
        const raw = ind.completed_at ?? ind.completedAt;
        completedAt = toDate(raw);
        grandfathered = ind.grandfathered === true;
        const statusVal = (ind.status ?? "completed") as string;
        const isExpired =
          completedAt && now.getTime() - completedAt.getTime() > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        if (isExpired) inductionStatus = "Expired";
        else if (statusVal === "completed") inductionStatus = grandfathered ? "Grandfathered" : "Inducted";
        else inductionStatus = cache.adminOverride ? "Pre-Induction Override" : cache.preInductionStatus === "complete" ? "Induction Required" : "Pre-Induction Required";
      } else {
        inductionStatus = cache.adminOverride ? "Pre-Induction Override" : cache.preInductionStatus === "complete" ? "Induction Required" : "Pre-Induction Required";
      }

      const filterStatus = filters.status;
      if (filterStatus && filterStatus !== "all") {
        const statusMap: Record<string, string[]> = {
          compliant: ["Inducted"],
          grandfathered: ["Grandfathered"],
          override_applied: ["Pre-Induction Override"],
          expired: ["Expired"],
          missing_pre_induction: ["Pre-Induction Required"],
          missing_induction: ["Induction Required"],
        };
        const allowed = statusMap[filterStatus];
        if (allowed && !allowed.includes(inductionStatus)) continue;
      }

      if (filters.expiry && filters.expiry !== "all") {
        const expiring = cache.expiringItems.length > 0;
        if (filters.expiry === "expired" && !cache.expiringItems.some((e) => e.includes("expired"))) continue;
        if (filters.expiry === "expiring_30" || filters.expiry === "expiring_60") {
          if (!expiring) continue;
        }
      }

      const siteData = siteDoc.data();
      const siteRamsVersion = (siteData?.rams_version ?? siteData?.ramsVersion ?? null) as string | null;
      const siteRamsUpdatedAt = toDate(siteData?.ramsUpdatedAt ?? siteData?.rams_updated_at);
      const trainingForRams = cache.sections.trainingFull;
      const ramsStatus = getRamsStatusForSite(trainingForRams, siteId, siteRamsVersion);

      const rowMissingItems = [...cache.missingItems];
      if (ramsStatus === "pending") rowMissingItems.push("RAMS not accepted");
      else if (ramsStatus === "outdated") rowMissingItems.push("RAMS outdated");

      const rowExpiringItems = [...cache.expiringItems];
      if (siteRamsVersion && siteRamsUpdatedAt && ramsStatus !== "accepted" && ramsStatus !== "not_required") {
        const sevenDays = 7 * day;
        if (now.getTime() - siteRamsUpdatedAt.getTime() < sevenDays) {
          rowExpiringItems.push("RAMS updated recently — acceptance required");
        }
      }

      const rt = cache.sections.rightToWork as Record<string, unknown> | null;
      rows.push({
        uid: userId,
        name: (userData.name ?? userData.display_name ?? userData.email ?? userId) as string,
        companyName,
        trade: cache.trade,
        siteName,
        siteId,
        preInductionStatus: cache.preInductionStatus,
        inductionStatus,
        overrideApplied: cache.adminOverride,
        grandfathered,
        complianceScore: cache.complianceScore,
        missingItems: rowMissingItems,
        expiringItems: rowExpiringItems,
        rightToWork: {
          verified: !!((rt?.right_to_work_verified ?? rt?.rightToWorkVerified) ?? false),
          expiry: toDate(rt?.visa_expiry ?? rt?.visaExpiry),
        },
        certifications: (cache.sections.certifications ?? []).map((c) => ({
          type: (c.type as string) ?? "",
          verified: !!(c.verified ?? false),
          expiry: toDate(c.expiry_date ?? c.expiryDate),
        })),
        medical: {
          verified: !!((cache.sections.medical as Record<string, unknown>)?.medical_verified ?? (cache.sections.medical as Record<string, unknown>)?.medicalVerified ?? false),
        },
        training: (cache.sections.training ?? []).map((t) => ({
          title: (t.title as string) ?? undefined,
          expiry: toDate((t as Record<string, unknown>).expiry_date ?? (t as Record<string, unknown>).expiryDate),
        })),
        declarations: {
          operativeAccepted: !!((cache.sections.declarations as Record<string, unknown>)?.operative_declaration_accepted ?? (cache.sections.declarations as Record<string, unknown>)?.operativeDeclarationAccepted ?? false),
        },
        ramsStatus,
        ramsVersion: siteRamsVersion,
        ramsAcceptedAt: trainingForRams?.ramsAcceptedAt != null ? toDate(trainingForRams.ramsAcceptedAt) : trainingForRams?.rams_accepted_at != null ? toDate(trainingForRams.rams_accepted_at) : null,
      });
    }
  }

  return rows;
}
