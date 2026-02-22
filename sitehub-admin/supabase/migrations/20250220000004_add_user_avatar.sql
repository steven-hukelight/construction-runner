-- Add avatar column to users for profile photo (personal info)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
