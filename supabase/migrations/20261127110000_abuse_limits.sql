-- 2026-11-27 limits on the open forms and uploads before the public announcement
-- (live definitions read 2026-11-26; these replace them)
--   * log_client_error / submit_deletion_request: callable by anyone, no limit or length cap
--   * submit_contact_message: limited per email only, so a new address each time got through
--   * gallery-images / private-images buckets: no size, type or count limit
--   * cultivar_images.link_url: any text, shown as a link on the photo

-- ---------- 1. error log: per user 30/hour, whole site 300/hour, fields capped ----------
create index if not exists error_logs_created_at_idx on public.error_logs (created_at desc);

create or replace function public.log_client_error(
  p_message text, p_source text default null, p_lineno integer default null, p_colno integer default null,
  p_stack text default null, p_url text default null, p_user_agent text default null)
returns void
language plpgsql
security definer
set statement_timeout to '10s'
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_n int;
begin
  if v_uid is not null then
    select count(*) into v_n from error_logs where user_id = v_uid and created_at > now() - interval '1 hour';
    if v_n >= 30 then return; end if;
  end if;
  select count(*) into v_n from error_logs where created_at > now() - interval '1 hour';
  if v_n >= 300 then return; end if;
  insert into error_logs (message, source, lineno, colno, stack, url, user_agent, user_id)
  values (left(p_message, 2000), left(p_source, 500), p_lineno, p_colno, left(p_stack, 8000),
          left(p_url, 1000), left(p_user_agent, 500), v_uid);
end;
$$;

-- ---------- 2. deletion requests: known kinds only, one open request per item, per user 10/hour, site 50/hour ----------
create index if not exists deletion_requests_created_at_idx on public.deletion_requests (created_at desc);

create or replace function public.submit_deletion_request(
  p_target_type text, p_target_id text, p_target_name text default null,
  p_reason text default null, p_reason_detail text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
set statement_timeout to '10s'
as $$
declare
  v_id bigint;
  v_uid uuid := auth.uid();
  v_n int;
begin
  if p_target_type is null or p_target_type not in ('cultivar', 'image')
     or p_target_id is null or length(p_target_id) = 0 or length(p_target_id) > 100 then
    return jsonb_build_object('success', false, 'error', '送信内容が正しくありません');
  end if;
  -- the same item already has an open request from the last day: no second row
  select id into v_id from deletion_requests
   where target_type = p_target_type and target_id = p_target_id
     and resolved_at is null and created_at > now() - interval '1 day'
   order by id desc limit 1;
  if v_id is not null then
    return jsonb_build_object('success', true, 'id', v_id);
  end if;
  if v_uid is not null then
    select count(*) into v_n from deletion_requests where user_id = v_uid and created_at > now() - interval '1 hour';
    if v_n >= 10 then
      return jsonb_build_object('success', false, 'error', '短時間に送信が多すぎます。時間をおいてお試しください');
    end if;
  end if;
  select count(*) into v_n from deletion_requests where created_at > now() - interval '1 hour';
  if v_n >= 50 then
    return jsonb_build_object('success', false, 'error', '短時間に送信が多すぎます。時間をおいてお試しください');
  end if;

  insert into deletion_requests (target_type, target_id, target_name, reason, reason_detail, user_id)
  values (p_target_type, p_target_id, left(p_target_name, 300), left(p_reason, 50), left(p_reason_detail, 2000), v_uid)
  returning id into v_id;
  return jsonb_build_object('success', true, 'id', v_id);
end;
$$;

-- ---------- 3. contact form: also per sender address 5/hour and whole site 30/hour ----------
create or replace function public.submit_contact_message(p_name text, p_email text, p_category text, p_message text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_recent int;
  v_id bigint;
  v_ip text;
begin
  if p_name is null or length(trim(p_name)) = 0 or length(p_name) > 100 then
    return jsonb_build_object('success', false, 'error', 'Invalid name');
  end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 255 then
    return jsonb_build_object('success', false, 'error', 'Invalid email');
  end if;
  if p_message is null or length(trim(p_message)) = 0 or length(p_message) > 5000 then
    return jsonb_build_object('success', false, 'error', 'Invalid message');
  end if;
  if p_category is null or p_category not in ('general', 'copyright', 'deletion', 'bug', 'shop') then
    p_category := 'general';
  end if;

  -- the caller's address for abuse checks (cleared with the other IP columns after 180 days)
  begin
    v_ip := nullif(trim(split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1)), '');
  exception when others then
    v_ip := null;
  end;

  -- Rate limits: 5 an hour per email address, 5 an hour per sender address, 30 an hour for the whole site
  select count(*) into v_recent
    from contact_messages
   where email = p_email and created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    return jsonb_build_object('success', false, 'error', 'Rate limited');
  end if;
  if v_ip is not null then
    select count(*) into v_recent
      from contact_messages
     where created_ip = v_ip and created_at > now() - interval '1 hour';
    if v_recent >= 5 then
      return jsonb_build_object('success', false, 'error', 'Rate limited');
    end if;
  end if;
  select count(*) into v_recent
    from contact_messages
   where created_at > now() - interval '1 hour';
  if v_recent >= 30 then
    return jsonb_build_object('success', false, 'error', 'Rate limited');
  end if;

  insert into contact_messages (name, email, category, message, created_ip)
  values (trim(p_name), p_email, p_category, trim(p_message), v_ip)
  returning id into v_id;

  return jsonb_build_object('success', true, 'id', v_id);
end;
$$;

-- ---------- 4. photos: 10 MB, pictures only, 60 a day per member (admins unlimited) ----------
update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id in ('gallery-images', 'private-images');

create or replace function public.photo_upload_allowed(p_bucket text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_admin()
      or (select count(*) from storage.objects o
           where o.bucket_id = p_bucket and o.owner_id = auth.uid()::text
             and o.created_at > now() - interval '1 day') < 60
$$;
revoke all on function public.photo_upload_allowed(text) from public, anon;
grant execute on function public.photo_upload_allowed(text) to authenticated;

drop policy if exists "Photo upload daily limit" on storage.objects;
create policy "Photo upload daily limit" on storage.objects
  as restrictive for insert to authenticated
  with check (bucket_id not in ('gallery-images', 'private-images') or public.photo_upload_allowed(bucket_id));

create or replace function public.photo_row_allowed()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_admin()
      or (select count(*) from public.cultivar_images i
           where i.user_id = auth.uid() and i.created_at > now() - interval '1 day') < 60
$$;
revoke all on function public.photo_row_allowed() from public, anon;
grant execute on function public.photo_row_allowed() to authenticated;

drop policy if exists "Photo rows daily limit" on public.cultivar_images;
create policy "Photo rows daily limit" on public.cultivar_images
  as restrictive for insert to authenticated
  with check (public.photo_row_allowed());

-- ---------- 5. a photo's link is a web address (http or https) ----------
alter table public.cultivar_images drop constraint if exists cultivar_images_link_url_web;
alter table public.cultivar_images add constraint cultivar_images_link_url_web
  check (link_url is null or link_url = '' or (length(link_url) <= 500 and link_url ~* '^https?://[^\s<>"]+$'));

-- ---------- check (read only) ----------
-- select id, file_size_limit, allowed_mime_types from storage.buckets;
-- select policyname, permissive, cmd from pg_policies where policyname like '%daily limit%';
