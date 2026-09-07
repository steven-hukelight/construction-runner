-- Add rams and briefings storage buckets (used by upload APIs)
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('rams', 'rams', false),
  ('briefings', 'briefings', false)
ON CONFLICT (id) DO NOTHING;
