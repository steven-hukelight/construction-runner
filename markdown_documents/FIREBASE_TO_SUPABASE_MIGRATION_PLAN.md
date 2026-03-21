# Firebase → Supabase Migration Analysis & Mapping Plan

> **IMPORTANT:** This document is for analysis and planning only. Do NOT run any SQL or modify data until explicitly approved.

---

## 1. SUPABASE SCHEMA ANALYSIS

### 1.1 All Tables

| Table | Purpose |
|-------|---------|
| `companies` | Company/tenant records |
| `users` | User accounts with role, company linkage |
| `sites` | Sites belonging to companies |
| `attendance` | Sign-in/sign-out records per user/site |
| `tasks` | Tasks assigned to users at sites |
| `notices` | Site notices |
| `notices_read` | Track which users have read which notices |
| `deliveries` | Delivery records with proof photos |
| `rams` | RAMS documents (Risk Assessments) |
| `briefings` | Toolbox talks / briefings |
| `briefing_acknowledgements` | User acknowledgement of briefings |
| `coshh` | COSHH assessments |
| `site_rules` | Site-specific rules (PPE, procedures) |
| `safety_alerts` | Safety alerts |
| `certifications` | User certifications |
| `training` | Training records |
| `user_profile_data` | Extended profile (address, emergency contact) |
| `assigned_operatives` | Sites → Users assignment |
| `site_subcontractors` | Sites → Partner companies linkage |
| `settings` | Global/company settings |
| `pre_induction_personal` | Pre-induction personal info |
| `pre_induction_certifications` | Pre-induction certs (JSONB) |
| `pre_induction_medical` | Pre-induction medical |
| `pre_induction_right_to_work` | Right-to-work docs |
| `pre_induction_training` | RAMS/training acceptance |
| `pre_induction_declarations` | Operative declarations |
| `medical_records` | Medical uploads per user |
| `upload_logs` | Upload audit trail |
| `user_site_inductions` | User induction status per site |
| `user_roles` | Multi-company roles (future) |
| `registrations` | Pending registrations |
| `audit_logs` | Audit trail |

---

### 1.2 Per-Table Structured Summary

#### companies
```json
{
  "table": "companies",
  "columns": ["id", "name", "createdat", "updated_at", "created_at"],
  "fks": [],
  "duplicates": ["createdat", "created_at"],
  "required_fixes": [
    "Remove duplicate: keep created_at, drop createdat after data migration"
  ]
}
```

#### users
```json
{
  "table": "users",
  "columns": ["id", "email", "companyid", "company_id", "role", "profileid", "profile_id", "status", "createdat", "created_at", "disabled", "approved", "superuser", "updated_at", "firebase_uid", "name", "display_name", "pre_induction_status", "admin_pre_induction_override", "compliance_score", "last_login"],
  "fks": ["companyid→companies(id)", "company_id→companies(id)"],
  "duplicates": ["companyid/company_id", "profileid/profile_id", "createdat/created_at"],
  "required_fixes": [
    "Remove duplicate: keep company_id, drop companyid",
    "Merge profileid into profile_id or remove if redundant",
    "Merge createdat into created_at"
  ]
}
```

#### sites
```json
{
  "table": "sites",
  "columns": ["id", "companyid", "company_id", "name", "createdat", "created_at", "assignedusers", "assigned_users", "ramsversion", "rams_version", "maincontractorid", "main_contractor_id", "updated_at", "location", "geofence", "latitude", "longitude", "radius_meters", "show_on_map", "active", "manager_id", "induction_required", "rams_updated_at"],
  "fks": ["companyid→companies(id)", "company_id→companies(id)"],
  "duplicates": ["companyid/company_id", "createdat/created_at", "assignedusers/assigned_users", "ramsversion/rams_version", "maincontractorid/main_contractor_id"],
  "required_fixes": [
    "Remove duplicates; keep snake_case columns",
    "assigned_users can replace assignedusers (JSONB array of user ids)"
  ]
}
```

#### attendance
```json
{
  "table": "attendance",
  "columns": ["id", "userid", "user_id", "siteid", "site_id", "companyid", "company_id", "action", "timestamp", "latitude", "longitude", "accuracy", "email", "updated_at"],
  "fks": ["userid→users(id)", "user_id→users(id)", "siteid→sites(id)", "site_id→sites(id)", "companyid→companies(id)", "company_id→companies(id)"],
  "duplicates": ["userid/user_id", "siteid/site_id", "companyid/company_id"],
  "required_fixes": [
    "Remove duplicate FKs and columns; keep user_id, site_id, company_id"
  ]
}
```

