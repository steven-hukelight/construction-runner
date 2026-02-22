# API Compliance Audit Report

**Date:** 2025-02-17  
**Scope:** All API routes and server actions for user/company data isolation and access control

---

## Executive Summary

A full audit was performed across all API routes to ensure:
1. **Live/Working** – Functions correctly with proper auth and data flow
2. **Company Compliance** – Non-superusers only see their company's data
3. **User Compliance** – Proper role checks and access control

---

## Fixes Applied

### 1. Company ID Fallback (`resolveCompanyId`)

**Issue:** Admins without a `companyId` cookie (e.g. logged in before fix, or non-UUID company IDs) received empty data or 403.

**Fix:** Added `resolveCompanyId` fallback to derive `company_id` from `users` table via `user_email` when the cookie is missing.

**APIs updated:**
- `/api/sites` (GET, POST, DELETE)
- `/api/deliveries` (GET, POST)
- `/api/tasks` (GET, POST)
- `/api/rams` (GET, POST)
- `/api/notices` (GET, POST)
- `/api/users` (GET, POST)
- `/api/users/[id]` (GET, PATCH, DELETE)
- `/api/users/[id]/medical` (GET)
- `/api/briefings` (GET)
- `/api/coshh` (GET, POST)
- `/api/certifications` (GET, ensureCertificationPathAccess)
- `/api/subcontractors` (GET)
- `/api/attendance` (GET had fallback, POST now has fallback)
- `/api/invite-codes` (POST)
- `/api/sites/[id]` (ensureSiteAccess)
- `/api/deliveries/[id]` (ensureDeliveryAccess)
- `/api/rams/[id]` (ensureRAMAccess)
- `/api/notices/[id]` (ensureNoticeAccess)
- `/api/tasks/[id]` (ensureTaskAccess)
- `/api/briefings/[id]` (DELETE)
- `/api/briefings/upload` (POST)
- `/api/safety-alerts` (GET, POST)
- `/api/safety-alerts/[id]` (PATCH, DELETE – via canAccessAlert)
- `/api/rams/upload` (POST)

### 2. Tasks Table Schema

**Issue:** `/api/tasks` and `/api/tasks/[id]` used `companyId` and `createdAt` but the database has `company_id` and `created_at`.

**Fix:** Updated to use `company_id` and `created_at` in queries.

### 3. Role Case Sensitivity

**Issue:** `/api/users/[id]` PATCH and DELETE checked `role === "ADMIN"` (uppercase) while cookies may store `"admin"` (lowercase).

**Fix:** Use case-insensitive comparison: `roleLower === "admin"`.

### 4. Cookie/Client Utilities

**Previous fixes (from prior work):**
- `getCompanyIdFromClient()` – Now accepts non-UUID company IDs (Firestore-style)
- Login `setUserCookies` – Sets `companyId` for any non-empty `company_id`
- `CompanySwitcher` – Accepts any non-empty company ID for impersonation

---

## Verified Compliant APIs

| API | Role Check | Company Filter | Notes |
|-----|------------|----------------|-------|
| `/api/companies` | Superuser only | N/A | Lists all for superuser |
| `/api/sites` | ✓ | ✓ | Resolve fallback added |
| `/api/deliveries` | ✓ | ✓ | Resolve fallback added |
| `/api/tasks` | ✓ | ✓ | Schema fix + resolve |
| `/api/rams` | ✓ | ✓ | Resolve fallback added |
| `/api/notices` | ✓ | ✓ | Resolve fallback added |
| `/api/users` | ✓ | ✓ | Resolve fallback added |
| `/api/users/[id]` | ✓ | ✓ | Same-company + own profile |
| `/api/briefings` | ✓ | ✓ | Resolve fallback added |
| `/api/coshh` | ✓ | ✓ | Resolve fallback added |
| `/api/certifications` | ✓ | ✓ | User-scoped, company filter |
| `/api/subcontractors` | ✓ | ✓ | Site → company chain |
| `/api/attendance` | ✓ | ✓ | User IDs by company |
| `/api/invite-codes` | ✓ | ✓ | Site company check |
| `/api/profiles` | ✓ | ✓ | Same-company or own |
| `/api/profiles/me` | ✓ | N/A | Current user only |
| `/api/impersonate` | Superuser only | N/A | Sets companyId cookie |
| `/api/company/[companyId]/*` | ✓ | ✓ | Company-scoped |

---

## Access Control Patterns

1. **Superuser:** Bypasses company filter; can pass `?companyId=` for scoped views  
2. **Admin/Supervisor:** Must have `companyId` (cookie or resolved from DB); all reads/writes filtered by company  
3. **Operative:** Scoped via `users.company_id`; certifications, pre-induction, etc. user-scoped  

---

## Server Actions (Cookie Forwarding)

| Action | Forwards Cookies | Notes |
|--------|------------------|-------|
| `fetchSites` | ✓ | Via `headers()` or param |
| `fetchRAMS` | ✓ | Via `headers()` or param |
| `fetchTasks` | ✓ | Via `headers()` or param |
| `fetchNotices` | ✓ | Via `headers()` or param |
| `fetchUsers` | ✓ | Via param |
| `fetchDeliveries` | — | Uses Supabase client / RLS |

---

## Recommendations

1. **Re-login after deployment:** Admins who logged in before the cookie fix should log out and back in to ensure `companyId` is set.
2. **Monitor:** Check for 403s or empty data in logs; `resolveCompanyId` fallback should reduce these.
3. **Pre-induction routes:** These are user-scoped; verify `pre_induction/[userId]/*` routes enforce same-company or own-profile access where applicable.
