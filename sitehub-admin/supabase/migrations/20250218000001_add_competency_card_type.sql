-- Add card_type to pre_induction_competency_card
ALTER TABLE pre_induction_competency_card
  ADD COLUMN IF NOT EXISTS card_type TEXT DEFAULT 'CSCS';
