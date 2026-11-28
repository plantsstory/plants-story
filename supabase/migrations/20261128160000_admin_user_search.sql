-- Admin user search (2026-11-28, Yuta): find an account by 表示名, ユーザー名, Instagram, X,
-- メールアドレス or the name on the Google account. Admin only; nothing here is shown on the site.
-- Same signature as before, so the existing ユーザー page keeps working. p_filter_status 'no_name'
-- lists accounts that have no 表示名 yet.

create or replace function public.admin_list_users(
  p_search text default null,
  p_filter_status text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
set statement_timeout = '15s'
as $$
declare
  v_q text := lower(btrim(coalesce(p_search, '')));
  v_total int;
  v_rows jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'error', 'Admin only');
  end if;
  -- "@name" and profile links match the same as the bare name
  v_q := regexp_replace(v_q, '^https?://(www\.)?(instagram\.com|x\.com|twitter\.com)/', '');
  v_q := btrim(regexp_replace(v_q, '^@', ''), '/ ');

  with base as (
    select u.id, u.email, u.created_at as signed_up_at, u.last_sign_in_at,
           u.raw_app_meta_data ->> 'provider' as provider,
           coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), u.raw_user_meta_data ->> 'name') as google_name,
           p.display_name, p.username, p.avatar_url, p.sns_instagram, p.sns_twitter,
           coalesce(p.created_at, u.created_at) as created_at
      from auth.users u
      left join public.profiles p on p.id = u.id
  ), hit as (
    select b.*,
           array_remove(array[
             case when strpos(lower(coalesce(b.display_name, '')), v_q) > 0 then 'display_name' end,
             case when strpos(lower(coalesce(b.username, '')), v_q) > 0 then 'username' end,
             case when strpos(lower(coalesce(b.sns_instagram, '')), v_q) > 0 then 'instagram' end,
             case when strpos(lower(coalesce(b.sns_twitter, '')), v_q) > 0 then 'x' end,
             case when strpos(lower(coalesce(b.email, '')), v_q) > 0 then 'email' end,
             case when strpos(lower(coalesce(b.google_name, '')), v_q) > 0 then 'google_name' end,
             case when b.id::text = v_q then 'id' end
           ], null) as matched
      from base b
  ), pick as (
    select * from hit
     where (v_q = '' or cardinality(matched) > 0)
       and (coalesce(p_filter_status, '') = ''
            or (p_filter_status = 'no_name' and btrim(coalesce(display_name, '')) = ''))
  )
  select (select count(*) from pick),
         (select coalesce(jsonb_agg(r order by r.created_at desc), '[]'::jsonb) from (
            select id, email, display_name, username, avatar_url, sns_instagram, sns_twitter,
                   google_name, provider, created_at, last_sign_in_at, matched
              from pick
             order by created_at desc
             limit greatest(1, least(coalesce(p_limit, 50), 200)) offset greatest(0, coalesce(p_offset, 0))
          ) r)
    into v_total, v_rows;

  return jsonb_build_object('success', true, 'total', v_total, 'users', v_rows);
end;
$$;

revoke execute on function public.admin_list_users(text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_users(text, text, integer, integer) to authenticated;
