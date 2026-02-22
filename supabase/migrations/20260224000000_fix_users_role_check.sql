-- Fix users_role_check: the constraint was blocking role updates.
-- Drop the restrictive constraint and add a permissive one that accepts any case.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Allow all app roles (case-insensitive): admin, supervisor, operative, superuser, sub_admin, viewer
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IS NULL
  OR LOWER(TRIM(role)) IN ('admin', 'supervisor', 'operative', 'superuser', 'sub_admin', 'viewer')
);
