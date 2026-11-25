-- 11-25 owner: 「king of spades は hybrid・clone です」 → parentage hybrid (it stays a Clone, tag line kept).
-- The record's text is not changed.
update public.cultivars
set tags = coalesce((select array_agg(t) from unnest(coalesce(tags, '{}')) t where t not like 'parentage:%'), '{}') || array['parentage:hybrid']
where id = 2 and cultivar_name = 'Anthurium ''King of Spades''' and type = 'clone';

select id, cultivar_name, type, array_to_string(tags, ',') tags from public.cultivars where id = 2;
