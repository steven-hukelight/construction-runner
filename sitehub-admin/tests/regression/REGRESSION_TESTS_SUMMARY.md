# Construction Runner Regression Tests Summary

## Overview

Automated regression tests for the Construction Runner platform cover Auth, Pre-induction, Assets, Deliveries, Messaging, Tasks, and Near Miss features. Tests run with mocked Supabase and use Node environment for Web API compatibility.

**Run tests:** `npm run test:regression`

---

## 1. Auth Tests (`auth.regression.test.ts`)

| Test | Description |
|------|-------------|
| Reject impersonate when not superuser | Non-superusers receive 403 |
| Allow impersonate when superuser | Superuser can set companyId cookie |
| Reject impersonate without company_id | Returns 400 when company_id missing |
| Clear impersonation cookies | Stop-impersonate clears cookies |
| Login with valid credentials* | Integration: Supabase Auth sign-in |
| Reject invalid credentials* | Integration: invalid email/password |
| Superuser login* | Integration: user with superuser role |

*Integration tests run when `SUPABASE_URL`, `TEST_EMAIL`, `TEST_PASSWORD` are set.

---

## 2. Pre-induction Tests (`pre-induction.regression.test.ts`)

| Test | Description |
|------|-------------|
| Return sections with immediate refresh | GET returns personal, competencyCard, certifications, declarations |
| Accept competency card update | POST competency-card with cardType, cardNumber, fileUrl |
| Allow certifications update | Certifications NOT required – empty array accepted |
| Update personal section | POST personal details syncs |

---

## 3. Assets Tests (`assets.regression.test.ts`)

| Test | Description |
|------|-------------|
| Create asset | POST with name, category, serial_number |
| List assets | GET returns array, list refresh |
| Assign asset to user | POST assign with asset_id, user_id |
| Add inspection | POST inspection with asset_id, notes |
| Validate upload document | Requires file and assetId (400 without) |

---

## 4. Deliveries Tests (`deliveries.regression.test.ts`)

| Test | Description |
|------|-------------|
| Create delivery | POST with reference, wholesaler, site_id |
| List deliveries with site name | Site selector text visibility – site name in response |
| Require company_id | Returns 400 without company |
| Validate upload | Requires deliveryId, type, file |
| Accept valid POD upload | Multipart form with pod type |
| Accept valid load photo upload | Multipart form with load type |

---

## 5. Messaging Tests (`messaging.regression.test.ts`)

| Test | Description |
|------|-------------|
| Create thread | POST threads with body, recipientIds |
| Send message | POST send with thread_id, body |
| Return messages with sender_name | GET thread returns messages with sender_name field |
| Archive thread | POST archive sets archived=true |
| Exclude archived threads | GET threads excludes archived |

---

## 6. Tasks Tests (`tasks.regression.test.ts`)

| Test | Description |
|------|-------------|
| Create task | POST with title, description, status, companyId |
| Filter by company_id | GET returns only company tasks |
| Filter by site_id | GET with siteId query param |
| List tasks | List refresh |

---

## 7. Near Miss Tests (`near-miss.regression.test.ts`)

| Test | Description |
|------|-------------|
| Create near miss | POST with description, siteId |
| Return site_name with reports | GET enriches reports with site_name |
| Require company for create | Returns 400 without company |

---

## Infrastructure

- **Mocks:** `tests/mocks/supabase.ts` (configurable response queue), `tests/mocks/next-headers.ts` (cookies), `tests/mocks/cookie-store.ts`
- **Helpers:** `tests/regression/helpers.ts` – `setMockCookies`, `clearMockCookies`, `jsonRequest`, `formDataRequest`
- **Config:** `jest.regression.config.js` – Node environment, module mocks
- **Script:** `npm run test:regression` uses `jest -c jest.regression.config.js`

Each regression test file uses `jest.mock("@/lib/supabaseAdmin", () => require("../mocks/supabase"))` to ensure the mock is applied.
