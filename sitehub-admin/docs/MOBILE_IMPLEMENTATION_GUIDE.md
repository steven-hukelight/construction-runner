# Mobile App Implementation Guide (sitehub_worker_ready)

This document provides implementation instructions for the Flutter mobile app. The mobile repo is separate from `sitehub-admin`; apply these changes in your mobile codebase.

---

## Complete Pre-Induction Flow (Supabase)

### Path Convention (Mobile and Web Must Match)
```
{userId}/{sectionId}/{fieldName}_{timestamp}_{safeFileName}
```
- **userId**: Supabase auth user UUID
- **sectionId**: `rightToWork`, `competencyCard`, `medical`, `certifications`, `training`, `declarations`
- **fieldName**: `passportUrl`, `visaUrl`, `proofOfAddressUrl`, `medicalCertificate`, `competency_card`, `operativeSignature`, `cert-0`, `record-0`, etc.

### Required Sections for Declaration (Certification & Training NOT required)
- Personal (name or email)
- Right to Work (passport or visa uploaded, or share code)
- Competency Card (card number OR file)
- Medical (fit-to-work ticked OR medical declaration/certificate)

### Declaration Logic
1. **Checkbox disabled** until all 4 required sections above are complete.
2. **"Accept Declaration" button disabled** until checkbox is ticked.
3. User must tick checkbox, then click button to persist.

### Full Upload → View → Delete → Replace Flow

```dart
// 1. UPLOAD (returns path – store this)
final path = await storageClient.uploadFile('pre-induction', 
  '$userId/rightToWork/passportUrl_${DateTime.now().millisecondsSinceEpoch}_${file.name}', 
  file);

// 2. PERSIST TO DB (critical – without this, data disappears on reload)
await Supabase.instance.client.from('pre_induction_right_to_work').upsert({
  'user_id': userId,
  'passport_url': path,
  'updated_at': DateTime.now().toIso8601String(),
}, onConflict: 'user_id');

// 3. VIEW (prefer API proxy – more reliable; bucket is private)
// Requires: import 'package:http/http.dart' as http;
final baseUrl = 'https://your-sitehub-domain.com';  // or env config
final res = await http.get(
  Uri.parse('$baseUrl/api/pre-induction/file?path=${Uri.encodeComponent(path)}&client=app'),
  headers: {'Authorization': 'Bearer ${Supabase.instance.client.auth.currentSession?.accessToken}'},
);
if (res.statusCode == 200) {
  final json = jsonDecode(res.body) as Map<String, dynamic>;
  final url = json['url'] as String?;
  if (url != null) await launchUrl(Uri.parse(url));
}

// 4. DELETE
await storageClient.deletePreInductionFile(path);  // or storedValue if it's a URL
await Supabase.instance.client.from('pre_induction_right_to_work').update({
  'passport_url': null,
  'updated_at': DateTime.now().toIso8601String(),
}).eq('user_id', userId);

// 5. REPLACE = upload new file + persist (old file stays in storage; optional: delete old path first)
```

### Status Field
- **users.pre_induction_status**: `'not_started'` | `'in_progress'` | `'complete'`
- DB triggers update this automatically when pre_induction_* tables change.
- Mobile and web both read/write this field.
- **Complete** = Personal + RTW + Competency + Medical + Declaration all done.

### StorageClient.dart (Copy from supabase/storage/storageClient.dart)
Ensure your mobile app uses the updated `storageClient.dart` with:
- `uploadFile()` – returns `Future<String>` (path)
- `createPreInductionSignedUrl(pathOrUrl)` – fallback for viewing (prefer API proxy)
- `deletePreInductionFile(pathOrUrl)` – for delete
- `extractPreInductionPath(pathOrUrl)` – helper for path/URL parsing (use before API call)

---

## Pre-Induction Upload/View/Delete Fix (Supabase Direct)

**Problem**: Upload works but view and delete fail on mobile when using direct Supabase.

**Root cause**: The pre-induction bucket is **private**. `getPublicUrl` returns URLs that return 403. For delete, Supabase expects the storage path, not a full URL.

**Fix** (in your mobile app):

1. **Viewing documents** (prefer API proxy – Option B):
   ```dart
   // Extract storage path from stored value (path or URL)
   final path = extractPreInductionPath(storedValue) ?? storedValue;
   final res = await http.get(
     Uri.parse('$baseUrl/api/pre-induction/file?path=${Uri.encodeComponent(path)}&client=app'),
     headers: {'Authorization': 'Bearer ${session.accessToken}'},
   );
   if (res.statusCode == 200) {
     final json = jsonDecode(res.body) as Map<String, dynamic>;
     final url = json['url'] as String?;
     if (url != null) await launchUrl(Uri.parse(url));
   }
   ```
   Do **not** open the stored value directly or use `getFileUrl` – both fail for the private bucket. Fallback: `createPreInductionSignedUrl(storedValue)` if API is unavailable.

