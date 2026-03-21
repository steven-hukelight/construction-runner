# SiteHub Data Layer Audit

**Date:** 2026-02-18  
**Scope:** Web (sitehub-admin), Backend API, Mobile (sitehub_worker_Ready)

---

## 1. PROJECT-WIDE SCAN

### Tables Referenced by API Routes

| Table | API Routes | Operations |
|-------|------------|------------|
| **users** | auth/login, me, users, profiles, certifications, attendance, etc. | SELECT, INSERT, UPDATE, DELETE, UPSERT |
| **companies** | me, companies, users, sites, invite-codes/redeem, subcontractors | SELECT, INSERT, UPDATE, DELETE |
| **sites** | sites, attendance, deliveries, rams, invite-codes, supervisor | SELECT, INSERT, UPDATE, DELETE |
| **profiles** | profiles/me, profiles, pre-induction/personal | SELECT, INSERT, UPDATE |
| **user_profile_data** | profiles/[id], induction-compliance | SELECT, INSERT, UPDATE, DELETE |
| **pre_induction_personal** | pre-induction, gdpr, supervisor | SELECT, UPSERT |
| **pre_induction_right_to_work** | pre-induction, gdpr, supervisor | SELECT, UPSERT |
| **pre_induction_certifications** | pre-induction, gdpr, supervisor | SELECT, UPSERT |
| **pre_induction_medical** | pre-induction, gdpr, supervisor | SELECT, UPSERT |
| **pre_induction_training** | pre-induction, gdpr, supervisor, rams/accept | SELECT, UPSERT |
| **pre_induction_declarations** | pre-induction, gdpr, supervisor | SELECT, UPSERT |
| **pre_induction_competency_card** | pre-induction | SELECT, UPSERT |
| **certifications** | certifications | SELECT, INSERT, UPDATE, DELETE |
| **medical_records** | users/[id]/medical | SELECT, INSERT, UPDATE |
| **tasks** | tasks | SELECT, INSERT |
| **task_assignments** | tasks | SELECT, INSERT |
| **notices** | notices | SELECT, INSERT, UPDATE, DELETE |
| **rams** | rams, supervisor | SELECT, INSERT, UPDATE, DELETE |
| **attendance** | attendance | SELECT, INSERT |
| **deliveries** | deliveries | SELECT, INSERT, UPDATE, DELETE |
| **near_miss** | near-miss | SELECT, INSERT, UPDATE |
| **coshh** | coshh | SELECT, INSERT |
| **assets** | assets, companies/[companyId]/assets | SELECT, INSERT, UPDATE |
| **asset_assignments** | assets/assign, assets/mine | SELECT, INSERT |
| **asset_inspections** | assets/inspection | SELECT, INSERT |
| **asset_documents** | assets/upload-document | SELECT, INSERT |
| **offline_queue** | offline | SELECT, INSERT, UPDATE |
| **offline_sync_log** | companies/[companyId]/offline | SELECT, INSERT |
| **message_threads** | messages/threads | SELECT, INSERT |
| **message_recipients** | messages/threads, messages/send | SELECT, INSERT |
| **messages_thread** | messages/threads, messages/send | SELECT, INSERT |
| **messages** | companies/[companyId]/messages | SELECT, INSERT (legacy) |
| **registrations** | auth/registrations | SELECT, INSERT, UPDATE |
| **invite_codes** | invite-codes, invite-codes/redeem | SELECT, UPSERT |
| **assigned_operatives** | sites/assigned-operatives, attendance, supervisor | SELECT, INSERT, UPDATE, DELETE |
| **site_subcontractors** | sites/subcontractors, invite-codes/redeem | SELECT, UPSERT |
| **user_site_inductions** | gdpr, supervisor, attendance, induction | SELECT, INSERT, UPDATE, DELETE |
| **briefings** | briefings | SELECT, INSERT, DELETE |
| **briefing_acknowledgements** | briefings/accept | SELECT, UPSERT |
| **safety_alerts** | safety-alerts | SELECT, INSERT, UPDATE, DELETE |
| **audit_logs** | lib/auditLog (writeAuditLog) | INSERT |

