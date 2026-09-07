/**
 * Session management: create, validate, update, revoke.
 */
import { supabaseAdmin } from "./supabaseAdmin";
import {
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_ABSOLUTE_TIMEOUT_MS,
} from "./securityConfig";

export interface SessionRecord {
  id: string;
  user_id: string;
  device_type: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  last_active_at: string;
  revoked_at: string | null;
}

export async function createSession(params: {
  userId: string;
  deviceType?: string;
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ id: string; createdAt: number }> {
  const { data, error } = await supabaseAdmin
    .from("user_sessions")
    .insert({
      user_id: params.userId,
      device_type: params.deviceType ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    })
    .select("id, created_at")
    .single();
  if (error) throw error;
  const createdAt = data.created_at ? new Date(data.created_at).getTime() : Date.now();
  return { id: data.id, createdAt };
}

export async function validateSession(sessionId: string): Promise<{
  valid: boolean;
  userId?: string;
  reason?: string;
  /** Epoch ms of the row's `last_active_at`. Present when a session row was
   *  found (even if invalid). Callers can use this to decide whether to
   *  bother writing an activity update. */
  lastActiveAtMs?: number;
}> {
  const { data, error } = await supabaseAdmin
    .from("user_sessions")
    .select("id, user_id, created_at, last_active_at, revoked_at")
    .eq("id", sessionId)
    .single();
  if (error || !data) {
    return { valid: false, reason: "session_not_found" };
  }
  const row = data as { revoked_at: string | null; created_at: string; last_active_at: string };
  const lastActiveAtMs = new Date(row.last_active_at).getTime();
  if (row.revoked_at) {
    return { valid: false, reason: "revoked", lastActiveAtMs };
  }
  const now = Date.now();
  const createdAt = new Date(row.created_at).getTime();
  if (now - lastActiveAtMs > SESSION_IDLE_TIMEOUT_MS) {
    return { valid: false, reason: "idle_timeout", lastActiveAtMs };
  }
  if (now - createdAt > SESSION_ABSOLUTE_TIMEOUT_MS) {
    return { valid: false, reason: "absolute_timeout", lastActiveAtMs };
  }
  return {
    valid: true,
    userId: (data as { user_id: string }).user_id,
    lastActiveAtMs,
  };
}

/**
 * How often the dashboard layout writes `last_active_at`. Lower = more
 * accurate "last seen" data, higher = fewer DB writes per navigation.
 * 5 minutes is well below the idle timeout so we can't accidentally expire
 * an active user.
 */
export const SESSION_ACTIVITY_WRITE_THROTTLE_MS = 5 * 60 * 1000;

export async function updateSessionActivity(sessionId: string): Promise<void> {
  await supabaseAdmin
    .from("user_sessions")
    .update({ last_active_at: new Date().toISOString() })
    .eq("id", sessionId)
    .is("revoked_at", null);
}

export async function revokeSession(sessionId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId);
  return !error;
}

export async function listActiveSessions(userId: string): Promise<SessionRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("last_active_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as SessionRecord[];
}
