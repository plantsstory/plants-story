-- Scenario test for 20261128170000_admin_requests.sql (run by tests/sql/admin-requests-run.sh on a throwaway local
-- Postgres with tests/sql/admin-requests-stub.sql; never on production). Raises an exception on the first wrong result.
create function pg_temp.expect(ok boolean, what text) returns void language plpgsql as $$
begin if not ok then raise exception 'FAILED: %', what; end if; raise notice 'ok: %', what; end $$;
-- true when the statement raises an error whose text contains p_like
create function pg_temp.raises(p_sql text, p_like text) returns boolean language plpgsql as $$
begin execute p_sql; return false; exception when others then return sqlerrm like '%' || p_like || '%'; end $$;

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'poster@example.com', '{"provider":"google"}'),
  ('00000000-0000-0000-0000-000000000002', 'other@example.com', '{"provider":"google"}'),
  ('00000000-0000-0000-0000-0000000000aa', 'admin@example.com', '{"provider":"google","role":"admin"}');
create function pg_temp.as_user(n int) returns void language sql as $$
  update auth.ctx set uid = ('00000000-0000-0000-0000-00000000000' || n)::uuid, admin = false $$;
create function pg_temp.as_admin() returns void language sql as $$
  update auth.ctx set uid = '00000000-0000-0000-0000-0000000000aa', admin = true $$;

-- poster makes an entry, a photo and a profile
select pg_temp.as_user(1);
insert into public.profiles (id, display_name, username) values ('00000000-0000-0000-0000-000000000001', 'はれ', 'hare');
insert into public.cultivars (cultivar_name, user_id) values ('Anthurium one', '00000000-0000-0000-0000-000000000001'), ('Anthurium two', '00000000-0000-0000-0000-000000000001');
insert into public.cultivar_images (cultivar_name, storage_path, user_id) values ('Anthurium one', 'a/1.jpg', '00000000-0000-0000-0000-000000000001');

-- 1. only the admin can stop an account; not themself, not another admin, not into the past
select pg_temp.expect(pg_temp.raises($$select public.admin_suspend('00000000-0000-0000-0000-000000000002')$$, 'admin only'), 'non-admin cannot stop an account');
select pg_temp.as_admin();
select pg_temp.expect((public.admin_suspend('00000000-0000-0000-0000-0000000000aa') ->> 'success')::boolean = false, 'admin cannot stop themself');
update auth.ctx set uid = '00000000-0000-0000-0000-000000000002';   -- a second admin acting
select pg_temp.expect((public.admin_suspend('00000000-0000-0000-0000-0000000000aa') ->> 'error') like '%管理者%', 'another admin cannot be stopped');
select pg_temp.as_admin();
select pg_temp.expect((public.admin_suspend('00000000-0000-0000-0000-000000000001', true, 'x', now() - interval '1 day') ->> 'success')::boolean = false, 'end in the past refused');
select pg_temp.expect((public.admin_suspend('00000000-0000-0000-0000-000000000009') ->> 'success')::boolean = false, 'unknown account refused');

-- 2. a 受付 from a report: poster found from the item, the step written to 操作記録
select pg_temp.expect((select public.admin_case_save(jsonb_build_object('kind', 'takedown', 'item_type', 'cultivar',
  'item_id', (select id::text from cultivars where cultivar_name = 'Anthurium one'), 'item_label', 'Anthurium one',
  'requester', '山田', 'summary', '写真が無断転載', 'source_type', 'report', 'source_id', '5',
  'due_at', (now() + interval '7 days')::text)) ->> 'success')::boolean, 'case created');
