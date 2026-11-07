-- A company can upload its own video for a training module. It replaces the default video or
-- publisher link for that company's people only. Files live in the private training-videos
-- bucket under companies/{company_id}/{module_id}/.

alter table public.company_training_modules
  add column if not exists video_path text,
  add column if not exists video_name text;
