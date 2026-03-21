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

- `https://construction-runner.com/reset-password` (password reset — required)
- `https://construction-runner.com/auth/callback` (OAuth sign-in)
- `https://www.construction-runner.com/reset-password` (if you use www)
- `https://www.construction-runner.com/auth/callback` (if you use www)
- `http://localhost:3000/reset-password`
- `http://localhost:3000/auth/callback`

Also set **Site URL** to `https://construction-runner.com`. If the reset URL is not in the allowlist, Supabase redirects to the Site URL (with tokens in the hash); the app will forward to `/reset-password`. Add the exact URLs above for the most reliable flow.

### Password reset troubleshooting

If you see **"Invalid or missing reset link"** when clicking the reset email link:

| Cause | Fix |
|-------|-----|
| Redirect URL not in allowlist | Add `https://construction-runner.com/reset-password` under **Authentication → URL Configuration → Redirect URLs**. No trailing slash. |
| Wrong Site URL | Set **Site URL** to match your app (e.g. `https://construction-runner.com`). |
| Wrong base URL in env | Set `NEXT_PUBLIC_BASE_URL` and `NEXTAUTH_URL` to your deployment URL. Admin "Send reset email" uses this. |
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
