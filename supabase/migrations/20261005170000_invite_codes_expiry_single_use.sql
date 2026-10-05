-- Invite codes: expiry, use limit, and an atomic claim for POST /api/invite-codes/redeem.
-- Deploy this migration before the app code that calls claim_invite_code / release_invite_code;
-- until it is applied, every redemption fails with the generic "Invalid invite code" response.

alter table public.invite_codes
  add column if not exists expires_at timestamptz,
  add column if not exists max_uses integer not null default 1,
  add column if not exists use_count integer not null default 0;

alter table public.invite_codes
  alter column expires_at set default (now() + interval '14 days');

-- Existing codes had no expiry and no use limit. They get 14 days from when they were created,
-- so codes older than that stop working as soon as this runs.
update public.invite_codes
   set expires_at = coalesce(created_at, now()) + interval '14 days'
 where expires_at is null;

alter table public.invite_codes
  drop constraint if exists invite_codes_max_uses_positive,
  add constraint invite_codes_max_uses_positive check (max_uses >= 1),
  drop constraint if exists invite_codes_use_count_range,
  add constraint invite_codes_use_count_range check (use_count >= 0 and use_count <= max_uses);

-- Only the service role reads this table; RLS with no policies blocks anon/authenticated.
alter table public.invite_codes enable row level security;

-- Consumes one use if the code exists, has the expected type, has not expired and has uses left.
-- Returns no row otherwise. The single UPDATE makes concurrent redemptions safe.
create or replace function public.claim_invite_code(p_code text, p_type text)
returns table (claimed_site_id text, claimed_main_contractor_id text)
language sql
security definer
set search_path = public
as $$
  update public.invite_codes ic
     set use_count = ic.use_count + 1
   where ic.id = p_code
     and ic.type = p_type
     and (ic.expires_at is null or ic.expires_at > now())
     and ic.use_count < ic.max_uses
  returning ic.site_id, ic.main_contractor_id;
$$;

-- Gives a use back when redemption fails after the claim (e.g. the auth account could not be created).
create or replace function public.release_invite_code(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.invite_codes
     set use_count = greatest(use_count - 1, 0)
   where id = p_code;
$$;

revoke all on function public.claim_invite_code(text, text) from public, anon, authenticated;
revoke all on function public.release_invite_code(text) from public, anon, authenticated;
grant execute on function public.claim_invite_code(text, text) to service_role;
grant execute on function public.release_invite_code(text) to service_role;