#### tasks
```json
{
  "table": "tasks",
  "columns": ["id", "siteid", "site_id", "companyid", "company_id", "assignedto", "assigned_to", "status", "description", "createdat", "created_at", "updated_at"],
  "fks": ["siteid→sites(id)", "site_id→sites(id)", "companyid→companies(id)", "company_id→companies(id)", "assignedto→users(id)", "assigned_to→users(id)"],
  "duplicates": ["siteid/site_id", "companyid/company_id", "assignedto/assigned_to", "createdat/created_at"],
  "required_fixes": [
    "Remove duplicates; keep snake_case columns"
  ]
}
```

#### notices
```json
{
  "table": "notices",
  "columns": ["id", "siteid", "site_id", "companyid", "company_id", "title", "body", "attachments", "createdat", "created_at", "updated_at"],
  "fks": ["siteid→sites(id)", "site_id→sites(id)", "companyid→companies(id)", "company_id→companies(id)"],
  "duplicates": ["siteid/site_id", "companyid/company_id", "createdat/created_at"],
  "required_fixes": ["Remove duplicates"]
}
```

#### deliveries
```json
{
  "table": "deliveries",
  "columns": ["id", "siteid", "site_id", "companyid", "company_id", "deliveredby", "delivered_by", "proofphotos", "proof_photos", "createdat", "created_at", "updated_at", "reference", "status", "scheduled_at", "notes", "pod_url", "load_url", "wholesaler", "site"],
  "fks": ["siteid→sites(id)", "site_id→sites(id)", "companyid→companies(id)", "company_id→companies(id)", "deliveredby→users(id)", "delivered_by→users(id)"],
  "duplicates": ["siteid/site_id", "companyid/company_id", "deliveredby/delivered_by", "proofphotos/proof_photos", "createdat/created_at"],
  "required_fixes": ["Remove duplicates"]
}
```

#### rams
```json
{
  "table": "rams",
  "columns": ["id", "siteid", "site_id", "companyid", "company_id", "type", "fileurl", "file_url", "version", "createdat", "created_at", "updated_at", "status", "title", "uploaded_by"],
  "fks": ["siteid→sites(id)", "site_id→sites(id)", "companyid→companies(id)", "company_id→companies(id)"],
  "duplicates": ["siteid/site_id", "companyid/company_id", "fileurl/file_url", "createdat/created_at"],
  "required_fixes": ["Remove duplicates"]
}
```

#### briefings
```json
{
  "table": "briefings",
  "columns": ["id", "companyid", "company_id", "site_id", "siteid", "title", "body", "createdat", "created_at", "updated_at", "file_url", "uploaded_by"],
  "fks": ["companyid→companies(id)", "company_id→companies(id)", "site_id→sites(id)"],
  "duplicates": ["companyid/company_id", "siteid/site_id", "createdat/created_at"],
  "required_fixes": [
    "siteid is nullable, site_id has FK - consolidate",
    "Remove companyid, siteid duplicates"
  ]
}
```

#### coshh
```json
{
  "table": "coshh",
  "columns": ["id", "companyid", "company_id", "site_id", "title", "body", "createdat", "created_at", "updated_at", "substance", "hazard_symbols", "ppe", "file_url"],
  "fks": ["companyid→companies(id)", "company_id→companies(id)", "site_id→sites(id)"],
  "duplicates": ["companyid/company_id", "createdat/created_at"],
  "required_fixes": ["Remove duplicates"]
}
```

#### site_rules
```json
{
  "table": "site_rules",
  "columns": ["id", "companyid", "company_id", "site_id", "title", "body", "createdat", "created_at", "updated_at", "category"],
  "fks": ["companyid→companies(id)", "company_id→companies(id)", "site_id→sites(id)"],
  "duplicates": ["companyid/company_id", "createdat/created_at"],
  "required_fixes": ["Remove duplicates"]
}
```

#### safety_alerts
```json
{
  "table": "safety_alerts",
  "columns": ["id", "companyid", "company_id", "site_id", "title", "body", "createdat", "created_at", "updated_at", "description", "severity", "expires_at"],
  "fks": ["companyid→companies(id)", "company_id→companies(id)", "site_id→sites(id)"],
  "duplicates": ["companyid/company_id", "createdat/created_at"],
  "required_fixes": ["Remove duplicates"]
}
```

#### certifications
```json
{
  "table": "certifications",
  "columns": ["id", "profileid", "profile_id", "userid", "user_id", "type", "issuedat", "issued_at", "expiresat", "expires_at", "updated_at", "attachment_url", "attachment_type"],
  "fks": ["userid→users(id)", "user_id→users(id)"],
  "duplicates": ["profileid/profile_id", "userid/user_id", "issuedat/issued_at", "expiresat/expires_at"],
  "required_fixes": ["Remove duplicates; profileId FK missing to profiles - consider adding or using user_id only"]
}
```

