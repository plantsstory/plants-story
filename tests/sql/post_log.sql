-- Scenario test for 20261128150000_post_log.sql (run by tests/sql/post-log-run.sh on a throwaway local Postgres
-- with tests/sql/post-log-stub.sql; never on production). Raises an exception on the first wrong result.
create function pg_temp.expect(ok boolean, what text) returns void language plpgsql as $$
begin if not ok then raise exception 'FAILED: %', what; end if; raise notice 'ok: %', what; end $$;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001', 'poster@example.com'), ('00000000-0000-0000-0000-0000000000aa', 'admin@example.com');
insert into auth.sessions (user_id, ip, user_agent) values ('00000000-0000-0000-0000-000000000001', '198.51.100.7', 'iPhone Safari');

-- 1. a signed-in poster makes an entry: account, email, IP (first of x-forwarded-for) and browser are kept
update auth.ctx set uid = '00000000-0000-0000-0000-000000000001', admin = false;
select set_config('request.headers', '{"x-forwarded-for":"203.0.113.5, 10.0.0.1","user-agent":"Mozilla/5.0 test"}', false);
insert into public.cultivars (cultivar_name, user_id, origins) values ('Anthurium test', '00000000-0000-0000-0000-000000000001', '[{"body":"hello"}]');
select pg_temp.expect((select count(*) from post_log where action = 'create' and item_type = 'cultivar' and actor_email = 'poster@example.com' and ip = '203.0.113.5' and user_agent = 'Mozilla/5.0 test' and owner_id = '00000000-0000-0000-0000-000000000001' and item_label = 'Anthurium test') = 1, 'create logged with account, email, IP, browser');

-- 2. an edit: changed fields named, origins not copied, a timestamp-only update not logged
update public.cultivars set origins = '[{"body":"changed"}]', is_private = true where cultivar_name = 'Anthurium test';
select pg_temp.expect((select changed = array['is_private','origins'] and snapshot = '{"is_private": true}'::jsonb from post_log where action = 'edit'), 'edit names changed fields, keeps small values only');
update public.cultivars set updated_at = now(), changed_at = now() where cultivar_name = 'Anthurium test';
select pg_temp.expect((select count(*) from post_log where action = 'edit') = 1, 'timestamp-only update not logged');

-- 3. photo and profile
insert into public.cultivar_images (cultivar_name, storage_path, user_id) values ('Anthurium test', 'Anthurium test/1.jpg', '00000000-0000-0000-0000-000000000001');
insert into public.profiles (id, display_name) values ('00000000-0000-0000-0000-000000000001', 'はれ');
select pg_temp.expect((select count(*) from post_log where item_type = 'image' and item_label = 'Anthurium test / Anthurium test/1.jpg') = 1, 'photo logged');
select pg_temp.expect((select count(*) from post_log where item_type = 'profile' and owner_id = '00000000-0000-0000-0000-000000000001' and item_label = 'はれ') = 1, 'profile logged');

-- 4. the poster deletes their own photo: who, when and the row itself stay
delete from public.cultivar_images where storage_path = 'Anthurium test/1.jpg';
select pg_temp.expect((select snapshot ->> 'storage_path' = 'Anthurium test/1.jpg' and actor_email = 'poster@example.com' from post_log where action = 'delete' and item_type = 'image'), 'delete keeps a copy and the poster');

-- 5. service role / cron writes (no person) are not logged
update auth.ctx set uid = null;
update public.cultivars set origins = '[{"body":"ai translation"}]' where cultivar_name = 'Anthurium test';
select pg_temp.expect((select count(*) from post_log where action = 'edit') = 1, 'no-person write not logged');

-- 6. no request headers (e.g. SQL editor as a user) still logs, without IP; a broken log never blocks a post
update auth.ctx set uid = '00000000-0000-0000-0000-000000000001';
select set_config('request.headers', '', false);
insert into public.cultivars (cultivar_name, user_id) values ('Anthurium noip', '00000000-0000-0000-0000-000000000001');
select pg_temp.expect((select ip is null from post_log where item_label = 'Anthurium noip'), 'missing headers: logged without IP');
select set_config('request.headers', 'not json', false);
insert into public.cultivars (cultivar_name, user_id) values ('Anthurium badhdr', '00000000-0000-0000-0000-000000000001');
select pg_temp.expect((select count(*) from cultivars where cultivar_name = 'Anthurium badhdr') = 1, 'bad headers do not block the post');
select set_config('request.headers', '{}', false);

-- 7. only the admin reads
do $$ begin perform public.admin_post_log(); raise exception 'non-admin read the log'; exception when others then if sqlerrm <> 'admin only' then raise; end if; end $$;
do $$ begin perform public.admin_post_account('00000000-0000-0000-0000-000000000001'); raise exception 'non-admin read an account'; exception when others then if sqlerrm <> 'admin only' then raise; end if; end $$;
select pg_temp.expect(not has_table_privilege('authenticated', 'public.post_log', 'select') and not has_table_privilege('anon', 'public.post_log', 'select') and not has_table_privilege('authenticated', 'public.post_log_holds', 'select'), 'table closed to the API roles');
update auth.ctx set uid = '00000000-0000-0000-0000-0000000000aa', admin = true;
select pg_temp.expect((select count(*) from admin_post_log(p_user => '00000000-0000-0000-0000-000000000001')) >= 5, 'admin reads by account');
select pg_temp.expect((select count(*) from admin_post_log(p_text => 'test/1')) = 2, 'admin finds by name text');
select pg_temp.expect((select count(*) from admin_post_log(p_text => '%')) = 0, 'a percent sign is literal');
select pg_temp.expect((select count(*) from admin_post_log(p_text => 'Poster@Example.com ')) = 7, 'admin finds by sign-in address');
select pg_temp.expect((select a ->> 'email' = 'poster@example.com' and a ->> 'display_name' = 'はれ' and a -> 'sessions' -> 0 ->> 'ip' = '198.51.100.7' and (a ->> 'entries')::int = 3 from admin_post_account('00000000-0000-0000-0000-000000000001') a), 'admin reads the account with devices');

-- 8. hold (保全): snapshot taken, kept past 180 days; others erased; release lets it go
select pg_temp.expect((select (admin_post_hold('cultivar', (select id::text from cultivars where cultivar_name = 'Anthurium test'), true, '開示請求 2026-11'))->>'had_row' = 'true'), 'hold takes a snapshot');
update post_log set at = now() - interval '200 days';
select pg_temp.expect(cleanup_post_log() > 0, 'old rows erased');
select pg_temp.expect((select count(*) from post_log where item_label = 'Anthurium test' and item_type = 'cultivar') = 2 and (select count(*) from post_log where item_type = 'image') = 0, 'held item kept, others gone');
select pg_temp.expect((select snapshot ->> 'cultivar_name' from post_log_holds) = 'Anthurium test', 'hold row has the copy');
select admin_post_hold('cultivar', (select id::text from cultivars where cultivar_name = 'Anthurium test'), false);
select pg_temp.expect(cleanup_post_log() = 2, 'released item erased next run');
select pg_temp.expect((select count(*) from post_log) = 0, 'log empty after release');
select pg_temp.expect((select count(*) from cron.job where jobname = 'cleanup-post-log-daily' and schedule = '40 16 * * *') = 1, 'daily erase scheduled');
