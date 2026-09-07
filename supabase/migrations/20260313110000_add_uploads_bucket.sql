-- Add uploads bucket for task attachments, certifications, site rules, etc.
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', false)
ON CONFLICT (id) DO NOTHING;
