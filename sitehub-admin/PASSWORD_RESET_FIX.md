# Password Reset Fix

If you get "Reset link expired or invalid" every time, you need to update the Supabase email template.

## 1. Update the Reset Password Email Template

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Authentication** → **Email Templates**
3. Click **Reset Password**
4. Find the **Message body** (HTML content)
5. **Replace everything** with:

```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>
```

6. Click **Save**

## Why this works

- The default template uses `{{ .ConfirmationURL }}`, which sends users to Supabase’s server first, then redirects. That flow is prone to issues (expired links, wrong device, etc.).
- The custom template sends users directly to your app with `token_hash` in the URL. Your reset page verifies it with `verifyOtp()` and works from any device.

## After updating

1. Deploy your app (if you haven’t already)
2. Request a new reset link from the forgot-password page
3. Click the link — it should open the reset form successfully
