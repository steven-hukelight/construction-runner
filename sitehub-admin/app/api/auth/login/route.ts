/**
 * POST /api/auth/login (legacy)
 * For backward compatibility with mobile app. Wraps rate limiting and delegates to shared handler.
 * Canonical admin login endpoint: POST /api/admin/auth/login
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
