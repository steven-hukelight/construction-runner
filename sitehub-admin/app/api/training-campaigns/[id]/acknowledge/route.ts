import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** One acknowledgement per person per campaign card. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const companyId = (auth.companyId ?? "").trim();
    if (!auth.uid || !companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { data: campaign } = await supabaseAdmin
      .from("training_campaigns")
      .select("id, company_id")
      .eq("id", id)
      .maybeSingle();
    if (!campaign || campaign.company_id !== companyId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { error } = await supabaseAdmin
      .from("training_campaign_acks")
      .upsert({ campaign_id: id, user_id: auth.uid }, { onConflict: "campaign_id,user_id", ignoreDuplicates: true });
    if (error) {
      console.error("POST /api/training-campaigns/[id]/acknowledge:", error);
      return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/training-campaigns/[id]/acknowledge:", e);
    return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
  }
}
