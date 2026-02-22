# P2 Medium Issues – Diffs for Approval

---

## 1. Add sub_admin to allowed roles

### 1a. app/api/users/[id]/route.ts – PATCH

**Fix:** Include sub_admin alongside admin for PATCH (update user roles).

```diff
     const isSuperuser = roleLower === "superuser";
-    const isAdmin = roleLower === "admin";
+    const isAdmin = roleLower === "admin" || roleLower === "sub_admin";
     if (!isSuperuser && !isAdmin) {
```

---

### 1b. app/api/users/[id]/route.ts – DELETE

**Fix:** Include sub_admin alongside admin for DELETE (delete user in own company).

```diff
-  if (roleLower !== "superuser" && roleLower !== "admin") {
+  if (roleLower !== "superuser" && roleLower !== "admin" && roleLower !== "sub_admin") {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
   }
   if (roleLower !== "superuser") {
```

---

### 1c. app/api/pre-induction/[userId]/override/route.ts

**Fix:** Allow sub_admin to set pre-induction override (same as admin).

```diff
-    const canOverride = role === "superuser" || role === "admin" || role === "ADMIN";
+    const canOverride = role === "superuser" || role === "admin" || role === "ADMIN" || role === "sub_admin";
```

---

### 1d. app/api/pre-induction/[userId]/override/route.ts – resolveCompanyId fallback

**Fix:** Add resolveCompanyId when companyId cookie is missing so admin/sub_admin without cookie can derive company from user record.

```diff
     const role = cookieStore.get("role")?.value;
-    const companyId = cookieStore.get("companyId")?.value;
+    let companyId = cookieStore.get("companyId")?.value;
+    if (!companyId && role !== "superuser") {
+      companyId =
+        (await import("@/lib/auth/companyId").then(m => m.resolveCompanyId({
+          cookieCompanyId: cookieStore.get("companyId")?.value,
+          userEmail: cookieStore.get("user_email")?.value,
+          role,
+        }))) || undefined;
+    }

     const canOverride = role === "superuser" || role === "admin" || role === "ADMIN" || role === "sub_admin";
     if (role !== "superuser") {
       const userCompanyId = cid(user);
       if (companyId !== userCompanyId) {
         return NextResponse.json({ error: "Forbidden" }, { status: 403 });
       }
     }
```

**One sentence:** resolveCompanyId fallback lets admin/sub_admin without company cookie derive company from profile/site when overriding pre-induction.

---

### 1e. app/api/gdpr/download-my-data/route.ts

**Fix:** Include sub_admin alongside admin when allowing export of another user's data (same company scope).

```diff
     if (!isSelf) {
-      if (role !== "superuser" && role !== "admin" && role !== "ADMIN") {
+      if (role !== "superuser" && role !== "admin" && role !== "ADMIN" && role !== "sub_admin") {
         return NextResponse.json({ error: "Can only export own data" }, { status: 403 });
       }
```

**One sentence:** sub_admin can export company users' data for GDPR requests, same as admin.

---

## 2. Add resolveCompanyId fallback to routes using only cookie companyId

### 2a. app/api/induction-compliance/drawer/route.ts

**Fix:** Call resolveCompanyId when companyId cookie is missing so admin/supervisor without cookie can still view compliance drawer.

```diff
 import { NextResponse } from "next/server";
 import { cookies } from "next/headers";
 import { getComplianceDrawerData } from "@/app/dashboard/induction-compliance/server";
 
 export const dynamic = "force-dynamic";
 
 export async function GET(req: Request) {
   try {
     const url = new URL(req.url);
     const userId = url.searchParams.get("userId");
     const siteIdsParam = url.searchParams.get("siteIds");
     if (!userId) {
       return NextResponse.json({ error: "userId required" }, { status: 400 });
     }
 
     const cookieStore = await cookies();
     const role = cookieStore.get("role")?.value;
-    const companyId = cookieStore.get("companyId")?.value;
+    let companyId = cookieStore.get("companyId")?.value;
+    if (!companyId && role !== "superuser") {
+      companyId =
+        (await import("@/lib/auth/companyId").then(m => m.resolveCompanyId({
+          cookieCompanyId: cookieStore.get("companyId")?.value,
+          userEmail: cookieStore.get("user_email")?.value,
+          role,
+        }))) || undefined;
+    }
 
     const siteIds = siteIdsParam ? siteIdsParam.split(",").filter(Boolean) : undefined;
```

**One sentence:** resolveCompanyId fallback enables admin/supervisor without company cookie to view induction-compliance drawer.

---

### 2b. app/api/companies/[companyId]/route.ts – GET and PATCH

**Fix:** Use resolveCompanyId when cookie companyId is missing so admin/supervisor can access their company by URL param.

