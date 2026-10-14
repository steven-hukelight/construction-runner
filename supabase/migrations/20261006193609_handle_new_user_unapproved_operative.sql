-- New auth users must not become company admins or skip approval.
-- Role and company are set by register/provisioning after this insert.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, superuser, approved, company_id)
  VALUES (
    new.id,
    COALESCE(new.email, new.phone::text, ''),
    'operative',
    false,
    false,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for %: %', new.email, SQLERRM;
    RAISE;
END;
$$;
