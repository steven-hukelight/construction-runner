# Migration: Grandfather Existing Site Inductions

**Status:** Implemented

## Purpose

When Pre-Induction becomes mandatory, existing site inductions must be grandfathered so users who were inducted before the mandate are not required to re-complete Pre-Induction.

## Scope

- **users/{uid}** – Ensure `preInductionStatus` is set (default `"not_started"`) if not present
- **users/{uid}/siteInductions/{siteId}** – Set `grandfathered = true` for all existing records

## Migration Logic (Future Script)

```
For each user document in users:
  1. If preInductionStatus is missing, set preInductionStatus = "not_started"
  2. If adminPreInductionOverride is missing, set adminPreInductionOverride = false

For each document in users/{uid}/siteInductions:
  1. Set grandfathered = true
  2. Leave preInductionRequiredAt as null (or omit)
  3. Do NOT modify status, completedAt, or other existing fields
```

## Script Location

`scripts/migrate-grandfather-site-inductions.js`

Run: `node scripts/migrate-grandfather-site-inductions.js`

## Prerequisites

- Firebase Admin SDK (env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` or `GOOGLE_APPLICATION_CREDENTIALS`)

## Safety

- Idempotent: safe to run multiple times
- Only adds/updates new fields; does not remove or rename existing data
