do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.ctx(role text, uid uuid, admin boolean);
insert into auth.ctx values ('service_role', null, false);
create function auth.jwt() returns jsonb language sql as $$ select jsonb_build_object('role', role) from auth.ctx $$;
create function auth.uid() returns uuid language sql as $$ select uid from auth.ctx $$;
create function public.is_admin() returns boolean language sql as $$ select admin from auth.ctx $$;
create table public.cultivars (id bigserial primary key, cultivar_name text, user_id uuid, verified_at timestamptz, verified_by uuid, verification_note text, origins jsonb, updated_at timestamptz);
