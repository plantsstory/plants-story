-- Board 16 (2026-11-13), first batch of data. Before values are in docs/board/2026-11-13.md §4.

-- T2: 'Ace of Spades' had no cited record. The IAS cultivar registry page was read on 2026-11-13:
-- Originator "Denis Rotolante", Namer "Denis Rotolante", Released "1988", Base "Unknown Anthurium",
-- Name origin "It describes the color and shape of the foliage." Added as a record of its own; the contributor's
-- record is not touched.
update public.cultivars
set origins = origins || jsonb_build_array(jsonb_build_object(
  'body', $jp$国際アロイド協会（IAS）の品種登録簿には、作出者・命名者ともに Denis Rotolante、公開（Released）1988 年と記録されている。もとになった種は「Unknown Anthurium」とされ、交配親の欄は空欄。名前の由来は「葉の色と形を表す」と書かれている。$jp$::text,
  'body_en', $en$The International Aroid Society cultivar registry records Denis Rotolante as both originator and namer, released in 1988. The base species is given as "Unknown Anthurium" and the parent fields are blank. The name is said to describe the colour and shape of the foliage.$en$::text,
  'trust', 60, 'trustClass', 'trust--mid', 'verified', false,
  'votes', jsonb_build_object('agree', 0, 'disagree', 0),
  'author', jsonb_build_object('date', '2026-11-13', 'isAI', true, 'name', 'AI 調査（2026-11-13 登録簿のページと照合）'),
  'provenance', 'ai', 'source_type', 'ai_research', 'source_tier', 'B',
  'source_name', 'International Aroid Society — Aroid Cultivar Registry',
  'source_url', 'https://www.aroidcultivars.org/aroid-cultivars/anthurium/ace-of-spades',
  'sources', jsonb_build_array(jsonb_build_object('url', 'https://www.aroidcultivars.org/aroid-cultivars/anthurium/ace-of-spades', 'label', 'IAS Aroid Cultivar Registry — Anthurium ''Ace of Spades''')),
  'structured', jsonb_build_object('origin_type', 'clone', 'breeder', 'Denis Rotolante', 'namer', 'Denis Rotolante', 'notes', null,
    'citation_links', jsonb_build_array(jsonb_build_object('url', 'https://www.aroidcultivars.org/aroid-cultivars/anthurium/ace-of-spades', 'label', 'IAS Aroid Cultivar Registry')))
))
where id = 7 and not exists (select 1 from jsonb_array_elements(origins) o where o->>'source_url' = 'https://www.aroidcultivars.org/aroid-cultivars/anthurium/ace-of-spades');

-- T3: 'Red Crystallinum' — the contributor wrote that it "is said to derive from plants Tim Anderson held", not that
-- he bred it; the label and the list read 「作出 Tim Anderson」. The record is left as written; a tag tells the site
-- to show the name with the reservation.
update public.cultivars
set tags = array_append(coalesce(tags, '{}'::text[]), 'breeder_unconfirmed')
where id = 52 and not ('breeder_unconfirmed' = any(coalesce(tags, '{}'::text[])));

