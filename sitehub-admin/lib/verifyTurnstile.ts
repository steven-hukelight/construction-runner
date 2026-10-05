/**
 * Cloudflare Turnstile (free CAPTCHA). When keys are not configured, verification
 * is skipped so local/dev still works — set NEXT_PUBLIC_TURNSTILE_SITE_KEY +
 * TURNSTILE_SECRET_KEY in production.
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();

  // Not configured: allow (email OTP still protects signup).
  if (!secret || !siteKey) {
    return { ok: true };
  }

  if (!token || typeof token !== "string" || token.trim().length < 10) {
    return { ok: false, error: "Please complete the CAPTCHA" };
  }

  try {
    const body = new URLSearchParams();
    body.set("secret", secret);
    body.set("response", token.trim());
    if (remoteIp) body.set("remoteip", remoteIp);

    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!json.success) {
      return { ok: false, error: "CAPTCHA failed. Please try again." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "CAPTCHA verification unavailable. Please try again." };
  }
}

export function turnstileConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
    process.env.TURNSTILE_SECRET_KEY?.trim()
  );
}
