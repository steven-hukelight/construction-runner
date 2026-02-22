import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** Returns sites that the current user's company is linked to as a subcontractor. */
export async function GET() {
  try {
    const companyId = (await cookies()).get("companyId")?.value;
    if (!companyId) return NextResponse.json([], { status: 200 });

    const { data: subs } = await supabaseAdmin
      .from("site_subcontractors")
      .select("site_id")
      .eq("company_id", companyId);
    const siteIds = (subs ?? []).map((s) => s.site_id);
    if (siteIds.length === 0) return NextResponse.json([], { status: 200 });

    const { data: sites } = await supabaseAdmin
      .from("sites")
      .select("id, name, location")
      .in("id", siteIds);

    const linked = (sites ?? []).map((s) => ({ id: s.id, name: s.name, location: s.location }));
    return NextResponse.json(linked);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/sites/linked failed:", message);
    return NextResponse.json([], { status: 200 });
  }
}
