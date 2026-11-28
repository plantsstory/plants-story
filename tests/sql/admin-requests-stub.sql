-- Stubs for the admin requests test: the post-log stubs plus the tables the new migration touches.
\ir post-log-stub.sql
create table public.deletion_requests (id bigserial primary key, target_type text not null, target_id text not null, target_name text,
  reason text, reason_detail text, status text default 'pending', created_at timestamptz default now(), resolved_at timestamptz, user_id uuid);
create table public.contact_messages (id uuid primary key default gen_random_uuid(), name text, email text, category text default 'general',
  message text, user_id uuid, is_resolved boolean default false, created_at timestamptz default now(), status text default 'new');
create schema storage;
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner_id text, created_at timestamptz default now());
