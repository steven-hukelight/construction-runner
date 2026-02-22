# Firebase → Supabase Migration Status

## Completed ✅

### Web (sitehub-admin)
- **lib/supabaseAdmin.ts** – Service role client for API routes
- **lib/auditLog.ts** – Migrated to Supabase audit_logs table
- **lib/ramsCompliance.ts** – Migrated onRamsApprovedForSite to Supabase
- **lib/firebaseAdmin.ts** – Deprecated (db/bucket/admin throw; use supabaseAdmin)
- **authOptions** – Migrated to Supabase users lookup
- **API routes migrated**: `/api/me`, `/api/users`, `/api/tasks`, `/api/tasks/[id]`, `/api/settings/global`
- **Sites, Notices, RAMS, Deliveries, COSHH, Safety Alerts, Site Rules, Briefings** – All migrated
- **Pre-induction** – personal, certifications, medical, right-to-work, training, declarations, override – migrated
- **Induction compliance** – server.ts, buildComplianceDataset.ts – migrated
- **Sites sub-routes**: assigned-operatives, rams – migrated
- **RAMS**: site/[siteId], upload, accept – migrated
- **Briefings**: accept, upload – migrated
- **Certifications** – migrated
- **Company**: company-name, inviteCode – migrated

## Remaining Firebase References (~35 files)
- Maintenance routes, auth/register, auth/send-password-reset, auth/registrations, auth/final-approve-admin, auth/sendWelcome, auth/admin-setup-complete
- GDPR (download-my-data, delete-account)
- Invite-codes (route, redeem)
- Training, Supervisor operative-drawer
- Registrations (approve, reject)
- Companies (operatives, [companyId])
- Sites: linked, [id]/subcontractors, [id]/induction-quick
- Subcontractors, Subcontractor (invite-operative, request-verification)
- Induction: export, reset, induction-status
- Attendance
- Users [id]
- Uploads/medical
- Dashboard pages: users/[userId], sites/[id]/induction, supervisor-dashboard, buildSubcontractorComplianceDataset, buildSupervisorComplianceDataset
- Dev seed-cert-training

### sitehub-admin – Profile page
- **app/dashboard/profile/page.tsx** – Uses firebase/firestore, firebase/storage for certifications, medical, profile. Replace with Supabase client and /api/profiles.

### sitehub_worker_Ready – Flutter screens
Many screens still use `FirebaseFirestore`, `FirebaseAuth`, `FirebaseMessaging`, `FirebaseStorage`. These will fail at runtime. Screens to migrate:
- tasks_screen, geo_attendance_screen, my_inductions_screen
- admin_rams_screen, notices_screen, settings_screen, certifications_screen
- login_screen, edit_profile_screen, edit_notice_screen
- And others (see grep results)

## Missing Dependencies (install to fix build)
```bash
cd sitehub-admin && npm install clsx tailwind-merge framer-motion next-auth
```

## Env Vars Required
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (for API routes)

## Flutter Run
```bash
flutter run --dart-define=SUPABASE_URL=<url> --dart-define=SUPABASE_ANON_KEY=<key>
```