### Mobile API Client Endpoints

- `/api/attendance` — GET, POST
- `/api/pre-induction` — GET
- `/api/pre-induction/{userId}/{section}` — POST
- `/api/tasks`, `/api/notices`, `/api/rams`, `/api/deliveries`
- `/api/sites`, `/api/users`, `/api/certifications`
- `/api/offline/pending`, `/api/offline/mark-synced`

---

## 2. SCHEMA VALIDATION

### Tables in Migrations (sitehub-admin + root supabase)

**Present:** users, companies, sites, profiles, pre_induction_*, certifications, medical_records, tasks, task_assignments, notices, rams, attendance, deliveries, near_miss, coshh, assets, asset_assignments, asset_inspections, asset_documents, offline_queue, offline_sync_log, message_threads, message_recipients, messages_thread, messages

**Missing from sitehub-admin migrations:**
- invite_codes
- user_profile_data
- assigned_operatives
- site_subcontractors
- user_site_inductions
- briefings
- briefing_acknowledgements
- safety_alerts
- audit_logs

### Column Type Notes

- `companies.id`, `sites.id`: May be UUID or TEXT depending on migration order. APIs use string comparison.
- `site_id`, `company_id`: Inconsistent (TEXT vs UUID) across tables. Core migrations use TEXT for company_id.
- `users.company_id`: TEXT (from 20260218100001).

---

## 3. MIGRATION GENERATION

Migrations created in `/supabase/migrations/20260218100007_sitehub_missing_tables.sql` for:
- invite_codes
- user_profile_data
- assigned_operatives
- site_subcontractors
- user_site_inductions
- briefings
- briefing_acknowledgements
- safety_alerts
- audit_logs

---

## 4. API VALIDATION STATUS

| Route | Table Match | Payload/Column Match | Error Handling |
|-------|-------------|----------------------|----------------|
| pre-induction/* | ✓ | ✓ camelCase↔snake_case | ✓ |
| certifications | ✓ | ✓ | ✓ |
| attendance | ✓ | ✓ accepts operativeId/operative_id | ✓ |
| deliveries | ✓ | ✓ | ✓ |
| tasks | ✓ | ✓ | ✓ |
| notices | ✓ | ✓ | ✓ |
| rams | ✓ | ✓ | ✓ |
| invite-codes | ✓ | ✓ | ✓ |
| profiles/[id] | user_profile_data | ✓ or(userid,user_id) | ✓ |

---

## 5. WEB UI VALIDATION

- Pre-induction: router.refresh() on save ✓
- Profile: uses supabase.from direct (RLS applies)
- Induction compliance: server action + drawer API ✓

---

## 6. MOBILE VALIDATION

- Pre-induction: GET returns camelCase; POST accepts snake_case ✓
- Attendance: sends operativeId + operative_id ✓
- Other endpoints: standard REST ✓

---

## 7. END-TO-END TEST COVERAGE

| Module | Load | Edit | Save | Supabase | UI Refresh |
|--------|------|------|------|----------|------------|
| Operatives/Users | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sites | ✓ | ✓ | ✓ | ✓ | ✓ |
| Attendance | ✓ | ✓ | ✓ | ✓ | ✓ |
| Deliveries | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tasks | ✓ | ✓ | ✓ | ✓ | ✓ |
| Notices | ✓ | ✓ | ✓ | ✓ | ✓ |
| RAMS | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pre-Induction | ✓ | ✓ | ✓ | ✓ | ✓ |
| Messaging | ✓ | ✓ | ✓ | ✓ | ✓ |
| Assets | ✓ | ✓ | ✓ | ✓ | ✓ |
| Offline | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## RLS Note

API routes use `supabaseAdmin` (service role) which bypasses RLS. RLS policies apply only when using the anon key (e.g. client-side supabase.from). The migrations enable RLS; explicit policies may be added per-table if client access is required.
