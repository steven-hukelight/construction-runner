import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireHsDocumentAdmin } from "@/lib/documentRemindAuth";
import { sendDocumentReminders } from "@/lib/documentReminders";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: briefingId } = await params;
    const auth = await requireHsDocumentAdmin(req);
    if (!auth.ok) return auth.response;

    const { data: briefing, error } = await supabaseAdmin
      .from("briefings")
      .select("id, title, company_id, site_id")
      .eq("id", briefingId)
      .maybeSingle();
    if (error || !briefing) {
      return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
    }
    if (String(briefing.company_id ?? "") !== auth.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: acks } = await supabaseAdmin
      .from("briefing_acknowledgements")
      .select("user_id")
      .eq("briefing_id", briefingId);

    const result = await sendDocumentReminders({
      kind: "briefing",
      documentId: briefingId,
      companyId: auth.companyId,
      siteId: briefing.site_id ? String(briefing.site_id) : null,
      title: String(briefing.title ?? ""),
      acknowledgedUserIds: (acks ?? []).map((a) => String(a.user_id ?? "")),
      requireInduction: true,
      actorId: auth.actorId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("POST /api/briefings/[id]/remind:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
