# Firestore structure: subcontractor partner accounts

This document describes the collections and fields used for subcontractor partners, site linking, and induction flow. Existing top-level collections (`users`, `companies`, `sites`) are extended; new subcollections and the `inviteCodes` collection are added.

## 1. Companies

**Path:** `companies/{companyId}`

| Field | Type | Notes |
|-------|------|-------|
| type | `"main" \| "partner"` | Main contractor or subcontractor partner |
| name | string | Company name |
| logoUrl | string \| null | Logo URL |
| createdAt | timestamp | |
| status | string | e.g. "Active" (existing) |
| inviteCode | string | (existing, main only) |
| subscriptionStatus | string | Main only |
| settings | object | {} |
| updatedAt | timestamp | (existing) |

Existing companies default to `type: "main"`. New partner companies created via subcontractor invite have `type: "partner"`.

## 2. Company users (optional subcollection)

**Path:** `companies/{companyId}/users/{userId}`

Can mirror or extend top-level `users` for company-scoped roles. The app continues to use top-level `users` with `companyId`; this subcollection is available for future use.

| Field | Type |
|-------|------|
| role | "admin" \| "supervisor" \| "operative" \| "sub_admin" |
| name | string |
| email | string |
| phone | string |
| companyId | string |
| permissions | object |

## 3. Company operatives (optional subcollection)

**Path:** `companies/{companyId}/operatives/{operativeId}`

| Field | Type |
|-------|------|
| name | string |
| phone | string |
| medical | object |
| trainingRecords | array |
| companyId | string |

The app may keep using top-level `users` with role "operative" and `companyId`; this subcollection is for partner-specific operative records if needed.

## 4. Sites

**Path:** `sites/{siteId}`

**Extended fields:**

| Field | Type | Notes |
|-------|------|-------|
| mainContractorId | string | Company ID of main contractor (owner) |
| inductionRequired | boolean | If true, operative must complete induction before signing in |
| name | string | (existing) |
| location | object | (existing) |
| companyId | string | (existing, main contractor) |

## 5. Site subcontractors (subcollection)

**Path:** `sites/{siteId}/subcontractors/{companyId}`

Links a partner company to a site.

| Field | Type |
|-------|------|
| linkedAt | timestamp |
| invitedBy | string (userId) |

## 6. Site assigned operatives (subcollection)

**Path:** `sites/{siteId}/assignedOperatives/{operativeId}`

| Field | Type |
|-------|------|
| companyId | string |
| operativeId | string |
| status | "active" \| "signed_in" \| "signed_out" |

## 7. User site inductions (subcollection)

**Path:** `users/{userId}/siteInductions/{siteId}`

| Field | Type |
|-------|------|
| status | "not_started" \| "in_progress" \| "completed" \| "expired" |
| completedAt | timestamp \| null |

## 8. Invite codes (new collection)

**Path:** `inviteCodes/{code}`

The document ID is the invite code (e.g. 8-char uppercase).

| Field | Type |
|-------|------|
| type | "subcontractor" |
| mainContractorId | string |
| siteId | string |
| role | "sub_admin" |
| createdAt | timestamp |

When a subcontractor redeems the code: create partner company, create sub_admin user, link company to site via `sites/{siteId}/subcontractors/{newCompanyId}`.
