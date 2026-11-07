import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadQuestions, moduleForUser, noteRepeatedFails, userProgress } from "@/lib/training/service";
import { failsInARow, scoreQuiz } from "@/lib/training/rules";

/** `{ viewId, answers: { [questionId]: optionIndex } }`. Returns the score and which questions were right. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const companyId = (auth.companyId ?? "").trim();
    if (!auth.uid || !companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = (await req.json().catch(() => ({}))) as { viewId?: unknown; answers?: unknown };
    const viewId = String(body.viewId ?? "").trim();
    const answers =
      body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
        ? (body.answers as Record<string, unknown>)
        : null;
    if (!viewId || !answers) return NextResponse.json({ error: "viewId and answers required" }, { status: 400 });

    const found = await moduleForUser(id, auth.uid, companyId);
    if (!found) return NextResponse.json({ error: "This module isn't switched on for your company" }, { status: 404 });

    const progress = await userProgress(auth.uid, id, found.refreshMonths);
    if (progress.quizViewId !== viewId) {
      return NextResponse.json({ error: "watch_first", message: "Watch the video before the quiz." }, { status: 409 });
    }

    const questions = await loadQuestions(id);
    if (!questions.length) return NextResponse.json({ error: "No questions for this module" }, { status: 404 });
    const result = scoreQuiz(questions, answers, found.module.pass_mark);

    const { data: attempt, error } = await supabaseAdmin
      .from("training_attempts")
      .insert({
        user_id: auth.uid,
        company_id: companyId,
        module_id: id,
        view_id: viewId,
        score: result.score,
        total: result.total,
        passed: result.passed,
        answers,
      })
      .select("id, submitted_at")
      .single();
    if (error || !attempt) {
      console.error("POST /api/training-modules/[id]/submit:", error);
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
        moduleTitle: found.module.title,
        fails: failsInARow((recent ?? []) as { passed: boolean }[]),
      }).catch((e) => console.warn("[training] repeated-fail note failed:", e));
    }

    return NextResponse.json({
      attemptId: attempt.id,
      score: result.score,
      total: result.total,
      passMark: Math.min(found.module.pass_mark, result.total),
      passed: result.passed,
      correctIds: result.correctIds,
      submittedAt: attempt.submitted_at,
    });
  } catch (e) {
    console.error("POST /api/training-modules/[id]/submit:", e);
    return NextResponse.json({ error: "Couldn't save your answers" }, { status: 500 });
  }
}
