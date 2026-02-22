# SiteHub Admin – Security & Role Enforcement Audit Report

**Audit Date:** February 17, 2025  
**Scope:** Functions, server actions, API routes, dashboard components

---

## Executive Summary

This audit identified **14 distinct issues** across role enforcement, company scoping, session validation, cookie handling, and access control. Issues are ordered by severity (Critical → High → Medium → Low).

---

## Critical Issues

### Issue 1: `/api/auth/registrations` – No Auth on GET or POST

**File:** `app/api/auth/registrations/route.ts`  
**Lines:** 4–15 (GET), 17–31 (POST)

**Problem:**  
- **GET**: Returns ALL pending registrations across ALL companies with no authentication. Anyone can enumerate pending signups.  
- **POST**: `approverRole` is taken from the request body. An attacker can send `approverRole: "SUPERUSER"` to bypass approval restrictions and approve any registration.

**Proposed Fix:**

```diff
--- a/sitehub-admin/app/api/auth/registrations/route.ts
+++ b/sitehub-admin/app/api/auth/registrations/route.ts
@@ -1,10 +1,24 @@
 import { NextResponse } from "next/server";
+import { cookies } from "next/headers";
 import { supabaseAdmin } from "@/lib/supabaseAdmin";

 export async function GET() {
   try {
+    const cookieStore = await cookies();
+    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
+    const companyId = cookieStore.get("companyId")?.value?.trim() ?? null;
+
+    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
+    if (role !== "superuser" && role !== "admin" && role !== "supervisor") {
+      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
+    }
+
     const { data } = await supabaseAdmin.from("registrations").select("id, data");
     const regs = (data ?? [])
       .filter((r) => ((r.data as { status?: string })?.status ?? "") === "PENDING" || ((r.data as { status?: string })?.status ?? "") === "COMPANY_ADMIN_PENDING")
+      .filter((r) => {
+        if (role === "superuser") return true;
+        const regData = r.data as { companyId?: string };
+        return (regData?.companyId ?? "") === (companyId ?? "");
+      })
       .map((r) => ({ id: r.id, ...(r.data as object) }));
     return NextResponse.json(regs);
   } catch (err) {
@@ -17,7 +31,15 @@ export async function POST(req: Request) {
   try {
     const body = await req.json();
     const { id, role, approverRole } = body;
     if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
+
+    const cookieStore = await cookies();
+    const actualApproverRole = (cookieStore.get("role")?.value ?? "").toLowerCase();
+    if (!actualApproverRole) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
+
+    const effectiveApproverRole = actualApproverRole === "superuser" ? "SUPERUSER" : actualApproverRole.toUpperCase();

     if (role === "ADMIN" || role === "SUPERVISOR") {
-      if (approverRole !== "ADMIN" && approverRole !== "SUPERUSER") {
+      if (effectiveApproverRole !== "ADMIN" && effectiveApproverRole !== "SUPERUSER") {
         return NextResponse.json({ error: "Only approved ADMIN or SUPERUSER can approve ADMIN/SUPERVISOR roles" }, { status: 403 });
       }
     } else if (role === "OPERATIVE") {
-      if (approverRole !== "ADMIN" && approverRole !== "SUPERVISOR" && approverRole !== "SUPERUSER") {
+      if (effectiveApproverRole !== "ADMIN" && effectiveApproverRole !== "SUPERVISOR" && effectiveApproverRole !== "SUPERUSER") {
         return NextResponse.json({ error: "Only approved ADMIN/SUPERVISOR or SUPERUSER can approve OPERATIVE role" }, { status: 403 });
       }
     }
```

---

### Issue 2: Registration Approve/Reject Routes – No Auth

**Files:**  
- `app/api/registrations/[id]/approve/route.ts`  
- `app/api/registrations/[id]/reject/route.ts`  
- `app/api/auth/registrations/[id]/reject/route.ts`

**Problem:** Anyone can approve or reject any registration by ID. No role or session validation.

**Proposed Fix (registrations approve):**