select pg_temp.expect((select poster_id = '00000000-0000-0000-0000-000000000001' and status = 'open' and created_by = '00000000-0000-0000-0000-0000000000aa' from admin_cases where id = 1), 'poster found from the entry');
select pg_temp.expect((select count(*) from admin_actions where action = 'case_create' and target_id = '1' and admin_email = 'admin@example.com') = 1, 'case_create logged with admin email');
select pg_temp.expect((public.admin_case_save('{"id": 1, "due_at": "not a date"}') ->> 'success')::boolean = false, 'bad date answers an error, not an exception');
select pg_temp.expect((public.admin_case_save('{"id": 1, "kind": "nonsense"}') ->> 'success')::boolean = false, 'bad kind refused');
select pg_temp.expect((public.admin_case_save('{"id": 99}') ->> 'success')::boolean = false, 'unknown case refused');
select public.admin_case_save('{"id": 1, "requester_contact": "yamada@example.com", "summary": "写真が無断転載"}');
select pg_temp.expect((select detail -> 'changed' = '["requester_contact"]'::jsonb from admin_actions where action = 'case_update' order by id desc limit 1), 'update logs only the changed field');
select public.admin_case_save('{"id": 1, "summary": "写真が無断転載"}');
select pg_temp.expect((select count(*) from admin_actions where action = 'case_update') = 1, 'a save that changes nothing is not logged');
select public.admin_case_save('{"id": 1, "requester_contact": ""}');
select pg_temp.expect((select requester_contact is null from admin_cases where id = 1), 'empty string clears a field');

-- 3. asking the poster, the reply, a note
select pg_temp.expect((public.admin_case_step(1, 'note', '  ') ->> 'success')::boolean = false, 'empty note refused');
select public.admin_case_step(1, 'ask', 'poster@example.com', 14);
select pg_temp.expect((select status = 'asked' and ask_due_at > now() + interval '13 days' and ask_due_at < now() + interval '15 days' from admin_cases where id = 1), 'ask sets 照会中 and the reply deadline');
select public.admin_case_step(1, 'reply', '削除に同意します');
select pg_temp.expect((select ask_reply = '削除に同意します' and ask_replied_at is not null from admin_cases where id = 1), 'reply kept');
select public.admin_case_step(1, 'note', '電話で確認');
select pg_temp.expect((public.admin_case_step(1, 'nonsense') ->> 'success')::boolean = false, 'unknown step refused');

-- 4. stopping the poster from the 受付
select pg_temp.expect((public.admin_suspend('00000000-0000-0000-0000-000000000001', true, '無断転載を繰り返した', null, 1) ->> 'suspended')::boolean, 'poster stopped');
select pg_temp.expect((select count(*) from admin_actions where action = 'suspend' and detail ->> 'case_id' = '1') = 1, 'suspend logged with the case');

-- 5. the stopped poster cannot post, edit, add a photo or change the profile; deleting still works
select pg_temp.as_user(1);
select pg_temp.expect(pg_temp.raises($$insert into public.cultivars (cultivar_name, user_id) values ('Anthurium three', '00000000-0000-0000-0000-000000000001')$$, '利用を停止'), 'stopped: new entry refused');
select pg_temp.expect(pg_temp.raises($$update public.cultivars set origins = '[]' where cultivar_name = 'Anthurium one'$$, '利用を停止'), 'stopped: edit refused');
select pg_temp.expect(pg_temp.raises($$insert into public.cultivar_images (cultivar_name, storage_path, user_id) values ('Anthurium one', 'a/2.jpg', '00000000-0000-0000-0000-000000000001')$$, '利用を停止'), 'stopped: photo row refused');
select pg_temp.expect(pg_temp.raises($$update public.profiles set bio = 'hi' where id = '00000000-0000-0000-0000-000000000001'$$, '利用を停止'), 'stopped: profile change refused');
select pg_temp.expect(public.photo_upload_allowed('gallery-images') = false, 'stopped: photo file upload refused');
select pg_temp.expect((public.my_suspension() ->> 'suspended')::boolean, 'my_suspension says stopped');
delete from public.cultivars where cultivar_name = 'Anthurium two';
select pg_temp.expect((select count(*) from cultivars where cultivar_name = 'Anthurium two') = 0, 'stopped: own entry can still be deleted');
select pg_temp.expect((select count(*) from admin_actions where action = 'delete') = 0, 'a poster deleting their own entry is not an admin step');

