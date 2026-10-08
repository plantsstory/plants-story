-- Board 10 T132: everything a person has put in, for a CSV they keep (free, and still there after membership ends).
-- Only the caller's own rows: the entries they own (private ones included) and the photos they uploaded.
create or replace function public.my_export()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required');
  end if;
  return jsonb_build_object(
    'success', true,
    'entries', coalesce((select jsonb_agg(jsonb_build_object(
        'name', c.cultivar_name, 'type', c.type, 'private', coalesce(c.is_private, false),
        'parent_a', coalesce(c.parent_a_text, (select p.cultivar_name from cultivars p where p.id = c.parent_a_id)),
        'parent_b', coalesce(c.parent_b_text, (select p.cultivar_name from cultivars p where p.id = c.parent_b_id)),
        'sowing_date', (select o->'structured'->>'sowing_date' from jsonb_array_elements(coalesce(c.origins, '[]'::jsonb)) o
                         where o->'structured'->>'sowing_date' is not null limit 1),
        'breeder', (select coalesce(o->'structured'->>'breeder', o->>'discoverer_or_breeder') from jsonb_array_elements(coalesce(c.origins, '[]'::jsonb)) o
                     where coalesce(o->'structured'->>'breeder', o->>'discoverer_or_breeder') is not null limit 1),
        'body', (select string_agg(o->>'body', ' / ') from jsonb_array_elements(coalesce(c.origins, '[]'::jsonb)) o
                  where coalesce(o->>'_type', '') <> 'formula' and o->>'body' is not null),
        'created_at', c.created_at) order by c.created_at)
      from cultivars c where c.user_id = v_uid), '[]'::jsonb),
    'photos', coalesce((select jsonb_agg(jsonb_build_object(
        'name', i.cultivar_name, 'taken_on', i.taken_on, 'caption', i.caption, 'credit', i.credit,
        'link', i.link_url, 'path', i.storage_path, 'created_at', i.created_at) order by i.cultivar_name, i.taken_on nulls last, i.created_at)
      from cultivar_images i where i.user_id = v_uid), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.my_export() from public, anon;
grant execute on function public.my_export() to authenticated;