#### training
```json
{
  "table": "training",
  "columns": ["id", "profileid", "profile_id", "userid", "user_id", "type", "completedat", "completed_at", "updated_at", "attachment_type", "attachment_url"],
  "fks": ["userid→users(id)", "user_id→users(id)"],
  "duplicates": ["profileid/profile_id", "userid/user_id", "completedat/completed_at"],
  "required_fixes": ["Remove duplicates"]
}
```

#### user_profile_data
```json
{
  "table": "user_profile_data",
  "columns": ["id", "userid", "user_id", "address", "town", "postcode", "dateofbirth", "date_of_birth", "jobtitle", "job_title", "emergencycontactname", "emergency_contact_name", "emergencycontactphone", "emergency_contact_phone", "nationalinsurance", "national_insurance", "utr", "updated_at"],
  "fks": ["userid→users(id)", "user_id→users(id)"],
  "duplicates": ["userid/user_id", "dateofbirth/date_of_birth", "jobtitle/job_title", "emergencycontactname/emergency_contact_name", "emergencycontactphone/emergency_contact_phone", "nationalinsurance/national_insurance"],
  "required_fixes": ["Remove duplicates"]
}
```

#### assigned_operatives
```json
{
  "table": "assigned_operatives",
  "columns": ["id", "siteid", "site_id", "userid", "user_id", "assignedat", "assigned_at", "updated_at"],
  "fks": ["siteid→sites(id)", "site_id→sites(id)", "userid→users(id)", "user_id→users(id)"],
  "duplicates": ["siteid/site_id", "userid/user_id", "assignedat/assigned_at"],
  "required_fixes": [
    "Remove duplicates",
    "Firebase: sites/{siteId}/assignedOperatives/{operativeId} - doc ID is operativeId; need to generate uuid for id"
  ]
}
```

#### site_subcontractors
```json
{
  "table": "site_subcontractors",
  "columns": ["site_id", "company_id"],
  "fks": ["site_id→sites(id)", "company_id→companies(id)"],
  "duplicates": [],
  "required_fixes": [
    "Firebase: sites/{siteId}/subcontractors/{companyId} - composite doc; map linkedAt → optional created_at if added"
  ]
}
```

#### settings
```json
{
  "table": "settings",
  "columns": ["id", "companyid", "company_id", "config", "updated_at"],
  "fks": ["companyid→companies(id)", "company_id→companies(id)"],
  "duplicates": ["companyid/company_id"],
  "required_fixes": ["Remove duplicates"]
}
```

---

### 1.3 Inconsistent Naming Patterns

| Pattern | Examples |
|---------|----------|
| PascalCase (legacy) | `companyId`, `siteId`, `userId`, `createdAt`, `assignedAt`, `profileId`, `issuedAt`, `expiresAt`, `completedAt`, `ramsVersion`, `mainContractorId`, `assignedUsers`, `fileUrl`, `proofPhotos` |
| snake_case (normalized) | `company_id`, `site_id`, `user_id`, `created_at`, `assigned_at`, etc. |
| Mixed | Some tables have both (`companyid` vs `company_id`) |

---

### 1.4 Missing Constraints / Indexes

- **certifications.profileId** – No FK to profiles table (profiles may be virtual/user-based)
- **notices_read** – `notice_id` nullable; consider NOT NULL if always required
- **briefing_acknowledgements** – Unique (user_id, briefing_id) exists; ensure FK to briefings
- **audit_logs.user_id** – `text` type; may need uuid if linking to users
- **Indexes:** Most company/site-scoped tables have `companyId`/`company_id` indexes; post-cleanup ensure indexes use the canonical column names

---

## 2. FIREBASE COLLECTIONS → SUPABASE TABLES MAPPING

