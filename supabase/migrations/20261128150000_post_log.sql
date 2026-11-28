-- 2026-11-28: 投稿の記録 (post log) for takedown requests and 発信者情報開示請求 (情報流通プラットフォーム対処法).
-- Before this, a post showed who made it (user_id) but not from where, and a poster deleting their own entry or
-- photo erased even that. Now every post, edit and delete by a signed-in person on the public tables
-- (cultivars = entries and their origins, cultivar_images = photos, profiles = profile text) adds one row here:
-- account, email at the time, time, IP address and browser. A delete also keeps a copy of the row.
--
-- - Only the admin reads it, through admin_* functions below. The table is closed to anon/authenticated (RLS on,
--   no policies, no grants), so nothing of it is shown on the site.
-- - Rows are erased after 180 days (privacy policy: IP addresses at most 180 days), except for items the admin
--   put on hold (保全) for a request; those stay until the hold is released.
-- - Writes by the service role or cron (AI translation etc.) have no person behind them and are not logged.
begin;

create table if not exists public.post_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  item_type text not null,            -- 'cultivar' | 'image' | 'profile'
  item_id text not null,
  item_label text,                    -- entry name / photo path / display name at the time
  action text not null,               -- 'create' | 'edit' | 'delete'
  actor_id uuid,                      -- who did it (auth.uid())
  actor_email text,                   -- their sign-in address at the time (kept if the account is later removed)
  owner_id uuid,                      -- the item's poster (user_id of the row; for a profile its id)
  ip text,
  user_agent text,
  changed text[],                     -- edit: the fields that changed
  snapshot jsonb                      -- delete: the row as it was; edit: the new values of small fields
);
create index if not exists post_log_item_idx on public.post_log (item_type, item_id, at desc);
create index if not exists post_log_actor_idx on public.post_log (actor_id, at desc);
create index if not exists post_log_owner_idx on public.post_log (owner_id, at desc);
create index if not exists post_log_at_idx on public.post_log (at);
alter table public.post_log enable row level security;
revoke all on public.post_log from public, anon, authenticated;
revoke all on sequence public.post_log_id_seq from public, anon, authenticated;

-- 保全: an item kept out of the 180-day erase, with a copy of how it looked when it was put on hold
create table if not exists public.post_log_holds (
  item_type text not null,
  item_id text not null,
  reason text,
  held_at timestamptz not null default now(),
  held_by uuid,
  snapshot jsonb,                     -- the row when put on hold (null if it was already gone)
  evidence_files text[],              -- copies of the photo files, in private-images (admin folder)
  primary key (item_type, item_id)
);
alter table public.post_log_holds enable row level security;
revoke all on public.post_log_holds from public, anon, authenticated;

create or replace function public.post_log_write()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_row jsonb;
  v_old jsonb;
  v_type text;
  v_action text;
  v_changed text[];
  v_snap jsonb;
  v_headers json;
  v_ip text;
  v_ua text;
  v_email text;
  v_label text;
  v_owner text;
  k text;
begin
  -- no person (service role, cron, migrations): nothing to log
  if v_uid is null then
    return null;
  end if;

  v_type := case TG_TABLE_NAME when 'cultivars' then 'cultivar' when 'cultivar_images' then 'image' else 'profile' end;
  if TG_OP = 'DELETE' then
    v_row := to_jsonb(OLD); v_action := 'delete'; v_snap := v_row;
  elsif TG_OP = 'INSERT' then
    v_row := to_jsonb(NEW); v_action := 'create';
  else
    v_row := to_jsonb(NEW); v_old := to_jsonb(OLD); v_action := 'edit';
    select array_agg(key order by key) into v_changed
      from jsonb_each(v_row) n
     where n.key not in ('updated_at', 'changed_at')
       and n.value is distinct from (v_old -> n.key);
    if v_changed is null then
      return null;                    -- only a timestamp moved
    end if;
    -- the new values of the small fields (origins have their own full history in origin_history)
    v_snap := '{}'::jsonb;
    foreach k in array v_changed loop
      if k <> 'origins' and length(coalesce((v_row -> k)::text, '')) <= 2000 then
        v_snap := v_snap || jsonb_build_object(k, v_row -> k);
      end if;
    end loop;
  end if;

  begin
    v_headers := current_setting('request.headers', true)::json;
  exception when others then
    v_headers := null;
  end;
  v_ip := nullif(trim(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1)), '');
  v_ua := left(nullif(v_headers ->> 'user-agent', ''), 300);
  select u.email into v_email from auth.users u where u.id = v_uid;

  v_label := left(coalesce(
    case v_type
      when 'cultivar' then v_row ->> 'cultivar_name'
      when 'image' then coalesce(v_row ->> 'cultivar_name', '') || ' / ' || coalesce(v_row ->> 'storage_path', '')
      else coalesce(nullif(v_row ->> 'display_name', ''), v_row ->> 'username')
    end, ''), 300);
  v_owner := case when v_type = 'profile' then v_row ->> 'id' else v_row ->> 'user_id' end;

  insert into public.post_log (item_type, item_id, item_label, action, actor_id, actor_email, owner_id, ip, user_agent, changed, snapshot)
  values (v_type, v_row ->> 'id', v_label, v_action, v_uid, v_email,
          case when v_owner ~ '^[0-9a-f-]{36}$' then v_owner::uuid end,
          left(v_ip, 64), v_ua, v_changed, v_snap);
  return null;
