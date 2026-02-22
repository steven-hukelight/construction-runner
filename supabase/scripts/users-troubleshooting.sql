-- Users Table Troubleshooting Scripts
-- Run these in Supabase SQL Editor to diagnose and fix users/auth sync issues

-- =============================================================================
-- 1. Check which columns are NOT NULL and their defaults
-- =============================================================================
SELECT column_name, is_nullable, column_default, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;

-- =============================================================================
-- 2. Inspect constraints (NOT NULL, PK, FK)
-- =============================================================================
SELECT attname AS column_name, attnotnull AS is_not_null
FROM pg_attribute
WHERE attrelid = 'public.users'::regclass
  AND attnum > 0
  AND NOT attisdropped;

-- =============================================================================
-- 3. Manual backfill: Insert a specific auth user into public.users
-- Replace <company_uuid> with a real company ID, or use (SELECT id FROM companies LIMIT 1)
-- For superusers without a company, use NULL if company_id is nullable
-- =============================================================================

-- Option A: With company (use when company_id is NOT NULL)
-- INSERT INTO users (id, email, role, superuser, company_id)
-- SELECT id, email, 'ADMIN', true, (SELECT id FROM companies LIMIT 1)
-- FROM auth.users
-- WHERE email = 'steven_hukelight@yahoo.co.uk'
-- ON CONFLICT (id) DO NOTHING;

-- Option B: Superuser without company (use when company_id allows NULL)
-- Uncomment and run after making company_id nullable (see section 4)
-- INSERT INTO users (id, email, role, superuser, company_id)
-- SELECT
--   id,
--   email,
--   COALESCE((raw_user_meta_data->>'role'), 'ADMIN'),
--   COALESCE((raw_user_meta_data->>'superuser')::boolean, true),
--   (SELECT id FROM companies LIMIT 1)  -- or NULL if superuser and column is nullable
-- FROM auth.users
-- WHERE email = 'steven_hukelight@yahoo.co.uk'
-- ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. Make company_id nullable (if business logic allows users without a company)
-- =============================================================================
-- ALTER TABLE users ALTER COLUMN company_id DROP NOT NULL;
-- OR if column is named companyid:
-- ALTER TABLE users ALTER COLUMN companyid DROP NOT NULL;

-- =============================================================================
-- 5. Backfill ALL auth.users not yet in public.users
-- =============================================================================
-- INSERT INTO users (id, email, role, superuser, company_id)
-- SELECT
--   u.id,
--   u.email,
--   COALESCE((u.raw_user_meta_data->>'role'), 'ADMIN'),
--   COALESCE((u.raw_user_meta_data->>'superuser')::boolean, false),
--   (SELECT id FROM companies LIMIT 1)
-- FROM auth.users u
-- WHERE NOT EXISTS (SELECT 1 FROM users pu WHERE pu.id = u.id)
--   AND u.email IS NOT NULL
-- ON CONFLICT (id) DO NOTHING;
