# Construction Runner Admin – Company-Scoping Audit Report

**Audit Date:** 2025-02-17  
**Scope:** Full codebase (API routes, server actions, dashboard server components)  
**Criteria:** SUPERUSER, ADMIN/SUPERVISOR, OPERATIVE, SUB_ADMIN, Supabase Admin client usage, route companyId handling

---

## Executive Summary

| Category | Count |
|----------|-------|
| **Critical (cross-company data leak)** | 3 |
| **High (unsafe / missing scoping)** | 12 |
| **Medium (incomplete role/company handling)** | 15 |
| **Low (cookie forwarding, sub_admin)** | 5 |

---

## 1. CRITICAL FINDINGS (Cross-Company Data Leak)

### 1.1 `app/api/profiles/route.ts` – GET (list all profiles)

| Field | Details |
|-------|---------|
| **What is unsafe** | When `userId` query param is **absent**, the route fetches **all users** with no scoping: `supabaseAdmin.from("users").select("*")`. No role or companyId check. |
| **Impact** | Any authenticated user can list all profiles across all companies. **Full cross-company data leak.** |
| **Recommended fix** | When `userId` is absent: (1) read role and companyId from cookies; (2) if not superuser, require companyId and filter by `company_id`; (3) if superuser with no companyId, return all (or require companyId param). |

```diff
+import { resolveCompanyId } from "@/lib/auth/companyId";
+
 export async function GET(req: Request) {
   try {
     const url = new URL(req.url);
     const userId = url.searchParams.get("userId");

     if (userId) {
       // ... existing per-user logic (ensure access control exists) ...
     }

+    const cookieStore = await cookies();
+    const role = cookieStore.get("role")?.value;
+    let companyId = cookieStore.get("companyId")?.value;
+    if (!companyId && role !== "superuser") {
+      companyId = (await resolveCompanyId({ cookieCompanyId: companyId, userEmail: cookieStore.get("user_email")?.value, role })) || undefined;
+    }
+    if (role !== "superuser" && !companyId) return NextResponse.json([]);
+    const query = supabaseAdmin.from("users").select("*");
+    if (role !== "superuser" && companyId) query = query.eq("company_id", companyId);
+    const { data: users } = await query;
     const out: Record<string, unknown>[] = [];
     for (const u of users ?? []) {
```

### 1.2 `app/api/certifications/route.ts` – GET

| Field | Details |
|-------|---------|
| **What is unsafe** | Fetches **all** certifications with no company filter: `supabaseAdmin.from("certifications").select("*")`. Post-filters in memory after fetching everything. |
| **Impact** | Admin/Supervisor sees certifications from other companies until filtered. Operative could receive other companies’ data if filter logic fails. |
| **Recommended fix** | Build query with company filter before execution. For superuser without companyId, allow all; for others, require companyId and add `.eq("company_id", companyId)` or filter via user→company mapping before the main query. |

```diff
-    const { data } = await supabaseAdmin
-      .from("certifications")
-      .select("*")
-      .order("created_at", { ascending: false })
-      .limit(limit);
+    let query = supabaseAdmin.from("certifications").select("*").order("created_at", { ascending: false }).limit(limit);
+    if (role !== "superuser" && companyId) {
+      const userIds = (await supabaseAdmin.from("users").select("id").eq("company_id", companyId)).data?.map(u => u.id) ?? [];
+      if (userIds.length) query = query.in("user_id", userIds);
+      else return NextResponse.json([]);
+    }
+    const { data } = await query;
```

### 1.3 `app/api/training/route.ts` – GET

| Field | Details |
|-------|---------|
| **What is unsafe** | Fetches **all** `profile_training` rows, then filters in memory. Same pattern as certifications. |
| **Impact** | Cross-company exposure of training records until post-filter is applied. |
| **Recommended fix** | Resolve companyId, filter by user→company before or during the query (e.g. restrict `profile_id` to profiles whose users belong to companyId). |

