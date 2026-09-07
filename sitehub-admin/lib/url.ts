const LEGACY_APEX_SITE = "https://construction-runner.com";
/** Canonical public web origin (Supabase redirect URLs must match exactly). */
export const CANONICAL_SITE_URL = "https://www.construction-runner.com";

/**
 * Normalize env-configured site URLs: legacy apex → www for Supabase auth redirects.
 */
export function normalizeSiteUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, "");
  if (!trimmed) return trimmed;
  const withProto = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
  if (withProto === LEGACY_APEX_SITE) return CANONICAL_SITE_URL;
  return withProto;
}

/**
 * Server: resolve public site origin from env. SUPABASE_REDIRECT_URL may be a full `/auth/callback` URL.
 */
export function getSiteUrlFromEnv(): string | undefined {
  const tryNormalize = (raw: string | undefined): string | undefined => {
    const t = raw?.trim();
    if (!t) return undefined;
    return normalizeSiteUrl(t);
  };

  const fromDirect =
    tryNormalize(process.env.NEXT_PUBLIC_SITE_URL) ||
    tryNormalize(process.env.SUPABASE_SITE_URL) ||
    tryNormalize(process.env.NEXT_PUBLIC_BASE_URL) ||
    tryNormalize(process.env.NEXTAUTH_URL);
  if (fromDirect) return fromDirect;

  const redirect = process.env.SUPABASE_REDIRECT_URL?.trim();
  if (redirect) {
    try {
      return normalizeSiteUrl(new URL(redirect).origin);
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

/** Origin for server-generated absolute links (emails, fetch-to-self) — normalizes legacy apex → www. */
export function getServerPublicOrigin(): string {
  return normalizeSiteUrl(
    getSiteUrlFromEnv() ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

/**
 * Client (and SSR-safe fallback): origin for Supabase redirectTo / emailRedirectTo.
 * Uses localhost as-is; maps legacy apex hostname to www; honors NEXT_PUBLIC_* env when set.
 */
export function getAuthRedirectOrigin(): string {
  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
    if (hostname === "construction-runner.com") return CANONICAL_SITE_URL;
  }
  const fromEnv =
    getSiteUrlFromEnv() ||
    (typeof window !== "undefined" ? normalizeSiteUrl(window.location.origin) : undefined);
  if (fromEnv) return fromEnv;
  return CANONICAL_SITE_URL;
}

/**
 * Get the absolute URL for API calls in server components
 * Falls back to localhost in development
 */
export function getBaseUrl(): string {
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

  // Prefer localhost when running locally to avoid hitting production domains during dev/SSR.
  if (!isProd) {
    return "http://localhost:3000";
  }

  const fromEnv = getSiteUrlFromEnv();
  if (fromEnv) return fromEnv;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
