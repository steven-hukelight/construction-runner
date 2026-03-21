import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";
import { checkPreInductionAccess } from "../_utils/auth";
import { updatePreInductionStatus } from "../_utils/status";

function toTimestamp(val: string | null): Date | string | null {
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

    const certs = Array.isArray(body.certifications) ? body.certifications : [];
    const certifications = certs.map((c: Record<string, unknown>) => ({
      type: c.type ?? "Other",
      cardNumber: c.cardNumber ?? null,
      fileUrl: c.fileUrl ?? null,
      expiry: c.expiry ? toTimestamp(c.expiry as string) : null,
      verified: !!c.verified,
      verifiedBy: c.verified ? authUid ?? null : null,
      verifiedAt: c.verified ? new Date().toISOString() : null,
      notes: c.notes ?? null,
    }));

    const { error: upsertErr } = await supabaseAdmin
      .from("pre_induction_certifications")
      .upsert(
        {
          user_id: userId,
          certifications,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (upsertErr) {
      console.error("certifications upsert failed:", upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
    await updatePreInductionStatus(userId);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST pre-induction certifications:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
