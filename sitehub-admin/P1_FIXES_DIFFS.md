# P1 High Issues – Diffs for Approval

---

## 1. app/api/profiles/route.ts – single-user GET access check

**Fix:** Add explicit access check before returning single-user profile: superuser, same company, or self (reusing canEditProfile).

```diff
     if (userId) {
       const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", userId).single();
       if (!user) return NextResponse.json([]);
+
+      if (!(await canEditProfile(userId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

       const [profileRes, personalRes] = await Promise.all([
```

---

## 2. app/dashboard/users/actions.ts – updateUserRole

**Fix:** Replace direct supabaseAdmin update with PATCH to /api/users/[id], forward cookies, and allow admin/sub_admin/superuser so company scoping is enforced by the API.

```diff
 export async function updateUserRole(id: string, role: string) {
   try {
     const userRole = (await cookies()).get("role")?.value;
-    if (userRole !== "ADMIN" && userRole !== "superuser") {
+    const roleLower = (userRole ?? "").toLowerCase();
+    if (roleLower !== "admin" && roleLower !== "superuser" && roleLower !== "sub_admin") {
       throw new Error("Only admins can update user roles");
     }

-    const { error } = await supabaseAdmin
-      .from("users")
-      .update({ role })
-      .eq("id", id);
-
-    if (error) throw error;
+    const base = getBaseUrl();
+    const cookieHeader = (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join("; ");
+    const res = await fetch(`${base}/api/users/${id}`, {
+      method: "PATCH",
+      headers: { "Content-Type": "application/json", ...(cookieHeader && { Cookie: cookieHeader }) },
+      body: JSON.stringify({ role }),
+    });
+    if (!res.ok) {
+      const err = await res.json().catch(() => ({}));
+      throw new Error((err as { error?: string }).error ?? "Failed to update role");
+    }

     revalidatePath("/dashboard/users");
     return { success: true };
   } catch (error: unknown) {
     const msg = error instanceof Error ? error.message : "Failed to update role";
     console.error("Error updating role:", error);
     throw new Error(msg);
   }
 }
```

```diff
-import { getBaseUrl } from "@/lib/url";
-import { supabaseAdmin } from "@/lib/supabaseAdmin";
+import { getBaseUrl } from "@/lib/url";
 import { cookies } from "next/headers";
```

---

## 3. app/api/attendance/route.ts – POST operative self-only

**Fix:** If caller is operative, require operativeId to match current user (from user_email); return 403 otherwise.

```diff
     const assignedCompanyId = role === "superuser" ? (body.company_id ?? body.companyId ?? companyId ?? null) : (companyId ?? null);
     if (!assignedCompanyId) return NextResponse.json({ error: "company_id required" }, { status: 400 });

+    const roleLower = (role ?? "").toLowerCase();
+    if (roleLower === "operative") {
+      const { data: me } = await supabaseAdmin
+        .from("users")
+        .select("id")
+        .eq("email", cookieStore.get("user_email")?.value ?? "")
+        .maybeSingle();
+      if (me && operativeId !== me.id) {
+        return NextResponse.json({ error: "Operatives can only sign in themselves" }, { status: 403 });
+      }
+    }
+
     if (action === "IN" && siteId) {
```

---

## 4. app/api/coshh/[id]/route.ts – DELETE

**Fix:** Allow superuser; for others resolve companyId via resolveCompanyId and enforce coshh.company_id matches caller.

```diff
 import { supabaseAdmin } from "@/lib/supabaseAdmin";
 import { NextResponse } from "next/server";
 import { cookies } from "next/headers";
+import { resolveCompanyId } from "@/lib/auth/companyId";

 function cid(x: { company_id?: string | null }): string | null {
   return (x.company_id ?? null) as string | null;
 }

 export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
   const { id } = await params;
   const cookieStore = await cookies();
-  const companyId = cookieStore.get("companyId")?.value;
-
-  const { data } = await supabaseAdmin.from("coshh").select("*").eq("id", id).single();
-  if (!data || cid(data) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
+  const role = cookieStore.get("role")?.value;
+  let companyId = cookieStore.get("companyId")?.value;
+  if (!companyId && role !== "superuser") {
+    companyId =
+      (await resolveCompanyId({
+        cookieCompanyId: cookieStore.get("companyId")?.value,
+        userEmail: cookieStore.get("user_email")?.value,
+        role,
+      })) || undefined;
+  }
+
+  const { data } = await supabaseAdmin.from("coshh").select("*").eq("id", id).single();
+  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
+  if (role !== "superuser") {
+    if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
+    if (cid(data) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
+  }

   await supabaseAdmin.from("coshh").delete().eq("id", id);
   return NextResponse.json({ success: true });
 }
```

