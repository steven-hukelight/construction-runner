-- Add archived column to message_threads for Archive Thread feature
ALTER TABLE message_threads ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
