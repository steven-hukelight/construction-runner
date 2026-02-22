# SiteHub Full QA Cycle Summary

**Date:** February 21, 2025  
**Scope:** All modules – Auth, Pre-induction, Assets, Deliveries, Messaging, Tasks, Near Miss

---

## 1. Issues Found

| # | Module | Issue | Severity |
|---|--------|-------|----------|
| 1 | Auth & Superuser | Session timeout cleared `role`, `companyId`, etc. but **not** `impersonating` cookie | Medium |
| 2 | Near Miss | List subtitle always showed `site_id` instead of `site_name` when API returned it | Low |
| 3 | Deliveries | Corrupted character (0x97/0xb7) in list fallbacks and subtitle separator – displayed as `ï¿½` or mojibake | Low |

---

## 2. Fixes Applied

### 2.1 Auth – Impersonation cookie on session timeout

**File:** `sitehub-admin/lib/hooks/useSessionTimeout.ts`

**Change:** Added `impersonating` to the list of cookies cleared when the 12-hour inactivity timeout triggers logout.

**Before:**
```ts
["role", "companyId", "user_email", "uid"].forEach(
  (name) => (document.cookie = `${name}=; path=/; max-age=0`)
);
```

**After:**
```ts
["role", "companyId", "user_email", "uid", "impersonating"].forEach(
  (name) => (document.cookie = `${name}=; path=/; max-age=0`)
);
```

---

### 2.2 Near Miss – Display `site_name` in list

**File:** `sitehub_worker_Ready/lib/screens/health_safety/near_miss_screen.dart`

**Change:** Subtitle now shows `site_name` when returned by the API, with fallback to `site_id` when `site_name` is missing.

**Before:** Always used `site_id` or generic "Site: ...".

**After:**
```dart
subtitle: Text(
  _formatDate(r['created_at']) +
      (r['site_name'] != null && (r['site_name'] as String).isNotEmpty
          ? ' • ${r['site_name']}'
          : (r['site_id'] != null ? ' • Site: ${r['site_id']}' : '')),
),
```

---

### 2.3 Deliveries – Corrupted character fix

**File:** `sitehub_worker_Ready/lib/screens/deliveries_screen.dart`

**Change:**
1. Replaced invalid byte `0x97` (displayed as `ï¿½`) with hyphen `-` for ref/site/date fallbacks.
2. Replaced Latin-1 `0xb7` with UTF-8 middle dot in subtitle.
3. Replaced em dash fallbacks with hyphen for consistency.
4. Updated subtitle separator to ASCII pipe `|` for robustness.

**Before:**
```dart
final ref = d['reference'] ?? d['wholesaler'] ?? 'ï¿½';
final site = d['site'] ?? d['site_id'] ?? 'ï¿½';
// ...
subtitle: Text('$site ï¿½ $dateStr'),
```

**After:**
```dart
final ref = d['reference'] ?? d['wholesaler'] ?? '-';
final site = d['site'] ?? d['site_id'] ?? '-';
final dateStr = dateRaw != null
    ? DateTime.tryParse(dateRaw)?.toLocal().toString().split(' ').first ?? '-'
    : '-';
// ...
subtitle: Text('$site | $dateStr'),
```

---

## 3. Verified (No Changes Required)

### Auth & Superuser
- Login/logout flow works.
- Impersonation start/stop via `/api/impersonate`, `/api/stop-impersonate`.
- Company switching and impersonation expiry (30-day cookie; cleared on 12h timeout).
- Secure storage rehydration on mobile (AuthGate, SecureStorageService).

### Pre-induction
- Sections update immediately via `_onSectionSaved`.
- Competency card required.
- Certifications optional.
- Navigation between sections works.
- No offline fallback for pre-induction (online only).

### Assets
- Create, assign, inspect, document upload implemented.
- List refresh after create.
- Asset detail view (`AssetDetailClient.tsx`).
- Status updates via PATCH.

### Deliveries
- Delivery creation, site selector, POD and load photo uploads.
- Detail refresh and list refresh.

### Messaging
- Mobile input wrapped in `SafeArea(top: false)` with `MediaQuery.of(context).padding.bottom`.
- Web `MessageThreadClient` shows `sender_name`.
- Thread creation, message sending, archive, archived threads excluded.

### Tasks
- Task creation, list refresh.
- `company_id` and `site_id` filters.

### Near Miss
- `site_name` in list (fixed as above).
- List, detail, and creation flow implemented.

---

## 4. Regression Tests

```
npm run test:regression
```

**Result:** All 7 test suites passed (31 passed, 3 skipped).

| Suite | Status |
|-------|--------|
| auth | PASS |
| pre-induction | PASS |
| assets | PASS |
| deliveries | PASS |
| messaging | PASS |
| tasks | PASS |
| near-miss | PASS |

---

## 5. Files Modified

| File | Changes |
|------|---------|
| `sitehub-admin/lib/hooks/useSessionTimeout.ts` | Add `impersonating` to cookies cleared on timeout |
| `sitehub_worker_Ready/lib/screens/health_safety/near_miss_screen.dart` | Use `site_name` in list subtitle when available |
| `sitehub_worker_Ready/lib/screens/deliveries_screen.dart` | Fix fallbacks and subtitle separator encoding |

---

## 6. Final QA Summary

| Area | Status | Notes |
|------|--------|------|
| Auth & Superuser | ✅ Pass | Impersonation cookie cleared on timeout |
| Pre-induction | ✅ Pass | No issues |
| Assets | ✅ Pass | No issues |
| Deliveries | ✅ Pass | Encoding corrected |
| Messaging | ✅ Pass | No issues |
| Tasks | ✅ Pass | No issues |
| Near Miss | ✅ Pass | `site_name` displayed |

All modules verified. Three issues fixed. Regression tests passing.
