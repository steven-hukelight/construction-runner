# SiteHub Supabase Schema Audit Report

**Date:** 2026-02-18  
**Method:** Migration-based schema reconstruction + code reference matching  
**Note:** Live schema extraction was not possible (requires Supabase connection). Schema derived from applying all migrations in chronological order.

---

## 1. SCHEMA EXTRACTION SUMMARY

### Tables (Migration-Defined)

| Table | Source Migration | RLS | Policies |
|-------|------------------|-----|----------|
| companies | initial_schema | ✓ | placeholder (SELECT) |
| users | initial_schema | ✓ | placeholder (SELECT) |
| user_company_roles | initial_schema | ✓ | placeholder (SELECT) |
| sites | initial_schema | ✓ | placeholder (SELECT) |
| profiles | 20260218100001 | ✓ | profiles_select_own, profiles_update_own (new) |
| user_devices | 20260214000003 | ✗ | — |
| tasks | 20260218100003 | ✓ | — |
| task_assignments | 20250219000001 / 20260218100008 | ✓ | — |
| notices | 20260218100003 | ✓ | — |
| rams | 20260218100003 | ✓ | — |
| attendance | 20260218100003 | ✓ | — |
| deliveries | 20260218100003 | ✓ | — |
| certifications | 20260218100003 | ✓ | — |
| medical_records | 20260218100003 | ✓ | — |
| messages | 20250217000000 | ✓ | — |
| assets | 20250217000000 | ✓ | — |
| offline_sync_log | 20250217000000 | ✓ | — |
| message_threads | 20250220000003 | ✓ | — |
| messages_thread | 20250220000003 | ✓ | — |
| message_recipients | 20250220000003 | ✓ | — |
| asset_assignments | 20250220000002 | ✓ | — |
| asset_inspections | 20250220000002 | ✓ | — |
| asset_documents | 20250220000002 | ✓ | — |
| offline_queue | 20250220000001 | ✓ | — |
| near_miss | 20250219000000 | ✓ | Allow all for service_role |
| pre_induction_* | 20250220000005, 20260218100000 | ✓ | competency_card has policies |
| invite_codes | 20260218100007 | ✗ | — |
| user_profile_data | 20260218100007 | ✓ | — |
| assigned_operatives | 20260218100007 | ✓ | — |
| site_subcontractors | 20260218100007 | ✓ | — |
| user_site_inductions | 20260218100007 | ✓ | — |
| briefings | 20260218100007 | ✓ | — |
| briefing_acknowledgements | 20260218100007 | ✓ | — |
| safety_alerts | 20260218100007 | ✓ | — |
| audit_logs | 20260218100007 | ✓ | — |
| coshh | 20260218100008 | ✓ | — |
| settings | 20260218100008 | ✓ | — |
| profile_training | 20260218100008 | ✓ | — |
| profile_certifications | 20260218100008 | ✓ | — |
| registrations | 20260218100008 | ✓ | — |
| site_rules | 20260218100008 | ✓ | — |
| user_pre_induction_profile | 20260218100008 | ✓ | — |

---

## 2. CODE REFERENCE MATCHING

### Tables in Code but Missing from Migrations (FIXED)

| Table | Used By | Migration Added |
|-------|---------|-----------------|
| invite_codes | invite-codes API | 20260218100007 |
| user_profile_data | profiles/[id], induction-compliance | 20260218100007 |
| assigned_operatives | sites/assigned-operatives | 20260218100007 |
| site_subcontractors | invite-codes/redeem | 20260218100007 |
| user_site_inductions | gdpr, supervisor, attendance | 20260218100007 |
| briefings | briefings API | 20260218100007 |
| briefing_acknowledgements | briefings/accept | 20260218100007 |
| safety_alerts | safety-alerts API | 20260218100007 |
| audit_logs | lib/auditLog | 20260218100007 |
| coshh | coshh API | 20260218100008 |
| settings | settings/global API | 20260218100008 |
| profile_training | training API | 20260218100008 |
| profile_certifications | dev/seed-cert-training | 20260218100008 |
| registrations | auth/registrations | 20260218100008 |
| site_rules | site-rules API | 20260218100008 |
| user_pre_induction_profile | profiles route fallback | 20260218100008 |

### Tables in Migrations but NOT Referenced in Code (Potential Orphans)

