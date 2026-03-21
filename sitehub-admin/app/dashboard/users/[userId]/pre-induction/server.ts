"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type PreInductionSectionData = Record<string, unknown> | null;

const SECTION_IDS = [
  "personal",
  "rightToWork",
  "certifications",
  "competencyCard",
  "medical",
  "training",
  "declarations",
] as const;

type SectionId = (typeof SECTION_IDS)[number];

const TABLE_MAP: Record<SectionId, string> = {
  personal: "pre_induction_personal",
  rightToWork: "pre_induction_right_to_work",
  certifications: "pre_induction_certifications",
  competencyCard: "pre_induction_competency_card",
  medical: "pre_induction_medical",
  training: "pre_induction_training",
  declarations: "pre_induction_declarations",
}

function toBoolean(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") return ["true", "t", "1", "yes", "y", "on"].includes(val.trim().toLowerCase());
  if (typeof val === "number") return val !== 0;
  return false;
}

function mapMedicalToCamelCase(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return {
    ...row,
    medicalDeclaration: row.medical_declaration ?? row.medicalDeclaration,
    fitToWork: row.fit_to_work ?? row.fitToWork,
    hasMedicalIssues: row.has_medical_issues ?? row.hasMedicalIssues,
    medicalCertificateUrl: row.medical_certificate_url ?? row.medicalCertificateUrl,
    medicalVerified: toBoolean(row.medical_verified ?? row.medicalVerified),
    allergies: row.allergies ?? (row.data as Record<string, unknown>)?.allergies ?? "",
    medication: row.medication ?? (row.data as Record<string, unknown>)?.medication ?? "",
    notes: row.notes ?? (row.data as Record<string, unknown>)?.notes ?? "",
  };
}

function mapTrainingToCamelCase(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return {
    ...row,
    trainingRecords: row.training_records ?? row.trainingRecords ?? [],
    ramsAccepted: !!row.rams_accepted,
  };
}

function mapDeclarationsToCamelCase(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return {
    ...row,
    operativeDeclarationAccepted: !!row.operative_declaration_accepted,
    operativeSignatureUrl: row.operative_signature_url ?? row.operativeSignatureUrl ?? "",
    supervisorDeclarationAccepted: !!row.supervisor_declaration_accepted,
    notes: row.notes ?? (row.data as Record<string, unknown>)?.notes ?? "",
  };
}

function mapRightToWorkToCamelCase(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return {
    ...row,
    passportUrl: row.passport_url ?? row.passportUrl,
    passportExpiry: row.passport_expiry ?? row.passportExpiry,
    visaUrl: row.visa_url ?? row.visaUrl,
    visaExpiry: row.visa_expiry ?? row.visaExpiry,
    shareCode: row.share_code ?? row.shareCode,
    proofOfAddressUrl: row.proof_of_address_url ?? row.proofOfAddressUrl,
    rightToWorkVerified: toBoolean(row.right_to_work_verified ?? row.rightToWorkVerified),
    notes: row.notes ?? (row.data as Record<string, unknown>)?.notes,
  };
}

function mapPersonalToCamelCase(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  const data = (row.data as Record<string, unknown>) ?? {};
  return {
    ...row,
    fullName: row.full_name ?? row.fullName,
    dateOfBirth: row.date_of_birth ?? row.dateOfBirth,
    emergencyContactName: row.emergency_contact_name ?? row.emergencyContactName,
    emergencyContactRelationship: row.emergency_contact_relationship ?? row.emergencyContactRelationship,
    emergencyContactPhone: row.emergency_contact_phone ?? row.emergencyContactPhone,
    nationalInsuranceNumber: row.national_insurance ?? row.nationalInsuranceNumber,
    utrNumber: row.utr ?? row.utrNumber,
    employerCompanyId: data.employerCompanyId ?? row.employer_company_id ?? "",
    supervisorName: data.supervisorName ?? row.supervisor_name ?? "",
    trade: data.trade ?? row.trade ?? "",
    jobRole: data.jobRole ?? row.job_role ?? "",
    payrollNumber: data.payrollNumber ?? row.payroll_number ?? "",
  };
}

export type PreInductionPageData = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    companyId: string | null;
    companyName: string | null;
    role: string | null;
    preInductionStatus: "not_started" | "in_progress" | "complete";
    adminPreInductionOverride: boolean;
    complianceScore: number | null;
  } | null;
  sections: Record<SectionId, PreInductionSectionData>;
};

export async function getPreInductionData(
  userId: string,
  auth: { role: string | undefined; companyId: string | undefined }
): Promise<PreInductionPageData> {
  const empty: PreInductionPageData = {
    user: null,
    sections: {
      personal: null,
      rightToWork: null,
      certifications: null,
      competencyCard: null,
      medical: null,
      training: null,
      declarations: null,
    },
  };

  const { data: userRow } = await supabaseAdmin.from("users").select("*").eq("id", userId).maybeSingle();
  if (!userRow) return empty;

  const userData = userRow as Record<string, unknown>;
  const userCompanyId = String(userData?.company_id ?? userData?.companyid ?? "").trim();

  if (auth.role !== "superuser" && auth.companyId !== userCompanyId) {
    return empty;
  }

  let companyName: string | null = null;
  if (userCompanyId) {
    const { data: co } = await supabaseAdmin.from("companies").select("name").eq("id", userCompanyId).maybeSingle();
    companyName = (co?.name as string) ?? null;
  }

  const sections: Record<SectionId, PreInductionSectionData> = {
    personal: null,
    rightToWork: null,
    certifications: null,
    competencyCard: null,
    medical: null,
    training: null,
    declarations: null,
  };

  for (const sectionId of SECTION_IDS) {
    const table = TABLE_MAP[sectionId];
    const { data } = await supabaseAdmin.from(table).select("*").eq("user_id", userId).maybeSingle();
    if (data) {
      const row = data as Record<string, unknown>;
      if (sectionId === "personal") {
        sections[sectionId] = mapPersonalToCamelCase(row);
      } else if (sectionId === "rightToWork") {
        sections[sectionId] = mapRightToWorkToCamelCase(row);
      } else if (sectionId === "medical") {
        sections[sectionId] = mapMedicalToCamelCase(row);
      } else if (sectionId === "training") {
        sections[sectionId] = mapTrainingToCamelCase(row);
      } else if (sectionId === "declarations") {
        sections[sectionId] = mapDeclarationsToCamelCase(row);
      } else {
        sections[sectionId] = row;
      }
    }
  }

  const name = (userData?.name ?? userData?.display_name ?? (sections.personal as Record<string, unknown>)?.full_name ?? (sections.personal as Record<string, unknown>)?.fullName ?? null) as string | null;

  return {
    user: {
      id: userId,
      name,
      email: (userData?.email ?? null) as string | null,
      companyId: userCompanyId || null,
      companyName,
      role: (userData?.role ?? null) as string | null,
      preInductionStatus: (userData?.pre_induction_status ?? userData?.preInductionStatus ?? "not_started") as "not_started" | "in_progress" | "complete",
      adminPreInductionOverride: (userData?.admin_pre_induction_override ?? userData?.adminPreInductionOverride ?? false) as boolean,
      complianceScore: (userData?.compliance_score ?? userData?.complianceScore) != null ? Number(userData?.compliance_score ?? userData?.complianceScore) : null,
    },
    sections,
  };
}
