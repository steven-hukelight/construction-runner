# Construction Runner Firestore Schema Map (for Supabase Migration)

---

## SECTION A — Top-Level Collections

### 1. companies
- **Fields:**
  - `id` (string, uuid, PK, required)
  - `name` (string, required)
  - `createdAt` (timestamp, default: now, required)
- **companyId required:** N/A (companyId is the PK)
- **Company-scoped:** N/A (root of tenancy)
- **Example:**
  ```json
  { "id": "uuid", "name": "Acme Ltd", "createdAt": "2024-01-01T12:00:00Z" }
  ```
- **Used by:** web, mobile

---

### 2. users
- **Fields:**
  - `id` (string, uuid, PK, required)
  - `email` (string, required)
  - `companyId` (string, required)
  - `role` (string, required; e.g. 'admin', 'supervisor', 'operative')
  - `profileId` (string, optional)
  - `status` (string, optional)
  - `createdAt` (timestamp, default: now, required)
  - `disabled` (boolean, optional)
  - `approved` (boolean, optional)
  - `superuser` (boolean, optional)
- **companyId required:** Yes
- **Company-scoped:** Yes
- **Example:**
  ```json
  { "id": "uuid", "email": "user@acme.com", "companyId": "uuid", "role": "operative", "createdAt": "2024-01-01T12:00:00Z" }
  ```
- **Used by:** web, mobile

---

### 3. sites
- **Fields:**
  - `id` (string, uuid, PK, required)
  - `companyId` (string, required)
  - `name` (string, required)
  - `createdAt` (timestamp, default: now, required)
  - `assignedUsers` (array of user ids, optional)
  - `ramsVersion` (string, optional)
  - `mainContractorId` (string, optional)
- **companyId required:** Yes
- **Company-scoped:** Yes
- **Example:**
  ```json
  { "id": "uuid", "companyId": "uuid", "name": "Site A", "createdAt": "2024-01-01T12:00:00Z" }
  ```
- **Used by:** web, mobile

---

### 4. attendance
- **Fields:**
  - `id` (string, uuid, PK, required)
  - `userId` (string, required)
  - `siteId` (string, required)
  - `companyId` (string, required)
  - `action` (string, required; 'IN', 'OUT', 'sign_in', 'sign_out')
  - `timestamp` (timestamp, default: serverTimestamp, required)
  - `latitude` (number, optional)
  - `longitude` (number, optional)
  - `accuracy` (number, optional)
  - `email` (string, optional)
- **companyId required:** Yes
- **Company-scoped:** Yes
- **Example:**
  ```json
  { "id": "uuid", "userId": "uuid", "siteId": "uuid", "companyId": "uuid", "action": "sign_in", "timestamp": "2024-01-01T12:00:00Z" }
  ```
- **Used by:** web, mobile

---

### 5. tasks
- **Fields:**
  - `id` (string, uuid, PK, required)
  - `siteId` (string, required)
  - `companyId` (string, required)
  - `assignedTo` (string, userId, required)
  - `status` (string, required)
  - `description` (string, required)
  - `createdAt` (timestamp, default: now, required)
- **companyId required:** Yes
- **Company-scoped:** Yes
- **Example:**
  ```json
  { "id": "uuid", "siteId": "uuid", "companyId": "uuid", "assignedTo": "uuid", "status": "open", "description": "Do X", "createdAt": "2024-01-01T12:00:00Z" }
  ```
- **Used by:** web, mobile

---

### 6. notices
- **Fields:**
  - `id` (string, uuid, PK, required)
  - `siteId` (string, required)
  - `companyId` (string, required)
  - `title` (string, required)
  - `body` (string, required)
  - `attachments` (array of file URLs, optional)
  - `createdAt` (timestamp, default: now, required)
- **companyId required:** Yes
- **Company-scoped:** Yes
- **Example:**
  ```json
  { "id": "uuid", "siteId": "uuid", "companyId": "uuid", "title": "Notice", "body": "Text", "createdAt": "2024-01-01T12:00:00Z" }
  ```
- **Used by:** web, mobile

---

### 7. deliveries
- **Fields:**
  - `id` (string, uuid, PK, required)
  - `siteId` (string, required)
  - `companyId` (string, required)
  - `deliveredBy` (string, userId, required)
  - `proofPhotos` (array of file URLs, optional)
  - `createdAt` (timestamp, default: now, required)
- **companyId required:** Yes
- **Company-scoped:** Yes
- **Example:**
  ```json
  { "id": "uuid", "siteId": "uuid", "companyId": "uuid", "deliveredBy": "uuid", "createdAt": "2024-01-01T12:00:00Z" }
  ```
- **Used by:** web, mobile

---

### 8. rams
- **Fields:**
  - `id` (string, uuid, PK, required)
  - `siteId` (string, required)
  - `companyId` (string, required)
  - `type` (string, required)
  - `fileUrl` (string, required)
  - `version` (string, optional)
  - `createdAt` (timestamp, default: now, required)
- **companyId required:** Yes
- **Company-scoped:** Yes
- **Example:**
  ```json
  { "id": "uuid", "siteId": "uuid", "companyId": "uuid", "type": "RAMS", "fileUrl": "url", "createdAt": "2024-01-01T12:00:00Z" }
  ```
