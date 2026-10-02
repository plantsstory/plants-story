-- 2026-10-03 第6回ボード 分類・データ品質 修正 SQL（説明: docs/board/2026-10-03-taxonomy.md）
-- UPDATE はすべて id 指定 + スナップショット時の updated_at（または同じトランザクション内の now()）一致が条件。その後に人が直した行は触らない。
-- ロールバック: 各文の直前の「-- 旧」コメント、または docs/board/data/cultivars-before-2026-10-03.json・affiliates-before-2026-10-03.json。
-- 適用後: recordGate 再判定（29/31 合格のまま）→ 静的スタブ・sitemap 再生成（deploy）。
begin;

-- ===== A. 原種 18 件の由来文: 出典を短縮表記（巻: 頁 (年)）、国名を日本語、「（POWO）」を削除 =====

-- [1] Anthurium carlablackiae : 由来文の短縮 + IPNI の事実を追記（英文も同期）
-- 旧 body: Anthurium carlablackiae は 2020 年、Croat & O.Ortiz が Phytotaxa 467(1): 10 で記載した。タイプ産地は Puerto Obaldía, Comarca Guna Yala, Panama。採集者は T. B. Croat（2009 年採集）。分布は Colombia, Panama（POWO）。種小名はパナマ・チリキ県の園芸家 Carla Black への献名（IPNI）。
-- 旧 body_en: Anthurium carlablackiae was described by Croat & O.Ortiz in 2020 in Phytotaxa 467(1): 10. Type locality: Puerto Obaldía, Comarca Guna Yala, Panama. Collected by T. B. Croat (2009). Distribution: Colombia, Panama (POWO). The epithet honours Carla Black, a horticulturist in Chiriquí Province, Panama (IPNI).
update public.cultivars set origins = jsonb_set(jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium carlablackiae は 2020 年、Croat & O.Ortiz が Phytotaxa 467(1): 10 で記載した。タイプ産地はパナマ、グナ・ヤラ自治区の Puerto Obaldía 付近。採集者は T. B. Croat（2009 年）。分布はコロンビア、パナマ。種小名は、2009 年 9 月にこの植物を最初に見つけたチリキ県の園芸家 Carla Black への献名。$t$::text)), '{0,body_en}', to_jsonb($t$Described by Croat & O.Ortiz in Phytotaxa 467(1): 10 (2020). Type locality: near Puerto Obaldía, Guna Yala, Panama. Collected by T. B. Croat (2009). Distribution: Colombia, Panama. Named for Carla Black, a horticulturist in Chiriquí, Panama, who first found the plant in September 2009.$t$::text)),
  updated_at = now()
where id = 1 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [3] Anthurium crystallinum : 由来文の短縮
-- 旧 body: Anthurium crystallinum は 1873 年、Linden & André が Linden, Cat. n. 90. t. 128 で記載した。分布は Colombia, Panama（POWO）。IPNI の原綴は cristallinum。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium crystallinum は 1873 年、Linden & André が Linden, Cat. n. 90 で記載した。分布はコロンビア、パナマ。IPNI の原綴は cristallinum。$t$::text)),
  updated_at = now()
where id = 3 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [4] Anthurium warocqueanum : 由来文の短縮
-- 旧 body: Anthurium warocqueanum は 1878 年、T.Moore が Florist & Pomol. 101, figs で記載した。タイプ産地は Colombia。分布は Colombia（POWO）。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium warocqueanum は 1878 年、T.Moore が Florist & Pomol. 101 で記載した。タイプ産地はコロンビア。分布はコロンビア。$t$::text)),
  updated_at = now()
where id = 4 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [6] Anthurium veitchii : 由来文の短縮
-- 旧 body: Anthurium veitchii は 1876 年、Mast. が Gard. Chron. n.s., 775 で記載した。分布は Colombia（POWO）。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium veitchii は 1876 年、Mast. が Gard. Chron. n.s. 775 で記載した。分布はコロンビア。$t$::text)),
  updated_at = now()
where id = 6 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [9] Anthurium clarinervium : 由来文の短縮
-- 旧 body: Anthurium clarinervium は 1952 年、Matuda が Anales Inst. Biol. Univ. Nac. México 22: 375, fig. 4 で記載した。タイプ産地は Chiapas, Mexico。分布は Mexico（POWO）。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium clarinervium は 1952 年、Matuda が Anales Inst. Biol. Univ. Nac. México 22: 375 で記載した。タイプ産地はメキシコ・チアパス州。分布はメキシコ。$t$::text)),
  updated_at = now()
where id = 9 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [10] Anthurium magnificum : 由来文の短縮
-- 旧 body: Anthurium magnificum は 1865 年、Linden が Belgique Hort. xv. 98 で記載した。分布は Colombia（POWO）。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium magnificum は 1865 年、Linden が Belgique Hort. 15: 98 で記載した。分布はコロンビア。$t$::text)),
  updated_at = now()
where id = 10 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [11] Anthurium forgetii : 由来文の短縮
-- 旧 body: Anthurium forgetii は 1906 年、N.E.Br. が Gard. Chron. ser. 3, 39: 161 で記載した。タイプ産地は Colombia。分布は Colombia（POWO）。種小名は採集者 Forget への献名（IPNI）。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium forgetii は 1906 年、N.E.Br. が Gard. Chron. ser. 3, 39: 161 で記載した。タイプ産地はコロンビア。分布はコロンビア。種小名は採集者 Forget への献名。$t$::text)),
  updated_at = now()