2. **Delete**: Use `deletePreInductionFile` (not `deleteFile`) with the stored value:
   ```dart
   await storageClient.deletePreInductionFile(storedValue);  // path or URL
   ```
   `deletePreInductionFile` extracts the path from URLs; `deleteFile('pre-induction', url)` would fail.

3. **Upload**: Already working – direct Supabase upload with a valid session.

4. **If using API routes**: Add `Authorization: Bearer <access_token>` header.

---

## CRITICAL: Persist File Path to DB After Upload

**Problem**: Files upload to storage and appear in Supabase, but disappear when you leave pre-induction and return.

**Cause**: The storage upload succeeds, but the **path is never saved to the database**. The pre-induction tables (e.g. `pre_induction_right_to_work`, `pre_induction_medical`) store the file path/URL. When you re-enter, the app loads from the DB – which has no path.

**Fix**: Immediately after each successful storage upload, save the path to the corresponding section table:

**Option A – Direct Supabase (recommended if you use Supabase client elsewhere):**
```dart
// After storage upload succeeds:
final path = response.path; // or your upload result path

await Supabase.instance.client
  .from('pre_induction_right_to_work')  // or medical, competency_card, etc.
  .upsert({
    'user_id': userId,
    'passport_url': path,  // or medical_certificate_url, file_url, etc.
    'updated_at': DateTime.now().toIso8601String(),
  }, onConflict: 'user_id');
```

**Option B – API route:**
```dart
// After storage upload:
await http.post(
  '$baseUrl/api/pre-induction/$userId/right-to-work',  // or medical, etc.
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${session.accessToken}',
  },
  body: jsonEncode({'passportUrl': path}),
);
```

**Table/section mapping:**
| Section       | Table                      | Path column(s)                          |
|--------------|----------------------------|----------------------------------------|
| Right to Work| pre_induction_right_to_work| passport_url, visa_url, proof_of_address_url |
| Medical      | pre_induction_medical      | medical_certificate_url                 |
| Competency   | pre_induction_competency_card | file_url                            |
| Certifications | pre_induction_certifications | certifications[].fileUrl            |
| Training     | pre_induction_training     | training_records[].fileUrl              |
| Declarations | pre_induction_declarations | operative_signature_url                |

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

## 8. Storage Rules & Pre-Induction File Operations (Supabase Direct)

The pre-induction bucket is **private**. Use the Supabase client directly (with user session) for upload/delete. For viewing, **must** use signed URLs.

### Upload (Direct Supabase)
```dart
// Use StorageClient.uploadFile – requires authenticated Supabase session
await storageClient.uploadFile('pre-induction', path, file);
// Path format: userId/sectionId/fieldName_timestamp_filename
// Example: abc-123/rightToWork/passport_1709123456_doc.pdf
```

### View (MUST use signed URL – getPublicUrl returns 403)

**Recommended: API proxy (Option B)**
```dart
final path = extractPreInductionPath(storedValue) ?? storedValue;
final res = await http.get(
  Uri.parse('$baseUrl/api/pre-induction/file?path=${Uri.encodeComponent(path)}&client=app'),
  headers: {'Authorization': 'Bearer ${session.accessToken}'},
);
if (res.statusCode == 200) {
  final json = jsonDecode(res.body) as Map<String, dynamic>;
  final url = json['url'] as String?;
  if (url != null) await launchUrl(Uri.parse(url));
}
```

**Fallback: Direct Supabase** (if API unavailable)
```dart
final viewUrl = await storageClient.createPreInductionSignedUrl(storedValue);
await launchUrl(Uri.parse(viewUrl));
```
Pass the storage path (e.g. `userId/rightToWork/passport_123.pdf`), not a full URL.

### Delete (Direct Supabase)
```dart
// Use deletePreInductionFile – accepts path or full URL
await storageClient.deletePreInductionFile(storedValue);
```

### If using API routes instead of direct Supabase
- **Upload**: POST `/api/pre-induction/upload` – body: `{ userId, sectionId, fieldName, fileName, fileBase64, uid? }`
- **View**: GET `/api/pre-induction/file?url=<encoded-url>&uid=<userId>&client=app` – returns `{ url: signedUrl }`
- **Delete**: POST `/api/pre-induction/delete-document` – body: `{ url, userId, uid? }`

**Auth for API routes (mobile)**:
- Send `Authorization: Bearer <supabase_access_token>` (from `supabase.auth.currentSession?.accessToken`), or
- Send cookies from login response (role, uid, companyId, user_email), or
- For own documents: include `uid` in body/query matching `userId`

### Pre-Induction Path Format
`pre-induction/{uid}/{section}/{filename}`
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
