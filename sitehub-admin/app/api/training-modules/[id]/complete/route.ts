import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { moduleForUser } from "@/lib/training/service";
import { DOCUMENT_MIN_READ_SECONDS, requiredWatchSeconds, watchedLongEnough } from "@/lib/training/rules";

/** `{ viewId, durationSeconds? }`. Marks the video watched or the PDF read, which unlocks the quiz. Too soon after the start returns 409. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const companyId = (auth.companyId ?? "").trim();
    if (!auth.uid || !companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as { viewId?: unknown; durationSeconds?: unknown };
    const viewId = String(body.viewId ?? "").trim();
    if (!viewId) return NextResponse.json({ error: "viewId required" }, { status: 400 });

    const found = await moduleForUser(id, auth.uid, companyId);
    if (!found) return NextResponse.json({ error: "This module isn't switched on for your company" }, { status: 404 });

    const { data: view } = await supabaseAdmin
      .from("training_video_views")
      .select("id, user_id, module_id, source, started_at, completed_at")
      .eq("id", viewId)
      .maybeSingle();
    if (!view || view.user_id !== auth.uid || view.module_id !== id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (view.completed_at) return NextResponse.json({ ok: true, completedAt: view.completed_at });

    const now = new Date();
    const reported = Number(body.durationSeconds);
    const isDocument = view.source === "document";
    const required = isDocument
      ? DOCUMENT_MIN_READ_SECONDS
      : requiredWatchSeconds(found.module.min_watch_seconds, Number.isFinite(reported) ? reported : null);
    if (!watchedLongEnough(view.started_at, now, required)) {
      const elapsed = Math.max(0, Math.floor((now.getTime() - new Date(view.started_at).getTime()) / 1000));
      return NextResponse.json(
        {
          error: "watch_incomplete",
          message: isDocument ? "Read the whole document before the quiz." : "Watch the whole video before the quiz.",
          secondsRemaining: required - elapsed,
        },
        { status: 409 },
      );
    }

    const { error } = await supabaseAdmin
      .from("training_video_views")
      .update({ completed_at: now.toISOString() })
      .eq("id", viewId)
      .is("completed_at", null);
    if (error) {
      console.error("POST /api/training-modules/[id]/complete:", error);
      return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, completedAt: now.toISOString() });
  } catch (e) {
    console.error("POST /api/training-modules/[id]/complete:", e);
    return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
  }
}
