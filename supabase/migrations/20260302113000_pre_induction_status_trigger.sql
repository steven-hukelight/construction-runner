-- Auto-recompute pre_induction_status and compliance_score on pre-induction changes.
-- Security: runs as owner (postgres) to bypass RLS when updating users.

create or replace function public.fn_update_pre_induction_status(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_personal jsonb;
  v_rtw jsonb;
  v_comp jsonb;
  v_med jsonb;
  v_training jsonb;
  v_decls jsonb;
  v_status text := 'not_started';
  v_score int := 0;
  v_has_any boolean := false;
  v_personal_complete boolean := false;
  v_rtw_complete boolean := false;
  v_comp_complete boolean := false;
  v_med_complete boolean := false;
  v_decl_complete boolean := false;
begin
  select to_jsonb(p) into v_personal from pre_induction_personal p where p.user_id = p_user_id;
  select to_jsonb(r) into v_rtw from pre_induction_right_to_work r where r.user_id = p_user_id;
  select to_jsonb(c) into v_comp from pre_induction_competency_card c where c.user_id = p_user_id;
  select to_jsonb(m) into v_med from pre_induction_medical m where m.user_id = p_user_id;
  select to_jsonb(t) into v_training from pre_induction_training t where t.user_id = p_user_id;
  select to_jsonb(d) into v_decls from pre_induction_declarations d where d.user_id = p_user_id;

  v_has_any := v_personal is not null or v_rtw is not null or v_comp is not null or v_med is not null or v_training is not null or v_decls is not null;

  v_personal_complete := v_personal ? 'full_name' or v_personal ? 'email';

  -- Right to work complete if verified OR (has id doc AND proof_of_address)
  v_rtw_complete := false;
  if v_rtw is not null then
    v_rtw_complete := coalesce((v_rtw ->> 'right_to_work_verified')::boolean, false)
      or ((v_rtw ? 'passport_url' or v_rtw ? 'visa_url' or v_rtw ? 'passport_expiry' or v_rtw ? 'visa_expiry')
          and (v_rtw ? 'proof_of_address_url'));
  end if;

  v_comp_complete := v_comp is not null and coalesce(nullif(v_comp ->> 'card_number', '') is not null, false) and v_comp ? 'file_url';

  v_med_complete := false;
  if v_med is not null then
    v_med_complete := coalesce((v_med ->> 'medical_verified')::boolean, false)
      or coalesce((v_med ->> 'fit_to_work')::boolean, false)
      or (v_med ->> 'medical_certificate_url') is not null;
  end if;

  v_decl_complete := v_decls is not null and coalesce((v_decls ->> 'operative_declaration_accepted')::boolean, false);

  if v_personal_complete and v_rtw_complete and v_comp_complete and v_med_complete and v_decl_complete then
    v_status := 'complete';
  elsif v_has_any then
    v_status := 'in_progress';
  end if;

  -- Compliance score (simplified to match app logic)
  if v_rtw is not null and coalesce((v_rtw ->> 'right_to_work_verified')::boolean, false) then v_score := v_score + 30; end if;
  if v_med is not null and coalesce((v_med ->> 'medical_verified')::boolean, false) then v_score := v_score + 20; end if;
  if v_comp_complete then v_score := v_score + 20; end if;
  if v_decl_complete then v_score := v_score + 10; end if;
  if v_training is not null then
    -- Optional RAMS scoring (align with app logic)
    if v_training ? 'rams_required_version' or v_training ? 'rams_required_version_by_site' then
      if coalesce((v_training ->> 'rams_accepted')::boolean, false)
         and coalesce(v_training ->> 'rams_version','') = coalesce(v_training ->> 'rams_required_version','') then
        v_score := v_score + 10;
      elsif coalesce((v_training ->> 'rams_accepted')::boolean, false) then
        v_score := v_score - 10;
      else
        v_score := v_score - 20;
      end if;
    end if;
  end if;
  v_score := greatest(0, least(100, v_score));

  update users
    set pre_induction_status = v_status,
        compliance_score = v_score,
        updated_at = now()
    where id = p_user_id;
end;
$$;

-- Helper to create triggers for each table
create or replace function public.fn_pre_induction_status_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform fn_update_pre_induction_status(coalesce(new.user_id, old.user_id));
  return coalesce(new, old);
end;
$$;

do $$
declare
  rec record;
begin
  for rec in
    select tgname, n.nspname, c.relname
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where tgname like 'trg_pre_induction_status_%'
  loop
    execute format('drop trigger if exists %I on %I.%I;', rec.tgname, rec.nspname, rec.relname);
  end loop;
end $$;

-- Create triggers on all relevant tables
create trigger trg_pre_induction_status_personal
  after insert or update or delete on public.pre_induction_personal
  for each row execute function public.fn_pre_induction_status_trigger();

create trigger trg_pre_induction_status_rtw
  after insert or update or delete on public.pre_induction_right_to_work
  for each row execute function public.fn_pre_induction_status_trigger();

create trigger trg_pre_induction_status_certifications
  after insert or update or delete on public.pre_induction_certifications
  for each row execute function public.fn_pre_induction_status_trigger();

create trigger trg_pre_induction_status_medical
  after insert or update or delete on public.pre_induction_medical
  for each row execute function public.fn_pre_induction_status_trigger();

create trigger trg_pre_induction_status_training
  after insert or update or delete on public.pre_induction_training
  for each row execute function public.fn_pre_induction_status_trigger();

create trigger trg_pre_induction_status_competency
  after insert or update or delete on public.pre_induction_competency_card
  for each row execute function public.fn_pre_induction_status_trigger();

create trigger trg_pre_induction_status_declarations
  after insert or update or delete on public.pre_induction_declarations
  for each row execute function public.fn_pre_induction_status_trigger();