| Firebase Collection / Path | Supabase Table | Notes |
|----------------------------|----------------|-------|
| `companies` | `companies` | Direct |
| `users` | `users` | Map firebase_uid; companyId → company_id |
| `sites` | `sites` | assignedUsers → assigned_users JSONB |
| `attendance` | `attendance` | Direct structure |
| `tasks` | `tasks` | Direct |
| `notices` | `notices` | Direct |
| `deliveries` | `deliveries` | proofPhotos → proof_photos JSONB |
| `rams` | `rams` | fileUrl → file_url |
| `briefings` | `briefings` | Company-level in Firebase; Supabase has site_id |
| `users/{uid}/briefingAcknowledgements/{briefingId}` | `briefing_acknowledgements` | Subcollection → table |
| `coshh` | `coshh` | Direct |
| `siteRules/{companyId}` (doc with rules array) | `site_rules` | **Transform:** Each rule in array → one row |
| `safetyAlerts` | `safety_alerts` | Direct |
| `profiles/{profileId}/certifications/{docId}` | `certifications` | profileId + userId |
| `profiles/{profileId}/training/{docId}` | `training` | Same |
| `users/{uid}/certifications/{docId}` (fallback) | `certifications` | Same table |
| `users/{uid}/profile/data` | `user_profile_data` | Or pre_induction_personal overlap |
| `sites/{siteId}/assignedOperatives/{operativeId}` | `assigned_operatives` | Doc ID = operativeId; need generated id |
| `sites/{siteId}/subcontractors/{companyId}` | `site_subcontractors` | Composite PK (site_id, company_id) |
| `settings/global`, `settings/{companyId}` | `settings` | One doc per scope |
| `users/{uid}/preInductionProfile/personal` | `pre_induction_personal` | |
| `users/{uid}/preInductionProfile/rightToWork` | `pre_induction_right_to_work` | |
| `users/{uid}/preInductionProfile/certifications` | `pre_induction_certifications` | Array → JSONB |
| `users/{uid}/preInductionProfile/medical` | `pre_induction_medical` | |
| `users/{uid}/preInductionProfile/training` | `pre_induction_training` | |
| `users/{uid}/preInductionProfile/declarations` | `pre_induction_declarations` | |
| Notices read (if exists) | `notices_read` | user_uid, notice_id, read_at |
| Documents (uploads) | `medical_records`, `upload_logs` | Depends on Firebase structure |
| `users/{uid}/siteInductions/{siteId}` | `user_site_inductions` | status, completed_at |

---

## 3. PRESERVE EXISTING SUPABASE DATA

### Strategy

1. **Never DELETE** existing Supabase rows.
2. **INSERT only when missing:** Use `ON CONFLICT (id) DO NOTHING` or `WHERE NOT EXISTS` for companies, users, sites.
3. **ID preservation:** Use Firebase document IDs as Supabase UUIDs where applicable; do not overwrite.
4. **Company/user matching:** Match by `id` (UUID) first; if Firebase uses different IDs, create mapping table.
5. **Test data:** Identify test companies/users (e.g. by name or flag) and exclude from overwrite logic.

### Safe Merge Rules

- **companies:** `INSERT ... ON CONFLICT (id) DO NOTHING`
- **users:** `INSERT ... ON CONFLICT (id) DO NOTHING`; if Firebase UID ≠ Supabase id, use `firebase_uid` for lookup
- **sites:** `INSERT ... ON CONFLICT (id) DO NOTHING`
- **Child tables (attendance, tasks, etc.):** Insert Firebase rows where `id` not in Supabase; skip conflicts

---

## 4. FIREBASE → SUPABASE FIELD MAPPING TABLE

### users
```json
{
  "firebase_collection": "users",
  "supabase_table": "users",
  "firebase_fields": ["id", "email", "companyId", "role", "profileId", "status", "createdAt", "disabled", "approved", "superuser"],
  "supabase_columns": ["id", "email", "company_id", "role", "profile_id", "status", "created_at", "disabled", "approved", "superuser", "firebase_uid"],
  "mapping": {
    "id": "id",
    "email": "email",
    "companyId": "company_id",
    "role": "role",
    "profileId": "profile_id",
    "status": "status",
    "createdAt": "created_at",
    "disabled": "disabled",
    "approved": "approved",
    "superuser": "superuser"
  },
  "notes": [
    "firebase_uid: store Firebase Auth UID if different from doc id",
    "Use company_id (or companyid) - pick one after schema cleanup",
    "Merge duplicate columns before migration"
  ]
}
```

### companies
```json
{
  "firebase_collection": "companies",
  "supabase_table": "companies",
  "firebase_fields": ["id", "name", "createdAt"],
  "supabase_columns": ["id", "name", "created_at"],
  "mapping": {
    "id": "id",
    "name": "name",
    "createdAt": "created_at"
  },
  "notes": [
    "Convert Firestore Timestamp to timestamptz",
    "Use created_at (drop createdat if duplicate)"
  ]
}
```

### sites
```json
{
  "firebase_collection": "sites",
  "supabase_table": "sites",
  "firebase_fields": ["id", "companyId", "name", "createdAt", "assignedUsers", "ramsVersion", "mainContractorId", "location", "geofence"],
  "supabase_columns": ["id", "company_id", "name", "created_at", "assigned_users", "rams_version", "main_contractor_id", "location", "geofence", "latitude", "longitude", "radius_meters"],
  "mapping": {
    "id": "id",
    "companyId": "company_id",
    "name": "name",
    "createdAt": "created_at",
    "assignedUsers": "assigned_users",
    "ramsVersion": "rams_version",
    "mainContractorId": "main_contractor_id",
    "location": "location",
    "geofence": "geofence"
  },
  "notes": [
    "assignedUsers: array of UUIDs → JSONB",
    "location/geofence: object → JSONB",
    "Extract latitude, longitude, radius_meters from geofence if present"
  ]
}
```

