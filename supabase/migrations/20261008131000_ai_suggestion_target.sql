-- 2026-10-08 (board 9): an accepted AI suggestion is written into a database/AI/editor record, never into a contributor's
create or replace function public.decide_ai_suggestion(p_id bigint, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  s public.ai_suggestions;
  v_origins jsonb;
  v_idx int;
  v_struct jsonb;
  v_value jsonb;
  v_links jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'error', 'admin only');
  end if;
  select * into s from public.ai_suggestions where id = p_id for update;
  if s.id is null or s.status <> 'pending' then
    return jsonb_build_object('success', false, 'error', 'not pending');
  end if;
  if not p_accept then
    update public.ai_suggestions set status = 'rejected', decided_at = now() where id = p_id;
    return jsonb_build_object('success', true, 'status', 'rejected');
  end if;

  select origins into v_origins from public.cultivars where id = s.cultivar_id for update;
  -- the leading record that is not someone's own (database, AI or editor); a contributor's record is never
  -- written into (board 9). Without one, the value goes into a new editor record of its own.
  select (e.ord - 1)::int into v_idx
    from jsonb_array_elements(coalesce(v_origins, '[]'::jsonb)) with ordinality as e(o, ord)
   where e.o->>'_type' is null
     and coalesce(e.o->>'source_type', '') <> 'manual'
     and coalesce(e.o->'author'->>'isAI', 'true') <> 'false'
   order by coalesce((e.o->>'trust')::int, 0) desc, e.ord
   limit 1;
  if v_idx is null then
    v_origins := coalesce(v_origins, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'source_type', 'editor', 'trust', 40, 'trustClass', 'trust--mid', 'body', '',
      'author', jsonb_build_object('isAI', true, 'name', coalesce(s.model, 'AI'), 'date', to_char(now() at time zone 'Asia/Tokyo', 'YYYY-MM-DD')),
      'structured', '{}'::jsonb));
    v_idx := jsonb_array_length(v_origins) - 1;
  end if;

  v_value := case when s.field in ('collection_year','publication_year') and s.suggested_value ~ '^\d{4}$'
                  then to_jsonb(s.suggested_value::int) else to_jsonb(s.suggested_value) end;
  v_struct := coalesce(v_origins->v_idx->'structured', '{}'::jsonb) || jsonb_build_object(s.field, v_value);
  -- the field is now known: drop its 'absent' mark
  if v_struct ? 'absent' then
    v_struct := jsonb_set(v_struct, '{absent}', (v_struct->'absent') - s.field);
  end if;
  -- the sources behind the value join the citation links (no duplicates, http(s) only)
  select coalesce(jsonb_agg(distinct l), '[]'::jsonb) into v_links from (
    select l from jsonb_array_elements(coalesce(v_struct->'citation_links', '[]'::jsonb)) l
    union
    select jsonb_build_object('url', left(x->>'url', 500), 'label', left(coalesce(x->>'label', ''), 200))
      from jsonb_array_elements(s.sources) x where x->>'url' ~* '^https?://'
  ) t;
  v_struct := jsonb_set(v_struct, '{citation_links}', v_links);
  v_origins := jsonb_set(v_origins, array[v_idx::text, 'structured'], v_struct);

  update public.cultivars set origins = v_origins, updated_at = now() where id = s.cultivar_id;
  update public.ai_suggestions set status = 'accepted', decided_at = now() where id = p_id;
  return jsonb_build_object('success', true, 'status', 'accepted');
end;
$$;
revoke all on function public.decide_ai_suggestion(bigint, boolean) from public, anon;
grant execute on function public.decide_ai_suggestion(bigint, boolean) to authenticated;