---

## 2. HIGH SEVERITY (Unsafe / Missing Scoping)

### 2.1 `app/api/profiles/route.ts` – GET (with userId)

| Field | Details |
|-------|---------|
| **What is missing** | When fetching a single user by `userId`, there is no explicit access check. |
| **Recommended fix** | Before returning merged profile: verify caller can access user (superuser, same company, or self). Use same pattern as `profiles/[id]/route.ts` or `ensureProfileAccess`. |

---

### 2.2 `app/dashboard/users/actions.ts` – `updateUserRole`

| Field | Details |
|-------|---------|
| **What is unsafe** | Uses `supabaseAdmin` directly and updates `users.role` by `id` **without checking companyId**. An admin from Company A could change a user’s role in Company B. |
| **Impact** | Cross-company privilege escalation. |
| **Recommended fix** | Either: (1) call `PATCH /api/users/[id]` (which has scoping) instead of supabaseAdmin, or (2) add companyId check before update: load user, verify `user.company_id === callerCompanyId` (or superuser). |

```diff
 export async function updateUserRole(id: string, role: string) {
   try {
     const userRole = (await cookies()).get("role")?.value;
-    if (userRole !== "ADMIN" && userRole !== "superuser") {
+    if (userRole !== "ADMIN" && userRole !== "admin" && userRole !== "superuser" && userRole !== "sub_admin") {
       throw new Error("Only admins can update user roles");
     }
-
-    const { error } = await supabaseAdmin
-      .from("users")
-      .update({ role })
-      .eq("id", id);
-
-    if (error) throw error;
+
+    const base = getBaseUrl();
+    const cookieHeader = (await cookies()).getAll().map((c) => `${c.name}=${c.value}`).join("; ");
+    const res = await fetch(`${base}/api/users/${id}`, {
+      method: "PATCH",
+      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
+      body: JSON.stringify({ role }),
+    });
+    if (!res.ok) {
+      const err = await res.json().catch(() => ({}));
+      throw new Error(err.error ?? "Failed to update role");
+    }
```

---

### 2.3 `app/api/attendance/route.ts` – POST

| Field | Details |
|-------|---------|
| **What is missing** | No operative-only check. If caller is `operative`, they must only record attendance for **themselves** (`operativeId === currentUserId`). |
| **Impact** | Operative could record attendance for another operative in the same company. |
| **Recommended fix** | After resolving role and companyId, if role is operative: require `operativeId === currentUserId` (from `user_email` lookup). |

```diff
     const assignedCompanyId = role === "superuser" ? (body.company_id ?? body.companyId ?? companyId ?? null) : (companyId ?? null);
     if (!assignedCompanyId) return NextResponse.json({ error: "company_id required" }, { status: 400 });

+    if (role === "operative" || role === "OPERATIVE") {
+      const { data: me } = await supabaseAdmin.from("users").select("id").eq("email", cookieStore.get("user_email")?.value ?? "").maybeSingle();
+      if (me && operativeId !== me.id) return NextResponse.json({ error: "Operatives can only sign in themselves" }, { status: 403 });
+    }
+
     if (action === "IN" && siteId) {
```

---

### 2.4 `app/api/coshh/[id]/route.ts` – DELETE

| Field | Details |
|-------|---------|
| **What is unsafe** | No superuser bypass. Uses only `cookieStore.get("companyId")`; no `resolveCompanyId` fallback. |
| **Impact** | Superuser and admin without companyId cookie get 403. |
| **Recommended fix** | Add superuser bypass and resolveCompanyId for admin/supervisor. |

