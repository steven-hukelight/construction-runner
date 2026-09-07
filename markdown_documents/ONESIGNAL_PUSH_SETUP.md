# OneSignal Push Notifications (Briefings & Tasks)

Push notifications for **briefings** and **tasks** use OneSignal. No Firebase required. Supabase stays as your database; OneSignal delivers the pushes.

## 1. OneSignal Setup

1. Create an account at [onesignal.com](https://onesignal.com)
2. Create a new app (iOS + Android)
3. In **Settings → Keys & IDs**:
   - Copy **OneSignal App ID**
   - Create a **REST API Key** (User Auth Key) and copy it

4. Configure platforms:
   - **iOS**: Add your APNs key/certificate (Apple Developer)
   - **Android**: OneSignal uses FCM behind the scenes but you don’t manage Firebase; follow OneSignal’s Android setup (e.g. add `google-services.json` from OneSignal’s Firebase project)

## 2. Backend (sitehub-admin)

Add to `.env.local`:

```
ONESIGNAL_APP_ID=your-onesignal-app-id
ONESIGNAL_REST_API_KEY=your-rest-api-key
```

The briefings upload and tasks API will send push notifications when configured.

## 3. Web (sitehub-admin dashboard)

Add `NEXT_PUBLIC_ONESIGNAL_APP_ID` to `.env.local` (same value as `ONESIGNAL_APP_ID`):

```
NEXT_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id
```

In OneSignal dashboard: **Settings → Platforms → Web Push**, add your site URL (e.g. `https://your-admin.com` or `http://localhost:3000` for dev).

When a user logs into the dashboard, the web SDK initializes and calls `OneSignal.login(userId)` so they receive briefings/tasks push.

## 4. Mobile App (Flutter)

Build with the OneSignal App ID:

```bash
flutter run --dart-define=ONESIGNAL_APP_ID=your-onesignal-app-id
```

Or in your build config (e.g. for release):

```
--dart-define=ONESIGNAL_APP_ID=your-onesignal-app-id
```

When `ONESIGNAL_APP_ID` is set, the app initializes OneSignal and links the device to the logged-in user. If it’s not set, push is skipped (e.g. in local dev).

**Closed app / background:** Standard mobile push goes through Apple (APNs) and Google (FCM). Nothing special is required in your API for “closed app” versus foreground — the OS shows the banner if the install is subscribed and permissions are granted. You must ensure the following:

1. **`OneSignal.login(...)` runs after login** using the Supabase **`auth.users.id`** (same UUID as `public.users.id`). Mismatched IDs are the usual reason assigns get no push.
2. **User accepts system notification permission** (iOS / Android prompts).
3. **Same OneSignal App ID everywhere**: `ONESIGNAL_APP_ID` / `NEXT_PUBLIC_ONESIGNAL_APP_ID` on the server must match `--dart-define=ONESIGNAL_APP_ID` on the Flutter build.
4. **Dashboard mobile setup**: In OneSignal → **Audience**, confirm the operative has **Subscribed** status for Push after opening the app at least once.

## 5. Flow

- **Login**: App calls `OneSignal.login(userId)` with `public.users.id` as external_id
- **Briefing upload**: Backend sends push to all users in that company
- **Task assignment**: Backend sends push to each assignee

## 6. Troubleshooting

- **No notifications**: Check `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` are set on **Vercel Production** (or your host); local `.env.local` does not affect deployed API routes.
- **Server logs**: If delivery fails you may see `Task push not delivered` with assignee IDs — in OneSignal, search that user UUID under **Audience**; if “not subscribed”, fix mobile `login`/permission/App ID mismatch.
- **Android**: Ensure OneSignal Android setup is done (e.g. `google-services.json` and build config)
- **iOS**: Ensure APNs is configured in OneSignal and the app has push entitlements