where id = 11 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [31] Anthurium dressleri : 由来文の短縮
-- 旧 body: Anthurium dressleri は 1978 年、Croat が Aroideana 1: 54 (-56), figs で記載した。タイプ産地は Panama。採集者は T. B. Croat。分布は Colombia, Panama（POWO）。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium dressleri は 1978 年、Croat が Aroideana 1: 54 で記載した。タイプ産地はパナマ。採集者は T. B. Croat。分布はコロンビア、パナマ。$t$::text)),
  updated_at = now()
where id = 31 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [32] Anthurium papillilaminum : 由来文の短縮
-- 旧 body: Anthurium papillilaminum は 1986 年、Croat が Monogr. Syst. Bot. Missouri Bot. Gard. 14: 152. 1986 Revis. Gen Anthurium. Part 2. Panama で記載した。タイプ産地は Panama。採集者は R. L. Dressler。分布は Panama（POWO）。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium papillilaminum は 1986 年、Croat が Monogr. Syst. Bot. Missouri Bot. Gard. 14: 152 で記載した。タイプ産地はパナマ。採集者は R. L. Dressler。分布はパナマ。$t$::text)),
  updated_at = now()
where id = 32 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [33] Anthurium nutibarense : 由来文の短縮
-- 旧 body: Anthurium nutibarense は 2008 年、Croat が Novon 18(2): 145 で記載した。タイプ産地は Frontino, Antioquia, Colombia。採集者は J. M. MacDougal, D. Restrepo & D. S. Sylva（1989 年採集）。分布は Colombia（POWO）。2005 年に Aroideana 28: 61 で先行発表されている（IPNI 60439863-2）。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium nutibarense は 2008 年、Croat が Novon 18: 145 で記載した。タイプ産地はコロンビア・アンティオキア県 Frontino。採集者は J. M. MacDougal, D. Restrepo & D. S. Sylva（1989 年）。分布はコロンビア。2005 年に Aroideana 28: 61 で先行発表されている。$t$::text)),
  updated_at = now()
where id = 33 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [34] Anthurium debile : 由来文の短縮
-- 旧 body: Anthurium debile は 2004 年、Croat & D.C.Bay が Aroideana 27: 97 (-99; figs. 9-11) で記載した。タイプ産地は Bajo Calima, Valle del Cauca, Colombia。採集者は T. B. Croat & Watt（1990 年採集）。分布は Colombia（POWO）。原記載では debilis と綴られた。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium debile は 2004 年、Croat & D.C.Bay が Aroideana 27: 97 で記載した（原綴は debilis）。タイプ産地はコロンビア・バジェ・デル・カウカ県 Bajo Calima。採集者は T. B. Croat & Watt（1990 年）。分布はコロンビア。$t$::text)),
  updated_at = now()
where id = 34 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [35] Anthurium splendidum : 由来文の短縮
-- 旧 body: Anthurium splendidum は 1884 年、W.Bull ex Rodigas が Ill. Hort. 31: 13, t. 510 で記載した。タイプ産地は Colombia。分布は Colombia（POWO）。1883 年に Gard. Chron. n.s. 19: 381 で W.Bull の名により先行して英文発表されている。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium splendidum は 1884 年、W.Bull ex Rodigas が Ill. Hort. 31: 13 で記載した。タイプ産地はコロンビア。分布はコロンビア。前年の Gard. Chron. 19: 381（1883）に W.Bull の名で先に掲載されている。$t$::text)),
  updated_at = now()
where id = 35 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [38] Anthurium kunayalense : 由来文の短縮 + IPNI の事実を追記（英文も同期）
-- 旧 body: Anthurium kunayalense は 2010 年、Croat & Vannini が Aroideana 33: 162 (-164, 166; figs. 1A-D, 2A-C) で記載した。タイプ産地は El Llano–Cartí road, Panamá Province, Panama。採集者は T. B. Croat & J. Vannini（2009 年採集）。分布は Panama（POWO）。
-- 旧 body_en: Anthurium kunayalense was described by Croat & Vannini in 2010 in Aroideana 33: 162 (-164, 166; figs. 1A-D, 2A-C). Type locality: El Llano–Cartí road, Panamá Province, Panama. Collected by T. B. Croat & J. Vannini (2009). Distribution: Panama (POWO).
update public.cultivars set origins = jsonb_set(jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium kunayalense は 2010 年、Croat & Vannini が Aroideana 33: 162 で記載した。タイプ産地はパナマ県の El Llano–Cartí 道路沿い。採集者は T. B. Croat & J. Vannini（2009 年）。タイプは J. Vannini が 2007 年に採集した株の栽培個体。分布はパナマ。$t$::text)), '{0,body_en}', to_jsonb($t$Described by Croat & Vannini in Aroideana 33: 162 (2010). Type locality: along the El Llano–Cartí road, Panamá Province, Panama. Collected by T. B. Croat & J. Vannini (2009); the type is a cultivated plant originally collected by J. Vannini in 2007. Distribution: Panama.$t$::text)),
  updated_at = now()