### attendance
```json
{
  "firebase_collection": "attendance",
  "supabase_table": "attendance",
  "firebase_fields": ["id", "userId", "siteId", "companyId", "action", "timestamp", "latitude", "longitude", "accuracy", "email"],
  "supabase_columns": ["id", "user_id", "site_id", "company_id", "action", "timestamp", "latitude", "longitude", "accuracy", "email"],
  "mapping": {
    "id": "id",
    "userId": "user_id",
    "siteId": "site_id",
    "companyId": "company_id",
    "action": "action",
    "timestamp": "timestamp",
    "latitude": "latitude",
    "longitude": "longitude",
    "accuracy": "accuracy",
    "email": "email"
  },
  "notes": [
    "Normalize action: IN/OUT vs sign_in/sign_out - pick one convention",
    "Convert Firestore Timestamp to timestamptz"
  ]
}
```

### rams
```json
{
  "firebase_collection": "rams",
  "supabase_table": "rams",
  "firebase_fields": ["id", "siteId", "companyId", "type", "fileUrl", "version", "createdAt"],
  "supabase_columns": ["id", "site_id", "company_id", "type", "file_url", "version", "created_at"],
  "mapping": {
    "id": "id",
    "siteId": "site_id",
    "companyId": "company_id",
    "type": "type",
    "fileUrl": "file_url",
    "version": "version",
    "createdAt": "created_at"
  },
  "notes": ["Convert Timestamp; use file_url (drop fileurl)"]
}
```

### briefings
```json
{
  "firebase_collection": "briefings",
  "supabase_table": "briefings",
  "firebase_fields": ["id", "companyId", "title", "body", "createdAt"],
  "supabase_columns": ["id", "company_id", "title", "body", "created_at", "site_id"],
  "mapping": {
    "id": "id",
    "companyId": "company_id",
    "title": "title",
    "body": "body",
    "createdAt": "created_at"
  },
  "notes": [
    "Firebase briefings may be company-level only; site_id nullable",
    "Add file_url, uploaded_by if present in Firebase"
  ]
}
```

### site_rules (TRANSFORM REQUIRED)
```json
{
  "firebase_collection": "siteRules",
  "firebase_structure": "siteRules/{companyId} = single doc with rules[] array",
  "supabase_table": "site_rules",
  "firebase_fields": ["rules[]"],
  "supabase_columns": ["id", "company_id", "site_id", "title", "body", "category", "created_at"],
  "mapping": {
    "companyId (from doc id)": "company_id",
    "rules[].title": "title",
    "rules[].body": "body",
    "rules[].category": "category"
  },
  "notes": [
    "Each rule in rules array → one row; generate uuid for id",
    "site_id may be null (company-level rules)",
    "created_at: use doc updatedAt or now()"
  ]
}
```

### coshh
```json
{
  "firebase_collection": "coshh",
  "supabase_table": "coshh",
  "mapping": {
    "id": "id",
    "companyId": "company_id",
    "title": "title",
    "body": "body",
    "createdAt": "created_at"
  },
  "notes": ["Add substance, hazard_symbols, ppe, file_url if in Firebase"]
}
```

### safety_alerts
```json
{
  "firebase_collection": "safetyAlerts",
  "supabase_table": "safety_alerts",
  "mapping": {
    "id": "id",
    "companyId": "company_id",
    "title": "title",
    "body": "body",
    "createdAt": "created_at"
  },
  "notes": ["Add description, severity, expires_at, site_id if present"]
}
```

### pre_induction_* (users/{uid}/preInductionProfile/{sectionId})
```json
{
  "firebase_path": "users/{uid}/preInductionProfile/personal",
  "supabase_table": "pre_induction_personal",
  "mapping": {
    "userId (from path)": "user_id",
    "fullName": "full_name",
    "dateOfBirth": "date_of_birth",
    "nationalInsuranceNumber": "national_insurance",
    "phone": "phone",
    "email": "email",
    "address": "address",
    "emergencyContactName": "emergency_contact_name",
    "emergencyContactRelationship": "emergency_contact_relationship",
    "emergencyContactPhone": "emergency_contact_phone",
    "utrNumber": "utr",
    "updatedAt": "updated_at"
  }
}
```

```json
{
  "firebase_path": "users/{uid}/preInductionProfile/rightToWork",
  "supabase_table": "pre_induction_right_to_work",
  "mapping": {
    "userId": "user_id",
    "passportUrl": "passport_url",
    "passportExpiry": "passport_expiry",
    "visaUrl": "visa_url",
    "visaExpiry": "visa_expiry",
    "shareCode": "share_code",
    "proofOfAddressUrl": "proof_of_address_url",
    "rightToWorkVerified": "right_to_work_verified",
    "updatedAt": "updated_at"
  }
}
```

