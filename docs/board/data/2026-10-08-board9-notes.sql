-- board 9 (2026-10-08): bodies untouched. Notes that only repeat the body are emptied; a missing origin_type is filled.
begin;
update cultivars set origins = jsonb_set(origins, '{0,structured,notes}', 'null'::jsonb)
 where id in (110, 2) and origins->0->'structured'->>'notes' is not null
   and (id = 110 and origins->0->'structured'->>'notes' = origins->0->>'body'
        or id = 2 and origins->0->'structured'->>'notes' like '''King of Spades'' はオリジナル個体（クローン）の名前%');
update cultivars set origins = jsonb_set(origins, '{0,structured,origin_type}', '"clone"'::jsonb)
 where id = 53 and type = 'clone' and coalesce(origins->0->'structured'->>'origin_type', '') = '';
select json_agg(json_build_object('id', id, 'notes', origins->0->'structured'->'notes', 'ot', origins->0->'structured'->'origin_type', 'body', left(origins->0->>'body', 30))) from cultivars where id in (2, 53, 110);
commit;