-- 6. someone else is unaffected, and so is the admin acting on the stopped poster's rows
select pg_temp.as_user(2);
insert into public.cultivars (cultivar_name, user_id) values ('Anthurium other', '00000000-0000-0000-0000-000000000002');
select pg_temp.expect(public.photo_upload_allowed('gallery-images'), 'other member may upload');
select pg_temp.expect((public.my_suspension() ->> 'suspended')::boolean = false, 'my_suspension says not stopped');
select pg_temp.as_admin();
update public.cultivars set origins = '[{"body":"fixed by admin"}]' where cultivar_name = 'Anthurium one';
select pg_temp.expect((select origins ->> 0 is not null from cultivars where cultivar_name = 'Anthurium one'), 'admin can still edit the stopped poster''s entry');
-- no person behind the write (cron, AI translation): not blocked
update auth.ctx set uid = null, admin = false;
update public.cultivars set origins = '[{"body":"cron"}]' where cultivar_name = 'Anthurium one';

-- 7. a stop with an end that has passed no longer blocks
select pg_temp.as_admin();
update account_suspensions set until = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-000000000001';
select pg_temp.as_user(1);
insert into public.cultivars (cultivar_name, user_id) values ('Anthurium after', '00000000-0000-0000-0000-000000000001');
select pg_temp.expect((select count(*) from cultivars where cultivar_name = 'Anthurium after') = 1, 'expired stop: posting works again');
select pg_temp.as_admin();
select pg_temp.expect((select count(*) from jsonb_array_elements(public.admin_suspensions()) x where (x ->> 'active')::boolean) = 0, 'expired stop listed as not active');
select public.admin_suspend('00000000-0000-0000-0000-000000000001', true, '再度', now() + interval '3 days');
select pg_temp.expect((select (x ->> 'active')::boolean and x ->> 'email' = 'poster@example.com' from jsonb_array_elements(public.admin_suspensions()) x), 'stop again with an end date');
select public.admin_suspend('00000000-0000-0000-0000-000000000001', false, '解除');
select pg_temp.expect((select count(*) from account_suspensions) = 0 and (select count(*) from admin_actions where action = 'unsuspend') = 1, 'lifted and logged');
select public.admin_suspend('00000000-0000-0000-0000-000000000001', false);
select pg_temp.expect((select count(*) from admin_actions where action = 'unsuspend') = 1, 'lifting a not-stopped account logs nothing');

-- 8. steps elsewhere in the admin: report handled, contact handled, hold, admin delete
insert into public.deletion_requests (target_type, target_id, target_name, reason) values ('image', 'x', 'Anthurium one', 'copyright');
update public.deletion_requests set status = 'fixed', resolved_at = now();
select pg_temp.expect((select count(*) from admin_actions where action = 'report_fixed' and detail ->> 'reason' = 'copyright') = 1, 'report handled logged');
update public.deletion_requests set resolved_at = now();
select pg_temp.expect((select count(*) from admin_actions where action like 'report_%') = 1, 'report update without status change not logged');
insert into public.contact_messages (name, email, message) values ('a', 'a@example.com', 'm');
update public.contact_messages set status = 'done';
select pg_temp.expect((select count(*) from admin_actions where action = 'contact_done') = 1, 'contact handled logged');
select public.admin_post_hold('cultivar', (select id::text from cultivars where cultivar_name = 'Anthurium one'), true, '山田さんの申出');
select pg_temp.expect((select count(*) from admin_actions where action = 'hold_on' and detail ->> 'reason' = '山田さんの申出') = 1, 'hold logged');
delete from public.cultivars where cultivar_name = 'Anthurium other';
select pg_temp.expect((select count(*) from admin_actions where action = 'delete' and detail ->> 'label' = 'Anthurium other') = 1, 'admin delete logged');
select pg_temp.as_user(2);
update public.deletion_requests set status = 'rejected';   -- no admin (RLS would stop this on the site anyway)
select pg_temp.as_admin();
select pg_temp.expect((select count(*) from admin_actions where action = 'report_rejected') = 0, 'non-admin change not logged');

