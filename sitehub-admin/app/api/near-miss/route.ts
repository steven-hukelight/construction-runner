import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await resolveMobileApiAuth(req);
    const companyId = auth.companyId ?? undefined;

    const unreviewedOnly = url.searchParams.get("unreviewed") === "true";
    const countOnly = url.searchParams.get("count") === "unreviewed";
    const mineOnly = url.searchParams.get("mine") === "true";
    const uid = auth.uid;
    const roleLower = (auth.role ?? "").toLowerCase();
    const canViewCompanyNearMiss =
      roleLower === "supervisor" || roleLower === "admin" || roleLower === "superuser";
    // Operatives always see only their own reports. Supervisors/admins may list company-wide
    // unless they pass mine=true (self-only).
    const filterToReporterOnly = !canViewCompanyNearMiss || mineOnly;
    const status = url.searchParams.get("status")?.trim().toLowerCase();
    const siteId = url.searchParams.get("siteId")?.trim();
    const search = url.searchParams.get("search")?.trim().toLowerCase();
    const sort = url.searchParams.get("sort") || "newest";

    if (countOnly && companyId) {
      let countQuery = supabaseAdmin
        .from("near_miss_reports")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      countQuery = countQuery.is("reviewed_at", null);
      if (siteId) countQuery = countQuery.eq("site_id", siteId);
      const { count, error } = await countQuery;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ count: count ?? 0 });
    }

    const limit = Math.min(Number(url.searchParams.get("limit")) || 500, 500);
    let query = supabaseAdmin
      .from("near_miss_reports")
      .select("*")
      .limit(limit);
    if (companyId) query = query.eq("company_id", companyId);
    if (unreviewedOnly) query = query.is("reviewed_at", null);
    if (filterToReporterOnly && uid) query = query.eq("reported_by", uid);
    if (siteId) query = query.eq("site_id", siteId);
    if (status) {
      if (status === "reviewed") {
        query = query.not("reviewed_at", "is", null);
      } else if (status === "pending") {
        query = query.is("reviewed_at", null);
      } else {
        query = query.eq("status", status);
      }
    }
    query = query.order(
      sort === "site" ? "site_id" : sort === "status" ? "status" : "created_at",
      { ascending: sort === "site" || sort === "status" },
    );

    const { data } = await query;
    const reports = data ?? [];
    const siteIds = [...new Set(reports.map((r: { site_id?: string }) => r.site_id).filter(Boolean))];
    const siteMap = new Map<string, string>();
    if (siteIds.length > 0) {
      const { data: sites } = await supabaseAdmin.from("sites").select("id, name").in("id", siteIds);
      for (const s of sites ?? []) {
        siteMap.set((s as { id: string }).id, (s as { name?: string }).name ?? "");
      }
    }
    let rows: Array<Record<string, unknown> & {
      site_name: string | null;
      attachment_count: number;
    }> = reports.map((d: Record<string, unknown>) => ({
      ...d,
      site_name: d.site_id ? siteMap.get(String(d.site_id)) ?? null : null,
      attachment_count: Array.isArray(d.attachments) ? d.attachments.length : 0,
    }));
    if (search) {
      rows = rows.filter((row) => {
        const haystack = [
          row.description,
          row.status,
          row.site_name,
          row.site_id,
        ]
          .map((value) => String(value ?? "").toLowerCase())
          .join(" ");
        return haystack.includes(search);
      });
    }
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (e) {
    console.error("GET /api/near-miss:", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const auth = await resolveMobileApiAuth(req);
  const companyId = auth.companyId ?? undefined;
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { description, status, siteId, operativeId, reportedBy, attachments } = body;
  const { data, error } = await supabaseAdmin
    .from("near_miss_reports")
    .insert({
      description: description ?? "",
      status: status ?? "pending",
      company_id: companyId,
      site_id: siteId ?? null,
      reported_by: reportedBy ?? operativeId ?? null,
      attachments: Array.isArray(attachments) ? attachments : [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("POST /api/near-miss failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id });
}
