import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canEditSiteSafetyPack } from "@/lib/auth/roles";
import { currentSignedInSiteId } from "@/lib/auth/siteScope";
import { writeAuditLog } from "@/lib/auditLog";
import { emergencyPlanView, isStaffForSite, loadSite } from "@/lib/siteAlarms/service";
import { parseInstructions, parseMusterPoints } from "@/lib/siteAlarms/types";

/** Staff for the site, or anyone signed in there. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const site = await loadSite(id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    const staff = await isStaffForSite(auth, site);
    if (!staff && (await currentSignedInSiteId(auth.uid ?? "")) !== site.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({
      site: { id: site.id, name: site.name },
      plan: await emergencyPlanView(site.id),
      can_edit: staff && canEditSiteSafetyPack(auth.role),
    });
  } catch (e) {
    console.error("GET /api/sites/[id]/emergency-plan failed:", e);
    return NextResponse.json({ error: "Couldn't load the emergency plan" }, { status: 500 });
  }
}

/** Muster points, per-alarm instructions and first aid info. Files are uploaded separately. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const uid = (auth.uid ?? "").trim();
    const site = await loadSite(id);
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    if (!uid || !canEditSiteSafetyPack(auth.role) || !(await isStaffForSite(auth, site))) {
      return NextResponse.json({ error: "Only supervisors and admins for this site can edit its emergency plan" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if ("muster_points" in body) {
      const parsed = parseMusterPoints(body.muster_points);
      if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
      update.muster_points = parsed.points;
    }
    if ("instructions" in body) {
      const parsed = parseInstructions(body.instructions);
      if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
      update.instructions = parsed.instructions;
    }
    if ("first_aid_info" in body) {
      if (body.first_aid_info !== null && typeof body.first_aid_info !== "string") {
        return NextResponse.json({ error: "First aid info must be text" }, { status: 400 });
      }
      update.first_aid_info = typeof body.first_aid_info === "string" ? body.first_aid_info.trim().slice(0, 2000) || null : null;
    }
    if (!Object.keys(update).length) return NextResponse.json({ error: "Nothing to save" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("site_emergency_plans")
      .upsert(
        { site_id: site.id, company_id: site.company_id, ...update, updated_at: new Date().toISOString(), updated_by: uid },
        { onConflict: "site_id" },
      )
      .select("*")
      .single();
    if (error) {
      console.error("PUT /api/sites/[id]/emergency-plan:", error);
      return NextResponse.json({ error: "Couldn't save the emergency plan" }, { status: 500 });
    }

    void writeAuditLog({
      userId: uid,
      action: "site_emergency_plan_updated",
      timestamp: new Date(),
      actorId: uid,
      actorEmail: auth.userEmail,
      metadata: { siteId: site.id, fields: Object.keys(update) },
    });
    return NextResponse.json({ plan: await emergencyPlanView(site.id, data as never) });
  } catch (e) {
    console.error("PUT /api/sites/[id]/emergency-plan failed:", e);
    return NextResponse.json({ error: "Couldn't save the emergency plan" }, { status: 500 });
  }
}