---

## 5. app/api/safety-alerts/route.ts – GET

**Fix:** Superuser without companyId can list all alerts; optional ?companyId= scopes; non-superuser still requires company scoping.

```diff
-export async function GET() {
+export async function GET(req: Request) {
   try {
     const cookieStore = await cookies();
+    const url = new URL(req.url);
+    const role = cookieStore.get("role")?.value;
     let companyId = cookieStore.get("companyId")?.value;
     if (!companyId) {
       companyId =
         (await resolveCompanyId({
           cookieCompanyId: cookieStore.get("companyId")?.value,
           userEmail: cookieStore.get("user_email")?.value,
           role: cookieStore.get("role")?.value,
         })) || undefined;
     }
-    if (!companyId) return NextResponse.json([]);
-
-    const { data } = await supabaseAdmin
-      .from("safety_alerts")
-      .select("*")
-      .eq("company_id", companyId)
-      .order("created_at", { ascending: false });
+    if (role === "superuser") companyId = url.searchParams.get("companyId") || companyId || undefined;
+
+    let query = supabaseAdmin.from("safety_alerts").select("*").order("created_at", { ascending: false });
+    if (companyId) query = query.eq("company_id", companyId);
+    const { data } = await query;
     return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
   } catch (e) {
```

---

## 6. app/api/briefings/route.ts – GET

**Fix:** Superuser without companyId can list all briefings; optional ?companyId= scopes (same pattern as safety-alerts).

```diff
-    if (role === "superuser") companyId = searchParams.get("companyId") || companyId || undefined;
-    if (!companyId) return NextResponse.json([], { status: 200 });
-
-    const { data } = await supabaseAdmin
-      .from("briefings")
-      .select("*")
-      .eq("company_id", companyId)
-      .order("created_at", { ascending: false });
+    if (role === "superuser") companyId = searchParams.get("companyId") || companyId || undefined;
+
+    let query = supabaseAdmin.from("briefings").select("*").order("created_at", { ascending: false });
+    if (companyId) query = query.eq("company_id", companyId);
+    const { data } = await query;
     const briefings = (data ?? []).map((d) => ({ id: d.id, ...d }));
     return NextResponse.json(briefings);
```

---

## 7. app/api/invite-codes/route.ts – POST

**Fix:** Superuser without companyId can derive effectiveCompanyId from site’s company_id; non-superuser must use their own company.

