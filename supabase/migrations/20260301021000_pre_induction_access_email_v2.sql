-- Update pre_induction_can_access to allow email-based access even when auth.uid() does not match users.id
-- Uses JWT email directly so a GoTrue user without a matching users.id row can still access their own pre-induction rows by email.

create or replace function public.pre_induction_can_access(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Extract auth email from JWT claims (Supabase standard)
  with auth_claims as (
    select lower(coalesce(current_setting('request.jwt.claims', true)::json ->> 'email', '')) as email,
           auth.uid() as uid
  ),
  me as (
    select u.id, u.role, u.company_id, coalesce(u.superuser,false) as superuser_flag, lower(u.email) as email
    from users u
    join auth_claims c on u.id = c.uid
  ),
  target as (
    select company_id, lower(email) as email
    from users
    where id = target_user_id
  )
  select
    exists(select 1 from auth_claims where uid is not null)
    and (
      -- direct owner by UUID
      auth.uid() = target_user_id
      -- admin/supervisor/superuser same-company (or superuser any)
      or exists (
        select 1 from me m
        where (m.role ilike 'admin' or m.role ilike 'supervisor' or m.superuser_flag)
          and (
            m.superuser_flag
            or exists (select 1 from target t where t.company_id = m.company_id)
          )
      )
      -- email match fallback: auth email equals target user's email
      or exists (
        select 1 from auth_claims c, target t
        where c.email <> '' and t.email = c.email
      )
    );
$$;
