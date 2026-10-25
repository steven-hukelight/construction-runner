-- Make medical, certifications and training private. All access goes through the API,
-- which uses the service role and issues short-lived signed URLs (/api/storage/signed-url).
update storage.buckets
   set public = false
 where id in ('medical', 'certifications', 'training');

-- Store signature references as "bucket/path" instead of public URLs that do not open
-- (company_documents is private). Readers accept both forms.
update public.rams_acknowledgements
   set signature_url = regexp_replace(signature_url, '^.*/storage/v1/object/public/', '')
 where signature_url like '%/storage/v1/object/public/company_documents/%';

update public.briefing_acknowledgements
   set signature_url = regexp_replace(signature_url, '^.*/storage/v1/object/public/', '')
 where signature_url like '%/storage/v1/object/public/company_documents/%';

update public.medical_records
   set file_url = regexp_replace(file_url, '^.*/storage/v1/object/public/', '')
 where file_url like '%/storage/v1/object/public/medical/%';
