import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
const EXPIRY_DAYS = 365;

function cid(x: { company_id?: string | null; main_contractor_id?: string | null }): string | null {
  return (x.main_contractor_id ?? x.company_id ?? null) as string | null;
}

type InductionRow = { user_id: string; site_id: string; status: string | null; completed_at: string | null };

const PAGE_SIZE = 1000;

/** All inductions for the given sites, keyed by `userId:siteId`. Paged because PostgREST caps rows per request. */
async function loadInductions(siteIds: string[]): Promise<Map<string, InductionRow>> {
  const out = new Map<string, InductionRow>();
  if (!siteIds.length) return out;
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("user_site_inductions")
      .select("user_id, site_id, status, completed_at")
      .in("site_id", siteIds)
      .order("user_id")
      .order("site_id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of (data ?? []) as InductionRow[]) out.set(`${row.user_id}:${row.site_id}`, row);
    if (!data || data.length < PAGE_SIZE) return out;
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const authCompanyId = cookieStore.get("companyId")?.value;
    if (!authCompanyId && role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const filterCompanyId = (body.companyId ?? body.company_id ?? null) as string | null;
    const companyId = role === "superuser"
      ? (filterCompanyId ?? authCompanyId ?? "")
      : (authCompanyId ?? "");
    if (!companyId) return NextResponse.json({ error: "companyId or filterCompanyId required for export scope" }, { status: 400 });

    const filterSiteId = (body.siteId ?? body.site_id ?? null) as string | null;
    const filterStatus = (body.status ?? null) as string | null;

    let sites: { id: string; name?: string; company_id?: string }[] = [];
    if (filterSiteId) {
      const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", filterSiteId).maybeSingle();
      if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
      if (companyId && cid(site) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      sites = [site];
    } else {
      const { data } = await supabaseAdmin.from("sites").select("id, name, company_id").eq("company_id", companyId);
      sites = data ?? [];
    }

    const { data: userRows } = await supabaseAdmin
      .from("users")
      .select("id, display_name, email, company_id")
      .eq("company_id", filterCompanyId || companyId);
    const userDocs = filterCompanyId ? (userRows ?? []).filter((u) => u.company_id === filterCompanyId) : (userRows ?? []);

    const companyIds = [...new Set(userDocs.map((u) => u.company_id).filter(Boolean))];
    const { data: companies } = companyIds.length ? await supabaseAdmin.from("companies").select("id, name").in("id", companyIds) : { data: [] };
    const companyNames = Object.fromEntries((companies ?? []).map((c) => [c.id, c.name ?? c.id]));

    const inductions = await loadInductions(sites.map((s) => s.id));

    const now = new Date();
    const rows: string[][] = [["userName", "userCompany", "siteName", "status", "completedAt"]];

    for (const user of userDocs) {
      const uid = user.id;
      const userName = (user.display_name ?? user.email ?? uid) as string;
      const userCompanyId = user.company_id ?? "";
      const userCompany = companyNames[userCompanyId] ?? userCompanyId;

      for (const site of sites) {
        const siteId = site.id;
        const siteName = site.name ?? siteId;

        const ind = inductions.get(`${uid}:${siteId}`);

        let status = "not_started";
        let completedAt = "";
        if (ind) {
          const completed = ind.completed_at ? new Date(ind.completed_at) : null;
          const statusVal = (ind.status ?? "completed") as string;
          const isExpired = completed && now.getTime() - completed.getTime() > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
          status = isExpired ? "expired" : statusVal === "completed" ? "completed" : "not_started";
          completedAt = completed ? completed.toISOString() : "";
        }
        if (filterStatus && status !== filterStatus) continue;
        rows.push([userName, userCompany, siteName, status, completedAt]);
      }
    }

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="induction-compliance-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/induction/export failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
