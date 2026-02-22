# SiteHub Full Rebuild - Output Summary

**Completed:** 2026-02-16

## 1. Final SQL Schema

Located in: `REBUILD_02_CREATE_SCHEMA.sql`

### Tables created (16)

| Table | Key Columns | Notes |
|-------|-------------|-------|
| companies | id TEXT PK | Firestore IDs preserved |
| users | id UUID PK, firebase_uid UNIQUE | Matches auth.uid() |
| sites | id TEXT PK | company_id, manager_id FKs |
| profiles | id TEXT PK | user_id UUID, firebase_uid for backfill |
| profile_certifications | (profile_id, id) PK | FK to profiles |
| profile_training | (profile_id, id) PK | FK to profiles |
| deliveries | id TEXT PK | created_by UUID, firebase_uid for backfill |
| notices | id TEXT PK | company_id, site_id |
| notices_read | (notice_id, user_id) PK | FK to notices, users |
| tasks | id TEXT PK | company_id, site_id, assigned_to |
| settings | id TEXT PK | company_id (no FK) |
| registrations | id TEXT PK | company_id (no FK) |
| user_pre_induction_profile | id TEXT PK | user_id, firebase_uid |
| attendance | id TEXT PK | user_id, site_id, company_id |
| rams | id TEXT PK | company_id, site_id |
| upload_logs | id TEXT PK | user_id |

### Key design decisions

- **users.id** = UUID (for `auth.uid()` alignment)
- **firebase_uid** = Firestore UID for mapping during migration
- **user_id** and **created_by** = left NULL on insert, backfilled later

---

## 2. Final RLS Policies

Located in: `REBUILD_04_RLS_POLICIES.sql` (migration: `sitehub_full_rebuild_rls_policies`)

### Role model

| Role | Access |
|------|--------|
| **superuser** | Full access to everything |
| **admin** | Full access to their company |
| **supervisor** | Site-level access (via company) |
| **operative** | Self-only (own profile, deliveries, etc.) |

### Helper functions (SECURITY DEFINER, search_path = public)

- `auth_user_role()` → role from users
- `auth_user_company_id()` → company_id from users
- `auth_is_superuser()` → superuser flag
- `auth_is_admin_or_above()` → ADMIN, SUPERVISOR, SUPERUSER

### Policy patterns

- **Companies, sites, notices, tasks, rams**: superuser OR company_id = auth_user_company_id()
- **Users**: superuser OR same company OR self
- **Profiles**: superuser OR own profile OR profile's user in same company
- **Deliveries**: superuser OR same company OR created_by = auth.uid()
- **Settings**: superuser OR company_id = auth_user_company_id()
- **Registrations**: any authenticated user
- **Notices_read, attendance, upload_logs**: role-based + self

---

## 3. INSERT Scripts (Firebase-migrated data)

Located in: `REBUILD_05_INSERT_DATA.sql`

### Data imported

| Table | Rows | Source |
|-------|------|--------|
| companies | 2 | Firestore export |
| users | 4 | Firestore (gen_random_uuid for id) |
| sites | 4 | Firestore |
| profiles | 1 | user_id NULL, firebase_uid set |
| profile_certifications | 1 | FK to profile |
| profile_training | 1 | FK to profile |
| deliveries | 3 | created_by NULL, firebase_uid set |
| notices | 1 | |
| tasks | 1 | |
| settings | 2 | company_id = display text (no FK) |
| registrations | 16 | company_id may reference non-exported companies |
| user_pre_induction_profile | 1 | user_id NULL, firebase_uid set |

### Run instructions

Run with **service_role** or as **postgres** to bypass RLS:

```bash
psql $DATABASE_URL -f migrations/firestore-to-supabase/REBUILD_05_INSERT_DATA.sql
```

---

## 4. Backfill Scripts

Located in: `REBUILD_06_BACKFILL_USER_REFS.sql`

### Backfill performed

1. **profiles.user_id** ← users.id WHERE firebase_uid match  
2. **deliveries.created_by** ← users.id WHERE firebase_uid match  
3. **user_pre_induction_profile.user_id** ← users.id WHERE firebase_uid match  

### Run order

1. REBUILD_05_INSERT_DATA.sql  
2. REBUILD_06_BACKFILL_USER_REFS.sql  

---

## 5. Data Mapping Summary

### Successfully mapped

- All 4 users: firebase_uid → users.id
- 1 profile: firebase_uid W1BARv21DgaxKN6vrYdzb5wMRaY2 → user_id
- 3 deliveries: firebase_uid → created_by
- 1 user_pre_induction_profile: firebase_uid → user_id

### Known gaps (intentional)

| Item | Notes |
|------|-------|
| **settings.company_id** | Value "test company ltd" is display text, not company ID. No FK. 2 rows. |
| **registrations.company_id** | 14 of 16 reference companies not in Firestore export (e.g. n5ppOhPtsJtF5KBIqmLl). No FK on registrations. Kept as-is for audit. |
| **deliveries.company_id** | 2 of 3 have company_id NULL (mobile-created). Accepted. |
| **deliveries.site_id** | 2 of 3 have site_id NULL. One has sfBugkMBuzry8U6lzqkj (valid). |

### Not in export (empty tables)

- notices_read
- attendance  
- rams
- upload_logs

---

## 6. Migrations Applied

1. `sitehub_full_rebuild_drop_and_recreate` – DROP all public tables, CREATE schema, ENABLE RLS  
2. `sitehub_full_rebuild_rls_policies` – CREATE RLS helper functions and policies  

---

## 7. Validation

- [x] All foreign keys resolve  
- [x] All RLS policies compile  
- [x] profiles.user_id backfilled: 1/1  
- [x] deliveries.created_by backfilled: 3/3  
- [x] user_pre_induction_profile.user_id backfilled: 1/1  
- [x] No UUID/TEXT mismatches  
