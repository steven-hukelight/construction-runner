-- Add serial_number to assets if missing (for API compatibility)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS serial_number TEXT;
