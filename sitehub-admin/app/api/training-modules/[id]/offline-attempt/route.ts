import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { moduleForUser, noteRepeatedFails, questionsForCompany } from "@/lib/training/service";
import {
  DOCUMENT_MIN_READ_SECONDS,
  checkOfflineAttemptTimes,
  failsInARow,
  requiredWatchSeconds,
  scoreQuiz,
} from "@/lib/training/rules";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `{ clientEventId, startedAt, completedAt, answeredAt, durationSeconds?, answers }` from a module
 * saved on the phone and taken with no signal. Records the watch and the attempt with the times it
 * happened, then marks it like an online attempt. The same `clientEventId` twice returns the first result.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const companyId = (auth.companyId ?? "").trim();
    if (!auth.uid || !companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const clientEventId = String(body.clientEventId ?? "").trim();
    if (!UUID_RE.test(clientEventId)) return NextResponse.json({ error: "clientEventId required" }, { status: 400 });
    const answers =
      body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
        ? (body.answers as Record<string, unknown>)
        : null;
    if (!answers) return NextResponse.json({ error: "answers required" }, { status: 400 });

    const { data: existing } = await supabaseAdmin
      .from("training_attempts")
      .select("score, total, passed, user_id")
      .eq("client_event_id", clientEventId)
      .maybeSingle();
    if (existing) {
      if (existing.user_id !== auth.uid) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ score: existing.score, total: existing.total, passed: existing.passed, duplicate: true });
    }

    const found = await moduleForUser(id, auth.uid, companyId);
    if (!found) return NextResponse.json({ error: "This module isn't switched on for your company" }, { status: 404 });
    const { module } = found;
    const isDocument = Boolean(module.document_path);
    if (!isDocument && !module.video_path) {
      return NextResponse.json({ error: "not_saveable", message: "This module can't be taken offline." }, { status: 409 });
    }

    const reported = Number(body.durationSeconds);
    const times = checkOfflineAttemptTimes({
      startedAt: body.startedAt,
      completedAt: body.completedAt,
      answeredAt: body.answeredAt,
      requiredSeconds: isDocument
        ? DOCUMENT_MIN_READ_SECONDS
        : requiredWatchSeconds(module.min_watch_seconds, Number.isFinite(reported) ? reported : null),
    });
    if (!times.ok) return NextResponse.json({ error: times.error, message: times.message }, { status: 409 });

    const questions = await questionsForCompany(id, companyId);
    if (!questions.length || questions.some((q) => !(q.id in answers))) {
      return NextResponse.json(
        { error: "questions_changed", message: "The questions changed since this was saved. Take the quiz again." },
        { status: 409 },
      );
    }
    const result = scoreQuiz(questions, answers, module.pass_mark);

    const { data: view, error: viewError } = await supabaseAdmin
      .from("training_video_views")
      .insert({
        user_id: auth.uid,
        company_id: companyId,
        module_id: id,
        source: isDocument ? "document" : "bucket",
        started_at: times.startedAt,
        completed_at: times.completedAt,
      })
      .select("id")
      .single();
    if (viewError || !view) {
      console.error("POST /api/training-modules/[id]/offline-attempt view:", viewError);
      return NextResponse.json({ error: "Couldn't save your answers" }, { status: 500 });
    }
    const { error } = await supabaseAdmin.from("training_attempts").insert({
      user_id: auth.uid,
      company_id: companyId,
      module_id: id,
      view_id: view.id,
      score: result.score,
      total: result.total,
      passed: result.passed,
      answers,
      submitted_at: times.answeredAt,
      client_event_id: clientEventId,
    });
    if (error) {
      await supabaseAdmin.from("training_video_views").delete().eq("id", view.id);
      if (error.code === "23505") return NextResponse.json({ duplicate: true });
      console.error("POST /api/training-modules/[id]/offline-attempt:", error);
      return NextResponse.json({ error: "Couldn't save your answers" }, { status: 500 });
    }

    if (!result.passed) {
      const { data: recent } = await supabaseAdmin
        .from("training_attempts")
        .select("passed")
        .eq("user_id", auth.uid)
        .eq("module_id", id)
        .order("submitted_at", { ascending: false })
        .limit(10);
      await noteRepeatedFails({
        companyId,
        userId: auth.uid,
        moduleId: id,
        moduleTitle: module.title,
        fails: failsInARow((recent ?? []) as { passed: boolean }[]),
      }).catch((e) => console.warn("[training] repeated-fail note failed:", e));
    }

    return NextResponse.json({
      score: result.score,
      total: result.total,
      passMark: Math.min(module.pass_mark, result.total),
      passed: result.passed,
    });
  } catch (e) {
    console.error("POST /api/training-modules/[id]/offline-attempt:", e);
    return NextResponse.json({ error: "Couldn't save your answers" }, { status: 500 });
  }
}
