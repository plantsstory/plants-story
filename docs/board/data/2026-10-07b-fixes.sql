-- Board 8 (2026-10-07b) T77: classification and text fixes. Backup: 2026-10-07b-backup.json (all touched rows).
-- Guards: old values (type / tags / text) as well as ids. created_at is never touched; changed rows get updated_at = now().
-- 'Galaxy' -> Clone is NOT applied: the IAS registry page could not be read to confirm it (decision: keep Hybrid until confirmed).
begin;

-- b) 5 'Dark Mama' -> Hybrid: the two sources agree on the parents (warocqueanum x papillilaminum); the breeder is disputed
update cultivars
   set type = 'hybrid', formula_status = 'known', tags = null, updated_at = now(),
       origins = jsonb_set(jsonb_set(jsonb_set(jsonb_set(origins,
         '{0,structured,origin_type}', '"hybrid"'),
         '{0,sources}', coalesce(origins #> '{0,sources}', '[]'::jsonb) || $j$[{"url":"https://www.nsetropicals.com/product/anthurium-dark-mama/","label":"NSE Tropicals — Anthurium 'Dark Mama'"}]$j$::jsonb),
         '{0,body}', to_jsonb((origins #>> '{0,body}') || $t$ NSE Tropicals の販売ページは、最初の作出者を Karel Havilcek（同ページの表記）とし、親は同じ A. warocqueanum × A. papillilaminum としている。$t$)),
         '{0,body_en}', to_jsonb(coalesce(origins #>> '{0,body_en}', '') || $t$ NSE Tropicals' product page names Karel Havilcek (as spelled there) as the first breeder and gives the same parents, A. warocqueanum × A. papillilaminum.$t$))
 where id = 5 and type = 'clone' and formula_status = 'disputed';

-- c) 8 'Queen of Hearts': the selected-from ('Ace of Spades' TC sport) has no source -> no record (old values in the backup)
update cultivars
   set selected_from_id = null, tags = null, origins = '[]'::jsonb, updated_at = now()
 where id = 8 and selected_from_id = 7;

-- d) 52 'Red Crystallinum': drop the unsourced named guess
update cultivars
   set updated_at = now(),
       origins = jsonb_set(origins, '{0,body}', to_jsonb(replace(origins #>> '{0,body}', $t$（'Wonderboy' の関与が指摘されるが確証はない）$t$, '')))
 where id = 52 and origins #>> '{0,body}' like $t$%'Wonderboy' の関与%$t$;

-- e) 53 'Angels dream': a source (anthurium-japan.com, C) and aliases
update cultivars
   set updated_at = now(),
       aliases = array['Angel''s Dream', 'エンジェルスドリーム', 'エンジェルズドリーム'],
       origins = jsonb_set(jsonb_set(origins,
         '{0,sources}', coalesce(origins #> '{0,sources}', '[]'::jsonb) || $j$[{"url":"https://anthurium-japan.com/angles-dream/","label":"アンスリウムジャパン — エンジェルスドリーム"}]$j$::jsonb),
         '{0,source_tier}', '"C"')
 where id = 53 and aliases is null;

-- f) why a required field is empty: luxurians / metallicum have no locality in the protologue; 'BVIT' has no breeder (a trade label)
update cultivars set updated_at = now(),
       origins = jsonb_set(origins, '{0,structured,absent}', '{"type_locality":"sine_loc"}')
 where id in (57, 130) and (origins #>> '{0,structured,type_locality}') is null;
update cultivars set updated_at = now(),
       origins = jsonb_set(origins, '{0,structured,absent}', '{"breeder":"not_applicable"}')
 where id = 131 and (origins #>> '{0,structured,breeder}') is null;

-- g) 109 'Mystique A88' -> Clone + line: the name belongs to the original plant (owner's rule, 09-04)
update cultivars
   set type = 'clone', tags = array['line'], updated_at = now(),
       origins = jsonb_set(jsonb_set(origins, '{0,structured,origin_type}', '"clone"'),
         '{0,body}', to_jsonb(text $t$Chandra が 'Dorayaki'（オリジナル個体）× 'Red Crystallinum'（NSE 系統）の交配から選び、'Mystique A88' と名付けたオリジナル個体の名前。流通している株の多くは同じ交配式の F1（兄弟株）で、このクローンそのものではない。$t$))
 where id = 109 and type = 'hybrid';

-- h) text: no honorific; one-sentence range; ISO date; notes that only repeat the text
update cultivars set updated_at = now(),
       origins = jsonb_set(origins, '{0,body}', to_jsonb(replace(origins #>> '{0,body}', 'Haji Ulih（ハジ・ウリ）氏が', 'Haji Ulih（ハジ・ウリ）が')))
 where id = 2 and origins #>> '{0,body}' like '%ハジ・ウリ）氏が%';
update cultivars set updated_at = now(),
       origins = jsonb_set(jsonb_set(origins,
         '{0,body}', to_jsonb(replace(origins #>> '{0,body}', 'タイプ産地はパナマ。採集者は R. L. Dressler。分布はパナマ。', 'タイプ産地・分布ともパナマ。採集者は R. L. Dressler。'))),
         '{0,body_en}', to_jsonb(regexp_replace(replace(origins #>> '{0,body_en}', ' 1986 Revis. Gen Anthurium. Part 2. Panama.', ''), 'Type locality: Panama\.(.*) Distribution: Panama\.', 'Type locality and distribution: Panama.\1')))
 where id = 32 and origins #>> '{0,body}' like '%分布はパナマ。%';
update cultivars c set updated_at = now(),
       origins = (select jsonb_agg(case when o ? 'body' then jsonb_set(o, '{body}', to_jsonb(replace(o->>'body', '2025-11-10 播種', '2025.11.10 播種'))) else o end order by ord)
                  from jsonb_array_elements(c.origins) with ordinality as e(o, ord))
 where c.id = 89 and c.origins::text like '%2025-11-10 播種%';
update cultivars set updated_at = now(),
       origins = jsonb_set(origins, '{0,structured,notes}', 'null')
 where id in (108, 121) and coalesce(origins #>> '{0,structured,notes}', '') <> '';

-- i) the rows whose texts T68/T70 changed today carry today's date (the page's 更新 line)
update cultivars set updated_at = now()
 where id in (4, 11, 35, 129, 59, 127, 138) and updated_at < '2026-10-07';

commit;
