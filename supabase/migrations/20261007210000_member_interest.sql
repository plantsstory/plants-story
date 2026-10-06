-- Board 8 (2026-10-07b) T86: the list of people who asked to hear when membership opens.
-- One row per signed-in user, added by the user's own tap (or after logging in with that intent), removable by the
-- user. The one launch notice is sent by member-launch-notify only after the owner approves (Secrets flag), and
-- notified_at keeps it to once per person.
create table if not exists public.member_interest (
  user_id uuid primary key references auth.users(id) on delete cascade,
  source text,
  created_at timestamptz not null default now(),
  notified_at timestamptz
);
alter table public.member_interest enable row level security;
drop policy if exists "Own member_interest read" on public.member_interest;
create policy "Own member_interest read" on public.member_interest for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Own member_interest delete" on public.member_interest;
create policy "Own member_interest delete" on public.member_interest for delete using (user_id = auth.uid());
revoke insert, update on public.member_interest from anon, authenticated;

create or replace function public.set_member_interest(p_source text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'login');
  end if;
  insert into member_interest (user_id, source) values (auth.uid(), left(coalesce(p_source, 'unknown'), 40))
  on conflict (user_id) do nothing;
  get diagnostics v_new = row_count;
  return jsonb_build_object('ok', true, 'added', v_new);
end;
$$;
revoke all on function public.set_member_interest(text) from public;
grant execute on function public.set_member_interest(text) to authenticated;
