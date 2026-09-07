# Connect Supabase

## 1. Get your project credentials

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project (or create one)
3. **Settings → API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`
4. **Settings → General** → copy **Reference ID** (for linking)

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your real values.

## 3. Link the project (for migrations)

From the **parent** project directory (where `supabase/config.toml` lives):

```bash
cd /Users/steven_hukelight/supabase-project
supabase link --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with the Reference ID from step 1.

## 4. Apply migrations

If using the parent Supabase CLI:

```bash
supabase db push
```

**Or** run the SQL manually in **Supabase Dashboard → SQL Editor**:

- Paste the contents of `supabase/migrations/20250217000000_add_modules_tables.sql`
- Click **Run**

## 5. Verify

Start the app:

```bash
cd sitehub-admin
npm run dev
```

If env vars are set correctly, the app should connect to Supabase.

## 5b. Password reset redirect URLs (critical)

Add these URLs in **Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**:

- `https://www.construction-runner.com/reset-password` (password reset — required)
- `https://www.construction-runner.com/auth/callback` (OAuth sign-in)
- `http://localhost:3000/reset-password`
- `http://localhost:3000/auth/callback`

Also set **Site URL** to `https://www.construction-runner.com`. If the reset URL is not in the allowlist, Supabase redirects to the Site URL (with tokens in the hash); the app will forward to `/reset-password`. Add the exact URLs above for the most reliable flow.

### Google OAuth (Sign in with Google)

To enable the "Sign in with Google" button:

1. **Supabase Dashboard → Authentication → Providers → Google**
   - Enable the Google provider
   - Add **Client ID** and **Client Secret** from [Google Cloud Console](https://console.cloud.google.com/)

2. **Create OAuth credentials in Google Cloud Console**
   - APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Authorized redirect URIs: add `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback` (copy from Supabase Dashboard → Auth → Providers → Google)

3. **Redirect URLs** (if not already added)
   - Ensure `https://www.construction-runner.com/auth/callback` and `http://localhost:3000/auth/callback` are in **Authentication → URL Configuration → Redirect URLs**

**Access control:** Only users who exist in your `users` table (registered/approved) can sign in via Google. Unregistered emails receive "Account not found. Contact administrator." after Google authenticates.

### Password reset troubleshooting

If you see **"Invalid or missing reset link"** when clicking the reset email link:

| Cause | Fix |
|-------|-----|
| Redirect URL not in allowlist | Add `https://www.construction-runner.com/reset-password` under **Authentication → URL Configuration → Redirect URLs**. No trailing slash. |
| Wrong Site URL | Set **Site URL** to match your app (e.g. `https://www.construction-runner.com`). |
| Wrong base URL in env | Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_URL`, and `NEXTAUTH_URL` to `https://www.construction-runner.com` (optional: `SUPABASE_SITE_URL`, `SUPABASE_REDIRECT_URL` as below). Admin "Send reset email" uses these. |
| Link opened on different device | After updating the email template (see below), links work from any device. |
| Link already used | Each link is single-use. Request a new one from the forgot-password page. |
| Email prefetch consumed token | Some security tools prefetch links. Use a fresh link or test with a different email client. |
| **otp_expired** (link expired) | Reset links expire in 1 hour. Request a new link. |

### IMPORTANT: Customize the Reset Password email template

The default Supabase email uses `{{ .ConfirmationURL }}`, which goes through Supabase's redirect and can fail. You must change it so the link goes directly to your app with `token_hash`:

1. Go to **Supabase Dashboard → Authentication → Email Templates**
2. Select **Reset Password**
3. Replace the entire **Message body** with:

```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>
```

4. Click **Save**

This sends users directly to your reset page with the token in the URL. It works from any device (e.g. email on phone), bypassing redirect/hash issues. Links expire in 1 hour.

## Email (password reset, welcome emails, bulk invite)

For admin-triggered "Send reset email", welcome emails, and bulk invites, configure **one** of:

### Option A: Resend

Add to `.env.local`:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=no-reply@construction-runner.com
```

Get an API key from [Resend](https://resend.com) → API Keys. Verify your domain in Resend for production.

### Option B: SendGrid

Add to `.env.local`:

```
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=no-reply@yourdomain.com
```

Get an API key from [SendGrid](https://sendgrid.com/) → Settings → API Keys.

### Option C: SMTP (Gmail, Mailgun, etc.)

Add to `.env.local`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
```

- **Gmail:** Use an [App Password](https://support.google.com/accounts/answer/185833), not your normal password.
- **Mailgun:** Use `smtp.mailgun.org`, port 587, with your SMTP credentials from the Mailgun dashboard.

## Push notifications (briefings & tasks)

Push uses **OneSignal** (no Firebase). Add to `.env.local`:

```
ONESIGNAL_APP_ID=your-onesignal-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id
```

`NEXT_PUBLIC_ONESIGNAL_APP_ID` enables web push in the admin dashboard. See `markdown_documents/ONESIGNAL_PUSH_SETUP.md` for full setup.

## Attendance: server fallback auto sign-out (cron)

Operatives get **foreground** auto sign-out from the worker app, optional **native geofence** when permissions allow, and a **server fallback** so sessions do not stay open indefinitely if the device stops reporting location.

1. **Database:** Apply migration `supabase/migrations/20260403120000_attendance_auto_signout_session.sql` (adds `auto_sign_out`, `auto_sign_out_reason`, `exit_time_millis`, `last_known_*`, `last_activity_at` on `attendance` / `attendance_archive`).
2. **Vercel:** `vercel.json` schedules `GET /api/maintenance/attendance-fallback-sign-out` once daily (02:15 UTC) so **Hobby** deploys stay within Vercel’s “at most once per day” cron limit; on **Pro**, you can change that schedule (for example back to every five minutes). The job must authenticate with `Authorization: Bearer <CRON_SECRET>` (same secret as other maintenance crons).
3. **Environment:** Optional `ATTENDANCE_FALLBACK_INACTIVITY_MINUTES` (default **45**, clamped 15–180). The job signs out users whose **last** attendance row for today is still a sign-in, **last known coordinates** are **outside** the site boundary (from `sites.geofence` / `location`), and **last activity** is older than this window.
4. **Worker app:** While signed in, the geo screen sends throttled **session location pings** (`attendance_session_ping` on `POST /api/attendance`) so `last_known_*` and `last_activity_at` stay fresh for the fallback.

**Admin / internal — “High Accuracy Mode” (native geofence):** Optional, best-effort, may require background location and exact alarms; not guaranteed on all OEMs. Compliance is still covered by foreground auto sign-out and this server fallback.

**Push:** When the fallback signs someone out, OneSignal sends: *“You were signed out after leaving the site boundary.”*

**Outside this repo:** You can run the same logic from Supabase Edge Functions, GitHub Actions, or another scheduler by calling the route with `CRON_SECRET` or by reusing the query/update rules in `app/api/maintenance/attendance-fallback-sign-out/route.ts`.