```json
{
  "firebase_path": "users/{uid}/preInductionProfile/certifications",
  "supabase_table": "pre_induction_certifications",
  "mapping": {
    "userId": "user_id",
    "certifications (array)": "certifications (JSONB)",
    "updatedAt": "updated_at"
  }
}
```

```json
{
  "firebase_path": "users/{uid}/preInductionProfile/medical",
  "supabase_table": "pre_induction_medical",
  "mapping": {
    "userId": "user_id",
    "medicalDeclaration": "medical_declaration",
    "fitToWork": "fit_to_work",
    "allergies": "allergies",
    "medication": "medication",
    "medicalCertificateUrl": "medical_certificate_url",
    "medicalVerified": "medical_verified",
    "updatedAt": "updated_at"
  }
}
```

```json
{
  "firebase_path": "users/{uid}/preInductionProfile/training",
  "supabase_table": "pre_induction_training",
  "mapping": {
    "userId": "user_id",
    "ramsAccepted": "rams_accepted",
    "ramsAcceptedAt": "rams_accepted_at",
    "ramsVersion": "rams_version",
    "trainingRecords": "training_records (JSONB)",
    "updatedAt": "updated_at"
  }
}
```

```json
{
  "firebase_path": "users/{uid}/preInductionProfile/declarations",
  "supabase_table": "pre_induction_declarations",
  "mapping": {
    "userId": "user_id",
    "operativeDeclarationAccepted": "operative_declaration_accepted",
    "operativeDeclarationAcceptedAt": "operative_declaration_accepted_at",
    "updatedAt": "updated_at"
  }
}
```

### assigned_operatives
```json
{
  "firebase_path": "sites/{siteId}/assignedOperatives/{operativeId}",
  "supabase_table": "assigned_operatives",
  "mapping": {
    "siteId (from path)": "site_id",
    "operativeId (from path)": "user_id",
    "assignedAt": "assigned_at"
  },
  "notes": [
    "Generate new uuid for id (Supabase requires id PK)",
    "Doc may have companyId, operativeId, status - map as needed"
  ]
}
```

### site_subcontractors
```json
{
  "firebase_path": "sites/{siteId}/subcontractors/{companyId}",
  "supabase_table": "site_subcontractors",
  "mapping": {
    "siteId (from path)": "site_id",
    "companyId (from path)": "company_id",
    "linkedAt": "optional created_at if column added"
  },
  "notes": ["Composite PK (site_id, company_id); no separate id"]
}
```

### briefing_acknowledgements
```json
{
  "firebase_path": "users/{uid}/briefingAcknowledgements/{briefingId}",
  "supabase_table": "briefing_acknowledgements",
  "mapping": {
    "userId (from path)": "user_id",
    "briefingId (from path)": "briefing_id",
    "acknowledgedAt or createdAt": "acknowledged_at",
    "signatureUrl": "signature_url"
  },
  "notes": ["Generate uuid for id"]
}
```

### notices_read
```json
{
  "firebase_collection_or_path": "notices_read or users/{uid}/noticesRead/{noticeId}",
  "supabase_table": "notices_read",
  "mapping": {
    "userUid": "user_uid",
    "noticeId": "notice_id",
    "readAt": "read_at"
  },
  "notes": [
    "Check Firebase for actual structure",
    "Generate uuid for id"
  ]
}
```

### certifications & training (profiles subcollection)
```json
{
  "firebase_path": "profiles/{profileId}/certifications/{docId}",
  "supabase_table": "certifications",
  "mapping": {
    "docId": "id",
    "profileId": "profile_id",
    "userId": "user_id",
    "type": "type",
    "issuedAt/issueDate": "issued_at",
    "expiresAt/expiryDate": "expires_at",
    "attachmentUrl": "attachment_url",
    "attachmentType": "attachment_type"
  },
  "notes": [
    "Also check users/{uid}/certifications fallback path",
    "profiles collection may need userId lookup"
  ]
}
```

### documents (medical, uploads)
```json
{
  "firebase_path": "various (user medical uploads, storage references)",
  "supabase_tables": ["medical_records", "upload_logs"],
  "notes": [
    "Medical: users/{uid}/medical or storage refs → medical_records",
    "Upload audit → upload_logs (path, user_id, extra JSONB)"
  ]
}
```

### user_site_inductions
```json
{
  "firebase_path": "users/{userId}/siteInductions/{siteId}",
  "supabase_table": "user_site_inductions",
  "mapping": {
    "userId": "user_id",
    "siteId": "site_id",
    "status": "status",
    "completedAt": "completed_at",
    "grandfathered": "grandfathered (if added)"
  },
  "notes": ["Composite PK (user_id, site_id)"]
}
```

