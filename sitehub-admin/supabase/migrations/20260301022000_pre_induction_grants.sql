-- Ensure authenticated role has privileges on pre-induction tables (RLS still enforced)

grant usage on schema public to authenticated;

grant select, insert, update, delete on 
  public.pre_induction_personal,
  public.pre_induction_right_to_work,
  public.pre_induction_certifications,
  public.pre_induction_medical,
  public.pre_induction_training,
  public.pre_induction_declarations,
  public.pre_induction_competency_card,
  public.user_pre_induction_profile
to authenticated;
