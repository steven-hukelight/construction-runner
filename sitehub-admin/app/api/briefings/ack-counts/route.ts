import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { latestReminderByDocument } from "@/lib/documentReminders";
import { assignedActiveUsersBySite } from "@/lib/hsDocumentAudience";

export const dynamic = "force-dynamic";

/** GET — { counts: { [briefingId]: number } } for the current company. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    }

    if (role !== "superuser" && role !== "admin" && role !== "supervisor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (role === "superuser") companyId = searchParams.get("companyId") || companyId || undefined;
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { data: briefings, error: briefingsErr } = await supabaseAdmin
      .from("briefings")
      .select("id, site_id")
      .eq("company_id", companyId);
    if (briefingsErr) throw briefingsErr;
    const ids = (briefings ?? []).map((b) => String(b.id)).filter(Boolean);
    if (!ids.length) {
      return NextResponse.json({ counts: {}, totals: {}, outstanding: {}, lastReminded: {} });
    }

    const [{ data: ackRows, error: ackErr }, audience, lastReminded] = await Promise.all([
      supabaseAdmin.rpc("briefing_ack_counts", { p_company_id: companyId }),
      assignedActiveUsersBySite(companyId),
      latestReminderByDocument("briefing", ids, companyId),
    ]);
    if (ackErr) throw ackErr;

    const counts: Record<string, number> = {};
    for (const id of ids) counts[id] = 0;
    for (const row of (ackRows ?? []) as { briefing_id: string; ack_count: number }[]) {
      if (row.briefing_id in counts) counts[row.briefing_id] = Number(row.ack_count);
    }

    const totals: Record<string, number> = {};
    const outstanding: Record<string, number> = {};
    for (const briefing of briefings ?? []) {
      const bid = String(briefing.id);
      const sid = String((briefing as { site_id?: string | null }).site_id ?? "").trim();
      totals[bid] = sid ? (audience.bySite.get(sid)?.size ?? 0) : audience.all.size;
      outstanding[bid] = Math.max(0, totals[bid] - (counts[bid] ?? 0));
    }

    return NextResponse.json({ counts, totals, outstanding, lastReminded });
  } catch (e) {
    console.error("GET /api/briefings/ack-counts:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