-- 9. looking at a poster is logged once per 10 minutes; the case shows its history
select public.admin_post_account('00000000-0000-0000-0000-000000000001');
select public.admin_post_account('00000000-0000-0000-0000-000000000001');
select count(*) from public.admin_post_log(null, null, '00000000-0000-0000-0000-000000000001');
select pg_temp.expect((select count(*) from admin_actions where action = 'lookup' and target_id = '00000000-0000-0000-0000-000000000001') = 1, 'lookup logged once');
select pg_temp.expect((public.admin_post_account('00000000-0000-0000-0000-000000000001') ? 'suspension'), 'account shows suspension field');
select pg_temp.expect((select jsonb_array_length(public.admin_case_get(1) -> 'events') >= 7), 'case history has its steps');
select pg_temp.expect((select (public.admin_case_get(1) -> 'events') @> '[{"action":"hold_on"}]' and (public.admin_case_get(1) -> 'events') @> '[{"action":"suspend"}]'), 'case history includes the hold and the stop');
select pg_temp.expect((select not ((public.admin_case_get(1) -> 'events') @> '[{"action":"lookup"}]')), 'case history leaves out lookups');
select pg_temp.expect((public.admin_case_get(1) -> 'poster' ->> 'email') = 'poster@example.com' and (public.admin_case_get(1) -> 'hold') is not null, 'case shows poster email and hold');

-- 10. list order: closed last; status done sets closed_at and reopening clears it
select public.admin_case_save('{"kind": "disclosure", "due_at": "2026-01-01T00:00:00+09:00"}');
select pg_temp.expect((select (public.admin_cases_list(false) -> 0 ->> 'id')::int = 2), 'past deadline first');
select public.admin_case_save('{"id": 2, "status": "done"}');
select pg_temp.expect((select closed_at is not null from admin_cases where id = 2), 'done sets closed_at');
select pg_temp.expect((select jsonb_array_length(public.admin_cases_list(false)) = 1 and jsonb_array_length(public.admin_cases_list(true)) = 2), 'closed left out of open list');
select public.admin_case_save('{"id": 2, "status": "open"}');
select pg_temp.expect((select closed_at is null from admin_cases where id = 2), 'reopen clears closed_at');

-- 11. 操作記録 list and its filter; nobody else can read any of it
select pg_temp.expect((select (public.admin_actions_list('case_') ->> 'total')::int = (select count(*) from admin_actions where action like 'case_%')), 'filter by prefix');
select pg_temp.as_user(2);
select pg_temp.expect(pg_temp.raises($$select public.admin_actions_list()$$, 'admin only'), 'non-admin: 操作記録 closed');
select pg_temp.expect(pg_temp.raises($$select public.admin_cases_list()$$, 'admin only'), 'non-admin: 受付簿 closed');
select pg_temp.expect(pg_temp.raises($$select public.admin_case_get(1)$$, 'admin only'), 'non-admin: 受付 closed');
select pg_temp.expect(pg_temp.raises($$select public.admin_case_save('{}')$$, 'admin only'), 'non-admin: cannot create');
select pg_temp.expect(pg_temp.raises($$select public.admin_suspensions()$$, 'admin only'), 'non-admin: 停止の一覧 closed');
select pg_temp.expect(not has_table_privilege('authenticated', 'public.admin_actions', 'select')
  and not has_table_privilege('authenticated', 'public.admin_cases', 'select')
  and not has_table_privilege('anon', 'public.account_suspensions', 'select'), 'tables closed to the API roles');
select pg_temp.expect(not has_function_privilege('authenticated', 'public.admin_log(text, text, text, jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.is_suspended(uuid)', 'execute'), 'internal functions closed');

-- 12. 通報: a profile can be reported; unknown kinds still refused
select pg_temp.expect((public.submit_deletion_request('profile', '00000000-0000-0000-0000-000000000001', 'はれ', 'impersonation', null) ->> 'success')::boolean, 'profile report accepted');
select pg_temp.expect((public.submit_deletion_request('comment', 'x') ->> 'success')::boolean = false, 'unknown kind refused');
