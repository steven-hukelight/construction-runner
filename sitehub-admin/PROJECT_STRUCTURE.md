# Project structure & roles

## Folder layout (efficient for editing)

- **`app/`** – Next.js App Router. All routes and UI live here.
  - **`app/dashboard/`** – Main app after login. Single layout; sidebar switches by role.
  - **`app/dashboard/components/`** – Shared dashboard UI (Sidebar, Topbar, CompanySwitcher, tables, modals).
  - **`app/dashboard/components/layout/`** – `Sidebar.tsx` (admin), `SuperuserSidebar.tsx` (superuser). Same CSS classes for one theme.
  - **`app/dashboard/*/page.tsx`** – One page per section (sites, users, companies, etc.). Co-locate section-specific components in the same folder (e.g. `sites/SitesTable.tsx`, `users/UsersTable.tsx`).
  - **`app/api/`** – API routes by resource: `sites`, `users`, `companies`, `company/[companyId]`, etc.
- **`lib/`** – Shared server/client libs: auth, Firebase, utils. Use for role/tenant helpers.
- **`types/`** – Shared TypeScript types.
- **Root-level `briefings/`, `settings/`, `sites/`, `users/`, `notes/`** – Legacy or duplicate routes; App Router only uses `app/`. Prefer moving any needed behaviour into `app/` and removing duplicates.

## Superuser vs admin

| Aspect | Admin | Superuser |
|--------|--------|-----------|
| **Dashboard** | Company dashboard (sites, RAMS, users, tasks, notices) for their company. | Same layout; sees SuperuserSidebar. Must **select a company** (company switcher) to see company data; otherwise sees “No company selected” and the superuser dashboard. |
| **Entry** | Login → `/dashboard` with company from their user record. | Login → `/dashboard`; nav includes “Superuser Dashboard” → `/dashboard/superuser-dashboard`. |
| **Sidebar** | `Sidebar.tsx` – Sites, RAMS, Users, Operatives, Attendance, etc. | `SuperuserSidebar.tsx` – Superuser Dashboard, Companies, All Users, System Logs, Global Settings, Superuser Tools. |
| **Theme** | Shared: gradient sidebar, cards, topbar (see `app/globals.css`). | Same theme; SuperuserSidebar uses the same `.sidebar` and nav styles. |

Role is set at login via cookie `role` (`ADMIN` or `superuser`). Middleware allows both on `/dashboard`; only superuser can access `/api/companies`.

## Multi-tenant (companies)

- **Firestore**: `companies` collection (name, inviteCode, createdAt). Users, sites, tasks, notices, RAMS, etc. have `companyId`.
- **Admin**: Belongs to one company (e.g. from profile/claims). All dashboard data is scoped by `companyId` (from `localStorage.companyId` in client components; server APIs can be extended to use a `companyId` cookie or header).
- **Superuser**: No single company. Uses **company switcher** (Topbar) to set `localStorage.companyId` and reload; then dashboard and APIs act as that company. List of companies from `GET /api/companies` (superuser only).
- **Registration**: `app/api/auth/register` – new user supplies company name (creates company) or company invite code (joins existing). `companyId` stored on user/registration.

## Multi-tenant enforcement (current)

- **API routes** – GET/POST for sites, rams, tasks, notices, deliveries, attendance, users all use `companyId` from cookie (or query for superuser). Server-side dashboard fetch forwards cookies so APIs see the correct context.
- **Superuser** – Sees Superuser Sidebar; no companyId until they click "Enter Company Dashboard" on a company, which sets `companyId` cookie and reloads so they view that company’s data (impersonation; auth claims unchanged).
- **Users GET** – Without `?all=true`, returns only users for `companyId` (cookie or query). With `?all=true` (superuser only), returns all users.
- **New documents** – All create operations set `companyId` (from cookie or, for superuser, body/query). New companies get `status: "Active"` and `updatedAt`.

## Legacy data migration (Test Company)

Run once to assign missing `companyId` to the Test Company (idempotent):

```bash
# Option 1: Set the Test Company Firestore document ID
TEST_COMPANY_ID=<your-test-company-doc-id> node scripts/migrate-legacy-to-test-company.js

# Option 2: Create a company named "Test Company" or "Test Company Ltd" in Firestore; script will find it by name
node scripts/migrate-legacy-to-test-company.js
```

Collections updated: `sites`, `rams`, `operatives`, `attendance`, `deliveries`, `tasks`, `notices`, `certifications`, `settings`. Documents that already have a non-empty `companyId` (e.g. Briars, Wiltons) are not changed.

## Firestore security rules

- **Superuser** – `request.auth.token.superuser == true` can read/write all.
- **Others** – Read/write only where `resource.data.companyId == request.auth.token.companyId` (create: `request.resource.data.companyId`). Set `companyId` (and optionally `superuser`) in Firebase Auth custom claims when approving users so client-side and rules work.
