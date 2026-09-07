-- Company logos for Settings + RAMS/Briefing PDFs (API uploads via service role)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;
