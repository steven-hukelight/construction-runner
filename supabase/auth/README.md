// supabase/auth/README.md

# Supabase Auth Migration Helpers

## JWT Claims Design
- JWT payload must include:
  - `sub` / `user_id`: user id (uuid)
  - `company_id`: company id (uuid)
  - `role`: user role (string)
  - `superuser`: boolean
- These claims must match what RLS expects:
  - `auth.jwt()->>'company_id'`
  - `auth.jwt()->>'role'`
  - `auth.jwt()->>'superuser'`

## Auth Client
- Centralized in `supabase/auth/client.ts`
- Provides sign up, sign in, sign out, session helpers
- Use `useAuth()` React hook for web app

## Claims Sync
- Use Edge Function or cron to ensure JWT claims match `users` table
- See `supabase/auth/claims_sync.ts` (placeholder)

## Integration
- Replace Firebase Auth usage with Supabase Auth via `useAuth()` or `supabase/auth/client.ts`
- Ensure all RLS-relevant claims are present in JWT

## Dual Auth Mode
- Keep Firebase Auth for now
- Add Supabase Auth in parallel
// Removed: dual auth mode toggle (migration complete)
