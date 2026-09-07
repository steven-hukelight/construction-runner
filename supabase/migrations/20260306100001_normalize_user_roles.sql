-- Normalize user roles to lowercase for consistency (admin, operative, supervisor, superuser)
UPDATE users SET role = LOWER(role) WHERE role IS NOT NULL AND role != LOWER(role);
