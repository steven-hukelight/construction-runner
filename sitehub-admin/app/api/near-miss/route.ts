import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import {
  assertWritableSiteId,
  dashboardSiteScope,
  getRestrictedSiteIds,
  isMobileClientRequest,
  siteIdsForFilter,
} from "@/lib/auth/siteScope";
import { authorizeNearMissViewer } from "@/lib/auth/nearMissAccess";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const access = await authorizeNearMissViewer(req);
    if (!access.ok) return access.response;
    const auth = access.viewer;
    const companyId = auth.companyId ?? undefined;

    const unreviewedOnly = url.searchParams.get("unreviewed") === "true";
    const countOnly = url.searchParams.get("count") === "unreviewed";
    // Viewers list company-wide unless they pass mine=true (self-only).
    const filterToReporterOnly = url.searchParams.get("mine") === "true";
    const uid = auth.uid;
    const status = url.searchParams.get("status")?.trim().toLowerCase();
    const siteId = url.searchParams.get("siteId")?.trim();
    const search = url.searchParams.get("search")?.trim().toLowerCase();
    const sort = url.searchParams.get("sort") || "newest";
    const siteScope = isMobileClientRequest(req)
      ? siteIdsForFilter(await getRestrictedSiteIds(auth.role, auth.uid), siteId)
      : await dashboardSiteScope(auth.role, siteId, auth.uid);

    if (countOnly) {
      let countQuery = supabaseAdmin
        .from("near_miss_reports")
        .select("id", { count: "exact", head: true })
        .is("reviewed_at", null);
      if (companyId) countQuery = countQuery.eq("company_id", companyId);
      if (siteScope === "none") return NextResponse.json({ count: 0 });
      if (siteScope !== "all") countQuery = countQuery.in("site_id", siteScope);
      if (filterToReporterOnly) countQuery = countQuery.eq("reported_by", uid);
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
    if (siteScope === "none") return NextResponse.json([]);
    if (siteScope !== "all") query = query.in("site_id", siteScope);
    if (unreviewedOnly) query = query.is("reviewed_at", null);
    if (filterToReporterOnly) query = query.eq("reported_by", uid);
    if (status) {
      if (status === "reviewed") {
        query = query.not("reviewed_at", "is", null);
      } else if (status === "pending") {
        query = query.is("reviewed_at", null);
      } else {
        query = query.eq("status", status);
      }
    }
    if (search) {
      // Characters that would break PostgREST's or() syntax or act as wildcards.
      const term = search.replace(/[,()*%\\:"]/g, " ").trim();
      if (term) {
        let siteMatch = supabaseAdmin.from("sites").select("id").ilike("name", `%${term}%`).limit(200);
        if (companyId) siteMatch = siteMatch.eq("company_id", companyId);
        const { data: matchedSites, error: siteErr } = await siteMatch;
        if (siteErr) throw siteErr;
        const ids = (matchedSites ?? []).map((s) => String((s as { id: string }).id));
        const clauses = [`description.ilike.*${term}*`, `status.ilike.*${term}*`, `site_id.ilike.*${term}*`];
        if (ids.length) clauses.push(`site_id.in.(${ids.join(",")})`);
        query = query.or(clauses.join(","));
      }
    }
    query = query.order(
      sort === "site" ? "site_id" : sort === "status" ? "status" : "created_at",
      { ascending: sort === "site" || sort === "status" },
    );

    const { data, error } = await query;
    if (error) throw error;
    const reports = data ?? [];
    const siteIds = [...new Set(reports.map((r: { site_id?: string }) => r.site_id).filter(Boolean))];
    const siteMap = new Map<string, string>();
    if (siteIds.length > 0) {
      const { data: sites } = await supabaseAdmin.from("sites").select("id, name").in("id", siteIds);
      for (const s of sites ?? []) {
        siteMap.set((s as { id: string }).id, (s as { name?: string }).name ?? "");
      }
    }
    const rows = reports.map((d: Record<string, unknown>) => ({
      ...d,
      site_name: d.site_id ? siteMap.get(String(d.site_id)) ?? null : null,
      attachment_count: Array.isArray(d.attachments) ? d.attachments.length : 0,
    }));
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
  if (auth instanceof NextResponse) return auth;
  const companyId = auth.companyId ?? undefined;
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { description, status, siteId, operativeId, reportedBy, attachments } = body;
  const siteForbid = await assertWritableSiteId(auth.role, siteId, auth.uid);
  if (siteForbid) return siteForbid;
  const { data, error } = await supabaseAdmin
    .from("near_miss_reports")
    .insert({
      description: description ?? "",
      status: status ?? "pending",
      company_id: companyId,
      site_id: siteId,
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
