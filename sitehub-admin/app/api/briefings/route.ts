import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { getRestrictedSiteIds, siteIdsForFilter } from "@/lib/auth/siteScope";

export const dynamic = "force-dynamic";

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

    if (role === "superuser") companyId = searchParams.get("companyId") || companyId || undefined;

    const explicitSiteId = searchParams.get("siteId")?.trim() || searchParams.get("site_id")?.trim();
    const restricted = await getRestrictedSiteIds(role);
    const siteScope = siteIdsForFilter(restricted, explicitSiteId);
    if (siteScope === "none") return NextResponse.json([]);

    let query = supabaseAdmin.from("briefings").select("*").order("created_at", { ascending: false });
    const limitRaw = parseInt(searchParams.get("limit") || "", 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 500) : 500;
    query = query.limit(limit);
    if (companyId) query = query.eq("company_id", companyId);
    if (siteScope !== "all") query = query.in("site_id", siteScope);
    const { data } = await query;
    const briefings = (data ?? []).map((d) => ({ id: d.id, ...d }));
    return NextResponse.json(briefings);
  } catch (e) {
    console.error("GET /api/briefings failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}
