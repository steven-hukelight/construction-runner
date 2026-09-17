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

    const fullName = clipLeadField(body.fullName, 120);
    const company = clipLeadField(body.company, 160);
    const email = clipLeadField(body.email, 320);
    const role = clipLeadField(body.role, 80);
    const sites = clipLeadField(body.sites, 40);
    const message = clipLeadField(body.message, 2000);

    if (!fullName || !company || !email || !role || !sites) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (!hasEmailTransportConfigured()) {
      console.error("POST /api/demo: no email transport configured");
      return NextResponse.json(
        { error: "Demo requests are not configured on the server." },
        { status: 503 }
      );
    }

    const to = LEAD_INBOX || FEEDBACK_EMAIL;
    const text = [
      "Demo request",
      "",
      `Name: ${fullName}`,
      `Company: ${company}`,
      `Email: ${email}`,
      `Role: ${role}`,
      `Sites: ${sites}`,
      message ? `Message:\n${message}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const sent = await sendPlainEmail(to, `Demo request — ${company}`, text);
    if (!sent.ok) {
      console.error("POST /api/demo: send failed", sent.error);
      return NextResponse.json({ error: "Could not send request. Try again later." }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing demo request:", error);
    return NextResponse.json({ error: "Failed to process demo request" }, { status: 500 });
  }
}
