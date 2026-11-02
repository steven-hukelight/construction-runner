/**
 * Lets API routes reuse the identity the proxy already verified, without repeating the
 * session or bearer lookup. The proxy signs the verified user together with a digest of the
 * request's credentials; a route accepts it only if the signature is valid, it has not
 * expired, and the digest matches the credentials on the request it is handling. Anything
 * else falls back to the full check, so a forged or replayed header gains nothing.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { ApiCredentials, VerifiedApiUser } from "@/lib/auth/apiAuth";

export const PROXY_IDENTITY_HEADER = "x-cr-verified-identity";

const TTL_MS = 60_000;

function signingKey(): Buffer | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createHmac("sha256", secret).update("proxy-identity-v1").digest();
}

function credentialsDigest(creds: ApiCredentials): string {
  const parts = [creds.sessionId, creds.bearerToken, creds.cookieUid, creds.cookieRole, creds.cookieCompanyId, creds.cookieEmail];
  return createHash("sha256")
    .update(JSON.stringify(parts.map((p) => p?.trim() || "")))
    .digest("base64url");
}

function sign(key: Buffer, payload: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function signProxyIdentity(user: VerifiedApiUser, creds: ApiCredentials): string | null {
  const key = signingKey();
  if (!key) return null;
  const payload = Buffer.from(
    JSON.stringify({ user, digest: credentialsDigest(creds), exp: Date.now() + TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(key, payload)}`;
}

export function readProxyIdentity(token: string | null | undefined, creds: ApiCredentials): VerifiedApiUser | null {
  if (!token) return null;
  const key = signingKey();
  if (!key) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(key, payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      user?: VerifiedApiUser;
      digest?: string;
      exp?: number;
    };
    if (!parsed.user?.uid || typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    if (parsed.digest !== credentialsDigest(creds)) return null;
    return parsed.user;
  } catch {
    return null;
  }
}
