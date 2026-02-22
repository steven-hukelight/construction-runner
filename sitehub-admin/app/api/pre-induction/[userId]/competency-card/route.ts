import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkPreInductionAccess } from "../_utils/auth";
import { updatePreInductionStatus } from "../_utils/status";

function toTimestamp(val: string | null): string | null {
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
    const payload = {
      user_id: userId,
      card_type: body.cardType ?? "CSCS",
      card_number: body.cardNumber ?? "",
      expiry: body.expiry ? toTimestamp(body.expiry as string) : null,
      file_url: body.fileUrl ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin
      .from("pre_induction_competency_card")
      .upsert(payload, { onConflict: "user_id" });
    if (upsertErr) {
      console.error("competency-card upsert failed:", upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }
    await updatePreInductionStatus(userId);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST pre-induction competency-card:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
