-- Scenarios for admin_list_users. Each "check" line prints ok or fails the run.
create function t_ids(j jsonb) returns text language sql as $$
  select coalesce(string_agg(x ->> 'email', ',' order by x ->> 'email'), '') from jsonb_array_elements(j -> 'users') x $$;
create function check_eq(label text, got text, want text) returns text language plpgsql as $$
begin if got is distinct from want then raise exception '% : got [%] want [%]', label, got, want; end if; return 'ok ' || label; end $$;

insert into auth.users (id, email, created_at, raw_user_meta_data) values
 ('00000000-0000-0000-0000-000000000001', 'hanako@example.com', now() - interval '3 day', '{"full_name":"Hanako Yamada"}'),
 ('00000000-0000-0000-0000-000000000002', 'taro@example.com',   now() - interval '2 day', '{"name":"Taro Suzuki"}'),
 ('00000000-0000-0000-0000-000000000003', 'noname@example.com', now() - interval '1 day', '{}'),
 ('00000000-0000-0000-0000-000000000004', 'noprof@example.com', now(), '{"full_name":"No Profile"}');
insert into public.profiles (id, display_name, username, sns_instagram, sns_twitter, created_at) values
 ('00000000-0000-0000-0000-000000000001', 'はなこ', 'hana_plants', 'hana.aroid', '', now() - interval '3 day'),
 ('00000000-0000-0000-0000-000000000002', 'Taro', null, '', 'https://x.com/taro_x', now() - interval '2 day'),
 ('00000000-0000-0000-0000-000000000003', '  ', 'nn', '', '', now() - interval '1 day');

select check_eq('not admin refused', (public.admin_list_users('a') ->> 'success'), 'false');
update auth.ctx set admin = true;
select check_eq('empty lists all incl. no profile', t_ids(public.admin_list_users(null)), 'hanako@example.com,noname@example.com,noprof@example.com,taro@example.com');
select check_eq('total', public.admin_list_users(null) ->> 'total', '4');
select check_eq('display name', t_ids(public.admin_list_users('はな')), 'hanako@example.com');
select check_eq('username', t_ids(public.admin_list_users('HANA_PL')), 'hanako@example.com');
select check_eq('instagram with @', t_ids(public.admin_list_users('@hana.aroid')), 'hanako@example.com');
select check_eq('instagram url', t_ids(public.admin_list_users('https://www.instagram.com/hana.aroid/')), 'hanako@example.com');
select check_eq('x handle inside url', t_ids(public.admin_list_users('taro_x')), 'taro@example.com');
select check_eq('email', t_ids(public.admin_list_users('noname@')), 'noname@example.com');
select check_eq('google full_name', t_ids(public.admin_list_users('yamada')), 'hanako@example.com');
select check_eq('google name fallback', t_ids(public.admin_list_users('suzuki')), 'taro@example.com');
select check_eq('google name, no profile', t_ids(public.admin_list_users('no profile')), 'noprof@example.com');
select check_eq('id', t_ids(public.admin_list_users('00000000-0000-0000-0000-000000000002')), 'taro@example.com');
select check_eq('percent is literal', t_ids(public.admin_list_users('%')), '');
select check_eq('underscore is literal', t_ids(public.admin_list_users('a_p')), 'hanako@example.com');
select check_eq('matched fields', (public.admin_list_users('hana') -> 'users' -> 0 -> 'matched')::text, '["username", "instagram", "email", "google_name"]');
select check_eq('no display name filter', t_ids(public.admin_list_users(null, 'no_name')), 'noname@example.com,noprof@example.com');
select check_eq('paging', t_ids(public.admin_list_users(null, null, 1, 1)), 'noname@example.com');
select check_eq('paging total', public.admin_list_users(null, null, 1, 1) ->> 'total', '4');
select check_eq('newest first', public.admin_list_users(null) -> 'users' -> 0 ->> 'email', 'noprof@example.com');
select check_eq('anon cannot run', has_function_privilege('anon', 'public.admin_list_users(text,text,integer,integer)', 'execute')::text, 'false');
