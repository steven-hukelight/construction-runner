import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireHsDocumentAdmin } from "@/lib/documentRemindAuth";
import { assignedActiveUserIds } from "@/lib/hsDocumentAudience";
import { latestReminderByDocument } from "@/lib/documentReminders";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireHsDocumentAdmin(req);
    if (!auth.ok) return auth.response;

    const { data: rams } = await supabaseAdmin
      .from("rams")
      .select("id, site_id, site_wide")
      .eq("company_id", auth.companyId);
    const rows = rams ?? [];
    const ids = rows.map((r) => String(r.id)).filter(Boolean);
    if (!ids.length) {
      return NextResponse.json({ counts: {}, totals: {}, outstanding: {}, lastReminded: {} });
    }

    const { data: acks } = await supabaseAdmin.from("rams_acknowledgements").select("rams_id").in("rams_id", ids);
    const counts: Record<string, number> = {};
    for (const id of ids) counts[id] = 0;
    for (const a of acks ?? []) {
      const rid = String((a as { rams_id?: string }).rams_id ?? "");
      if (rid) counts[rid] = (counts[rid] ?? 0) + 1;
    }

    const siteWideIds = await assignedActiveUserIds(auth.companyId, null);
    const bySite = new Map<string, string[]>();
    const uniqueSiteIds = [
      ...new Set(
        rows
          .filter((r) => !r.site_wide && r.site_id)
          .map((r) => String(r.site_id))
      ),
    ];
    await Promise.all(
      uniqueSiteIds.map(async (sid) => {
        bySite.set(sid, await assignedActiveUserIds(auth.companyId, sid));
      })
    );

    const totals: Record<string, number> = {};
    const outstanding: Record<string, number> = {};
    for (const ram of rows) {
      const id = String(ram.id);
      const total =
        ram.site_wide || !ram.site_id
          ? siteWideIds.length
          : (bySite.get(String(ram.site_id))?.length ?? 0);
      totals[id] = total;
      outstanding[id] = Math.max(0, total - (counts[id] ?? 0));
    }

    const lastReminded = await latestReminderByDocument("rams", ids, auth.companyId);
    return NextResponse.json({ counts, totals, outstanding, lastReminded });
  } catch (e) {
    console.error("GET /api/rams/ack-counts:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
