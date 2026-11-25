-- 11-26 owner: 「Red crystallinum は Hybrid です」 → parentage hybrid (not a Clone; type stays hybrid, other tags kept).
-- The record's text is not changed.
update public.cultivars
set tags = coalesce((select array_agg(t) from unnest(coalesce(tags, '{}')) t where t not like 'parentage:%'), '{}') || array['parentage:hybrid']
where id = 52 and cultivar_name = 'Anthurium ''Red Crystallinum''' and type = 'hybrid';

select id, cultivar_name, type, array_to_string(tags, ',') tags from public.cultivars where id = 52;
