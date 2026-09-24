-- Inspection schedule fields on assets (intervals + due dates).
-- Reminders (push) can be layered later; web overdue UI uses next_inspection_due.

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS inspection_interval_days integer,
  ADD COLUMN IF NOT EXISTS last_inspected_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_inspection_due date,
  ADD COLUMN IF NOT EXISTS inspection_reminder_days_before integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS inspection_required boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.assets.inspection_interval_days IS
  'Days between inspections (e.g. 7, 90, 365). NULL = no scheduled inspections.';
COMMENT ON COLUMN public.assets.next_inspection_due IS
  'Next date an inspection is required. Rolled forward when a completed inspection is recorded.';
COMMENT ON COLUMN public.assets.inspection_reminder_days_before IS
  'How many days before next_inspection_due to treat as due-soon (default 7).';

CREATE INDEX IF NOT EXISTS idx_assets_next_inspection_due
  ON public.assets (company_id, next_inspection_due)
  WHERE next_inspection_due IS NOT NULL AND inspection_required = true;