where id = 38 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [57] Anthurium luxurians : 由来文の短縮 + IPNI の事実を追記（英文も同期）
-- 旧 body: Anthurium luxurians は 2005 年、Croat & R.N.Cirino が Aroideana 28: 56 (-58; fig. 2) で記載した。タイプ産地は Colombia。採集者は T. B. Croat。分布は Colombia（POWO）。
-- 旧 body_en: Anthurium luxurians was described by Croat & R.N.Cirino in 2005 in Aroideana 28: 56 (-58; fig. 2). Type locality: Colombia. Collected by T. B. Croat. Distribution: Colombia (POWO).
update public.cultivars set origins = jsonb_set(jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium luxurians は 2005 年、Croat & R.N.Cirino が Aroideana 28: 56 で記載した。タイプは栽培株で、George Wagner（マイアミ）が採集した株をフロリダ州 Homestead で Denis Rotolante が開花させたもの。原記載に産地の記録はない。標本の採集者は T. B. Croat。分布はコロンビア。$t$::text)), '{0,body_en}', to_jsonb($t$Described by Croat & R.N.Cirino in Aroideana 28: 56 (2005). The type is a cultivated plant, originally collected by George Wagner (Miami) and flowered by Denis Rotolante in Homestead, Florida; no locality is given (sine loc.). Specimen collected by T. B. Croat. Distribution: Colombia.$t$::text)),
  updated_at = now()
where id = 57 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [77] Anthurium wendlingeri : 由来文の短縮
-- 旧 body: Anthurium wendlingeri は 1965 年、G.M.Barroso が Bol. Soc. Venez. Ci. Nat. 26: 151, fig で記載した。タイプ産地は Costa Rica。分布は Panama, Colombia, Costa Rica, Nicaragua（POWO）。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium wendlingeri は 1965 年、G.M.Barroso が Bol. Soc. Venez. Ci. Nat. 26: 151 で記載した。タイプ産地はコスタリカ。分布はコロンビア、コスタリカ、ニカラグア、パナマ。$t$::text)),
  updated_at = now()
where id = 77 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [82] Anthurium sagittatum : 由来文の短縮
-- 旧 body: Anthurium sagittatum は 1839 年、G.Don が Sweet's Hort. Brit., ed. 3. 633 で Pothos sagittatus Sims を Anthurium に組み替えた名前。分布は French Guiana, Guyana, Colombia, Brazil, Peru, Suriname, Venezuela（POWO）。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium sagittatum は 1839 年、G.Don が Pothos sagittatus Sims を Anthurium に組み替えた名前（Sweet's Hort. Brit., ed. 3: 633）。分布はブラジル、コロンビア、フランス領ギアナ、ガイアナ、ペルー、スリナム、ベネズエラ。$t$::text)),
  updated_at = now()
where id = 82 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [83] Anthurium regale : 由来文の短縮
-- 旧 body: Anthurium regale は 1866 年、Linden が Belgique Hort. xvi. 200 で記載した。分布は Peru（POWO）。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium regale は 1866 年、Linden が Belgique Hort. 16: 200 で記載した。分布はペルー。$t$::text)),
  updated_at = now()
where id = 83 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [120] Anthurium moronense : 由来文の短縮
-- 旧 body: Anthurium moronense は 2004 年、Croat & Carlsen が Novon 14(4): 405 (-407; fig. 2A-B) で記載した。タイプ産地は Gualaquiza, Morona-Santiago, Ecuador。採集者は C. S. B. U. Sparre（1967 年採集）。分布は Ecuador, Peru（POWO）。
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium moronense は 2004 年、Croat & Carlsen が Novon 14: 405 で記載した。タイプ産地はエクアドル・モロナ・サンティアゴ県 Gualaquiza。採集者は C. S. B. U. Sparre（1967 年）。分布はエクアドル、ペルー。$t$::text)),
  updated_at = now()
where id = 120 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- ===== B. 原種の事実訂正 =====

-- [57] Anthurium luxurians : IPNI の locality は「sine loc.」、タイプは栽培株。Colombia はタイプ産地ではない（分布には残る）
-- 旧 structured.type_locality: Colombia
update public.cultivars set origins = jsonb_set(origins, '{0,structured,type_locality}', 'null'::jsonb),
  updated_at = now()
where id = 57 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [32] Anthurium papillilaminum : 出版物欄に書名の注記が混入
-- 旧 first_description: Croat, Monogr. Syst. Bot. Missouri Bot. Gard. 14: 152. 1986 Revis. Gen Anthurium. Part 2. Panama (1986)
update public.cultivars set origins = jsonb_set(origins, '{0,first_description}', to_jsonb($t$Croat, Monogr. Syst. Bot. Missouri Bot. Gard. 14: 152 (1986)$t$::text)),
  updated_at = now()
