/**
 * Utility functions for cookie parsing and user session management
 */

function safeGetCookieString(): string {
  if (typeof document === "undefined") return "";
  try {
    return document.cookie;
  } catch {
    return "";
  }
}

function safeSetCookie(value: string): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = value;
  } catch {
    // Access denied (e.g. cross-origin iframe)
  }
}

export function getUserEmailFromCookie(): string {
  const cookies = safeGetCookieString().split(";");
  const emailCookie = cookies.find((c) => c.trim().startsWith("user_email="));
  return emailCookie ? decodeURIComponent(emailCookie.split("=")[1]) : "";
}

export function getUserIdFromCookie(): string {
  const cookies = safeGetCookieString().split(";");
  const idCookie = cookies.find((c) => c.trim().startsWith("user_id="));
  return idCookie ? decodeURIComponent(idCookie.split("=")[1]) : "";
}

export function sanitizeEmail(email: string): string {
  return email.replace(/[^a-zA-Z0-9]/g, '_');
}

/** Role from cookie (superuser, admin, etc.) */
export function getRoleFromClient(): string | null {
  const match = safeGetCookieString().match(/(?:^|; )role=([^;]*)/);
  return match ? decodeURIComponent(match[1]).trim() || null : null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns true if value is a valid UUID. */
export function isCompanyIdUuid(value: string): boolean {
  return Boolean(value && UUID_REGEX.test(value.trim()));
}

/** Raw companyId from cookie (no UUID validation). Use when company IDs may be non-UUID. */
export function getRawCompanyIdFromCookie(): string {
  const match = safeGetCookieString().match(/(?:^|; )companyId=([^;]*)/);
  return match ? decodeURIComponent(match[1]).trim() : "";
}

/**
 * Company ID from cookie (public.users.company_id).
 * Accepts any non-empty value (UUID or Firestore-style IDs).
 */
export function getCompanyIdFromClient(): string | null {
  const raw = getRawCompanyIdFromCookie();
  return raw || null;
}

/** Current site ID from cookie (e.g. when user is viewing a site or has selected one). */
export function getCurrentSiteIdFromCookie(): string | null {
  const match = safeGetCookieString().match(/(?:^|; )currentSiteId=([^;]*)/);
  return match ? decodeURIComponent(match[1]).trim() || null : null;
}
