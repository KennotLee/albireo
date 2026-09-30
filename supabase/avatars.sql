-- Run after schema.sql: Supabase dashboard -> SQL Editor -> New query -> Run.
--
-- FIRST create the bucket in the dashboard: Storage -> New bucket
--   Name:              avatars
--   Public bucket:     ON
--   File size limit:   1 MB          (uploads are resized to ~30KB, so this is slack)
--   Allowed MIME types: image/webp, image/jpeg, image/png
--
-- The bucket settings are the real limits. Client-side checks are a courtesy;
-- anyone can call the storage API directly.

-- The database stores only a pointer. The image itself lives in Storage.
alter table public.profiles
  add column if not exists avatar_url text;

-- Files are laid out as <user_id>/<filename>. Making the user id the first
-- path segment is what lets the policies below tell "your folder" from
-- everyone else's.

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can replace own avatar" on storage.objects;
create policy "Users can replace own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