where id = 32 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [59] Anthurium antolakii : 引用元（Vannini）に無い記述を削除（Rory Antolak の導入・2020 年・Guna Yala）。近縁種は引用元どおり papillilaminum、流通名は引用元の 2 つ
-- 旧 body: 正式な学名記載はまだない（未記載種／暫定名）。東パナマ産の黒いベルベット葉群として園芸界に現れ、BVEP（Black Velvet Eastern Panama）として流通した個体群を基にしている。園芸・収集界の記録ではRory Antolak が現地材料を導入・維持し、antolakii の暫定名を用いるようになったとされる。Jay Vannini 等が ined.（未出版名）として扱っている旨の専門家記事がある一方、IPNI/POWO/Tropicos 等の正式登録には有効な記載が見つからない。近縁関係は A. dressleri 群や papillilaminum 系と比較されることが多く、分布情報の公開を避けるため出典間で差異がある。
-- 旧 body_en: Formal, published nomenclature for Anthurium antolakii is not available — the name is used provisionally in cultivation. The plant entered the hobby as "BVEP" (Black Velvet Eastern Panama), appearing in trade around 2020. Multiple dealer and expert accounts credit Rory Antolak with introducing and maintaining the wild material; Jay Vannini and others have referred to the taxon as A. "antolakii" (ined.) in specialist writing. No valid protologue or IPNI/POWO/Tropicos record has been found, so the name remains unpublished. Horticultural sources commonly compare this entity to velvet-leaf species (notably Anthurium dressleri and papillilaminum-like plants). Locality information is treated confidentially by collectors, and some secondary sources disagree about whether a formal publication exists or whether a Tropicos listing was temporary.
-- 旧 structured: {"notes":"産地は東パナマ（Guna Yala 高地が示唆される）。","collector":null,"author_name":null,"origin_type":"species","trade_names":["BVEP","Black Velvet Eastern Panama"],"introduced_by":"Rory Antolak が導入・維持（2020頃）","origin_region":"Panama（eastern; Guna Yala 高地が示唆される）","type_locality":null,"citation_links":[{"url":"https://www.exoticaesoterica.com/magazine/the-ultimate-guide-to-velvet-leaf-anthuriums","label":"Exotica Esoterica — \"The Ultimate Guide to Velvet Leaf Anthuriums\" (Jay Vannini)"}],"known_habitats":"Panama","species_status":"undescribed","closest_species":"Anthurium dressleri","collection_year":null,"first_seen_year":2020,"publication_year":null,"working_name_origin":"Rory Antolak に献名した暫定学名（antolakii）"}
-- 旧 aliases: ["Black Velvet Eastern Panama","BVEP","アントラキー","アントラキイ","ブラックベルベット イースタンパナマ"]
update public.cultivars set origins = jsonb_set(jsonb_set(jsonb_set(jsonb_set(origins, '{0,body}', to_jsonb($t$正式な記載はない未記載種。Jay Vannini は Exotica Esoterica の記事で、パナマの非公開の産地から見つかった Anthurium sp. nov. "Darkest Panamá"（別名 "Black Velvet Panama"、A. "antolakii" Vannini & Croat ined.）として紹介し、A. papillilaminum に最も近いとしている。IPNI・WCVP に登録はない（2026-10-03 確認）。$t$::text)), '{0,body_en}', to_jsonb($t$Not formally described. In Exotica Esoterica, Jay Vannini presents it as Anthurium sp. nov. "Darkest Panamá" (also A. "Black Velvet Panama" and A. "antolakii" Vannini & Croat, ined.) from an undisclosed locality in Panama, most closely related to A. papillilaminum. Not listed in IPNI or WCVP (checked 2026-10-03).$t$::text)), '{0,structured}', $t${"notes":null,"origin_type":"species","trade_names":["Darkest Panamá","Black Velvet Panama"],"known_habitats":"Panama","species_status":"undescribed","closest_species":"Anthurium papillilaminum","working_name_origin":"Vannini & Croat の未発表名（ined.）","citation_links":[{"url":"https://www.exoticaesoterica.com/magazine/the-ultimate-guide-to-velvet-leaf-anthuriums","label":"Exotica Esoterica — \"The Ultimate Guide to Velvet Leaf Anthuriums\" (Jay Vannini)"}]}$t$::jsonb), '{0,native_region}', to_jsonb($t$Panama$t$::text)),
  aliases = array_append(aliases, $t$Darkest Panamá$t$),
  updated_at = now()
where id = 59 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [108] Anthurium aff. besseae : 比較対象を構造化（A. besseae は Bolivia・Cochabamba 産、IPNI 60438309-2）
-- 旧 structured.closest_species: undefined
update public.cultivars set origins = jsonb_set(origins, '{0,structured,closest_species}', to_jsonb($t$Anthurium besseae$t$::text)),
  updated_at = now()
where id = 108 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- ===== C. Clone / Hybrid / 実生の本文（重複・敬称・矛盾・スマホで長い本文） =====

-- [2] Anthurium 'King of Spades' : 英文が「代々改良された品種」と読め、和文（名前はオリジナル個体、流通は F 個体）と食い違う
-- 旧 body_en: Anthurium cultivar created by Haji Ulih in Bogor, Indonesia, and improved over generations.
update public.cultivars set origins = jsonb_set(origins, '{0,body_en}', to_jsonb($t$'King of Spades' is the name of the original individual (a clone) bred and named by Haji Ulih in Bogor, Indonesia. Seedlings of the original have been raised for generations; plants in circulation are those seedlings (F generations), not the clone itself.$t$::text)),
  updated_at = now()
