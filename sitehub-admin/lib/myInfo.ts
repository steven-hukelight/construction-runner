/**
 * My Info reflow — shared helpers for reading/writing the 4-section payload.
 *
 * The reflow consolidates today's per-section pre-induction UI into a single
 * "My Info" surface (medical, emergency contact, competency card, declarations).
 * Emergency contact is the only piece with schema consolidation: source of
 * truth is now `user_profile_data`. All other sections keep their existing
 * tables (`pre_induction_medical`, `pre_induction_competency_card`,
 * `pre_induction_declarations`) untouched.
 *
 * Both the worker's own `GET/PUT /api/me/info` and the admin's
 * `GET/PUT /api/admin/users/[id]/info` route through these helpers so the
 * shape is guaranteed identical.
 */

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/auditLog";

// --- Shape ------------------------------------------------------------------

export type MyInfoMedical = {
  medicalDeclaration: string | null;
  fitToWork: boolean | null;
  hasMedicalIssues: boolean | null;
  allergies: string | null;
  medication: string | null;
  medicalCertificateUrl: string | null;
  medicalVerified: boolean;
  notes: string | null;
};

export type MyInfoEmergencyContact = {
  name: string | null;
  phone: string | null;
};

export type MyInfoCompetencyCard = {
  cardType: string | null;
  cardNumber: string | null;
  /** ISO date string (yyyy-mm-dd). Stored in `pre_induction_competency_card.expiry`. */
  expiryDate: string | null;
  /** Uploaded card image. Stored in `pre_induction_competency_card.file_url`. */
  cardImageUrl: string | null;
};

export type MyInfoDeclarations = {
  operativeDeclarationAccepted: boolean;
  operativeSignatureUrl: string | null;
  supervisorDeclarationAccepted: boolean;
  notes: string | null;
};

export type MyInfoPayload = {
  userId: string;
  medical: MyInfoMedical | null;
  emergencyContact: MyInfoEmergencyContact;
  competencyCard: MyInfoCompetencyCard | null;
  declarations: MyInfoDeclarations | null;
};

// --- Coercion helpers -------------------------------------------------------

function s(v: unknown): string | null {
  if (v == null) return null;
  const str = String(v).trim();
  return str.length === 0 ? null : str;
}

function b(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1" || v === "yes";
}

function bOrNull(v: unknown): boolean | null {
  if (v == null || v === "") return null;
  return b(v);
}

// --- Read -------------------------------------------------------------------

