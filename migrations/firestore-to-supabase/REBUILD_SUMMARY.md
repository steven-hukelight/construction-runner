# SiteHub Database Rebuild Summary

## Overview

Complete rebuild of the SiteHub Supabase database from Firestore JSON export. Uses UUID for `users.id` (compatible with `auth.uid()`), `firebase_uid` for mapping.

## Execution Order

```bash
# 1. Drop all broken tables
psql $DATABASE_URL -f REBUILD_01_DROP_TABLES.sql

# 2. Create clean schema
psql $DATABASE_URL -f REBUILD_02_CREATE_SCHEMA.sql

# 3. Enable RLS
psql $DATABASE_URL -f REBUILD_03_ENABLE_RLS.sql

# 4. Add RLS policies
psql $DATABASE_URL -f REBUILD_04_RLS_POLICIES.sql

# 5. Insert Firestore data (run as service_role or postgres - bypasses RLS)
psql $DATABASE_URL -f REBUILD_05_INSERT_DATA.sql

# 6. Backfill user references
psql $DATABASE_URL -f REBUILD_06_BACKFILL_USER_REFS.sql
```

## Schema Summary

| Table | Key columns | Notes |
|-------|-------------|-------|
| companies | id TEXT (Firestore) | 2 rows |
| users | id UUID, firebase_uid TEXT UNIQUE | 4 rows |
| sites | id TEXT, company_id | 4 rows |
| profiles | id TEXT, user_id UUID, firebase_uid | 1 row |
| profile_certifications | (profile_id, id) | 1 row |
| profile_training | (profile_id, id) | 1 row |
| deliveries | id TEXT, created_by UUID, firebase_uid | 3 rows |
| notices | id TEXT | 1 row |
| notices_read | (notice_id, user_id) | 0 rows |
| tasks | id TEXT | 1 row |
| settings | id TEXT | 2 rows |
| registrations | id TEXT | 16 rows |
| user_pre_induction_profile | id TEXT, user_id UUID | 1 row |
| attendance | id TEXT | 0 rows |
| rams | id TEXT | 0 rows |
| upload_logs | id TEXT | 0 rows |

## RLS Role Model

- **superuser** → full access
- **admin** → full access to their company (`users.company_id = row.company_id`)
- **supervisor** → site-level (via company)
- **operative** → self only (`auth.uid() = users.id` or `user_id = auth.uid()`)

Policies use `auth.uid() = users.id` and join `profiles.user_id::uuid = users.id`.

## Data Not Mapped / Unmapped

| Source | Issue | Count |
|--------|-------|-------|
| **settings.company_id** | Value "test company ltd" is display text, not a company ID. No FK. | 2 rows |
| **registrations.company_id** | 14 of 16 reference companies not in export (e.g. n5ppOhPtsJtF5KBIqmLl). No FK on registrations. | 16 rows |
| **deliveries** | 2 of 3 have company_id NULL in source. | - |
| **users.profile_id** | Not in schema; profiles reference users. | - |
| **user_profile** (users/{userId}/profile) | Not imported; data in Firestore subcollection. | 3 users |
| **attendance, rams, briefings, notices_read, upload_logs** | Empty in export. | 0 |

## Auth Sync Required

After rebuild, link Supabase Auth to `users`:

1. Create `auth.users` for each user (or migrate from Firebase Auth).
2. Update `users.id` to match `auth.users.id` for each user:
   ```sql
   UPDATE users SET id = '<auth_user_uuid>' WHERE firebase_uid = '<firebase_uid>';
   ```
3. RLS will then correctly resolve `auth.uid() = users.id`.

## Validation Queries

```sql
-- Check FKs resolve
SELECT 'profiles' t, COUNT(*) FROM profiles WHERE user_id IS NULL;  -- expect 0 after backfill
SELECT 'deliveries' t, COUNT(*) FROM deliveries WHERE created_by IS NULL AND firebase_uid IS NOT NULL;  -- expect 0 after backfill

-- Check RLS (as authenticated user)
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO '<user_uuid>';
SELECT * FROM users;  -- should return rows based on policy
```
