/**
 * Auth cookie names and attributes. Privilege cookies are always HttpOnly
 * so injected JS cannot read or overwrite role / session / company.
 */

export const AUTH_COOKIE_NAMES = [
  "role",
  "user_email",
  "uid",
  "companyId",
  "impersonating",
  "session_id",
  "session_started_at",
] as const;

export type AuthCookieName = (typeof AUTH_COOKIE_NAMES)[number];

const SECURE = process.env.NODE_ENV === "production";

export function authCookieSetOptions(maxAge: number) {
  return {
    path: "/" as const,
    maxAge,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: SECURE,
  };
}

export function authCookieClearOptions() {
  return {
    path: "/" as const,
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: SECURE,
  };
}

export function clearAuthCookiesOnResponse(res: { cookies: { set: (name: string, value: string, opts: ReturnType<typeof authCookieClearOptions>) => unknown } }) {
  for (const name of AUTH_COOKIE_NAMES) {
    res.cookies.set(name, "", authCookieClearOptions());
  }
}

/** Set-Cookie header value for NextResponse.headers.append (login handler). */
export function serializeAuthCookie(name: AuthCookieName, value: string, maxAge: number): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
    "HttpOnly",
  ];
  if (SECURE) parts.push("Secure");
  return parts.join("; ");
}

export function serializeAuthCookieClear(name: AuthCookieName): string {
  const parts = [`${name}=`, "Path=/", "Max-Age=0", "SameSite=Lax", "HttpOnly"];
  if (SECURE) parts.push("Secure");
  return parts.join("; ");
}
