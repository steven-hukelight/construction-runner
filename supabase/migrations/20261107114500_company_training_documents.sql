-- A company can give a module a PDF instead of a video, for topics with no video available.
-- The worker reads it in the app, then takes the same quiz. A company has one or the other:
-- uploading a video clears the document and the reverse.

alter table public.company_training_modules
  add column if not exists document_path text,
  add column if not exists document_name text;

alter table public.company_training_modules
  drop constraint if exists company_training_modules_one_material,
  add constraint company_training_modules_one_material check (video_path is null or document_path is null);

alter table public.training_video_views
  drop constraint if exists training_video_views_source_check,
  add constraint training_video_views_source_check check (source in ('bucket', 'external', 'document'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('training-documents', 'training-documents', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
