# Construction Runner Rebrand – Post-Change Checklist

Use this checklist to ensure web and mobile work correctly after the Site Hub → Construction Runner rebrand.

---

## ✅ Already Done (Code)

- App titles, metadata, navigation labels
- Email copy (invites, password reset, welcome)
- Branding constants (settings, global-settings)
- PDF compliance engine footer
- Login page, footer, privacy policy text
- Mobile: app name, logo, display name (Android/iOS), manifest
- URLs: `construction-runner.vercel.app`, `admin.construction-runner.com`, etc.
- Default email fallback: `noreply@construction-runner.com`
- DevBanner Directionality fix (mobile)

---

## 🔧 Required for Production

### 1. Environment Variables (Vercel / Hosting)

Set these to your **production** URLs:

| Variable | Value (example) | Purpose |
|----------|-----------------|---------|
| `NEXTAUTH_URL` | `https://construction-runner.vercel.app` | Auth callback, session |
| `NEXT_PUBLIC_BASE_URL` | `https://construction-runner.vercel.app` | Email links, redirects, invite URLs |

If you deploy to a different domain (e.g. custom domain), use that instead.

### 2. Supabase Auth Redirect URLs

In **Supabase Dashboard → Authentication → URL Configuration**:

1. **Site URL**: Set to your production URL (e.g. `https://construction-runner.vercel.app`)
2. **Redirect URLs**: Add:
   - `https://construction-runner.vercel.app/**`
   - `https://construction-runner.vercel.app/auth/callback`

Remove old `sitehub-admin.vercel.app` from Supabase redirect URLs once cut over to `construction-runner.vercel.app`.

### 3. Google OAuth (if used)

If you use Google Sign-in:

1. **Google Cloud Console** → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client
3. Add **Authorized redirect URI**:  
   `https://construction-runner.vercel.app/auth/callback`
4. Add **Authorized JavaScript origins**:  
   `https://construction-runner.vercel.app`

### 4. Mobile App – Production API URL

When building for **release** (physical devices, app stores):

```bash
flutter build apk --release --dart-define=SITEHUB_API_URL=https://construction-runner.vercel.app
# or
flutter build ios --release --dart-define=SITEHUB_API_URL=https://construction-runner.vercel.app
```

If you deploy the web app to a different URL, use that URL instead.

### 5. Vercel Project (if creating new deployment)

If you create a **new** Vercel project (e.g. `construction-runner-admin`):

- Project name determines the default URL (`construction-runner.vercel.app`)
- Configure env vars in the new project
- Update mobile builds to use the new deployment URL

If you keep the existing Vercel project (e.g. `sitehub-admin`):

- URL stays `construction-runner.vercel.app` unless you add a custom domain
- Option: add custom domain `construction-runner.com` or `app.construction-runner.com`

---

## 📱 Mobile-Specific

### Cookie Storage Path

The mobile app stores cookies at `sitehub_cookies`. This is a **local path** on the device. Changing it would log out existing users. Options:

- **Leave as-is**: Works fine; path name is internal only
- **Change to `construction_runner_cookies`**: Users re-login once after update

### Debug Logs

`main.dart` still prints `[SiteHub]` in debug. Cosmetic only; does not affect behavior.

---

## 🧪 Optional / Cosmetic

These do **not** affect functionality:

| Location | Current | Notes |
|----------|---------|-------|
| `main.dart` | `[SiteHub]` in debugPrint | Log prefix |
| `main.dart` | `MaterialApp(title: 'SiteHub')` | App title (shown in task switcher) |
| `api_client.dart` | Comment "SiteHub backend API" | Comment only |
| `authOptions.ts` | `admin@sitehub.local` | Dev credential – keep for local testing |
| `registrations/route.ts` | `@sitehub.com` superuser check | Business logic – keep if your superusers use that domain |
| `Sidebar.tsx` | `sitehub.info@gmail.com` | Support email – update when you have new address |
| Test fixtures | `@sitehub.com` in mocks | Tests – optional to update |

---

## ✔️ Verification

1. **Web**
   - Login with email/password
   - Login with Google (if enabled)
   - Password reset flow
   - Invite link (if sent)
   - All links in emails point to correct domain

2. **Mobile**
   - Login (emulator: `http://10.0.2.2:3000`; device: production URL via `--dart-define`)
   - Session persists after app restart
   - Logout works
   - No "Login failed" or network errors

3. **Cross-check**
   - Mobile can reach web API at production URL
   - Web and mobile show "Construction Runner" branding
   - New logo displays in sidebar and mobile

---

## Summary

**Essential for production:**

1. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_BASE_URL` to your production URL
2. Add production URL to Supabase Auth redirect URLs
3. Update Google OAuth redirect URIs if using Google Sign-in
4. Build mobile with `--dart-define=SITEHUB_API_URL=<your-production-url>`

**Optional:** Update remaining cosmetic strings (debug logs, MaterialApp title, comments) and cookie path if desired.
