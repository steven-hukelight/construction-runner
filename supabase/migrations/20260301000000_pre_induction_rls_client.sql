-- Pre-induction RLS: allow authenticated users to manage their own rows; admins/supervisors (same company) also allowed.
-- Uses users.role and users.company_id for admin/supervisor same-company access. Superuser can access all.

-- Helper: can current auth user access target user rows?
create or replace function public.pre_induction_can_access(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      auth.uid() = target_user_id
      or exists (
        select 1
        from users me
        where me.id = auth.uid()
          and (me.role in ('ADMIN','admin','SUPERVISOR','supervisor','SUPERUSER','superuser') or coalesce(me.superuser,false) = true)
          and (
            coalesce(me.superuser,false) = true
            or exists (
              select 1 from users target
              where target.id = target_user_id
                and target.company_id = me.company_id
            )
          )
      )
    );
$$;

-- Apply RLS to pre-induction tables
alter table if exists public.pre_induction_personal enable row level security;
alter table if exists public.pre_induction_right_to_work enable row level security;
alter table if exists public.pre_induction_certifications enable row level security;
alter table if exists public.pre_induction_competency_card enable row level security;
alter table if exists public.pre_induction_medical enable row level security;
alter table if exists public.pre_induction_training enable row level security;
alter table if exists public.pre_induction_declarations enable row level security;
alter table if exists public.user_pre_induction_profile enable row level security;

-- Explicit owner/admin policies for each table (user_id column)

-- pre_induction_personal
drop policy if exists pre_induction_personal_select on public.pre_induction_personal;
create policy pre_induction_personal_select on public.pre_induction_personal
  for select using (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_personal_insert on public.pre_induction_personal;
create policy pre_induction_personal_insert on public.pre_induction_personal
  for insert with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_personal_update on public.pre_induction_personal;
create policy pre_induction_personal_update on public.pre_induction_personal
  for update using (public.pre_induction_can_access(user_id))
  with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_personal_delete on public.pre_induction_personal;
create policy pre_induction_personal_delete on public.pre_induction_personal
  for delete using (public.pre_induction_can_access(user_id));

-- pre_induction_right_to_work
drop policy if exists pre_induction_rtw_select on public.pre_induction_right_to_work;
create policy pre_induction_rtw_select on public.pre_induction_right_to_work
  for select using (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_rtw_insert on public.pre_induction_right_to_work;
create policy pre_induction_rtw_insert on public.pre_induction_right_to_work
  for insert with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_rtw_update on public.pre_induction_right_to_work;
create policy pre_induction_rtw_update on public.pre_induction_right_to_work
  for update using (public.pre_induction_can_access(user_id))
  with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_rtw_delete on public.pre_induction_right_to_work;
create policy pre_induction_rtw_delete on public.pre_induction_right_to_work
  for delete using (public.pre_induction_can_access(user_id));

-- pre_induction_certifications
drop policy if exists pre_induction_certs_select on public.pre_induction_certifications;
create policy pre_induction_certs_select on public.pre_induction_certifications
  for select using (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_certs_insert on public.pre_induction_certifications;
create policy pre_induction_certs_insert on public.pre_induction_certifications
  for insert with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_certs_update on public.pre_induction_certifications;
create policy pre_induction_certs_update on public.pre_induction_certifications
  for update using (public.pre_induction_can_access(user_id))
  with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_certs_delete on public.pre_induction_certifications;
create policy pre_induction_certs_delete on public.pre_induction_certifications
  for delete using (public.pre_induction_can_access(user_id));

-- pre_induction_competency_card
drop policy if exists pre_induction_card_select on public.pre_induction_competency_card;
create policy pre_induction_card_select on public.pre_induction_competency_card
  for select using (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_card_insert on public.pre_induction_competency_card;
create policy pre_induction_card_insert on public.pre_induction_competency_card
  for insert with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_card_update on public.pre_induction_competency_card;
create policy pre_induction_card_update on public.pre_induction_competency_card
  for update using (public.pre_induction_can_access(user_id))
  with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_card_delete on public.pre_induction_competency_card;
create policy pre_induction_card_delete on public.pre_induction_competency_card
  for delete using (public.pre_induction_can_access(user_id));

-- pre_induction_medical
drop policy if exists pre_induction_med_select on public.pre_induction_medical;
create policy pre_induction_med_select on public.pre_induction_medical
  for select using (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_med_insert on public.pre_induction_medical;
create policy pre_induction_med_insert on public.pre_induction_medical
  for insert with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_med_update on public.pre_induction_medical;
create policy pre_induction_med_update on public.pre_induction_medical
  for update using (public.pre_induction_can_access(user_id))
  with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_med_delete on public.pre_induction_medical;
create policy pre_induction_med_delete on public.pre_induction_medical
  for delete using (public.pre_induction_can_access(user_id));

-- pre_induction_training
drop policy if exists pre_induction_train_select on public.pre_induction_training;
create policy pre_induction_train_select on public.pre_induction_training
  for select using (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_train_insert on public.pre_induction_training;
create policy pre_induction_train_insert on public.pre_induction_training
  for insert with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_train_update on public.pre_induction_training;
create policy pre_induction_train_update on public.pre_induction_training
  for update using (public.pre_induction_can_access(user_id))
  with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_train_delete on public.pre_induction_training;
create policy pre_induction_train_delete on public.pre_induction_training
  for delete using (public.pre_induction_can_access(user_id));

-- pre_induction_declarations
drop policy if exists pre_induction_decl_select on public.pre_induction_declarations;
create policy pre_induction_decl_select on public.pre_induction_declarations
  for select using (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_decl_insert on public.pre_induction_declarations;
create policy pre_induction_decl_insert on public.pre_induction_declarations
  for insert with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_decl_update on public.pre_induction_declarations;
create policy pre_induction_decl_update on public.pre_induction_declarations
  for update using (public.pre_induction_can_access(user_id))
  with check (public.pre_induction_can_access(user_id));

drop policy if exists pre_induction_decl_delete on public.pre_induction_declarations;
create policy pre_induction_decl_delete on public.pre_induction_declarations
  for delete using (public.pre_induction_can_access(user_id));

-- user_pre_induction_profile
drop policy if exists user_pre_induction_profile_select on public.user_pre_induction_profile;
create policy user_pre_induction_profile_select on public.user_pre_induction_profile
  for select using (public.pre_induction_can_access(user_id));

drop policy if exists user_pre_induction_profile_insert on public.user_pre_induction_profile;
create policy user_pre_induction_profile_insert on public.user_pre_induction_profile
  for insert with check (public.pre_induction_can_access(user_id));

drop policy if exists user_pre_induction_profile_update on public.user_pre_induction_profile;
create policy user_pre_induction_profile_update on public.user_pre_induction_profile
  for update using (public.pre_induction_can_access(user_id))
  with check (public.pre_induction_can_access(user_id));

drop policy if exists user_pre_induction_profile_delete on public.user_pre_induction_profile;
create policy user_pre_induction_profile_delete on public.user_pre_induction_profile
  for delete using (public.pre_induction_can_access(user_id));
