-- Scenario test for 20261127130000_origin_translations.sql (run by tests/sql/run.sh on a throwaway local
-- Postgres with tests/sql/stub.sql; never on production). Raises an exception on the first wrong result.
create trigger cultivars_write_guard_trg before insert or update on public.cultivars
  for each row execute function public.cultivars_write_guard();

create function pg_temp.expect(ok boolean, what text) returns void language plpgsql as $$
begin if not ok then raise exception 'FAILED: %', what; end if; raise notice 'ok: %', what; end $$;

-- 1. a signed-in user posts in Japanese, trying to slip in a translation of their own
update auth.ctx set role = 'authenticated', uid = '00000000-0000-0000-0000-000000000001', admin = false;
insert into public.cultivars (cultivar_name, origins) values ('Anthurium test', jsonb_build_array(jsonb_build_object(
  'body', '2019年にタイのナーセリーで選抜された株。Banta が名付けた。', 'source_type', 'manual', 'trust', 30,
  'author', jsonb_build_object('isAI', false, 'name', 'User'),
  'tr', jsonb_build_object('en', jsonb_build_object('text', 'spam', 'from', '2019年にタイのナーセリーで選抜された株。Banta が名付けた。')))));
select pg_temp.expect((select origins->0 ? 'tr' from cultivars where cultivar_name = 'Anthurium test') = false, 'user cannot write a translation on insert');
select pg_temp.expect((select count(*) from origin_translations where status = 'queued') = 1, 'person''s words are queued');

-- 2. AI / database records and a generated body with Latin fields are not queued (a record a user sends is
--    always theirs, even when it claims to be AI, so that one is queued)
insert into public.cultivars (cultivar_name, origins) values ('Anthurium ai', '[{"body":"AI の文","body_en":"AI text","source_type":"ai","author":{"isAI":true}}]');
update auth.ctx set role = 'service_role', admin = false;
insert into public.cultivars (cultivar_name, origins) values ('Anthurium ai2', '[{"body":"AI の文","body_en":"AI text","source_type":"ai","author":{"isAI":true}}]');
update auth.ctx set role = 'authenticated';
insert into public.cultivars (cultivar_name, origins) values ('Anthurium gen', '[{"body":"1878 年、Master が記載した","body_generated":true,"source_type":"manual","structured":{"origin_type":"species","author_name":"Master","publication_year":1878}}]');
insert into public.cultivars (cultivar_name, origins) values ('Anthurium genja', '[{"body":"分布は コロンビア","body_generated":true,"source_type":"manual","structured":{"origin_type":"species","known_habitats":"コロンビア"}}]');
select pg_temp.expect((select count(*) from origin_translations) = 3 and not exists (select 1 from origin_translations where cultivar_name in ('Anthurium ai2', 'Anthurium gen')), 'only person bodies needing words are queued (the Japanese field value counts)');

-- 3. the draft arrives, the owner approves an edited text
update auth.ctx set role = 'service_role';
update origin_translations set status = 'drafted', src_lang = 'ja', dst_lang = 'en', draft_text = 'Selected at a Thai nursery in 2019; named by Banta.', model = 'claude-sonnet-5-5'
 where cultivar_name = 'Anthurium test';
update auth.ctx set role = 'authenticated', uid = '00000000-0000-0000-0000-000000000009', admin = false;
select pg_temp.expect((select decide_translation((select id from origin_translations where cultivar_name = 'Anthurium test'), 'approve'))->>'success' = 'false', 'non-admin cannot approve');
update auth.ctx set admin = true;
select pg_temp.expect((select decide_translation((select id from origin_translations where cultivar_name = 'Anthurium test'), 'approve', 'A plant selected at a Thai nursery in 2019 and named by Banta.'))->>'success' = 'true', 'admin approves');
select pg_temp.expect((select origins->0->'tr'->'en'->>'text' from cultivars where cultivar_name = 'Anthurium test') = 'A plant selected at a Thai nursery in 2019 and named by Banta.', 'approved text written to the record');
select pg_temp.expect((select (origins->0->'tr'->'en'->>'edited')::boolean from cultivars where cultivar_name = 'Anthurium test'), 'edit is marked');
select pg_temp.expect((select count(*) from origin_translations where status = 'queued' and cultivar_name = 'Anthurium test') = 0, 'approval does not queue the record again');

-- 4. the owner (poster) edits something else: the translation stays; a forged one does not get in
update auth.ctx set role = 'authenticated', uid = '00000000-0000-0000-0000-000000000001', admin = false;
update cultivars set origins = jsonb_set(origins, '{0,trust}', '31') where cultivar_name = 'Anthurium test';
select pg_temp.expect((select origins->0->'tr'->'en'->>'text' from cultivars where cultivar_name = 'Anthurium test') like 'A plant selected%', 'unchanged words keep the approved translation');
update cultivars set origins = jsonb_set(origins, '{0,tr,en,text}', '"forged"') where cultivar_name = 'Anthurium test';
select pg_temp.expect((select origins->0->'tr'->'en'->>'text' from cultivars where cultivar_name = 'Anthurium test') like 'A plant selected%', 'user cannot change the approved translation');

-- 5. the poster rewrites the words: the old translation is dropped and the new words are queued
update cultivars set origins = jsonb_set(origins, '{0,body}', '"2019年にタイで選抜。名付けたのは John Banta。"') where cultivar_name = 'Anthurium test';
select pg_temp.expect((select origins->0 ? 'tr' from cultivars where cultivar_name = 'Anthurium test') = false, 'changed words lose the old translation');
select pg_temp.expect((select count(*) from origin_translations where cultivar_name = 'Anthurium test' and status = 'queued') = 1, 'new words are queued');

-- 6. a draft whose words changed before approval goes stale
update auth.ctx set role = 'service_role';
update origin_translations set status = 'drafted', src_lang = 'ja', dst_lang = 'en', draft_text = 'x' where cultivar_name = 'Anthurium test' and status = 'queued';
update auth.ctx set role = 'authenticated';
update cultivars set origins = jsonb_set(origins, '{0,body}', '"また書き直した本文です。"') where cultivar_name = 'Anthurium test';
select pg_temp.expect((select count(*) from origin_translations where cultivar_name = 'Anthurium test' and status = 'stale') = 1, 'draft of old words is stale');

-- 7. keep the original, and redo with a hint
update auth.ctx set role = 'service_role';
update origin_translations set status = 'drafted', src_lang = 'ja', dst_lang = 'en', draft_text = 'y' where cultivar_name = 'Anthurium genja';
update auth.ctx set role = 'authenticated', admin = true;
select pg_temp.expect((select decide_translation((select id from origin_translations where cultivar_name = 'Anthurium genja'), 'redo', 'コロンビア is Colombia'))->>'status' = 'queued', 'redo goes back to the queue');
select pg_temp.expect((select hint from origin_translations where cultivar_name = 'Anthurium genja') = 'コロンビア is Colombia', 'hint kept');
update origin_translations set status = 'drafted', dst_lang = 'en', draft_text = 'y' where cultivar_name = 'Anthurium genja';
select pg_temp.expect((select decide_translation((select id from origin_translations where cultivar_name = 'Anthurium genja'), 'keep'))->>'status' = 'kept', 'keep original');
select pg_temp.expect((select (origins->0->'tr'->'en'->>'keep')::boolean from cultivars where cultivar_name = 'Anthurium genja'), 'keep mark written');

-- 8. anon cannot read the queue
select pg_temp.expect(not has_table_privilege('anon', 'public.origin_translations', 'select'), 'anon has no access');
