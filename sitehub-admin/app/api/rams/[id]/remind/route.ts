import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireHsDocumentAdmin } from "@/lib/documentRemindAuth";
import { sendDocumentReminders } from "@/lib/documentReminders";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: ramsId } = await params;
    const auth = await requireHsDocumentAdmin(req);
    if (!auth.ok) return auth.response;

    const { data: ram, error } = await supabaseAdmin
      .from("rams")
      .select("id, title, company_id, site_id, site_wide, status")
      .eq("id", ramsId)
      .maybeSingle();
    if (error || !ram) {
      return NextResponse.json({ error: "RAMS not found" }, { status: 404 });
    }
    if (String(ram.company_id ?? "") !== auth.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (String(ram.status ?? "").toUpperCase() === "REJECTED") {
      return NextResponse.json({ error: "Rejected RAMS cannot be reminded" }, { status: 400 });
    }

    const { data: acks } = await supabaseAdmin
      .from("rams_acknowledgements")
      .select("user_id")
      .eq("rams_id", ramsId);

    const siteWide = Boolean((ram as { site_wide?: boolean }).site_wide);
    const siteId = siteWide ? null : ram.site_id ? String(ram.site_id) : null;

    const result = await sendDocumentReminders({
      kind: "rams",
      documentId: ramsId,
      companyId: auth.companyId,
      siteId,
      title: String(ram.title ?? ""),
      acknowledgedUserIds: (acks ?? []).map((a) => String(a.user_id ?? "")),
      requireInduction: false,
      actorId: auth.actorId,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("POST /api/rams/[id]/remind:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
