# Supabase Read/Write Audit - Web & Mobile

**Date:** 2025-02-18  
**Scope:** sitehub-admin (web), sitehub_worker_Ready (mobile)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         sitehub-admin (Next.js)                              │
│  - API routes use supabaseAdmin (service role) → direct Supabase DB writes   │
│  - Cookie-based auth: uid, user_email, role, companyId                       │
│  - Login: Supabase Auth → lookup users table → set cookies                   │
└─────────────────────────────────────────────────────────────────────────────┘
                    ▲                                    │
                    │ HTTP + cookies                     │
                    │                                    ▼
┌───────────────────┴───────────────────┐   ┌─────────────────────────────────┐
│   Web Admin (Browser)                  │   │   Mobile App (Flutter)           │
│   - fetch() to /api/*                  │   │   - ApiClient (Dio + cookies)     │
│   - credentials: "include"             │   │   - All data via REST API        │
│   - Some pages: direct supabase client │   │   - No direct Supabase           │
└───────────────────────────────────────┘   └─────────────────────────────────┘
```

## Web Admin - Data Flows

### ✅ All API routes read/write to Supabase

| Area | Route | Table(s) | Status |
|------|-------|----------|--------|
| Auth | `/api/auth/login` | users | ✅ Supabase Auth + users lookup |
| Auth | `/api/me` | users, companies | ✅ |
| Profiles | `/api/profiles/me` | users, profiles, pre_induction_personal | ✅ |
| Profiles | `/api/profiles` | users, profiles, pre_induction_personal | ✅ |
| Users | `/api/users`, `/api/users/[id]` | users, profiles, pre_induction_personal | ✅ |
| Sites | `/api/sites` | sites | ✅ |
| Attendance | `/api/attendance` | attendance, users, sites | ✅ |
| Tasks | `/api/tasks` | tasks, task_assignments | ✅ |
| Notices | `/api/notices` | notices | ✅ |
| RAMS | `/api/rams` | rams | ✅ |
| Deliveries | `/api/deliveries` | deliveries | ✅ |
| Messages | `/api/messages/*` | message_threads, message_recipients, messages_thread | ✅ |
| Assets | `/api/assets/*` | assets, asset_assignments, asset_inspections | ✅ |
| Offline | `/api/offline/*` | offline_queue | ✅ |
| Pre-induction | `/api/pre-induction/*` | pre_induction_* | ✅ |
| Certifications | `/api/certifications` | certifications | ✅ |
| Certifications | `/api/certifications/upload` | storage (uploads bucket) | ✅ |
| Medical | `/api/users/[id]/medical` | medical_records | ✅ |
| Near-miss | `/api/near-miss/*` | near_miss | ✅ |
| Companies | `/api/companies` | companies, users, sites | ✅ |

### Profile page – migrated to API

- **loadCertifications**: now uses `GET /api/certifications?userId=` instead of direct `supabase.from("certifications")`
- **loadMedicalRecords**: now uses `GET /api/users/[id]/medical` instead of direct `supabase.from("medical_records")`
- **addCertification**: now uses `POST /api/certifications` + `/api/certifications/upload`
- **deleteCertification**: now uses `DELETE /api/certifications`
- **handleFileUpload** (cert): now uses `/api/certifications/upload` + `PATCH /api/certifications`

### Remaining client-side Supabase usage

- **loadProfileData fallback**: `supabase.from("users")`, `supabase.from("profiles")` – used only when API returns empty; may fail with RLS if anon and no Supabase session
- **subscribeExtraProfile**: Realtime on `profiles` – requires Supabase session; cookie auth may mean no session

## Mobile App - Data Flows

### ✅ All data via sitehub-admin API (no direct Supabase)

| Service | Endpoints | Status |
|---------|-----------|--------|
| AuthService | `/api/auth/login`, `/api/me`, `/api/auth/logout` | ✅ |
| UserApiService | `/api/users/[id]`, `/api/profiles`, `/api/operative/avatar` | ✅ |
| PreInductionApiService | `/api/pre-induction/[userId]/*` | ✅ |
| AttendanceApiService | `/api/attendance` | ✅ |
| TaskApiService | `/api/tasks` | ✅ |
| NoticeApiService | `/api/notices` | ✅ |
| DeliveriesApiService | `/api/deliveries` | ✅ |
| RamsApiService | `/api/rams` | ✅ |
| SiteApiService | `/api/sites` | ✅ |
| TrainingApiService | `/api/training` | ✅ |
| CertificationsApiService | `/api/certifications` | ✅ |
| MessagingScreen | `/api/messages/threads` | ✅ |
| AssetsScreen | `/api/assets/mine` | ✅ |
| UploadApiService | `/api/pre-induction/upload`, `/api/rams/upload` | ✅ |
| SyncService | `/api/offline`, `/api/me` | ✅ |

### Mobile config

- **Production**: `https://sitehub-admin.vercel.app` (main_prod.dart)
- **Cookie jar**: PersistCookieJar for cookie-based auth

## Auth & Session Persistence

### Login flow

1. Client (web or mobile) POSTs email/password to `/api/auth/login`
2. Backend validates via Supabase Auth `signInWithPassword`
3. Backend looks up `users` by email (exact, RPC, ilike)
4. Sets cookies: `uid`, `user_email`, `role`, `companyId`
5. Mobile stores cookies in PersistCookieJar; web receives `Set-Cookie`

### Session persistence

- Web: cookies on same origin; `credentials: "include"` on fetch
- Mobile: cookies persisted; ApiClient sends them automatically

## Fixes Applied (This Audit)

1. **Profile certifications/medical**: Switched from direct Supabase client (which could fail with RLS and wrong column names) to API routes.
2. **GET /api/certifications**: Added `?userId=` to filter by user for “my profile”.
3. **POST /api/certifications**: New endpoint for creating certifications.
4. **/api/certifications/upload**: New endpoint for uploading certification files to the `uploads` bucket.
5. **loadProfileData**: Added `credentials: "include"` to API fetch.

## Recommendations

1. **Pre-induction migration**: Run `npx supabase db push` (or equivalent) to apply `20250220000005_pre_induction_tables.sql` if not already done.
2. **Storage buckets**: Ensure `uploads` and `medical` buckets exist in Supabase and allow public read if needed.
3. **Vercel env**: Ensure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.
4. **Profile realtime**: If realtime updates for profiles are required, consider server-sent events or polling instead of Supabase Realtime when using cookie auth.