```diff
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
+    companyId = (await resolveCompanyId({ cookieCompanyId: cookieStore.get("companyId")?.value, userEmail: cookieStore.get("user_email")?.value, role })) || undefined;
+  }
+  if (role === "superuser") { /* allow */ } else if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
+
+  const { data } = await supabaseAdmin.from("coshh").select("*").eq("id", id).single();
+  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
+  if (role !== "superuser" && cid(data) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

---

### 2.5 `app/api/safety-alerts/route.ts` – GET

| Field | Details |
|-------|---------|
| **What is missing** | No superuser handling when companyId is absent. Returns `[]`. |
| **Impact** | Superuser without companyId cannot list any safety alerts. Rule 6: superuser must still be able to use route with null companyId. |
| **Recommended fix** | If role is superuser and companyId is absent: either return all alerts or allow `?companyId=` to scope. |

```diff
     if (!companyId) {
       companyId =
         (await resolveCompanyId({ ... })) || undefined;
     }
-    if (!companyId) return NextResponse.json([]);
-
-    const { data } = await supabaseAdmin
+    let query = supabaseAdmin.from("safety_alerts").select("*").order("created_at", { ascending: false });
+    if (companyId) query = query.eq("company_id", companyId);
+    const { data } = await query;
```

---

### 2.6 `app/api/briefings/route.ts` – GET

| Field | Details |
|-------|---------|
| **What is missing** | When superuser has no companyId (and no `?companyId=`), returns `[]`. |
| **Recommended fix** | If superuser and no companyId: return all briefings (or all scoped by optional `?companyId=`). |

---

### 2.7 `app/api/invite-codes/route.ts` – POST

| Field | Details |
|-------|---------|
| **What is missing** | `if (!companyId) return 403` blocks superuser without companyId. |
| **Recommended fix** | For superuser: allow companyId to be derived from `siteId` in body (site has company_id). |

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
+    if (siteCompanyId !== effectiveCompanyId && role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
```

---

### 2.8 `app/api/induction/export/route.ts` – POST

| Field | Details |
|-------|---------|
| **What is unsafe** | For superuser with no companyId, `companyId = ""` and sites query uses `.eq("company_id", "")`, returning wrong/empty data. |
| **Recommended fix** | When superuser: use `filterCompanyId` from body as the scope. If neither companyId nor filterCompanyId, return 400 or all companies depending on product needs. |

---

### 2.9 `app/dashboard/users/[userId]/page.tsx`

| Field | Details |
|-------|---------|
| **What is missing** | Uses only cookie `companyId`; no `resolveCompanyId` fallback. Admin without cookie gets access denied. |
| **What is missing** | Operative should only see **their own** profile (self-only). |
| **Recommended fix** | (1) Add resolveCompanyId when companyId is missing. (2) If role is operative, require `userId === currentUserId`. |

---

### 2.10 `app/dashboard/actions.ts` – `fetchDashboardMetrics`

| Field | Details |
|-------|---------|
| **What is missing** | Fetches `/api/sites`, `/api/rams`, `/api/users` **without forwarding cookies**. API receives no auth. |
| **Impact** | Dashboard metrics return empty data for non-superuser. |
| **Recommended fix** | Forward Cookie header from `headers()` to all fetch calls. |

```diff
 export async function fetchDashboardMetrics() {
   const base = process.env.NEXT_PUBLIC_BASE_URL;
+  const cookieHeader = (await headers()).get("cookie") ?? "";
+  const headersInit = cookieHeader ? { Cookie: cookieHeader } : {};

   const [sitesRes, ramsRes, usersRes] = await Promise.all([
-    fetch(`${base}/api/sites`, { cache: "no-store" }),
-    fetch(`${base}/api/rams`, { cache: "no-store" }),
-    fetch(`${base}/api/users`, { cache: "no-store" }),
+    fetch(`${base}/api/sites`, { cache: "no-store", headers: headersInit }),
+    fetch(`${base}/api/rams`, { cache: "no-store", headers: headersInit }),
+    fetch(`${base}/api/users`, { cache: "no-store", headers: headersInit }),
   ]);
```

---

