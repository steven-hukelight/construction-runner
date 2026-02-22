import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkPreInductionAccess } from "@/app/api/pre-induction/[userId]/_utils/auth";
import { updatePreInductionStatus } from "@/app/api/pre-induction/[userId]/_utils/status";

/** Operative accepts RAMS for a site. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId?.trim();
    const siteId = body.siteId?.trim();
    if (!userId || !siteId) return NextResponse.json({ error: "userId and siteId required" }, { status: 400 });

    const access = await checkPreInductionAccess(userId);
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });

    const { data: site } = await supabaseAdmin.from("sites").select("rams_version, ramsversion").eq("id", siteId).maybeSingle();
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    const siteRamsVersion = (site.rams_version ?? site.ramsversion ?? null) as string | null;
    if (!siteRamsVersion) return NextResponse.json({ error: "Site has no RAMS version" }, { status: 400 });

    const { data: assign } = await supabaseAdmin.from("assigned_operatives").select("id").eq("site_id", siteId).eq("user_id", userId).maybeSingle();
    if (!assign) return NextResponse.json({ error: "Operative not assigned to this site" }, { status: 403 });

    const { data: current } = await supabaseAdmin.from("pre_induction_training").select("*").eq("user_id", userId).maybeSingle();
    const bySite = ((current?.rams_required_version_by_site ?? (current as { ramsRequiredVersionBySite?: Record<string, string> })?.ramsRequiredVersionBySite) as Record<string, string>) ?? {};
    bySite[siteId] = siteRamsVersion;

    await supabaseAdmin.from("pre_induction_training").upsert(
      {
        user_id: userId,
        rams_accepted: true,
        rams_accepted_at: new Date().toISOString(),
        rams_version: siteRamsVersion,
        rams_required_version: siteRamsVersion,
        rams_required_version_by_site: bySite,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    await updatePreInductionStatus(userId);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("POST /api/rams/accept:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
