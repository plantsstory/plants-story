-- Stubs for the post-check scenario test: just enough of Supabase (roles, auth, is_admin, pg_net, vault, pg_cron).
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role service_role; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.ctx(role text, admin boolean);
insert into auth.ctx values ('service_role', false);
create function public.is_admin() returns boolean language sql as $$ select admin from auth.ctx $$;
create table public.cultivars (id bigserial primary key, cultivar_name text, genus text, type text, tags text[], origins jsonb, updated_at timestamptz);
-- pg_net: remember each call instead of sending it
create schema net;
create table net.calls(id bigserial primary key, url text, at timestamptz default now());
create table net.fail(on_ boolean);
create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int) returns bigint language plpgsql as $$
declare i bigint;
begin
  if exists (select 1 from net.fail where on_) then raise exception 'pg_net is down'; end if;
  insert into net.calls(url) values (url) returning id into i; return i;
end $$;
create schema vault;
create view vault.decrypted_secrets as select 'tools_cron_token'::text as name, 'x'::text as decrypted_secret;
create schema cron;
create table cron.job(jobname text, schedule text, command text);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job values (n, s, c); select 1::bigint $$;
create function cron.unschedule(n text) returns boolean language sql as $$ delete from cron.job where jobname = n; select true $$;
