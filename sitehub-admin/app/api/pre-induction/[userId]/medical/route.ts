import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { checkPreInductionAccess } from "../_utils/auth";
import { updatePreInductionStatus } from "../_utils/status";
import { writeAuditLog } from "@/lib/auditLog";

function toIso(val: string | null): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const access = await checkPreInductionAccess(userId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
    }

    const body = await req.json();
    const authUid = (await cookies()).get("uid")?.value;

    // Accept both camelCase (web) and snake_case (mobile)
    const payload: Record<string, unknown> = {
      medical_declaration: body.medicalDeclaration ?? body.medical_declaration ?? null,
      fit_to_work: body.fitToWork ?? body.fit_to_work ?? null,
      allergies: body.allergies ?? null,
      medication: body.medication ?? null,
      medical_certificate_url: body.medicalCertificateUrl ?? body.medical_certificate_url ?? null,
      medical_verified: !!(body.medicalVerified ?? body.medical_verified),
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
