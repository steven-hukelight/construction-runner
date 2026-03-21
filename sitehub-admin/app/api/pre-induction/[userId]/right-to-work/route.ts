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
    const access = await checkPreInductionAccess(userId, req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
    }

    const body = await req.json();
    const authUid = (await cookies()).get("uid")?.value;

    // Accept both camelCase (web) and snake_case (mobile)
    const payload: Record<string, unknown> = {
      passport_url: body.passportUrl ?? body.passport_url ?? null,
      passport_expiry: (body.passportExpiry ?? body.passport_expiry) ? toIso(String(body.passportExpiry ?? body.passport_expiry)) : null,
      visa_url: body.visaUrl ?? body.visa_url ?? null,
      visa_expiry: (body.visaExpiry ?? body.visa_expiry) ? toIso(String(body.visaExpiry ?? body.visa_expiry)) : null,
      share_code: body.shareCode ?? body.share_code ?? null,
      proof_of_address_url: body.proofOfAddressUrl ?? body.proof_of_address_url ?? null,
      right_to_work_verified: !!(body.rightToWorkVerified ?? body.right_to_work_verified),
      notes: body.notes ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin
      .from("pre_induction_right_to_work")
      .upsert({ user_id: userId, ...payload }, { onConflict: "user_id" });
    if (upsertErr) {
      console.error("right-to-work upsert failed:", upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
    await updatePreInductionStatus(userId);

    if (body.rightToWorkVerified) {
      const actorId = authUid ?? "unknown";
      const actorEmail = (await cookies()).get("user_email")?.value ?? null;
      await writeAuditLog({
        userId,
        action: "verification_right_to_work",
        timestamp: new Date(),
        actorId,
        actorEmail,
        metadata: { verified: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST pre-induction right-to-work:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
