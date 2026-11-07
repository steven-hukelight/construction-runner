import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { moduleForUser, signedDocumentUrl, signedVideoUrl } from "@/lib/training/service";

/**
 * Starts a watch of the module's video, or a read of the company's PDF. Returns a short-lived
 * signed URL for our own video or the PDF, or the publisher's page for an official film.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const companyId = (auth.companyId ?? "").trim();
    if (!auth.uid || !companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const found = await moduleForUser(id, auth.uid, companyId);
    if (!found) return NextResponse.json({ error: "This module isn't switched on for your company" }, { status: 404 });
    const { module } = found;

    const source = module.document_path ? "document" : module.video_path ? "bucket" : "external";
    let videoUrl: string | null = null;
    let documentUrl: string | null = null;
    if (module.document_path) {
      documentUrl = await signedDocumentUrl(module.document_path);
      if (!documentUrl) return NextResponse.json({ error: "Couldn't load the document" }, { status: 502 });
    } else if (module.video_path) {
      videoUrl = await signedVideoUrl(module.video_path);
      if (!videoUrl) return NextResponse.json({ error: "Couldn't load the video" }, { status: 502 });
    }

    const { data, error } = await supabaseAdmin
      .from("training_video_views")
      .insert({ user_id: auth.uid, company_id: companyId, module_id: module.id, source })
      .select("id, started_at")
      .single();
    if (error || !data) {
      console.error("POST /api/training-modules/[id]/start:", error);
      return NextResponse.json({ error: "Couldn't start the video" }, { status: 500 });
    }

    return NextResponse.json({
      viewId: data.id,
      startedAt: data.started_at,
      source,
      videoUrl,
      documentUrl,
      externalUrl: source === "external" ? module.external_url : null,
      publisher: source === "external" ? module.external_publisher : null,
      acknowledgement: source === "external" ? module.external_acknowledgement : null,
      minWatchSeconds: module.min_watch_seconds,
    });
  } catch (e) {
    console.error("POST /api/training-modules/[id]/start:", e);
    return NextResponse.json({ error: "Couldn't start the video" }, { status: 500 });
  }
}
