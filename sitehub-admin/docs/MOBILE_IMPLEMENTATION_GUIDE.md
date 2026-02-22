# Mobile App Implementation Guide

This document provides implementation instructions for the Flutter mobile app. The mobile repo is separate from `sitehub-admin`; apply these changes in your mobile codebase.

---

## 1. Certs & Training Tab — Infinite Spinner Fix

**Location:** `lib/screens/pre_induction/training_section.dart`, `lib/screens/pre_induction/certifications_section.dart`

### Problem
`snapshot.data` can be null when the section document doesn't exist yet, causing infinite loading or null reference errors.

### Fix

```dart
// In StreamBuilder or similar:
if (!snapshot.hasData) {
  return EmptyStateWidget(); // or loading
}
final data = snapshot.data();
if (data == null) {
  // Create default section doc if missing
  await FirebaseFirestore.instance
      .collection('users')
      .doc(uid)
      .collection('preInductionProfile')
      .doc('training')  // or 'certifications'
      .set({
    'certifications': [],  // for certifications
    'trainingRecords': [], // for training
    'ramsAccepted': false,
    'updatedAt': FieldValue.serverTimestamp(),
  }, SetOptions(merge: true));
  return EmptyStateWidget(); // will re-fetch
}
// Proceed with data
```

**Firestore rules** (already updated in `firestore.rules`):
- `preInductionProfile` allows read for `isSelf(uid) || isSameCompany(uid)`.

---

## 2. Deliveries Permission Fix

**Firestore rules** (already updated):
- **sites/{siteId}/deliveries/{deliveryId}**: Added. Read allowed for `isAssignedToSite(siteId) || isSupervisorOrAdminForSite(siteId)`.
- **Top-level deliveries**: Read extended for operatives/supervisors when `siteId` matches an assigned site.

**Mobile app:** Ensure you use the correct path:
- If using **sites/{siteId}/deliveries**: Use the user's active/selected site from their assignment.
- If using **deliveries** (top-level): Query with `where('siteId', '==', activeSiteId)` so the rule can evaluate `isAssignedToSite(resource.data.siteId)`.

---

## 3. Induction Banner Overlapping Top Bar

**Location:** `lib/screens/home/home_screen.dart`

### Fix

Wrap the banner in `SafeArea` and add padding so it sits below the top bar:

```dart
SafeArea(
  child: Padding(
    padding: EdgeInsets.only(top: 8),
    child: InductionBanner(),
  ),
)
```

Place the banner **below** the top bar in the widget tree (e.g. inside the main column, after `AppBar` or equivalent).

---

## 4. App Lag / Performance

### Targets
- Max 1 Firestore stream per screen
- Reduce rebuilds by 40–60%

### Implementation

**A. Combined user stream**
Replace multiple `StreamBuilder`s with one stream that aggregates:
- User document
- Pre-Induction sections (or cache them)

**B. Cache Pre-Induction sections**
- Use **SharedPreferences**, **Hive**, or **Riverpod** to cache certs/training.
- Certs and training are relatively static → use `FutureBuilder` with cached data instead of `StreamBuilder`.

**C. Convert static sections**
- Change certs/training from `StreamBuilder` to `FutureBuilder` + periodic refresh or cache invalidation on edit.

**D. Add const constructors**
- Add `const` to all static widgets where possible to reduce rebuilds.

**E. Debounce**
- Debounce taps and navigation (e.g. 300ms) to avoid rapid duplicate actions.

---

## 5. RAMS Acceptance Flow (MyRAMSScreen)

Use the existing web APIs:

- **GET** `/api/rams/site/[siteId]` — Returns latest approved RAMS + `ramsVersion`, `ramsUpdatedAt`, `fileUrl`.
- **POST** `/api/rams/accept` — Body: `{ userId, siteId }` — Records RAMS acceptance.

**Flow:**
1. Show current RAMS version + PDF viewer.
2. Require scroll to bottom before enabling "Accept RAMS".
3. On accept: call `POST /api/rams/accept`.
4. If RAMS updated: show banner "RAMS have been updated. Please review and accept the latest version."

---

## 6. Testing Checklist

| Test | Expected |
|------|----------|
| Operative views Pre-Induction sections | No infinite spinner |
| Operative uploads documents | Success |
| Operative does NOT see verification fields | Hidden |
| Subcontractor admin uploads for operative | Success |
| Subcontractor admin cannot verify or override | Blocked |
| Supervisor views compliance | Success |
| Supervisor cannot edit | Read-only |
| Admin verifies / overrides / resets induction | Success |
| Deliveries: Operative views | Success |
| Deliveries: Supervisor adds | Success |
| Deliveries: Subcontractor admin views | Success |
| No infinite spinners | All sections load |
| No lag | Smooth navigation |
| Banner visible | Not overlapping top bar |

---

## 7. Firestore Rules Reference

Key helpers (see `firestore.rules`):
- `isAssignedToSite(siteId)` — User in `sites/{siteId}/assignedOperatives`
- `isSupervisorOrAdminForSite(siteId)` — Supervisor or admin with site access
- `isSelf(uid)` — Same as `request.auth.uid`
- `isSameCompany(uid)` — Same company as user doc

---

## 8. Storage Rules

Pre-Induction uploads: `pre-induction/{uid}/{section}/{filename}`
- Operatives: upload to own `uid` only
- Admins: can upload for any user
- File types: jpg, jpeg, png, pdf
- Max size: 10MB

---

## 9. Privacy & GDPR (Settings → Privacy)

**Location:** Settings screen — add a "Privacy" or "Privacy & Data" section.

### Content to include
1. **GDPR notice:** "Your data is collected solely for the purposes of site access, safety compliance, induction, RAMS acceptance, and legal health & safety obligations. It is not used for marketing or profiling."

2. **Link to full Privacy Policy:** `https://[your-domain]/legal/privacy-policy`

3. **Download My Data:** Call `GET /api/gdpr/download-my-data` (with auth cookies/session). Display or download the JSON export.

4. **Request Account Deletion:** Call `POST /api/gdpr/delete-account` with `{ "confirm": true }` (with auth). Show confirmation dialog first. Redirect to login on success.

### Data minimisation (forms)
- National Insurance Number: **optional**
- Medical notes / allergies / medication: **optional**
- Address: **optional** (only if required by contractor)
- Passport: store **expiry + file only** (no passport number)

---


## 10. Session Security (Mobile)

- **Auto logout:** 12 hours inactivity (match web behavior).
- **Token refresh:** Enforce token refresh every 1 hour (Supabase Auth session tokens have a 1-hour expiry; use `supabase.auth.refreshSession()` or equivalent before sensitive requests, or rely on built-in session persistence).

- **Session persistence:** Supabase Auth automatically persists sessions across app restarts. Use `supabase.auth.onAuthStateChange` to handle session changes and auto-logout.

- **JWT claims:** Use the `user_metadata` field in Supabase Auth for company, role, and other claims. See `supabase/auth/supabaseAuthClient.ts` for helpers.
