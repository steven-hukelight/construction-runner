import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export const dynamic = "force-dynamic";

/**
 * GET /api/subcontractors
 * List all partner (subcontractor) companies linked to the main contractor's sites.
 * Uses company_id from cookie. Superuser can pass ?companyId= to override.
 */
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value?.trim();
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        }))?.trim() || undefined;
    }
    if (role === "superuser") {
      companyId = new URL(req.url).searchParams.get("companyId") || companyId || undefined;
    }
    if (!companyId) {
      return NextResponse.json([]);
    }

    const { data: sites } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("company_id", companyId);

    if (!sites?.length) {
      return NextResponse.json([]);
    }

    const siteIds = sites.map((s) => s.id);

    const { data: subRows } = await supabaseAdmin
      .from("site_subcontractors")
      .select("site_id, company_id")
      .in("site_id", siteIds);

    const partnerIds = new Set<string>((subRows ?? []).map((r) => r.company_id));

    if (partnerIds.size === 0) {
      return NextResponse.json([]);
    }

    const companies: Array<{
      id: string;
      name: string | null;
      logoUrl: string | null;
      type: string;
      operativeCount: number;
      siteCount: number;
    }> = [];

    const siteCountByPartner: Record<string, number> = {};
    for (const r of subRows ?? []) {
      if (siteIds.includes(r.site_id)) {
        siteCountByPartner[r.company_id] = (siteCountByPartner[r.company_id] ?? 0) + 1;
      }
    }

    for (const id of partnerIds) {
      const { data: company } = await supabaseAdmin
        .from("companies")
        .select("id, name")
        .eq("id", id)
        .maybeSingle();

      if (!company) continue;

      const { count: operativeCount } = await supabaseAdmin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("company_id", id);

      companies.push({
        id,
        name: company.name ?? null,
        logoUrl: null,
        type: "partner",
        operativeCount: operativeCount ?? 0,
        siteCount: siteCountByPartner[id] ?? 0,
      });
    }

    return NextResponse.json(companies);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/subcontractors failed:", message);
    return NextResponse.json([], { status: 200 });
  }
}
