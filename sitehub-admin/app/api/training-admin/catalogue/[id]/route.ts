import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTrainingOfficeAuth } from "@/lib/training/officeAuth";
import { TRAINING_VIDEO_BUCKET, loadModule } from "@/lib/training/service";
import { isHttpsUrl } from "@/lib/utils/httpsUrl";
import { claimStagedUpload } from "@/lib/storage/stagedUpload";

function cleanText(value: unknown, max: number): string | null {
  const s = typeof value === "string" ? value.trim() : "";
  return s ? s.slice(0, max) : null;
}

/**
 * Platform only. Attach our own video (`stagedToken` from a `training-video` staged upload)
 * or a publisher link (`externalUrl`, `externalPublisher`, `externalAcknowledgement`,
 * `minWatchSeconds`). `removeVideo: true` drops our own video and falls back to the link.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.canEditCatalogue) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const trainingModule = await loadModule(id);
    if (!trainingModule || trainingModule.kind !== "video") return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.externalUrl !== undefined) {
      if (body.externalUrl === null || body.externalUrl === "") update.external_url = null;
      else if (isHttpsUrl(body.externalUrl)) update.external_url = String(body.externalUrl).trim();
      else return NextResponse.json({ error: "The link must start with https://" }, { status: 400 });
    }
    if (body.externalPublisher !== undefined) update.external_publisher = cleanText(body.externalPublisher, 80);
    if (body.externalAcknowledgement !== undefined) update.external_acknowledgement = cleanText(body.externalAcknowledgement, 400);
    if (body.minWatchSeconds !== undefined) {
      if (body.minWatchSeconds === null || body.minWatchSeconds === "") update.min_watch_seconds = null;
      else {
        const n = Number(body.minWatchSeconds);
        if (!Number.isInteger(n) || n < 10 || n > 3600) {
          return NextResponse.json({ error: "Minimum watch time must be 10 to 3600 seconds" }, { status: 400 });
        }
        update.min_watch_seconds = n;
      }
    }

    const oldPath = trainingModule.video_path;
    const stagedToken = cleanText(body.stagedToken, 4000);
    if (stagedToken) {
      const claimed = await claimStagedUpload("training-video", stagedToken, `modules/${id}/${Date.now()}.mp4`);
      if ("error" in claimed) return NextResponse.json({ error: claimed.error }, { status: 400 });
      if (!claimed.contentType.startsWith("video/")) {
        await supabaseAdmin.storage.from(TRAINING_VIDEO_BUCKET).remove([claimed.path]);
        return NextResponse.json({ error: "That file isn't a video" }, { status: 400 });
      }
      update.video_path = claimed.path;
    } else if (body.removeVideo === true) {
      update.video_path = null;
    }

    const { error } = await supabaseAdmin.from("training_modules").update(update).eq("id", id);
    if (error) {
      console.error("PATCH /api/training-admin/catalogue/[id]:", error);
      return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
    }
    if (oldPath && "video_path" in update && update.video_path !== oldPath) {
      await supabaseAdmin.storage.from(TRAINING_VIDEO_BUCKET).remove([oldPath]);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/training-admin/catalogue/[id]:", e);
    return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
  }
}