---

## 5. REQUIRED SCHEMA FIXES (DO NOT APPLY YET)

### 5.1 Duplicate Columns to Remove (keep snake_case)

| Table | Remove | Keep |
|-------|-------|------|
| companies | createdat | created_at |
| users | companyid, profileid, createdat | company_id, profile_id, created_at |
| sites | companyid, createdat, assignedusers, ramsversion, maincontractorid | company_id, created_at, assigned_users, rams_version, main_contractor_id |
| attendance | userid, siteid, companyid | user_id, site_id, company_id |
| tasks | siteid, companyid, assignedto, createdat | site_id, company_id, assigned_to, created_at |
| notices | siteid, companyid, createdat | site_id, company_id, created_at |
| deliveries | siteid, companyid, deliveredby, proofphotos, createdat | site_id, company_id, delivered_by, proof_photos, created_at |
| rams | siteid, companyid, fileurl, createdat | site_id, company_id, file_url, created_at |
| briefings | companyid, siteid, createdat | company_id, site_id, created_at |
| coshh | companyid, createdat | company_id, created_at |
| site_rules | companyid, createdat | company_id, created_at |
| safety_alerts | companyid, createdat | company_id, created_at |
| certifications | profileid, userid, issuedat, expiresat | profile_id, user_id, issued_at, expires_at |
| training | profileid, userid, completedat | profile_id, user_id, completed_at |
| user_profile_data | userid, dateofbirth, jobtitle, emergencycontactname, emergencycontactphone, nationalinsurance | user_id, date_of_birth, job_title, emergency_contact_name, emergency_contact_phone, national_insurance |
| assigned_operatives | siteid, userid, assignedat | site_id, user_id, assigned_at |
| settings | companyid | company_id |

### 5.2 Duplicate FKs to Remove

- Drop FKs on legacy columns when dropping those columns
- Example: `attendance_userid_fkey`, `attendance_siteid_fkey`, `attendance_companyid_fkey` → remove when columns removed

### 5.3 Columns to Rename for Consistency

- All PascalCase/camelCase → snake_case (handled by duplicates removal)

### 5.4 Missing Constraints

- `briefing_acknowledgements.briefing_id` → FK to briefings(id) **MISSING** (only user_id FK exists)
- `notices_read.notice_id` → NOT NULL if always required
- `certifications.profile_id` → Decide: add FK or remove if redundant with user_id

### 5.5 Missing Indexes

- Ensure indexes on canonical columns (company_id, site_id, user_id, created_at) after cleanup
- briefing_acknowledgements: index on (user_id, briefing_id)
- notices_read: index on (user_uid, notice_id)

### 5.6 Tables Requiring Cleanup Before Migration

1. **All tables with duplicate columns** – Must decide canonical column, backfill, then drop legacy
2. **site_subcontractors** – Verify composite PK and optional linked_at/created_at
3. **briefing_acknowledgements** – Ensure briefing_id FK exists

---

## 6. SAFE MIGRATION PLAN (DO NOT EXECUTE)

### Phase 1: Schema Cleanup (separate migration)

1. For each table with duplicates:
   - Backfill `snake_case` from `camelCase` where null
   - Drop legacy columns and their FKs
2. Add any missing FKs and indexes

### Phase 2: Data Migration (insert-only, no overwrite)

#### Companies
```sql
-- Pseudocode; use Firebase export → JSON
INSERT INTO companies (id, name, created_at, updated_at)
SELECT f.id::uuid, f.name, f.created_at, NOW()
FROM firebase_companies f
ON CONFLICT (id) DO NOTHING;
```

#### Users
```sql
INSERT INTO users (id, email, company_id, role, profile_id, status, created_at, disabled, approved, superuser, firebase_uid, updated_at)
SELECT f.id::uuid, f.email, f.company_id::uuid, f.role, f.profile_id, f.status,
       COALESCE(to_timestamp(f.created_at), NOW()), f.disabled, f.approved, f.superuser,
       f.id, NOW()
FROM firebase_users f
ON CONFLICT (id) DO NOTHING;
```

#### Sites
```sql
INSERT INTO sites (id, company_id, name, created_at, assigned_users, rams_version, main_contractor_id, updated_at)
SELECT f.id::uuid, f.company_id::uuid, f.name, COALESCE(to_timestamp(f.created_at), NOW()),
       f.assigned_users::jsonb, f.rams_version, f.main_contractor_id, NOW()
FROM firebase_sites f
ON CONFLICT (id) DO NOTHING;
```

