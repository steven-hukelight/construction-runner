import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAMES, authCookieClearOptions } from "@/lib/authCookies";
import { bearerTokenFrom, verifyApiCredentials } from "@/lib/auth/apiAuth";
import { isAttendanceCronAuthorized } from "@/lib/attendanceCronAuth";

/** API routes that must work without a signed-in user. Exact paths only. */
export const PUBLIC_API_PATHS = new Set([
  "/api/auth/login",
  "/api/admin/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/auth/register/resend-code",
  "/api/auth/register/verify-email",
  "/api/auth/request-password-reset",
  "/api/auth/setup-password",
  "/api/invite-codes/redeem",
  "/api/app-version",
  "/api/settings/public",
  "/api/demo",
  "/api/notify",
  "/api/feedback",
]);

/** Scheduled jobs: allowed with `Authorization: Bearer CRON_SECRET` (or Vercel Cron), otherwise need a user. */
export const CRON_API_PATHS = new Set([
  "/api/attendance/archive",
  "/api/maintenance/retention-cleanup",
  "/api/maintenance/dispatch-attendance-push-queue",
  "/api/maintenance/dispatch-asset-inspection-reminders",
  "/api/maintenance/attendance-fallback-sign-out",
]);

function normalizeApiPath(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

async function guardApi(req: NextRequest): Promise<NextResponse> {
  const path = normalizeApiPath(req.nextUrl.pathname);
  if (req.method === "OPTIONS" || PUBLIC_API_PATHS.has(path)) return NextResponse.next();
  if (CRON_API_PATHS.has(path) && isAttendanceCronAuthorized(req)) return NextResponse.next();

  const outcome = await verifyApiCredentials({
    sessionId: req.cookies.get("session_id")?.value ?? null,
    bearerToken: bearerTokenFrom(req.headers.get("authorization")),
    cookieUid: req.cookies.get("uid")?.value ?? null,
    cookieRole: req.cookies.get("role")?.value ?? null,
    cookieCompanyId: req.cookies.get("companyId")?.value ?? req.cookies.get("company_id")?.value ?? null,
    cookieEmail: req.cookies.get("user_email")?.value ?? null,
  });
  if (!outcome.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.next();
}

const DASHBOARD_ROLES = ["ADMIN", "admin", "SUPERVISOR", "supervisor", "superuser", "OPERATIVE", "operative", "sub_admin", "site_admin"];

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/admin/login",
  "/admin",
  "/admin-setup",
  "/auth/callback",
  "/register",
  "/join",
  "/reset-password",
  "/setup-password",
  "/forgot-password",
  "/contact",
  "/legal",
];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}

const ADMIN_LOGIN = "/admin/login";

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path === "/api" || path.startsWith("/api/")) {
    return guardApi(req);
  }

  // Clear stale auth cookies on login and auth callback – never preserve
  if (path.startsWith("/login") || path.startsWith("/admin/login") || path.startsWith("/auth/callback")) {
    const res = NextResponse.next();
    for (const name of AUTH_COOKIE_NAMES) {
      res.cookies.set(name, "", authCookieClearOptions());
    }
    return res;
  }

  // Public paths: allow through without role (OAuth callback, registration, etc.)
  if (isPublicPath(path)) {
    return NextResponse.next();
  }

  const role = req.cookies.get("role")?.value;

  // If role cookie is missing or empty, treat as unauthenticated
  if (!role) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN, req.url));
  }

  // Protect /dashboard: allow ADMIN and superuser
  if (path.startsWith("/dashboard") && !DASHBOARD_ROLES.includes(role)) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN, req.url));
  }

  // /superuser: redirect to dashboard superuser home so one layout is used
  if (path === "/superuser") {
    return NextResponse.redirect(new URL("/dashboard/superuser-dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|Logo.png|Logo_sitehub.png|login-bg-plexus.png|apple-icon.png|fonts/|marketing/).*)",
  ],
};
