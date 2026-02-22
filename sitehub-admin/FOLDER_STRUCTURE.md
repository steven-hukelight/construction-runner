# sitehub-admin Folder Structure

Generated folder structure (excluding `node_modules`, `.next`, `.git`).

```
sitehub-admin/
├── .github/
│   └── workflows/
│       └── ci.yml
├── .vercel/
│   ├── README.txt
│   └── project.json
├── app/
│   ├── (legal)/
│   │   ├── layout.tsx
│   │   └── legal/
│   │       └── privacy-and-security/
│   │           └── page.tsx
│   ├── admin-setup/
│   │   └── page.tsx
│   ├── api/
│   │   ├── attendance/
│   │   │   └── route.ts
│   │   ├── auth/
│   │   │   ├── [...nextauth]/
│   │   │   │   └── route.ts
│   │   │   ├── admin-setup-complete/
│   │   │   │   └── route.ts
│   │   │   ├── final-approve-admin/
│   │   │   │   └── route.ts
│   │   │   ├── register/
│   │   │   │   └── route.ts
│   │   │   ├── registrations/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── reject/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── send-password-reset/
│   │   │   │   └── route.ts
│   │   │   ├── sendWelcome/
│   │   │   │   └── route.ts
│   │   │   └── setup-password/
│   │   │       └── route.ts
│   │   ├── briefings/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   ├── accept/
│   │   │   │   └── route.ts
│   │   │   ├── route.ts
│   │   │   └── upload/
│   │   │       └── route.ts
│   │   ├── certifications/
│   │   │   └── route.ts
│   │   ├── companies/
│   │   │   ├── [companyId]/
│   │   │   │   ├── logo/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── operatives/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── company/
│   │   │   └── [companyId]/
│   │   │       ├── _utils/
│   │   │       │   └── checkAdmin.ts
│   │   │       ├── inviteCode/
│   │   │       │   └── route.ts
│   │   │       └── regenerateInviteCode/
│   │   │           └── route.ts
│   │   ├── company-name/
│   │   │   └── route.ts
│   │   ├── compliance-export/
│   │   │   ├── csv/
│   │   │   │   └── route.ts
│   │   │   └── pdf/
│   │   │       └── route.ts
│   │   ├── coshh/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── deliveries/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── dev/
│   │   │   └── seed-cert-training/
│   │   │       └── route.ts
│   │   ├── gdpr/
│   │   │   ├── delete-account/
│   │   │   │   └── route.ts
│   │   │   └── download-my-data/
│   │   │       └── route.ts
│   │   ├── impersonate/
│   │   │   └── route.ts
│   │   ├── induction/
│   │   │   ├── export/
│   │   │   │   └── route.ts
│   │   │   └── reset/
│   │   │       └── route.ts
│   │   ├── induction-compliance/
│   │   │   └── drawer/
│   │   │       └── route.ts
│   │   ├── induction-status/
│   │   │   └── route.ts
│   │   ├── invite-codes/
│   │   │   ├── redeem/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── maintenance/
│   │   │   ├── activity-log/
│   │   │   │   └── route.ts
│   │   │   ├── attendance-refresh/
│   │   │   │   └── route.ts
│   │   │   ├── audit-log-export/
│   │   │   │   └── route.ts
│   │   │   ├── bulk-invite/
│   │   │   │   └── route.ts
│   │   │   ├── copy-company/
│   │   │   │   └── route.ts
│   │   │   ├── export-company/
│   │   │   │   └── route.ts
│   │   │   ├── grandfather-inductions/
│   │   │   │   └── route.ts
│   │   │   ├── import-users-csv/
│   │   │   │   └── route.ts
│   │   │   ├── retention-cleanup/
│   │   │   │   └── route.ts
│   │   │   ├── sync-profile-to-user/
│   │   │   │   └── route.ts
│   │   │   └── validate-data/
│   │   │       └── route.ts
│   │   ├── me/
│   │   │   └── route.ts
│   │   ├── notices/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── notifications/
│   │   │   └── send/
│   │   │       └── route.ts
│   │   ├── pre-induction/
│   │   │   ├── [userId]/
│   │   │   │   ├── _utils/
│   │   │   │   │   ├── auth.ts
│   │   │   │   │   └── status.ts
│   │   │   │   ├── certifications/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── declarations/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── medical/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── override/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── personal/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── right-to-work/
│   │   │   │   │   └── route.ts
│   │   │   │   └── training/
│   │   │   │       └── route.ts
│   │   │   ├── me/
│   │   │   │   └── override/
│   │   │   │       └── route.ts
│   │   │   └── upload/
│   │   │       └── route.ts
│   │   ├── profiles/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   ├── me/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── rams/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   ├── accept/
│   │   │   │   └── route.ts
│   │   │   ├── route.ts
│   │   │   ├── site/
│   │   │   │   └── [siteId]/
│   │   │   │       └── route.ts
│   │   │   └── upload/
│   │   │       └── route.ts
│   │   ├── registrations/
│   │   │   ├── [id]/
│   │   │   │   ├── approve/
│   │   │   │   │   └── route.ts
│   │   │   │   └── reject/
│   │   │   │       └── route.ts
│   │   │   └── route.ts
│   │   ├── safety-alerts/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── settings/
│   │   │   └── global/
│   │   │       └── route.ts
│   │   ├── site-rules/
│   │   │   └── route.ts
│   │   ├── sites/
│   │   │   ├── [id]/
│   │   │   │   ├── assigned-operatives/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── induction-quick/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── rams/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── route.ts
│   │   │   │   └── subcontractors/
│   │   │   │       └── route.ts
│   │   │   ├── linked/
│   │   │   │   └── route.ts
│   │   │   ├── migrate/
│   │   │   └── route.ts
│   │   ├── stop-impersonate/
│   │   │   └── route.ts
│   │   ├── subcontractor/
│   │   │   ├── compliance/
│   │   │   │   └── route.ts
│   │   │   ├── invite-operative/
│   │   │   │   └── route.ts
│   │   │   └── request-verification/
│   │   │       └── route.ts
│   │   ├── subcontractors/
│   │   │   └── route.ts
│   │   ├── supervisor/
│   │   │   ├── compliance/
│   │   │   │   └── route.ts
│   │   │   └── operative-drawer/
│   │   │       └── route.ts
│   │   ├── tasks/
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── route.ts
│   │   ├── training/
│   │   │   └── route.ts
│   │   ├── uploads/
│   │   │   └── medical/
│   │   │       └── route.ts
│   │   └── users/
│   │       ├── [id]/
│   │       │   ├── medical/
│   │       │   │   └── route.ts
│   │       │   └── route.ts
│   │       └── route.ts
│   ├── auth/
│   │   └── callback/
│   │       └── page.tsx
│   ├── components/
│   │   ├── AuthErrorHandler.tsx
│   │   └── Footer.tsx
│   ├── dashboard/
│   │   ├── DashboardSkeleton.tsx
│   │   ├── actions.ts
│   │   ├── all-users/
│   │   │   └── page.tsx
│   │   ├── attendance/
│   │   │   ├── AttendanceTabs.tsx
│   │   │   ├── LiveAttendance.tsx
│   │   │   ├── RoleCall.tsx
│   │   │   ├── SignInOut.tsx
│   │   │   └── page.tsx
│   │   ├── certifications/
│   │   │   └── page.tsx
│   │   ├── companies/
│   │   │   ├── AssetManagement.tsx
│   │   │   ├── Messaging.tsx
│   │   │   ├── OfflineWorking.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── CompanySwitcher.tsx
│   │   │   ├── DarkModeToggle.d.ts
│   │   │   ├── DarkModeToggle.tsx
│   │   │   ├── DashboardCharts.tsx
│   │   │   ├── DashboardContent.tsx
│   │   │   ├── LogoutButton.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── RAMSStatusBadge.tsx
│   │   │   ├── SessionTimeoutHandler.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── WelcomeBanner.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── SuperuserSidebar.tsx
│   │   │   │   └── Topbar.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Modal.tsx
│   │   │       ├── Skeleton.tsx
│   │   │       ├── Table.tsx
│   │   │       ├── TableActions.tsx
│   │   │       ├── animated-button.tsx
│   │   │       ├── enhanced-card.tsx
│   │   │       ├── loading-skeleton.tsx
│   │   │       ├── stat-card.tsx
│   │   │       └── toaster.tsx
│   │   ├── deliveries/
│   │   │   ├── AddDeliveryModal.tsx
│   │   │   ├── DeliveriesTable.tsx
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── global-settings/
│   │   │   └── page.tsx
│   │   ├── health-and-safety/
│   │   │   ├── alerts/
│   │   │   │   ├── SafetyAlertsManager.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── briefings/
│   │   │   │   ├── BriefingsTable.tsx
│   │   │   │   ├── BriefingsUploadModal.tsx
│   │   │   │   ├── actions.ts
│   │   │   │   └── page.tsx
│   │   │   ├── coshh/
│   │   │   │   ├── COSHHTemplate.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── rams/
│   │   │   │   └── page.tsx
│   │   │   └── site-rules/
│   │   │       ├── SiteRulesManager.tsx
│   │   │       └── page.tsx
│   │   ├── induction-compliance/
│   │   │   ├── components/
│   │   │   │   ├── ComplianceAdminActions.tsx
│   │   │   │   ├── ComplianceCards.tsx
│   │   │   │   ├── ComplianceClient.tsx
│   │   │   │   ├── ComplianceDocumentPreview.tsx
│   │   │   │   ├── ComplianceDrawer.tsx
│   │   │   │   ├── ComplianceDrawerSection.tsx
│   │   │   │   ├── ComplianceExpiryWarnings.tsx
│   │   │   │   ├── ComplianceExportButtons.tsx
│   │   │   │   ├── ComplianceFilters.tsx
│   │   │   │   ├── ComplianceMatrix.tsx
│   │   │   │   ├── ComplianceMissingItemsIcon.tsx
│   │   │   │   ├── ComplianceRowActions.tsx
│   │   │   │   ├── ComplianceStatusBadge.tsx
│   │   │   │   ├── ComplianceTable.tsx
│   │   │   │   ├── ExportCsvButton.tsx
│   │   │   │   └── SuperuserSelfOverrideBlock.tsx
│   │   │   ├── page.tsx
│   │   │   ├── server.ts
│   │   │   └── utils/
│   │   │       ├── buildComplianceDataset.ts
│   │   │       ├── buildCsvString.ts
│   │   │       └── buildPdfDocument.ts
│   │   ├── layout.tsx
│   │   ├── notices/
│   │   │   ├── AddNoticeModal.tsx
│   │   │   ├── NoticesTable.tsx
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── operatives/
│   │   │   ├── [id]/
│   │   │   │   ├── OperativeProfileClient.tsx
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── page.tsx
│   │   ├── profile/
│   │   │   └── page.tsx
│   │   ├── rams/
│   │   │   ├── RAMSTable.tsx
│   │   │   ├── RAMSTableSkeleton.tsx
│   │   │   ├── RAMSUploadModal.tsx
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   ├── SettingsClient.tsx
│   │   │   ├── SettingsComponents.tsx
│   │   │   ├── SuperuserSettingsClient.tsx
│   │   │   └── page.tsx
│   │   ├── sites/
│   │   │   ├── AddSiteModal.tsx
│   │   │   ├── MapPicker.tsx
│   │   │   ├── SiteTableSkeleton.tsx
│   │   │   ├── SitesTable.tsx
│   │   │   ├── [id]/
│   │   │   │   ├── EditSiteForm.tsx
│   │   │   │   ├── SiteDetailTabs.tsx
│   │   │   │   ├── SiteSubcontractorsTab.tsx
│   │   │   │   ├── induction/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── SiteInductionClient.tsx
│   │   │   │   │   │   ├── SiteInductionFilters.tsx
│   │   │   │   │   │   └── SiteInductionTable.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── server.ts
│   │   │   │   ├── page.tsx
│   │   │   │   └── server.ts
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── subcontractor/
│   │   │   ├── SubcontractorInviteOperative.tsx
│   │   │   ├── SubcontractorOnboardingPage.tsx
│   │   │   ├── SubcontractorOperativeDrawer.tsx
│   │   │   ├── SubcontractorOperativeTable.tsx
│   │   │   ├── SubcontractorRequestVerification.tsx
│   │   │   ├── SubcontractorUploadMissingDocuments.tsx
│   │   │   ├── page.tsx
│   │   │   └── utils/
│   │   │       └── buildSubcontractorComplianceDataset.ts
│   │   ├── subcontractors/
│   │   │   ├── InviteSubcontractorModal.tsx
│   │   │   ├── SubcontractorsList.tsx
│   │   │   └── page.tsx
│   │   ├── superuser-admin/
│   │   │   ├── SuperuserAdminClient.tsx
│   │   │   └── page.tsx
│   │   ├── superuser-dashboard/
│   │   │   ├── ApprovalsSection.tsx
│   │   │   ├── EditRegistrationModal.tsx
│   │   │   └── page.tsx
│   │   ├── superuser-tools/
│   │   │   └── page.tsx
│   │   ├── supervisor-dashboard/
│   │   │   ├── components/
│   │   │   │   ├── SupervisorActions.tsx
│   │   │   │   ├── SupervisorCompliancePanel.tsx
│   │   │   │   ├── SupervisorComplianceSection.tsx
│   │   │   │   ├── SupervisorExpiryWarnings.tsx
│   │   │   │   ├── SupervisorInductionStatusBadge.tsx
│   │   │   │   ├── SupervisorMissingItems.tsx
│   │   │   │   ├── SupervisorOperativeCard.tsx
│   │   │   │   └── SupervisorOperativeDrawer.tsx
│   │   │   ├── induction/
│   │   │   │   ├── components/
│   │   │   │   │   ├── QuickInductionSummary.tsx
│   │   │   │   │   └── QuickInductionTable.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   └── server.ts
│   │   │   ├── page.tsx
│   │   │   └── utils/
│   │   │       └── buildSupervisorComplianceDataset.ts
│   │   ├── system-logs/
│   │   │   ├── ClearLogsButton.tsx
│   │   │   └── page.tsx
│   │   ├── tasks/
│   │   │   ├── AddTaskModal.tsx
│   │   │   ├── TasksTable.tsx
│   │   │   ├── actions.ts
│   │   │   └── page.tsx
│   │   ├── users/
│   │   │   ├── ApprovalsModal.tsx
│   │   │   ├── InviteUserModal.tsx
│   │   │   ├── ProfilesTable.tsx
│   │   │   ├── UserProfileModal.tsx
│   │   │   ├── UsersTable.tsx
│   │   │   ├── UsersTableSkeleton.tsx
│   │   │   ├── [userId]/
│   │   │   │   ├── induction/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── InductionSummaryCard.tsx
│   │   │   │   │   │   └── InductionTable.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── server.ts
│   │   │   │   ├── page.tsx
│   │   │   │   └── pre-induction/
│   │   │   │       ├── components/
│   │   │   │       │   ├── PreInductionLayout.tsx
│   │   │   │       │   ├── PreInductionLayoutWithRefresh.tsx
│   │   │   │       │   ├── PreInductionOverrideToggle.tsx
│   │   │   │       │   ├── PreInductionSectionCertifications.tsx
│   │   │   │       │   ├── PreInductionSectionDeclarations.tsx
│   │   │   │       │   ├── PreInductionSectionMedical.tsx
│   │   │   │       │   ├── PreInductionSectionPersonal.tsx
│   │   │   │       │   ├── PreInductionSectionRightToWork.tsx
│   │   │   │       │   ├── PreInductionSectionTraining.tsx
│   │   │   │       │   └── PreInductionSummaryCard.tsx
│   │   │   │       ├── page.tsx
│   │   │   │       └── server.ts
│   │   │   ├── actions.ts
│   │   │   ├── page.tsx
│   │   │   └── profileActions.ts
│   │   └── utils/
│   │       └── sort.ts
│   ├── globals.css
│   ├── icon.png
│   ├── join/
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── legal/
│   │   └── privacy-policy/
│   │       └── page.tsx
│   ├── lib/
│   │   └── roles.ts
│   ├── login/
│   │   ├── actions.ts
│   │   └── page.tsx
│   ├── not-found.tsx
│   ├── page.tsx
│   ├── providers.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── reset-password/
│   │   └── page.tsx
│   ├── settings/
│   │   ├── display/
│   │   │   └── DisplaySettings.tsx
│   │   └── page.tsx
│   ├── setup-password/
│   │   └── page.tsx
│   ├── subcontractor/
│   │   ├── layout.tsx
│   │   └── setup/
│   │       └── page.tsx
│   ├── superuser/
│   │   └── page.tsx
│   └── apple-icon.png
├── briefings/
│   └── page.tsx
├── docs/
│   ├── FIRESTORE_SUBCONTRACTORS.md
│   ├── HEALTH_AND_SAFETY_FEATURES.md
│   ├── MIGRATION_GRANDFATHER_INDUCTIONS.md
│   ├── MOBILE_IMPLEMENTATION_GUIDE.md
│   ├── MOBILE_PRIVACY_SECURITY_GUIDE.md
│   ├── PROFILE_SUBCOLLECTION.md
│   └── wireframes-subcontractor-induction.md
├── lib/
│   ├── auditLog.ts
│   ├── authOptions.ts
│   ├── clamav.ts
│   ├── firebaseClient.ts
│   ├── hooks/
│   │   ├── useCompanyName.ts
│   │   ├── useInductionStatus.ts
│   │   └── useSessionTimeout.ts
│   ├── ramsCompliance.ts
│   ├── schemas/
│   │   └── index.ts
│   ├── sendWelcomeEmail.ts
│   ├── supabase/
│   │   └── fetchTable.ts
│   ├── supabaseAdmin.ts
│   ├── supabaseClient.ts
│   ├── url.ts
│   ├── utils/
│   │   ├── cookies.ts
│   │   └── debounce.ts
│   └── utils.ts
├── notes/
│   └── copilot-session-2026-01-29.md
├── public/
│   ├── Logo.png
│   ├── favicon.png
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── scripts/
│   ├── Untitled
│   ├── backfill-attendance-names.js
│   ├── backfill-attendance-site-names.js
│   ├── check-uuids.ts
│   ├── consolidate-duplicate-users.js
│   ├── debug-auth.js
│   ├── deleteUserWithSubcollections.js
│   ├── migrate-certs-training.js
│   ├── migrate-grandfather-site-inductions.js
│   ├── migrate-legacy-to-test-company.js
│   ├── migrate-worker-to-operative.js
│   ├── migrate_add_companyId.js
│   ├── migrate_companyId.js
│   ├── migrate_legacy_companyId.js
│   ├── migrate_pre_induction.js
│   ├── set-superuser-claim.js
│   ├── supabase-schema.json
│   ├── test-email.cjs
│   ├── test-email.js
│   ├── test-email.ts
│   ├── validate-schema.js
│   └── validate-schema.ts
├── styles/
│   └── globals.css
├── supabase/
│   ├── auth/
│   │   └── client.ts
│   └── storage/
│       └── storageClient.ts
├── tests/
│   ├── dashboard/
│   │   └── DashboardContent.test.tsx
│   ├── edge-functions/
│   │   └── edgeFunction.test.ts
│   ├── mocks/
│   │   └── supabase.ts
│   ├── realtime/
│   │   └── realtime.test.ts
│   ├── rls/
│   │   ├── deliveries.rls.test.ts
│   │   ├── helpers.ts
│   │   ├── notices.rls.test.ts
│   │   ├── rls.test.ts
│   │   ├── sites.rls.test.ts
│   │   ├── tasks.rls.test.ts
│   │   └── users.rls.test.ts
│   ├── setup.test.ts
│   ├── storage/
│   │   └── storage.test.ts
│   └── web/
│       ├── api.test.ts
│       ├── auth.test.ts
│       ├── dashboard.test.tsx
│       └── profile.test.tsx
├── types/
│   ├── nodemailer.d.ts
│   └── preInductionProfile.ts
├── add-user.js
├── AUDIT_REPORT.md
├── create-favicon.js
├── DATA_ISOLATION.md
├── DATA_MODEL.md
├── eslint.config.mjs
├── export-example.js
├── FIREBASE_MIGRATION_STATUS.md
├── jest.config.js
├── jest.setup.js
├── migrate-sites.js
├── next-env.d.ts
├── next.config.js
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── prisma.config.ts
├── PROJECT_STRUCTURE.md
├── proxy.ts
├── README.md
├── service-account.json
├── SITEHUB_E2E_TEST_CHECKLIST.md
├── storage.rules
├── supabase-project.code-workspace
├── supabaseAuth.e2e.test.ts
├── tailwind.config.js
├── tsconfig.json
├── USAGE_GUIDE.md
├── vercel.json
└── VISUAL_ENHANCEMENTS.md
```

## Root files

| File | Purpose |
|------|---------|
| `.env`, `.env.local`, `.env.production` | Environment variables |
| `.firebaserc` | Firebase config |
| `.gitignore` | Git ignore rules |
| `next.config.js` | Next.js config |
| `package.json` | Dependencies |
| `proxy.ts` | Middleware/proxy |
| `tailwind.config.js` | Tailwind CSS |
| `tsconfig.json` | TypeScript config |
| `vercel.json` | Vercel deployment |

## Notes

- `node_modules/`, `.next/`, and `.git/` are excluded
- `.DS_Store` and similar system files omitted from tree
- `app/` uses Next.js App Router
- `app/api/` contains route handlers
- `lib/` holds shared utilities and client config
- `scripts/` holds migrations and maintenance scripts
