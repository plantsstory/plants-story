-- Post check scenarios: one row per new entry, never on an edit, claims are exclusive, a lost claim never comes back.
\set ON_ERROR_STOP 1
create function pg_temp.ok(cond boolean, what text) returns void language plpgsql as $$
begin if not cond then raise exception 'FAIL: %', what; end if; raise notice 'ok: %', what; end $$;

-- 1. a new entry queues one check and asks for it at once
insert into public.cultivars (cultivar_name, genus, type) values ('Anthurium crystallinum ''RA1''', 'Anthurium', 'species');
select pg_temp.ok((select count(*) from public.post_checks) = 1, 'insert queues one check');
select pg_temp.ok((select count(*) from net.calls) = 1, 'insert calls post-check once');

-- 2. edits never queue again
update public.cultivars set cultivar_name = 'Anthurium crystallinum ''RA2''', type = 'clone', origins = '[]' where id = 1;
update public.cultivars set tags = array['parentage:species'] where id = 1;
select pg_temp.ok((select count(*) from public.post_checks) = 1 and (select count(*) from net.calls) = 1, 'edits queue nothing and call nothing');

-- 3. claims: two takers never get the same row; a claimed row is not offered again
select pg_temp.ok((select count(*) from public.claim_post_checks(5)) = 1, 'first claim takes the row');
select pg_temp.ok((select count(*) from public.claim_post_checks(5)) = 0, 'second claim gets nothing');
select pg_temp.ok((select status from public.post_checks where cultivar_id = 1) = 'checking', 'row is checking');

-- 4. a claim that never finished becomes failed, not queued (the AI may have been asked already)
update public.post_checks set claimed_at = now() - interval '1 hour' where cultivar_id = 1;
select public.post_check_sweep();
select pg_temp.ok((select status from public.post_checks where cultivar_id = 1) = 'failed', 'lost claim -> failed');
select pg_temp.ok((select count(*) from public.claim_post_checks(5)) = 0, 'failed is never claimed again');
select pg_temp.ok((select count(*) from net.calls) = 1, 'sweep with nothing queued calls nothing');

-- 5. a post never fails because of the check (pg_net down): the row waits for the sweep
insert into net.fail values (true);
insert into public.cultivars (cultivar_name, genus, type) values ('Anthurium ''Galaxy''', 'Anthurium', 'hybrid');
select pg_temp.ok((select count(*) from public.cultivars) = 2, 'post saved while pg_net is down');
select pg_temp.ok((select status from public.post_checks where cultivar_id = 2) = 'queued', 'the check still waits for the sweep');
delete from net.fail;
select public.post_check_sweep();
select pg_temp.ok((select count(*) from net.calls) = 2, 'sweep calls for the waiting row');

-- 6. the owner: review and hand-queue, admin only, once per entry
update auth.ctx set admin = false;
select pg_temp.ok((public.review_post_check((select id from public.post_checks where cultivar_id = 1)) ->> 'success')::boolean = false, 'non-admin cannot review');
select pg_temp.ok((public.queue_post_check_for(2) ->> 'success')::boolean = false, 'non-admin cannot queue');
update auth.ctx set admin = true;
select pg_temp.ok((public.review_post_check((select id from public.post_checks where cultivar_id = 1)) ->> 'success')::boolean, 'admin reviews');
select pg_temp.ok((select reviewed_at is not null from public.post_checks where cultivar_id = 1), 'reviewed_at set');
select pg_temp.ok((public.queue_post_check_for(1) ->> 'error') = 'already checked', 'an entry is never queued twice');
delete from public.post_checks where cultivar_id = 2;
select pg_temp.ok((public.queue_post_check_for(2) ->> 'success')::boolean, 'admin queues an older entry');
select pg_temp.ok((select status from public.post_checks where cultivar_id = 2) = 'queued', 'hand-queued row waits');
select public.post_check_sweep();
select pg_temp.ok((select count(*) from net.calls) = 4, 'hand-queue and sweep each call once');

-- 7. RLS: only the admin reads the rows; the site's users cannot write them
select pg_temp.ok(not has_table_privilege('anon', 'public.post_checks', 'select'), 'anon cannot read');
select pg_temp.ok(not has_table_privilege('authenticated', 'public.post_checks', 'insert'), 'users cannot insert');
select pg_temp.ok(not has_function_privilege('authenticated', 'public.claim_post_checks(int)', 'execute'), 'users cannot claim');
select pg_temp.ok((select count(*) from cron.job where jobname = 'post-check-sweep') = 1, 'sweep scheduled');
