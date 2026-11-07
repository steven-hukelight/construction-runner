import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { moduleForUser, questionsForCompany, signedDocumentUrl, signedVideoUrl } from "@/lib/training/service";
import { DOCUMENT_MIN_READ_SECONDS, quizForPhone } from "@/lib/training/rules";

/**
 * Everything the phone needs to take this module with no signal: a short-lived link to download
 * our own video or the company's PDF, and the questions without the answers. Publisher films
 * stay on the publisher's site, so they cannot be saved.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const companyId = (auth.companyId ?? "").trim();
    if (!auth.uid || !companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const found = await moduleForUser(id, auth.uid, companyId);
    if (!found) return NextResponse.json({ error: "This module isn't switched on for your company" }, { status: 404 });
    const { module } = found;
    if (!module.document_path && !module.video_path) {
      return NextResponse.json(
        { error: "not_saveable", message: "This video is on the publisher's website, so it can't be saved." },
        { status: 409 },
      );
    }

    const isDocument = Boolean(module.document_path);
    const url = isDocument ? await signedDocumentUrl(module.document_path!) : await signedVideoUrl(module.video_path!);
    if (!url) return NextResponse.json({ error: "Couldn't prepare the download" }, { status: 502 });
    const questions = await questionsForCompany(id, companyId);
    if (!questions.length) return NextResponse.json({ error: "No questions for this module" }, { status: 404 });

    return NextResponse.json({
      format: isDocument ? "document" : "video",
      url,
      minSeconds: isDocument ? DOCUMENT_MIN_READ_SECONDS : module.min_watch_seconds,
      passMark: Math.min(module.pass_mark, questions.length),
      questions: quizForPhone(questions),
    });
  } catch (e) {
    console.error("GET /api/training-modules/[id]/offline:", e);
    return NextResponse.json({ error: "Couldn't prepare the download" }, { status: 500 });
  }
}
