-- Backfill pre_induction_status and compliance_score for all users
-- Requires fn_update_pre_induction_status to exist

do $$
begin
  perform fn_update_pre_induction_status(u.id)
  from users u;
end $$;
