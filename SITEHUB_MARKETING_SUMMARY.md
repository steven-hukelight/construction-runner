# SiteHub – Product Summary & Marketing Copy Pack

**Product name:** SiteHub (name may change)  
**Industry:** UK Construction  
**Last updated:** February 2025

---

## 1. Structured Feature Summary

### Core Value Proposition

SiteHub is a modern, cloud-based platform that replaces spreadsheets, WhatsApp groups, and legacy portals for UK construction companies. It combines **compliance**, **safety**, and **site operations** in one system—with geo-verified attendance, pre-induction profiles, document management, and mobile-first workflows built for operatives and supervisors.

---

### Primary User Types

| Role | Description | Key Capabilities |
|------|-------------|------------------|
| **Operative** | Field worker on site | Geo check-in/out, view notices/tasks/RAMS, complete pre-induction, record deliveries with photos |
| **Supervisor** | Site/team lead | Approve operatives, upload RAMS, create tasks and notices, monitor live attendance |
| **Admin** | Company administrator | Manage users, sites, RAMS, tasks, notices, compliance; approve registrations; company settings |
| **Director** | Senior leadership | Oversight via admin dashboard, compliance and attendance reports |
| **Sub Admin** | Subcontractor company admin | Manage subcontractor operatives via site-specific invite codes |
| **Superuser** | Platform administrator | Cross-company view, system settings, global feature toggles, maintenance mode |

---

### Key Features (Grouped by Category)

#### Onboarding & Access Control
- Multi-company onboarding via unique 8-character invite codes
- Supervisor/Admin approval workflow (pending → approved)
- First company admin auto-approved; subsequent users require approval
- Subcontractor invite system linking subcontractors to specific sites
- Registration and approval managed in admin dashboard

#### Pre-Induction Profiles
- **Personal:** Name, DOB, NI number, contact details, emergency contacts, trade, job role, UTR, payroll number
- **Right-to-Work:** Passport/visa uploads and expiry, share code, proof of address, admin verification
- **Certifications:** CSCS, CPCS, IPAF, PASMA, First Aid, others—with card numbers, file URLs, expiry dates, verification status
- **Medical:** Fit-to-work status, allergies, medication, medical certificate upload
- **Training:** Training records with expiry tracking
- **Declarations:** Legal and compliance declarations
- Status tracking: not started → in progress → complete
- Admin override option for special cases

#### Attendance & Geo-Verification
- Live attendance logs with geo-verified check-in/check-out
- Geofence validation (radius or custom polygon per site)
- GPS accuracy recorded with each entry
- Actions: sign-in, sign-out (IN/OUT)
- Real-time location streaming and offline support on mobile
- Admin view filtered by site, user, and date

#### Site Management
- Site creation with name, address, lat/lng
- Geofence configuration: radius-based or custom polygon
- Interactive map (Leaflet web, Google Maps mobile) for site creation and boundary editing
- `inductionRequired` flag per site
- Main contractor and subcontractor linking
- `showOnMap` flag for map visibility

#### RAMS Documents (Risk Assessment Method Statements)
- PDF upload per site
- Version tracking
- Storage in secure cloud (Supabase Storage)
- Company-scoped access
- Operative acknowledgement as part of site induction checklist

#### Task Management
- Site-scoped tasks
- Assignment to users (single or multi-user)
- Status workflow: Open → In progress → Done
- Admin table with CSV/PDF export

#### Notices
- Site-scoped announcements (title, body, attachments)
- Read receipts via `notices_read` table
- Company-scoped visibility
- Mobile and admin access

#### Deliveries
- Site-scoped delivery records
- Proof of delivery: photos (`load_photos`), PDFs (`pod_url`, `load_url`)
- `deliveredBy` user tracking
- Historical records with timestamps
- Company-scoped visibility

#### Operative Profiles & Compliance
- Profile data: address, DOB, job title, emergency contacts, NI, UTR
- Certifications and training with expiry dates
- Compliance score (0–100) per operative
- Admin verification for documents

#### Admin Settings & Branding
- Company: logo upload, company name, invite code regeneration
- Global (superuser): brand name, primary colour, feature toggles, system announcements, maintenance mode
- Security: session timeout, password policies

---

### Operational Workflows

#### 1. Onboarding
1. User registers with company invite code or creates new company
2. Registration record created (status: PENDING or COMPANY_ADMIN_PENDING)
3. Admin/Superuser reviews in approvals dashboard
4. Admin approves → creates auth user + user record, sets custom claims
5. User completes password setup → can log in

#### 2. Pre-Induction → Site Access
1. Operative completes Pre-Induction Profile sections (personal, right-to-work, certifications, medical, training, declarations)
2. Admin verifies documents
3. Status updates to "complete" (or admin override applied)
4. Operative attempts site check-in
5. System checks Pre-Induction status and site induction requirements
6. If site has `inductionRequired`: operative completes induction checklist (reads safety info, acknowledges RAMS, confirms site rules)
7. Record saved in `user_site_inductions`
8. Geo check-in allowed within site geofence

#### 3. Daily Operations
- **Operative:** Check-in/out, view notices/tasks/RAMS, complete tasks, record deliveries with photos
- **Supervisor:** Monitor live attendance, upload RAMS, create tasks/notices, view compliance
- **Admin:** Manage users/sites/docs, approve registrations, run compliance exports, configure company

