import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { checkPreInductionAccess } from "../_utils/auth";
import { updatePreInductionStatus } from "../_utils/status";
import { writeAuditLog } from "@/lib/auditLog";

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const access = await checkPreInductionAccess(userId, req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
    }

    const body = await req.json();
    const authUid = (await cookies()).get("uid")?.value;

    // Normalize boolean-ish values (mobile may send "true"/"false" as strings)
    const toBool = (v: unknown): boolean => v === true || v === "true" || v === "1" || v === "yes";
    const fitVal = body.fitToWork ?? body.fit_to_work;
    const hasMedicalIssuesVal = body.hasMedicalIssues ?? body.has_medical_issues;
    const medicalVerifiedVal = body.medicalVerified ?? body.medical_verified;

    // Accept both camelCase (web) and snake_case (mobile)
    const payload: Record<string, unknown> = {
      medical_declaration: body.medicalDeclaration ?? body.medical_declaration ?? null,
      fit_to_work: fitVal == null ? null : toBool(fitVal),
      has_medical_issues: hasMedicalIssuesVal == null ? null : toBool(hasMedicalIssuesVal),
      allergies: body.allergies ?? null,
      medication: body.medication ?? null,
      medical_certificate_url: body.medicalCertificateUrl ?? body.medical_certificate_url ?? null,
      medical_verified: toBool(medicalVerifiedVal),
      notes: body.notes ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin.from("pre_induction_medical").upsert(
      { user_id: userId, ...payload },
      { onConflict: "user_id" }
    );
    if (upsertErr) {
      console.error("medical upsert failed:", upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
    await updatePreInductionStatus(userId);

    if (body.medicalVerified) {
      const cookieStore = await cookies();
      await writeAuditLog({
        userId,
        action: "verification_medical",
        timestamp: new Date(),
        actorId: authUid ?? "unknown",
        actorEmail: cookieStore.get("user_email")?.value ?? null,
        metadata: { verified: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST pre-induction medical:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
