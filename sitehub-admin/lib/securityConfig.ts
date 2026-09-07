/**
 * Centralised security configuration.
 * Single source of truth for session, rate limit, audit, and cookie settings.
 */

// Session timeouts (ms)
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const SESSION_ABSOLUTE_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

// Cookie max ages (seconds) - used for session cookies
// RememberMe extends cookie lifetime but absolute timeout still applies
export const COOKIE_MAX_AGE_REMEMBER = 30 * 24 * 60 * 60; // 30 days
export const COOKIE_MAX_AGE_DEFAULT = 24 * 60 * 60; // 24 hours (matches absolute timeout)

/** Worker mobile app (X-Client: mobile): keep users signed in across days without re-entering password. */
export const COOKIE_MAX_AGE_MOBILE_APP = 90 * 24 * 60 * 60; // 90 days

// Rate limiting
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_MAX_ATTEMPTS = 10;

// Suspicious login detection
export const SUSPICIOUS_NEW_DEVICE = true;
export const SUSPICIOUS_NEW_IP = true;
export const SUSPICIOUS_NEW_COUNTRY = true;

// Allowed origins for CORS (comma-separated in env, or defaults)
export function getAllowedOrigins(): string[] {
  const raw = process.env.SECURITY_ALLOWED_ORIGINS ?? "";
  if (!raw.trim()) return [];
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

// Cookie settings
export const COOKIE_SETTINGS = {
  path: "/" as const,
  httpOnly: false,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