```diff
--- a/sitehub-admin/app/api/registrations/[id]/approve/route.ts
+++ b/sitehub-admin/app/api/registrations/[id]/approve/route.ts
@@ -1,8 +1,18 @@
 import { NextResponse } from "next/server";
+import { cookies } from "next/headers";
 import { supabaseAdmin } from "@/lib/supabaseAdmin";
 import sendWelcomeEmail from "@/lib/sendWelcomeEmail";

 export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
+  const role = (await cookies()).get("role")?.value;
+  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
+  const roleLower = role.toLowerCase();
+  if (roleLower !== "superuser" && roleLower !== "admin" && roleLower !== "supervisor") {
+    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
+  }
+
   const { id: regId } = await params;
```

Apply similar auth checks to both reject routes, including company scoping for non-superusers (registration must belong to approver’s company).

---

### Issue 3: `/api/debug-user-lookup` – Unprotected

**File:** `app/api/debug-user-lookup/route.ts`  
**Lines:** 9–41

**Problem:** No auth. Any requester can look up user data by email (`id`, `email`, `role`, `company_id`). Comment already notes it should be removed or protected in production.

**Proposed Fix:** Either remove the route or restrict to superuser:

```diff
--- a/sitehub-admin/app/api/debug-user-lookup/route.ts
+++ b/sitehub-admin/app/api/debug-user-lookup/route.ts
@@ -1,12 +1,19 @@
 import { NextResponse } from "next/server";
+import { cookies } from "next/headers";
 import { supabaseAdmin } from "@/lib/supabaseAdmin";

 export async function GET(req: Request) {
+  const role = (await cookies()).get("role")?.value;
+  if (role?.toLowerCase() !== "superuser") {
+    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
+  }
+
   const email = new URL(req.url).searchParams.get("email")?.trim();
```

---

## High Issues

### Issue 4: Proxy Blocks Operatives from Dashboard (Login Loop)

**File:** `proxy.ts`  
**Lines:** 3, 36–38, 40–42

**Problem:**  
- `DASHBOARD_ROLES` includes admin, supervisor, superuser but not `operative` or `sub_admin`.  
- Operatives are explicitly blocked (lines 36–38) from non-public paths.  
- After OAuth callback, users are redirected to `/dashboard`; operatives hit the proxy and get redirected to `/login`, causing a login loop.  
- `dashboard/page.tsx` supports operatives and redirects them to `operative-dashboard`, but they never reach it.

**Proposed Fix:**

```diff
--- a/sitehub-admin/proxy.ts
+++ b/sitehub-admin/proxy.ts
@@ -1,7 +1,7 @@
 import { NextResponse } from "next/server";

-const DASHBOARD_ROLES = ["ADMIN", "admin", "SUPERVISOR", "supervisor", "superuser"];
+const DASHBOARD_ROLES = ["ADMIN", "admin", "SUPERVISOR", "supervisor", "superuser", "OPERATIVE", "operative", "sub_admin"];

 const PUBLIC_PATHS = ["/login", "/auth/callback", "/register", "/join", "/reset-password", "/setup-password", "/forgot-password"];

@@ -32,11 +32,6 @@ export function proxy(req: any) {
     return NextResponse.redirect(new URL("/login", req.url));
   }

-  // Block OPERATIVE role from all web access except logout
-  if (role === "OPERATIVE" && !path.startsWith("/login") && !path.startsWith("/register")) {
-    return NextResponse.redirect(new URL("/login", req.url));
-  }
-
   // Protect /dashboard: allow ADMIN and superuser
   if (path.startsWith("/dashboard") && !DASHBOARD_ROLES.includes(role)) {
```

If operatives should be mobile-only, keep the operative block but stop redirecting post-login to `/dashboard` for operatives (e.g., send them to a mobile landing page).

---

### Issue 5: Hardcoded Superuser Fallback

**File:** `app/login/actions.ts`  
**Lines:** 70–72

**Problem:** Fallback for `steven_hukelight@yahoo.co.uk` grants superuser when not found in `users`. Anyone with that email could gain superuser access.

**Proposed Fix:** Remove the fallback; rely on proper data and lookup:

```diff
--- a/sitehub-admin/app/login/actions.ts
+++ b/sitehub-admin/app/login/actions.ts
@@ -66,10 +66,6 @@ export async function setUserCookies(
     if (res.data) dbUser = res.data;
     }

-    // 5. Temporary: known superuser email when all lookups fail (remove after root cause fixed)
-    if (!dbUser && emailTrimmed.toLowerCase() === "steven_hukelight@yahoo.co.uk") {
-      dbUser = { company_id: null, role: "superuser" };
-    }
-
     if (dbUser) {
```

---

### Issue 6: `/api/auth/send-password-reset` – Role Case Sensitivity

**File:** `app/api/auth/send-password-reset/route.ts`  
**Line:** 10

**Problem:** Checks `role !== "ADMIN"` (uppercase). Cookies store role as returned from DB (often `"admin"`). Company admins may get 403 when sending password resets.

**Proposed Fix:**

```diff
--- a/sitehub-admin/app/api/auth/send-password-reset/route.ts
+++ b/sitehub-admin/app/api/auth/send-password-reset/route.ts
@@ -7,7 +7,8 @@ import nodemailer from "nodemailer";
 export async function POST(req: Request) {
   try {
     const role = (await cookies()).get("role")?.value;
-    if (role !== "superuser" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
+    const roleLower = (role ?? "").toLowerCase();
+    if (roleLower !== "superuser" && roleLower !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

---

### Issue 7: Induction Reset – Insufficient Role Check

**File:** `app/api/induction/reset/route.ts`  
**Lines:** 17–23

**Problem:** Comment says “Admin/same company or superuser only,” but code only checks superuser or same company. Any same-company user (including operatives) can reset another user’s induction.

**Proposed Fix:**

```diff
--- a/sitehub-admin/app/api/induction/reset/route.ts
+++ b/sitehub-admin/app/api/induction/reset/route.ts
@@ -14,10 +14,12 @@ export async function POST(req: Request) {
     const role = (await cookies()).get("role")?.value;
     const companyId = (await cookies()).get("companyId")?.value;

     let canProceed = false;
     if (role === "superuser") canProceed = true;
-    else if (companyId) {
+    else if (companyId && (role === "admin" || role === "ADMIN" || role === "supervisor" || role === "SUPERVISOR")) {
       const { data: user } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).maybeSingle();
```

---

## Medium Issues

### Issue 8: `/api/company-name` – No Auth

**File:** `app/api/company-name/route.ts`  
**Lines:** 5–15

**Problem:** No auth. Any requester can get a company name by ID (minor info disclosure).

**Proposed Fix:** Require at least authenticated user and company-scoped access:

```diff
--- a/sitehub-admin/app/api/company-name/route.ts
+++ b/sitehub-admin/app/api/company-name/route.ts
@@ -1,12 +1,21 @@
 import { NextResponse } from "next/server";
+import { cookies } from "next/headers";
 import { supabaseAdmin } from "@/lib/supabaseAdmin";

 export async function GET(req: Request) {
   try {
     const companyIdParam = new URL(req.url).searchParams.get("companyId");
     if (!companyIdParam) return NextResponse.json({ error: "companyId required" }, { status: 400 });
+
+    const cookieStore = await cookies();
+    const role = cookieStore.get("role")?.value?.toLowerCase();
+    const userCompanyId = cookieStore.get("companyId")?.value?.trim();
+    if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
+    if (role !== "superuser" && userCompanyId !== companyIdParam) {
+      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
+    }
+
     const { data } = await supabaseAdmin.from("companies").select("name").eq("id", companyIdParam).single();
```

---

### Issue 9: Deprecated/Stale References

**File:** `app/api/auth/registrations/route.ts`  
**Line:** 109

**Problem:** Uses `process.env.NEXTAUTH_URL` for internal fetch. Project uses Supabase; NextAuth is legacy.

**Proposed Fix:** Prefer app base URL:

```diff
-    try {
-      await fetch(`${process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")}/api/auth/send-password-reset`, {
+    try {
+      const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
+      await fetch(`${base.replace(/\/$/, "")}/api/auth/send-password-reset`, {
```

---

### Issue 10: Dashboard `VALID_ROLES` Missing `sub_admin`

**File:** `app/dashboard/page.tsx`  
**Line:** 4

**Problem:** `VALID_ROLES` includes superuser, admin, supervisor, operative but not `sub_admin`. If subcontractor admins use the dashboard, they may be redirected to login. Proxy also excludes `sub_admin` from `DASHBOARD_ROLES` (see Issue 4).

**Proposed Fix:** Add `sub_admin` to `VALID_ROLES` and define a redirect for them (e.g. subcontractor dashboard or admin dashboard):

```diff
-const VALID_ROLES = ["superuser", "admin", "ADMIN", "supervisor", "SUPERVISOR", "operative", "OPERATIVE"];
+const VALID_ROLES = ["superuser", "admin", "ADMIN", "supervisor", "SUPERVISOR", "operative", "OPERATIVE", "sub_admin"];
```

And add handling:

```ts
if (roleLower === "sub_admin") {
  redirect("/dashboard/admin-dashboard"); // or a dedicated sub-admin dashboard
}
```

---

## Low / Informational

### Issue 11: `/api/me` – No Session Validation

**File:** `app/api/me/route.ts`  
**Lines:** 9–13

**Problem:** Trusts `user_email` cookie only; does not validate Supabase session. Cookies could be stolen or forged. This matches the current cookie-based design but is weaker than server-side session validation.

**Recommendation:** Consider validating Supabase session server-side and/or tying cookies to session tokens. No immediate change proposed.

---

### Issue 12: Legacy `firebase_uid` Lookup

**File:** `app/dashboard/users/[userId]/page.tsx`  
**Lines:** 20–24

**Problem:** User lookup uses `id.eq.${userId}` or `firebase_uid.eq.${userId}`. `firebase_uid` is legacy; may be unnecessary if migration is complete.

**Recommendation:** Confirm Firebase migration status; remove `firebase_uid` once no longer needed.

---

### Issue 13: `companyId` Null Handling for Superuser

**File:** Various API routes

**Problem:** Some routes may not handle `companyId === null` for superusers correctly (e.g. `if (!companyId) return []` when superuser should see all).

**Status:** Spot checks show most routes handle superuser with `role === "superuser"` before company checks. Recommend a focused pass on all company-scoped APIs.

---

### Issue 14: Role Case Inconsistency

**Problem:** Role checks use mixed casing: `role === "ADMIN"`, `roleLower === "admin"`, `role === "superuser"`. Cookie values depend on DB; casing can cause incorrect access control.

**Recommendation:** Standardize: always normalize role before comparison, e.g. `const roleLower = (role ?? "").toLowerCase();` then use `roleLower` in checks.

---

## Summary Table

| # | Severity | File(s) | Summary |
|---|----------|---------|---------|
| 1 | Critical | `app/api/auth/registrations/route.ts` | No auth on GET; approverRole from body on POST |
| 2 | Critical | `app/api/registrations/[id]/approve`, `reject`, `auth/registrations/[id]/reject` | No auth on approve/reject |
| 3 | Critical | `app/api/debug-user-lookup/route.ts` | Unprotected user lookup |
| 4 | High | `proxy.ts` | Operative/sub_admin blocked; login loop |
| 5 | High | `app/login/actions.ts` | Hardcoded superuser email fallback |
| 6 | High | `app/api/auth/send-password-reset/route.ts` | Role case sensitivity (admin vs ADMIN) |
| 7 | High | `app/api/induction/reset/route.ts` | Any same-company user can reset induction |
| 8 | Medium | `app/api/company-name/route.ts` | No auth |
| 9 | Medium | `app/api/auth/registrations/route.ts` | NEXTAUTH_URL usage |
| 10 | Medium | `app/dashboard/page.tsx`, `proxy.ts` | sub_admin missing from roles |
| 11–14 | Low/Info | Various | Session validation, legacy fields, casing |

---

## Next Steps

1. Review each proposed fix.  
2. Apply fixes in order of severity.  
3. Test operatives, sub_admins, company admins, and superusers after changes.  
4. Re-run audit for remaining issues.
