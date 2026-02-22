# P3 Low Issues – Diffs for Approval

---

## 1. Cookie Forwarding Inconsistencies

### 1a. app/dashboard/users/actions.ts – inviteUser

**Fix:** Forward cookies to API so the server can identify the caller and enforce company scoping.

```diff
 export async function inviteUser(data: { name: string; email: string; role: string }) {
   const base = getBaseUrl();
   const url = `${base}/api/users`;
-  const res = await fetch(url, {
-    method: "POST",
-    headers: { "Content-Type": "application/json" },
-    body: JSON.stringify(data),
-  });
+  const cookieHeader = (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join("; ");
+  const res = await fetch(url, {
+    method: "POST",
+    headers: { "Content-Type": "application/json", ...(cookieHeader && { Cookie: cookieHeader }) },
+    body: JSON.stringify(data),
+  });
   
   const user = await res.json();
   return user;
 }
```

**One sentence:** inviteUser forwards cookies so the users API can enforce company scoping when creating users.

---

### 1b. app/dashboard/users/actions.ts – deleteUser

**Fix:** Forward cookies to API so DELETE /api/users/[id] receives auth and can enforce company check.

```diff
 export async function deleteUser(id: string) {
   const base = getBaseUrl();
   const url = `${base}/api/users/${id}`;
-  await fetch(url, {
-    method: "DELETE",
-  });
+  const cookieHeader = (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join("; ");
+  await fetch(url, {
+    method: "DELETE",
+    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
+  });
 }
```

**One sentence:** deleteUser forwards cookies so the API can verify the caller is admin/superuser with company access.

---

### 1c. app/dashboard/users/actions.ts – fetchUsers (auto-forward when cookieHeader omitted)

**Fix:** When cookieHeader is not provided, obtain it from cookies() and forward so callers like OperativesPage get properly scoped results.

```diff
 export async function fetchUsers(companyId?: string, role?: string, cookieHeader?: string) {
   const base = getBaseUrl();
   let url = `${base}/api/users`;
   if (companyId) {
     url += `?companyId=${encodeURIComponent(companyId)}`;
   } else if (role === "superuser") {
     url += `?all=true`;
   }
   const headers: HeadersInit = {};
-  if (cookieHeader) headers.Cookie = cookieHeader;
+  const effectiveCookie = cookieHeader ?? (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join("; ");
+  if (effectiveCookie) headers.Cookie = effectiveCookie;
   const res = await fetch(url, { cache: "no-store", headers });
   if (!res.ok) return [];
   return res.json();
 }
```

**One sentence:** fetchUsers always forwards cookies when cookieHeader is omitted so client-callable flows (e.g. OperativesPage) get scoped user lists.

---

## 2. Dead / Legacy Code

### 2a. lib/schemas/index.ts – firebase_uid (optional)

**Fix:** Add deprecation comment. Removal may break schema validation if DB still has the column; prefer comment-only.

```diff
 export const usersSchema = z.object({
   id: z.string().uuid(),
+  /** @deprecated Legacy Firebase migration; no longer used in queries */
   firebase_uid: optional(z.string()),
   company_id: optional(z.string()),
```

**One sentence:** Documents firebase_uid as deprecated; keeps schema in sync with DB if column exists.

---

### 2b. Normalize role casing – use roleLower for checks – use roleLower for checks

**Fix:** Replace repeated `role === "admin" || role === "ADMIN"` with `(role ?? "").toLowerCase() === "admin"` for consistency.

**Files to update:**
- `app/api/gdpr/download-my-data/route.ts` – use roleLower for admin/sub_admin check
- `app/api/gdpr/delete-account/route.ts` – add sub_admin, use roleLower
- `app/api/pre-induction/me/override/route.ts` – use roleLower, add sub_admin

