-- Relax pre_induction access to allow email match when auth.uid() differs from users.id
-- Keep admin/supervisor/superuser logic intact.

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
      auth.uid() = target_user_id
      or exists (
        select 1 from me m
        where (m.role ilike 'admin' or m.role ilike 'supervisor' or m.superuser_flag)
          and (
            m.superuser_flag
            or exists (select 1 from target t where t.company_id = m.company_id)
          )
      )
      or exists (
        select 1 from me m, target t
        where m.email is not null and t.email = m.email
      )
    );
$$;
