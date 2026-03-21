# Login Failed – Troubleshooting Guide

Use this checklist to fix "login failed" on web or mobile after deployment.

---

## 1. Vercel Environment Variables

Ensure these are set in **Vercel → Project → Settings → Environment Variables**:

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | e.g. `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | From Supabase Dashboard → Settings → API |
| `SUPABASE_URL` | ✅ Yes | Same as above (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | From Supabase Dashboard → Settings → API |
| `NEXTAUTH_SECRET` | ✅ Yes | Min 32 chars (e.g. `openssl rand -base64 32`) |

**Important:** 
- Redeploy after changing env vars (Vercel doesn’t hot-reload them)
- Use the **production** Supabase project URL/keys, not local

---

## 2. Supabase Auth – URL Configuration

In **Supabase Dashboard → Authentication → URL Configuration**:

1. **Site URL**  
   Set to your production URL, e.g. `https://construction-runner.vercel.app` (or your Vercel domain)

2. **Redirect URLs**  
   Add (replace with your actual domain):
   ```
   https://construction-runner.vercel.app/**
   https://construction-runner.vercel.app/auth/callback
   http://localhost:3000/**
   http://localhost:3000/auth/callback
   ```

If the deployed URL is not allowlisted, Supabase will block redirects and some auth flows.

---

## 3. User Must Exist in `public.users`

The app expects users in both:

1. **Supabase Auth** (`auth.users`) – created when you sign up
2. **App `users` table** (`public.users`) – created by approval/registration

If a user exists in Auth but **not** in `public.users`, you’ll see:

- **Web:** “Your account is not yet set up. Please contact your administrator.”
- **Mobile:** “Login failed” or “Your account is not yet set up…”

**Fix:** Insert the user into `public.users`.

In **Supabase Dashboard → SQL Editor**, run:

```sql
-- Replace with your actual values
INSERT INTO public.users (id, email, company_id, role, approved, created_at, updated_at)
SELECT 
  id, 
  email, 
  'YOUR_COMPANY_ID'::uuid,  -- Get from: SELECT id FROM companies LIMIT 1;
  'admin',                   -- or 'superuser', 'supervisor', 'operative'
  true,
  now(),
  now()
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (id) DO NOTHING;
```

Or use your normal registration/approval flow to create the row.

---

## 4. Confirm Same Supabase Project

Vercel and the app must use the **same** Supabase project.

Check:

1. **Supabase Dashboard** – Project URL (e.g. `https://armgrrdmbxzcldynxakw.supabase.co`)
2. **Vercel env vars** – `NEXT_PUBLIC_SUPABASE_URL` should match exactly

---

## 5. Web vs Mobile

| Platform | Login path |
|----------|------------|
| **Web** | Uses Supabase client (`signInWithPassword`) directly, then `setUserCookies` server action |
| **Mobile** | Uses `POST /api/auth/login`, which uses Supabase Auth + `users` lookup |

Both:

- Require the user in `public.users`
- Use the same Supabase project and keys
- Need correct URL config in Supabase (especially for OAuth/redirects)

---

## 6. Quick Diagnosis

### A. Inspect the actual error

- **Web:** Check the exact message on the login page.
- **Mobile:** Add temporary logs or use debug mode to see the API response.

### B. Check Vercel logs

- Vercel → Project → Logs (or Deployments → Logs)
- Look for 500s or “Auth not configured”, “Server auth not configured”, etc.

### C. Check Supabase Auth

- Supabase Dashboard → Authentication → Users  
- Confirm the email exists and is “Confirmed”.

### D. Check `public.users`

```sql
SELECT id, email, role, company_id, approved 
FROM public.users 
WHERE email = 'your-email@example.com';
```

- If no row → add via SQL or your registration flow.
- If `approved = false` → set `approved = true` or run your approval flow.

---

## 7. Common Scenarios

| Symptom | Likely cause |
|---------|--------------|
| “Invalid login credentials” | Wrong password or email not in `auth.users` |
| “Your account is not yet set up…” | User in Auth but missing in `public.users` |
| “Login failed” (mobile) | API error or non-parseable response; often same as above |
| Blank / generic error | Supabase env vars missing or wrong on Vercel |
| OAuth redirect fails | Deployed URL not in Supabase Redirect URLs |

---

## 8. Checklist Summary

- [ ] Vercel env vars set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`
- [ ] Redeployed after changing env vars
- [ ] Supabase Site URL set to production URL
- [ ] Supabase Redirect URLs include production URL and `/auth/callback`
- [ ] User exists in `auth.users`
- [ ] User exists in `public.users` with `approved = true`
- [ ] Vercel and Supabase use the same project (URL matches)
