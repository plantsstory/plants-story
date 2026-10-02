-- T33 shop listings (BOARD 第5回 C7, 第6回): ¥1,000 a month by invoice and bank transfer, no payment provider.
-- Shown per genus (never "this shop sells this plant"), at most three, marked PR. Admin only; visitors read
-- the public columns of active listings through a definer function.
create table if not exists public.shops (
  id bigserial primary key,
  name text not null,
  url text not null check (url ~ '^https://'),
  blurb text check (char_length(blurb) <= 40),
  genus text not null default 'Anthurium',
  starts_on date not null default current_date,
  free_until date,
  ends_on date,
  is_active boolean not null default true,
  contact_email text,
  fee integer not null default 1000,
  note text,
  created_at timestamptz not null default now()
);
alter table public.shops enable row level security;
drop policy if exists "Admin only shops" on public.shops;
create policy "Admin only shops" on public.shops for all using (public.is_admin()) with check (public.is_admin());
revoke all on public.shops from anon;

create or replace function public.list_public_shops(p_genus text)
returns table (id bigint, name text, url text, blurb text)
language sql stable security definer set search_path = public as $$
  select s.id, s.name, s.url, s.blurb from shops s
   where s.is_active and s.genus = p_genus and s.starts_on <= current_date
     and (s.ends_on is null or s.ends_on >= current_date)
   order by s.id;
$$;
revoke all on function public.list_public_shops(text) from public;
grant execute on function public.list_public_shops(text) to anon, authenticated;
