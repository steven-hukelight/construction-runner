-- Fix schema drift: some pre_induction columns were added as TEXT but triggers expect BOOLEAN.
-- PostgREST error: "coalesce types text and boolean cannot be matched" (42804)
-- Converts TEXT columns to BOOLEAN, handling existing 'true'/'false' string values.

-- Helper: convert text/bool-like to boolean (works for TEXT or BOOLEAN columns)
CREATE OR REPLACE FUNCTION public._to_bool(val anyelement)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(trim(coalesce(val::text, ''))) IN ('true', 't', 'yes', '1');
$$;

-- pre_induction_medical
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pre_induction_medical'
    AND column_name = 'fit_to_work' AND data_type = 'text'
  ) THEN
    ALTER TABLE pre_induction_medical
      ALTER COLUMN fit_to_work TYPE boolean USING public._to_bool(fit_to_work);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pre_induction_medical'
    AND column_name = 'medical_verified' AND data_type = 'text'
  ) THEN
    ALTER TABLE pre_induction_medical
      ALTER COLUMN medical_verified TYPE boolean USING public._to_bool(medical_verified);
  END IF;
END $$;

-- pre_induction_right_to_work
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pre_induction_right_to_work'
    AND column_name = 'right_to_work_verified' AND data_type = 'text'
  ) THEN
    ALTER TABLE pre_induction_right_to_work
      ALTER COLUMN right_to_work_verified TYPE boolean USING public._to_bool(right_to_work_verified);
  END IF;
END $$;

-- pre_induction_declarations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pre_induction_declarations'
    AND column_name = 'operative_declaration_accepted' AND data_type = 'text'
  ) THEN
    ALTER TABLE pre_induction_declarations
      ALTER COLUMN operative_declaration_accepted TYPE boolean USING public._to_bool(operative_declaration_accepted);
  END IF;
END $$;

DROP FUNCTION IF EXISTS public._to_bool(anyelement);