-- M1 (b): the tools the board would take out stay published; the reason is put where the owner reviews them.
insert into public.tool_reviews (affiliate_id, status, ai_note) values
  (8,  'approved', '外す候補: 大袋の用土。店の定番で、送料別だと割高（送料は商品ページで確認）'),
  (9,  'approved', '外す候補: 大袋の用土。店の定番で、送料別と思われる（未確認）'),
  (10, 'approved', '外す候補: 大袋の用土。店の定番で、送料別と思われる（未確認）'),
  (11, 'approved', '外す候補: 大袋の用土。店の定番で、送料別と思われる（未確認）'),
  (19, 'approved', '外す候補: 麻ひもは店や 100 円店で買える'),
  (20, 'approved', '外す候補: 鉢の 1 個売り。送料別と思われる（未確認）'),
  (21, 'approved', '外す候補: 鉢の 1 個売り。10 号はアンスリウムには大きい'),
  (22, 'approved', '外す候補: 鉢 1 個に送料がかかると思われる（未確認）'),
  (25, 'approved', '外す候補: 屋外散布向けで、1L の霧吹きと役目が重なる'),
  (33, 'approved', '外す候補: メーカー・型番のない 8W の LED'),
  (36, 'approved', '外す候補: 家庭用の温湿度計で、もう 1 点と重なる'),
  (38, 'approved', '外す候補: 店で買える。粗い植込み材では値が安定しにくいと思われる'),
  (40, 'approved', '外す候補: 花用の一般肥料'),
  (4,  'approved', '迷う: 店の定番。使っている物なら「使用中」の印を付けて残す'),
  (5,  'approved', '迷う: 店の定番。使っている物なら「使用中」の印を付けて残す'),
  (14, 'approved', '迷う: 店にはないが、送料別なら割高'),
  (15, 'approved', '迷う: 送料別（商品ページで確認）。送料込の店に替えれば残せる'),
  (18, 'approved', '迷う: 店にもある'),
  (24, 'approved', '迷う: 家電でどこでも買える。サーキュレーターと合わせて見直す'),
  (27, 'approved', '迷う: 家電でどこでも買える。もう 1 点と重なる'),
  (35, 'approved', '迷う: 送料込なら残す'),
  (39, 'approved', '迷う: 送料が不明')
on conflict (affiliate_id) do nothing;

-- M2: the research keywords. The old ones found bagged soil and single pots; they are switched off, not deleted.
update public.tool_research_queries set is_active = false where is_active;
insert into public.tool_research_queries (genre, keyword, min_reviews, max_items, is_active) values
  ('soil', 'ベラボン プレミアム', 10, 2, true), ('soil', '水苔 ニュージーランド AAAA', 10, 2, true), ('soil', 'オーキアタ バーク', 10, 1, true), ('soil', 'ツリーファーン ファイバー', 5, 1, true),
  ('mount', 'ヘゴ板', 5, 2, true), ('mount', 'ヘゴ支柱', 5, 1, true), ('mount', 'コルク樹皮 板', 5, 2, true), ('mount', 'モスポール 水苔', 10, 1, true),
  ('pots', 'スリット鉢 10個セット 送料無料', 10, 2, true), ('pots', '透明 スリットポット セット', 10, 1, true), ('pots', '育苗トレー 穴なし 腰水', 10, 1, true),
  ('humidity', 'サーキュレーター クリップ 静音 DC', 20, 1, true), ('humidity', 'USBファン 12cm 静音', 20, 1, true), ('humidity', '加湿器 大容量 上部給水', 20, 1, true), ('humidity', '蓄圧式スプレー 微細ミスト', 20, 1, true),
  ('heat', 'パネルヒーター 温室', 10, 2, true), ('heat', 'サーモスタット 園芸 ヒーター', 10, 1, true), ('heat', 'ヒートマット 育苗 サーモ付', 10, 1, true), ('heat', '室内温室 ガラス', 5, 1, true),
  ('light', '植物育成ライト E26 フルスペクトル', 20, 2, true), ('light', '植物育成 LED パネル', 20, 1, true), ('light', 'ダクトレール スポット E26', 20, 1, true), ('light', 'スマートプラグ タイマー', 20, 1, true),
  ('measure', '温湿度計 最高最低', 20, 1, true), ('measure', '温湿度計 スマホ 記録', 20, 1, true), ('measure', '照度計 デジタル', 20, 1, true), ('measure', 'pH EC メーター', 20, 1, true),
  ('nutrient', 'ダイナグロ フォリエージプロ', 5, 1, true), ('nutrient', 'オスモコート エグザクト', 5, 1, true), ('nutrient', 'カルマグ 液肥', 5, 1, true), ('nutrient', 'SUPERthrive', 5, 1, true)
on conflict (genre, keyword) do update set is_active = true, min_reviews = excluded.min_reviews, max_items = excluded.max_items;

select (select jsonb_array_length(origins) from public.cultivars where id = 7) as ace_records,
       (select tags from public.cultivars where id = 52) as redc_tags,
       (select count(*) from public.tool_reviews) as reviews,
       (select count(*) from public.tool_research_queries where is_active) as active_queries;
