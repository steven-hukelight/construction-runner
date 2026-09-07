import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkPreInductionAccess } from "@/app/api/pre-induction/[userId]/_utils/auth";

/**
 * POST /api/rams/acknowledge — Per-document acknowledgement (operative app).
 * Distinct from POST /api/rams/accept which marks site-level RAMS on pre_induction_training.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId?.trim();
    const ramsId = body.ramsId?.trim();
    const signatureUrl = body.signatureUrl?.trim() || null;

    if (!userId || !ramsId) {
      return NextResponse.json({ error: "userId and ramsId required" }, { status: 400 });
    }

    const access = await checkPreInductionAccess(userId, req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
    }

    const { data: ram } = await supabaseAdmin.from("rams").select("id").eq("id", ramsId).single();
    if (!ram) {
      return NextResponse.json({ error: "RAMS document not found" }, { status: 404 });
    }

    await supabaseAdmin.from("rams_acknowledgements").upsert(
      {
        user_id: userId,
        rams_id: ramsId,
        acknowledged_at: new Date().toISOString(),
        signature_url: signatureUrl,
      },
      { onConflict: "user_id,rams_id" }
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/rams/acknowledge:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
