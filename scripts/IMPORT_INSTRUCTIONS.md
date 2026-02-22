# Firebase Export Import

Imports Firestore data from `firebase-export/` into `firebase_staging` schema.

## Quick start

**Option A: Direct Postgres (recommended)**

1. Get your connection string from [Supabase Dashboard](https://supabase.com/dashboard) → Project → Settings → Database → Connection string → URI (Session mode).
2. Add to `supabase-project/.env` or `sitehub-admin/.env`:
   ```
   DATABASE_URL=postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-xx.pooler.supabase.com:6543/postgres
   ```
3. Run:
   ```bash
   cd supabase-project && npm run import-firebase
   ```

**Option B: Supabase API**

1. In [Supabase Dashboard](https://supabase.com/dashboard) → Project → Settings → API → Data API Settings
2. Add `firebase_staging` to **Exposed schemas**
3. Save
4. Run:
   ```bash
   cd supabase-project && npm run import-firebase
   ```

## Export location

The script looks for `firebase-export/YYYY-MM-DD/` in:
- `../sitehub-admin/firebase-export/` (sibling)
- `sitehub-admin/firebase-export/` (inside project)

Uses the latest date folder if multiple exist.
