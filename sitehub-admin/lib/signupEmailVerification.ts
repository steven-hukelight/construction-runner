import { createHash, randomInt } from "crypto";
import { sendPlainEmail } from "@/lib/sendPlainEmail";

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

export function hashSignupOtp(code: string): string {
  return createHash("sha256").update(`${code.trim()}:${otpPepper()}`).digest("hex");
}

export function signupOtpExpiresAt(fromMs = Date.now()): string {
  return new Date(fromMs + OTP_TTL_MS).toISOString();
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
  const exp = new Date(params.expiresAt).getTime();
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return { ok: false, error: "Code expired. Request a new code." };
  }
  const incoming = hashSignupOtp(params.code);
  if (incoming !== params.hash) {
    return { ok: false, error: "Invalid code" };
  }
  return { ok: true };
}

export async function sendSignupVerificationEmail(
  email: string,
  code: string
): Promise<{ ok: boolean; error?: string }> {
  const subject = "Verify your Construction Runner email";
  const text = `Your verification code is: ${code}

Enter this code on the registration page to confirm your email.
It expires in 15 minutes.

If you did not sign up for Construction Runner, you can ignore this email.`;
  const result = await sendPlainEmail(email, subject, text);
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