export async function readMyInfo(userId: string): Promise<MyInfoPayload> {
  // Parallel fetch for latency. Each row is at-most-one.
  const [medicalRes, profileRes, competencyRes, declarationsRes] = await Promise.all([
    supabaseAdmin.from("pre_induction_medical").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin
      .from("user_profile_data")
      .select("emergency_contact_name, emergency_contact_phone")
      .eq("user_id", userId)
      .maybeSingle(),
    supabaseAdmin.from("pre_induction_competency_card").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("pre_induction_declarations").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  // Fall back to pre_induction_personal for emergency contact if user_profile_data
  // is empty (data hasn't been migrated yet for this user).
  let contactName = profileRes.data?.emergency_contact_name ?? null;
  let contactPhone = profileRes.data?.emergency_contact_phone ?? null;
  if (!contactName && !contactPhone) {
    const { data: legacyPersonal } = await supabaseAdmin
      .from("pre_induction_personal")
      .select("emergency_contact_name, emergency_contact_phone")
      .eq("user_id", userId)
      .maybeSingle();
    contactName = legacyPersonal?.emergency_contact_name ?? null;
    contactPhone = legacyPersonal?.emergency_contact_phone ?? null;
  }

  const medicalRow = (medicalRes.data ?? null) as Record<string, unknown> | null;
  const competencyRow = (competencyRes.data ?? null) as Record<string, unknown> | null;
  const declRow = (declarationsRes.data ?? null) as Record<string, unknown> | null;

  return {
    userId,
    medical: medicalRow
      ? {
          medicalDeclaration: s(medicalRow.medical_declaration),
          fitToWork: bOrNull(medicalRow.fit_to_work),
          hasMedicalIssues: bOrNull(medicalRow.has_medical_issues),
          allergies: s(medicalRow.allergies),
          medication: s(medicalRow.medication),
          medicalCertificateUrl: s(medicalRow.medical_certificate_url),
          medicalVerified: b(medicalRow.medical_verified),
          notes: s(medicalRow.notes),
        }
      : null,
    emergencyContact: {
      name: s(contactName),
      phone: s(contactPhone),
    },
    competencyCard: competencyRow
      ? {
          cardType: s(competencyRow.card_type),
          cardNumber: s(competencyRow.card_number),
          expiryDate: s(competencyRow.expiry),
          cardImageUrl: s(competencyRow.file_url),
        }
      : null,
    declarations: declRow
      ? {
          operativeDeclarationAccepted: b(declRow.operative_declaration_accepted),
          operativeSignatureUrl: s(declRow.operative_signature_url),
          supervisorDeclarationAccepted: b(declRow.supervisor_declaration_accepted),
          notes: s(declRow.notes),
        }
      : null,
  };
}

// --- Write ------------------------------------------------------------------

export type WriteMyInfoPatch = {
  medical?: Partial<MyInfoMedical>;
  emergencyContact?: Partial<MyInfoEmergencyContact>;
  competencyCard?: Partial<MyInfoCompetencyCard>;
  declarations?: Partial<MyInfoDeclarations>;
};

export type WriteMyInfoContext = {
  /** True when an admin is editing on behalf of the worker. Triggers an audit log entry. */
  editingOnBehalf: boolean;
  actorUserId: string | null;
  actorEmail: string | null;
};

export async function writeMyInfo(
  userId: string,
  patch: WriteMyInfoPatch,
  ctx: WriteMyInfoContext,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date().toISOString();

  // 1. Emergency contact -> user_profile_data (source of truth going forward).
  if (patch.emergencyContact) {
    const name = s(patch.emergencyContact.name);
    const phone = s(patch.emergencyContact.phone);

    const { data: existing } = await supabaseAdmin
      .from("user_profile_data")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from("user_profile_data")
        .update({
          emergency_contact_name: name,
          emergency_contact_phone: phone,
          updated_at: now,
        })
        .eq("id", existing.id);
      if (error) return { ok: false, error: `emergency contact update failed: ${error.message}` };
    } else {
      const { error } = await supabaseAdmin.from("user_profile_data").insert({
        user_id: userId,
        emergency_contact_name: name,
        emergency_contact_phone: phone,
        updated_at: now,
      });
      if (error) return { ok: false, error: `emergency contact insert failed: ${error.message}` };
    }
  }

  // 2. Medical -> pre_induction_medical (unchanged table).
  if (patch.medical) {
    const m = patch.medical;
    const payload: Record<string, unknown> = { updated_at: now };
    if (m.medicalDeclaration !== undefined) payload.medical_declaration = s(m.medicalDeclaration);
    if (m.fitToWork !== undefined) payload.fit_to_work = m.fitToWork == null ? null : b(m.fitToWork);
    if (m.hasMedicalIssues !== undefined)
      payload.has_medical_issues = m.hasMedicalIssues == null ? null : b(m.hasMedicalIssues);
    if (m.allergies !== undefined) payload.allergies = s(m.allergies);
    if (m.medication !== undefined) payload.medication = s(m.medication);
    if (m.medicalCertificateUrl !== undefined)
      payload.medical_certificate_url = s(m.medicalCertificateUrl);
    if (m.medicalVerified !== undefined) payload.medical_verified = b(m.medicalVerified);
    if (m.notes !== undefined) payload.notes = s(m.notes);

    const { error } = await supabaseAdmin
      .from("pre_induction_medical")
      .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
    if (error) return { ok: false, error: `medical upsert failed: ${error.message}` };
  }

  // 3. Competency card -> pre_induction_competency_card (unchanged table).
  //    Real column names: card_type, card_number, expiry, file_url.
  if (patch.competencyCard) {
    const c = patch.competencyCard;
    const payload: Record<string, unknown> = { updated_at: now };
    if (c.cardType !== undefined) payload.card_type = s(c.cardType);
    if (c.cardNumber !== undefined) payload.card_number = s(c.cardNumber);
    if (c.expiryDate !== undefined) payload.expiry = s(c.expiryDate);
    if (c.cardImageUrl !== undefined) payload.file_url = s(c.cardImageUrl);

    const { error } = await supabaseAdmin
      .from("pre_induction_competency_card")
      .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
    if (error) return { ok: false, error: `competency card upsert failed: ${error.message}` };
  }

  // 4. Declarations -> pre_induction_declarations (unchanged table).
  if (patch.declarations) {
    const d = patch.declarations;
    const payload: Record<string, unknown> = { updated_at: now };
    if (d.operativeDeclarationAccepted !== undefined)
      payload.operative_declaration_accepted = b(d.operativeDeclarationAccepted);
    if (d.operativeSignatureUrl !== undefined) payload.operative_signature_url = s(d.operativeSignatureUrl);
    if (d.supervisorDeclarationAccepted !== undefined)
      payload.supervisor_declaration_accepted = b(d.supervisorDeclarationAccepted);
    if (d.notes !== undefined) payload.notes = s(d.notes);

    const { error } = await supabaseAdmin
      .from("pre_induction_declarations")
      .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
    if (error) return { ok: false, error: `declarations upsert failed: ${error.message}` };
  }

  // Audit log: if an admin edited on behalf of the worker, record what changed.
  if (ctx.editingOnBehalf && ctx.actorUserId && ctx.actorUserId !== userId) {
    const sections = Object.keys(patch).filter((k) => patch[k as keyof WriteMyInfoPatch] != null);
    if (sections.length > 0) {
      try {
        await writeAuditLog({
          userId,
          action: "my_info_edited_on_behalf",
          timestamp: new Date(),
          actorId: ctx.actorUserId,
          actorEmail: ctx.actorEmail,
          metadata: { sections },
        });
      } catch (auditErr) {
        console.warn("[my-info] audit log write failed (non-fatal):", auditErr);
      }
    }
  }

  return { ok: true };
}
