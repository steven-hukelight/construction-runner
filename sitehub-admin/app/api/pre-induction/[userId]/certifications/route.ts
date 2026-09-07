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

    const rawList =
      (Array.isArray(body.certifications) && body.certifications) ||
      (Array.isArray(body.certificationRecords) && body.certificationRecords) ||
      (Array.isArray(body.certification_records) && body.certification_records) ||
      [];
    const certs = rawList as Record<string, unknown>[];
    const certifications = certs.map((c: Record<string, unknown>) => {
      const expRaw = c.expiry ?? c.expiry_date;
      return {
        type: (typeof c.type === "string" ? c.type : null) ?? "Other",
        cardNumber: c.cardNumber ?? c.card_number ?? null,
        fileUrl: c.fileUrl ?? c.file_url ?? null,
        expiry: expRaw ? toTimestamp(String(expRaw)) : null,
        verified: !!c.verified,
        verifiedBy: c.verified
          ? ((c.verifiedBy ?? c.verified_by) as string | null) ?? authUid ?? null
          : null,
        verifiedAt: c.verified
          ? ((c.verifiedAt ?? c.verified_at) as string | null) ?? new Date().toISOString()
          : null,
        notes: c.notes ?? null,
      };
    });

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
