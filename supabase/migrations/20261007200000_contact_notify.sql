-- Board 8 (2026-10-07b) T81: contact messages reach the operator.
-- Live table (differs from the 08-23 file): id bigint identity, name, email, category, message, created_ip,
-- status ('new' by default), created_at. This adds notified_at, the category 'shop' (取扱店の掲載), and returns the new
-- id so the page can ask contact-notify to send one notice to the operator's fixed address.
alter table public.contact_messages add column if not exists notified_at timestamptz;

create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_category text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent int;
  v_id bigint;
  v_ip text;
begin
  if p_name is null or length(trim(p_name)) = 0 or length(p_name) > 100 then
    return jsonb_build_object('success', false, 'error', 'Invalid name');
  end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 255 then
    return jsonb_build_object('success', false, 'error', 'Invalid email');
  end if;
  if p_message is null or length(trim(p_message)) = 0 or length(p_message) > 5000 then
    return jsonb_build_object('success', false, 'error', 'Invalid message');
  end if;
  if p_category is null or p_category not in ('general', 'copyright', 'deletion', 'bug', 'shop') then
    p_category := 'general';
  end if;

  -- Rate limit: max 5 messages per hour per email address
  select count(*) into v_recent
    from contact_messages
   where email = p_email and created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    return jsonb_build_object('success', false, 'error', 'Rate limited');
  end if;

  -- the caller's address for abuse checks (cleared with the other IP columns after 180 days)
  begin
    v_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1);
  exception when others then
    v_ip := null;
  end;

  insert into contact_messages (name, email, category, message, created_ip)
  values (trim(p_name), p_email, p_category, trim(p_message), nullif(trim(v_ip), ''))
  returning id into v_id;

  return jsonb_build_object('success', true, 'id', v_id);
end;
$$;

grant execute on function public.submit_contact_message(text, text, text, text) to anon, authenticated;
