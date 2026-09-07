# "My Info" Reflow — Plan (Deferred Release)

**Status:** In progress on `feature/my-info-reflow` branch (both repos). Ships in the release *after* 1.0.1+14. **Do not merge into `main` until the current 1.0.1+14 Play Store rollout has been signed off.**
**Created:** 2026-09-07
**Trigger:** Post-1.0.1+13 realisation that pre-induction hides went too far — medical history and emergency contact information are operationally important and should return in a lighter, renamed form.

---

## Why we're doing this

We hid the "Pre-Induction" module in 1.0.1+13 because the compliance-flow branding was heavy-handed and the "you must complete this before signing in" gate was creating too much friction. That release ships the feature flag `preInductionUiEnabled=false` on both mobile (`sitehub_worker_Ready/lib/config.dart`) and web (`sitehub-admin/lib/featureFlags.ts`).

After hiding it, we realised the module holds genuinely important operational data:

- **Medical history / fit-to-work** — critical in an on-site incident.
- **Emergency contact** — who to call if someone is hurt.

Those two must come back. The reflow rebrands the whole thing as **"My Info"**, drops the attendance gate, and trims the sections list.

---

## Scope

| Decision area | Choice |
|---|---|
| **New name** | `My Info` (drop "Pre-Induction" branding entirely) |
| **Location on mobile** | Profile → "My Info" tile |
| **Location on web** | Per-user detail page → "My Info" tab (read-only for admins) |
| **Attendance gate** | **Removed.** Sign-in is never blocked by profile completeness. |
| **Keep in UI** | Medical history / fit-to-work · Emergency contact · Competency card · Declarations |
| **Drop from UI** | Personal (DOB/address/NI) · Right-to-work / passport · Certifications & training |
| **Backend** | Almost unchanged. Every table, RLS policy, and existing endpoint stays intact. One targeted schema consolidation: **emergency contact lives on `user_profile_data`** going forward (currently duplicated in `pre_induction_personal`). Data-only backfill migration; the `pre_induction_personal` columns stay in the schema but stop being written. |
| **Feature flag** | Remove `preInductionUiEnabled` from both codebases in this release. |
| **Admin edit** | Admins **can edit everything** in a worker's My Info (medical, emergency contact, competency, declarations) on the worker's behalf. Necessary for supervisor-driven onboarding when the worker can't fill the form themselves (language, disability, etc). Audit log entry recorded when an admin saves on behalf of a worker. |
| **Medical visibility** | **Admins + supervisors** can view medical info on the web. Regular operatives can only see their own. RLS already enforces the `read own or admin/supervisor same company` shape — we validate but don't change it. |
| **Compliance dashboard** | The "Induction Compliance" page is deleted and replaced with a slim **`/dashboard/missing-info`** report listing workers with no emergency contact and/or no medical info. Filter by site + company. Export CSV. |
| **Nudge (this release)** | **None.** My Info is genuinely voluntary. No attendance gate, no banner, no push. Follow-up ticket to add a dismissable in-app banner in a later release once we've seen real usage. |
| **Emergency contact fields** | Name + phone only. `emergency_contact_relationship` column stays in the schema (currently on `pre_induction_personal`) but is not surfaced in the new UI. |

The dropped sections stay in the code (widgets and endpoints) but unlinked. If we ever need to resurface them (personal info for HR, RTW for compliance audit, etc.) it's an under-an-hour re-add.

---

## Concrete work

### Mobile (`sitehub_worker_Ready/`)

1. Rename `lib/screens/my_pre_induction_screen.dart` → `lib/screens/my_info_screen.dart`. Delete the "temporarily unavailable" placeholder and restore the real screen (trimmed to 4 sections).
2. New tile on `profile_screen.dart`: **"My Info"** (icon: `Icons.person_outline`) routes to `MyInfoScreen`.
3. Trim `MyInfoScreen` layout to only compose:
   - `pre_induction_section_medical.dart` (kept, renamed to `section_medical.dart`)
   - New `section_emergency_contact.dart`
   - `pre_induction_section_competency_card.dart` (kept, renamed to `section_competency_card.dart`)
   - `pre_induction_section_declarations.dart` (kept, renamed to `section_declarations.dart`)
4. Leave unused: `pre_induction_section_personal.dart`, `pre_induction_section_right_to_work.dart`, `pre_induction_section_certifications.dart`.
5. Remove pre-induction attendance gate + banner entirely from `geo_attendance_screen.dart` (currently behind the flag).
6. Delete `Config.preInductionUiEnabled`.
7. Version bump: `1.0.2+14` (patch) or `1.1.0+14` (minor — recommended, this is user-visible change).

### Web (`sitehub-admin/`)

**API layer** (new/refactored endpoints)

- **`GET /api/me/info`** — returns the current user's own My Info payload (medical, emergency contact, competency card, declarations). Replaces the various `GET /api/pre-induction/[userId]/*` fetches used by the mobile app.
- **`PUT /api/me/info`** — worker updates their own My Info. Validates each section server-side.
- **`GET /api/admin/users/[id]/info`** — admin/supervisor reads any worker's My Info in their company. Enforces the same RLS shape as today.
- **`PUT /api/admin/users/[id]/info`** — admin edits on behalf. Writes an audit log row (`system_logs`) noting `edited_by`, `edited_for`, `section_changed`.
- **`GET /api/admin/missing-info`** — returns paginated list of users in the caller's company whose emergency contact or medical info is missing. Supports `?siteId=…` filter and `?format=csv` for export.

