-- 2026-11-26: a time that moves on every change to an entry, so the site's list file (data/cultivars.json, built at
-- deploy) can tell which entries changed after it was built. updated_at is not enough: adding an origin, voting and
-- verifying leave it as it is, and it drives 「最近更新」, which this column must not disturb.
-- Existing rows get the time this runs; from then on the trigger sets it on every insert and update.
begin;
alter table public.cultivars add column if not exists changed_at timestamptz not null default now();

create or replace function public.cultivars_touch_changed_at()
returns trigger language plpgsql as $$
begin
  NEW.changed_at := now();
  return NEW;
end;
$$;
drop trigger if exists cultivars_changed_at_trg on public.cultivars;
create trigger cultivars_changed_at_trg before insert or update on public.cultivars
  for each row execute function public.cultivars_touch_changed_at();

create index if not exists cultivars_changed_at_idx on public.cultivars (changed_at desc);
commit;
