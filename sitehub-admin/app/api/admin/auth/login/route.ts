/**
 * POST /api/admin/auth/login
 * Admin login endpoint with rate limiting.
 * Validates email/password via Supabase Auth, then sets role/user_email/companyId cookies.
 * Used by mobile app and web. WAF rules should target this path.
 */
import { NextResponse } from "next/server";
import { checkLoginRateLimit } from "@/lib/rateLimit";
import { handleLoginPost } from "@/lib/loginHandler";
import { logAuthEvent, getClientIp, getUserAgent } from "@/lib/authAudit";

export async function POST(req: Request) {
  const { success, retryAfter } = await checkLoginRateLimit(req);
  if (!success) {
    const body = await req.clone().json().catch(() => ({}));
    const emailAttempted = (body.email as string)?.trim() ?? "";
    await logAuthEvent({
      userId: null,
      emailAttempted,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
      outcome: "blocked",
    });
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      {
        status: 429,
        headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
      }
    );
  }
  return handleLoginPost(req);
}
