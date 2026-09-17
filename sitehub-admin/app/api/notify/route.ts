import { NextRequest, NextResponse } from "next/server";
import { FEEDBACK_EMAIL } from "@/lib/feedback";
import {
  LEAD_INBOX,
  checkPublicLeadRateLimit,
  clipLeadField,
  publicLeadHoneypotTripped,
} from "@/lib/publicLeadGuard";
import { hasEmailTransportConfigured, sendPlainEmail } from "@/lib/sendPlainEmail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    if (publicLeadHoneypotTripped(body)) {
      return NextResponse.json({ success: true });
    }

    const limited = checkPublicLeadRateLimit(request);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const email = clipLeadField(body.email, 320);
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (!hasEmailTransportConfigured()) {
      console.error("POST /api/notify: no email transport configured");
      return NextResponse.json(
        { error: "Sign-up is not configured on the server." },
        { status: 503 }
      );
    }

    const to = LEAD_INBOX || FEEDBACK_EMAIL;
    const sent = await sendPlainEmail(
      to,
      "Early-access sign-up",
      `Early-access request\n\nEmail: ${email}`
    );
    if (!sent.ok) {
      console.error("POST /api/notify: send failed", sent.error);
      return NextResponse.json({ error: "Could not send request. Try again later." }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notify route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