where id = 2 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [7] Anthurium 'Ace of Spades' : 4 段落を 1 段落に（事実は維持、「特に優れた形質」等を削除）。notes は本文の重複と SKG のみなので本文に統合
-- 旧 body: Anthurium 'Ace of Spades' は、フロリダのナーセリーである The Orchid Jungle にて管理されていた、南米採集の未同定株に由来する選抜個体である。 /  / この母株は当初 Anthurium hoffmannii としてラベルされていたが、形態的特徴からその同定には疑問があり、正確な種同定はされていない。 /  / 採集地では単独で存在していたとされ、自家受粉、もしくは自然交雑により得られた種子から実生が育成された。その後、Denis Rotolante によって播種され、得られた実生群の中から特に優れた形質を持つ個体が選抜され 'Ace of Spades' と命名された。 /  / そのため本個体は明確な交配式を持つ人工交配種ではなく、自然由来の遺伝背景を持つ実生選抜クローンと考えられている。
-- 旧 structured.notes: Anthurium 'Ace of Spades' は、フロリダのナーセリーである The Orchid Jungle にて管理されていた、南米採集の未同定株に由来する選抜個体である。 /  / この母株は当初 Anthurium hoffmannii としてラベルされていたが、形態的特徴からその同定には疑問があり、正確な種同定はされていない。 /  / 採集地では単独で存在していたとされ、自家受粉、もしくは自然交雑により得られた種子から実生が育成された。その後、Denis Rotolante によって播種され、得られた実生群の中から特に優れた形質を持つ個体が選抜され 'Ace of Spades' と命名された。 /  / そのため本個体は明確な交配式を持つ人工交配種ではなく、自然由来の遺伝背景を持つ実生選抜クローンと考えられている。 所属: Silver Krome Gardens (SKG)。
update public.cultivars set origins = jsonb_set(jsonb_set(origins, '{0,body}', to_jsonb($t$フロリダのナーセリー The Orchid Jungle で管理されていた南米採集の未同定株（当初 A. hoffmannii のラベル。同定は疑問視されている）に由来する。この株の自家受粉または自然交雑で得た種子を Denis Rotolante（Silver Krome Gardens）が播き、実生群から選んだ 1 株に 'Ace of Spades' と命名した。交配式のある人工交配種ではなく、実生選抜のクローン。$t$::text)), '{0,structured,notes}', 'null'::jsonb),
  updated_at = now()
where id = 7 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [8] Anthurium 'Queen of Hearts' : 推定であることを明示、本文と notes の重複を解消
-- 旧 body: Anthurium 'Queen of Hearts'は'Ace of Spades'組織培養(TC)の由来のソマクローナル変異から生まれた品種である可能性が高い。
-- 旧 structured.notes: Anthurium 'Queen of Hearts'は'Ace of Spades'組織培養(TC)の由来のソマクローナル変異から生まれた品種である可能性が高い。
update public.cultivars set origins = jsonb_set(jsonb_set(origins, '{0,body}', to_jsonb($t$Anthurium 'Queen of Hearts' は、'Ace of Spades' の組織培養（TC）株に生じたソマクローナル変異から生まれた品種である可能性が高い（出典未確認）。$t$::text)), '{0,structured,notes}', 'null'::jsonb),
  updated_at = now()
where id = 8 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [52] Anthurium 'Red Crystallinum' : 4 段落を 1 段落に。notes（小文字 crystallinum の重複）を削除
-- 旧 body: Anthurium 'Red Crystallinum' は、一般的な Anthurium crystallinum とは異なる園芸系統で、Tim Anderson が保有していた個体群に由来するとされる。 /  / これらの個体は交配由来と考えられているが、親種は不明であり、'Wonderboy' と呼ばれる系統の関与が指摘されているものの、確証はない。 /  / その後、この系統に属する複数の個体が分けられ、NSE Tropicals、Tezula Plants、および Docblock にそれぞれ別個体として渡ったとされる。 /  / 各所でこれらの個体の実生化が行われたため、現在 "Red crystallinum" の名称は単一のクローンではなく、共通した特徴を持つ複数の系統（クローンおよびその実生群）を含む総称として用いられている。
-- 旧 structured.notes: Anthurium 'Red crystallinum' は、一般的な Anthurium crystallinum とは異なる園芸系統で、Tim Anderson が保有していた個体群に由来するとされる。 /  / これらの個体は交配由来と考えられているが、親種は不明であり、"Wonderboy" と呼ばれる系統の関与が指摘されているものの、確証はない。 /  / その後、この系統に属する複数の個体が分けられ、NSE Tropicals、Tezula Plants、および Docblock にそれぞれ別個体として渡ったとされる。 /  / 各所でこれらの個体の実生化が行われたため、現在 "Red crystallinum" の名称は単一のクローンではなく、共通した特徴を持つ複数の系統（クローンおよびその実生群）を含む総称として用いられている。
update public.cultivars set origins = jsonb_set(jsonb_set(origins, '{0,body}', to_jsonb($t$一般的な A. crystallinum とは別の園芸系統で、Tim Anderson が持っていた個体群に由来するとされる。交配由来と考えられているが親は不明（'Wonderboy' の関与が指摘されるが確証はない）。個体群は NSE Tropicals・Tezula Plants・Docblock に分けられ、各所で実生が作られたため、この名前はいまは単一のクローンではなく、複数の系統（クローンとその実生）の総称として使われている。$t$::text)), '{0,structured,notes}', 'null'::jsonb),
  updated_at = now()
