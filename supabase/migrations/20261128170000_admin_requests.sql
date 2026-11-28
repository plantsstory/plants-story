-- 2026-11-28 (Yuta): admin tools for takedown requests and 発信者情報開示請求, built on what already exists.
--   受付簿 (admin_cases)        a request with its kind, requester, deadline, the item and the poster, and what was decided.
--                               Started from an お問い合わせ or a 報告 card, or typed in.
--   投稿者への照会               part of a 受付: when the poster was asked, the reply deadline and the reply.
--   利用停止 (account_suspensions) a stopped account cannot post, edit, add photos or change its profile.
--                               It can still sign in, read, delete its own posts and use お問い合わせ.
--   操作記録 (admin_actions)    every admin step below is written here automatically: 受付簿, 照会, 停止, 保全,
--                               報告 and お問い合わせ handled, entries and photos an admin deleted, and each look at
--                               a poster's account or post log. It holds no IP addresses and is kept.
--   通報                        the existing 報告 (deletion_requests) also takes a profile now.
-- Everything is admin only: the tables are closed to anon/authenticated (RLS on, no policies, no grants) and are
-- read and written through admin_* functions that check is_admin().
begin;

-- ---------- 操作記録 ----------
create table if not exists public.admin_actions (
  id bigserial primary key,
  at timestamptz not null default now(),
  admin_id uuid,
  admin_email text,
  action text not null,
  target_type text,                   -- 'case' | 'user' | 'cultivar' | 'image' | 'profile' | 'report' | 'contact'
  target_id text,
  detail jsonb
);
create index if not exists admin_actions_at_idx on public.admin_actions (at desc);
create index if not exists admin_actions_target_idx on public.admin_actions (target_type, target_id, at desc);
alter table public.admin_actions enable row level security;
revoke all on public.admin_actions from public, anon, authenticated;
revoke all on sequence public.admin_actions_id_seq from public, anon, authenticated;

