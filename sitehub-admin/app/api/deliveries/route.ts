import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const { searchParams } = new URL(req.url);
    const queryCompanyId = searchParams.get("companyId")?.trim();
    let companyId = queryCompanyId || cookieStore.get("companyId")?.value;
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
          queryCompanyId: queryCompanyId || undefined,
        })) || undefined;
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 500);
    const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;

    if (role === "superuser") {
      const { data } = await supabaseAdmin
        .from("deliveries")
        .select("id, reference, site_id, company_id, created_by, status, scheduled_at, notes, wholesaler, pod_url, load_url, load_photos, created_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      const deliveries = data ?? [];
      const siteIds = [...new Set(deliveries.map((d) => (d as Record<string, unknown>).site_id).filter(Boolean))];
      const siteMap: Record<string, string> = {};
      if (siteIds.length > 0) {
        const { data: sites } = await supabaseAdmin.from("sites").select("id, name").in("id", siteIds);
        for (const s of sites ?? []) siteMap[s.id] = (s.name as string) ?? "";
      }
      const enriched = deliveries.map((d) => {
        const siteId = (d as Record<string, unknown>).site_id;
        const site = siteMap[siteId as string] ?? "";
        return { ...d, site: site || (d as Record<string, unknown>).site };
      });
      return NextResponse.json(enriched);
    }
    if (companyId) {
      const { data } = await supabaseAdmin
        .from("deliveries")
        .select("id, reference, site_id, company_id, created_by, status, scheduled_at, notes, wholesaler, pod_url, load_url, load_photos, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      const deliveries = data ?? [];
      const siteIds = [...new Set(deliveries.map((d) => (d as Record<string, unknown>).site_id).filter(Boolean))];
      const siteMap: Record<string, string> = {};
      if (siteIds.length > 0) {
        const { data: sites } = await supabaseAdmin.from("sites").select("id, name").in("id", siteIds);
        for (const s of sites ?? []) siteMap[s.id] = (s.name as string) ?? "";
      }
      const enriched = deliveries.map((d) => {
        const siteId = (d as Record<string, unknown>).site_id;
        const site = siteMap[siteId as string] ?? "";
        return { ...d, site: site || (d as Record<string, unknown>).site };
      });
      return NextResponse.json(enriched);
    }
    return NextResponse.json([], { status: 200 });
  } catch (e) {
    console.error("GET /api/deliveries failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
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
  const assignedCompanyId = role === "superuser" ? (body.company_id ?? body.companyId ?? companyId ?? null) : (companyId ?? null);
  if (!assignedCompanyId) return NextResponse.json({ error: "company_id required" }, { status: 400 });

  const id = crypto.randomUUID();
  const { data, error } = await supabaseAdmin.from("deliveries").insert({
    id,
    reference: body.reference ?? null,
    site_id: body.site_id ?? body.siteId ?? null,
    company_id: assignedCompanyId,
    created_by: body.created_by ?? body.createdBy ?? null,
    status: body.status ?? "PENDING",
    scheduled_at: body.scheduled_at ?? body.scheduledAt ?? null,
    notes: body.notes ?? null,
    pod_url: body.pod_url ?? body.podUrl ?? null,
    load_url: body.load_url ?? body.loadUrl ?? null,
    wholesaler: body.wholesaler ?? null,
  }).select("id").single();

  if (error) {
    console.error("POST /api/deliveries failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id }, { status: 201 });
}
