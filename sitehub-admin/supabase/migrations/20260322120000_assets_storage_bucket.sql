-- Bucket used by POST /api/assets/[id]/upload-images (service role uploads).
-- Without this row, storage uploads fail and no rows are written to asset_documents.

INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', false)
ON CONFLICT (id) DO NOTHING;