create or replace function public.admin_log(p_action text, p_target_type text, p_target_id text, p_detail jsonb default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.admin_actions (admin_id, admin_email, action, target_type, target_id, detail)
  values (auth.uid(), (select u.email from auth.users u where u.id = auth.uid()), left(p_action, 50),
          left(p_target_type, 30), left(p_target_id, 200), p_detail);
end;
$$;
revoke all on function public.admin_log(text, text, text, jsonb) from public, anon, authenticated;

-- a look at someone's account or post log is written once per 10 minutes per person looked at
create or replace function public.admin_log_lookup(p_target_type text, p_target_id text, p_detail jsonb default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_target_id is null then return; end if;
  if exists (select 1 from public.admin_actions a
              where a.action = 'lookup' and a.admin_id is not distinct from auth.uid()
                and a.target_type = p_target_type and a.target_id = p_target_id
                and a.at > now() - interval '10 minutes') then
    return;
  end if;
  perform public.admin_log('lookup', p_target_type, p_target_id, p_detail);
end;
$$;
revoke all on function public.admin_log_lookup(text, text, jsonb) from public, anon, authenticated;

create or replace function public.admin_actions_list(p_action text default null, p_limit int default 100, p_offset int default 0)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
set statement_timeout to '10s'
as $$
declare
  v_total int;
  v_rows jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  select count(*) into v_total from public.admin_actions a where p_action is null or a.action like p_action || '%';
  select coalesce(jsonb_agg(to_jsonb(a) order by a.at desc, a.id desc), '[]'::jsonb) into v_rows
    from (select * from public.admin_actions a
           where p_action is null or a.action like p_action || '%'
           order by a.at desc, a.id desc
           limit greatest(1, least(coalesce(p_limit, 100), 500)) offset greatest(coalesce(p_offset, 0), 0)) a;
  return jsonb_build_object('success', true, 'total', v_total, 'rows', v_rows);
end;
$$;
revoke all on function public.admin_actions_list(text, int, int) from public, anon;
grant execute on function public.admin_actions_list(text, int, int) to authenticated;

-- ---------- 利用停止 ----------
create table if not exists public.account_suspensions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  reason text,
  since timestamptz not null default now(),
  until timestamptz,                  -- null: until lifted
  by_admin uuid,
  case_id bigint
);
alter table public.account_suspensions enable row level security;
revoke all on public.account_suspensions from public, anon, authenticated;

create or replace function public.is_suspended(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select p_uid is not null and exists (
    select 1 from public.account_suspensions s
     where s.user_id = p_uid and (s.until is null or s.until > now()))
$$;
revoke all on function public.is_suspended(uuid) from public, anon, authenticated;

-- the site asks this to show a stopped person why posting is closed
create or replace function public.my_suspension()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select case when public.is_suspended(auth.uid())
              then jsonb_build_object('suspended', true, 'until',
                     (select s.until from public.account_suspensions s where s.user_id = auth.uid()))
              else jsonb_build_object('suspended', false) end
$$;
revoke all on function public.my_suspension() from public, anon;
grant execute on function public.my_suspension() to authenticated;

-- posting, editing, photos and the profile: refused for a stopped account (runs before every other trigger,
-- and also under the security definer functions the site posts through). Deleting stays open.
create or replace function public.block_suspended_writer()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is not null and public.is_suspended(v_uid) and not public.is_admin() then
    raise exception using errcode = 'P0001', hint = 'account_suspended',
      message = 'このアカウントは利用を停止しているため、投稿や編集はできません。';
  end if;
  return new;
end;
$$;
revoke all on function public.block_suspended_writer() from public, anon, authenticated;

drop trigger if exists a_block_suspended_trg on public.cultivars;
create trigger a_block_suspended_trg before insert or update on public.cultivars
  for each row execute function public.block_suspended_writer();
drop trigger if exists a_block_suspended_trg on public.cultivar_images;
create trigger a_block_suspended_trg before insert or update on public.cultivar_images
  for each row execute function public.block_suspended_writer();
drop trigger if exists a_block_suspended_trg on public.profiles;
create trigger a_block_suspended_trg before insert or update on public.profiles
  for each row execute function public.block_suspended_writer();

-- photo files: the existing upload limit (10 MB, 60 a day) also refuses a stopped account
create or replace function public.photo_upload_allowed(p_bucket text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.is_admin()
      or (not public.is_suspended(auth.uid())
          and (select count(*) from storage.objects o
                where o.bucket_id = p_bucket and o.owner_id = auth.uid()::text
                  and o.created_at > now() - interval '1 day') < 60)
$$;
revoke all on function public.photo_upload_allowed(text) from public, anon;
grant execute on function public.photo_upload_allowed(text) to authenticated;

create or replace function public.admin_suspend(
  p_user uuid, p_on boolean default true, p_reason text default null, p_until timestamptz default null,
  p_case_id bigint default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if p_user is null or not exists (select 1 from auth.users u where u.id = p_user) then
    return jsonb_build_object('success', false, 'error', 'アカウントが見つかりません');
  end if;
  if coalesce(p_on, true) then
    if p_user = auth.uid() then
      return jsonb_build_object('success', false, 'error', '自分のアカウントは停止できません');
    end if;
    if exists (select 1 from auth.users u where u.id = p_user and u.raw_app_meta_data ->> 'role' = 'admin') then
      return jsonb_build_object('success', false, 'error', '管理者のアカウントは停止できません');
    end if;
    if p_until is not null and p_until <= now() then
      return jsonb_build_object('success', false, 'error', '停止の終わりが過去の日時です');
    end if;
    insert into public.account_suspensions (user_id, reason, until, by_admin, case_id)
    values (p_user, left(p_reason, 1000), p_until, auth.uid(), p_case_id)
    on conflict (user_id) do update
      set reason = excluded.reason, until = excluded.until, by_admin = excluded.by_admin,
          case_id = coalesce(excluded.case_id, account_suspensions.case_id), since = now();
    perform public.admin_log('suspend', 'user', p_user::text,
      jsonb_strip_nulls(jsonb_build_object('reason', left(p_reason, 1000), 'until', p_until, 'case_id', p_case_id)));
    return jsonb_build_object('success', true, 'suspended', true);
  end if;
  delete from public.account_suspensions where user_id = p_user;
  if found then
    perform public.admin_log('unsuspend', 'user', p_user::text,
      jsonb_strip_nulls(jsonb_build_object('reason', left(p_reason, 1000), 'case_id', p_case_id)));
  end if;
  return jsonb_build_object('success', true, 'suspended', false);
end;
$$;
revoke all on function public.admin_suspend(uuid, boolean, text, timestamptz, bigint) from public, anon;
grant execute on function public.admin_suspend(uuid, boolean, text, timestamptz, bigint) to authenticated;

create or replace function public.admin_suspensions()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'user_id', s.user_id, 'reason', s.reason, 'since', s.since, 'until', s.until, 'case_id', s.case_id,
             'active', s.until is null or s.until > now(),
             'email', u.email, 'display_name', p.display_name, 'username', p.username)
           order by s.since desc)
      from public.account_suspensions s
      left join auth.users u on u.id = s.user_id
      left join public.profiles p on p.id = s.user_id), '[]'::jsonb);
