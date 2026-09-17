/**
 * Client-side session helpers.
 *
 * Auth cookies are HttpOnly. Privilege fields are hydrated from the server
 * layout (ClientSessionProvider), never from document.cookie.
 * currentSiteId is a UI preference cookie, not an auth cookie.
 */

export type ClientSessionSnapshot = {
  role: string | null;
  companyId: string | null;
  email: string;
  uid: string;
  impersonating: boolean;
  sessionStartedAt: number | null;
};

let clientSnapshot: ClientSessionSnapshot | null = null;

export function hydrateClientSession(snapshot: ClientSessionSnapshot): void {
  if (typeof window === "undefined") return;
  clientSnapshot = snapshot;
}

function snapshot(): ClientSessionSnapshot {
  return (
    clientSnapshot ?? {
      role: null,
      companyId: null,
      email: "",
      uid: "",
      impersonating: false,
      sessionStartedAt: null,
    }
  );
}

function safeGetCookieString(): string {
  if (typeof document === "undefined") return "";
  try {
    return document.cookie;
  } catch {
    return "";
  }
}

export function getUserEmailFromCookie(): string {
  return snapshot().email;
}

export function getUserIdFromCookie(): string {
  return snapshot().uid;
}

/** User ID (public.users.id) set after login. */
export function getUidFromCookie(): string {
  return snapshot().uid;
}

export function sanitizeEmail(email: string): string {
  return email.replace(/[^a-zA-Z0-9]/g, "_");
}

/** Role from the HttpOnly session (hydrated by ClientSessionProvider). */
export function getRoleFromClient(): string | null {
  return snapshot().role;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCompanyIdUuid(value: string): boolean {
  return Boolean(value && UUID_REGEX.test(value.trim()));
}

export function getRawCompanyIdFromCookie(): string {
  return snapshot().companyId ?? "";
}

export function getCompanyIdFromClient(): string | null {
  const raw = getRawCompanyIdFromCookie();
  return raw || null;
}

/** Current site ID — UI preference, not used for authz. */
export function getCurrentSiteIdFromCookie(): string | null {
  const match = safeGetCookieString().match(/(?:^|; )currentSiteId=([^;]*)/);
  return match ? decodeURIComponent(match[1]).trim() || null : null;
}

export function getSessionStartedAtFromClient(): number | null {
  return snapshot().sessionStartedAt;
}

export function getImpersonatingFromClient(): boolean {
  return snapshot().impersonating;
}
