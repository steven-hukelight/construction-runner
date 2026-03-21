-- Auto-update pre_induction_status and compliance_score when pre-induction tables change
-- Mirrors app/api/pre-induction/[userId]/_utils/status.ts logic but runs in the DB.

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
  new_status text := 'not_started';  -- avoid conflict with users.status column
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

  rtw_complete := rtw is not null and (
    coalesce(rtw.right_to_work_verified, false) = true
    or (rtw.passport_url is not null and trim(rtw.passport_url) <> '')
    or (rtw.visa_url is not null and trim(rtw.visa_url) <> '')
  );

  competency_complete := competency is not null and (
    (competency.card_number is not null and trim(competency.card_number) <> '')
    or (competency.file_url is not null and trim(competency.file_url) <> '')
  );

  medical_complete := medical is not null and (
    coalesce(medical.medical_verified, false) = true
    or medical.fit_to_work is not null
    or (medical.medical_declaration is not null and trim(medical.medical_declaration) <> '')
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

create or replace function public.pre_induction_status_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.update_pre_induction_status_for_user(coalesce(new.user_id, old.user_id));
  return new;
end;
$$;

-- Attach triggers to all pre-induction tables
DO $$
BEGIN
  IF to_regclass('public.pre_induction_personal') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_pre_induction_personal_status ON public.pre_induction_personal;
    CREATE TRIGGER trg_pre_induction_personal_status
    AFTER INSERT OR UPDATE OR DELETE ON public.pre_induction_personal
    FOR EACH ROW EXECUTE FUNCTION public.pre_induction_status_trigger();
  END IF;

  IF to_regclass('public.pre_induction_right_to_work') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_pre_induction_rtw_status ON public.pre_induction_right_to_work;
    CREATE TRIGGER trg_pre_induction_rtw_status
    AFTER INSERT OR UPDATE OR DELETE ON public.pre_induction_right_to_work
    FOR EACH ROW EXECUTE FUNCTION public.pre_induction_status_trigger();
  END IF;

  IF to_regclass('public.pre_induction_certifications') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_pre_induction_certs_status ON public.pre_induction_certifications;
    CREATE TRIGGER trg_pre_induction_certs_status
    AFTER INSERT OR UPDATE OR DELETE ON public.pre_induction_certifications
    FOR EACH ROW EXECUTE FUNCTION public.pre_induction_status_trigger();
  END IF;

  IF to_regclass('public.pre_induction_competency_card') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_pre_induction_competency_status ON public.pre_induction_competency_card;
    CREATE TRIGGER trg_pre_induction_competency_status
    AFTER INSERT OR UPDATE OR DELETE ON public.pre_induction_competency_card
    FOR EACH ROW EXECUTE FUNCTION public.pre_induction_status_trigger();
  END IF;

  IF to_regclass('public.pre_induction_medical') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_pre_induction_medical_status ON public.pre_induction_medical;
    CREATE TRIGGER trg_pre_induction_medical_status
    AFTER INSERT OR UPDATE OR DELETE ON public.pre_induction_medical
    FOR EACH ROW EXECUTE FUNCTION public.pre_induction_status_trigger();
  END IF;

  IF to_regclass('public.pre_induction_training') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_pre_induction_training_status ON public.pre_induction_training;
    CREATE TRIGGER trg_pre_induction_training_status
    AFTER INSERT OR UPDATE OR DELETE ON public.pre_induction_training
    FOR EACH ROW EXECUTE FUNCTION public.pre_induction_status_trigger();
  END IF;

  IF to_regclass('public.pre_induction_declarations') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_pre_induction_declarations_status ON public.pre_induction_declarations;
    CREATE TRIGGER trg_pre_induction_declarations_status
    AFTER INSERT OR UPDATE OR DELETE ON public.pre_induction_declarations
    FOR EACH ROW EXECUTE FUNCTION public.pre_induction_status_trigger();
  END IF;
END$$;
