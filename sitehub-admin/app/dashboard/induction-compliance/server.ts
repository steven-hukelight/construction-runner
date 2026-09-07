"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRamsStatusForSite } from "@/lib/ramsCompliance";
import type { RamsStatus } from "@/lib/ramsCompliance";
import { updatePreInductionStatus } from "@/app/api/pre-induction/[userId]/_utils/status";

async function resolveUser(userIdOrEmail: string) {
  const { data: byId } = await supabaseAdmin.from("users").select("*").eq("id", userIdOrEmail).maybeSingle();
  if (byId) return byId as Record<string, unknown>;
  const { data: byEmail } = await supabaseAdmin.from("users").select("*").eq("email", userIdOrEmail).maybeSingle();
  return byEmail as Record<string, unknown> | null;
}

const EXPIRY_DAYS = 365;

export type ComplianceUser = {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  trade?: string;
  cscsNumber?: string;
  role?: string;
};

export type ComplianceSite = {
  id: string;
  name: string;
};

export type InductionStatus = "completed" | "not_started" | "expired";

export type ComplianceFilterStatus =
  | "compliant"
  | "missing_pre_induction"
  | "missing_induction"
  | "expired"
  | "override_applied"
  | "grandfathered";

export type ComplianceRow = {
  userId: string;
  userName: string;
  userRole?: string;
  companyId: string;
  companyName: string;
  trade: string;
  cscsNumber?: string;
  siteId: string;
  siteName: string;
  status: ComplianceFilterStatus;
  /** ISO — serializable from RSC → client */
  completedAt: string | null;
  adminPreInductionOverride: boolean;
  missingItems: string[];
  expiryWarnings: { type: string; label: string; expiry: string }[];
  ramsStatus: RamsStatus;
  ramsVersion?: string | null;
  ramsAcceptedAt?: string | null;
};

export type ComplianceData = {
  users: ComplianceUser[];
  sites: ComplianceSite[];
  companyOptions: { id: string; name: string }[];
  matrix: Record<string, Record<string, { status: InductionStatus; completedAt: Date | null }>>;
  rows: ComplianceRow[];
  tradeOptions: string[];
  roleOptions: string[];
};

function toDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof (v as { toDate?: () => Date }).toDate === "function") return (v as { toDate: () => Date }).toDate();
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function toIso(d: Date | null | undefined): string | null {
  if (!d || isNaN(d.getTime())) return null;
  return d.toISOString();
}

function cid(u: { company_id?: string | null }): string {
  return (u.company_id ?? "") as string;
}

function isTruthyYes(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "true" || v === "yes" || v === "y" || v === "1";
  }
  return false;
}

