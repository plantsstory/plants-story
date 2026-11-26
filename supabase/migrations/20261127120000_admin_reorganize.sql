-- Admin reorganisation (2026-11-26).
-- 1. Reports (deletion_requests) were readable by anyone, reason_detail and reporter included. Only the admin reads
--    them now; visitors still send them through submit_deletion_request (security definer), which is unchanged.
-- 2. admin_storage_usage(): the real size of each storage bucket for サイトの状況 (it showed photos x 250KB).
drop policy if exists "Public read deletion_requests" on public.deletion_requests;
drop policy if exists "Admin read deletion_requests" on public.deletion_requests;
create policy "Admin read deletion_requests" on public.deletion_requests
  for select using (public.is_admin());

create or replace function public.admin_storage_usage()
returns table(bucket_id text, files bigint, bytes bigint)
language plpgsql
security definer
set search_path = public, storage
set statement_timeout to '10s'
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;
  return query
    select o.bucket_id::text, count(*)::bigint, coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint
      from storage.objects o
     group by o.bucket_id
     order by 1;
end;
$$;
revoke all on function public.admin_storage_usage() from public, anon;
grant execute on function public.admin_storage_usage() to authenticated;
