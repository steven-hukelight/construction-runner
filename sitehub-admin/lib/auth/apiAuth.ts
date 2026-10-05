/**
 * Server-side identity check for API requests.
 *
 * The `role` / `uid` / `companyId` / `user_email` cookies are HttpOnly but not
 * signed, so they are only trusted once a credential proves who the caller is:
 *   1. `session_id` cookie → row in `user_sessions` (not revoked, not timed out), or
 *   2. `Authorization: Bearer <Supabase access token>` (Flutter app).
 * Privilege cookies that disagree with the verified `users` row are rejected.
 */
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  SESSION_ACTIVITY_WRITE_THROTTLE_MS,
  updateSessionActivity,
  validateSession,
} from "@/lib/sessions";

export type ApiCredentials = {
  sessionId?: string | null;
  bearerToken?: string | null;
  cookieUid?: string | null;
  cookieRole?: string | null;
  cookieCompanyId?: string | null;
  cookieEmail?: string | null;
};

export type VerifiedApiUser = {
  uid: string;
  /** `users.role` as stored; null for auth users without a `users` row. */
  dbRole: string | null;
  dbCompanyId: string | null;
  dbEmail: string | null;
  /** Email on the Supabase auth user (bearer only). */
  authEmail: string | null;
  isSuperuser: boolean;
  source: "session" | "bearer";
};

export type ApiAuthOutcome =
  | { ok: true; user: VerifiedApiUser }
  | { ok: false; reason: "no_credentials" | "invalid_credentials" | "cookie_mismatch" };

export function bearerTokenFrom(authorization: string | null | undefined): string | null {
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token || null;
}

async function userIdFromSession(sessionId: string): Promise<string | null> {
  try {
    const result = await validateSession(sessionId);
    if (!result.valid || !result.userId) return null;
    const last = result.lastActiveAtMs ?? 0;
    if (!last || Date.now() - last >= SESSION_ACTIVITY_WRITE_THROTTLE_MS) {
      await updateSessionActivity(sessionId).catch(() => {});
    }
    return result.userId;
  } catch {
    return null;
  }
}

async function authUserFromBearer(token: string): Promise<{ id: string; email: string | null } | null> {
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}

/** Role value the login handler writes to the `role` cookie for this user. */
export function expectedRoleCookie(user: VerifiedApiUser): string {
  if (user.isSuperuser) return "superuser";
  return (user.dbRole ?? "").trim() || "admin";
}

export function privilegeCookiesMatch(user: VerifiedApiUser, creds: ApiCredentials): boolean {
  const uid = creds.cookieUid?.trim();
  if (uid && uid !== user.uid) return false;

  const role = creds.cookieRole?.trim();
  if (role && role.toLowerCase() !== expectedRoleCookie(user).toLowerCase()) return false;

  const companyId = creds.cookieCompanyId?.trim();
  if (companyId && !user.isSuperuser && companyId !== (user.dbCompanyId ?? "")) return false;

  const email = creds.cookieEmail?.trim().toLowerCase();
  if (email && user.dbEmail && email !== user.dbEmail.trim().toLowerCase()) return false;

  return true;
}

export async function verifyApiCredentials(creds: ApiCredentials): Promise<ApiAuthOutcome> {
  const sessionId = creds.sessionId?.trim() || null;
  const bearer = creds.bearerToken?.trim() || null;
  if (!sessionId && !bearer) return { ok: false, reason: "no_credentials" };

  let uid: string | null = null;
  let authEmail: string | null = null;
  let source: VerifiedApiUser["source"] = "session";
  if (sessionId) uid = await userIdFromSession(sessionId);
  if (!uid && bearer) {
    const authUser = await authUserFromBearer(bearer);
    uid = authUser?.id ?? null;
    authEmail = authUser?.email ?? null;
    source = "bearer";
  }
  if (!uid) return { ok: false, reason: "invalid_credentials" };

  const { data: row } = await supabaseAdmin
    .from("users")
    .select("id, company_id, role, email")
    .eq("id", uid)
    .maybeSingle();

  const dbRole = (row?.role as string | null | undefined) ?? null;
  const user: VerifiedApiUser = {
    uid: (row?.id as string | undefined) ?? uid,
    dbRole,
    dbCompanyId: ((row?.company_id as string | null | undefined) ?? null) || null,
    dbEmail: (row?.email as string | null | undefined) ?? null,
    authEmail,
    isSuperuser: (dbRole ?? "").toLowerCase() === "superuser",
    source,
  };

  if (!privilegeCookiesMatch(user, creds)) return { ok: false, reason: "cookie_mismatch" };
  return { ok: true, user };
}
