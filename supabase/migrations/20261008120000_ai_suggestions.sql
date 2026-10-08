-- 2026-10-08: AI suggestions waiting for the owner (owner: 「opusでまとめて調べなおしてほしい」).
-- A batch run of the origin research (Claude Opus 5.5, preview mode) proposes values for empty or
-- country-only fields of the species records; nothing changes until an admin accepts a suggestion.
create table if not exists public.ai_suggestions (
  id bigserial primary key,
  cultivar_id bigint not null references public.cultivars(id) on delete cascade,
  cultivar_name text not null,
  field text not null check (field in ('type_locality','collector','collection_year','known_habitats','author_name','publication_year')),
  kind text not null check (kind in ('fill','refine','conflict')),
  current_value text,
  suggested_value text not null,
  sources jsonb not null default '[]'::jsonb,
  model text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists ai_suggestions_pending_idx on public.ai_suggestions (status, cultivar_name);

alter table public.ai_suggestions enable row level security;
revoke all on public.ai_suggestions from anon;
drop policy if exists "Admin reads suggestions" on public.ai_suggestions;
create policy "Admin reads suggestions" on public.ai_suggestions for select to authenticated using (public.is_admin());

-- Accept (writes the value into the entry's leading origin, adds the sources, clears an 'absent' mark) or reject.
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
  -- the leading origin: the record the site shows first (no _type, highest trust)
  select (e.ord - 1)::int into v_idx
    from jsonb_array_elements(coalesce(v_origins, '[]'::jsonb)) with ordinality as e(o, ord)
   where e.o->>'_type' is null
   order by coalesce((e.o->>'trust')::int, 0) desc, e.ord
   limit 1;
  if v_idx is null then
    return jsonb_build_object('success', false, 'error', 'no origin to update');
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