```diff
-    if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
-
     const body = await req.json().catch(() => ({}));
     const siteId = (body.site_id ?? body.siteId)?.trim();
     if (!siteId) return NextResponse.json({ error: "site_id (or siteId) required" }, { status: 400 });

     const { data: site } = await supabaseAdmin.from("sites").select("company_id").eq("id", siteId).maybeSingle();
     if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
     const siteCompanyId = site.company_id ?? null;
-    if (siteCompanyId !== companyId && role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
+    const effectiveCompanyId = role === "superuser" ? (companyId ?? siteCompanyId) : companyId;
+    if (!effectiveCompanyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
+    if (role !== "superuser" && siteCompanyId !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

---

## 8. app/api/induction/export/route.ts – POST

**Fix:** Superuser uses filterCompanyId from body as scope; require filterCompanyId or companyId when superuser has neither.

```diff
 export async function POST(req: Request) {
   try {
     const cookieStore = await cookies();
     const role = cookieStore.get("role")?.value;
     const authCompanyId = cookieStore.get("companyId")?.value;
     if (!authCompanyId && role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
-    const companyId = authCompanyId ?? "";
+    const body = await req.json().catch(() => ({}));
+    const filterCompanyId = (body.companyId ?? body.company_id ?? null) as string | null;
+    const companyId = role === "superuser"
+      ? (filterCompanyId ?? authCompanyId ?? "")
+      : (authCompanyId ?? "");
+    if (!companyId) return NextResponse.json({ error: "companyId or filterCompanyId required for export scope" }, { status: 400 });

-    const body = await req.json().catch(() => ({}));
     const filterSiteId = (body.siteId ?? body.site_id ?? null) as string | null;
-    const filterCompanyId = (body.companyId ?? body.company_id ?? null) as string | null;
     const filterStatus = (body.status ?? null) as string | null;
```

---

## 9. app/dashboard/users/[userId]/page.tsx

**Fix:** Use resolveCompanyId when cookie companyId is missing; restrict operatives to viewing only their own profile (userId === currentUserId).

```diff
 import { cookies } from "next/headers";
 import Link from "next/link";
 import { supabaseAdmin } from "@/lib/supabaseAdmin";
 import PageHeader from "@/app/dashboard/components/PageHeader";
+import { resolveCompanyId } from "@/lib/auth/companyId";
@@
   const { userId } = await params;
   const cookieStore = await cookies();
   const role = cookieStore.get("role")?.value;
-  const companyId = cookieStore.get("companyId")?.value;
+  let companyId = cookieStore.get("companyId")?.value;
+  if (!companyId && role !== "superuser") {
+    companyId =
+      (await resolveCompanyId({
+        cookieCompanyId: cookieStore.get("companyId")?.value,
+        userEmail: cookieStore.get("user_email")?.value,
+        role,
+      })) || undefined;
+  }
+
+  const roleLower = (role ?? "").toLowerCase();
+  if (roleLower === "operative") {
+    const { data: me } = await supabaseAdmin
+      .from("users")
+      .select("id")
+      .eq("email", cookieStore.get("user_email")?.value ?? "")
+      .maybeSingle();
+    if (me && userId !== me.id) {
+      return (
+        <div className="space-y-6">
+          <PageHeader title="User" description="Access denied. Operatives can only view their own profile." />
+          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">← Back to dashboard</Link>
+        </div>
+      );
+    }
+  }

   const { data: userRow } = await supabaseAdmin
```


---

## 10. app/dashboard/actions.ts – fetchDashboardMetrics

**Fix:** Forward Cookie header from headers() to all internal fetch calls.

```diff
 "use server";
 /* eslint-disable @typescript-eslint/no-explicit-any */

 export async function fetchDashboardMetrics() {
-  const base = process.env.NEXT_PUBLIC_BASE_URL;
+  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
+  const cookieHeader = (await import("next/headers").then(m => m.headers())).get("cookie") ?? "";
+  const headersInit: HeadersInit = { "Cache-Control": "no-store" };
+  if (cookieHeader) (headersInit as Record<string, string>).Cookie = cookieHeader;

   const [sitesRes, ramsRes, usersRes] = await Promise.all([
-    fetch(`${base}/api/sites`, { cache: "no-store" }),
-    fetch(`${base}/api/rams`, { cache: "no-store" }),
-    fetch(`${base}/api/users`, { cache: "no-store" }),
+    fetch(`${base}/api/sites`, { cache: "no-store", headers: headersInit }),
+    fetch(`${base}/api/rams`, { cache: "no-store", headers: headersInit }),
+    fetch(`${base}/api/users`, { cache: "no-store", headers: headersInit }),
   ]);
```

Simpler version:
```diff
 "use server";
 /* eslint-disable @typescript-eslint/no-explicit-any */

+import { headers } from "next/headers";

 export async function fetchDashboardMetrics() {
   const base = process.env.NEXT_PUBLIC_BASE_URL;
+  const cookieHeader = (await headers()).get("cookie") ?? "";
+  const fetchHeaders: HeadersInit = cookieHeader ? { Cookie: cookieHeader } : {};

   const [sitesRes, ramsRes, usersRes] = await Promise.all([
-    fetch(`${base}/api/sites`, { cache: "no-store" }),
-    fetch(`${base}/api/rams`, { cache: "no-store" }),
-    fetch(`${base}/api/users`, { cache: "no-store" }),
+    fetch(`${base}/api/sites`, { cache: "no-store", headers: fetchHeaders }),
+    fetch(`${base}/api/rams`, { cache: "no-store", headers: fetchHeaders }),
+    fetch(`${base}/api/users`, { cache: "no-store", headers: fetchHeaders }),
   ]);
```

---

## 11. app/dashboard/tasks/actions.ts

**Fix:** Forward cookies to createTask, updateTaskStatus, and deleteTask.

```diff
 export async function createTask(data: any) {
   const base = getBaseUrl();
   const url = `${base}/api/tasks`;
-  await fetch(url, {
-    method: "POST",
-    headers: { "Content-Type": "application/json" },
-    body: JSON.stringify(data),
-  });
+  const cookie = await getCookieHeader();
+  const headersInit: HeadersInit = { "Content-Type": "application/json" };
+  if (cookie) headersInit.Cookie = cookie;
+  await fetch(url, { method: "POST", headers: headersInit, body: JSON.stringify(data) });
 }

 export async function updateTaskStatus(id: string, status: string) {
   const base = getBaseUrl();
   const url = `${base}/api/tasks/${id}`;
-  await fetch(url, {
-    method: "PATCH",
-    body: JSON.stringify({ status }),
-  });
+  const cookie = await getCookieHeader();
+  const headersInit: HeadersInit = { "Content-Type": "application/json" };
+  if (cookie) headersInit.Cookie = cookie;
+  await fetch(url, { method: "PATCH", headers: headersInit, body: JSON.stringify({ status }) });
 }

 export async function deleteTask(id: string) {
   const base = getBaseUrl();
   const url = `${base}/api/tasks/${id}`;
-  await fetch(url, {
-    method: "DELETE",
-  });
+  const cookie = await getCookieHeader();
+  const headersInit: HeadersInit = {};
+  if (cookie) headersInit.Cookie = cookie;
+  await fetch(url, { method: "DELETE", headers: headersInit });
 }
```

---

## 12. app/dashboard/notices/actions.ts

**Fix:** Forward cookies to createNotice, updateNotice, and deleteNotice.

```diff
 export async function createNotice(data: any) {
   const base = getBaseUrl();
   const url = `${base}/api/notices`;
-  await fetch(url, {
-    method: "POST",
-    headers: { "Content-Type": "application/json" },
-    body: JSON.stringify(data),
-  });
+  const cookie = await getCookieHeader();
+  const headersInit: HeadersInit = { "Content-Type": "application/json" };
+  if (cookie) headersInit.Cookie = cookie;
+  await fetch(url, { method: "POST", headers: headersInit, body: JSON.stringify(data) });
 }

 export async function updateNotice(id: string, data: any) {
   const base = getBaseUrl();
   const url = `${base}/api/notices/${id}`;
-  await fetch(url, {
-    method: "PATCH",
-    body: JSON.stringify(data),
-  });
+  const cookie = await getCookieHeader();
+  const headersInit: HeadersInit = { "Content-Type": "application/json" };
+  if (cookie) headersInit.Cookie = cookie;
+  await fetch(url, { method: "PATCH", headers: headersInit, body: JSON.stringify(data) });
 }

 export async function deleteNotice(id: string) {
   const base = getBaseUrl();
   const url = `${base}/api/notices/${id}`;
-  await fetch(url, {
-    method: "DELETE",
-  });
+  const cookie = await getCookieHeader();
+  const headersInit: HeadersInit = {};
+  if (cookie) headersInit.Cookie = cookie;
+  await fetch(url, { method: "DELETE", headers: headersInit });
 }
```

---

## 13. app/dashboard/deliveries/actions.ts

**Status:** Already forwards cookies in create/update/delete. No change needed.

---

## 14. app/dashboard/rams/actions.ts

**Fix:** Forward cookies to updateRAMSStatus and deleteRAMS.

```diff
 export async function updateRAMSStatus(id: string, status: string) {
   const base = getBaseUrl();
   const url = `${base}/api/rams/${id}`;
-  await fetch(url, {
-    method: "PATCH",
-    body: JSON.stringify({ status }),
-  });
+  const cookie = await getCookieHeader();
+  const headersInit: HeadersInit = { "Content-Type": "application/json" };
+  if (cookie) headersInit.Cookie = cookie;
+  await fetch(url, { method: "PATCH", headers: headersInit, body: JSON.stringify({ status }) });
 }

 export async function deleteRAMS(id: string) {
   const base = getBaseUrl();
   const url = `${base}/api/rams/${id}`;
-  await fetch(url, {
-    method: "DELETE",
-  });
+  const cookie = await getCookieHeader();
+  const headersInit: HeadersInit = {};
+  if (cookie) headersInit.Cookie = cookie;
+  await fetch(url, { method: "DELETE", headers: headersInit });
 }
```
