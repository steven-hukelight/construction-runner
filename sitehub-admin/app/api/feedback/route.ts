import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FEEDBACK_CATEGORY_IDS, FEEDBACK_EMAIL } from "@/lib/feedback";
import { hasEmailTransportConfigured, sendPlainEmail } from "@/lib/sendPlainEmail";

export const dynamic = "force-dynamic";

const MAX_COMMENT = 8000;

/**
 * Public POST — sends app feedback to info@ (same transport as other transactional mail).
 * Optional session cookies add context; honeypot field rejects naive bots.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    if (String(body?.website ?? body?.url_website ?? "").trim() !== "") {
      return NextResponse.json({ ok: true });
    }

    const category = String(body?.category ?? "").trim().toLowerCase();
    if (!FEEDBACK_CATEGORY_IDS.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }

    const comment = String(body?.comment ?? "").trim();
    if (comment.length < 3) {
      return NextResponse.json({ error: "Please add a few words in the comments." }, { status: 400 });
    }
    if (comment.length > MAX_COMMENT) {
      return NextResponse.json({ error: "Comment is too long." }, { status: 400 });
    }

    const contactEmail = String(body?.contactEmail ?? "").trim().slice(0, 320);
    const pageUrl = String(body?.pageUrl ?? "").trim().slice(0, 2000);

    const cookieStore = await cookies();
    const sessionEmail = cookieStore.get("user_email")?.value?.trim();
    const uid = cookieStore.get("uid")?.value?.trim();

    const lines = [
      `Category: ${category}`,
      "",
      "Comments:",
      comment,
      "",
      "---",
      sessionEmail ? `Session email: ${sessionEmail}` : "Session: (not signed in or no email cookie)",
      uid ? `User id: ${uid}` : null,
      contactEmail ? `Contact email (optional): ${contactEmail}` : null,
      pageUrl ? `Page: ${pageUrl}` : null,
    ].filter(Boolean) as string[];

    const text = lines.join("\n");
    const subject = `Construction Runner feedback [${category}]`;

    if (!hasEmailTransportConfigured()) {
      console.error("POST /api/feedback: no email transport (RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_*)");
      return NextResponse.json(
        { error: "Feedback email is not configured on the server." },
        { status: 503 },
      );
    }

    const sent = await sendPlainEmail(FEEDBACK_EMAIL, subject, text);
    if (!sent.ok) {
      console.error("POST /api/feedback: send failed", sent.error);
      return NextResponse.json({ error: "Could not send feedback. Try again later." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/feedback:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
