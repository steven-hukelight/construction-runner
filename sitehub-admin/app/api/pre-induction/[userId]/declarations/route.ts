import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkPreInductionAccess } from "../_utils/auth";
import { updatePreInductionStatus } from "../_utils/status";

function toIso(val: string | null): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toBoolean(val: unknown): boolean {
  if (val === true) return true;
  if (typeof val === "string") return ["true", "t", "1", "yes", "y"].includes(val.trim().toLowerCase());
  return false;
}

function strVal(obj: Record<string, unknown> | null, ...keys: string[]): string {
  if (!obj) return "";
  const data = (obj.data as Record<string, unknown>) ?? {};
  for (const k of keys) {
    const v = obj[k] ?? data[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

async function checkRequiredSections(userId: string): Promise<{ allOk: boolean; missing: string[] }> {
  const [personalRes, rtwRes, ccRes, medRes] = await Promise.all([
    supabaseAdmin.from("pre_induction_personal").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("pre_induction_right_to_work").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("pre_induction_competency_card").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("pre_induction_medical").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  const personal = personalRes.data as Record<string, unknown> | null;
  const rtw = rtwRes.data as Record<string, unknown> | null;
  const cc = ccRes.data as Record<string, unknown> | null;
  const med = medRes.data as Record<string, unknown> | null;

  const missing: string[] = [];

  const personalName = strVal(personal, "full_name", "fullName");
  const personalEmail = strVal(personal, "email");
  const personalOk = !!(personal && (personalName || personalEmail));
  if (!personalOk) missing.push("Personal (name or email required)");

  const rtwPassport = strVal(rtw, "passport_url", "passportUrl");
  const rtwVisa = strVal(rtw, "visa_url", "visaUrl");
  const rtwProof = strVal(rtw, "proof_of_address_url", "proofOfAddressUrl");
  const rtwHasId = !!(rtwPassport || rtwVisa);
  const rtwHasProof = !!rtwProof;
  const rtwVerified = toBoolean(rtw?.right_to_work_verified ?? rtw?.rightToWorkVerified);
  const rtwOk = !!(rtw && (rtwVerified || (rtwHasId && rtwHasProof)));
  if (!rtwOk) missing.push("Right to Work (passport or visa + proof of address, or admin verification)");

  const ccFile = strVal(cc, "file_url", "fileUrl");
  const ccNum = strVal(cc, "card_number", "cardNumber");
  const ccOk = !!(cc && ccFile && ccNum);
  if (!ccOk) missing.push("Competency Card (document upload + card number)");

  const medFitToWork = med?.fit_to_work ?? med?.fitToWork;
  const medHasFitToWork = medFitToWork === true || String(medFitToWork ?? "").toLowerCase() === "true";
  const medCert = strVal(med, "medical_certificate_url", "medicalCertificateUrl");
  const medVerified = toBoolean(med?.medical_verified ?? med?.medicalVerified);
  const medHasIssues = med?.has_medical_issues ?? med?.hasMedicalIssues;
  const medNoIssues = medHasIssues === false || medHasFitToWork;
  const medOk = !!(med && (medVerified || medNoIssues || !!medCert));
  if (!medOk) missing.push("Medical (fit to work declaration, certificate, or admin verification)");

  return { allOk: missing.length === 0, missing };
}

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const access = await checkPreInductionAccess(userId, req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
    }

    const body = await req.json();
    const operativeAccepted = !!body.operativeDeclarationAccepted;

    if (operativeAccepted) {
      const { allOk, missing } = await checkRequiredSections(userId);
      if (!allOk) {
        const msg = missing.length > 0
          ? `Complete these sections first: ${missing.join("; ")}.`
          : "Complete Personal, Right to Work (passport or visa + proof of address), Competency Card (document + card number), and Medical sections before accepting the declaration.";
        return NextResponse.json({ error: msg, missing }, { status: 400 });
      }
    }

    const payload: Record<string, unknown> = {
      operative_declaration_accepted: operativeAccepted,
      operative_declaration_accepted_at: body.operativeDeclarationAccepted
        ? (toIso(body.operativeDeclarationAcceptedAt) ?? new Date().toISOString())
        : null,
      operative_signature_url: body.operativeSignatureUrl ?? null,
      supervisor_declaration_accepted: !!body.supervisorDeclarationAccepted,
      supervisor_declaration_accepted_at: body.supervisorDeclarationAccepted
        ? (toIso(body.supervisorDeclarationAcceptedAt) ?? new Date().toISOString())
        : null,
      notes: body.notes ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin
      .from("pre_induction_declarations")
      .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
    if (upsertErr) {
      console.error("declarations upsert failed:", upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
    await updatePreInductionStatus(userId);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST pre-induction declarations:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
