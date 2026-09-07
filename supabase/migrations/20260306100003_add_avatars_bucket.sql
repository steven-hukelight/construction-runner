-- Add avatars storage bucket for operative profile photos (used by /api/operative/avatar)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']::text[])
ON CONFLICT (id) DO NOTHING;

-- Service role uploads via API; public read for avatar URLs
-- No RLS policies needed: service_role bypasses RLS, bucket is public for GET
