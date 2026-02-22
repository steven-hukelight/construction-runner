-- Ensure companies has invite_code for company invite flow
ALTER TABLE companies ADD COLUMN IF NOT EXISTS invite_code TEXT;