export async function getComplianceData(
  auth: { role: string | undefined; companyId: string | undefined }
): Promise<ComplianceData | null> {
  const companyId = (auth.companyId ?? "").trim();
  // Non-superuser MUST have a company; superuser without company sees empty
  if (!companyId && auth.role !== "superuser") return null;
  if (auth.role === "superuser" && !companyId) {
    return { users: [], sites: [], companyOptions: [], matrix: {}, rows: [], tradeOptions: [], roleOptions: [] };
  }
  if (!companyId) {
    return { users: [], sites: [], companyOptions: [], matrix: {}, rows: [], tradeOptions: [], roleOptions: [] };
  }

  const effectiveCompanyId = companyId;

  // Sites: filter by company_id (superuser bypass: if no companyId, handled above)
  const { data: sitesRows } = await supabaseAdmin
    .from("sites")
    .select("id, name, ramsversion, rams_version")
    .eq("company_id", effectiveCompanyId);
  const sites: ComplianceSite[] = (sitesRows ?? []).map((s) => ({
    id: s.id,
    name: (s.name ?? s.id) as string,
  }));

  // Users: filter by company_id
  const { data: rawUsersRows } = await supabaseAdmin
    .from("users")
    .select("id, email, role, company_id, name, display_name, pre_induction_status, admin_pre_induction_override")
    .eq("company_id", effectiveCompanyId);
  // Strict filter: only include users whose company matches (defense in depth)
  const usersRows = (rawUsersRows ?? []).filter(
    (u) => cid(u) === effectiveCompanyId
  );
  if (!usersRows || usersRows.length === 0) {
    return {
      users: [],
      sites,
      companyOptions: [],
      matrix: {},
      rows: [],
      tradeOptions: [],
      roleOptions: [],
    };
  }

  const companyIds = new Set<string>();
  usersRows.forEach((u) => {
    const c = cid(u);
    if (c) companyIds.add(c);
  });
  const companyNames: Record<string, string> = {};
  for (const cidVal of companyIds) {
    if (!cidVal) continue;
    const { data: co } = await supabaseAdmin.from("companies").select("name").eq("id", cidVal).single();
    companyNames[cidVal] = (co?.name as string) ?? cidVal;
  }

  const roleSet = new Set<string>();
  usersRows.forEach((u) => {
    const userRole = (u.role as string) ?? "OPERATIVE";
    if (userRole) roleSet.add(userRole);
  });

  const companyOptions = Array.from(companyIds)
    .filter(Boolean)
    .map((cidVal) => ({ id: cidVal, name: companyNames[cidVal] ?? cidVal }));

  const now = new Date();
  const matrix: Record<string, Record<string, { status: InductionStatus; completedAt: Date | null }>> = {};
  const tradeSet = new Set<string>();
  const userProfiles: Record<string, { trade: string; cscsNumber?: string }> = {};
  const userPreInduction: Record<
    string,
    {
      missingItems: string[];
      expiryWarnings: { type: string; label: string; expiry: Date }[];
      preInductionStatus: string;
      training: Record<string, unknown> | null;
    }
  > = {};

  for (const u of usersRows) {
    const userId = u.id;
    const preInductionStatus = (u.pre_induction_status as string) ?? "not_started";
    // Profile (job_title, cscsNumber)
    const { data: profileRow } = await supabaseAdmin
      .from("user_profile_data")
      .select("job_title")
      .or(`user_id.eq.${userId},userid.eq.${userId}`)
      .limit(1)
      .maybeSingle();
    const trade = (profileRow?.job_title ?? "") as string;
    let cscsNumber = "";
    if (profileRow && typeof profileRow === "object" && "cscsNumber" in profileRow) {
      cscsNumber = (profileRow as Record<string, unknown>).cscsNumber as string;
    }
    if (trade) tradeSet.add(trade);
    userProfiles[userId] = { trade, cscsNumber };

    // Pre-induction sections (all use user_id; userid does not exist on these tables)
    const [personalRes, rightToWorkRes, competencyRes, certsRes, medicalRes, trainingRes, declarationsRes] = await Promise.all([
      supabaseAdmin.from("pre_induction_personal").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_right_to_work").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_competency_card").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_certifications").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_medical").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_training").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("pre_induction_declarations").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    const personal = personalRes.data;
    const rightToWork = rightToWorkRes.data;
    const competencyCard = competencyRes.data;
    const certifications = certsRes.data;
    const medical = medicalRes.data;
    const training = trainingRes.data;
    const declarations = declarationsRes.data;

    const certArr = Array.isArray((certifications as Record<string, unknown>)?.certifications)
      ? (certifications as Record<string, unknown>).certifications as Array<Record<string, unknown>>
      : [];

    const missingItems: string[] = [];
    const personalComplete = !!(personal && ((personal as Record<string, unknown>).full_name || (personal as Record<string, unknown>).email));

    // Right to Work: verified OR passport/visa AND proof of address
    const rtwHasId = !!(rightToWork && ((rightToWork as Record<string, unknown>).passport_url ?? (rightToWork as Record<string, unknown>).passportUrl ?? (rightToWork as Record<string, unknown>).visa_url ?? (rightToWork as Record<string, unknown>).visaUrl));
    const rtwHasProof = !!(rightToWork && ((rightToWork as Record<string, unknown>).proof_of_address_url ?? (rightToWork as Record<string, unknown>).proofOfAddressUrl));
    const rtwVerified = !!rightToWork && Object.keys(rightToWork).length > 0 && ((rightToWork as Record<string, unknown>).right_to_work_verified ?? (rightToWork as Record<string, unknown>).rightToWorkVerified) === true;
    const rightToWorkComplete = rtwVerified || (rtwHasId && rtwHasProof);

    // Competency: BOTH document AND card number required
    const ccHasDoc = !!((competencyCard as Record<string, unknown>)?.file_url ?? (competencyCard as Record<string, unknown>)?.fileUrl);
    const ccNum = (((competencyCard as Record<string, unknown>)?.card_number ?? (competencyCard as Record<string, unknown>)?.cardNumber) ?? "").toString().trim();
    const competencyOk = !!(competencyCard && Object.keys(competencyCard).length > 0 && ccHasDoc && ccNum.length > 0);

    // Medical: no issues (has_medical_issues=false OR fit_to_work=true) = complete; else need cert or verified
    const medHasIssues = (medical as Record<string, unknown> | null)?.has_medical_issues ?? (medical as Record<string, unknown> | null)?.hasMedicalIssues;
    const medFitToWork = (medical as Record<string, unknown> | null)?.fit_to_work ?? (medical as Record<string, unknown> | null)?.fitToWork;
    const medNoIssues = medHasIssues === false || isTruthyYes(medFitToWork);
    const medHasCert = !!((medical as Record<string, unknown> | null)?.medical_certificate_url ?? (medical as Record<string, unknown> | null)?.medicalCertificateUrl);
    const medicalVerified = !!medical && Object.keys(medical).length > 0 && ((medical as Record<string, unknown>).medical_verified ?? (medical as Record<string, unknown>).medicalVerified) === true;
    const medicalComplete = medicalVerified || medNoIssues || medHasCert;

    const declAccepted = !!declarations && Object.keys(declarations).length > 0 && ((declarations as Record<string, unknown>).operative_declaration_accepted ?? (declarations as Record<string, unknown>).operativeDeclarationAccepted) === true;

    if (!personalComplete) missingItems.push("Personal details");
    if (!rightToWorkComplete) missingItems.push("Right to Work");
    if (!competencyOk) missingItems.push("Competency card");
    if (!medicalComplete) missingItems.push("Medical");
    if (!declAccepted) missingItems.push("Declarations");

    const expiryWarnings: { type: string; label: string; expiry: Date }[] = [];
    for (const c of certArr) {
      const exp = toDate(c.expiryDate ?? c.expiry_date);
      if (exp && exp.getTime() < now.getTime()) {
        expiryWarnings.push({ type: "cert", label: `CSCS expired ${(c.type as string) || ""}`, expiry: exp });
      } else if (exp && exp.getTime() - now.getTime() < 60 * 24 * 60 * 60 * 1000) {
        expiryWarnings.push({ type: "cert", label: `${(c.type as string) || "Cert"} expiring soon`, expiry: exp });
      }
    }
    const visaExp = toDate((rightToWork as Record<string, unknown>)?.visa_expiry ?? (rightToWork as Record<string, unknown>)?.visaExpiry);
    if (visaExp && visaExp.getTime() < now.getTime())
      expiryWarnings.push({ type: "visa", label: "Visa expired", expiry: visaExp });
    else if (visaExp && visaExp.getTime() - now.getTime() < 60 * 24 * 60 * 60 * 1000) {
      expiryWarnings.push({ type: "visa", label: "Visa expiring soon", expiry: visaExp });
    }

    const derivedPreInductionStatus = missingItems.length === 0 ? "complete" : preInductionStatus;

    userPreInduction[userId] = {
      missingItems,
      expiryWarnings,
      preInductionStatus: derivedPreInductionStatus,
      training: training as Record<string, unknown> | null,
    };
  }

  const rows: ComplianceRow[] = [];
  const sitesSnap = sitesRows ?? [];

  for (const userRow of usersRows) {
    const userId = userRow.id;
    const userData = userRow as Record<string, unknown>;
    const adminOverride = userData.admin_pre_induction_override === true;
    const preInd = userPreInduction[userId] ?? { missingItems: [], expiryWarnings: [], preInductionStatus: "not_started", training: null };
    const preInductionComplete = preInd.missingItems.length === 0;
    const profile = userProfiles[userId] ?? { trade: "", cscsNumber: "" };
    matrix[userId] = matrix[userId] ?? {};

    const userRole = (userData.role as string) ?? "OPERATIVE";

    for (const siteRow of sitesSnap) {
      const siteId = siteRow.id;
      const siteData = siteRow as Record<string, unknown>;
      const siteName = (siteData.name as string) ?? siteId;
      const siteRamsVersion = (siteData.rams_version ?? siteData.ramsversion ?? null) as string | null;
      const siteRamsUpdatedAt = toDate(siteData.ramsUpdatedAt ?? siteData.rams_updated_at);
      const ramsStatus = getRamsStatusForSite(preInd.training, siteId, siteRamsVersion);

      const rowMissingItems = [...preInd.missingItems];
      if (ramsStatus === "pending") rowMissingItems.push("RAMS not accepted");
      else if (ramsStatus === "outdated") rowMissingItems.push("RAMS outdated");

      const rowExpiryWarnings = [...preInd.expiryWarnings];
      if (siteRamsVersion && siteRamsUpdatedAt && ramsStatus !== "accepted" && ramsStatus !== "not_required") {
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (now.getTime() - siteRamsUpdatedAt.getTime() < sevenDays) {
          rowExpiryWarnings.push({ type: "rams", label: "RAMS updated recently — acceptance required", expiry: siteRamsUpdatedAt });
        }
      }

      const { data: indRow } = await supabaseAdmin
        .from("user_site_inductions")
        .select("status, completed_at, grandfathered")
        .eq("user_id", userId)
        .eq("site_id", siteId)
        .maybeSingle();

      let status: ComplianceFilterStatus = "missing_induction";
      let completedAt: Date | null = null;
      let inductionStatus: InductionStatus = "not_started";

      if (indRow) {
        const ind = indRow as Record<string, unknown>;
        const raw = ind.completed_at ?? ind.completedAt;
        completedAt = toDate(raw);
        const statusVal = (ind.status ?? "completed") as string;
        const grandfathered = ind.grandfathered === true;
        const isExpired =
          completedAt && now.getTime() - completedAt.getTime() > EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        inductionStatus = isExpired ? "expired" : statusVal === "completed" ? "completed" : "not_started";

        if (isExpired) status = "expired";
        else if (statusVal === "completed") status = grandfathered ? "grandfathered" : "compliant";
        else {
          if (adminOverride) status = "override_applied";
          else if (!preInductionComplete) status = "missing_pre_induction";
          else status = "missing_induction";
        }
      } else {
        if (adminOverride) status = "override_applied";
        else if (!preInductionComplete) status = "missing_pre_induction";
        else status = "missing_induction";
      }

      matrix[userId][siteId] = { status: inductionStatus, completedAt };

      const c = cid(userRow);
      const trainingData = preInd.training as Record<string, unknown> | null;
      rows.push({
        userId,
        userName: (userData.name ?? userData.display_name ?? userData.email ?? userId) as string,
        userRole,
        companyId: c,
        companyName: companyNames[c] ?? c,
        trade: profile.trade,
        cscsNumber: profile.cscsNumber,
        siteId,
        siteName,
        status,
        completedAt: toIso(completedAt),
        adminPreInductionOverride: adminOverride,
        missingItems: rowMissingItems,
        expiryWarnings: rowExpiryWarnings.map((w) => ({
          type: w.type,
          label: w.label,
          expiry: w.expiry.toISOString(),
        })),
        ramsStatus,
        ramsVersion: siteRamsVersion,
        ramsAcceptedAt: toIso(
          trainingData?.ramsAcceptedAt
            ? toDate(trainingData.ramsAcceptedAt)
            : trainingData?.rams_accepted_at
              ? toDate(trainingData.rams_accepted_at)
              : null
        ),
      });
    }
  }

  const usersExtended: ComplianceUser[] = usersRows.map((u) => {
    const data = u as Record<string, unknown>;
    const c = cid(u);
    const profile = userProfiles[u.id] ?? { trade: "", cscsNumber: "" };
    const userRole = (data.role as string) ?? "OPERATIVE";
    return {
      id: u.id,
      name: (data.name ?? data.display_name ?? data.email ?? u.id) as string,
      companyId: c,
      companyName: companyNames[c] ?? c,
      trade: profile.trade,
      cscsNumber: profile.cscsNumber,
      role: userRole,
    };
  });

  return {
    users: usersExtended,
    sites,
    companyOptions,
    matrix,
    rows,
    tradeOptions: Array.from(tradeSet).sort(),
    roleOptions: Array.from(roleSet).sort(),
  };
}

