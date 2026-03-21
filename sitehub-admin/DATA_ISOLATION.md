# Data isolation: companies are fully separate

## Confirmation

**New data entered in one company is completely separate from other companies.**

- Every document that is company-scoped has a **`companyId`** field set to the current company when created.
- All **read** queries filter by **`companyId`** (from the logged-in user’s context: cookie for web, or auth token).
- **Superuser** can see all companies and all data; normal **admins** see only their own company’s data.

So:

- **Company A** admin: cookie `companyId=A` → all creates get `companyId: A`, all reads use `where("companyId", "==", "A")`.
- **Company B** admin: cookie `companyId=B` → same pattern for B.
- **New companies** get the same behaviour: their admin’s cookie is set to that company’s ID, so all new sites, users, tasks, notices, RAMS, deliveries, attendance are stored with that company’s ID and only that company can see them.

## How it’s enforced

| Layer | What happens |
|-------|----------------------|
| **API (Next.js)** | All create handlers set `companyId` from cookie (or, for superuser, from body/query). All list/get handlers filter by `companyId` from cookie (or query for superuser). |
| **Supabase RLS** | Policies on company-scoped tables enforce `company_id = auth.jwt() ->> 'companyId'` (except for superuser/admin bypass). Inserts default `company_id` from the caller unless explicitly provided by superuser. |
| **Dashboard** | Server-side fetch forwards the request cookies to the API, so the API always sees the correct `role` and `companyId` for the current user. |

## Tables that are company-scoped

- **sites**, **rams**, **tasks**, **notices**, **deliveries**, **attendance**, **users**, **certifications/training** – all carry `company_id` and are filtered by it.

## Running the migration (assign existing data to Test Company)

To assign all existing data that has **no** `companyId` to **Test Company** (and create Test Company if it doesn’t exist):

```bash
node scripts/migrate-legacy-to-test-company.js
```

Optional: set `TEST_COMPANY_ID=<supabase-company-id>` to use an existing company row instead of creating/looking up “Test Company”.

- **Tables updated:** sites, rams, operatives, attendance, deliveries, tasks, notices, **users**, certifications, settings.
- **Idempotent:** only rows with missing/empty `company_id` are updated; rows that already have a company are left unchanged.

## Web + mobile alignment (operatives per company)

The **mobile app** (sitehub_worker_Ready) follows the same multi-tenant rules: workers and supervisors log into their specific company and only see that company’s data via Supabase RLS.

- **User model:** `SiteHubUser` carries `company_id` from the Supabase profile.
- **Auth gate:** If a worker/supervisor lacks `company_id`, the app blocks access until assigned.
- **Reads:** Company-scoped tables (sites, notices, tasks, rams, attendance, deliveries, user lists) query with `company_id = currentUser.company_id`; superuser/admin without company can see all.
- **Creates:** All inserts set `company_id` from the current user unless a superuser overrides.
- **RLS:** Policies mirror the above; attendance/rams/tasks/notices/deliveries/sites/users enforce `company_id` equality except for superuser/admin bypass.

With this, the web app (sitehub-admin) and the mobile app (sitehub_worker_Ready) both enforce the same per-company data isolation under Supabase.
