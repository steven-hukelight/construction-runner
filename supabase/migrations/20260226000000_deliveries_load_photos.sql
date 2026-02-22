-- Add load_photos (jsonb array) for multiple load photos; ensure pod_url exists
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pod_url TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS load_url TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS load_photos JSONB DEFAULT '[]';
