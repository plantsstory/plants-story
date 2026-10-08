-- 2026-10-08 board 9 (T109): who wrote each record is stored with it; the guard has no admin exemption
-- (only the entry's poster, or a fix that says so with SET LOCAL); any change can be undone from its history.

-- 1) provenance on every record: contributor | database | ai | generated | editorial
update public.cultivars c
   set origins = (
     select jsonb_agg(
       case when o->>'_type' is not null or o ? 'provenance' then o
            else o || jsonb_build_object('provenance',
              case
                when coalesce((o->>'body_generated')::boolean, false) then 'generated'
                when o->>'source_type' = 'editor' then 'editorial'
                when o->>'source_type' = 'ipni_powo' then 'database'
                when o->>'source_type' = 'manual' or (o->'author'->>'isAI') = 'false' then 'contributor'
                else 'ai'
              end)
       end order by ord)
     from jsonb_array_elements(c.origins) with ordinality e(o, ord))
 where jsonb_typeof(c.origins) = 'array' and jsonb_array_length(c.origins) > 0
   and exists (select 1 from jsonb_array_elements(c.origins) o where o->>'_type' is null and not (o ? 'provenance'));

-- 2) the guard: no admin exemption
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

  -- who may change a contributor's words: the entry's own poster, or a fix that says so explicitly
  -- (set local app.allow_contributor_edit = 'on', only when the owner asked for it). Admins are not exempt.
  if coalesce(current_setting('app.allow_contributor_edit', true), '') = 'on' then return NEW; end if;
  if auth.uid() is not null and auth.uid() = OLD.user_id then return NEW; end if;

  for b in
    select o->>'body'
      from jsonb_array_elements(coalesce(OLD.origins, '[]'::jsonb)) o
     where o->>'_type' is null
       and (o->>'provenance' = 'contributor'
            or (not (o ? 'provenance') and (o->>'source_type' = 'manual' or (o->'author'->>'isAI') = 'false')
                and coalesce((o->>'body_generated')::boolean, false) = false))
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

-- 3) undo one change from the history (admin), as a deliberate restore
create or replace function public.revert_origin_change(p_history_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  h public.origin_history;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'error', 'admin only');
  end if;
  select * into h from public.origin_history where id = p_history_id;
  if h.id is null then
    return jsonb_build_object('success', false, 'error', 'no such change');
  end if;
  perform set_config('app.allow_contributor_edit', 'on', true);
  update public.cultivars set origins = h.old_origins, updated_at = now() where id = h.cultivar_id;
  return jsonb_build_object('success', true, 'cultivar_id', h.cultivar_id);
end;
$$;
revoke all on function public.revert_origin_change(bigint) from public, anon;
grant execute on function public.revert_origin_change(bigint) to authenticated;
