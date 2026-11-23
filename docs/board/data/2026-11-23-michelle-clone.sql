-- 11-23 owner: 'Michelle' is recorded without the species epithet and as a Clone
-- (「magnificum は必要ないと思う。clone で登録」). This overrides the board's 11-19 ruling (Hybrid, T-B1).
-- Before: cultivar_name = Anthurium magnificum 'Michelle', type = hybrid, aliases = {Michelle,ミシェル}
-- The record's text is not changed; only its kind field follows the entry. The old spelling stays as an alias
-- so a search for it still finds the page.
update public.cultivars
set cultivar_name = $n$Anthurium 'Michelle'$n$,
    type = 'clone',
    aliases = array[$a$magnificum 'Michelle'$a$, 'ミシェル'],
    origins = (select jsonb_agg(case when o ? 'structured' then jsonb_set(o, '{structured,origin_type}', '"clone"') else o end) from jsonb_array_elements(origins) o)
where id = 144 and cultivar_name = $n$Anthurium magnificum 'Michelle'$n$;

select id, cultivar_name, type, aliases, origins->0->'structured'->>'origin_type' kind from public.cultivars where id = 144;
