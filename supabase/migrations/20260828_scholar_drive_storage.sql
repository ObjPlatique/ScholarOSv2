-- ScholarOS Drive Storage policies
-- Bucket: scholar-drive (private)
-- Object path convention: {auth.uid()}/{subject_id}/{filename}

create policy "scholar drive select own files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'scholar-drive'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "scholar drive insert own files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'scholar-drive'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "scholar drive update own files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'scholar-drive'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'scholar-drive'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "scholar drive delete own files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'scholar-drive'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