### 2.11 `app/dashboard/tasks/actions.ts` – createTask, updateTaskStatus, deleteTask

| Field | Details |
|-------|---------|
| **What is missing** | Mutations do not forward cookies to the API. |
| **Impact** | API receives no role/companyId; mutations may fail or behave incorrectly. |
| **Recommended fix** | Add Cookie header to all fetch calls (same pattern as fetchTasks). |

---

### 2.12 `app/dashboard/notices/actions.ts` – createNotice, updateNotice, deleteNotice

| Field | Details |
|-------|---------|
| **What is missing** | Same as tasks: no cookie forwarding for mutations. |
| **Recommended fix** | Forward cookies for create/update/delete. |

---

### 2.13 `app/dashboard/deliveries/actions.ts` – createDelivery, updateDeliveryStatus, deleteDelivery

| Field | Details |
|-------|---------|
| **What is missing** | Same: no cookie forwarding. |
| **Recommended fix** | Forward cookies. |

---

### 2.14 `app/dashboard/rams/actions.ts` – updateRAMSStatus, deleteRAMS

| Field | Details |
|-------|---------|
| **What is missing** | No cookie forwarding. |
| **Recommended fix** | Forward cookies. |

---

### 2.15 `app/dashboard/sites/actions.ts` – createSite, updateSite, deleteSite

| Field | Details |
|-------|---------|
| **What is correct** | Some actions pass cookieHeader. |
| **What is missing** | Inconsistent; verify all mutations forward cookies. |

---

## 3. MEDIUM SEVERITY (Incomplete Role/Company Handling)

### 3.1 `app/api/users/[id]/route.ts` – PATCH

| Field | Details |
|-------|---------|
| **What is missing** | Only allows `admin`, not `sub_admin`. Rule 4: SUB_ADMIN behaves like ADMIN. |
| **Recommended fix** | Add `sub_admin` to allowed roles for PATCH. |

```diff
-    const isAdmin = roleLower === "admin";
-    if (!isSuperuser && !isAdmin) {
+    const isAdmin = roleLower === "admin" || roleLower === "sub_admin";
+    if (!isSuperuser && !isAdmin) {
```

---

### 3.2 `app/api/users/[id]/route.ts` – DELETE

| Field | Details |
|-------|---------|
| **What is missing** | Same: allow `sub_admin` to delete users in their company. |
| **Recommended fix** | Add sub_admin to allowed roles with company check. |

---

### 3.3 `app/api/pre-induction/[userId]/override/route.ts` – POST

| Field | Details |
|-------|---------|
| **What is missing** | `canOverride` allows admin but not sub_admin. |
| **Recommended fix** | Add sub_admin. |

```diff
-    const canOverride = role === "superuser" || role === "admin" || role === "ADMIN";
+    const canOverride = role === "superuser" || role === "admin" || role === "ADMIN" || role === "sub_admin";
```

---

### 3.4 `app/api/gdpr/download-my-data/route.ts` – GET

| Field | Details |
|-------|---------|
| **What is missing** | Allows `admin`/`ADMIN` for exporting other users, but not `sub_admin` or `supervisor`. Rule 4: sub_admin like admin. |
| **Recommended fix** | Add sub_admin. Optionally add supervisor if product requires (supervisor exporting operatives in their company). |

---

### 3.5 `app/api/induction-compliance/drawer/route.ts` – GET

| Field | Details |
|-------|---------|
| **What is missing** | Passes raw cookie companyId to `getComplianceDrawerData`. No resolveCompanyId. Admin without cookie may be denied. |
| **Recommended fix** | Call resolveCompanyId when companyId is missing before invoking getComplianceDrawerData. |

---

### 3.6 `app/api/companies/[companyId]/route.ts` – GET, PATCH

| Field | Details |
|-------|---------|
| **What is missing** | No resolveCompanyId when cookie has no companyId. Admin viewing own company could get 403. |
| **Recommended fix** | Use resolveCompanyId for admin/supervisor. |

