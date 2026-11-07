import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { loadQuestions, moduleForUser, userProgress } from "@/lib/training/service";
import { quizForPhone } from "@/lib/training/rules";

/** Five questions in a fresh order, without the answers. Locked until the video has been watched. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const companyId = (auth.companyId ?? "").trim();
    if (!auth.uid || !companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const found = await moduleForUser(id, auth.uid, companyId);
    if (!found) return NextResponse.json({ error: "This module isn't switched on for your company" }, { status: 404 });

    const progress = await userProgress(auth.uid, id, found.refreshMonths);
    if (!progress.quizViewId) {
      return NextResponse.json({ error: "watch_first", message: "Watch the video before the quiz." }, { status: 409 });
    }
    const questions = await loadQuestions(id);
    if (!questions.length) return NextResponse.json({ error: "No questions for this module" }, { status: 404 });

    return NextResponse.json({
      viewId: progress.quizViewId,
      passMark: Math.min(found.module.pass_mark, questions.length),
      questions: quizForPhone(questions),
    });
  } catch (e) {
    console.error("GET /api/training-modules/[id]/quiz:", e);
    return NextResponse.json({ error: "Couldn't load the quiz" }, { status: 500 });
  }
}