```diff
 export async function GET(_req: Request, { params }: { params: Promise<{ companyId: string }> }) {
   const cookieStore = await cookies();
   const role = cookieStore.get("role")?.value;
-  const cookieCompanyId = cookieStore.get("companyId")?.value;
+  let cookieCompanyId = cookieStore.get("companyId")?.value;
+  if (!cookieCompanyId && role !== "superuser") {
+    cookieCompanyId =
+      (await import("@/lib/auth/companyId").then(m => m.resolveCompanyId({
+        cookieCompanyId: cookieStore.get("companyId")?.value,
+        userEmail: cookieStore.get("user_email")?.value,
+        role,
+      }))) || undefined;
+  }
   const { companyId } = await params;
-  if (role !== "superuser" && cookieCompanyId !== companyId) {
+  if (role !== "superuser" && (!cookieCompanyId || cookieCompanyId !== companyId)) {
     return NextResponse.json({ error: "Forbidden" }, { status: 403 });
   }
```

```diff
 export async function PATCH(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
   const cookieStore = await cookies();
   const role = cookieStore.get("role")?.value;
-  const cookieCompanyId = cookieStore.get("companyId")?.value;
+  let cookieCompanyId = cookieStore.get("companyId")?.value;
+  if (!cookieCompanyId && role !== "superuser") {
+    cookieCompanyId =
+      (await import("@/lib/auth/companyId").then(m => m.resolveCompanyId({
+        cookieCompanyId: cookieStore.get("companyId")?.value,
+        userEmail: cookieStore.get("user_email")?.value,
+        role,
+      }))) || undefined;
+  }
   const { companyId } = await params;
   const isSuperuser = role === "superuser";
   const isOwnCompany = cookieCompanyId === companyId;
```

**One sentence:** resolveCompanyId lets admin/supervisor without cookie access and update their company record.

---

### 2c. app/api/supervisor/operative-drawer/route.ts

**Fix:** Pass resolved companyId to canAccessSite when cookie is missing.

```diff
     const cookieStore = await cookies();
     const role = cookieStore.get("role")?.value;
-    const companyId = cookieStore.get("companyId")?.value;
+    let companyId = cookieStore.get("companyId")?.value;
+    if (!companyId && role !== "superuser") {
+      companyId =
+        (await import("@/lib/auth/companyId").then(m => m.resolveCompanyId({
+          cookieCompanyId: cookieStore.get("companyId")?.value,
+          userEmail: cookieStore.get("user_email")?.value,
+          role,
+        }))) || undefined;
+    }
     if (!(await canAccessSite(siteId, { role, companyId }))) {
```

**One sentence:** resolveCompanyId fallback lets supervisors without company cookie open operative drawer for their company's sites.

---

### 2d. app/api/supervisor/compliance/route.ts

**Fix:** Resolve companyId before calling buildSupervisorComplianceDataset.

```diff
     const cookieStore = await cookies();
     const role = cookieStore.get("role")?.value;
-    const companyId = cookieStore.get("companyId")?.value;
+    let companyId = cookieStore.get("companyId")?.value;
+    if (!companyId && role !== "superuser") {
+      companyId =
+        (await import("@/lib/auth/companyId").then(m => m.resolveCompanyId({
+          cookieCompanyId: cookieStore.get("companyId")?.value,
+          userEmail: cookieStore.get("user_email")?.value,
+          role,
+        }))) || undefined;
+    }
 
     const data = await buildSupervisorComplianceDataset(siteId, { role, companyId });
```

**One sentence:** resolveCompanyId enables supervisors without company cookie to load compliance data.

---

### 2e. app/api/profiles/[id]/route.ts – ensureProfileAccess

**Fix:** Use resolveCompanyId instead of only cookie so admin/supervisor without cookie can access profiles in their company.

```diff
 async function ensureProfileAccess(userId: string, userData: Record<string, unknown>): Promise<NextResponse | null> {
   const cookieStore = await cookies();
   const role = cookieStore.get("role")?.value;
-  const companyId = cookieStore.get("companyId")?.value;
+  let companyId = cookieStore.get("companyId")?.value;
+  if (!companyId && role !== "superuser") {
+    companyId =
+      (await import("@/lib/auth/companyId").then(m => m.resolveCompanyId({
+        cookieCompanyId: cookieStore.get("companyId")?.value,
+        userEmail: cookieStore.get("user_email")?.value,
+        role,
+      }))) || undefined;
+  }
   const userEmail = cookieStore.get("user_email")?.value;
   if (role === "superuser") return null;
   const targetCompanyId = userData.company_id != null ? String(userData.company_id) : null;
```

