import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canEditSiteSafetyPack } from "@/lib/auth/roles";
import { writeAuditLog } from "@/lib/auditLog";
import { emergencyPlanView, isStaffForSite, loadPlanRow, loadSite } from "@/lib/siteAlarms/service";
import { EMERGENCY_PLAN_BUCKET } from "@/lib/siteAlarms/types";
import {
  PLAN_FILE_MAX_BYTES,
  allowedMimes,
  finaliseUpload,
  incomingPrefix,
  isPlanFileKind,
  newIncomingPath,
  removeUnreferenced,
} from "@/lib/siteAlarms/planFiles";

async function editor(req: Request, siteId: string) {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return { response: auth };
  const site = await loadSite(siteId);
  if (!site) return { response: NextResponse.json({ error: "Site not found" }, { status: 404 }) };
  if (!auth.uid || !canEditSiteSafetyPack(auth.role) || !(await isStaffForSite(auth, site))) {
    return {
      response: NextResponse.json({ error: "Only supervisors and admins for this site can edit its emergency plan" }, { status: 403 }),
    };
  }
  return { auth, site };
}

/**
 * Two steps, so large PDFs skip the 4.5 MB function body limit:
 * 1. `{ step: "start", kind, mime, size }` returns a one-off signed upload URL in `incoming/`.
 *    The client PUTs the file there.
 * 2. `{ step: "complete", kind, path, fileName }` checks the file, re-encodes images and saves it.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await editor(req, id);
    if ("response" in ctx) return ctx.response;
    const { auth, site } = ctx;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (!isPlanFileKind(body.kind)) return NextResponse.json({ error: "kind must be fire_strategy or site_plan" }, { status: 400 });
    const kind = body.kind;

    if (body.step === "start") {
      const mime = String(body.mime ?? "").toLowerCase();
      const size = Number(body.size);
      if (!allowedMimes(kind).includes(mime)) {
        return NextResponse.json(
          { error: kind === "site_plan" ? "Upload the site plan as a PNG, JPG or WebP image" : "Upload a PDF, PNG, JPG or WebP file" },
          { status: 400 },
        );
      }
      if (!Number.isFinite(size) || size <= 0 || size > PLAN_FILE_MAX_BYTES) {
        return NextResponse.json({ error: "File is too large (25 MB max)" }, { status: 400 });
      }
      const path = newIncomingPath(site.company_id, site.id);
      const { data, error } = await supabaseAdmin.storage.from(EMERGENCY_PLAN_BUCKET).createSignedUploadUrl(path);
      if (error || !data) {
        console.error("emergency plan createSignedUploadUrl:", error);
        return NextResponse.json({ error: "Couldn't start the upload" }, { status: 500 });
      }
      return NextResponse.json({ path, uploadUrl: data.signedUrl });
    }

    if (body.step !== "complete") return NextResponse.json({ error: "step must be start or complete" }, { status: 400 });
    const path = String(body.path ?? "");
    const prefix = incomingPrefix(site.company_id, site.id);
    if (!path.startsWith(prefix) || !/^[0-9a-f-]{36}$/i.test(path.slice(prefix.length))) {
      return NextResponse.json({ error: "Upload not found. Try again." }, { status: 400 });
    }
    const stored = await finaliseUpload({ companyId: site.company_id, siteId: site.id, kind, incomingPath: path });
    if ("error" in stored) return NextResponse.json({ error: stored.error }, { status: 400 });

    const previous = await loadPlanRow(site.id);
    const fileName = typeof body.fileName === "string" ? body.fileName.trim().slice(0, 120) || null : null;
    const update: Record<string, unknown> =
      kind === "fire_strategy"
        ? { fire_strategy_path: stored.path, fire_strategy_mime: stored.mime, fire_strategy_name: fileName }
        : { site_plan_path: stored.path, site_plan_width: stored.width, site_plan_height: stored.height };
    // An image fire strategy doubles as the site plan until a separate plan is uploaded.
    const usePlanToo = kind === "fire_strategy" && stored.width !== null && !previous?.site_plan_path;
    if (usePlanToo) Object.assign(update, { site_plan_path: stored.path, site_plan_width: stored.width, site_plan_height: stored.height });

    const { data, error } = await supabaseAdmin
      .from("site_emergency_plans")
      .upsert(
        { site_id: site.id, company_id: site.company_id, ...update, updated_at: new Date().toISOString(), updated_by: auth.uid },
        { onConflict: "site_id" },
      )
      .select("*")
      .single();
    if (error) {
      console.error("emergency plan upload save:", error);
      await removeUnreferenced([stored.path], []);
      return NextResponse.json({ error: "Couldn't save the file" }, { status: 500 });
    }
    const saved = data as { fire_strategy_path: string | null; site_plan_path: string | null };
    await removeUnreferenced(
      [previous?.fire_strategy_path, previous?.site_plan_path],
      [saved.fire_strategy_path, saved.site_plan_path],
    );

    void writeAuditLog({
      userId: auth.uid!,
      action: "site_emergency_plan_updated",
      timestamp: new Date(),
      actorId: auth.uid!,
      actorEmail: auth.userEmail,
      metadata: { siteId: site.id, file: kind, mime: stored.mime },
    });
    return NextResponse.json({ plan: await emergencyPlanView(site.id, data as never) });
  } catch (e) {
    console.error("POST /api/sites/[id]/emergency-plan/upload failed:", e);
    return NextResponse.json({ error: "Couldn't save the file" }, { status: 500 });
  }
}

/** `?kind=fire_strategy|site_plan` removes that file. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await editor(req, id);
    if ("response" in ctx) return ctx.response;
    const { site } = ctx;
    const kind = new URL(req.url).searchParams.get("kind");
    if (!isPlanFileKind(kind)) return NextResponse.json({ error: "kind must be fire_strategy or site_plan" }, { status: 400 });

    const previous = await loadPlanRow(site.id);
    if (!previous) return NextResponse.json({ plan: await emergencyPlanView(site.id, null) });
    const update =
      kind === "fire_strategy"
        ? { fire_strategy_path: null, fire_strategy_mime: null, fire_strategy_name: null }
        : { site_plan_path: null, site_plan_width: null, site_plan_height: null };
    const { data, error } = await supabaseAdmin
      .from("site_emergency_plans")
      .update({ ...update, updated_at: new Date().toISOString(), updated_by: ctx.auth.uid })
      .eq("site_id", site.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: "Couldn't remove the file" }, { status: 500 });
    const saved = data as { fire_strategy_path: string | null; site_plan_path: string | null };
    await removeUnreferenced([previous.fire_strategy_path, previous.site_plan_path], [saved.fire_strategy_path, saved.site_plan_path]);
    return NextResponse.json({ plan: await emergencyPlanView(site.id, data as never) });
  } catch (e) {
    console.error("DELETE /api/sites/[id]/emergency-plan/upload failed:", e);
    return NextResponse.json({ error: "Couldn't remove the file" }, { status: 500 });
  }
}
