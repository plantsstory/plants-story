-- 2026-11-27 Post check: once per new post, never again
-- Owner: 「投稿のチェック補助…特に原種(sp.等含め)、hybrid、cloneの区分の間違いがあればそれを検出…綴りも良い。
-- しかし追加された後に1回のみにしないとかなり消費しそう」
--
-- How it works
--   1. When a new entry is added (INSERT on cultivars only; an edit or a page view never queues anything), the
--      trigger puts ONE row in post_checks (status 'queued'). cultivar_id is unique, so an entry is never checked twice.
--   2. Right after the post, the trigger asks the edge function post-check to run (pg_net, after the insert commits).
--      A cron sweep every 30 minutes picks up anything the first call missed (only when something is queued).
--   3. post-check claims the row ('queued' -> 'checking'; two calls cannot both claim it), runs the free checks (the
--      site's naming rules, the registered list, GBIF), then asks the AI once (only when POSTCHECK_AI is "on" and the
--      shared monthly AI budget allows), and stores the flags ('checked'). The AI is never asked a second time for the
--      same row: a row left in 'checking' (a crash after the AI was asked) becomes 'failed', not 'queued' again.
--   4. The owner reads the flags in the admin (投稿の点検) and marks them 確認した (RPC review_post_check). Nothing in
--      the entry is changed by the check.
-- The admin can queue an older entry by hand (RPC queue_post_check); that too is once per entry.

create table if not exists public.post_checks (
  id bigserial primary key,
  cultivar_id bigint not null references public.cultivars(id) on delete cascade,
  cultivar_name text not null,
  status text not null default 'queued' check (status in ('queued', 'checking', 'checked', 'failed')),
  flags jsonb not null default '[]'::jsonb,
  marked boolean not null default false,
  ai_used boolean not null default false,
  model text,
  attempts int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  checked_at timestamptz,
  reviewed_at timestamptz
);
create unique index if not exists post_checks_cultivar_key on public.post_checks (cultivar_id);
create index if not exists post_checks_status_idx on public.post_checks (status, created_at);

alter table public.post_checks enable row level security;
revoke all on public.post_checks from anon, authenticated;
grant select on public.post_checks to authenticated;
drop policy if exists "Admin reads post checks" on public.post_checks;
create policy "Admin reads post checks" on public.post_checks for select to authenticated using (public.is_admin());

-- the call to the edge function (same vault token as admin-digest: tools_cron_token = CRON_TOKEN)
create or replace function public.post_check_call()
returns bigint language sql security definer set search_path = public as $$
  select net.http_post(
    url := 'https://jpgbehsrglsiwijglhjo.supabase.co/functions/v1/post-check',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-token', (select decrypted_secret from vault.decrypted_secrets where name = 'tools_cron_token')),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000);
$$;
revoke all on function public.post_check_call() from public, anon, authenticated;

-- after a new entry: queue its one check and ask for it now. A post never fails because of the check.
create or replace function public.queue_post_check()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  begin
    insert into public.post_checks (cultivar_id, cultivar_name) values (NEW.id, NEW.cultivar_name)
    on conflict (cultivar_id) do nothing;
  exception when others then
    return NEW;   -- the owner can still queue it by hand (投稿の点検)
  end;
  begin
    perform public.post_check_call();
  exception when others then
    null;   -- the row stays queued; the 30-minute sweep calls for it
  end;
  return NEW;
end;
$$;
revoke all on function public.queue_post_check() from public, anon, authenticated;

drop trigger if exists cultivars_queue_post_check_trg on public.cultivars;
create trigger cultivars_queue_post_check_trg
  after insert on public.cultivars
  for each row execute function public.queue_post_check();

-- the owner marks a checked post as looked at
create or replace function public.review_post_check(p_id bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_admin() then return jsonb_build_object('success', false, 'error', 'admin only'); end if;
  update public.post_checks set reviewed_at = now() where id = p_id and status in ('checked', 'failed') and reviewed_at is null;
  if not found then return jsonb_build_object('success', false, 'error', 'not found'); end if;
  return jsonb_build_object('success', true);
end;
$$;
revoke all on function public.review_post_check(bigint) from public, anon;
grant execute on function public.review_post_check(bigint) to authenticated;

-- the owner asks for a check of an entry that was posted before this existed (once per entry, like a new post)
create or replace function public.queue_post_check_for(p_cultivar_id bigint)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare
  nm text;
begin
  if not public.is_admin() then return jsonb_build_object('success', false, 'error', 'admin only'); end if;
  select cultivar_name into nm from public.cultivars where id = p_cultivar_id;
  if nm is null then return jsonb_build_object('success', false, 'error', 'not found'); end if;
  insert into public.post_checks (cultivar_id, cultivar_name) values (p_cultivar_id, nm) on conflict (cultivar_id) do nothing;
  if not found then return jsonb_build_object('success', false, 'error', 'already checked'); end if;
  begin perform public.post_check_call(); exception when others then null; end;
  return jsonb_build_object('success', true);
end;
$$;
revoke all on function public.queue_post_check_for(bigint) from public, anon;
grant execute on function public.queue_post_check_for(bigint) to authenticated;

-- post-check takes its rows here: two calls at the same moment never get the same row
create or replace function public.claim_post_checks(p_limit int default 5)
returns setof public.post_checks language sql security definer set search_path to 'public' as $$
  update public.post_checks p set status = 'checking', claimed_at = now(), attempts = p.attempts + 1
   where p.id in (select id from public.post_checks where status = 'queued' order by created_at
                  limit greatest(1, least(p_limit, 20)) for update skip locked)
  returning p.*;
$$;
revoke all on function public.claim_post_checks(int) from public, anon, authenticated;
grant execute on function public.claim_post_checks(int) to service_role;

-- the sweep: a row the first call missed; a claim that never finished becomes 'failed' (the AI may have been asked)
create or replace function public.post_check_sweep()
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  update public.post_checks set status = 'failed', error = coalesce(error, 'stopped while checking')
   where status = 'checking' and claimed_at < now() - interval '30 minutes';
  if exists (select 1 from public.post_checks where status = 'queued') then
    perform public.post_check_call();
  end if;
end;
$$;
revoke all on function public.post_check_sweep() from public, anon, authenticated;

select cron.unschedule('post-check-sweep') where exists (select 1 from cron.job where jobname = 'post-check-sweep');
select cron.schedule('post-check-sweep', '*/30 * * * *', 'select public.post_check_sweep()');