---

### Compliance & Safety Benefits

- **Right-to-Work:** Documented and verified with expiry tracking  
- **CSCS and certifications:** Centralised expiry alerts and verification  
- **Medical and fit-to-work:** Declarations and certificates in one place  
- **RAMS:** Versioned, acknowledged, and accessible on mobile  
- **Geo-verified attendance:** Proof of who was on site and when  
- **Audit trail:** Timestamped actions for attendance, inductions, and document acknowledgements  

---

### Technical Strengths

- **Supabase (PostgreSQL):** Cloud-native database with Row Level Security
- **Multi-tenant architecture:** Company-scoped data isolation via `companyId`, RLS, and API filtering
- **Mobile-first design:** Flutter app for iOS/Android (geo, maps, offline support)
- **Web admin:** Next.js 16, App Router, TypeScript
- **Auth:** NextAuth (web), Supabase Auth (mobile), custom claims for roles and company
- **Maps:** Leaflet (web), Google Maps (mobile)
- **Storage:** Secure cloud storage for RAMS, certifications, medical records

---

### Why SiteHub Beats Alternatives

| Alternative | Limitations | SiteHub Advantage |
|-------------|-------------|-------------------|
| **Spreadsheets** | No geo-check-in, no versioned docs, easy to break, shared links and permissions | Geo-verified attendance, structured RAMS, task/notice management, role-based access |
| **WhatsApp** | No audit trail, no version control, informal, GDPR risk | Formal record of attendance, notices, and documents; compliant storage |
| **Outdated portals** | Poor mobile UX, legacy tech, hard to maintain | Modern mobile app, cloud-native stack, Linear-style admin UI |

---

## 2. Marketing Copy Pack

### Elevator Pitch (30 seconds)

> SiteHub is the modern site management platform for UK construction. Replace spreadsheets and WhatsApp with geo-verified attendance, compliant pre-induction profiles, and versioned RAMS—all in one system. Operatives check in from their phones; supervisors and admins manage compliance and operations from the web. Built for safety and simplicity.

---

### Hero Statement

> **The construction site platform that puts workers first.**  
> Geo-verified check-ins. Compliant pre-induction. RAMS at their fingertips. One platform for your whole team.

---

### Problem Statement

UK construction still runs on spreadsheets, WhatsApp groups, and legacy portals. Attendance is hard to verify. Right-to-work and certifications are scattered. RAMS live in email. Operatives miss critical notices. There’s no single source of truth for who was on site, when, and what they’ve read or acknowledged.

---

### Solution Statement

SiteHub centralises site operations, compliance, and communication in one platform. Operatives complete pre-induction profiles, check in with geo-verification, and access RAMS and notices on their phones. Supervisors approve workers, upload documents, and monitor live attendance. Admins keep everyone compliant and informed—without spreadsheets or informal channels.

---

### Value Pillars

1. **Worker-first experience** – Mobile app for check-ins, notices, tasks, and RAMS. No paper, no clunky portals.

2. **Geo-verified attendance** – Prove who was on site and when. Geofence checks prevent false check-ins.

3. **Compliance built in** – Pre-induction profiles (right-to-work, certifications, medical) with admin verification and expiry tracking.

4. **RAMS under control** – Versioned uploads, operative acknowledgement, and access from any device.

5. **Multi-company, multi-site** – Invite codes, subcontractor linking, and company-scoped data for growing teams.

---

### Benefits List

- Geo-verified attendance with live logs  
- Pre-induce operatives before site access  
- Right-to-work, certifications, and medical in one place  
- RAMS upload, versioning, and operative acknowledgement  
- Tasks with statuses and assignments  
- Notices with read receipts  
- Deliveries with photo and PDF proof  
- Operative profiles and compliance tracking  
- Multi-company onboarding with invite codes and approval  
- Subcontractor invites linked to sites  
- Company branding and custom settings  
- Mobile app for operatives; web admin for supervisors and admins  

---

### Who It’s For

- **Main contractors** managing multiple sites and subcontractors  
- **Subcontractors** needing compliant onboarding and site access  
- **Site supervisors** who need live attendance and clear communications  
- **Operatives** who want simple check-in and access to notices and RAMS  
- **Health & safety and HR teams** focused on right-to-work, certifications, and audits  

---

### Final CTA Message

> **Ready to replace spreadsheets and WhatsApp with one platform?**  
> SiteHub gives your team geo-verified attendance, compliant pre-induction, and RAMS at their fingertips. Get in touch to see how it works.

---

## 3. Tagline Options (5–10)

1. **Site management for the way you actually work.**  
2. **Compliance and site ops, one platform.**  
3. **From spreadsheets to SiteHub.**  
4. **Check in. Stay compliant. Get the job done.**  
5. **Where construction sites get organised.**  
6. **Built for operatives. Designed for compliance.**  
7. **Geo-verified. Compliant. Connected.**  
8. **The construction platform that works as hard as your team.**  
9. **Your site. Your team. One platform.**  
10. **Construction sites, simplified.**

---

*This summary reflects the product as implemented in the codebase. No features have been invented.*