**Example (gdpr/download-my-data):**
```diff
     const role = cookieStore.get("role")?.value;
+    const roleLower = (role ?? "").toLowerCase();
     ...
     if (!isSelf) {
-      if (role !== "superuser" && role !== "admin" && role !== "ADMIN" && role !== "sub_admin") {
+      if (roleLower !== "superuser" && roleLower !== "admin" && roleLower !== "sub_admin") {
         return NextResponse.json({ error: "Can only export own data" }, { status: 403 });
       }
-      if (role !== "superuser" && (target.company_id ?? "") !== (companyId ?? "")) {
+      if (roleLower !== "superuser" && (target.company_id ?? "") !== (companyId ?? "")) {
```

**Example (gdpr/delete-account):**
```diff
     const role = cookieStore.get("role")?.value;
+    const roleLower = (role ?? "").toLowerCase();
     ...
     } else {
-      if (role !== "superuser" && role !== "admin" && role !== "ADMIN") {
+      if (roleLower !== "superuser" && roleLower !== "admin" && roleLower !== "sub_admin") {
         return NextResponse.json({ error: "Only admin can delete other users" }, { status: 403 });
       }
       ...
-      if (role !== "superuser" && (target.company_id ?? "") !== (companyId ?? "")) {
+      if (roleLower !== "superuser" && (target.company_id ?? "") !== (companyId ?? "")) {
```

**Example (pre-induction/me/override):**
```diff
     const role = cookieStore.get("role")?.value;
+    const roleLower = (role ?? "").toLowerCase();
-    const canSelfOverride = role === "superuser" || role === "admin" || role === "ADMIN";
+    const canSelfOverride = roleLower === "superuser" || roleLower === "admin" || roleLower === "sub_admin";
```

**One sentence:** Normalizes role checks to lowercase and adds sub_admin where admin is allowed.

---

## 3. Superuser Bypass Consistency

### 3a. app/api/coshh/route.ts – GET

**Fix:** When superuser has no companyId, return all COSHH records (or allow `?companyId=` to scope), matching safety-alerts behavior.

```diff
 export async function GET() {
   try {
     const cookieStore = await cookies();
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
+    if (role !== "superuser" && !companyId) return NextResponse.json([]);
 
-    const { data } = await supabaseAdmin
-      .from("coshh")
-      .select("*")
-      .eq("company_id", companyId)
-      .order("created_at", { ascending: false });
+    let query = supabaseAdmin.from("coshh").select("*").order("created_at", { ascending: false });
+    if (companyId) query = query.eq("company_id", companyId);
+    const { data } = await query;
     return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
   } catch (e) {
```

**One sentence:** Superuser without companyId can list all COSHH records; non-superuser still requires companyId.

---

### 3b. app/api/subcontractors/route.ts – GET

**Status:** Superuser without companyId gets `[]`; can pass `?companyId=` for scoped list. This is consistent with "superuser must pass company to see subcontractors" – no change unless product wants superuser to list all partner companies.

---

## 4. Operative-Dashboard Components

### 4a. operative-dashboard/page.tsx

**Status:** Minimal page (Welcome + menu). No data fetches. No change needed.

---

### 4b. app/dashboard/operatives/page.tsx (Operatives list)

**Fix:** OperativesPage calls `fetchUsers()` with no args. After fix 1c, cookies are forwarded. The users API returns company-scoped users when role is admin/supervisor. **Operatives** should NOT see the company user list – restrict at API or UI. The users API currently returns users for the caller's company when companyId is present. When an operative calls it, they have companyId (from cookie). So operatives would get company-wide users. Per audit: operatives must only see their own data. So we need an operative check in users API GET – when role is operative, return only the current user (self).

