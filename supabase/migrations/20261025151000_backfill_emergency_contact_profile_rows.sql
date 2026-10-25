-- ---------------------------------------------------------------------------
-- Follow-up to 20260908000000_my_info_emergency_contact_consolidation.
--
-- That migration only updated existing user_profile_data rows (there is no
-- unique index on user_id), so operatives whose emergency contact lives only
-- in pre_induction_personal never got a user_profile_data row and see an
-- empty contact on My Info.
--
-- Create the missing rows. Skips anyone who already has a row under either
-- user_id or the legacy userid column, because profile lookups match on both
-- and expect a single row. Idempotent.
-- ---------------------------------------------------------------------------

insert into public.user_profile_data (user_id, emergency_contact_name, emergency_contact_phone)
select
  pip.user_id,
  pip.emergency_contact_name,
  pip.emergency_contact_phone
from public.pre_induction_personal pip
join public.users u on u.id = pip.user_id
where pip.user_id is not null
  and (pip.emergency_contact_name is not null or pip.emergency_contact_phone is not null)
  and not exists (
    select 1
    from public.user_profile_data upd
    where upd.user_id = pip.user_id
       or upd.userid = pip.user_id
  );
