import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DASHBOARD_ROLES = ["ADMIN", "admin", "SUPERVISOR", "supervisor", "superuser", "OPERATIVE", "operative", "sub_admin"];

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

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Clear stale auth cookies on login and auth callback – never preserve
  if (path.startsWith("/login") || path.startsWith("/admin/login") || path.startsWith("/auth/callback")) {
    const res = NextResponse.next();
    res.cookies.set("role", "", { path: "/", maxAge: 0 });
    res.cookies.set("user_email", "", { path: "/", maxAge: 0 });
    res.cookies.set("companyId", "", { path: "/", maxAge: 0 });
    res.cookies.set("impersonating", "", { path: "/", maxAge: 0 });
    res.cookies.set("session_id", "", { path: "/", maxAge: 0 });
    res.cookies.set("session_started_at", "", { path: "/", maxAge: 0 });
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
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|api).*)",
  ],
};
