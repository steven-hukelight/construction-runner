import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkPreInductionAccess } from "@/app/api/pre-induction/[userId]/_utils/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId?.trim();
    const briefingId = body.briefingId?.trim();
    const signatureUrl = body.signatureUrl?.trim() || null;

    if (!userId || !briefingId) {
      return NextResponse.json(
        { error: "userId and briefingId required" },
        { status: 400 }
      );
    }

    const access = await checkPreInductionAccess(userId, req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
    }

    const { data: briefing } = await supabaseAdmin.from("briefings").select("id").eq("id", briefingId).single();
    if (!briefing) {
      return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
    }

    await supabaseAdmin.from("briefing_acknowledgements").upsert(
      {
        user_id: userId,
        briefing_id: briefingId,
        acknowledged_at: new Date().toISOString(),
        signature_url: signatureUrl,
      },
      { onConflict: "user_id,briefing_id" }
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/briefings/accept:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