- **Used by:** web, mobile

---

### 9. briefings, coshh, siteRules, safetyAlerts, certifications, training, settings
- **Fields:**
  - All include `companyId` (string, required)
  - Other fields: see respective modules; typically include `id`, `createdAt`, `title`, `body`, etc.
- **companyId required:** Yes
- **Company-scoped:** Yes
- **Used by:** web, mobile

---

## SECTION B — Subcollections

### 1. users/{uid}/profile/data
- **Fields:**
  - `address`, `town`, `postcode`, `dateOfBirth`, `jobTitle`, `emergencyContactName`, `emergencyContactPhone`, `nationalInsurance`, `utr`, etc.
- **Queried by:** web (main), mobile (inconsistently)
- **Inconsistency:** Mobile sometimes uses top-level `profiles` collection instead.
- **Recommendation:** Standardize on subcollection.

---

### 2. profiles/{profileId}/certifications/{docId}
- **Fields:**
  - `userId` (string, required)
  - `type` (string, required)
  - `issuedAt` (timestamp, required)
  - `expiresAt` (timestamp, optional)
- **Queried by:** web (collectionGroup), mobile (direct)
- **Inconsistency:** Mobile may write to `users/{uid}/certifications` as fallback.

---

### 3. profiles/{profileId}/training/{docId}
- **Fields:**
  - `userId` (string, required)
  - `type` (string, required)
  - `completedAt` (timestamp, required)
- **Queried by:** web (collectionGroup), mobile (direct)
- **Inconsistency:** Mobile may write to `users/{uid}/training` as fallback.

---

### 4. sites/{siteId}/assignedOperatives/{uid}
- **Fields:**
  - `userId` (string, required)
  - `assignedAt` (timestamp, required)
- **Queried by:** web, mobile

---

### 5. settings/global, settings/{companyId}
- **Fields:**
  - `config` (object, required)
- **Queried by:** web (superuser), mobile (read-only)

---

## SECTION C — Relationships

- **One-to-many:**
  - company → sites
  - company → users
  - site → tasks/notices/deliveries/rams/attendance
- **Many-to-many:**
  - users ↔ companies (via user_company_roles, not always explicit in Firestore)
  - sites ↔ users (via assignedOperatives)
- **Cross-collection references:**
  - attendance → users, sites, companies (by id)
  - tasks/notices/deliveries/rams → sites, companies (by id)
- **Implicit:**
  - Matching by `userId`, `siteId`, `companyId` in all company-scoped collections

---

## SECTION D — Derived Fields & Business Logic

- **Fields set by Cloud Functions:**
  - `companyId` (migration scripts)
  - `approved`, `superuser` (admin scripts)
  - `profileId` (sync scripts)
- **Fields set by API routes:**
  - `companyId` (injected from cookies)
  - `role` (on registration approval)
- **Fields set by mobile-only logic:**
  - Attendance geolocation fields
  - Profile fields (sometimes written to top-level `profiles`)
- **Duplicated fields:**
  - `companyId` in all company-scoped collections
  - `userId` in certifications/training (sometimes redundant)
- **Fields to normalize in SQL:**
  - `role` (enum)
  - `companyId`, `siteId`, `userId` (FKs)
  - Remove duplicated profile/certification/training paths

---

## SECTION E — Query Patterns

- **Common filters:**
  - `where('companyId', '==', ...)` (all company-scoped collections)
  - `where('siteId', '==', ...)` (site-scoped)
  - `where('userId', '==', ...)` (user-scoped)
- **Common sorts:**
  - `orderBy('createdAt', 'desc')`
  - `orderBy('timestamp', 'desc')`
- **Composite index requirements:**
  - `companyId + createdAt`
  - `siteId + createdAt`
  - `userId + timestamp`
- **Inconsistent query patterns:**
  - Profile path (web vs mobile)
  - Role casing (`supervisor` vs `SUPERVISOR`)
  - Attendance action values (`IN`/`OUT` vs `sign_in`/`sign_out`)

---

## SECTION F — Security Rule Dependencies

- **Fields used in rules:**
  - `companyId` (all access control)
  - `role` (role-based access)
  - `userId` (self-access, e.g. attendance)
  - `siteId` (site-based access)
- **Fields required for RLS in Supabase:**
  - `companyId`, `role`, `userId`, `siteId`
- **Fields validated by custom claims:**
  - `companyId`, `role`, `superuser`, `approved`

---

## SECTION G — Migration Risks

- **Collections with inconsistent shapes:**
  - `profiles` (top-level vs subcollection)
  - `certifications`/`training` (multiple parent paths)
- **Collections with missing `companyId`:**
  - Legacy data (migration scripts exist to fix)
- **Collections with mixed casing:**
  - `role` field (`supervisor` vs `SUPERVISOR`)
- **Collections with multiple write paths:**
  - Profiles, certifications, training (web vs mobile)
- **Collections requiring restructuring:**
  - Profiles/certifications/training: standardize on subcollection
  - Normalize all role/action values
  - Ensure all company-scoped docs have `companyId`
  - Add explicit FKs for all relationships

---

**This schema map is accurate to the codebase, consistent with the multi-tenant model, and ready for use in Supabase SQL schema, RLS policy, and migration script generation.**
