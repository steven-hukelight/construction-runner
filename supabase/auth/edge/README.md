// supabase/auth/edge/README.md

# Supabase Auth Edge Functions

## claims_sync.ts
- Edge Function to sync JWT claims with the users table.
- Fetches company_id, role, superuser for a user.
- Intended to be called by admin, cron, or webhook.
- Placeholder for actual custom claims update (see Supabase docs for Admin API usage).

## Deployment
- Deploy to Supabase Edge Functions:
  - `supabase functions deploy claims_sync`
- Call with `{ user_id }` in JSON body.

## Next Steps
- Implement custom claims update via Supabase Admin API or triggers.
- Integrate with user creation/update flows.
