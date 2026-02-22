-- Add action column to attendance so sign-in/sign-out is persisted and displayed correctly
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS action TEXT;