end;
$$;
revoke all on function public.admin_suspensions() from public, anon;
grant execute on function public.admin_suspensions() to authenticated;

-- ---------- 受付簿 ----------
create table if not exists public.admin_cases (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  kind text not null default 'takedown',      -- 削除の申出 / 発信者情報開示請求 / 警察・裁判所など / その他
  status text not null default 'open',        -- 受付 / 投稿者に照会中 / 対応済み / 見送り
  received_at timestamptz not null default now(),
  due_at timestamptz,
  requester text,
  requester_contact text,
  summary text,                               -- 申出の内容
  decision text,                              -- 判断とその理由
  item_type text,
  item_id text,
  item_label text,
  poster_id uuid,
  source_type text,                           -- 'contact' | 'report'
  source_id text,
  asked_at timestamptz,
  ask_due_at timestamptz,
  ask_reply text,
  ask_replied_at timestamptz,
  closed_at timestamptz,
  constraint admin_cases_kind check (kind in ('takedown', 'disclosure', 'authority', 'other')),
  constraint admin_cases_status check (status in ('open', 'asked', 'done', 'declined')),
  constraint admin_cases_item check (item_type is null or item_type in ('cultivar', 'image', 'profile')),
  constraint admin_cases_source check (source_type is null or source_type in ('contact', 'report'))
);
create index if not exists admin_cases_open_idx on public.admin_cases (status, due_at);
create index if not exists admin_cases_source_idx on public.admin_cases (source_type, source_id);
alter table public.admin_cases enable row level security;
revoke all on public.admin_cases from public, anon, authenticated;
revoke all on sequence public.admin_cases_id_seq from public, anon, authenticated;

-- the poster of an item: its user_id now, or the first poster the post log knows (the item may be gone)
create or replace function public.admin_item_poster(p_item_type text, p_item_id text)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v uuid;
begin
  if p_item_type = 'cultivar' then
    select c.user_id into v from public.cultivars c where c.id::text = p_item_id;
  elsif p_item_type = 'image' then
    select i.user_id into v from public.cultivar_images i where i.id::text = p_item_id;
  elsif p_item_type = 'profile' then
    select p.id into v from public.profiles p where p.id::text = p_item_id;
  end if;
  if v is null and p_item_type is not null then
    select l.owner_id into v from public.post_log l
     where l.item_type = p_item_type and l.item_id = p_item_id and l.owner_id is not null
     order by l.at asc limit 1;
  end if;
  return v;
end;
$$;
revoke all on function public.admin_item_poster(text, text) from public, anon, authenticated;

