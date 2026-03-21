-- Enable Supabase Realtime for pre-induction tables so the web admin reflects
-- changes made from the mobile app or other sessions.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'pre_induction_personal', 'pre_induction_right_to_work', 'pre_induction_certifications',
    'pre_induction_competency_card', 'pre_induction_medical', 'pre_induction_training',
    'pre_induction_declarations'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- table may already be in publication or table doesn't exist
    END;
  END LOOP;
END;
$$;
