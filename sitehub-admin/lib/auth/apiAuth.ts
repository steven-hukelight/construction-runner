/**
 * Server-side identity check for API requests.
 *
 * The `role` / `uid` / `companyId` / `user_email` cookies are HttpOnly but not
 * signed, so they are only trusted once a credential proves who the caller is:
 *   1. `session_id` cookie → row in `user_sessions` (not revoked, not timed out), or
 *   2. `Authorization: Bearer <Supabase access token>` (Flutter app).
 * Privilege cookies that disagree with the verified `users` row are rejected.
 */
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readProxyIdentity } from "@/lib/auth/proxyIdentity";
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
  /** Signed identity the proxy attached after verifying this same request. */
  proxyIdentity?: string | null;
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

const VERIFIED_TTL_MS = 30_000;
const VERIFIED_CACHE_MAX = 1000;
const verifiedCache = new Map<string, { at: number; user: Promise<VerifiedApiUser | null> }>();

function cacheKey(sessionId: string | null, bearer: string | null): string {
  return createHash("sha256").update(`${sessionId ?? ""}\u0000${bearer ?? ""}`).digest("base64url");
}

/** Drops a revoked web session from this instance's cache; other instances expire it within the TTL. */
export function forgetVerifiedSession(sessionId: string): void {
  verifiedCache.delete(cacheKey(sessionId.trim(), null));
}

/** Shares one lookup between the parallel requests a page makes; the privilege-cookie check still runs per request. */
function cachedLookup(sessionId: string | null, bearer: string | null): Promise<VerifiedApiUser | null> {
  if (process.env.NODE_ENV === "test") return lookupUser(sessionId, bearer);
  const key = cacheKey(sessionId, bearer);
  const now = Date.now();
  const hit = verifiedCache.get(key);
  if (hit && now - hit.at < VERIFIED_TTL_MS) return hit.user;
  if (verifiedCache.size >= VERIFIED_CACHE_MAX) {
    for (const [k, v] of verifiedCache) if (now - v.at >= VERIFIED_TTL_MS) verifiedCache.delete(k);
    if (verifiedCache.size >= VERIFIED_CACHE_MAX) verifiedCache.clear();
  }
  const user = lookupUser(sessionId, bearer).catch(() => null);
  verifiedCache.set(key, { at: now, user });
  void user.then((u) => {
    if (!u && verifiedCache.get(key)?.user === user) verifiedCache.delete(key);
  });
  return user;
}

async function lookupUser(sessionId: string | null, bearer: string | null): Promise<VerifiedApiUser | null> {
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
  if (!uid) return null;

  let { data: row } = await supabaseAdmin
    .from("users")
    .select("id, company_id, role, email")
    .eq("id", uid)
    .maybeSingle();
  // Legacy accounts have a public.users.id that differs from the auth id; match on the verified auth email.
  if (!row && source === "bearer" && authEmail) {
    const pattern = authEmail.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    ({ data: row } = await supabaseAdmin
      .from("users")
      .select("id, company_id, role, email")
      .ilike("email", pattern)
      .maybeSingle());
  }

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
  return user;
}

export async function verifyApiCredentials(creds: ApiCredentials): Promise<ApiAuthOutcome> {
  const sessionId = creds.sessionId?.trim() || null;
  const bearer = creds.bearerToken?.trim() || null;
  if (!sessionId && !bearer) return { ok: false, reason: "no_credentials" };

  const fromProxy = readProxyIdentity(creds.proxyIdentity, creds);
  if (fromProxy && privilegeCookiesMatch(fromProxy, creds)) return { ok: true, user: fromProxy };

  const user = await cachedLookup(sessionId, bearer);
  if (!user) return { ok: false, reason: "invalid_credentials" };

  if (!privilegeCookiesMatch(user, creds)) return { ok: false, reason: "cookie_mismatch" };
  return { ok: true, user };
}