The old `GET/PUT /api/pre-induction/[userId]/*` endpoints stay callable (they still work) but are marked deprecated in code comments — the mobile app stops calling them once released. Deletion is a later cleanup ticket.

**UI layer**

1. Remove **all** "Induction Compliance" top-level navigation entries permanently — from both `Sidebar.tsx` and `SuperuserSidebar.tsx`.
2. Add a new **"My Info"** tab on `app/dashboard/users/[userId]/page.tsx`. Admin can view and **edit** every section on the worker's behalf. Layout mirrors the mobile 4-section grouping.
3. New `/dashboard/missing-info` page: table of workers with missing emergency contact or medical info. Company filter, site filter, CSV export. Sidebar entry replaces "Induction Compliance".
4. Fix the three leftover pre-induction leaks identified 2026-09-07:
   - `app/dashboard/supervisor-dashboard/induction/components/QuickInductionTable.tsx` — badge labels "Pre-Induction Required" / "Pre-Induction Override".
   - `app/legal/privacy-policy/page.tsx` (lines ~63, ~90).
   - `app/(legal)/legal/privacy-and-security/page.tsx` (lines ~67, ~96, ~138).
5. Delete `lib/featureFlags.ts` (or at minimum the `preInductionUiEnabled` export) and every reference to it.
6. Delete/redirect the following routes:
   - `/dashboard/induction-compliance` → gone.
   - `/dashboard/users/[userId]/pre-induction` → redirect to `/dashboard/users/[userId]?tab=my-info`.
   - `/dashboard/users/[userId]/certs-training` → redirect to user detail.
   - `/dashboard/subcontractor` → keep the redirect (subcontractor onboarding is a separate future decision).

### Copy & policy

- **Privacy pages:** replace "Pre-Induction Profile" with "personal safety info stored in My Info". Retention wording stays ("3 years after last activity").
- **Landing / meta:** the 2026-09-07 pass already replaced "pre-induction compliance" with "induction compliance"; do a second pass to remove the word "pre-induction" entirely.
- **Marketing screenshots** in `sitehub_worker_Ready/test/goldens/play_store_*.png` — no pre-induction shown, so no update needed.

### Data & migrations

**One targeted migration** to consolidate emergency contact onto `user_profile_data`:

1. Add `emergency_contact_name` and `emergency_contact_phone` to `user_profile_data` if not already present (they already exist per current schema — verify).
2. Backfill: for every user, copy `pre_induction_personal.emergency_contact_name` / `.emergency_contact_phone` into `user_profile_data` where the target columns are `NULL`. Do **not** overwrite non-null `user_profile_data` values.
3. Going forward, every read/write of emergency contact hits `user_profile_data` only. `pre_induction_personal` columns become read-only legacy fields.
4. **Do not drop** `pre_induction_personal.emergency_contact_*` in this release — belt-and-braces for rollback. Drop in a later cleanup ticket after 2 weeks in production.

**No other table changes**, no column renames, no destructive migrations. All other pre-induction tables (`pre_induction_medical`, `pre_induction_competency_card`, etc.) keep their schema untouched.

**Optional (post-release, not this ticket):** decide whether to rename database tables/columns from `pre_induction_*` to `worker_info_*`. Costs a migration + full code sweep + RLS policy move. Not worth it for the reflow release itself.

---

## Rollout

1. Build 1.1.0+14 (mobile) + web deploy in a single coordinated release.
2. **No** migration to run — safe to roll back the app if issues appear.
3. Communications: in-app announcement or push, one line: "We've simplified your profile. Update your emergency contact and medical info under Profile → My Info."

---

## Estimated size

~1 focused day of dev, split roughly 60% mobile / 40% web. Zero DB changes. Zero downtime.

---

## Reference: files touched in 1.0.1+13's hide pass

**Mobile flag added:** `sitehub_worker_Ready/lib/config.dart`
**Web flag added:** `sitehub-admin/lib/featureFlags.ts`

**Mobile UI hides:**
- `lib/screens/profile_screen.dart`
- `lib/screens/geo_attendance_screen.dart`
- `lib/screens/my_pre_induction_screen.dart`
- `lib/screens/certifications_training_screen.dart`

**Web UI hides:**
- `app/dashboard/components/layout/Sidebar.tsx`
- `app/dashboard/components/layout/SuperuserSidebar.tsx`
- `app/dashboard/induction-compliance/page.tsx` (redirect)
- `app/dashboard/users/[userId]/page.tsx`
- `app/dashboard/users/[userId]/pre-induction/page.tsx` (redirect)
- `app/dashboard/users/[userId]/certs-training/page.tsx` (redirect)
- `app/dashboard/subcontractor/page.tsx` (redirect)
- `app/dashboard/profile/page.tsx`
- `app/dashboard/induction-compliance/components/SuperuserSelfOverrideSection.tsx`
- `app/dashboard/induction-compliance/components/SuperuserSelfOverrideBlock.tsx`
- `app/dashboard/supervisor-dashboard/components/SupervisorActions.tsx`
- `app/dashboard/supervisor-dashboard/components/SupervisorInductionStatusBadge.tsx`
- `app/dashboard/supervisor-dashboard/components/SupervisorOperativeCard.tsx`
- `app/dashboard/supervisor-dashboard/components/SupervisorOperativeDrawer.tsx`
- `app/dashboard/supervisor-dashboard/components/SupervisorCompliancePanel.tsx`
- `app/dashboard/sites/[id]/induction/components/SiteInductionTable.tsx`
- `app/LandingPage.tsx`
- `app/layout.tsx`

The reflow release should either delete or repurpose each of these.
