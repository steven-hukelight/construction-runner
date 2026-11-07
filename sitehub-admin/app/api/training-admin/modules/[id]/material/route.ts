import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTrainingOfficeAuth, type TrainingOfficeAuth } from "@/lib/training/officeAuth";
import {
  COMPANY_MODULE_COLUMNS,
  TRAINING_DOCUMENT_BUCKET,
  TRAINING_VIDEO_BUCKET,
  loadModule,
  type CompanyModuleRow,
} from "@/lib/training/service";
import { claimStagedUpload } from "@/lib/storage/stagedUpload";

type MaterialType = "video" | "document";

async function loadSetting(companyId: string, moduleId: string): Promise<CompanyModuleRow | null> {
  const { data, error } = await supabaseAdmin
    .from("company_training_modules")
    .select(COMPANY_MODULE_COLUMNS)
    .eq("company_id", companyId)
    .eq("module_id", moduleId)
    .maybeSingle<CompanyModuleRow>();
  if (error) throw new Error(`company_training_modules: ${error.message}`);
  return data ?? null;
}

async function authorise(req: Request, moduleId: string): Promise<TrainingOfficeAuth | NextResponse> {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.canConfigure) return NextResponse.json({ error: "Only a Super Admin can change training material" }, { status: 403 });
  const trainingModule = await loadModule(moduleId);
  if (!trainingModule || trainingModule.kind !== "video") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return auth;
}

async function removeFiles(setting: CompanyModuleRow | null, keep?: string) {
  if (setting?.video_path && setting.video_path !== keep) {
    await supabaseAdmin.storage.from(TRAINING_VIDEO_BUCKET).remove([setting.video_path]);
  }
  if (setting?.document_path && setting.document_path !== keep) {
    await supabaseAdmin.storage.from(TRAINING_DOCUMENT_BUCKET).remove([setting.document_path]);
  }
}

/**
 * `{ type: "video" | "document", stagedToken }` from a `training-video` or `training-document`
 * staged upload. Becomes this company's material for the module, replacing any earlier video or PDF.
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await authorise(req, id);
    if (auth instanceof NextResponse) return auth;

    const body = (await req.json().catch(() => ({}))) as { type?: unknown; stagedToken?: unknown };
    const type: MaterialType | null = body.type === "video" || body.type === "document" ? body.type : null;
    if (!type) return NextResponse.json({ error: "Choose a video or a PDF" }, { status: 400 });
    const token = typeof body.stagedToken === "string" ? body.stagedToken.trim() : "";
    if (!token) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });

    const bucket = type === "video" ? TRAINING_VIDEO_BUCKET : TRAINING_DOCUMENT_BUCKET;
    const finalPath = `companies/${auth.companyId}/${id}/${Date.now()}.${type === "video" ? "mp4" : "pdf"}`;
    const claimed = await claimStagedUpload(type === "video" ? "training-video" : "training-document", token, finalPath);
    if ("error" in claimed) return NextResponse.json({ error: claimed.error }, { status: 400 });
    const rightType = type === "video" ? claimed.contentType.startsWith("video/") : claimed.contentType === "application/pdf";
    if (!rightType) {
      await supabaseAdmin.storage.from(bucket).remove([claimed.path]);
      return NextResponse.json({ error: type === "video" ? "That file isn't a video" : "That file isn't a PDF" }, { status: 400 });
    }

    const existing = await loadSetting(auth.companyId, id);
    const name = claimed.fileName.slice(0, 200);
    const { error } = await supabaseAdmin.from("company_training_modules").upsert(
      {
        company_id: auth.companyId,
        module_id: id,
        enabled: existing?.enabled ?? false,
        refresh_months: existing ? existing.refresh_months : 12,
        video_path: type === "video" ? claimed.path : null,
        video_name: type === "video" ? name : null,
        document_path: type === "document" ? claimed.path : null,
        document_name: type === "document" ? name : null,
        updated_at: new Date().toISOString(),
        updated_by: auth.uid,
      },
      { onConflict: "company_id,module_id" },
    );
    if (error) {
      await supabaseAdmin.storage.from(bucket).remove([claimed.path]);
      console.error("PUT /api/training-admin/modules/[id]/material:", error);
      return NextResponse.json({ error: "Couldn't save the file" }, { status: 500 });
    }
    await removeFiles(existing, claimed.path);
    return NextResponse.json({ ok: true, type, name });
  } catch (e) {
    console.error("PUT /api/training-admin/modules/[id]/material:", e);
    return NextResponse.json({ error: "Couldn't save the file" }, { status: 500 });
  }
}

/**
 * Removes this company's video or PDF. The module falls back to the default video or publisher
 * link; with neither, it is switched off so nobody is left with a module they can't open.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await authorise(req, id);
    if (auth instanceof NextResponse) return auth;

    const existing = await loadSetting(auth.companyId, id);
    if (!existing?.video_path && !existing?.document_path) return NextResponse.json({ ok: true });

    const fallback = await loadModule(id);
    const stillPlayable = Boolean(fallback?.video_path || fallback?.external_url);
    const { error } = await supabaseAdmin
      .from("company_training_modules")
      .update({
        video_path: null,
        video_name: null,
        document_path: null,
        document_name: null,
        enabled: stillPlayable ? existing.enabled : false,
        updated_at: new Date().toISOString(),
        updated_by: auth.uid,
      })
      .eq("company_id", auth.companyId)
      .eq("module_id", id);
    if (error) {
      console.error("DELETE /api/training-admin/modules/[id]/material:", error);
      return NextResponse.json({ error: "Couldn't remove the file" }, { status: 500 });
    }
    await removeFiles(existing);
    return NextResponse.json({ ok: true, switchedOff: existing.enabled && !stillPlayable });
  } catch (e) {
    console.error("DELETE /api/training-admin/modules/[id]/material:", e);
    return NextResponse.json({ error: "Couldn't remove the file" }, { status: 500 });
  }
}
