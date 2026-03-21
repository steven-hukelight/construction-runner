-- Add notes column to attendance (used when signing in/out)
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS notes TEXT;