export type RamsBySite = {
  siteId: string;
  siteName: string;
  status: RamsStatus;
  currentVersion: string | null;
  acceptedVersion: string | null;
  acceptedAt: Date | null;
  fileUrl: string | null;
  title: string | null;
};

export type ComplianceDrawerData = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    companyName: string | null;
    preInductionStatus: string;
    adminPreInductionOverride: boolean;
    complianceScore: number | null;
  };
  sections: Record<string, Record<string, unknown> | null>;
  inductionHistory: Array<{ siteId: string; siteName: string; status: string; completedAt: Date | null; grandfathered?: boolean }>;
  ramsBySite?: RamsBySite[];
};

export async function getComplianceDrawerData(
  userId: string,
  auth: { role: string | undefined; companyId: string | undefined },
  options?: { siteIds?: string[] }
): Promise<ComplianceDrawerData | null> {
  const userRow = await resolveUser(userId);
  if (!userRow) return null;
  const actualUserId = (userRow.id as string) ?? userId;

  // Refresh status/score so the drawer reflects current data even if mobile updated first
  await updatePreInductionStatus(actualUserId);

  const { data: refreshedUser } = await supabaseAdmin.from("users").select("*").eq("id", actualUserId).maybeSingle();
  const userData = (refreshedUser ?? userRow) as Record<string, unknown>;
  const userCompanyId = cid((userData as { company_id?: string | null }) ?? (userRow as { company_id?: string | null }));
  if (auth.role !== "superuser" && auth.companyId !== userCompanyId) return null;

  let companyName: string | null = null;
  if (userCompanyId) {
    const { data: co } = await supabaseAdmin.from("companies").select("name").eq("id", userCompanyId).single();
    companyName = (co?.name as string) ?? null;
  }

  const sectionIds = ["personal", "rightToWork", "certifications", "competencyCard", "medical", "training", "declarations"];
  const tableMap: Record<string, string> = {
    personal: "pre_induction_personal",
    rightToWork: "pre_induction_right_to_work",
    certifications: "pre_induction_certifications",
    competencyCard: "pre_induction_competency_card",
    medical: "pre_induction_medical",
    training: "pre_induction_training",
    declarations: "pre_induction_declarations",
  };

  const sections: Record<string, Record<string, unknown> | null> = {};
  for (const id of sectionIds) {
    const table = tableMap[id];
    const { data } = await supabaseAdmin.from(table).select("*").eq("user_id", actualUserId).maybeSingle();
    sections[id] = data ? (data as Record<string, unknown>) : null;
  }

  // Induction history
  const { data: inductions } = await supabaseAdmin
    .from("user_site_inductions")
    .select("site_id, status, completed_at, grandfathered")
    .eq("user_id", userId);
  const siteIds = (inductions ?? []).map((i) => i.site_id);
  const siteNames: Record<string, string> = {};
  if (siteIds.length > 0) {
    const { data: siteRows } = await supabaseAdmin.from("sites").select("id, name").in("id", siteIds);
    for (const s of siteRows ?? []) {
      siteNames[s.id] = (s.name as string) ?? s.id;
    }
  }

  const now = new Date();
  const inductionHistory = (inductions ?? []).map((ind) => {
    const data = ind as Record<string, unknown>;
    const completedAt = toDate(data.completed_at ?? data.completedAt);
    const grandfathered = data.grandfathered === true;
    const statusVal = (data.status ?? "completed") as string;
    const isExpired =
      completedAt && now.getTime() - completedAt.getTime() > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    let status = statusVal === "completed" ? (grandfathered ? "Grandfathered" : "Inducted") : "Induction Required";
    if (isExpired) status = "Expired";
    return {
      siteId: ind.site_id,
      siteName: siteNames[ind.site_id] ?? ind.site_id,
      status,
      completedAt,
      grandfathered,
    };
  });

  const ramsBySite: RamsBySite[] = [];
  if (options?.siteIds && options.siteIds.length > 0) {
    const training = sections.training as Record<string, unknown> | null;
    for (const siteId of options.siteIds) {
      const { data: siteRow } = await supabaseAdmin.from("sites").select("id, name, rams_version, ramsversion").eq("id", siteId).single();
      const siteData: Record<string, unknown> = (siteRow ?? {}) as Record<string, unknown>;
      const siteRamsVersion = (siteData.rams_version ?? siteData.ramsversion ?? null) as string | null;
      const status = getRamsStatusForSite(training, siteId, siteRamsVersion);
      const { data: ramsRows } = await supabaseAdmin
        .from("rams")
        .select("*")
        .or(`site_id.eq.${siteId},siteid.eq.${siteId}`)
        .order("created_at", { ascending: false })
        .limit(1);
      const latest = ramsRows?.[0] as Record<string, unknown> | undefined;
      const rawAcceptedAt = training?.ramsAcceptedAt ?? training?.rams_accepted_at;
      const acceptedAt = toDate(rawAcceptedAt);
      ramsBySite.push({
        siteId,
        siteName: (siteRow?.name ?? siteId) as string,
        status,
        currentVersion: siteRamsVersion,
        acceptedVersion: (training?.ramsVersion ?? training?.rams_version ?? null) as string | null,
        acceptedAt,
        fileUrl: (latest?.url ?? latest?.file_url ?? latest?.fileurl ?? null) as string | null,
        title: (latest?.title ?? null) as string | null,
      });
    }
  }

  // Derive preInductionStatus from section data so drawer reflects reality (matches mobile/pre-induction rules)
  const personal = sections.personal as Record<string, unknown> | null;
  const rtw = sections.rightToWork as Record<string, unknown> | null;
  const cc = sections.competencyCard as Record<string, unknown> | null;
  const med = sections.medical as Record<string, unknown> | null;
  const decl = sections.declarations as Record<string, unknown> | null;
  const personalOk = !!(personal && (personal.full_name ?? personal.fullName ?? personal.email));
  const rtwHasId = !!(rtw?.passport_url ?? rtw?.passportUrl ?? rtw?.visa_url ?? rtw?.visaUrl);
  const rtwHasProof = !!(rtw?.proof_of_address_url ?? rtw?.proofOfAddressUrl);
  const rtwVerified = !!(rtw && (rtw.right_to_work_verified ?? rtw.rightToWorkVerified) === true);
  const rtwOk = rtwVerified || (rtwHasId && rtwHasProof);
  const ccHasDoc = !!(cc?.file_url ?? cc?.fileUrl);
  const ccNum = ((cc?.card_number ?? cc?.cardNumber) ?? "").toString().trim();
  const ccOk = !!(cc && ccHasDoc && ccNum.length > 0);
  const medHasIssues = med?.has_medical_issues ?? med?.hasMedicalIssues;
  const medFit = med?.fit_to_work ?? med?.fitToWork;
  const medNoIssues = medHasIssues === false || medFit === true || String(medFit ?? "").trim().toLowerCase() === "true";
  const medCert = !!(med?.medical_certificate_url ?? med?.medicalCertificateUrl);
  const medVerified = !!(med && (med.medical_verified ?? med.medicalVerified) === true);
  const medOk = medVerified || medNoIssues || medCert;
  const declOk = !!(decl && (decl.operative_declaration_accepted ?? decl.operativeDeclarationAccepted) === true);
  const allComplete = personalOk && rtwOk && ccOk && medOk && declOk;
  const derivedPreInductionStatus = allComplete ? "complete" : ((userData.pre_induction_status ?? userData.preInductionStatus ?? "not_started") as string);

  return {
    user: {
      id: userId,
      name: (userData.name ?? userData.display_name ?? null) as string | null,
      email: (userData.email ?? null) as string | null,
      companyName,
      preInductionStatus: derivedPreInductionStatus,
      adminPreInductionOverride: (userData.admin_pre_induction_override ?? userData.adminPreInductionOverride ?? false) as boolean,
      complianceScore: (userData.compliance_score ?? userData.complianceScore ?? null) as number | null,
    },
    sections,
    inductionHistory,
    ramsBySite: ramsBySite.length > 0 ? ramsBySite : undefined,
  };
}
