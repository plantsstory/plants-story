-- 2026-10-08 board 9 (T124, D11): what happened to my entries since I last looked — in place of push notices.
create or replace function public.my_updates(p_since timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required');
  end if;
  select jsonb_build_object(
    'success', true,
    -- photos others added to my entries
    'photos', coalesce((select jsonb_agg(jsonb_build_object('name', i.cultivar_name, 'at', i.created_at) order by i.created_at desc)
        from cultivar_images i join cultivars c on c.cultivar_name in (i.cultivar_name, i.cultivar_name || ' [Seedling]')
       where c.user_id = v_uid and i.created_at > p_since and i.user_id is distinct from v_uid), '[]'::jsonb),
    -- records others added to my entries
    'records', coalesce((select jsonb_agg(jsonb_build_object('name', c.cultivar_name, 'at', h.changed_at) order by h.changed_at desc)
        from origin_history h join cultivars c on c.id = h.cultivar_id
       where c.user_id = v_uid and h.changed_at > p_since and h.changed_by is distinct from v_uid
         and jsonb_array_length(coalesce(h.new_origins, '[]'::jsonb)) > jsonb_array_length(coalesce(h.old_origins, '[]'::jsonb))), '[]'::jsonb),
    -- my entries that became verified, or were used as a parent
    'verified', coalesce((select jsonb_agg(jsonb_build_object('name', c.cultivar_name, 'at', c.verified_at))
        from cultivars c where c.user_id = v_uid and c.verified_at > p_since), '[]'::jsonb),
    'as_parent', coalesce((select jsonb_agg(jsonb_build_object('name', k.cultivar_name, 'parent', c.cultivar_name, 'at', k.created_at))
        from cultivars c join cultivars k on (k.parent_a_id = c.id or k.parent_b_id = c.id)
       where c.user_id = v_uid and k.created_at > p_since and k.user_id is distinct from v_uid and coalesce(k.is_private, false) = false), '[]'::jsonb)
  ) into v;
  return v;
end;
$$;
revoke all on function public.my_updates(timestamptz) from public, anon;
grant execute on function public.my_updates(timestamptz) to authenticated;
