-- board 16 C1 (11-16): of the four names of T95, only those backed by a registry or the breeder are recorded.
-- 'Michelle' and 'Zara' have IAS cultivar registry records (the live pages return 404; read through the Wayback
-- snapshots of 2025-03-15 and 2025-01-17) and the breeder's own pages. 'Dorayaki' and 'Red Vein Dark Phoenix' rest on
-- sales pages only and are NOT recorded (draft: docs/board/2026-10-08-t95-drafts.md).
-- Hybrid (the drafts' default): DocBlock sells them as F3 / F4 seed-grown plants. Unverified until a person checks.
insert into public.cultivars (genus, cultivar_name, type, aliases, parent_a_text, parent_b_text, formula_status, ai_status, origins)
select 'Anthurium', $n$Anthurium magnificum 'Michelle'$n$, 'hybrid', array['Michelle', 'ミシェル'],
  'Anthurium magnificum', 'Anthurium magnificum', 'known', 'completed',
  jsonb_build_array(jsonb_build_object(
    'body', $jp$国際アロイド協会（IAS）の品種登録簿には、作出者・命名者ともに Jeff Block（Anthuriums by DocBlock、米国）、もとになった種は A. magnificum と記録されている。1980 年代半ば〜後半に Tim Anderson（Daisy Farm）から分けられた株がもとで、名は Block の妻 Michelle にちなむ。公開（Released）は 2021 年。登録簿では、すでに認められている 'Wonderboy' との違いが十分でないとして、この名前は採用されていない（Rejected）。DocBlock 自身のページは 2022 年の F3 とし、2022 年の TPIE で Best New Flowering Plant を受けたとしている。$jp$::text,
    'body_en', $en$The International Aroid Society cultivar registry records Jeff Block (Anthuriums by DocBlock, USA) as originator and namer, with A. magnificum as the base species. It comes from material shared by Tim Anderson (Daisy Farm) in the mid-to-late 1980s, and is named after Block's wife, Michelle. Released 2021. The registry rejected the name as not distinct enough from the accepted cultivar 'Wonderboy'. DocBlock's own page calls it a 2022 F3 and says it won Best New Flowering Plant at TPIE 2022.$en$::text,
    'trust', 60, 'trustClass', 'trust--mid', 'verified', false,
    'votes', jsonb_build_object('agree', 0, 'disagree', 0),
    'author', jsonb_build_object('date', '2026-11-16', 'isAI', true, 'name', 'AI 調査（2026-11-16 登録簿と作出者のページを照合）'),
    'provenance', 'ai', 'source_type', 'ai_research', 'source_tier', 'B',
    'source_name', 'International Aroid Society — Aroid Cultivar Registry',
    'source_url', 'http://web.archive.org/web/20250315000000/https://www.aroidcultivars.org/aroid-cultivars/anthurium/michelle',
    'sources', jsonb_build_array(
      jsonb_build_object('url', 'http://web.archive.org/web/20250315000000/https://www.aroidcultivars.org/aroid-cultivars/anthurium/michelle', 'label', 'IAS Aroid Cultivar Registry — Anthurium ''Michelle''（2025-03 の保存版）'),
      jsonb_build_object('url', 'https://anthuriumsbydocblock.com/anthurium-michelle/', 'label', 'Anthuriums by DocBlock（作出者）'),
      jsonb_build_object('url', 'https://www.janeperrone.com/on-the-ledge/anthuriums-doc-block', 'label', 'On The Ledge（作出者のインタビュー）')),
    'structured', jsonb_build_object('origin_type', 'hybrid', 'breeder', 'Jeff Block', 'namer', 'Jeff Block', 'notes', null,
      'formula', jsonb_build_object('parentA', 'Anthurium magnificum', 'parentB', 'Anthurium magnificum'),
      'citation_links', jsonb_build_array(
        jsonb_build_object('url', 'http://web.archive.org/web/20250315000000/https://www.aroidcultivars.org/aroid-cultivars/anthurium/michelle', 'label', 'IAS Aroid Cultivar Registry'),
        jsonb_build_object('url', 'https://anthuriumsbydocblock.com/anthurium-michelle/', 'label', 'Anthuriums by DocBlock'))),
    'discoverer_or_breeder', 'Jeff Block'))
where not exists (select 1 from public.cultivars where cultivar_name = $n$Anthurium magnificum 'Michelle'$n$);

insert into public.cultivars (genus, cultivar_name, type, aliases, parent_a_text, parent_b_text, formula_status, ai_status, origins)
select 'Anthurium', $n$Anthurium 'Zara'$n$, 'hybrid', array['Zara F4', 'ザラ'],
  'Anthurium magnificum', null, 'partial', 'completed',
  jsonb_build_array(jsonb_build_object(
    'body', $jp$国際アロイド協会（IAS）の品種登録簿には、作出者・命名者ともに Jeff Block（Anthuriums by DocBlock、米国）、種子親は A. magnificum、花粉親は「赤い葉が目立つ A. crystallinum の栽培品種（名前の記載なし）」と記録されている。公開年は不明。名は、作出者の知人の娘 Zara にちなむ。登録簿では、この名前はまだ認められていない（Accepted: No）。DocBlock 自身のページは 2022 年の F4 の交配種としている。$jp$::text,
    'body_en', $en$The International Aroid Society cultivar registry records Jeff Block (Anthuriums by DocBlock, USA) as originator and namer, with A. magnificum as seed parent and "an unnamed cultivar of A. crystallinum with notably red leaves" as pollen parent. Release year unknown. Named after the daughter of an acquaintance of the originator. The registry has not accepted the name. DocBlock's own page calls it a 2022 F4 hybrid.$en$::text,
    'trust', 60, 'trustClass', 'trust--mid', 'verified', false,
    'votes', jsonb_build_object('agree', 0, 'disagree', 0),
    'author', jsonb_build_object('date', '2026-11-16', 'isAI', true, 'name', 'AI 調査（2026-11-16 登録簿と作出者のページを照合）'),
    'provenance', 'ai', 'source_type', 'ai_research', 'source_tier', 'B',
    'source_name', 'International Aroid Society — Aroid Cultivar Registry',
    'source_url', 'http://web.archive.org/web/20250117000000/https://www.aroidcultivars.org/aroid-cultivars/anthurium/zara',
    'sources', jsonb_build_array(
      jsonb_build_object('url', 'http://web.archive.org/web/20250117000000/https://www.aroidcultivars.org/aroid-cultivars/anthurium/zara', 'label', 'IAS Aroid Cultivar Registry — Anthurium ''Zara''（2025-01 の保存版）'),
      jsonb_build_object('url', 'https://anthuriumsbydocblock.com/anthurium-zara/', 'label', 'Anthuriums by DocBlock（作出者）')),
    'structured', jsonb_build_object('origin_type', 'hybrid', 'breeder', 'Jeff Block', 'namer', 'Jeff Block', 'notes', null,
      'formula', jsonb_build_object('parentA', 'Anthurium magnificum', 'parentB', '赤い葉の A. crystallinum の栽培品種（名前の記載なし）'),
      'citation_links', jsonb_build_array(
        jsonb_build_object('url', 'http://web.archive.org/web/20250117000000/https://www.aroidcultivars.org/aroid-cultivars/anthurium/zara', 'label', 'IAS Aroid Cultivar Registry'),
        jsonb_build_object('url', 'https://anthuriumsbydocblock.com/anthurium-zara/', 'label', 'Anthuriums by DocBlock'))),
    'discoverer_or_breeder', 'Jeff Block'))
where not exists (select 1 from public.cultivars where cultivar_name = $n$Anthurium 'Zara'$n$);

select id, cultivar_name, type, aliases, formula_status from public.cultivars where cultivar_name in ($n$Anthurium magnificum 'Michelle'$n$, $n$Anthurium 'Zara'$n$);