where id = 52 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [53] Anthurium 'Angels dream' : 敬称「さん」と「有名な」を削除、句点・改行を整理
-- 旧 body: kunzoさんが2000年にフィリピンの有名な園芸家より迎えた個体に名付けた。 / 元はアメリカの有名なmagnificum種の交配種
update public.cultivars set origins = jsonb_set(origins, '{0,body}', to_jsonb($t$kunzo が 2000 年、フィリピンの園芸家から入手した個体に命名した。アメリカで作られた A. magnificum の交配種に由来するとされる（もう一方の親は不明）。$t$::text)),
  updated_at = now()
where id = 53 and updated_at in ('2026-09-06T16:26:09.051805+00:00', now());

-- [109] Anthurium 'Mystique A88' : 同じ文の繰り返しを解消。notes の「Mr Chandra」「母株は Red Crystallinum」は交配式（母 Dorayaki × 父 Red Crystallinum）と矛盾するため削除
-- 旧 body: 作出者: Chandra. 交配式: 'Dorayaki' original × 'Red Crystallinum' NSE. Anthurium 'Mystique A88' は Chandra によって作出された。Anthurium 'Dorayaki' original と Anthurium 'Red Crystallinum' NSE の交配式である /  / 'Mystique A88' にはoriginalがある。しかし生産ラインはoriginalのseedlingではなく、 / 'Dorayaki' original×'Red Crystallinum' NSE / のF1個体になる。
-- 旧 structured.notes: Anthurium 'Mystique A88' は Mr Chandra によって作出された。Anthurium 'Dorayaki' original と Anthurium 'Red Crystallinum' NSE の交配式である /  / 'Mystique A88' にはoriginalがある。しかし生産ラインはoriginalのseedlingではなく、 / 'Dorayaki' original×'Red Crystallinum' NSE / のF1個体になる。 母株は 'Red Crystallinum' の NSE 系統。
update public.cultivars set origins = jsonb_set(jsonb_set(origins, '{0,body}', to_jsonb($t$Chandra が 'Dorayaki'（オリジナル個体）× 'Red Crystallinum'（NSE 系統）で作出した。'Mystique A88' と名付けたオリジナル個体はあるが、流通している株はその実生ではなく、同じ交配式の F1 個体。$t$::text)), '{0,structured,notes}', 'null'::jsonb),
  updated_at = now()
where id = 109 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [110] 第6回裁定（2026-10-03）: 区分 Hybrid のまま本文が「1 個体の名前」と断定しないよう差し替え（オーナー確認 O-1 の回答で再修正）
-- [110] Anthurium 'Galaxy' : 標本ラベルと重複する「作出者: … 交配式: …」を削除、URL の追跡パラメータ igsh を除去
-- 旧 body: 作出者: Space Hijau. 交配式: 'X-One' × 'Dark Phoenix'. Anthurium 'Galaxy'はSpace Hijauによって交配された。'X-One' と 'Dark Phoenix'のF1選抜個体が 'Galaxy' となる。
-- 旧 structured.notes: Anthurium 'Galaxy'はSpace Hijauによって交配された。'X-One' と 'Dark Phoenix'のF1選抜個体が 'Galaxy' となる。
-- 旧 sources: [{"text":"https://www.instagram.com/reel/C7qCjNyhBPF/?igsh=MWxqNHhkNHcwaHM1aA=="}]
-- 旧 citation_links: [{"url":"https://www.instagram.com/reel/C7qCjNyhBPF/?igsh=MWxqNHhkNHcwaHM1aA=="}]
-- 旧 parentage: X-one × Dark phoenix
update public.cultivars set origins = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(origins, '{0,body}', to_jsonb($t$Space Hijau が 'X-One' × 'Dark Phoenix' で作出した。F1 から選んだ 1 株の名前とされる（同じ名前で F1 実生が流通しているかは未確認）。$t$::text)), '{0,structured,notes}', 'null'::jsonb), '{0,sources}', $t$[{"url":"https://www.instagram.com/reel/C7qCjNyhBPF/","label":"Instagram"}]$t$::jsonb), '{0,structured,citation_links}', $t$[{"url":"https://www.instagram.com/reel/C7qCjNyhBPF/","label":"Instagram"}]$t$::jsonb), '{0,parentage}', to_jsonb($t$'X-One' × 'Dark Phoenix'$t$::text)),
  updated_at = now()
where id = 110 and updated_at in ('2026-09-06T20:17:44.765692+00:00', now());

