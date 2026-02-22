import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const siteIdFilter = body.siteId?.trim() || null;

    const { data: inductions } = siteIdFilter
      ? await supabaseAdmin.from("user_site_inductions").select("user_id, site_id").eq("site_id", siteIdFilter).eq("grandfathered", false)
      : await supabaseAdmin.from("user_site_inductions").select("user_id, site_id").eq("grandfathered", false);

    let siteInductionsUpdated = 0;
    for (const ind of inductions ?? []) {
      await supabaseAdmin.from("user_site_inductions").update({ grandfathered: true }).eq("user_id", ind.user_id).eq("site_id", ind.site_id);
      siteInductionsUpdated++;
    }

    return NextResponse.json({
      success: true,
      message: `Grandfathered ${siteInductionsUpdated} site inductions.`,
      siteInductionsUpdated,
      usersUpdated: 0,
    });
  } catch (e) {
    console.error("grandfather-inductions failed:", e);
    return NextResponse.json({ error: "Grandfather failed" }, { status: 500 });
  }
}
