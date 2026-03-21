-- Fix handle_new_user trigger: "Database error creating new user" when adding users in Supabase Auth
-- Causes: type mismatch (companies.id TEXT vs uuid), empty companies table, or search_path issues
-- Per Supabase docs: use SET search_path = '' for SECURITY DEFINER, qualify all table names

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  default_company_id text;
BEGIN
  -- Get first company id (handles empty table, type mismatches)
  BEGIN
    SELECT id::text INTO default_company_id FROM public.companies LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    default_company_id := NULL;
  END;

  -- Insert into public.users (company_id may be UUID or TEXT depending on schema)
  -- Use COALESCE for email in case of phone-only signups
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'company_id'
  ) THEN
    INSERT INTO public.users (id, email, role, superuser, company_id)
    VALUES (
      new.id,
      COALESCE(new.email, new.phone::text, ''),
      COALESCE(new.raw_user_meta_data->>'role', 'ADMIN'),
      COALESCE((new.raw_user_meta_data->>'superuser')::boolean, false),
      default_company_id
    )
    ON CONFLICT (id) DO NOTHING;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'companyid'
  ) THEN
    INSERT INTO public.users (id, email, role, superuser, companyid)
    VALUES (
      new.id,
      COALESCE(new.email, new.phone::text, ''),
      COALESCE(new.raw_user_meta_data->>'role', 'ADMIN'),
      COALESCE((new.raw_user_meta_data->>'superuser')::boolean, false),
      default_company_id
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO public.users (id, email, role, superuser)
    VALUES (
      new.id,
      COALESCE(new.email, new.phone::text, ''),
      COALESCE(new.raw_user_meta_data->>'role', 'ADMIN'),
      COALESCE((new.raw_user_meta_data->>'superuser')::boolean, false)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', new.email, SQLERRM;
    RAISE;
END;
$$;
