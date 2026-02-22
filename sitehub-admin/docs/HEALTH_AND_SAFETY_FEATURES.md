# Health & Safety Features

## Implemented (Admin Dashboard)

### 1. Briefings (Toolbox Talks)
- **Admin**: Upload PDF briefings via Health & Safety → Briefings
- **API**: `GET /api/briefings`, `POST /api/briefings/upload`, `DELETE /api/briefings/[id]`
- **Operative acknowledgement**: `POST /api/briefings/accept` — body: `{ userId, briefingId, signatureUrl? }`
- **Worker app**: Call the accept API when an operative acknowledges a briefing (signature URL optional for sign pad)
- **Firestore**: `briefings` collection; `users/{uid}/briefingAcknowledgements/{briefingId}` for acknowledgements

### 2. Site Rules
- **Admin**: Add, edit, delete rules by category (PPE, Emergency Procedures, Conduct)
- **API**: `GET/POST/PATCH/DELETE /api/site-rules`
- **Firestore**: `siteRules/{companyId}` document with `rules` array
- **Worker app**: Fetch from `/api/site-rules` (or read `siteRules/{companyId}` if using Firestore direct)

### 3. COSHH Assessments
- **Admin**: Add assessments with title, substance, hazard symbols, PPE
- **API**: `GET /api/coshh`, `POST /api/coshh`, `DELETE /api/coshh/[id]`
- **Firestore**: `coshh` collection
- **Worker app**: Fetch and display for operatives

### 4. Safety Alerts
- **Admin**: Add alerts with title, description, severity (info, warning, critical)
- **API**: `GET/POST /api/safety-alerts`, `PATCH/DELETE /api/safety-alerts/[id]`
- **Firestore**: `safetyAlerts` collection
- **Worker app**: Fetch and display with severity badges

## Pending: Worker App Changes

### RAMS – Signature on First View
- **Requirement**: When an operative views a RAMS document for the first time, require a signature (sign pad/signature area) before they can proceed.
- **Location**: Worker app (Flutter) – sitehub_worker_Ready
- **Suggested approach**:
  1. Track first-view per operative per RAMS (e.g. `users/{uid}/ramsViews/{ramsId}` or similar)
  2. On first view, show the RAMS PDF and a signature pad before allowing “Accept” or “Continue”
  3. Store signature image URL in the acceptance record
  4. Reuse the existing `POST /api/rams/accept` or extend it to accept `signatureUrl`

### Briefings – Operative Acknowledgement Button
- **Requirement**: Operative must be able to acknowledge toolbox talks in the app.
- **API**: `POST /api/briefings/accept` with `{ userId, briefingId, signatureUrl? }`
- **Worker app**: Add a screen to list briefings (from company), view PDF, and an “Acknowledge” button that calls the accept API.

## Firestore Indexes
Run `firebase deploy --only firestore:indexes` to deploy new indexes for:
- `briefings` (companyId, createdAt)
- `coshh` (companyId, createdAt)
- `safetyAlerts` (companyId, createdAt)
