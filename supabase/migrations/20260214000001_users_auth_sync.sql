-- Migration: Allow company_id nullable for superusers + sync auth.users to public.users
-- Fixes: INSERT fails when company_id is NOT NULL but no company is provided for superusers

-- Step 1: Make company_id nullable (superusers may not belong to a company)
-- Handles both company_id (snake_case) and companyid (camelCase stored as lowercase)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN company_id DROP NOT NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'companyid'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN companyid DROP NOT NULL;
  END IF;
END $$;

-- Step 2: Ensure role has a default for new inserts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'ADMIN';
  END IF;
END $$;

-- Step 3: Create function to sync auth.users -> public.users on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_company_id uuid;
BEGIN
  -- Use first company as default for non-superusers (or NULL if no companies exist)
  SELECT id INTO default_company_id FROM public.companies LIMIT 1;

  -- Insert into public.users; handle both company_id and companyid column names
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'company_id'
  ) THEN
    INSERT INTO public.users (id, email, role, superuser, company_id)
    VALUES (
      new.id,
      new.email,
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
      new.email,
      COALESCE(new.raw_user_meta_data->>'role', 'ADMIN'),
      COALESCE((new.raw_user_meta_data->>'superuser')::boolean, false),
      default_company_id
    )
    ON CONFLICT (id) DO NOTHING;
  ELSE
    INSERT INTO public.users (id, email, role, superuser)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'role', 'ADMIN'),
      COALESCE((new.raw_user_meta_data->>'superuser')::boolean, false)
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

-- Step 4: Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
