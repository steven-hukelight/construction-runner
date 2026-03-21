"use client";

import { supabase } from "@/lib/supabaseClient";

const BUCKET = "pre-induction";

export type UploadResult = { path: string; signedUrl: string | null };

function normalizeDate(val: string | null | undefined): string | null {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function uploadFile(path: string, file: File): Promise<UploadResult> {
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type || undefined });
  if (uploadError) throw new Error(uploadError.message);

  const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (signErr) throw new Error(signErr.message);
  return { path, signedUrl: signed?.signedUrl ?? null };
}

export async function uploadPreInductionFile(params: {
  userId: string;
  sectionId: string;
  fieldName: string;
  file: File;
}): Promise<UploadResult> {
  const safeName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${params.userId}/${params.sectionId}/${params.fieldName}_${Date.now()}_${safeName}`;
  return uploadFile(path, params.file);
}

export async function createSignedPreInductionUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  // Already a full URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(trimmed, 60 * 60);
  if (error) throw new Error(error.message);
  return data?.signedUrl ?? null;
}

export async function openPreInductionFile(path: string | null | undefined): Promise<void> {
  const url = await createSignedPreInductionUrl(path);
  if (!url) throw new Error("File not available");
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function savePersonal(userId: string, form: Record<string, unknown>): Promise<void> {
  const payload = {
    user_id: userId,
    full_name: (form.fullName as string) ?? "",
    date_of_birth: form.dateOfBirth ? normalizeDate(form.dateOfBirth as string) : null,
    phone: (form.phone as string) ?? "",
    email: (form.email as string) ?? "",
    address: (form.address as string) ?? "",
    emergency_contact_name: (form.emergencyContactName as string) ?? "",
    emergency_contact_relationship: (form.emergencyContactRelationship as string) ?? "",
    emergency_contact_phone: (form.emergencyContactPhone as string) ?? "",
    national_insurance: (form.nationalInsuranceNumber as string) ?? (form.nationalInsurance as string) ?? "",
    utr: (form.utrNumber as string) ?? (form.utr as string) ?? "",
    data: {
      employerCompanyId: (form.employerCompanyId as string) ?? "",
      supervisorName: (form.supervisorName as string) ?? "",
      trade: (form.trade as string) ?? "",
      jobRole: (form.jobRole as string) ?? "",
      payrollNumber: (form.payrollNumber as string) ?? "",
    },
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("pre_induction_personal").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);

  // Best-effort sync display name/phone
  try {
    await supabase
      .from("users")
      .update({ display_name: payload.full_name || null, phone: payload.phone || null, updated_at: payload.updated_at })
      .eq("id", userId);
  } catch {
    // ignore
  }
}

export async function saveRightToWork(userId: string, form: Record<string, unknown>): Promise<void> {
  const payload = {
    user_id: userId,
    passport_url: (form.passportUrl as string) ?? null,
    passport_expiry: normalizeDate(form.passportExpiry as string),
    visa_url: (form.visaUrl as string) ?? null,
    visa_expiry: normalizeDate(form.visaExpiry as string),
    share_code: (form.shareCode as string) ?? null,
    proof_of_address_url: (form.proofOfAddressUrl as string) ?? null,
    right_to_work_verified: !!form.rightToWorkVerified,
    notes: (form.notes as string) ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("pre_induction_right_to_work").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function saveMedical(userId: string, form: Record<string, unknown>): Promise<void> {
  const payload = {
    user_id: userId,
    medical_declaration: (form.medicalDeclaration as string) ?? null,
    fit_to_work: form.fitToWork,
    has_medical_issues: form.hasMedicalIssues,
    allergies: (form.allergies as string) ?? null,
    medication: (form.medication as string) ?? null,
    medical_certificate_url: (form.medicalCertificateUrl as string) ?? null,
    medical_verified: !!form.medicalVerified,
    notes: (form.notes as string) ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("pre_induction_medical").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function saveTraining(userId: string, params: { records: Array<Record<string, unknown>>; ramsAccepted: boolean; ramsVersion?: string | null; ramsRequiredVersion?: string | null; ramsRequiredVersionBySite?: Record<string, string> | null; ramsStatus?: string | null; }): Promise<void> {
  const payloadRecords = params.records.map((r) => ({
    type: (r.type as string) || "Training",
    completedAt: normalizeDate(r.completedAt as string),
    expiry: normalizeDate(r.expiry as string),
    fileUrl: (r.fileUrl as string) || null,
    verified: !!r.verified,
    notes: (r.notes as string) || null,
  }));

  const payload = {
    user_id: userId,
    training_records: payloadRecords,
    rams_accepted: !!params.ramsAccepted,
    rams_accepted_at: params.ramsAccepted ? new Date().toISOString() : null,
    rams_version: params.ramsVersion ?? null,
    rams_required_version: params.ramsRequiredVersion ?? null,
    rams_required_version_by_site: params.ramsRequiredVersionBySite ?? null,
    rams_status: params.ramsStatus ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("pre_induction_training").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function saveDeclarations(userId: string, form: Record<string, unknown>): Promise<void> {
  const payload = {
    user_id: userId,
    operative_declaration_accepted: !!form.operativeDeclarationAccepted,
    operative_declaration_accepted_at: form.operativeDeclarationAccepted ? new Date().toISOString() : null,
    operative_signature_url: (form.operativeSignatureUrl as string) ?? null,
    supervisor_declaration_accepted: !!form.supervisorDeclarationAccepted,
    supervisor_declaration_accepted_at: form.supervisorDeclarationAccepted ? new Date().toISOString() : null,
    notes: (form.notes as string) ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("pre_induction_declarations").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function saveCertifications(userId: string, certs: Array<Record<string, unknown>>): Promise<void> {
  const mapped = certs.map((c) => ({
    type: (c.type as string) || "Other",
    cardNumber: (c.cardNumber as string) || null,
    fileUrl: (c.fileUrl as string) || null,
    expiry: normalizeDate(c.expiry as string),
    verified: !!c.verified,
    notes: (c.notes as string) || null,
  }));

  const { error } = await supabase
    .from("pre_induction_certifications")
    .upsert({ user_id: userId, certifications: mapped, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function saveCompetencyCard(userId: string, form: Record<string, unknown>): Promise<void> {
  const payload = {
    user_id: userId,
    card_type: (form.cardType as string) ?? "CSCS",
    card_number: (form.cardNumber as string) ?? "",
    expiry: normalizeDate(form.expiry as string),
    file_url: (form.fileUrl as string) ?? null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("pre_induction_competency_card").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

export async function setPreInductionOverride(userId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ admin_pre_induction_override: enabled, pre_induction_status: enabled ? "complete" : null })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}