-- create (no id) or change a 受付. Only the fields given are changed; an empty string clears a field.
create or replace function public.admin_case_save(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id bigint := nullif(p ->> 'id', '')::bigint;
  v_old public.admin_cases;
  v_new public.admin_cases;
  v_changed text[] := '{}';
  k text;
  v_keys text[] := array['kind', 'status', 'received_at', 'due_at', 'requester', 'requester_contact', 'summary',
                         'decision', 'item_type', 'item_id', 'item_label', 'poster_id', 'source_type', 'source_id'];
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if v_id is null then
    insert into public.admin_cases (created_by) values (auth.uid()) returning * into v_old;
    v_id := v_old.id;
  else
    select * into v_old from public.admin_cases where id = v_id for update;
    if not found then
      return jsonb_build_object('success', false, 'error', '受付が見つかりません');
    end if;
  end if;
  v_new := v_old;
  foreach k in array v_keys loop
    if p ? k then
      v_new := jsonb_populate_record(v_new, jsonb_build_object(k, nullif(p ->> k, '')));
    end if;
  end loop;
  if v_new.item_type is not null and v_new.item_id is not null and v_new.poster_id is null then
    v_new.poster_id := public.admin_item_poster(v_new.item_type, v_new.item_id);
  end if;
  v_new.kind := coalesce(v_new.kind, 'takedown');
  v_new.status := coalesce(v_new.status, 'open');
  v_new.received_at := coalesce(v_new.received_at, now());
  if v_new.status in ('done', 'declined') then
    v_new.closed_at := coalesce(v_old.closed_at, now());
  else
    v_new.closed_at := null;
  end if;
  v_new.requester := left(v_new.requester, 300);
  v_new.requester_contact := left(v_new.requester_contact, 300);
  v_new.summary := left(v_new.summary, 5000);
  v_new.decision := left(v_new.decision, 5000);
  v_new.item_label := left(v_new.item_label, 300);
  v_new.updated_at := now();
  foreach k in array v_keys loop
    if (to_jsonb(v_new) -> k) is distinct from (to_jsonb(v_old) -> k) then
      v_changed := v_changed || k;
    end if;
  end loop;
  update public.admin_cases c set
    kind = v_new.kind, status = v_new.status, received_at = v_new.received_at, due_at = v_new.due_at,
    requester = v_new.requester, requester_contact = v_new.requester_contact, summary = v_new.summary,
    decision = v_new.decision, item_type = v_new.item_type, item_id = v_new.item_id, item_label = v_new.item_label,
    poster_id = v_new.poster_id, source_type = v_new.source_type, source_id = v_new.source_id,
    closed_at = v_new.closed_at, updated_at = v_new.updated_at
  where c.id = v_id;
  if p ->> 'id' is null or p ->> 'id' = '' then
    perform public.admin_log('case_create', 'case', v_id::text,
      jsonb_strip_nulls(jsonb_build_object('kind', v_new.kind, 'item_type', v_new.item_type, 'item_id', v_new.item_id,
        'source_type', v_new.source_type, 'source_id', v_new.source_id)));
  elsif array_length(v_changed, 1) > 0 then
    perform public.admin_log('case_update', 'case', v_id::text,
      jsonb_strip_nulls(jsonb_build_object('changed', to_jsonb(v_changed),
        'status', case when 'status' = any (v_changed) then v_new.status end)));
  end if;
  return jsonb_build_object('success', true, 'id', v_id);
exception
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or check_violation then
    return jsonb_build_object('success', false, 'error', '入力の形が正しくありません');
end;
$$;
revoke all on function public.admin_case_save(jsonb) from public, anon;
grant execute on function public.admin_case_save(jsonb) to authenticated;

create or replace function public.admin_cases_list(p_include_closed boolean default true)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
set statement_timeout to '10s'
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(c) || jsonb_build_object(
             'poster_name', p.display_name, 'poster_username', p.username,
             'poster_suspended', public.is_suspended(c.poster_id))
           order by (c.status in ('done', 'declined')), coalesce(least(c.due_at, c.ask_due_at), c.due_at, c.ask_due_at) nulls last,
                    c.updated_at desc)
      from (select * from public.admin_cases c
             where coalesce(p_include_closed, true) or c.status not in ('done', 'declined')
             order by (c.status in ('done', 'declined')), c.updated_at desc
             limit 300) c
      left join public.profiles p on p.id = c.poster_id), '[]'::jsonb);
end;
$$;
revoke all on function public.admin_cases_list(boolean) from public, anon;
grant execute on function public.admin_cases_list(boolean) to authenticated;

-- one 受付 with its poster, 保全 and the steps taken on it (from 操作記録)
create or replace function public.admin_case_get(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c public.admin_cases;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  select * into c from public.admin_cases where id = p_id;
  if not found then
    return jsonb_build_object('success', false, 'error', '受付が見つかりません');
  end if;
  if c.poster_id is not null then
    perform public.admin_log_lookup('user', c.poster_id::text, jsonb_build_object('case_id', c.id));
  end if;
  return jsonb_build_object(
    'success', true,
    'case', to_jsonb(c),
    'poster', (select jsonb_build_object('id', u.id, 'email', u.email, 'display_name', p.display_name,
                                         'username', p.username, 'suspended', public.is_suspended(u.id))
                 from auth.users u left join public.profiles p on p.id = u.id where u.id = c.poster_id),
    'hold', (select jsonb_build_object('held_at', h.held_at, 'reason', h.reason, 'has_snapshot', h.snapshot is not null,
                                       'evidence_files', h.evidence_files)
               from public.post_log_holds h where h.item_type = c.item_type and h.item_id = c.item_id),
    'events', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.at, a.id)
        from public.admin_actions a
       where (a.target_type = 'case' and a.target_id = c.id::text)
          or (a.detail ->> 'case_id' = c.id::text and a.action <> 'lookup')
          or (c.item_type is not null and a.target_type = c.item_type and a.target_id = c.item_id
              and a.action in ('hold_on', 'hold_off', 'delete'))), '[]'::jsonb));
