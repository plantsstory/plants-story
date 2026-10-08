-- 2026-10-08 (board 9): a contributor's text is not rewritten or removed by anyone but its poster or an admin
-- acting on purpose — not by board data fixes, not by AI runs. Every change of origins is kept, so any
-- version can be restored in one step (today the originals had to be dug out of backups).
create table if not exists public.origin_history (
  id bigserial primary key,
  cultivar_id bigint not null,
  changed_at timestamptz not null default now(),
  changed_by uuid,
  old_origins jsonb,
  new_origins jsonb
);
create index if not exists origin_history_cultivar_idx on public.origin_history (cultivar_id, changed_at desc);
alter table public.origin_history enable row level security;
revoke all on public.origin_history from anon;
drop policy if exists "Admin reads origin history" on public.origin_history;
create policy "Admin reads origin history" on public.origin_history for select to authenticated using (public.is_admin());

create or replace function public.cultivars_origins_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  b text;
begin
  if NEW.origins is not distinct from OLD.origins then
    return NEW;
  end if;
  insert into public.origin_history (cultivar_id, changed_by, old_origins, new_origins)
  values (OLD.id, auth.uid(), OLD.origins, NEW.origins);

  -- who may change a contributor's words: the entry's poster, an admin in the admin screen, or a fix that
  -- says so explicitly (set local app.allow_contributor_edit = 'on', only after the owner asked for it)
  if coalesce(current_setting('app.allow_contributor_edit', true), '') = 'on' then return NEW; end if;
  if auth.uid() is not null and (auth.uid() = OLD.user_id or public.is_admin()) then return NEW; end if;

  -- every contributor body (written by a person, not generated from the fields) must still be there, word for word
  for b in
    select o->>'body'
      from jsonb_array_elements(coalesce(OLD.origins, '[]'::jsonb)) o
     where o->>'_type' is null
       and (o->>'source_type' = 'manual' or (o->'author'->>'isAI') = 'false')
       and coalesce((o->>'body_generated')::boolean, false) = false
       and coalesce(o->>'body', '') <> ''
  loop
    if not exists (select 1 from jsonb_array_elements(coalesce(NEW.origins, '[]'::jsonb)) n where n->>'body' = b) then
      raise exception 'A contributor''s text is protected (cultivar %): add an editor note instead of changing it', OLD.id
        using errcode = 'P0001';
    end if;
  end loop;
  return NEW;
end;
$$;

drop trigger if exists cultivars_origins_guard_trg on public.cultivars;
create trigger cultivars_origins_guard_trg
  before update of origins on public.cultivars
  for each row execute function public.cultivars_origins_guard();
