# Supabase Scripts

SQL scripts for manual operations and troubleshooting.

## users-troubleshooting.sql

Use this file to diagnose and fix issues with the `users` table and auth sync.

1. **Check schema**: Run section 1 and 2 to see which columns exist and their constraints.
2. **Fix INSERT failures**: If `companyid` or `company_id` is NOT NULL, either:
   - Run the migration `20260214_users_auth_sync` to make it nullable, or
   - Uncomment section 4 and run the `ALTER TABLE` manually.
3. **Backfill a user**: Uncomment and edit Option A or B in section 3, then run in SQL Editor.
4. **Backfill all users**: Uncomment section 5 to sync all auth users to public.users.

Run individual sections in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql).
