-- The admin's お問い合わせ page could not read the messages: the API roles hold no table privilege on
-- contact_messages (only the admin-only policies exist), so every read answered "permission denied".
-- Instead of granting the table to every signed-in role, the admin reads and marks messages through two
-- functions that check is_admin() themselves. Nothing changes for anyone else.
create or replace function public.admin_contact_messages(p_limit integer default 200)
returns setof public.contact_messages
language plpgsql
security definer
set search_path = public
set statement_timeout to '10s'
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  return query select * from contact_messages order by created_at desc limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;
revoke all on function public.admin_contact_messages(integer) from public, anon;
grant execute on function public.admin_contact_messages(integer) to authenticated;

create or replace function public.admin_set_contact_status(p_id text, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n int;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'error', 'admin only');
  end if;
  if p_status not in ('new', 'done') then
    return jsonb_build_object('success', false, 'error', 'bad status');
  end if;
  update contact_messages set status = p_status where id::text = p_id;
  get diagnostics v_n = row_count;
  return jsonb_build_object('success', v_n = 1);
end;
$$;
revoke all on function public.admin_set_contact_status(text, text) from public, anon;
grant execute on function public.admin_set_contact_status(text, text) to authenticated;
