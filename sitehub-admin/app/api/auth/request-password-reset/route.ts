import { NextResponse } from "next/server";
import { getServerPublicOrigin } from "@/lib/url";
import { recoveryPageUrl, sendRecoveryEmail } from "@/lib/sendPasswordReset";

export const dynamic = "force-dynamic";

/**
 * Public password-reset request. Always returns { ok: true } so we do not
 * leak whether an email exists. Generates a token_hash (or GoTrue mailer)
 * link that the web reset page can verify without a Flutter PKCE verifier.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: true });
    }

    const redirectUrl = recoveryPageUrl(getServerPublicOrigin());
    if (!redirectUrl.startsWith("http")) {
      console.error("request-password-reset: invalid public origin");
      return NextResponse.json({ ok: true });
    }

    try {
      await sendRecoveryEmail(email, redirectUrl);
    } catch (err) {
      const msg = ((err as { message?: string })?.message ?? "").toLowerCase();
      if (
        !msg.includes("user not found") &&
        !msg.includes("user-not-found") &&
        !msg.includes("unable to find user")
      ) {
        console.error("request-password-reset send failed", err);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("request-password-reset failed", err);
    return NextResponse.json({ ok: true });
  }
}
