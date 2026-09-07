-- Add uploaded_by to asset_documents for tracking who uploaded each image
ALTER TABLE asset_documents
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_asset_documents_uploaded_by ON asset_documents(uploaded_by);
