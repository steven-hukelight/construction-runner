# Deployment Readiness Report

**Generated:** Pre-deployment check

---

## Build Status

| App | Status | Notes |
|-----|--------|-------|
| **Web (Next.js)** | Pass | `npm run build` succeeded |
| **Mobile (Flutter)** | Pass | `flutter build apk --debug` succeeded |
| **Database** | Pass | Migrations applied via `supabase db push` |

---

## Web Dashboard – Required Environment Variables

Set these in your deployment (Vercel, etc.):

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_URL` | Yes | Same as above (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side admin access |
| `NEXTAUTH_SECRET` | Yes | Session encryption (min 32 chars) |
| `NEXTAUTH_URL` | Yes (prod) | Your deployed URL, e.g. `https://yoursite.vercel.app` |
| `NEXT_PUBLIC_BASE_URL` | Recommended | Base URL for emails/redirects |

Optional (emails): `EMAIL_FROM`, `SENDGRID_API_KEY`, or `SMTP_*` for password reset emails.

---

## Mobile App – Deployment

1. **API URL** – `main_prod.dart` uses `https://sitehub-admin.vercel.app`.  
   If you deploy the web app elsewhere, change this in `lib/main_prod.dart`.

2. **Build for release:**
   ```bash
   flutter build apk --release
   # or
   flutter build ios --release
   ```

3. **Google Maps** – If using maps, add your API key in `AndroidManifest.xml` / `AppDelegate` per platform docs.

---

## Known Issues (Non-Blocking)

- **Flutter analyze:** 47 issues (deprecations, unused vars, style). None prevent the app from running.
- **Web lint:** Some ESLint warnings in API routes. Build still succeeds.

---

## Quick Verification

1. **Web:** Deploy, then visit `/login` and confirm auth works.
2. **Mobile:** Install APK on a device, set API URL if needed, log in and confirm API calls succeed.
3. **Database:** Tables `system_logs`, `near_miss_reports`, and related columns exist after migrations.
