-- Add last_read_at to message_recipients for read tick display
ALTER TABLE message_recipients ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;
