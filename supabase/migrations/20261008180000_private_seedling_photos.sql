-- 2026-10-08 board 9 (T125, P15): a private seedling's photos are private too.
-- Files go to a private bucket (read with short-lived signed URLs by the owner); the photo rows of a private
-- entry are readable only by their uploader and admins. Before, the bucket was public and the rows open to all.

insert into storage.buckets (id, name, public)
values ('private-images', 'private-images', false)
on conflict (id) do update set public = false;

drop policy if exists "Private images upload own" on storage.objects;
create policy "Private images upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'private-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Private images read own" on storage.objects;
create policy "Private images read own" on storage.objects for select to authenticated
  using (bucket_id = 'private-images' and (owner_id = auth.uid()::text or (storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "Private images delete own" on storage.objects;
create policy "Private images delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'private-images' and (owner_id = auth.uid()::text or public.is_admin()));

-- is this photo row of a private entry? (security definer: a private entry is invisible to the caller)
create or replace function public.image_is_private(p_cultivar_name text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.cultivars c
     where c.is_private
       and c.cultivar_name in (p_cultivar_name, p_cultivar_name || ' [Seedling]')
  );
$$;
revoke all on function public.image_is_private(text) from public;
grant execute on function public.image_is_private(text) to anon, authenticated;

drop policy if exists "Anyone can read images" on public.cultivar_images;
drop policy if exists "Anyone can view images" on public.cultivar_images;
drop policy if exists "Read images of public entries" on public.cultivar_images;
create policy "Read images of public entries" on public.cultivar_images for select
  using (not public.image_is_private(cultivar_name) or user_id = auth.uid() or public.is_admin());