exception when others then
  -- the log must never stop someone from posting
  raise warning 'post_log_write: %', sqlerrm;
  return null;
end;
$$;
revoke all on function public.post_log_write() from public, anon, authenticated;

drop trigger if exists cultivars_post_log_trg on public.cultivars;
create trigger cultivars_post_log_trg after insert or update or delete on public.cultivars
  for each row execute function public.post_log_write();
drop trigger if exists cultivar_images_post_log_trg on public.cultivar_images;
create trigger cultivar_images_post_log_trg after insert or update or delete on public.cultivar_images
  for each row execute function public.post_log_write();
drop trigger if exists profiles_post_log_trg on public.profiles;
create trigger profiles_post_log_trg after insert or update or delete on public.profiles
  for each row execute function public.post_log_write();

-- ---------- admin: read ----------
-- the log of one item, one account (as poster or as the one who acted), or rows whose name contains a text
-- (or whose sign-in address is that text)
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

-- an account as the admin needs it for a request: sign-in address, when made, last sign-in, profile, the devices
-- still signed in (Supabase keeps those while the session lasts) and how much they posted
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
    'photos', (select count(*) from public.cultivar_images i where i.user_id = p_user));
  return v;
end;
$$;
revoke all on function public.admin_post_account(uuid) from public, anon;
grant execute on function public.admin_post_account(uuid) to authenticated;

-- ---------- admin: 保全 (hold) ----------
create or replace function public.admin_post_hold(
  p_item_type text, p_item_id text, p_on boolean default true, p_reason text default null,
  p_evidence_files text[] default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_snap jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  if p_item_type not in ('cultivar', 'image', 'profile') or coalesce(p_item_id, '') = '' then
    return jsonb_build_object('success', false, 'error', 'bad item');
  end if;
  if not coalesce(p_on, true) then
    delete from public.post_log_holds where item_type = p_item_type and item_id = p_item_id;
    return jsonb_build_object('success', true, 'held', false);
  end if;
  if p_item_type = 'cultivar' then
    select to_jsonb(c) into v_snap from public.cultivars c where c.id::text = p_item_id;
  elsif p_item_type = 'image' then
    select to_jsonb(i) into v_snap from public.cultivar_images i where i.id::text = p_item_id;
  else
    select to_jsonb(p) into v_snap from public.profiles p where p.id::text = p_item_id;
  end if;
  insert into public.post_log_holds (item_type, item_id, reason, held_by, snapshot, evidence_files)
  values (p_item_type, p_item_id, left(p_reason, 1000), auth.uid(), v_snap, p_evidence_files)
  on conflict (item_type, item_id) do update
     set reason = coalesce(excluded.reason, post_log_holds.reason),
         snapshot = coalesce(post_log_holds.snapshot, excluded.snapshot),
         evidence_files = coalesce(excluded.evidence_files, post_log_holds.evidence_files);
  return jsonb_build_object('success', true, 'held', true, 'had_row', v_snap is not null);
end;
$$;
revoke all on function public.admin_post_hold(text, text, boolean, text, text[]) from public, anon;
grant execute on function public.admin_post_hold(text, text, boolean, text, text[]) to authenticated;

create or replace function public.admin_post_holds()
returns setof public.post_log_holds
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  return query select h.* from public.post_log_holds h order by h.held_at desc;
end;
$$;
revoke all on function public.admin_post_holds() from public, anon;
grant execute on function public.admin_post_holds() to authenticated;

-- ---------- 180-day erase (daily 01:40 JST) ----------
create or replace function public.cleanup_post_log()
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  n int;
begin
  delete from public.post_log l
   where l.at < now() - interval '180 days'
     and not exists (select 1 from public.post_log_holds h where h.item_type = l.item_type and h.item_id = l.item_id);
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.cleanup_post_log() from public, anon, authenticated;

do $$ begin perform cron.unschedule('cleanup-post-log-daily'); exception when others then null; end $$;
select cron.schedule('cleanup-post-log-daily', '40 16 * * *', $$select public.cleanup_post_log();$$);

commit;