-- [89] Anthurium carlablackiae 'HR1' × carlablackiae 'HR2' [Seedling] : 「引用リンクにInstagramをシェアしています」を削除、URL の igsh と utm_source を除去
-- 旧 body: 作出者: hare_anthurium. 播種日: 2025-11-10. 交配式: carlablackiae 'HR1' × carlablackiae 'HR2'. 引用リンクにInstagramをシェアしています。
-- 旧 structured.notes: 引用リンクにInstagramをシェアしています。
-- 旧 sources: [{"text":"https://www.instagram.com/hare_anthurium?igsh=M2Voc2hwaWVleHo1&utm_source=qr"}]
-- 旧 citation_links: [{"url":"https://www.instagram.com/hare_anthurium?igsh=M2Voc2hwaWVleHo1&utm_source=qr"}]
update public.cultivars set origins = jsonb_set(jsonb_set(jsonb_set(jsonb_set(origins, '{0,body}', to_jsonb($t$hare_anthurium による A. carlablackiae の個体 'HR1' × 'HR2' の実生。2025-11-10 播種。$t$::text)), '{0,structured,notes}', 'null'::jsonb), '{0,sources}', $t$[{"url":"https://www.instagram.com/hare_anthurium/","label":"Instagram"}]$t$::jsonb), '{0,structured,citation_links}', $t$[{"url":"https://www.instagram.com/hare_anthurium/","label":"Instagram"}]$t$::jsonb),
  updated_at = now()
where id = 89 and updated_at in ('2026-09-06T20:14:39.7005+00:00', now());

-- ===== D. 道具の目録（affiliates）: 商品名を販売ページの表記に、範囲外は非公開（削除しない） =====

-- [tool 1] 霧吹きスプレー 1L EasyPump : 販売ページの表記: 霧吹きスプレー 1L EasyPump 電池式 11114-20 GARDENA
-- 旧 product_name: 霧吹きスプレー 1L EasyPump
-- 旧 maker: null
-- 旧 model: null
update public.affiliates set product_name = $t$GARDENA 電池式霧吹き EasyPump 1L$t$, maker = $t$GARDENA$t$, model = $t$11114-20$t$, updated_at = now()
where id = 1 and updated_at in ('2026-09-30T11:39:55.762609+00:00', now());

-- [tool 3] 硬質 Premium 室内用土 : リンク先は 8 袋セットで個人宅配送不可。1 袋の販売ページに貼り替えるまで非公開
-- 旧 product_name: 硬質 Premium 室内用土
-- 旧 maker: null
-- 旧 is_published: true
update public.affiliates set product_name = $t$プロトリーフ 室内向け観葉・多肉の土 硬質Premium 3.5L$t$, maker = $t$プロトリーフ$t$, is_published = false, updated_at = now()
where id = 3 and updated_at in ('2026-09-30T11:39:55.762609+00:00', now());

-- [tool 4] 緩効性肥料 中粒 1.1kg : 「緩効性肥料」は一般名。商品はマグァンプK
-- 旧 product_name: 緩効性肥料 中粒 1.1kg
-- 旧 maker: null
update public.affiliates set product_name = $t$マグァンプK 中粒 1.1kg$t$, maker = $t$ハイポネックスジャパン$t$, updated_at = now()
where id = 4 and updated_at in ('2026-09-30T11:39:55.762609+00:00', now());

-- [tool 5] HB-101 : 容量とメーカーを明記
-- 旧 product_name: HB-101
-- 旧 maker: null
update public.affiliates set product_name = $t$HB-101 100ml$t$, maker = $t$フローラ$t$, updated_at = now()
where id = 5 and updated_at in ('2026-09-30T11:39:55.762609+00:00', now());

-- [tool 6] バイオビス　Calmag 500ml : 「バイオビス」は誤り（バイオビズ）、全角スペース混入
-- 旧 product_name: バイオビス　Calmag 500ml
-- 旧 maker: null
update public.affiliates set product_name = $t$Biobizz Calmag 500ml$t$, maker = $t$Biobizz$t$, updated_at = now()
where id = 6 and updated_at in ('2026-09-30T11:39:55.762609+00:00', now());

-- [tool 8] ひゅうが土 18L 小粒 : 「細根にやさしい」「排水性に優れる」は効能表現
-- 旧 summary: 宮崎産の精製軽石、排水性に優れる
-- 旧 description: 宮崎県産の精製軽石を袋詰めした園芸用の用土。多孔質で軽量な粒状資材で、排水性と通気性を高める性質があり細根にやさしい土質。鉢土の配合材や単用でのサボテン・多肉・盆栽・挿し木用の用土として用いられる。弱酸性の性質を持つ。
update public.affiliates set summary = $t$宮崎県産の軽石、小粒$t$, description = $t$宮崎県産の軽石を袋詰めした園芸用の用土。多孔質で軽い粒状の資材。鉢土の配合材や、サボテン・多肉・盆栽・挿し木の単用土として使われる。弱酸性。$t$, updated_at = now()
where id = 8 and updated_at in ('2026-10-02T15:32:50.467527+00:00', now());

-- [tool 12] ベラボン プレミアム 5L×3 : 処分方法の一文は無関係
-- 旧 description: あく抜き処理を施したココヤシ（ヤシの実）チップを袋詰めしたセット。約3mm程度のチップで軽量かつ弾力のある繊維質素材。通気性と排水性を確保しやすく、洋ラン、多肉、観葉植物の植え込み材や培養土の配合材として用いられる。可燃ごみとして処分可能な場合がある。
update public.affiliates set description = $t$あく抜き処理をしたココヤシ（ヤシの実）チップ（約3mm）。軽く弾力のある繊維質の素材で、洋ラン・観葉植物の植え込み材や培養土の配合材として使われる。$t$, updated_at = now()
where id = 12 and updated_at in ('2026-10-02T15:32:50.467527+00:00', now());

