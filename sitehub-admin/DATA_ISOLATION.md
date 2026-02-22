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
| **Firestore rules** | Read/write allowed only when `resource.data.companyId == request.auth.token.companyId` (or superuser). Create allowed only when `request.resource.data.companyId == request.auth.token.companyId` (or superuser). |
| **Dashboard** | Server-side fetch forwards the request cookies to the API, so the API always sees the correct `role` and `companyId` for the current user. |

## Collections that are company-scoped

- **sites**, **rams**, **tasks**, **notices**, **deliveries**, **attendance**, **users** – all have `companyId` and are filtered by it.
- **Certifications / training** – live under `users/{uid}/...`; access is effectively scoped by the user’s `companyId`.

## Running the migration (assign existing data to Test Company)

To assign all existing data that has **no** `companyId` to **Test Company** (and create Test Company if it doesn’t exist):

```bash
node scripts/migrate-legacy-to-test-company.js
```

Optional: set `TEST_COMPANY_ID=<firestore-company-doc-id>` to use an existing company doc instead of creating/looking up “Test Company”.

- **Collections updated:** sites, rams, operatives, attendance, deliveries, tasks, notices, **users**, certifications, settings.
- **Idempotent:** only docs with missing/empty `companyId` are updated; docs that already have a company (e.g. Briars, Wiltons) are left unchanged.

## Web + mobile alignment (operatives per company)

The **mobile app** (sitehub_worker_Ready) is aligned with the same multi-tenant model: workers and supervisors log into their **specific company** and only see that company’s data.

### Firebase Auth custom claims (required for mobile)

Firestore rules use **`request.auth.token.companyId`** and **`request.auth.token.role`**. The mobile app relies on the Firebase Auth ID token, so these must be set as **custom claims** when a user is approved:

- **Web** sets claims when approving users:
  - **Registrations** (`/api/auth/registrations`): on approve, `setCustomUserClaims(uid, { companyId, role, approved, superuser? })`.
  - **Final approve admin** (`/api/auth/final-approve-admin`): `setCustomUserClaims(uid, { approved, role, companyId })`.
- Ensure every **user document** in Firestore has **`companyId`**; the mobile app reads it and uses it for all company-scoped queries and creates.

### Mobile app behaviour

- **User model:** `SiteHubUser` includes **`companyId`** from the Firestore user doc.
- **Auth gate:** If the user is a worker or supervisor and has no `companyId`, the app shows “No company assigned” and blocks access until an admin assigns them to a company.
- **Reads:** All company-scoped collections (sites, notices, tasks, rams, attendance, deliveries, user lists) are queried with **`.where('companyId', isEqualTo: user.companyId)`** (or equivalent) when the user has a company; superuser/admin without company see all (null filter).
- **Creates:** Every create into company-scoped collections (attendance, tasks, notices, rams, deliveries, sites) sets **`companyId`** from the current user.
- **Firestore rules:** Global **attendance** read is company-scoped: `resource.data.companyId == request.auth.token.companyId || request.auth.token.superuser`. Rams create requires `request.resource.data.companyId == request.auth.token.companyId` (or superuser).

With this, the web app (sitehub-admin) and the mobile app (sitehub_worker_Ready) both enforce the same per-company data isolation for operatives.
