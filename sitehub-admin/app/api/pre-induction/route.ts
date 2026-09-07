import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkPreInductionAccess } from "./[userId]/_utils/auth";

const SECTION_IDS = [
  "personal",
  "rightToWork",
  "certifications",
  "medical",
  "training",
  "competencyCard",
  "declarations",
] as const;

const TABLE_MAP: Record<string, string> = {
  personal: "pre_induction_personal",
  rightToWork: "pre_induction_right_to_work",
  certifications: "pre_induction_certifications",
  medical: "pre_induction_medical",
  training: "pre_induction_training",
  competencyCard: "pre_induction_competency_card",
  declarations: "pre_induction_declarations",
};

function mapPersonalToCamelCase(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return {
    ...row,
    fullName: row.full_name ?? row.fullName,
    dateOfBirth: row.date_of_birth ?? row.dateOfBirth,
    emergencyContactName: row.emergency_contact_name ?? row.emergencyContactName,
    emergencyContactRelationship: row.emergency_contact_relationship ?? row.emergencyContactRelationship,
    emergencyContactPhone: row.emergency_contact_phone ?? row.emergencyContactPhone,
    nationalInsuranceNumber: row.national_insurance ?? row.nationalInsuranceNumber,
    utrNumber: row.utr ?? row.utrNumber,
  };
}

function mapCompetencyCardToCamelCase(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return {
    ...row,
    cardType: row.card_type ?? row.cardType,
    cardNumber: row.card_number ?? row.cardNumber,
    fileUrl: row.file_url ?? row.fileUrl,
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
    rightToWorkVerified: !!row.right_to_work_verified,
  };
}

function mapMedicalToCamelCase(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return {
    ...row,
    medicalDeclaration: row.medical_declaration ?? row.medicalDeclaration,
    fitToWork: row.fit_to_work ?? row.fitToWork,
    medicalCertificateUrl: row.medical_certificate_url ?? row.medicalCertificateUrl,
    medicalVerified: !!row.medical_verified,
    allergies: row.allergies ?? "",
    medication: row.medication ?? "",
  };
}

function mapTrainingToCamelCase(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  const rawRecords = row.training_records ?? row.trainingRecords ?? [];
  const arr = Array.isArray(rawRecords) ? rawRecords : [];
  const trainingRecords = arr.map((r: Record<string, unknown>) => ({
    type: typeof r.type === "string" ? r.type : "Training",
    completedAt: r.completedAt ?? r.completed_at ?? null,
    expiry: r.expiry ?? r.expiry_date ?? null,
    fileUrl: r.fileUrl ?? r.file_url ?? null,
    verified: !!r.verified,
    notes: r.notes ?? null,
  }));
  return {
    ...row,
    trainingRecords,
    ramsAccepted: !!row.rams_accepted,
    ramsAcceptedAt: row.rams_accepted_at ?? row.ramsAcceptedAt,
    ramsVersion: row.rams_version ?? row.ramsVersion ?? "",
  };
}

function mapCertificationsToCamelCase(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  const rawList = row.certifications;
  const list = Array.isArray(rawList) ? rawList : [];
  const certifications = list.map((c: Record<string, unknown>) => ({
    type: typeof c.type === "string" ? c.type : "Other",
    cardNumber: c.cardNumber ?? c.card_number ?? null,
    fileUrl: c.fileUrl ?? c.file_url ?? null,
    expiry: c.expiry ?? c.expiry_date ?? null,
    verified: !!c.verified,
    verifiedBy: c.verifiedBy ?? c.verified_by ?? null,
    verifiedAt: c.verifiedAt ?? c.verified_at ?? null,
    notes: c.notes ?? null,
  }));
  return {
    ...row,
    certifications,
  };
}

function mapDeclarationsToCamelCase(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return {
    ...row,
    operativeDeclarationAccepted: !!row.operative_declaration_accepted,
    operativeDeclarationAcceptedAt: row.operative_declaration_accepted_at ?? row.operativeDeclarationAcceptedAt,
  };
}

/**
 * GET /api/pre-induction?userId=xxx
 * Returns pre-induction profile sections for mobile app.
 * Format: [{ section: "personal", ...data }, ...]
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId")?.trim();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const access = await checkPreInductionAccess(userId, req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error ?? "Forbidden" }, { status: access.status ?? 403 });
    }

    const sections: { section: string; [k: string]: unknown }[] = [];

    // For personal section: merge from profiles if pre_induction_personal is empty (linked data)
    const { data: personalRow } = await supabaseAdmin.from("pre_induction_personal").select("*").eq("user_id", userId).maybeSingle();
    const { data: profileRow } = await supabaseAdmin.from("profiles").select("*").eq("user_id", userId).limit(1).maybeSingle();
    const { data: userRow2 } = await supabaseAdmin.from("users").select("display_name, email, phone").eq("id", userId).maybeSingle();
    let personalMerged = personalRow as Record<string, unknown> | null;
    if (!personalMerged?.full_name && (profileRow || userRow2)) {
      personalMerged = {
        ...personalMerged,
        full_name: personalMerged?.full_name ?? (userRow2 as { display_name?: string } | null)?.display_name ?? "",
        phone: personalMerged?.phone ?? userRow2?.phone ?? "",
        email: personalMerged?.email ?? userRow2?.email ?? "",
        address: personalMerged?.address ?? profileRow?.address_line1 ?? "",
        emergency_contact_name: personalMerged?.emergency_contact_name ?? profileRow?.emergency_contact_name ?? "",
        emergency_contact_phone: personalMerged?.emergency_contact_phone ?? profileRow?.emergency_contact_phone ?? "",
        national_insurance: personalMerged?.national_insurance ?? profileRow?.ni_number ?? "",
        utr: personalMerged?.utr ?? profileRow?.utr_number ?? "",
        date_of_birth: personalMerged?.date_of_birth ?? profileRow?.date_of_birth ?? null,
      };
    }

    const MAPPER: Record<string, (r: Record<string, unknown> | null) => Record<string, unknown> | null> = {
      certifications: mapCertificationsToCamelCase,
      competencyCard: mapCompetencyCardToCamelCase,
      rightToWork: mapRightToWorkToCamelCase,
      medical: mapMedicalToCamelCase,
      training: mapTrainingToCamelCase,
      declarations: mapDeclarationsToCamelCase,
    };

    for (const sectionId of SECTION_IDS) {
      if (sectionId === "personal") {
        sections.push({ section: "personal", ...mapPersonalToCamelCase(personalMerged) });
        continue;
      }
      const table = TABLE_MAP[sectionId];
      const { data } = await supabaseAdmin.from(table).select("*").eq("user_id", userId).maybeSingle();
      const raw = data as Record<string, unknown> | null;
      const mapper = MAPPER[sectionId];
      const row = raw ? (mapper ? mapper(raw) : raw) : null;
      sections.push({
        section: sectionId,
        ...(row || {}),
      });
    }

    return NextResponse.json(sections);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("GET /api/pre-induction failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