#### Attendance
```sql
INSERT INTO attendance (id, user_id, site_id, company_id, action, timestamp, latitude, longitude, accuracy, email, updated_at)
SELECT f.id::uuid, f.user_id::uuid, f.site_id::uuid, f.company_id::uuid, f.action,
       to_timestamp(f.timestamp), f.latitude, f.longitude, f.accuracy, f.email, NOW()
FROM firebase_attendance f
WHERE NOT EXISTS (SELECT 1 FROM attendance a WHERE a.id = f.id::uuid);
```

#### RAMS, Briefings, COSHH, Safety Alerts, Notices, Deliveries, Tasks
- Same pattern: `INSERT ... WHERE NOT EXISTS` or `ON CONFLICT DO NOTHING` on `id`
- Convert Firestore Timestamps to `timestamptz`
- Map `companyId` → `company_id`, `siteId` → `site_id`, etc.

#### Site Rules (transform)
```sql
-- For each siteRules doc: expand rules[] into rows
INSERT INTO site_rules (id, company_id, site_id, title, body, category, created_at, updated_at)
SELECT gen_random_uuid(), doc.company_id::uuid, NULL, r->>'title', r->>'body', r->>'category', NOW(), NOW()
FROM firebase_site_rules_docs doc,
     jsonb_array_elements(doc.rules) AS r
WHERE NOT EXISTS (...);  -- Avoid duplicates by company_id + title hash or similar
```

#### Assigned Operatives
```sql
INSERT INTO assigned_operatives (id, site_id, user_id, assigned_at, updated_at)
SELECT gen_random_uuid(), site_id::uuid, operative_id::uuid, COALESCE(to_timestamp(linked_at), NOW()), NOW()
FROM firebase_assigned_operatives
WHERE NOT EXISTS (SELECT 1 FROM assigned_operatives ao WHERE ao.site_id = ... AND ao.user_id = ...);
```

#### Site Subcontractors
```sql
INSERT INTO site_subcontractors (site_id, company_id)
SELECT site_id::uuid, company_id::uuid
FROM firebase_site_subcontractors
ON CONFLICT (site_id, company_id) DO NOTHING;
```

#### Pre-induction tables
- Map each `preInductionProfile/{section}` doc to corresponding table
- Use `ON CONFLICT (user_id) DO UPDATE` only if intentional merge; otherwise `DO NOTHING` to preserve Supabase data

#### Briefing Acknowledgements
```sql
INSERT INTO briefing_acknowledgements (id, user_id, briefing_id, acknowledged_at, signature_url)
SELECT gen_random_uuid(), user_id::uuid, briefing_id::uuid, to_timestamp(ack_at), sig_url
FROM firebase_briefing_acks
WHERE NOT EXISTS (...);
```

#### Certifications & Training
- Flatten subcollection; ensure `user_id` and `profile_id` populated
- `INSERT ... ON CONFLICT (id) DO NOTHING`

### Conversions Required

| Firebase Type | Supabase |
|---------------|----------|
| Firestore Timestamp | `timestamptz` via `to_timestamp(seconds)` or ISO string |
| Firestore Reference | Resolve to UUID or store as string in mapping |
| Array | `jsonb` |
| Nested object | `jsonb` |
| Document ID (string) | `uuid` (validate format) |

### Preservation Guarantees

- No `DELETE` statements
- No `UPDATE` that overwrites existing Supabase rows (except explicit merge columns)
- `ON CONFLICT DO NOTHING` or `WHERE NOT EXISTS` for all inserts
- Test companies/users identified by name or metadata preserved

---

## 7. OUTPUT SUMMARY (JSON-LIKE)

```json
{
  "supabaseSchemaAnalysis": {
    "totalTables": 32,
    "tablesWithDuplicateColumns": 17,
    "tablesWithDuplicateFKs": 15,
    "inconsistentNaming": "camelCase vs snake_case across tables",
    "perTableSummary": "See Section 1.2"
  },
  "firebaseToSupabaseMapping": {
    "directMappings": ["companies", "users", "sites", "attendance", "tasks", "notices", "deliveries", "rams", "coshh", "safety_alerts"],
    "transformRequired": ["site_rules (rules array → rows)", "assigned_operatives (doc ID → generated id)"],
    "subcollectionMappings": ["briefing_acknowledgements", "pre_induction_*", "certifications", "training", "user_site_inductions", "site_subcontractors"]
  },
  "requiredSchemaFixes": {
    "duplicateColumnsToRemove": 45,
    "duplicateFKsToRemove": 30,
    "missingConstraints": 3,
    "tablesNeedingCleanup": 17
  },
  "migrationPlan": {
    "phase1": "Schema cleanup (drop duplicates, add constraints)",
    "phase2": "Firebase data export → staging tables or JSON",
    "phase3": "INSERT with ON CONFLICT DO NOTHING / WHERE NOT EXISTS",
    "phase4": "Validate counts, FKs, spot-checks"
  }
}
```

---

**END OF MIGRATION PLAN**
