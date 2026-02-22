# SiteHub Platform: Complete End-to-End Testing Checklist

This checklist ensures robust, production-grade coverage for all major SiteHub features and integrations, including web, mobile, authentication, Row Level Security (RLS), storage, realtime, and Edge Functions.

---

## 1. Authentication & Session Management

- [ ] User registration (email/password, social providers if enabled)
- [ ] Email verification flow
- [ ] Login/logout (web, mobile)
- [ ] Session persistence across reloads/app restarts
- [ ] Session expiration and auto-logout (12h inactivity)
- [ ] Password reset (request, verify, complete)
- [ ] Multi-device session handling
- [ ] JWT claim sync (company, role, superuser, etc.)
- [ ] RLS enforcement on all tables (unauthorized access blocked)
- [ ] Admin/privileged user flows (impersonation, elevated claims)
- [ ] Error handling for invalid/expired tokens

---

## 2. Web Application

- [ ] Dashboard loads for all user roles (admin, supervisor, operative, subcontractor)
- [ ] Login page (UI, error states, Google sign-in if enabled)
- [ ] Profile management (edit, upload avatar, change password)
- [ ] Company switching (if multi-company)
- [ ] Pre-induction and induction flows (forms, validation, progress)
- [ ] Document upload (file type/size limits, preview, download)
- [ ] Compliance dashboards (data accuracy, permissions)
- [ ] Notifications (in-app, email, push if enabled)
- [ ] Data export (GDPR: download my data)
- [ ] Account deletion (GDPR: request, confirm, redirect)
- [ ] Responsive design (desktop, tablet, mobile web)
- [ ] Accessibility (keyboard navigation, ARIA, color contrast)

---

## 3. Mobile Application

- [ ] Onboarding/first-time login (agreement, privacy, security)
- [ ] Session persistence and auto-logout
- [ ] Pre-induction/induction forms (all sections, validation)
- [ ] Document/photo upload (camera, gallery, file picker)
- [ ] Download/view documents
- [ ] Push notifications (if enabled)
- [ ] Offline/poor connectivity handling
- [ ] Navigation and deep linking
- [ ] GDPR flows (download data, request deletion)
- [ ] App updates and backward compatibility

---

## 4. Storage (Supabase Storage)

- [ ] File upload (all allowed types, size limits)
- [ ] File download and preview
- [ ] File deletion (user, admin)
- [ ] RLS: Only authorized users can access their files
- [ ] Public vs. private buckets (if used)
- [ ] Storage quota enforcement (if configured)
- [ ] Virus/malware scanning (if enabled)

---

## 5. Realtime Features

- [ ] Live updates for dashboards (compliance, attendance, etc.)
- [ ] Presence/online status (if used)
- [ ] Notifications (realtime delivery)
- [ ] Data consistency after concurrent edits
- [ ] Graceful fallback if realtime connection drops

---

## 6. Edge Functions

- [ ] All deployed Edge Functions respond as expected (input/output, error handling)
- [ ] Auth context is correctly passed and enforced
- [ ] RLS checks within Edge Functions (no privilege escalation)
- [ ] Rate limiting and abuse protection
- [ ] Logging and monitoring (errors, performance)
- [ ] Backward compatibility after function updates

---

## 7. Row Level Security (RLS)

- [ ] All tables have RLS enabled and tested
- [ ] Unauthorized access attempts are blocked (direct API, Edge Functions, client)
- [ ] Role-based access (admin, supervisor, operative, subcontractor)
- [ ] Data isolation between companies/tenants
- [ ] RLS bypass attempts (e.g., via Edge Functions) are prevented

---

## 8. General Platform

- [ ] Environment configuration (dev, staging, production)
- [ ] Rate limiting and abuse protection (API, storage, auth)
- [ ] Logging and error reporting (client, server, Edge Functions)
- [ ] Backup and disaster recovery (database, storage)
- [ ] Monitoring and alerting (uptime, errors, performance)
- [ ] Security headers and best practices (CSP, XSS, CSRF)
- [ ] Compliance: GDPR, data minimization, privacy policy links

---

## 9. Regression & Integration

- [ ] All critical user journeys (end-to-end, cross-device)
- [ ] Integration with third-party services (email, SMS, analytics)
- [ ] Migration scripts (if run, data integrity checks)
- [ ] Backward compatibility after schema or API changes

---

## 10. Manual & Exploratory

- [ ] Manual exploratory testing for new features
- [ ] Usability and UX review
- [ ] Edge case and error state handling

---

**Tip:** Automate as many checks as possible (Jest, Cypress, Flutter integration tests, etc.), and maintain a manual regression suite for critical flows and UI/UX.

---

**Last updated:** 2026-02-14  
**Maintainer:** SiteHub Engineering
