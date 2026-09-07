import { NextRequest, NextResponse } from "next/server";

/**
 * Early-access sign-up for the marketing landing page.
 * Set RESEND_API_KEY in env to send emails; otherwise logs to console.
 */
const RECIPIENT = process.env.DEMO_RECIPIENT_EMAIL ?? "info@construction-runner.com";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    if (!body.email || typeof body.email !== "string") {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }
    const email = body.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Log sign-ups. To send email, install resend and add sending in this route.
    console.log("Early-access sign-up:", { email, at: new Date().toISOString(), notifyRecipient: RECIPIENT });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Notify route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
