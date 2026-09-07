/**
 * Auth audit logging for login attempts.
 */
import { supabaseAdmin } from "./supabaseAdmin";

export type AuthOutcome = "success" | "failure" | "blocked";

export async function logAuthEvent(params: {
  userId: string | null;
  emailAttempted: string;
  ipAddress: string;
  userAgent: string;
  outcome: AuthOutcome;
}): Promise<void> {
  try {
    await supabaseAdmin.from("auth_logs").insert({
      user_id: params.userId,
      email_attempted: params.emailAttempted,
      ip_address: params.ipAddress,
      user_agent: params.userAgent ?? null,
      outcome: params.outcome,
    });
  } catch (e) {
    console.warn("Auth audit log failed:", e);
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return (forwarded?.split(",")[0]?.trim() || realIp || "unknown").slice(0, 255);
}

export function getUserAgent(req: Request): string {
  return (req.headers.get("user-agent") || "").slice(0, 512);
}
