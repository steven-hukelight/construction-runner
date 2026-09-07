# construction-runner.com: One project vs two

You have two ways to get construction-runner.com showing the marketing page with “Member Login” going to your app.

---

## Option A – One Vercel project (sitehub-admin) – **recommended**

- **One repo, one deploy:** you run `vercel --prod` from the **sitehub-admin** folder.
- **One domain:** point construction-runner.com to this single Vercel project.
- **Result:**
  - `construction-runner.com` → marketing landing page (in sitehub-admin)
  - `construction-runner.com/admin/login` → login
  - `construction-runner.com/dashboard` → app after login

No need to change anything in Marketing-project in Vercel. The marketing landing page lives inside sitehub-admin so one deployment serves everything.

**Steps:**
1. Add the marketing page to sitehub-admin (root `/`).  
2. In Vercel, use the **sitehub-admin** project and add domain **construction-runner.com**.  
3. Deploy with `vercel --prod` from the sitehub-admin directory.

---

## Option B – Two Vercel projects

- **Marketing-project** → domain **construction-runner.com** (marketing site).
- **sitehub-admin** → domain **app.construction-runner.com** (or **admin.construction-runner.com**).
- In the **Marketing-project** env in Vercel, set:  
  `NEXT_PUBLIC_MEMBER_LOGIN_URL=https://app.construction-runner.com/admin/login`
- “Member Login” on the marketing site will then go to the admin app. You do **not** “point” the Marketing-project to sitehub-admin; you just set that URL so the button links to the second project.

---

**Summary:** If you want a single `vercel --prod` and one place to manage the domain, use **Option A** and keep the marketing page inside sitehub-admin. Option B is fine if you prefer to keep the marketing repo separate and use two Vercel projects and two domains.
