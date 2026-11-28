-- Stubs for the post-log scenario test: just enough of Supabase (roles, auth users/sessions, request headers, pg_cron).
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.ctx(uid uuid, admin boolean);
insert into auth.ctx values (null, false);
create function auth.uid() returns uuid language sql as $$ select uid from auth.ctx $$;
create function public.is_admin() returns boolean language sql as $$ select coalesce(admin, false) from auth.ctx $$;
create table auth.users (id uuid primary key, email text, created_at timestamptz default now(), last_sign_in_at timestamptz, raw_app_meta_data jsonb);
create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid, created_at timestamptz default now(), updated_at timestamptz, refreshed_at timestamp, user_agent text, ip inet);
create table public.cultivars (id bigserial primary key, cultivar_name text, user_id uuid, origins jsonb, is_private boolean default false, updated_at timestamptz, changed_at timestamptz);
create table public.cultivar_images (id uuid primary key default gen_random_uuid(), cultivar_name text, storage_path text, user_id uuid, caption text, created_at timestamptz default now());
create table public.profiles (id uuid primary key, display_name text default '', username text, bio text default '', updated_at timestamptz);
create schema cron;
create table cron.job(jobname text, schedule text, command text);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job values (n, s, c); select 1::bigint $$;
create function cron.unschedule(n text) returns boolean language sql as $$ delete from cron.job where jobname = n; select true $$;
