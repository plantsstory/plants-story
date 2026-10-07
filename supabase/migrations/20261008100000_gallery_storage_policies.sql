-- 2026-10-08: photo files could be uploaded and deleted by anyone, without logging in
-- (prototype policies on storage.objects that the 2026-09-05 hardening did not cover).
-- Reading stays public; writing needs a login; deleting or replacing is the uploader's or an admin's.
begin;
drop policy if exists "Allow public upload 1ndp9hv_0" on storage.objects;
drop policy if exists "Allow public delete 1ndp9hv_0" on storage.objects;
drop policy if exists "Allow public delete 1ndp9hv_1" on storage.objects;  -- a SELECT policy under a delete name; "Allow public read" covers reading

drop policy if exists "Gallery upload by members" on storage.objects;
create policy "Gallery upload by members" on storage.objects for insert to authenticated
  with check (bucket_id = 'gallery-images' and auth.uid() is not null);

drop policy if exists "Gallery replace own" on storage.objects;
create policy "Gallery replace own" on storage.objects for update to authenticated
  using (bucket_id = 'gallery-images' and (owner_id = auth.uid()::text or public.is_admin()))
  with check (bucket_id = 'gallery-images' and (owner_id = auth.uid()::text or public.is_admin()));

drop policy if exists "Gallery delete own" on storage.objects;
create policy "Gallery delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'gallery-images' and (owner_id = auth.uid()::text or public.is_admin()));
commit;
