# Canonical Data Model (Web + Mobile)

Use `profiles` as the source of truth and ensure records include linkage fields shared across platforms.

- Profiles: `profiles/{profileId}`
  - Required fields: `userId`, `addressLine1`, `town`, `postcode`, `dateOfBirth`, `jobTitle`, `emergencyContactName`, `emergencyContactPhone`, `nationalInsurance`, `utr`
  - Link: `users/{uid}.profileId = {profileId}`

- Certifications: Prefer `profiles/{profileId}/certifications/{docId}`
  - Fields: `title`, `issuer`, `issueDate`, `expiryDate`, `userId`, `createdAt`, `attachmentUrl?`, `attachmentType?`
  - Mobile writes MUST include `userId` (uid). Web lists use `collectionGroup('certifications')`.

- Training: Prefer `profiles/{profileId}/training/{docId}`
  - Fields: `title`, `issuer`, `issueDate`, `expiryDate`, `userId`, `createdAt`, `attachmentUrl?`, `attachmentType?`
  - Mobile writes MUST include `userId`. Web lists use `collectionGroup('training')`.

- Fallback paths: If `profiles` not found, mobile may write to `users/{uid}/certifications|training` with the same fields. Web uses `collectionGroup` so both parents are visible.

- Geofence: `sites/{siteId}` should include either a 6-point polygon or a center+radius. Mobile renders polygon when present, otherwise circle.

Operational guidelines:
- Always set `users/{uid}.profileId` after creating/updating a profile.
- Include `userId` on every certification/training record for cross-platform visibility.
- Prefer listening with live streams (`onSnapshot(collectionGroup)` on web; `StreamBuilder` on mobile).
- Keep Firestore indexes updated for `collectionGroup` queries.

---

## User Document Fields (users/{uid})

### Pre-Induction Fields (ADDED)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `preInductionStatus` | `"not_started"` \| `"in_progress"` \| `"complete"` | `"not_started"` | Overall Pre-Induction completion status |
| `adminPreInductionOverride` | boolean | `false` | When true, admin has waived Pre-Induction requirement |
| `complianceScore` | number (0–100) | optional | Can be populated later; not required at creation |

Do NOT remove or rename existing fields (`companyId`, `role`, etc.).

---

## Pre-Induction Profile Subcollection

Path: `users/{uid}/preInductionProfile/{sectionId}`

**sectionId values:** `personal`, `rightToWork`, `certifications`, `medical`, `training`, `declarations`

### personal
| Field | Type |
|-------|------|
| fullName | string |
| dateOfBirth | timestamp/string |
| nationalInsuranceNumber | string |
| phone | string |
| email | string |
| address | string |
| emergencyContactName | string |
| emergencyContactRelationship | string |
| emergencyContactPhone | string |
| employerCompanyId | string |
| supervisorName | string |
| trade | string |
| jobRole | string |
| utrNumber | string (optional) |
| payrollNumber | string (optional) |
| updatedAt | timestamp |

### rightToWork
| Field | Type |
|-------|------|
| passportUrl | string \| null |
| passportExpiry | timestamp \| null |
| visaUrl | string \| null |
| visaExpiry | timestamp \| null |
| shareCode | string \| null |
| proofOfAddressUrl | string \| null |
| rightToWorkVerified | boolean |
| rightToWorkVerifiedBy | string \| null (admin uid) |
| rightToWorkVerifiedAt | timestamp \| null |
| notes | string \| null |
| updatedAt | timestamp |

### certifications
| Field | Type |
|-------|------|
| certifications | array of { type, cardNumber, fileUrl, expiry, verified, verifiedBy, verifiedAt, notes } |
| updatedAt | timestamp |

Certification types: CSCS, CPCS, IPAF, PASMA, FIRST_AID, MANUAL_HANDLING, ASBESTOS, FIRE_MARSHAL, SMSTS, SSSTS, CONFINED_SPACES, or string.

### medical
| Field | Type |
|-------|------|
| medicalDeclaration | string \| null |
| fitToWork | boolean \| null |
| allergies | string \| null |
| medication | string \| null |
| medicalCertificateUrl | string \| null |
| medicalVerified | boolean |
| medicalVerifiedBy | string \| null |
| medicalVerifiedAt | timestamp \| null |
| notes | string \| null |
| updatedAt | timestamp |

### training
| Field | Type |
|-------|------|
| trainingRecords | array of { type, completedAt, expiry, fileUrl, verified, verifiedBy, verifiedAt, notes } |
| ramsAccepted | boolean |
| ramsAcceptedAt | timestamp \| null |
| ramsVersion | string \| null |
| updatedAt | timestamp |

### declarations
| Field | Type |
|-------|------|
| operativeDeclarationAccepted | boolean |
| operativeDeclarationAcceptedAt | timestamp \| null |
| operativeSignatureUrl | string \| null |
| supervisorDeclarationAccepted | boolean \| null |
| supervisorDeclarationAcceptedAt | timestamp \| null |
| notes | string \| null |
| updatedAt | timestamp |

---

## Site Induction Record Fields (users/{uid}/siteInductions/{siteId})

### Grandfathering Fields (ADDED)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `grandfathered` | boolean | `false` | When true, record predates Pre-Induction mandate |
| `preInductionRequiredAt` | timestamp \| null | null | When Pre-Induction became mandatory for this user/site |

Do NOT change existing fields (`status`, `completedAt`, etc.). For migration: set `grandfathered = true` on existing inducted records.
