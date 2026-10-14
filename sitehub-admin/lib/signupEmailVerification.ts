import { createHash, randomBytes, randomInt } from "crypto";
import { sendPlainEmail } from "@/lib/sendPlainEmail";
import { getServerPublicOrigin } from "@/lib/url";

const OTP_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function otpPepper(): string {
  return (
    process.env.SIGNUP_OTP_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "construction-runner-signup-otp"
  );
}

export function generateSignupOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function generateSignupLinkToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSignupOtp(code: string): string {
  return createHash("sha256").update(`${code.trim()}:${otpPepper()}`).digest("hex");
}

export function hashSignupLinkToken(token: string): string {
  return hashSignupOtp(token.trim().toLowerCase());
}

export function signupOtpExpiresAt(fromMs = Date.now()): string {
  return new Date(fromMs + OTP_TTL_MS).toISOString();
}

export function isSignupTokenExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  const exp = new Date(expiresAt).getTime();
  return !Number.isFinite(exp) || Date.now() > exp;
}

export function signupVerifyUrl(token: string): string {
  const origin = getServerPublicOrigin().replace(/\/$/, "");
  return `${origin}/api/auth/register/verify-email?token=${encodeURIComponent(token)}`;
}

export function verifySignupOtpHash(params: {
  code: string;
  hash: string | null | undefined;
  expiresAt: string | null | undefined;
  attempts?: number | null;
}): { ok: true } | { ok: false; error: string } {
  const attempts = typeof params.attempts === "number" ? params.attempts : 0;
  if (attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }
  if (!params.hash || !params.expiresAt) {
    return { ok: false, error: "No verification code on file. Request a new code." };
  }
  if (isSignupTokenExpired(params.expiresAt)) {
    return { ok: false, error: "Code expired. Request a new code." };
  }
  const incoming = hashSignupOtp(params.code);
  if (incoming !== params.hash) {
    return { ok: false, error: "Invalid code" };
  }
  return { ok: true };
}

export function verifySignupLinkTokenHash(params: {
  token: string;
  hash: string | null | undefined;
  expiresAt: string | null | undefined;
}): { ok: true } | { ok: false; error: string } {
  if (!params.hash || !params.expiresAt) {
    return { ok: false, error: "This verification link is not valid." };
  }
  if (isSignupTokenExpired(params.expiresAt)) {
    return { ok: false, error: "This verification link has expired. Sign up again or request a new email." };
  }
  if (hashSignupLinkToken(params.token) !== params.hash) {
    return { ok: false, error: "This verification link is not valid." };
  }
  return { ok: true };
}

export async function sendSignupVerificationEmail(params: {
  email: string;
  code: string;
  verifyUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const subject = "Verify your Construction Runner email";
  const text = `Confirm this email address for Construction Runner by opening this link:

${params.verifyUrl}

Or enter this 6-digit code in the app or on the website: ${params.code}

The link and code expire in 15 minutes.

If you did not sign up for Construction Runner, you can ignore this email.`;
  const result = await sendPlainEmail(params.email, subject, text);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error === "not_configured"
          ? "Email sending is not configured"
          : "Failed to send verification email",
    };
  }
  return { ok: true };
}

export { OTP_TTL_MS, MAX_ATTEMPTS };