---

### 3.7 `app/api/supervisor/operative-drawer/route.ts` – GET

| Field | Details |
|-------|---------|
| **What is missing** | `canAccessSite` uses only cookie companyId. No resolveCompanyId. |
| **Recommended fix** | Add resolveCompanyId fallback. |

---

### 3.8 `app/api/supervisor/compliance/route.ts` – GET

| Field | Details |
|-------|---------|
| **What is missing** | Same: companyId from cookie only. |
| **Recommended fix** | Add resolveCompanyId. |

---

### 3.9 Operative access to admin/supervisor data

| Field | Details |
|-------|---------|
| **What to verify** | Ensure operatives cannot reach: users list (all), sites list (all), attendance (all), tasks (all), notices (all), RAMS (all), etc. |
| **Status** | Most APIs filter by companyId; operatives typically have companyId. If operative is given company-scoped data, they would see company-wide data. Rule 3: operative must only access their own data (tasks, attendance, notices, profile). |
| **Recommended fix** | Add explicit operative check: if role is operative, further restrict to `user_id = currentUserId` for tasks, attendance, notices. |

---

### 3.10 `app/dashboard/admin-dashboard/page.tsx`

| Field | Details |
|-------|---------|
| **What is correct** | Reads role and companyId from cookies, uses resolveCompanyId, passes cookieHeader to fetch. |
| **What is missing** | Superuser without companyId: fetchUsers(companyId, role, cookieHeader) – if companyId is null, users API returns [] for superuser unless `all=true`. Verify superuser with `all=true` is passed when companyId is null. |
| **Status** | fetchUsers passes `role === "superuser"` and adds `?all=true` when companyId is not passed. Need to ensure when companyId is null we pass all=true for superuser. |

---

### 3.11 `proxy.ts` – matcher

| Field | Details |
|-------|---------|
| **What is correct** | Excludes `/api` from matcher, so API routes are not protected by proxy. |
| **Note** | Each API route must enforce its own auth; proxy does not protect API. |

---

### 3.12 Route protection for operative

| Field | Details |
|-------|---------|
| **What to verify** | Operatives are redirected to operative-dashboard. Ensure operative-dashboard and related pages only show self-data. |
| **Recommendation** | Audit operative-dashboard and any API it calls to ensure operative-scoped access. |

---

### 3.13 `app/api/profiles/[id]/route.ts` – ensureProfileAccess

| Field | Details |
|-------|---------|
| **What is correct** | Allows superuser, same company, or self. |
| **What is missing** | No resolveCompanyId when companyId is missing for admin. Could deny valid admin. |
| **Recommended fix** | Use resolveCompanyId before compare. |

---

### 3.14 `app/api/profiles/route.ts` – canEditProfile

| Field | Details |
|-------|---------|
| **What is correct** | Checks superuser, self, or same company via target user. |
| **What is missing** | Uses cookie companyId only; no resolveCompanyId for admin without cookie. |

---

### 3.15 `app/api/rams/accept/route.ts` – POST

| Field | Details |
|-------|---------|
| **What is correct** | Uses checkPreInductionAccess(userId) which validates company match. |
| **Status** | Adequate if checkPreInductionAccess enforces company scoping. |

---

## 4. LOW SEVERITY (Cookie Forwarding, sub_admin)

| File | Issue | Fix |
|------|-------|-----|
| users/actions.ts – inviteUser, deleteUser | No cookie forwarding | Add Cookie header to fetch |
| profiles/route.ts – PATCH | Already uses canEditProfile; ensure cookies forwarded | Verify |
| briefings/upload | Uses resolveCompanyId; superuser gets companyId from body? | When superuser, allow companyId from body if missing from cookie |
| coshh POST | Same resolveCompanyId pattern; ensure superuser can pass companyId | Verify body companyId for superuser |
| proxy.ts | DASHBOARD_ROLES includes sub_admin | Correct |