**One sentence:** ensureProfileAccess uses resolveCompanyId so admin/supervisor without company cookie can view/edit profiles in their company.

---

### 2f. app/api/profiles/route.ts – canEditProfile

**Fix:** Use resolveCompanyId when cookieCompanyId is missing so admin can edit profiles in their company.

```diff
   const { data: target } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).single();
   if (!target) return false;
   const targetCompanyId = String(target.company_id ?? "").trim();
-  const cookieCompanyId = (cookieStore.get("companyId")?.value ?? "").trim();
+  let cookieCompanyId = (cookieStore.get("companyId")?.value ?? "").trim();
+  if (!cookieCompanyId && role !== "superuser") {
+    cookieCompanyId =
+      (await resolveCompanyId({
+        cookieCompanyId: cookieStore.get("companyId")?.value,
+        userEmail: cookieStore.get("user_email")?.value,
+        role,
+      })) || "";
+  }
   return !!targetCompanyId && targetCompanyId === cookieCompanyId;
```

**One sentence:** canEditProfile uses resolveCompanyId when cookie is missing so admin can edit company profiles.

---

## 3. Operative-only restrictions on list endpoints

### 3a. app/api/tasks/route.ts GET

**Fix:** When role is operative, filter tasks by assigned_to = currentUserId so operatives only see their own tasks.

```diff
     if (role === "superuser" && !companyId) {
       const { data } = await supabaseAdmin.from("tasks").select("*").order("created_at", { ascending: false });
       return NextResponse.json(data || []);
     }
-    if (companyId) {
+    const roleLower = (role ?? "").toLowerCase();
+    if (roleLower === "operative") {
+      const { data: me } = await supabaseAdmin
+        .from("users")
+        .select("id")
+        .eq("email", cookieStore.get("user_email")?.value ?? "")
+        .maybeSingle();
+      if (me?.id) {
+        const { data } = await supabaseAdmin
+          .from("tasks")
+          .select("*")
+          .eq("assigned_to", me.id)
+          .order("created_at", { ascending: false });
+        return NextResponse.json(data || []);
+      }
+      return NextResponse.json([]);
+    }
+    if (companyId) {
```

**One sentence:** Operatives only see tasks assigned to them (filter by `assigned_to`), not company-wide tasks.

---

### 3b. app/api/notices/route.ts GET

**Fix:** When role is operative, return [] (operatives don't see company-wide notices as a list).

```diff
     if (role === "superuser") {
       companyId = searchParams.get("companyId") || companyId || undefined;
       ...
     }
+    const roleLower = (role ?? "").toLowerCase();
+    if (roleLower === "operative") {
+      return NextResponse.json([]);
+    }
     if (companyId) {
```

**One sentence:** Operatives receive no company-wide notices; they only get notices via other flows (e.g. sign-in prompts) if applicable.

---

### 3c. app/api/attendance/route.ts GET

**Fix:** When role is operative, filter by user_id = currentUserId so operatives only see their own attendance.

```diff
     if (role === "superuser") {
       ...
     }
 
+    const roleLower = (role ?? "").toLowerCase();
+    if (roleLower === "operative") {
+      const { data: me } = await supabaseAdmin
+        .from("users")
+        .select("id")
+        .eq("email", cookieStore.get("user_email")?.value ?? "")
+        .maybeSingle();
+      if (me?.id) {
+        const { data: att } = await supabaseAdmin
+          .from("attendance")
+          .select("*")
+          .eq("user_id", me.id)
+          .order("timestamp", { ascending: false })
+          .limit(limit);
+        return NextResponse.json(att ?? []);
+      }
+      return NextResponse.json([]);
+    }
+
     if (companyId) {
```

**One sentence:** Operatives only see their own attendance records, not company-wide attendance.

---

## 4. Superuser not blocked when companyId is null

### 4a. admin-dashboard fetchUsers

**Already fixed:** fetchUsers passes `?all=true` when role is superuser and companyId is absent; `/api/users` supports `all=true` and returns all users for superuser. No change needed.

### 4b. app/api/users/route.ts

**Status:** When superuser has no companyId and `all=true`, the route returns all users. When superuser has no companyId and no `all=true`, it returns []. The admin-dashboard passes `all=true` when companyId is null and role is superuser. No change needed.

---

## 5. Operative-dashboard and related flows only expose self-data

### Summary

- **operative-dashboard page:** Minimal (Welcome + menu). Does not fetch company-wide data. No change.
- **Related flows:** Tasks, notices, and attendance list endpoints are restricted for operatives in section 3 above.
- **Conclusion:** The API changes in section 3 ensure operatives only see their own data when using tasks, notices, and attendance. No additional changes required for the operative-dashboard page.
</think>

<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace