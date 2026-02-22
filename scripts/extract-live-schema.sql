-- Run this in Supabase Dashboard → SQL Editor
-- Option 1: Run the query below and copy the JSON result → save as live_schema.json
-- Option 2: Use DATABASE_URL with: node scripts/drift-audit.mjs (no need for this file)

-- Single JSON output (copy the cell content and save as live_schema.json):
SELECT json_build_object(
  'tables', COALESCE(
    (SELECT json_object_agg(tablename, row_data)
     FROM (
       SELECT
         t.table_name AS tablename,
         json_build_object(
           'columns', COALESCE(
             (SELECT json_object_agg(c.column_name, json_build_object(
               'data_type', c.data_type,
               'udt_name', c.udt_name,
               'is_nullable', c.is_nullable = 'YES'
             ))
             FROM information_schema.columns c
             WHERE c.table_schema = 'public' AND c.table_name = t.table_name),
             '{}'::json
           ),
           'rls_enabled', (SELECT relrowsecurity FROM pg_class WHERE relname = t.table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')),
           'policies', COALESCE(
             (SELECT json_agg(json_build_object('name', policyname, 'cmd', cmd))
              FROM pg_policies WHERE tablename = t.table_name AND schemaname = 'public'),
             '[]'::json
           )
         ) AS row_data
       FROM information_schema.tables t
       WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
     ) sub),
    '{}'::json
  ),
  'indexes', COALESCE(
    (SELECT json_agg(json_build_object('tablename', tablename, 'indexname', indexname, 'indexdef', indexdef))
     FROM pg_indexes WHERE schemaname = 'public'),
    '[]'::json
  ),
  'rls', COALESCE(
    (SELECT json_object_agg(c.relname, c.relrowsecurity)
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'),
    '{}'::json
  ),
  'policies', COALESCE(
    (SELECT json_agg(json_build_object('tablename', tablename, 'policyname', policyname, 'cmd', cmd))
     FROM pg_policies WHERE schemaname = 'public'),
    '[]'::json
  )
) AS schema_json;
