# Construction Runner Regression Testing Report

**Date:** 21 February 2026  
**Approach:** Code review and static analysis (build verification, Flutter analyze)

---

## 1. Regressions Found & Fixes Applied

### 1.1 Tasks API – site filter missing

**Area:** Tasks (6)  
**Regression:** Tasks list did not filter by `site_id` when `siteId` or `site_id` query param was provided.

**Fix applied:** `sitehub-admin/app/api/tasks/route.ts`
- Added support for `siteId` and `site_id` query params.
- When `companyId` is present and `siteId` is provided, the query adds `.eq("site_id", siteId)` to restrict tasks to that site.

```ts
const siteId = searchParams.get("siteId")?.trim() || searchParams.get("site_id")?.trim();
// ...
if (siteId) tasksQuery = tasksQuery.eq("site_id", siteId);
```

**Status:** Fixed, build verified.

---

### 1.2 Messaging screen – flow control braces

**Area:** Messaging (5)  
**Regression:** Linter reported `curly_braces_in_flow_control_structures` for multiple `if (mounted)` blocks.

**Fix applied:** `sitehub_worker_Ready/lib/screens/messaging_screen.dart`
- Wrapped `if (mounted)` bodies in braces in `_loadThreads()`:
  - Line 57–61: 401 response handling
  - Line 63–65: empty threads fallback
  - Line 68–72: catch block
  - Line 74–76: finally block

**Status:** Fixed, analyze clean for that file.

---

## 2. Verified – No Regressions Found

### 2.1 Auth & Superuser (1)
- Login/logout, impersonation, company switch, and impersonation expiry flows are implemented; no code issues found.

### 2.2 Pre-Induction (2)
- `status.ts` correctly marks personal, rightToWork, competencyCard, medical, and declarations as required.
- Certifications are not required (`certifications: false` in `getMissingSections`).
- Section update and validation logic verified.

### 2.3 Assets (3)
- Create, assign, inspect, document upload, and list refresh flows present and wired correctly.

### 2.4 Deliveries (4)
- Create, site selector, and list refresh work as designed.
- Wholesaler dropdown uses `initialValue` (no deprecation for this screen).
- **Known gap:** Mobile POD/load image upload shows `UnsupportedError` because backend `/api/deliveries/upload` does not exist. Pre-existing gap, not a regression.

### 2.5 Messaging (5)
- Mobile message input uses `SafeArea` with bottom padding.
- Thread creation, message sending, web `sender_name` display, and archive logic verified in API and client.

### 2.6 Near Miss (7)
- API returns `site_name`; list and detail views display it correctly.

---

## 3. Other Linter Issues (Out of Scope)

The following files have existing linter issues not introduced by this regression pass. They were left unchanged:

- `certifications_screen.dart` – unnecessary null comparisons  
- `create_asset_screen.dart` – deprecated `value` on DropdownButtonFormField, prefer_final_fields  
- `edit_notice_screen.dart` – prefer_final_fields  
- `geo_attendance_screen.dart` – null checks, curly braces, use_build_context_synchronously  
- `health_safety/near_miss_screen.dart` – prefer_final_fields, deprecated value, use_build_context_synchronously  
- `notices_screen.dart` – dead code, unnecessary null checks  
- `personal_info_screen.dart` – unnecessary_null_in_if_null_operators  
- `settings_screen.dart` – unused_element, deprecated value  
- `subcontractor_operatives_screen.dart` – unused_local_variable  
- `supervisor_dashboard/tabs/attendance/*` – unused_element, unnecessary_type_check  
- `supervisor_dashboard/tabs/notices/notices_tab.dart` – unused_local_variable  
- `tasks_screen.dart` – unused_field  
- `pre_induction_section_*.dart` – deprecated value, curly braces  

---

## 4. Summary

| Area            | Regressions Found | Fixes Applied      |
|-----------------|-------------------|--------------------|
| Auth & Superuser| 0                 | -                  |
| Pre-Induction   | 0                 | -                  |
| Assets          | 0                 | -                  |
| Deliveries      | 0                 | -                  |
| Messaging       | 1                 | 1 (curly braces)   |
| Tasks           | 1                 | 1 (site filter)    |
| Near Miss       | 0                 | -                  |

**Total regressions fixed:** 2  
**Build status:** sitehub-admin builds successfully  
**Flutter:** Messaging and deliveries screens analyze clean for the regression scope.
