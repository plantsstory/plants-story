-- Board 12: an index of articles by people who know these plants (note, blogs, papers). Only the title, author,
-- link and the editors' own short introduction are kept — never the article's text or images.
create table if not exists public.articles (
  id bigint generated always as identity primary key,
  url text not null unique check (url ~ '^https://'),
  title text not null check (length(title) between 1 and 200),
  author text not null check (length(author) between 1 and 120),
  site text not null default 'その他',
  lang text not null default 'ja' check (lang in ('ja', 'en', 'other')),
  published_on date,
  kind text not null default '解説',
  credential text check (credential is null or length(credential) <= 160),
  summary text not null check (length(summary) between 20 and 240),
  topics text[] not null default '{}',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists articles_topics_idx on public.articles using gin (topics);
alter table public.articles enable row level security;
drop policy if exists "Read published articles" on public.articles;
create policy "Read published articles" on public.articles for select using (is_published or public.is_admin());
drop policy if exists "Admins write articles" on public.articles;
create policy "Admins write articles" on public.articles for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;

create or replace function public.articles_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists articles_touch on public.articles;
create trigger articles_touch before update on public.articles for each row execute function public.articles_touch();
