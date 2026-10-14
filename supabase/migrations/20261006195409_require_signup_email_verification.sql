-- Signup must prove the inbox exists before the admin pending queue.
-- The previous trigger promoted EMAIL_UNVERIFIED immediately, so fake
-- addresses appeared as pending and approval could mint a temp password.

DROP TRIGGER IF EXISTS trg_promote_signup_email_unverified ON public.registrations;
DROP FUNCTION IF EXISTS public.promote_signup_email_unverified();

CREATE OR REPLACE FUNCTION public.auth_user_id_by_email(search_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(trim(search_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.auth_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_id_by_email(text) TO service_role;
