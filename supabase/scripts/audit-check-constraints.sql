-- Audit: List all CHECK constraints in the public schema
-- Run this in Supabase SQL Editor to see what constraints exist.
-- If any block app writes, add a migration to drop/replace them.

SELECT
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON cc.constraint_name = tc.constraint_name
  AND cc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;