end;
$$;
revoke all on function public.admin_case_get(bigint) from public, anon;
grant execute on function public.admin_case_get(bigint) to authenticated;

-- a step on a 受付: 'note' (メモ), 'ask' (投稿者に照会を送った; p_days to reply), 'reply' (投稿者の返事),
-- 'export' (回答書を書き出した)
create or replace function public.admin_case_step(p_id bigint, p_step text, p_body text default null, p_days int default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c public.admin_cases;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  select * into c from public.admin_cases where id = p_id for update;
  if not found then
    return jsonb_build_object('success', false, 'error', '受付が見つかりません');
  end if;
  if p_step = 'note' then
    if coalesce(btrim(p_body), '') = '' then
      return jsonb_build_object('success', false, 'error', 'メモが空です');
    end if;
    perform public.admin_log('case_note', 'case', p_id::text, jsonb_build_object('body', left(p_body, 5000)));
  elsif p_step = 'ask' then
    update public.admin_cases set asked_at = now(),
           ask_due_at = now() + make_interval(days => greatest(1, least(coalesce(p_days, 7), 60))),
           ask_reply = null, ask_replied_at = null,
           status = case when status = 'open' then 'asked' else status end, updated_at = now()
     where id = p_id;
    perform public.admin_log('case_ask', 'case', p_id::text,
      jsonb_strip_nulls(jsonb_build_object('days', greatest(1, least(coalesce(p_days, 7), 60)), 'to', left(p_body, 300))));
  elsif p_step = 'reply' then
    if coalesce(btrim(p_body), '') = '' then
      return jsonb_build_object('success', false, 'error', '返事の内容が空です');
    end if;
    update public.admin_cases set ask_reply = left(p_body, 5000), ask_replied_at = now(), updated_at = now() where id = p_id;
    perform public.admin_log('case_reply', 'case', p_id::text, jsonb_build_object('body', left(p_body, 5000)));
  elsif p_step = 'export' then
    perform public.admin_log('case_export', 'case', p_id::text, jsonb_strip_nulls(jsonb_build_object('what', left(p_body, 300))));
  else
    return jsonb_build_object('success', false, 'error', 'bad step');
  end if;
  return jsonb_build_object('success', true);
end;
$$;
revoke all on function public.admin_case_step(bigint, text, text, int) from public, anon;
grant execute on function public.admin_case_step(bigint, text, text, int) to authenticated;

-- ---------- 操作記録: steps done elsewhere in the admin ----------
create or replace function public.admin_action_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    return null;
  end if;
  if tg_table_name = 'deletion_requests' then
    if new.status is distinct from old.status then
      perform public.admin_log('report_' || coalesce(new.status, 'pending'), 'report', new.id::text,
        jsonb_strip_nulls(jsonb_build_object('item_type', new.target_type, 'item_id', new.target_id,
          'label', left(new.target_name, 300), 'reason', new.reason)));
    end if;
  elsif tg_table_name = 'contact_messages' then
    if new.status is distinct from old.status then
      perform public.admin_log('contact_' || coalesce(new.status, 'new'), 'contact', new.id::text,
        jsonb_strip_nulls(jsonb_build_object('category', new.category)));
    end if;
  elsif tg_table_name = 'post_log_holds' then
    if tg_op = 'DELETE' then
      perform public.admin_log('hold_off', old.item_type, old.item_id, null);
    else
      perform public.admin_log('hold_on', new.item_type, new.item_id,
        jsonb_strip_nulls(jsonb_build_object('reason', left(new.reason, 1000))));
    end if;
  elsif tg_table_name = 'cultivars' then
    perform public.admin_log('delete', 'cultivar', old.id::text, jsonb_build_object('label', left(old.cultivar_name, 300)));
  elsif tg_table_name = 'cultivar_images' then
    perform public.admin_log('delete', 'image', old.id::text,
      jsonb_build_object('label', left(coalesce(old.cultivar_name, '') || ' / ' || coalesce(old.storage_path, ''), 300)));
  end if;
  return null;
exception when others then
  return null;                        -- a broken record never blocks the admin's step
end;
$$;
revoke all on function public.admin_action_trigger() from public, anon, authenticated;

drop trigger if exists admin_action_trg on public.deletion_requests;
create trigger admin_action_trg after update on public.deletion_requests
  for each row execute function public.admin_action_trigger();
drop trigger if exists admin_action_trg on public.contact_messages;
create trigger admin_action_trg after update on public.contact_messages
  for each row execute function public.admin_action_trigger();
drop trigger if exists admin_action_trg on public.post_log_holds;
create trigger admin_action_trg after insert or update or delete on public.post_log_holds
  for each row execute function public.admin_action_trigger();
drop trigger if exists admin_action_trg on public.cultivars;
create trigger admin_action_trg after delete on public.cultivars
  for each row execute function public.admin_action_trigger();
drop trigger if exists admin_action_trg on public.cultivar_images;
create trigger admin_action_trg after delete on public.cultivar_images
  for each row execute function public.admin_action_trigger();

-- the 投稿者を調べる lookups now write 操作記録, and the account shows whether it is stopped
create or replace function public.admin_post_log(
  p_item_type text default null, p_item_id text default null, p_user uuid default null, p_text text default null,
  p_limit int default 200)
returns setof public.post_log
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if p_user is not null then
    perform public.admin_log_lookup('user', p_user::text, null);
  elsif p_item_id is not null then
    perform public.admin_log_lookup(coalesce(p_item_type, 'item'), p_item_id, null);
  elsif p_text is not null then
    perform public.admin_log_lookup('search', left(lower(trim(p_text)), 200), null);
  end if;
  return query
    select l.* from public.post_log l
     where (p_item_type is null or l.item_type = p_item_type)
       and (p_item_id is null or l.item_id = p_item_id)
       and (p_user is null or l.actor_id = p_user or l.owner_id = p_user)
       and (p_text is null
            or l.item_label ilike '%' || replace(replace(p_text, '%', '\%'), '_', '\_') || '%'
            or lower(l.actor_email) = lower(trim(p_text)))
     order by l.at desc
     limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;
revoke all on function public.admin_post_log(text, text, uuid, text, int) from public, anon;
grant execute on function public.admin_post_log(text, text, uuid, text, int) to authenticated;

create or replace function public.admin_post_account(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v jsonb;
  v_sessions jsonb := '[]'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  perform public.admin_log_lookup('user', p_user::text, null);
  select jsonb_build_object(
           'id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
           'provider', u.raw_app_meta_data ->> 'provider')
    into v from auth.users u where u.id = p_user;
  if v is null then
    v := jsonb_build_object('id', p_user, 'missing', true);
  end if;
  v := v || coalesce((select jsonb_build_object('display_name', p.display_name, 'username', p.username)
                        from public.profiles p where p.id = p_user), '{}'::jsonb);
  begin
    select coalesce(jsonb_agg(jsonb_build_object(
             'ip', s ->> 'ip', 'user_agent', left(s ->> 'user_agent', 300),
             'created_at', s ->> 'created_at', 'updated_at', coalesce(s ->> 'refreshed_at', s ->> 'updated_at'))
             order by s ->> 'created_at' desc), '[]'::jsonb)
      into v_sessions
      from (select to_jsonb(x) as s from auth.sessions x where x.user_id = p_user) t;
  exception when others then
    v_sessions := '[]'::jsonb;
  end;
  v := v || jsonb_build_object('sessions', v_sessions,
    'entries', (select count(*) from public.cultivars c where c.user_id = p_user),
    'photos', (select count(*) from public.cultivar_images i where i.user_id = p_user),
    'suspension', (select jsonb_build_object('reason', s.reason, 'since', s.since, 'until', s.until, 'case_id', s.case_id)
                     from public.account_suspensions s
                    where s.user_id = p_user and (s.until is null or s.until > now())));
  return v;
end;
$$;
revoke all on function public.admin_post_account(uuid) from public, anon;
grant execute on function public.admin_post_account(uuid) to authenticated;

-- ---------- 通報: a profile can be reported too ----------
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
  if p_target_type is null or p_target_type not in ('cultivar', 'image', 'profile')
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

commit;

-- ---------- check (read only) ----------
-- select tgname, tgrelid::regclass from pg_trigger where tgname in ('a_block_suspended_trg', 'admin_action_trg');
-- select proname from pg_proc where proname like 'admin_case%' or proname in ('admin_suspend', 'admin_actions_list', 'my_suspension');