---

## 5. CORRECT IMPLEMENTATIONS (Reference)

| File | What is correct |
|------|-----------------|
| `app/api/users/route.ts` | GET: superuser with all=true; POST: companyId from body for superuser |
| `app/api/users/[id]/route.ts` | GET: superuser/own/same company; PATCH/DELETE: company check |
| `app/api/tasks/route.ts` | GET: superuser no companyId → all; POST: companyId required |
| `app/api/notices/route.ts` | Superuser bypass; company scoping for others |
| `app/api/rams/route.ts` | Superuser bypass; company scoping |
| `app/api/sites/route.ts` | Superuser with all=true; company filter otherwise |
| `app/api/deliveries/route.ts` | Superuser all; company filter otherwise |
| `app/api/deliveries/[id]/route.ts` | ensureDeliveryAccess with superuser bypass |
| `app/api/tasks/[id]/route.ts` | ensureTaskAccess with superuser bypass |
| `app/api/notices/[id]/route.ts` | ensureNoticeAccess |
| `app/api/rams/[id]/route.ts` | ensureRAMAccess with site/subcontractor logic |
| `app/api/sites/[id]/route.ts` | ensureSiteAccess |
| `app/api/companies/route.ts` | Superuser only for list/create |
| `app/api/companies/[companyId]/operatives/route.ts` | allowAccess(companyId) |
| `app/api/registrations/route.ts` | Superuser only |
| `app/api/impersonate/route.ts` | Superuser only |
| `app/api/maintenance/export-company/route.ts` | Superuser only |
| `app/api/maintenance/validate-data/route.ts` | Superuser only |
| `app/api/pre-induction/[userId]/_utils/auth.ts` | Superuser bypass; company match for others |
| `app/dashboard/induction-compliance/server.ts` | getComplianceData: superuser without companyId → empty; company filter |
| `app/dashboard/users/[userId]/induction/server.ts` | getInductionData: company check |
| `app/dashboard/users/[userId]/pre-induction/server.ts` | getPreInductionData: company check |

---

## 6. Summary of Minimal Diffs by Priority

### P0 – Critical (Fix Immediately)

1. **profiles/route.ts** – Add company scoping when listing all users.
2. **certifications/route.ts** – Scope certifications by company at query level.
3. **training/route.ts** – Scope training by company at query level.

### P1 – High (Fix Soon)

4. **users/actions.ts – updateUserRole** – Use API or add company scoping.
5. **attendance/route.ts – POST** – Restrict operative to self-only.
6. **coshh/[id]/route.ts** – Add superuser bypass and resolveCompanyId.
7. **safety-alerts/route.ts** – Superuser without companyId: return all or allow param.
8. **briefings/route.ts** – Superuser without companyId handling.
9. **invite-codes/route.ts** – Allow superuser to derive company from site.
10. **induction/export/route.ts** – Fix superuser companyId scope.
11. **users/[userId]/page.tsx** – resolveCompanyId; operative self-only.
12. **dashboard/actions.ts – fetchDashboardMetrics** – Forward cookies.
13. **tasks/actions.ts**, **notices/actions.ts**, **deliveries/actions.ts**, **rams/actions.ts** – Forward cookies for mutations.

### P2 – Medium (Improve Robustness)

14. Add sub_admin to: users/[id] PATCH/DELETE, pre-induction override, gdpr download-my-data.
15. Add resolveCompanyId where only cookie is used: induction-compliance/drawer, companies/[companyId], supervisor/operative-drawer, supervisor/compliance, profiles ensureProfileAccess.
16. Add operative-only restrictions to tasks, notices, attendance list APIs where applicable.

### P3 – Low

17. Ensure all server action mutations pass cookies consistently.
18. Verify operative-dashboard and related flows only expose self-data.

---

*End of audit report. No fixes have been applied; this document is for review and remediation planning.*
