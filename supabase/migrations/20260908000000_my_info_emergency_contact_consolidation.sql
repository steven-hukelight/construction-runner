-- ---------------------------------------------------------------------------
-- My Info reflow: consolidate emergency contact onto user_profile_data.
--
-- Before this migration:
--   - pre_induction_personal holds (name, relationship, phone)
--   - user_profile_data holds (name, phone) but is mostly empty
--
-- After this migration:
--   - user_profile_data is the single source of truth for emergency contact
--     going forward. Every read/write from the "My Info" screen hits it.
--   - pre_induction_personal.emergency_contact_* columns are left in place
--     (belt-and-braces rollback) but become read-only legacy. A later cleanup
--     ticket will drop them once we've been in production for 2+ weeks.
--
-- The migration is idempotent and only backfills rows that don't already have
-- emergency contact data in user_profile_data. Non-null existing values in
-- user_profile_data are NEVER overwritten.
-- ---------------------------------------------------------------------------

-- Sanity check: verify columns exist on both tables. Fail loudly if not.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profile_data'
      and column_name in ('emergency_contact_name','emergency_contact_phone')
    group by table_schema having count(*) = 2
  ) then
    raise exception 'user_profile_data missing emergency_contact_name or emergency_contact_phone columns';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'pre_induction_personal'
      and column_name in ('emergency_contact_name','emergency_contact_phone')
    group by table_schema having count(*) = 2
  ) then
    raise exception 'pre_induction_personal missing emergency_contact_name or emergency_contact_phone columns';
  end if;
end$$;

-- Backfill: copy pre_induction_personal.emergency_contact_* into
-- user_profile_data where the target columns are NULL. We use an UPSERT so
-- users without a user_profile_data row get one created.
--
-- NOTE: user_profile_data.user_id is nullable but is expected to be present
-- and unique per user. The unique constraint on (user_id) must exist for the
-- ON CONFLICT to work; if it doesn't, fall back to UPDATE-only.

do $$
declare
  has_user_id_unique boolean;
begin
  select exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'user_profile_data'
      and indexdef ilike '%unique%(user_id)%'
  ) into has_user_id_unique;

  if has_user_id_unique then
    -- UPSERT path
    insert into public.user_profile_data (user_id, emergency_contact_name, emergency_contact_phone)
    select
      pip.user_id,
      pip.emergency_contact_name,
      pip.emergency_contact_phone
    from public.pre_induction_personal pip
    where pip.user_id is not null
      and (pip.emergency_contact_name is not null or pip.emergency_contact_phone is not null)
    on conflict (user_id) do update
      set
        emergency_contact_name  = coalesce(user_profile_data.emergency_contact_name,  excluded.emergency_contact_name),
        emergency_contact_phone = coalesce(user_profile_data.emergency_contact_phone, excluded.emergency_contact_phone),
        updated_at              = now();
  else
    -- UPDATE-only path (no unique constraint on user_id): safer than inserting
    -- duplicates. Users without a user_profile_data row keep their pre_induction
    -- data readable via the legacy path; the reflowed UI's PUT handler will
    -- INSERT-if-missing at write time.
    update public.user_profile_data upd
    set
      emergency_contact_name  = coalesce(upd.emergency_contact_name,  pip.emergency_contact_name),
      emergency_contact_phone = coalesce(upd.emergency_contact_phone, pip.emergency_contact_phone),
      updated_at              = now()
    from public.pre_induction_personal pip
    where upd.user_id = pip.user_id
      and (upd.emergency_contact_name is null or upd.emergency_contact_phone is null)
      and (pip.emergency_contact_name is not null or pip.emergency_contact_phone is not null);
  end if;
end$$;

-- Report backfill result for the migration log.
do $$
declare
  filled_count integer;
begin
  select count(*) into filled_count
  from public.user_profile_data
  where emergency_contact_name is not null or emergency_contact_phone is not null;
  raise notice 'My Info emergency contact consolidation complete. user_profile_data rows with data: %', filled_count;
end$$;
