import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

function getQueryCompanyId(req: Request): string | null {
  try {
    return new URL(req.url).searchParams.get("companyId")?.trim() || null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const url = new URL(req.url);
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId || role === "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role: cookieStore.get("role")?.value,
          queryCompanyId: getQueryCompanyId(req),
        })) || undefined;
    }
    if (role === "superuser") companyId = getQueryCompanyId(req) || companyId || undefined;

    const unreviewedOnly = url.searchParams.get("unreviewed") === "true";
    const countOnly = url.searchParams.get("count") === "unreviewed";
    const mineOnly = url.searchParams.get("mine") === "true";
    const uid = cookieStore.get("uid")?.value?.trim();

    if (countOnly && companyId) {
      const { count, error } = await supabaseAdmin
        .from("near_miss_reports")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .is("reviewed_at", null);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ count: count ?? 0 });
    }

    let query = supabaseAdmin
      .from("near_miss_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (companyId) query = query.eq("company_id", companyId);
    if (unreviewedOnly) query = query.is("reviewed_at", null);
    if (mineOnly && uid) query = query.eq("reported_by", uid);

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
    const rows = reports.map((d: Record<string, unknown>) => ({
      ...d,
      site_name: d.site_id ? siteMap.get(String(d.site_id)) ?? null : null,
    }));
    return NextResponse.json(rows);
  } catch (e) {
    console.error("GET /api/near-miss:", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId || role === "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
        queryCompanyId: getQueryCompanyId(req),
      })) || undefined;
  }
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
