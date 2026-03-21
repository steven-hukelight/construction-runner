-- Medical: fit_to_work = true overrides document requirement (mirrors status.ts)
-- Right to Work: passport OR visa (either one sufficient) - comment only, logic unchanged
create or replace function public.update_pre_induction_status_for_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  personal record;
  rtw record;
  competency record;
  medical record;
  training record;
  declarations record;
  personal_complete boolean := false;
  rtw_complete boolean := false;
  competency_complete boolean := false;
  medical_complete boolean := false;
  declarations_complete boolean := false;
  has_any boolean := false;
  new_status text := 'not_started';
  score integer := 0;
  rams_required boolean := false;
begin
  select * into personal from pre_induction_personal where user_id = target_user_id;
  select * into rtw from pre_induction_right_to_work where user_id = target_user_id;
  select * into competency from pre_induction_competency_card where user_id = target_user_id;
  select * into medical from pre_induction_medical where user_id = target_user_id;
  select * into training from pre_induction_training where user_id = target_user_id;
  select * into declarations from pre_induction_declarations where user_id = target_user_id;

  has_any := personal is not null or rtw is not null or competency is not null or medical is not null or training is not null or declarations is not null;

  personal_complete := personal is not null and ((personal.full_name is not null and trim(personal.full_name) <> '') or (personal.email is not null and trim(personal.email) <> ''));

  -- Right to Work: (passport OR visa) AND proof_of_address required
  rtw_complete := rtw is not null and (
    coalesce(rtw.right_to_work_verified, false) = true
    or (
      ((rtw.passport_url is not null and trim(rtw.passport_url) <> '') or (rtw.visa_url is not null and trim(rtw.visa_url) <> ''))
      and (rtw.proof_of_address_url is not null and trim(rtw.proof_of_address_url) <> '')
    )
  );

  -- Competency Card: BOTH document AND card number required
  competency_complete := competency is not null and (
    (competency.card_number is not null and trim(competency.card_number) <> '')
    and (competency.file_url is not null and trim(competency.file_url) <> '')
  );

  -- Fit to work ticked (true) overrides document; otherwise need certificate
  medical_complete := medical is not null and (
    coalesce(medical.medical_verified, false) = true
    or (medical.fit_to_work is true or coalesce(medical.fit_to_work::text, '') = 'true')
    or (medical.medical_certificate_url is not null and trim(medical.medical_certificate_url) <> '')
  );

  declarations_complete := declarations is not null and coalesce(declarations.operative_declaration_accepted, false) = true;

  if personal_complete and rtw_complete and competency_complete and medical_complete and declarations_complete then
    new_status := 'complete';
  elsif has_any then
    new_status := 'in_progress';
  end if;

  if coalesce(rtw.right_to_work_verified, false) then score := score + 30; end if;
  if coalesce(medical.medical_verified, false) then score := score + 20; end if;
  if competency_complete then score := score + 20; end if;
  if declarations_complete then score := score + 10; end if;

  if training is not null then
    rams_required := coalesce(training.rams_required_version is not null, false)
      or training.rams_required_version_by_site is not null
      or coalesce(training.rams_required_version, '') <> '';

    if rams_required then
      if coalesce(training.rams_accepted, false) and (training.rams_version is not null) and (training.rams_version = training.rams_required_version or training.rams_required_version is null) then
        score := score + 10;
      elsif coalesce(training.rams_accepted, false) then
        score := score - 10;
      else
        score := score - 20;
      end if;
    end if;
  end if;

  update users
  set pre_induction_status = new_status,
      compliance_score = greatest(0, least(100, score))
  where id = target_user_id;
end;
$$;
