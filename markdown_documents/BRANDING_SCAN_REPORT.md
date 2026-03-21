# Branding Scan Report – Site Hub → Construction Runner

Scan for references affecting **Vercel deployment**, **metadata**, **environment variables**, and **build configuration**.

---

## ✅ Updated in This Scan

| File | Change |
|------|--------|
| `sitehub-admin/package.json` | `"name": "sitehub-admin"` → `"name": "construction-runner-admin"` |
| `sitehub-admin/package-lock.json` | Same (2 occurrences) |
| `sitehub-admin/.env.example` | Comment `sitehub-admin` → `Construction Runner admin` |

---

## ✅ Already Correct (No Changes Made)

| Item | Status |
|------|--------|
| **next.config.js** | No branding references |
| **vercel.json** | No branding references |
| **layout.tsx metadata** | `title: "Construction Runner Admin"` ✓ |
| **manifest.json** (mobile web) | `"name": "Construction Runner"` ✓ |
| **Environment variable names** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXTAUTH_SECRET`, etc. – no sitehub in names |
| **API route metadata** | No branding in `export const dynamic` or route config |

---

## ⚠️ Intentionally Not Changed (Per Your Rules)

### File paths / script references

These reference the **folder name** `sitehub-admin`. Renaming would require renaming the directory and fixing all imports.

| File | Reference |
|------|-----------|
| Root `package.json` | `--prefix sitehub-admin`, `sitehub-admin/live_schema.json` |
| `scripts/import-firebase-export.ts` | `sitehub-admin/.env`, `sitehub-admin/firebase-export` |
| `scripts/validate-schema.js` | `sitehub-admin/` in error message |
| `scripts/migrate-certs-training.js` | `sitehub-admin/` in error message |
| `.github/workflows/ci.yml` | `cd sitehub_worker_Ready` (folder path) |

### Firebase / Auth (excluded per your instructions)

| Item | Reason |
|------|--------|
| Firebase project IDs | Do not modify |
| Firestore collections | Do not modify |
| Storage buckets | Do not modify |
| `admin@sitehub.local` (authOptions) | Dev credential |
| `@sitehub.com` (registrations superuser check) | Business logic |
| `sitehub.info@gmail.com` (Sidebar) | Support email address |
| Test fixtures `@sitehub.com` | Test data |

---

## Summary

- **Package name**: Updated to `construction-runner-admin` (affects npm, build logs, and Vercel project display).
- **Metadata / manifest**: Already uses Construction Runner.
- **Config files**: No branding in `next.config.js` or `vercel.json`.
- **Env vars**: No env variable names contain sitehub.
- **Paths**: Left as-is; they refer to directory names, not branding.

---

## Optional: Rename Project Folder

To fully align branding, you could rename `sitehub-admin/` → `construction-runner-admin/`. That would require:

1. Renaming the directory
2. Updating all path references (package.json scripts, import scripts, CI, Vercel project root)
3. Updating Vercel project configuration if it points at the old path

This is a larger refactor and not done in this scan.
