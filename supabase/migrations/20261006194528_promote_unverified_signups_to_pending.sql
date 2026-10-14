-- Live mobile signup still hits the old OTP register API, which stores
-- EMAIL_UNVERIFIED. Admins only see PENDING / COMPANY_ADMIN_PENDING, and
-- the installed app has no code-entry screen. Promote immediately so
-- "admin will approve" matches the pending list.

CREATE OR REPLACE FUNCTION public.promote_signup_email_unverified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_status text;
BEGIN
  IF COALESCE(NEW.data->>'status', '') = 'EMAIL_UNVERIFIED' THEN
    next_status := COALESCE(NULLIF(NEW.data->>'pendingStatus', ''), 'PENDING');
    IF next_status NOT IN ('PENDING', 'COMPANY_ADMIN_PENDING') THEN
      next_status := 'PENDING';
    END IF;
    NEW.data := (COALESCE(NEW.data, '{}'::jsonb)
      - 'emailOtpHash'
      - 'emailOtpExpiresAt'
      - 'emailOtpAttempts'
      - 'emailOtpLastSentAt')
      || jsonb_build_object(
        'status', next_status,
        'emailVerified', true
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_signup_email_unverified ON public.registrations;
CREATE TRIGGER trg_promote_signup_email_unverified
BEFORE INSERT OR UPDATE OF data ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.promote_signup_email_unverified();

CREATE OR REPLACE FUNCTION public.confirm_pending_signup_auth_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid uuid;
  signup_email text;
BEGIN
  IF COALESCE(NEW.data->>'status', '') NOT IN ('PENDING', 'COMPANY_ADMIN_PENDING') THEN
    RETURN NEW;
  END IF;

  BEGIN
    uid := NULLIF(NEW.data->>'authUserId', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    uid := NULL;
  END;

  signup_email := lower(trim(COALESCE(NEW.data->>'email', '')));

  IF uid IS NOT NULL THEN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = uid;
  ELSIF signup_email <> '' THEN
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE lower(email) = signup_email;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_confirm_pending_signup_auth_email ON public.registrations;
CREATE TRIGGER trg_confirm_pending_signup_auth_email
AFTER INSERT OR UPDATE OF data ON public.registrations
FOR EACH ROW
EXECUTE FUNCTION public.confirm_pending_signup_auth_email();

UPDATE public.registrations r
SET data = (COALESCE(r.data, '{}'::jsonb)
      - 'emailOtpHash'
      - 'emailOtpExpiresAt'
      - 'emailOtpAttempts'
      - 'emailOtpLastSentAt')
    || jsonb_build_object(
      'status',
      CASE
        WHEN COALESCE(NULLIF(r.data->>'pendingStatus', ''), '') IN ('PENDING', 'COMPANY_ADMIN_PENDING')
          THEN r.data->>'pendingStatus'
        ELSE 'PENDING'
      END,
      'emailVerified', true
    )
WHERE r.data->>'status' = 'EMAIL_UNVERIFIED';
