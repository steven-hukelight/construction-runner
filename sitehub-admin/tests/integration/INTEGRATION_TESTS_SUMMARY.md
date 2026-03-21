# Construction Runner Integration Tests Summary

## Overview

Integration tests run against **real Supabase** and API routes when environment variables are set. Tests are **skipped gracefully** when required env vars are missing.

**Run tests:** `npm run test:integration`

**Required env vars:**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `TEST_EMAIL`
- `TEST_PASSWORD`

**Additional for API route tests:**
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 1. Auth Integration Tests (`auth.integration.test.ts`)

| Test | Description |
|------|-------------|
| Login with valid credentials | Supabase Auth sign-in |
| Reject invalid credentials | Invalid email/password returns error |
| Superuser login | User with superuser role can log in |
| Start impersonation when superuser | POST /api/impersonate sets cookies |
| Stop impersonation | POST /api/stop-impersonate clears cookies |
| Reject impersonate when not superuser | Non-superuser receives 403 |
| Impersonation cookie maxAge | Cookie has time-boxed maxAge |
| Rehydration (session after login) | Valid access_token for mobile SecureStorage |

---

## 2. Assets Integration Tests (`assets.integration.test.ts`)

| Test | Description |
|------|-------------|
| Create asset | POST /api/assets with name, category, serial_number |
| Fetch asset list | GET /api/assets returns array |
| Verify company_id scoping | List filtered by company |
| Assign asset | POST /api/assets/assign with asset_id, user_id |
| Add inspection | POST /api/assets/inspection with asset_id, notes |
| Document upload validation | Requires assetId (400 without) |

---

## 3. Deliveries Integration Tests (`deliveries.integration.test.ts`)

| Test | Description |
|------|-------------|
| Create delivery | POST /api/deliveries with reference, wholesaler, site_id |
| Fetch delivery list | GET /api/deliveries with site enrichment |
| Verify site_id and company_id scoping | List filtered by company |
| POD upload validation | Requires file (400 without) |
| Accept valid POD upload | Multipart with deliveryId, type=pod, file |
| Accept valid load photo upload | Multipart with deliveryId, type=load, file |

---

## 4. Messaging Integration Tests (`messaging.integration.test.ts`)

| Test | Description |
|------|-------------|
| Create thread | POST /api/messages/threads |
| Send message | POST /api/messages/send |
| Fetch messages | GET /api/messages/thread/[id] |
| Archive thread | POST /api/messages/thread/[id]/archive |
| Exclude archived threads | Archived threads not in list |

---

## 5. Tasks Integration Tests (`tasks.integration.test.ts`)

| Test | Description |
|------|-------------|
| Create task | POST /api/tasks with title, description, status, companyId |
| Fetch tasks by company_id | GET filters by company |
| Fetch tasks by site_id | GET with siteId query param |
| Verify task appears after creation | Created task in list |

---

## 6. Near Miss Integration Tests (`near-miss.integration.test.ts`)

| Test | Description |
|------|-------------|
| Create near miss | POST /api/near-miss with description, siteId |
| Verify site_name returned | Reports include site_name, not just site_id |
| Fetch near miss list | GET /api/near-miss |

---

## 7. Pre-Induction Integration Tests (`pre-induction.integration.test.ts`)

| Test | Description |
|------|-------------|
| Return sections with immediate refresh | GET returns personal, competencyCard, certifications, declarations |
| Update personal section | POST personal details |
| Competency card required | POST competency-card accepted |
| Certifications NOT required | POST certifications with empty array accepted |

---

## Infrastructure

- **Env check:** `tests/integration/env.ts` – `hasIntegrationEnv()`, `hasApiIntegrationEnv()`
- **Helpers:** `tests/integration/helpers.ts` – `getAuthContext()`, `applyAuthContext()`, `jsonRequest()`
- **Config:** `jest.integration.config.js` – Node environment, **no supabaseAdmin mock** (uses real Supabase)
- **Cookie mock:** Same `next/headers` mock as regression – cookies set via `applyAuthContext()` for API routes

---

## Test Count Summary

| Module | Tests |
|--------|-------|
| Auth | 8 |
| Assets | 6 |
| Deliveries | 6 |
| Messaging | 5 |
| Tasks | 4 |
| Near Miss | 3 |
| Pre-Induction | 4 |
| **Total** | **36** |
