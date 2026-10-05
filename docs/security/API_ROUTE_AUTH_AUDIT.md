# API route auth audit

Snapshot of `sitehub-admin/app/api` taken before the security fix (2026-10-04). Generated from the code, then checked by hand for routes with no obvious auth.

- **Requires auth (before)** describes what each route did on its own. Nothing upstream protected `/api` before the fix: `proxy.ts` skipped it.
- **Cookie check (unverified cookies)**: the route trusts the `role` / `uid` / `companyId` cookies. They are HttpOnly but unsigned, so any HTTP client could forge them.
- **Partial**: the route used `resolveMobileApiAuth`, which returned an empty context instead of failing when no user was found.
- **Phase 2a** notes describe the ownership rule added afterwards (`lib/auth/actingOnUser.ts`).

| Path | Methods | Requires auth (before) | Uses resolveMobileApiAuth | Notes |
|---|---|---|---|---|
| `/api/admin/auth/2fa/setup` | POST | n/a (returns 501) | No |  |
| `/api/admin/auth/2fa/verify` | POST | n/a (returns 501) | No |  |
| `/api/admin/auth/login` | POST | No (public by design) | No | login (password) |
| `/api/admin/auth/logs` | GET | Cookie check (unverified cookies) | No |  |
| `/api/admin/missing-info/remind` | POST | Cookie check (unverified cookies) | No |  |
| `/api/admin/missing-info` | GET | Cookie check (unverified cookies) | No |  |
| `/api/admin/sessions/[id]` | DELETE | Cookie check (unverified cookies) | No |  |
| `/api/admin/sessions` | GET | Cookie check (unverified cookies) | No |  |
| `/api/admin/users/[id]/info` | GET,PUT | Yes (helper / 401) | No | Phase 2b: same ownership rule as phase 2a |
| `/api/analytics/track` | POST | Cookie check (unverified cookies) | No |  |
| `/api/app-version` | GET | No (public by design) | No | Flutter pre-login version check |
| `/api/assets/[id]/assignments` | GET | Weak: reads cookies, no reject found | No |  |
| `/api/assets/[id]/export` | GET | Cookie check (unverified cookies) | No |  |
| `/api/assets/[id]/images` | GET | Partial: helper returned empty context | Yes |  |
| `/api/assets/[id]/inspections` | GET | Partial: helper returned empty context | Yes |  |
| `/api/assets/[id]/remind` | POST | Cookie check (unverified cookies) | No |  |
| `/api/assets/[id]` | GET,DELETE,PATCH | Cookie check (unverified cookies) | No |  |
| `/api/assets/[id]/upload-images` | POST | Partial: helper returned empty context | Yes |  |
| `/api/assets/assign` | POST | Cookie check (unverified cookies) | No |  |
| `/api/assets/inspection` | POST | Partial: helper returned empty context | Yes |  |
| `/api/assets/inspections/[id]/comments` | POST | Partial: helper returned empty context | Yes |  |
| `/api/assets/inspections/[id]` | GET,PATCH | Partial: helper returned empty context | Yes |  |
| `/api/assets/mine` | GET | Yes (helper / 401) | Yes |  |
| `/api/assets` | GET,POST | Yes (helper / 401) | Yes |  |
| `/api/assets/unassign` | POST | Cookie check (unverified cookies) | No |  |
| `/api/assets/upload-document` | POST | Cookie check (unverified cookies) | No |  |
| `/api/attendance/archive` | GET,POST | Cron secret, or user cookies | No | Vercel cron |
| `/api/attendance/location` | POST | Yes (helper / 401) | No |  |
| `/api/attendance/role-call-archive` | POST | Cookie check (unverified cookies) | No |  |
| `/api/attendance` | GET,POST | Yes (helper / 401) | No |  |
| `/api/auth/[...nextauth]` | GET,POST | n/a (returns 410) | No |  |
| `/api/auth/admin-setup-complete` | POST | **No** | No | No auth; updates a user's display name by email |
| `/api/auth/change-password` | POST | Cookie check (unverified cookies) | No |  |
| `/api/auth/final-approve-admin` | POST | **No** | No | **No auth; approves any account by email and rewrites its auth metadata** |
| `/api/auth/login` | POST | No (public by design) | No | login (password) |
| `/api/auth/logout` | POST | No (public by design) | No | clears cookies only |
| `/api/auth/provision-legacy-user` | POST | Cookie check (unverified cookies) | No |  |
| `/api/auth/register/resend-code` | POST | No (public by design) | No | signup email code |
| `/api/auth/register` | POST | No (public by design) | No | signup, Turnstile captcha |
| `/api/auth/register/verify-email` | POST | No (public by design) | No | signup OTP check |
| `/api/auth/registrations/[id]/reject` | POST | Cookie check (unverified cookies) | No |  |
| `/api/auth/registrations` | GET,POST | Cookie check (unverified cookies) | No |  |
| `/api/auth/request-password-reset` | POST | No (public by design) | No | forgot password |
| `/api/auth/send-password-reset` | POST | Cookie check (unverified cookies) | No |  |
| `/api/auth/sendWelcome` | POST | **No** | No | **No auth; emails any user a caller-supplied temporary password** |
| `/api/auth/setup-password` | POST | No (public by design) | No | one-time token_hash |
| `/api/briefings/[id]/acknowledgements` | GET | Cookie check (unverified cookies) | No |  |
| `/api/briefings/[id]` | DELETE | Cookie check (unverified cookies) | No |  |
| `/api/briefings/accept` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/briefings/ack-counts` | GET | Cookie check (unverified cookies) | No |  |
| `/api/briefings/acknowledged` | GET | Weak: reads cookies, no reject found | No |  |
| `/api/briefings/report/pdf` | GET | Cookie check (unverified cookies) | No |  |
| `/api/briefings/report` | GET | Cookie check (unverified cookies) | No |  |
| `/api/briefings` | GET | Weak: reads cookies, no reject found | No |  |
| `/api/briefings/upload-signature` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/briefings/upload` | POST | Weak: reads cookies, no reject found | No |  |
| `/api/certifications` | GET,POST,DELETE,PATCH | Cookie check (unverified cookies) | No |  |
| `/api/certifications/upload` | POST | Cookie check (unverified cookies) | No |  |
| `/api/companies/[companyId]/assets` | GET,POST | Cookie check (unverified cookies) | No |  |
| `/api/companies/[companyId]/logo` | POST,DELETE | Cookie check (unverified cookies) | No |  |
| `/api/companies/[companyId]/messages/[messageId]` | DELETE | Cookie check (unverified cookies) | No |  |
| `/api/companies/[companyId]/messages` | GET,POST | Cookie check (unverified cookies) | No |  |
| `/api/companies/[companyId]/offline` | GET,POST | Cookie check (unverified cookies) | No |  |
| `/api/companies/[companyId]/operatives` | GET,POST | Cookie check (unverified cookies) | No |  |
| `/api/companies/[companyId]` | GET,PATCH,DELETE | Yes (helper / 401) | No |  |
| `/api/companies` | GET,POST | Cookie check (unverified cookies) | No |  |
| `/api/company-name` | GET | Cookie check (unverified cookies) | No |  |
| `/api/company/[companyId]/inviteCode` | GET | Cookie check (unverified cookies) | No |  |
| `/api/company/[companyId]/regenerateInviteCode` | POST | Cookie check (unverified cookies) | No |  |
| `/api/compliance-export/csv` | GET | Cookie check (unverified cookies) | No |  |
| `/api/compliance-export/pdf` | GET | Cookie check (unverified cookies) | No |  |
| `/api/coshh/[id]` | DELETE | Cookie check (unverified cookies) | No |  |
| `/api/coshh` | GET,POST | Weak: reads cookies, no reject found | No |  |
| `/api/debug-user-lookup` | GET | Cookie check (unverified cookies) | No |  |
| `/api/deliveries/[id]` | PATCH,DELETE | Cookie check (unverified cookies) | No |  |
| `/api/deliveries/haulage/[id]` | DELETE | Cookie check (unverified cookies) | No |  |
| `/api/deliveries/haulage` | GET,POST | Cookie check (unverified cookies) | No |  |
| `/api/deliveries` | GET,POST | Weak: reads cookies, no reject found | No |  |
| `/api/deliveries/upload` | POST | Cookie check (unverified cookies) | No |  |
| `/api/demo` | POST | No (public by design) | No | marketing lead form, rate-limited |
| `/api/dev/seed-cert-training` | GET,POST | n/a (returns 410) | No |  |
| `/api/feedback` | POST | No (public by design) | No | feedback form on landing/login |
| `/api/gdpr/delete-account` | POST | Cookie check (unverified cookies) | No |  |
| `/api/gdpr/download-my-data` | GET | Cookie check (unverified cookies) | No |  |
| `/api/geocode/search` | GET | Cookie check (unverified cookies) | No |  |
| `/api/impersonate` | POST | Cookie check (unverified cookies) | No |  |
| `/api/induction-compliance/drawer` | GET | Weak: reads cookies, no reject found | No |  |
| `/api/induction-status` | GET | **No** | No | No auth |
| `/api/induction/ack` | POST | Yes (helper / 401) | Yes |  |
| `/api/induction/complete` | POST | Yes (helper / 401) | Yes |  |
| `/api/induction/export` | POST | Cookie check (unverified cookies) | No |  |
| `/api/induction/progress` | GET | Yes (helper / 401) | Yes |  |
| `/api/induction/reset` | POST | Cookie check (unverified cookies) | No |  |
| `/api/induction/safety-template` | GET,PUT | Yes (helper / 401) | Yes |  |
| `/api/invite-codes/redeem` | POST | No (public by design) | No | /join signup. Phase 2b: single use + expiry (migration pending), existing accounts never modified, rate limited per IP and per code |
| `/api/invite-codes` | POST | Cookie check (unverified cookies) | No | Phase 2b: verified identity; superuser, or admin / supervisor / site_admin / sub_admin of the site's company |
| `/api/maintenance/activity-log` | GET | Cookie check (unverified cookies) | No |  |
| `/api/maintenance/attendance-fallback-sign-out` | GET,POST | Cron secret, or user cookies | No | Vercel cron |
| `/api/maintenance/attendance-refresh` | POST | Cookie check (unverified cookies) | No |  |
| `/api/maintenance/audit-log-export` | GET | Cookie check (unverified cookies) | No |  |
| `/api/maintenance/bulk-invite` | POST | Cookie check (unverified cookies) | No |  |
| `/api/maintenance/copy-company` | POST | Cookie check (unverified cookies) | No |  |
| `/api/maintenance/dispatch-asset-inspection-reminders` | GET,POST | Cron secret, or user cookies | No | Vercel cron |
| `/api/maintenance/dispatch-attendance-push-queue` | GET,POST | Cron secret, or user cookies | No | Vercel cron |
| `/api/maintenance/export-company` | GET | Cookie check (unverified cookies) | No |  |
| `/api/maintenance/grandfather-inductions` | POST | Cookie check (unverified cookies) | No |  |
| `/api/maintenance/import-users-csv` | POST | Cookie check (unverified cookies) | No |  |
| `/api/maintenance/provision-all-legacy-users` | POST | Cookie check (unverified cookies) | No |  |
| `/api/maintenance/retention-cleanup` | POST | Cron secret, or user cookies | No | Vercel cron |
| `/api/maintenance/sync-profile-to-user` | POST | Cookie check (unverified cookies) | No |  |
| `/api/maintenance/validate-data` | GET | Cookie check (unverified cookies) | No |  |
| `/api/me/assigned-sites` | GET | Yes (helper / 401) | Yes |  |
| `/api/me/attendance-status` | GET | Yes (helper / 401) | No |  |
| `/api/me/email-notification-preferences` | GET,PATCH | Cookie check (unverified cookies) | No |  |
| `/api/me/inducted-sites` | GET | Yes (helper / 401) | No |  |
| `/api/me/info` | GET,PUT | Yes (helper / 401) | No |  |
| `/api/me` | GET | Cookie check (unverified cookies) | No |  |
| `/api/messages/send` | POST | Yes (helper / 401) | Yes |  |
| `/api/messages/thread/[id]/archive` | POST | Cookie check (unverified cookies) | No |  |
| `/api/messages/thread/[id]/message/[messageId]` | DELETE | Cookie check (unverified cookies) | No |  |
| `/api/messages/thread/[id]` | GET,DELETE | Yes (helper / 401) | Yes |  |
| `/api/messages/threads` | GET,POST | Yes (helper / 401) | Yes |  |
| `/api/near-miss/[id]/export` | GET | Partial: helper returned empty context | Yes |  |
| `/api/near-miss/[id]` | GET,PATCH,DELETE | Partial: helper returned empty context | Yes |  |
| `/api/near-miss/open-attachment` | GET | Cookie check (unverified cookies) | No |  |
| `/api/near-miss` | GET,POST | Partial: helper returned empty context | Yes | Anonymous GET returned every company's reports |
| `/api/near-miss/upload` | POST | Cookie check (unverified cookies) | No |  |
| `/api/notify` | POST | No (public by design) | No | marketing lead form, rate-limited |
| `/api/offline/mark-synced` | PATCH | Cookie check (unverified cookies) | No |  |
| `/api/offline/pending` | GET | Cookie check (unverified cookies) | No |  |
| `/api/offline` | POST | Cookie check (unverified cookies) | No |  |
| `/api/offline/synced` | GET | Cookie check (unverified cookies) | No |  |
| `/api/operative/avatar` | POST | Yes (helper / 401) | No |  |
| `/api/pdf/branding` | GET | Weak: reads cookies, no reject found | No |  |
| `/api/pre-induction/[userId]/certifications` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/pre-induction/[userId]/competency-card` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/pre-induction/[userId]/declarations` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/pre-induction/[userId]/medical` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/pre-induction/[userId]/override` | POST | Cookie check (unverified cookies) | No |  |
| `/api/pre-induction/[userId]/personal` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/pre-induction/[userId]/refresh-status` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/pre-induction/[userId]/right-to-work` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/pre-induction/[userId]/training` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/pre-induction/delete-document` | POST | Yes (helper / 401) | No | Phase 2b: same ownership rule as phase 2a |
| `/api/pre-induction/file` | GET | Yes (helper / 401) | No | Phase 2b: same ownership rule as phase 2a |
| `/api/pre-induction/me/override` | POST | Cookie check (unverified cookies) | No |  |
| `/api/pre-induction` | GET | **No** | No | Phase 2b: same ownership rule as phase 2a |
| `/api/pre-induction/upload` | POST | Yes (helper / 401) | No | Phase 2b: same ownership rule as phase 2a |
| `/api/profiles/[id]` | GET,PATCH,DELETE | Cookie check (unverified cookies) | No |  |
| `/api/profiles/me` | GET | Cookie check (unverified cookies) | No |  |
| `/api/profiles` | GET,PATCH | Cookie check (unverified cookies) | No |  |
| `/api/rams/[id]/acknowledgements` | GET | Cookie check (unverified cookies) | No |  |
| `/api/rams/[id]` | GET,PATCH,DELETE | Cookie check (unverified cookies) | No |  |
| `/api/rams/accept` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/rams/acknowledge` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/rams/acknowledged` | GET | Partial: helper returned empty context | Yes |  |
| `/api/rams/report/pdf` | GET | Cookie check (unverified cookies) | No |  |
| `/api/rams` | GET,POST | Weak: reads cookies, no reject found | No |  |
| `/api/rams/site/[siteId]` | GET | **No** | No | No auth; returns site row |
| `/api/rams/upload-signature` | POST | Weak: `checkPreInductionAccess` (any user in the same company passed) | No | Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/rams/upload` | POST | Weak: reads cookies, no reject found | No |  |
| `/api/registrations/[id]/approve` | GET,POST | n/a (returns 410) | No |  |
| `/api/registrations/[id]/reject` | POST | Cookie check (unverified cookies) | No |  |
| `/api/registrations` | GET | Cookie check (unverified cookies) | No |  |
| `/api/safety-alerts/[id]/acknowledge` | POST | Yes (helper / 401) | Yes |  |
| `/api/safety-alerts/[id]` | PATCH,DELETE | Partial: helper returned empty context | Yes |  |
| `/api/safety-alerts` | GET,POST | Partial: helper returned empty context | Yes |  |
| `/api/safety-checklist` | GET,POST | Yes (helper / 401) | Yes |  |
| `/api/settings/global` | POST,GET | Cookie check (unverified cookies) | No |  |
| `/api/settings/public` | GET | No (public by design) | No | banner / register page flags |
| `/api/site-rules/favourites` | GET,POST,DELETE | Yes (helper / 401) | Yes |  |
| `/api/site-rules` | GET,POST,PATCH,DELETE | Partial: helper returned empty context | Yes |  |
| `/api/site-rules/upload` | POST | Cookie check (unverified cookies) | No |  |
| `/api/sites/[id]/assigned-operatives` | GET,POST,DELETE | Cookie check (unverified cookies) | No |  |
| `/api/sites/[id]/induction-quick` | GET | Cookie check (unverified cookies) | No |  |
| `/api/sites/[id]/induction-safety` | GET,PUT | Yes (helper / 401) | Yes |  |
| `/api/sites/[id]/rams` | GET | Cookie check (unverified cookies) | No |  |
| `/api/sites/[id]` | PATCH,GET | **No** | No | No auth on GET or PATCH |
| `/api/sites/[id]/subcontractors` | GET | Cookie check (unverified cookies) | No |  |
| `/api/sites/linked` | GET | **No** | No | Company from cookie only, no user check |
| `/api/sites` | GET,POST,DELETE | Cookie check (unverified cookies) | No |  |
| `/api/stop-impersonate` | POST | **No** | No | Clears cookies only |
| `/api/storage/signed-url` | GET | Yes (helper / 401) | No |  |
| `/api/subcontractor/compliance` | GET | Cookie check (unverified cookies) | No |  |
| `/api/subcontractor/invite-operative` | POST | Cookie check (unverified cookies) | No |  |
| `/api/subcontractor/request-verification` | POST | Cookie check (unverified cookies) | No |  |
| `/api/subcontractors` | GET | Weak: reads cookies, no reject found | No |  |
| `/api/supervisor/compliance` | GET | Weak: reads cookies, no reject found | No |  |
| `/api/supervisor/operative-drawer` | GET | Cookie check (unverified cookies) | No |  |
| `/api/system-logs/clear` | POST | Cookie check (unverified cookies) | No |  |
| `/api/tasks/[id]/comments` | GET,POST | Yes (helper / 401) | Yes |  |
| `/api/tasks/[id]` | PATCH,DELETE | Partial: helper returned empty context | Yes |  |
| `/api/tasks/[id]/upload` | POST,GET | Cookie check (unverified cookies) | No |  |
| `/api/tasks` | GET,POST | Weak: reads cookies, no reject found | No |  |
| `/api/training` | GET,DELETE,PATCH | Cookie check (unverified cookies) | No |  |
| `/api/uploads/medical` | POST | **No** | No | No auth; inserts medical record. Phase 2a: own record, or admin / supervisor / site_admin / sub_admin of the same company, or superuser |
| `/api/users/[id]/inducted-sites` | GET | Cookie check (unverified cookies) | No |  |
| `/api/users/[id]/medical` | GET | Cookie check (unverified cookies) | No |  |
| `/api/users/[id]` | GET,PATCH,DELETE | Cookie check (unverified cookies) | No |  |
| `/api/users/[id]/sites` | GET,PUT | Cookie check (unverified cookies) | No |  |
| `/api/users` | GET,POST | Cookie check (unverified cookies) | No |  |

Total routes: 201
