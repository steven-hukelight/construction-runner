import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { latestReminderByDocument } from "@/lib/documentReminders";

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

    const { data: briefings } = await supabaseAdmin
      .from("briefings")
      .select("id, site_id")
      .eq("company_id", companyId);
    const ids = (briefings ?? []).map((b) => b.id).filter(Boolean);
    if (!ids.length) {
      return NextResponse.json({ counts: {}, totals: {}, outstanding: {}, lastReminded: {} });
    }

    const { data: acks } = await supabaseAdmin.from("briefing_acknowledgements").select("briefing_id").in("briefing_id", ids);

    const counts: Record<string, number> = {};
    for (const id of ids) counts[id] = 0;
    for (const a of acks ?? []) {
      const bid = a.briefing_id as string;
      if (bid) counts[bid] = (counts[bid] ?? 0) + 1;
    }

    const { data: companySites } = await supabaseAdmin.from("sites").select("id").eq("company_id", companyId);
    const companySiteIds = (companySites ?? []).map((s) => String(s.id)).filter(Boolean);
    const totals: Record<string, number> = {};
    for (const id of ids) totals[id] = 0;

    if (companySiteIds.length > 0) {
      const { data: assigned } = await supabaseAdmin
        .from("assigned_operatives")
        .select("user_id, site_id")
        .in("site_id", companySiteIds);
      const { data: companyUsers } = await supabaseAdmin
        .from("users")
        .select("id, status")
        .eq("company_id", companyId);
      const activeIds = new Set(
        (companyUsers ?? [])
          .filter((u) => {
            const s = String((u as { status?: string }).status ?? "").toLowerCase();
            return s !== "inactive" && s !== "disabled" && s !== "rejected";
          })
          .map((u) => String((u as { id: string }).id))
      );
      const bySite = new Map<string, Set<string>>();
      const allAssigned = new Set<string>();
      for (const row of assigned ?? []) {
        const uid = String((row as { user_id?: string }).user_id ?? "");
        const sid = String((row as { site_id?: string }).site_id ?? "");
        if (!uid || !activeIds.has(uid) || !sid) continue;
        allAssigned.add(uid);
        const set = bySite.get(sid) ?? new Set<string>();
        set.add(uid);
        bySite.set(sid, set);
      }
      for (const briefing of briefings ?? []) {
        const bid = String((briefing as { id?: string }).id ?? "");
        if (!bid) continue;
        const sid = String((briefing as { site_id?: string | null }).site_id ?? "").trim();
        totals[bid] = sid ? (bySite.get(sid)?.size ?? 0) : allAssigned.size;
      }
    }

    const outstanding: Record<string, number> = {};
    for (const id of ids) {
      outstanding[id] = Math.max(0, (totals[id] ?? 0) - (counts[id] ?? 0));
    }
    const lastReminded = await latestReminderByDocument("briefing", ids, companyId);

    return NextResponse.json({ counts, totals, outstanding, lastReminded });
  } catch (e) {
    console.error("GET /api/briefings/ack-counts:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
