# SiteHub Performance Tests Summary

## Overview

Performance tests for the SiteHub platform span four categories: API, Mobile, Web, and Database.

---

## 1. API Performance Tests

**File:** `sitehub-admin/tests/performance/api.performance.test.ts`

**Run:** `npm run test:performance`

**Requirements:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `TEST_EMAIL`, `TEST_PASSWORD`

**Threshold:** Each endpoint must respond in **< 500ms** under normal load.

| Endpoint | Method | Threshold |
|----------|--------|-----------|
| `/api/tasks` | GET | 500ms |
| `/api/assets` | GET | 500ms |
| `/api/deliveries` | GET | 500ms |
| `/api/messages/threads` | GET | 500ms |
| `/api/messages/thread/[id]` | GET | 500ms |
| `/api/near-miss` | GET | 500ms |

**Details:**
- Warms Supabase connection before tests
- Uses `performance.now()` for timing
- Tests skip when integration env vars are missing

---

## 2. Mobile Performance Tests

**File:** `sitehub_worker_Ready/test/performance/performance_test.dart`

**Run:** `cd sitehub_worker_Ready && flutter test test/performance/performance_test.dart`

**Requirements:** Flutter SDK

**Thresholds:**

| Screen / Action | Threshold |
|-----------------|-----------|
| Home screen first paint | < 300ms |
| Messaging screen first paint | < 300ms |
| Pre-induction section card build | < 200ms |
| Asset list first paint | < 400ms |
| Delivery list first paint | < 400ms |

**Details:**
- Uses Flutter widget test harness with frame timing
- Measures frame build times via `Stopwatch` around `pump`/`pumpWidget`
- Messaging/Asset/Delivery tests use loading-state scaffolds (actual screens fire API calls that leave pending timers)

---

## 3. Web Performance Tests

**File:** `sitehub-admin/tests/performance/web.performance.spec.ts`

**Run:** `npm run test:web:performance`  
Requires Next.js dev server (`npm run dev`) or production build (`npm run build && npm run start`).

**Threshold:** TTI (Time to Interactive) < **1.5s** per page.

| Page | Route | Threshold |
|------|-------|-----------|
| Messaging | `/dashboard/messaging` | 1.5s |
| Assets | `/dashboard/assets` | 1.5s |
| Deliveries | `/dashboard/deliveries` | 1.5s |
| Tasks | `/dashboard/tasks` | 1.5s |

**Details:**
- Uses Playwright with Chromium
- Measures `domContentLoadedEventEnd` via Performance API
- Base URL: `PLAYWRIGHT_BASE_URL` or `http://localhost:3000`

---

## 4. Database Performance Tests

**File:** `sitehub-admin/tests/performance/database.performance.test.ts`

**Run:** `npm run test:performance`

**Requirements:**
- Same as API tests, plus `DATABASE_URL` or `SUPABASE_DB_URL` for index/EXPLAIN checks

**Tests:**
1. **Index existence** – verifies indexes on `company_id`, `site_id`, `created_at` for:
   - `tasks` (idx_tasks_company_id, idx_tasks_site_id, idx_tasks_created_at)
   - `deliveries` (idx_deliveries_company_id)
   - `assets` (idx_assets_company_id)

2. **EXPLAIN ANALYZE** – ensures list queries use indexes (no sequential scan on large tables):
   - Tasks list query
   - Deliveries list query
   - Assets list query

**Details:**
- Skips when `DATABASE_URL` is not set
- Uses raw `pg` client for `pg_indexes` and `EXPLAIN`

---

## CI Configuration

**File:** `sitehub-admin/.github/workflows/ci.yml`

Three performance-related jobs:

1. **test** – Runs API + DB performance tests (Jest) with Supabase secrets
2. **web-performance** – Builds Next.js, runs Playwright web performance tests
3. **mobile-performance** – Runs Flutter integration performance tests in `sitehub_worker_Ready`

All performance jobs use `continue-on-error: true` so CI does not fail on performance flakiness; remove if strict enforcement is desired.

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run test:performance` | Jest API + DB performance tests |
| `npm run test:web:performance` | Playwright web performance tests |

---

## Indexes Migration

Indexes used by database performance tests are defined in:
`supabase/migrations/20260225000000_performance_indexes.sql`

Ensure this migration is applied before running database performance tests.