-- [tool 13] 京成バラ園の土 12L : バラ用の堆肥入り培養土（商品名「京成バラ園の土」は販売ページどおりで正しい）。アロイドの自生地環境と無関係
-- 旧 is_published: true
update public.affiliates set is_published = false, updated_at = now()
where id = 13 and updated_at in ('2026-10-02T15:32:50.467527+00:00', now());

-- [tool 16] フェゴ板着生セット 小型2枚 : 「フェゴ」は販売店による人工ヘゴ板の呼び名で、販売ページの表記どおり。店オリジナルのセット
-- 旧 product_name: フェゴ板着生セット 小型2枚
-- 旧 maker: null
update public.affiliates set product_name = $t$フェゴ板 着生セット（小型2枚）$t$, maker = $t$森水木のラン屋さん$t$, updated_at = now()
where id = 16 and updated_at in ('2026-10-02T15:33:19.741027+00:00', now());

-- [tool 18] ココヤシ支柱 ヘゴ棒 : ヘゴ（木生シダ）ではなくココヤシ繊維。「ヘゴ棒」は誤解を招く
-- 旧 product_name: ココヤシ支柱 ヘゴ棒
update public.affiliates set product_name = $t$ココヤシ繊維巻き支柱 60/80/120cm$t$, updated_at = now()
where id = 18 and updated_at in ('2026-10-02T15:33:19.741027+00:00', now());

-- [tool 22] エコフォーム植木鉢 5〜10号 : ブランド名はエコフォームズ
-- 旧 product_name: エコフォーム植木鉢 5〜10号
-- 旧 maker: null
update public.affiliates set product_name = $t$エコフォームズ もみ殻の植木鉢 5〜10号$t$, maker = $t$エコフォームズ$t$, updated_at = now()
where id = 22 and updated_at in ('2026-10-02T15:33:53.004067+00:00', now());

-- [tool 23] アートストーンプランター L 受皿付 : 装飾用の大型プランター。鉢の範囲（スリット鉢・プラ鉢・腰水容器）の外
-- 旧 product_name: アートストーンプランター L 受皿付
-- 旧 maker: amabro
-- 旧 is_published: true
update public.affiliates set product_name = $t$amabro アートストーン L 受皿付$t$, maker = $t$amabro$t$, is_published = false, updated_at = now()
where id = 23 and updated_at in ('2026-10-02T15:33:53.004067+00:00', now());

-- [tool 28] サーキュレーター 小型 3段風量 : メーカーと型番を名前に
-- 旧 product_name: サーキュレーター 小型 3段風量
update public.affiliates set product_name = $t$アイリスオーヤマ サーキュレーター PCF-MKM15N$t$, updated_at = now()
where id = 28 and updated_at in ('2026-10-02T15:34:35.18583+00:00', now());

-- [tool 29] パネルヒーター（S/M/Lサイズ） : ペット用品（販売ページ: 爬虫類パネルヒーター）。植物用は BRIM HMT-330 がある
-- 旧 product_name: パネルヒーター（S/M/Lサイズ）
-- 旧 is_published: true
update public.affiliates set product_name = $t$爬虫類・小動物用パネルヒーター S/M/L$t$, is_published = false, updated_at = now()
where id = 29 and updated_at in ('2026-10-02T15:35:04.698388+00:00', now());

-- [tool 34] BARREL 植物育成LED 20W : 製品名を名前に
-- 旧 product_name: BARREL 植物育成LED 20W
update public.affiliates set product_name = $t$BARREL NEO AMATERAS LED 20W$t$, updated_at = now()
where id = 34 and updated_at in ('2026-10-02T15:35:35.080504+00:00', now());

-- [tool 36] MAG デジタル温湿度計 : 「MAG」はブランド名で型番ではない
-- 旧 model: MAG
update public.affiliates set model = null, updated_at = now()
where id = 36 and updated_at in ('2026-10-02T15:36:07.752336+00:00', now());

-- [tool 39] 自然暮らし 有機液体肥料 150ml : 販売ページの商品名
-- 旧 product_name: 自然暮らし 有機液体肥料 150ml
update public.affiliates set product_name = $t$自然暮らし 水でうすめる有機液肥 150ml$t$, updated_at = now()
where id = 39 and updated_at in ('2026-10-02T15:36:56.130151+00:00', now());

-- ===== E. 任意（統括が実行判断）: antolakii を暫定名の書式に。旧 URL /anthurium/antolakii の転送を実装してから実行 =====
-- 旧 cultivar_name: Anthurium antolakii / 旧 species_qualifier: null
-- update public.cultivars set cultivar_name = $t$Anthurium sp. "antolakii"$t$, species_qualifier = 'sp', aliases = array_append(aliases, $t$Anthurium antolakii$t$), updated_at = now() where id = 59;
-- update public.cultivar_images set cultivar_name = $t$Anthurium sp. "antolakii"$t$ where cultivar_name = 'Anthurium antolakii';  -- 現在 0 行

commit;