Add to `app/api/users/route.ts` GET (after the `all` check, before the main query):
```diff
     if (all && role !== "superuser") {
       return NextResponse.json({ error: "Forbidden" }, { status: 403 });
     }
 
+    const roleLower = (role ?? "").toLowerCase();
+    if (roleLower === "operative") {
+      const email = cookieStore.get("user_email")?.value;
+      if (!email) return NextResponse.json([]);
+      const { data: me } = await supabaseAdmin.from("users").select("*").eq("email", email).limit(1).maybeSingle();
+      if (!me) return NextResponse.json([]);
+      const u = me as Record<string, unknown>;
+      const { data: personalRows } = await supabaseAdmin.from("pre_induction_personal").select("user_id, full_name, phone, data").eq("user_id", u.id).limit(1);
+      const pr = personalRows?.[0] as { full_name?: string; phone?: string; data?: Record<string, unknown> } | undefined;
+      const d = pr?.data ?? {};
+      const name = (u.name ?? u.display_name ?? pr?.full_name ?? d.full_name ?? d.fullName ?? u.email) as string;
+      const phone = (u.phone ?? pr?.phone ?? d.phone ?? "") as string;
+      const mapped = { ...u, name: name || u.name, phone, lastLogin: u.last_login ?? u.lastLogin ?? null, company_id: u.company_id, companyId: u.company_id };
+      return NextResponse.json([mapped]);
+    }
+
     let query = supabaseAdmin.from("users").select("*").order("created_at", { ascending: false });
```

**One sentence:** When role is operative, users API returns only the current user (self), not company-wide list.

**Note:** This is a P2-style operative restriction. Including in P3 because it affects operative-dashboard flows.

---

### 4c. app/dashboard/operatives/[id]/OperativeProfileClient.tsx

**Status:** Fetches `/api/users/[id]` and `/api/users/[id]/medical`. Both APIs enforce access (superuser, same company, or self). Operative viewing operatives/{own-id} gets self only. No change needed.

---

## 5. Normalize Error Responses

### 5a. Consistent error shape

**Fix:** Use `{ error: string }` for all JSON error responses. Most routes already do. Verify no routes return `{ message: ... }` or inconsistent keys.

**Grep result:** Most use `{ error: "..." }`. A few use `err.error` when rethrowing. No systematic change required unless specific routes are found.

---

### 5b. role casing in checkAdmin (company API)

**File:** `app/api/company/[companyId]/_utils/checkAdmin.ts`

```diff
-    return role === "ADMIN" || superuser === true;
+    const roleLower = (role ?? "").toLowerCase();
+    return roleLower === "admin" || roleLower === "sub_admin" || superuser === true;
```

**One sentence:** checkAdmin accepts admin and sub_admin in any casing.

---

### 1d. app/dashboard/users/actions.ts – fetchUsers role/companyId when called with no args

**Fix:** When fetchUsers() is called with no args (e.g. from OperativesPage), derive companyId and role from cookies so the API receives proper params.

```diff
 export async function fetchUsers(companyId?: string, role?: string, cookieHeader?: string) {
   const base = getBaseUrl();
   let url = `${base}/api/users`;
+  const cookieStore = await cookies();
+  const effectiveRole = role ?? cookieStore.get("role")?.value;
+  const effectiveCompanyId = companyId ?? cookieStore.get("companyId")?.value;
+  if (effectiveCompanyId) {
     if (companyId) {
       url += `?companyId=${encodeURIComponent(companyId)}`;
-    } else if (role === "superuser") {
+    } else if (effectiveCompanyId) url += `?companyId=${encodeURIComponent(effectiveCompanyId)}`;
+  }
+  if (!effectiveCompanyId && effectiveRole === "superuser") {
       url += `?all=true`;
     }
   ...
 }
```

Actually - the logic is: if companyId provided, use it. Else if role is superuser, use all=true. Else we need companyId from somewhere. When OperativesPage calls fetchUsers() with no args, we have no companyId and no role. The fix 1c (forward cookies) is the main one - the API will read cookies and get role/companyId from the request. So we don't need to change the URL params - the API uses cookies() to get role and companyId. So fix 1c alone should suffice. Let me simplify - remove 1d and keep 1c.
</think>
Simplifying 1c and removing the complex 1d.
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace