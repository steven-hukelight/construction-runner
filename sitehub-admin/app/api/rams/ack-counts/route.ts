import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireHsDocumentAdmin } from "@/lib/documentRemindAuth";
import { assignedActiveUsersBySite } from "@/lib/hsDocumentAudience";
import { latestReminderByDocument } from "@/lib/documentReminders";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireHsDocumentAdmin(req);
    if (!auth.ok) return auth.response;

    const { data: rams, error: ramsErr } = await supabaseAdmin
      .from("rams")
      .select("id, site_id, site_wide")
      .eq("company_id", auth.companyId);
    if (ramsErr) throw ramsErr;
    const rows = rams ?? [];
    const ids = rows.map((r) => String(r.id)).filter(Boolean);
    if (!ids.length) {
      return NextResponse.json({ counts: {}, totals: {}, outstanding: {}, lastReminded: {} });
    }

    const [{ data: ackRows, error: ackErr }, audience, lastReminded] = await Promise.all([
      supabaseAdmin.rpc("rams_ack_counts", { p_company_id: auth.companyId }),
      assignedActiveUsersBySite(auth.companyId),
      latestReminderByDocument("rams", ids, auth.companyId),
    ]);
    if (ackErr) throw ackErr;

    const counts: Record<string, number> = {};
    for (const id of ids) counts[id] = 0;
    for (const row of (ackRows ?? []) as { rams_id: string; ack_count: number }[]) {
      if (row.rams_id in counts) counts[row.rams_id] = Number(row.ack_count);
    }

    const totals: Record<string, number> = {};
    const outstanding: Record<string, number> = {};
    for (const ram of rows) {
      const id = String(ram.id);
      const total =
        ram.site_wide || !ram.site_id
          ? audience.all.size
          : (audience.bySite.get(String(ram.site_id))?.size ?? 0);
      totals[id] = total;
      outstanding[id] = Math.max(0, total - (counts[id] ?? 0));
    }

    return NextResponse.json({ counts, totals, outstanding, lastReminded });
  } catch (e) {
    console.error("GET /api/rams/ack-counts:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