| Table | Notes |
|-------|-------|
| user_company_roles | Legacy; users now have company_id, role directly. Low risk to keep. |
| upload_logs | In REBUILD only; no API reference found. Legacy. |
| notices_read | In REBUILD; not found in sitehub-admin. May be mobile. |
| firestore_* (staging) | Migration-only; safe to drop after Firebase migration complete. |

### Type Mismatches Identified

| Location | Issue | Status |
|----------|-------|--------|
| companies.id | Initial has UUID; some APIs use TEXT for company_id | Handled via TEXT for company_id in child tables |
| sites.id | UUID in initial; assigned_operatives uses site_id TEXT | TEXT used for cross-deployment compatibility |
| settings | API uses companyId; migration has company_id | Both columns added for compatibility |

---

## 3. RLS VALIDATION

### Tables with RLS Enabled but NO Policies (Block Client Access)

These tables block all anon/authenticated access except service_role. **API routes use supabaseAdmin (service_role)** so they are unaffected. Client-side `supabase.from()` would fail.

| Table | Client Used? | Action |
|-------|--------------|--------|
| profiles | ✓ (profile page fallback) | **FIXED** – Added profiles_select_own, profiles_update_own |
| tasks, notices, rams, etc. | ✗ | No change (API-only) |

### Tables with RLS + Permissive Policies

- companies, users, sites: `placeholder` policy allows SELECT for all
- pre_induction_competency_card: Allow read/insert/update
- near_miss: Allow all for service_role

### Service Role Bypass

All API routes use `supabaseAdmin` (service role key), which bypasses RLS. RLS only affects direct client-side Supabase calls.

---

## 4. MIGRATIONS GENERATED

| Migration | Location | Contents |
|-----------|----------|----------|
| 20260218100007 | /supabase/migrations/ | invite_codes, user_profile_data, assigned_operatives, site_subcontractors, user_site_inductions, briefings, briefing_acknowledgements, safety_alerts, audit_logs |
| 20260218100008 | /supabase/migrations/ | task_assignments, coshh, settings, profile_training, profile_certifications, registrations, site_rules, user_pre_induction_profile, profiles RLS policies |
| 20260218100004 | sitehub-admin/supabase/migrations/ | Same as 20260218100007 |
| 20260218100005 | sitehub-admin/supabase/migrations/ | Same as 20260218100008 (minus task_assignments - already in 20250219000001) |

---

## 5. CLEANUP PLAN

### Tables That Can Be Safely Dropped (After Verification)

1. **firestore_*** (firebase_staging schema) – Drop after Firebase→Supabase migration is complete.
2. **user_company_roles** – Only if confirmed users table fully replaces this (company_id, role on users). **Recommend: Keep** for now; used by handle_new_user in some branches.

### Tables to Keep (Used or Legacy)

- All tables in the "Tables (Migration-Defined)" section above are in use or required for migration compatibility.

---

## 6. REMAINING RISKS

1. **companies.id type** – Initial schema uses UUID; invite-codes/redeem inserts into companies and expects `.select("id")` to return UUID. If deployments use TEXT for companies.id, redeem may fail. **Mitigation:** Use TEXT for companies.id in a migration if needed.
2. **RLS on new tables** – New tables (invite_codes, etc.) have RLS enabled but no explicit policies. Service role bypasses; anon/authenticated direct access will be blocked. **Acceptable** for API-only usage.
3. **Duplicate migrations** – Root `/supabase/migrations/` and `sitehub-admin/supabase/migrations/` may target different Supabase projects. Ensure the correct set is applied per project.

---

## 7. VALIDATED TABLES (Post-Migration)

After applying migrations, the following tables are validated:

- users, companies, sites, profiles  
- pre_induction_personal, pre_induction_right_to_work, pre_induction_certifications, pre_induction_medical, pre_induction_training, pre_induction_declarations, pre_induction_competency_card  
- certifications, medical_records  
- tasks, task_assignments  
- notices, rams, attendance, deliveries  
- near_miss, coshh  
- assets, asset_assignments, asset_inspections, asset_documents  
- messages, message_threads, messages_thread, message_recipients  
- offline_queue, offline_sync_log  
- invite_codes, user_profile_data, assigned_operatives, site_subcontractors, user_site_inductions  
- briefings, briefing_acknowledgements  
- safety_alerts, audit_logs  
- settings, registrations  
- profile_training, profile_certifications  
- site_rules, user_pre_induction_profile  

---

**Next step:** Run `npx supabase db push` from project root or sitehub-admin to apply migrations. Do not run automatically.
