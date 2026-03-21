-- Relax pre_induction access to allow email match when auth.uid() differs from users.id
-- This helps existing users not yet migrated to Supabase Auth UUIDs.

create or replace function public.pre_induction_can_access(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id, role, company_id, coalesce(superuser,false) as superuser_flag, lower(email) as email
    from users
    where id = auth.uid()
  ),
  target as (
    select company_id, lower(email) as email
    from users
    where id = target_user_id
  )
  select
    auth.uid() is not null
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
      -- email match fallback to bridge legacy users not yet in GoTrue with same UUID
      or exists (
        select 1 from me m, target t
        where m.email is not null and t.email = m.email
      )
    );
$$;
