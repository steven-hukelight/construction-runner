-- Pre-induction competency card section
CREATE TABLE IF NOT EXISTS pre_induction_competency_card (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  card_number TEXT,
  expiry TIMESTAMPTZ,
  file_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (backend uses service role; policies for direct client access)
ALTER TABLE pre_induction_competency_card ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read competency card" ON pre_induction_competency_card FOR SELECT USING (true);
CREATE POLICY "Allow insert competency card" ON pre_induction_competency_card FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update competency card" ON pre_induction_competency_card FOR UPDATE USING (true);
