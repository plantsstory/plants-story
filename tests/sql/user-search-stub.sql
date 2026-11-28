-- Stubs for the admin user search test: just enough of Supabase (roles, auth users, profiles, is_admin).
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.ctx(admin boolean);
insert into auth.ctx values (false);
create function public.is_admin() returns boolean language sql as $$ select coalesce(admin, false) from auth.ctx $$;
create table auth.users (id uuid primary key, email text, created_at timestamptz default now(), last_sign_in_at timestamptz,
  raw_app_meta_data jsonb default '{"provider":"google"}', raw_user_meta_data jsonb default '{}');
create table public.profiles (id uuid primary key, display_name text default '', username text, avatar_url text,
  sns_instagram text default '', sns_twitter text default '', created_at timestamptz default now());
