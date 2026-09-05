# 分類・命名編集長レポート（2026-09-05 第3回・告知準備）

担当: taxonomy-editor（常設ボード）
前回: `docs/board/2026-09-05-taxonomy.md`（品質ゲート・検証フロー・Phase A 残・20件リスト）。
本日確認したもの: 本番 `cultivars` 69件（公開 Anthurium 31件）・`cultivar_images` 40枚・`genera` を Supabase REST（anon）で取得。IPNI API で記載者・出版物を照合（carlablackiae / regale / splendidum / wendlingeri / luxurians / veitchii）、GBIF backbone で nigrolaminum / besseae / wendlingeri / sagittatum を照合。コードは `wireframe/js/app-core.js`（状態列 2445–2451）、`pages.js`（origin カード 1118–1156、Tier バッジ 876–883）、`archive.js`（人物索引 135–191、cite 行 224–235）、`forms.js`（画像投票 2314–2403、caption プリセット 2785–2808）、`supabase/migrations/20260409_image_vote_security.sql`。

前提の訂正: オーナーの指摘どおり、サイトは植物界隈に未告知だったので「利用0件」は削除理由にならない。以下は **「告知後に、由来の正確性（判断基準②）に効くか」** だけで再判定した。

---

## 0. 要旨

- **A. 再判定**: 画像 Real/Fake 投票は **削除維持**（代替: 撮影者 by-line 必須 + 写真の「個体区分」ラベル + 疑義申告フォーム）。状態列は **3値に分ける**（記録なし／調査中／未収録）— 現行の2値は T23 のゲート導入で語義が衝突する。ユーザー名検索は **削除維持**、人物索引で代替できているが **人物典拠表（略称→本名）が無いと索引自体が信頼を落とす**。
- **B. 品質ゲート**: 目利きが初見で離脱する要素は **「原種の本文が由来ではなく形態のテンプレ文で、しかも誤りがある」「採集者・分布が捏造/混入」** の2つ。名前・記載者・年はほぼ正しい（splendidum 1件のみ引用不整合）。詳細は §2。
- **C. 最低条件**: 原種18件は「記載者・年・出版物が IPNI ID と一致 100%／採集者・タイプ産地は原記載由来か NULL／分布に栽培国0」、本文は「サイズ0・形態テンプレ0・曲引用符0」、Clone/Hybrid 8件は「交配式または formula_status 明示 100%／出典なし記録は『投稿者の記録』表示」、人物索引は「略称だけのページ0」。数値は §3。
- **D. T23 の順序**: データ修正 SQL → 原種本文の由来文化 → AI 経路の採集者/分布ルール修正 → 低信頼折り畳み + Tier 表示の mono 化 → 状態列3値 + recordGate + noindex → `p_meta` RPC（オーナー投稿 9/12 の前）→ 人物典拠表 → `species_qualifier` バッジ → `origin_type` 廃止（告知後でよい）。

---

## 1. A. 削除済み項目の再判定

### A1. 画像の Real / Fake 投票 — 判定: 削除維持、別の形で置き換える

事実（本番データ）:
- 40枚の集計は real 19 / fake 2。すべて 2026-03 の初期投稿時で、以後ゼロ。ただし告知前なので「使われない」の証明にはならない。
- `cultivar_images.user_id` は 40枚すべて NULL（anon 可視の範囲）。つまり現状は撮影者を表示する材料が無い。
- caption に入っている値: 「original clone」「SKG. not original clone」「'Mystique a88' F1」「インスタ」「2026年3月1日」。投稿者が写真に付けたかったのは「この写真はオリジナル個体か、F 個体か、どの系統か」であって、Real/Fake ではない。`forms.js:2791` の caption プリセット（Clone / self / sib / その他）も同じ発想で作られている。

分類編集の立場からの判断:
- アロイド界隈で写真に対して実際に起きる疑義は (a) 同定違い・ラベル違い、(b) 彩度を上げた「黒く見せる」加工、(c) 無断転載、(d) オリジナル個体と実生個体の混同、の4種。(a)(d) は投票で決まらない（専門知識の問題）、(b) は投票が扇動や嫌がらせに使われやすく、(c) は権利者からの申告が唯一の手段。Real/Fake の二値投票はどれにも効かない。
- したがって復活させない。代わりに「写真も記録の一部なので by-line と個体区分を持つ」という形にする。

置き換え（T23 の後、T27 詳細ページと同じセッション）:
1. 撮影者 by-line 必須: `cultivar_images` に `credit text`（撮影者の公開名または出典 URL）、`user_id` を保存（現在 NULL のまま上がっている経路を修正）。表示は図版下に mono 1行「撮影 hare_anthurium · 2026.03 · オリジナル個体」。既存 40 枚の `user_id`/`credit` はオーナーに埋めてもらう（§5 確認事項 3）。
2. 個体区分ラベル（caption プリセットを正式列に）: `specimen_status` = `original`（オリジナル個体／分け株）・`tc`（組織培養）・`f1`・`f2`・`line`（系統の実生、世代不詳）・`unknown`。Clone 区分の写真では必須。'King of Spades' の 3 枚は 1枚 original / 2枚 f1 相当で、現に caption で区別されている。これは「名前はオリジナル個体を指す」というオーナー決定を写真側で支える装置。
3. 疑義申告: 操作行の「報告」に理由の選択肢（同定が違う／画像が加工されている／無断転載／個体区分が違う／その他）と任意コメント → `image_reports` テーブル → 管理画面で処理（非公開・カウンター表示なし）。「Fake 票が多いと自動削除」の規約文言は「削除依頼に対応」に変更済み（T21）でよい。
4. `image_votes` テーブルと `vote_on_image` RPC は残す（可逆）。12月レビューで申告件数と照らして完全撤去を判断。

### A2. 「AI生成待ち」バッジ → 状態列「未収録／調査中」 — 判定: 用語を3値に修正

現行（`app-core.js:2447-2450`）: origin が無い（`trust > 0` の記録がない）行に、`ai_status` が pending / researching なら「調査中」、それ以外は「未収録」。

問題:
- T23 の `recordGate` が導入されると「未収録」の意味が変わる（前回決定: 収録済み＝区分別の事実項目が揃っている、未収録＝記録はあるが項目不足）。現行の「未収録」は「記録が1件もない」。同じ語を2つの状態に使うと、属カードの「収録品種 n」と台帳の表示が食い違う。
- 「調査中」は期限がない。`ai_status='pending'` のまま止まった記録（Edge Function 失敗時）は永久に「調査中」と出る。目利きには「動いていないサイト」に見える。

決定（実装は T23 の状態列と同時）:

| 状態 | 条件 | JP（mono） | EN |
|---|---|---|---|
| 記録なし | 非 formula の origin が0件、または placeholder のみ | 記録なし | no record |
| 調査中 | `ai_status` が pending / researching かつ `updated_at` から 72時間以内 | 調査中 | researching |
| 未収録 | 記録はあるが `recordGate` 不合格 | 未収録 | incomplete |
| 収録済み | ゲート合格 | 信頼度 n%（または検証済） | — |

72時間を超えた pending は「記録なし」に落とし、管理画面「調査失敗」キューに出す（`ai_status='failed'` に更新する cron か、表示側で `updated_at` を見るだけでもよい）。翻訳キー: `state_no_record` 追加、`state_unrecorded` の意味を「ゲート不合格」に限定、`state_researching` はそのまま。
「AI生成待ち」の撤去は正しい: サイトの本文が AI 生成であることを既定として宣伝する語で、定義文「出典つきで記録する図鑑」と矛盾する。

### A3. ユーザー名検索 — 判定: 削除維持。人物索引で代替できているが、典拠表が必要

- 「作出者・命名者・記載者・採集者を探す」需要は `/people/`（`archive.js` `peopleIndex`）が担う。静的ページは 30 本生成済み（`wireframe/people/`）。
- 「投稿者を探す」需要は、投稿者＝作出者の実生（`_creatorName` → breeder ロール）と `/profile/{uuid}` リンクで足りる。投稿者が作出者でない場合（原種登録など）に投稿者を索引化する必要はない（記録の主体は植物であって投稿者ではない）。
- ただし現状の人物索引は、目利きが見ると逆効果になる箇所がある（本日生成済みスラッグから）:
  - `mast` / `don` / `bay` / `n-e-br` / `moore` — IPNI 標準略称（Mast.＝Maxwell T. Masters、G.Don＝George Don、D.C.Bay、N.E.Br.＝N. E. Brown、T.Moore＝Thomas Moore）がそのまま人物ページの見出しになっている。略称は引用のための記号で人名ではない。
  - `mr-chandra`（敬称入り）、`hare-anthurium`（@ハンドル）、`sylva`（"D. S. Sylva" の姓だけ）、`denis-rotolante`（本文は "Denis Rotolante (SKG)" で所属が名前に混入）。
  - `croat` が crystallinum（1873年記載）の採集者として出る（§2 B-2 の捏造データが索引に伝播）。
- 対策（告知前、1セッション）: `scripts/lib/people.js` と `archive.js` の両方から読む人物典拠表 `data/people-authority.json` を置く。キーは IPNI 略称またはそのままの by-line、値は `{ name, years, note, handle }`。例: `"Mast."` → Maxwell T. Masters (1833–1907)、`"N.E.Br."` → N. E. Brown、`"G.Don"` → George Don、`"T.Moore"` → Thomas Moore、`"Croat"` → Thomas B. Croat、`"Linden"` → Jean Jules Linden、`"Matuda"` → Eizi Matuda、`"Mr Chandra"` → Chandra（敬称除去）、`"@hare_anthurium"` → hare_anthurium（handle）。見出しは本名、mono で「IPNI 略称 Mast.」を併記。表に無い略称は今までどおり表示（ページ生成は止めない）。
- 復活条件: 登録ユーザー 50 人超かつ投稿者が 5 人以上（12月レビュー）。それまでユーザー名検索は不要。

---

## 2. B. 告知前の品質ゲート — 現行データの指摘一覧

凡例: [致命] 目利きが初見で信頼を失う／[表記] 気づくと減点／[要確認] 私が断定できない、出典で確かめる。id は `cultivars.id`。

### B-1. [致命] 原種の本文が「由来」ではなく形態のテンプレ文で、誤りを含む
- 「葉は心形で、表面は光沢があり、濃緑色」系の定型句が crystallinum(3)・warocqueanum(4)・veitchii(6)・clarinervium(9)・papillilaminum(32)・nutibarense(33)・splendidum(35)・luxurians(57)・wendlingeri(77)・sagittatum(82)・dressleri(31)・carlablackiae(1) で反復。由来図鑑の本文に由来が書かれていない。
- 内容の誤り: crystallinum「表面は光沢」（ベルベット葉の代表種）、regale(83) 手動記録「葉脈パターンは平行脈」、papillilaminum「植物全体に細かい毛」、kunayalense(38)「アンティュリウム・クナヤレンセ」（学名の片仮名転写は不要、しかも表記が変）。
- 修正: 原種の `body` は structured から生成する由来文に差し替える。雛形: 「*Anthurium crystallinum* は 1873 年、Linden & André が *L'Illustration Horticole* 20 で記載した。タイプ産地はコロンビア Chocó。（採集者が原記載から確認できる場合のみ）採集者 …。分布はコロンビア・パナマ（POWO）。」 AI の形態文は削除する。残したい場合は `<details>`「形態メモ（AI 生成・未検証）」に隔離。`forms.js` `generateBodyFromStructured` の species 分岐と `research-origin/index.ts` の species プロンプトに「形態・サイズ・栽培を書かない、由来のみ」を明記。

### B-2. [致命] 採集者（`structured.collector`）の捏造・記載者との混同

| id | 名前 | 現状 | 問題 | 修正 |
|---|---|---|---|---|
| 3 | crystallinum | collector "T. B. Croat", collection_year 1975 | 1873 年記載の種を Croat が 1975 年に採集したことになっている。導入は Linden、採集は G. Wallis とされる | collector NULL（原記載に採集者の明記が無ければ空欄）、collection_year NULL |
| 6 | veitchii | collector "T. B. Croat" | 同上。Veitch 商会のために Wallis が採集 | NULL |
| 4 | warocqueanum | collector "T. Moore" | 記載者をそのまま採集者に入れている | NULL |
| 77 | wendlingeri | collector "G. M. Barroso" | 同上 | NULL |
| 83 | regale（origin[1] 手動） | collector "Linden" | 同上。Linden は記載者・導入者 | NULL（structured.collector）、本文の「発見者: Linden」も削除 |
| 31 | dressleri | collector "T. B. Croat" | 献名先 Dressler が採集した可能性が高い | [要確認] 原記載（Aroideana 1: 54）で確認、確認できなければ NULL |
| 32 | papillilaminum | collector "R. L. Dressler" | [要確認] Croat 1986 モノグラフのタイプ引用で確認 | 同 |
| 33 | nutibarense | collector "J. M. MacDougal, D. Restrepo & D. S. Sylva", collection_year 2005 | 採集年＝発表年。ありうるが疑わしい | [要確認] Aroideana 28: 61 で確認 |
| 34 | debile | collector "T. B. Croat", collection_year 2004 | 同上 | [要確認] |
| 57 | luxurians | collector "George Wagner" | [要確認] | 同 |
| 10, 11, 35, 82 | magnificum, forgetii, splendidum, sagittatum | collector "不明"（文字列） | `clean()` が隠しているだけ | NULL に |

ルール（AI 経路に明記）: 採集者・採集年は原記載（protologue）またはタイプ標本の引用にあるときだけ入れる。無ければ NULL。人物索引は collector ロールから生成するので、ここが捏造だと索引に伝播する（現に `croat` が crystallinum の採集者として索引に出ている）。

### B-3. [致命] 分布（`known_habitats` / `native_region`）に栽培国が混入
- magnificum(10) "Colombia, United States, Brazil, France, Germany, French Polynesia"、forgetii(11) "Colombia, United States, Brazil"、regale(83) "Peru, United States, India"。GBIF の occurrence 国リスト（植物園・栽培記録を含む）をそのまま分布にしている。目利きは一目で分かる。
- carlablackiae(1) "Colombia (Western South America, Southern America), Panama (Central America, Southern America)," — TDWG 階層と末尾カンマがそのまま。
- 修正: `research-origin` の GBIF 経路で `known_habitats` は POWO の native distribution（TDWG Level 3 → 国名）のみ。GBIF occurrence は使わない。既存3件は手で "Colombia" / "Colombia" / "Peru" に。

### B-4. [致命] splendidum(35) の引用が内部で矛盾
- 現状: author_name "W.Bull"、publication_year 1883、first_description "W.Bull, Gard. Chron. n.s., 19: 381 (1883)"、IPNI リンク `85368-1`。
- IPNI（本日照合）: `85368-1` は W.Bull ex Rodigas, Ill. Hort. 31: 13, t. 510 (1884)。1883 の Gard. Chron. 19: 381 は W.Bull ex T.Moore & Mast.（`77368786-1`）として別レコード。つまり「著者名・年・出版物・リンク」が2つのレコードの混合。
- 修正案: POWO の accepted 表記に合わせる（[要確認] POWO の表示が "W.Bull ex Rodigas" なら author_name をそれに、year 1884、first_description "W.Bull ex Rodigas, Ill. Hort. 31: 13, t. 510 (1884)"、本文注記に「1883 年に Gard. Chron. で W.Bull の名で先行発表（英文記載）」）。

### B-5. [致命] 記憶事項「由来にサイズを書かない」違反
- forgetii(11) origin[1]「葉柄は太く、長さが約30cmである」／ sagittatum(82)「長さ20-40cm、幅5-10cm…葉柄は長さ10-20cm…花序は長さ5-10cm」／ debile(34) `body_en` "approximately 20-30cm long … 10-15cm long"。
- 修正: B-1 の本文差し替えで消える。それまでの応急処置として該当文を削除。

### B-6. [致命] 区分の不整合（'King of Spades' 則との矛盾）— オーナー判断
- 'Mystique A88'(109) は Hybrid だが、本文は「'Mystique A88' には original がある。しかし生産ラインは original の seedling ではなく 'Dorayaki' original × 'Red Crystallinum' NSE の F1 個体」。これは 'King of Spades'（オリジナル個体あり・流通は F 個体 → Clone + tag `line`）と同じ構造。
- 'Galaxy'(110) は Hybrid だが、本文は「X-One と Dark Phoenix の F1 選抜個体が Galaxy」。1個体の名前なら Clone。
- 判定軸（BOARD §3）「その名前を名乗る株は1個体の栄養繁殖由来だけか」に照らすと、'Mystique A88' はオリジナル個体が存在する以上 Clone + `line`、'Galaxy' は Clone。ただし Mystique の生産者（Chandra）が名前を F1 群に使っているなら 'Michelle' 'Zara' と同じ「作出者が系統名として使う → Hybrid」にも読める。§5 確認事項 1。判断が出るまで現状維持。
- 'Red Crystallinum'(52) は Hybrid + `trade` + `line` で「複数系統の総称」と本文が明記しており整合。`formula_status='complex'` の投入待ち（前回 [即]）。

### B-7. [致命] 低信頼記録の見え方
- 'Dark Mama'(5): AI（Llama 3.3 70B）本文、trust 43、Tier C「コミュニティ・コレクター情報」だが出典 0 件。Tier C の根拠が無い。信頼度 40 以上なので前回決めた折り畳み（<40）に掛からない。ルール追加: 出典 URL が 0 件の AI 記録は Tier D・trust 30 以下に丸める（表示側 clamp + データ修正）。'Dark Mama' は P5 の両論併記まで「AI 下書き」折り畳み。
- 'King of Spades'(2): `source_type='ai_verified'`、`verification.summary_jp`「提供された情報は検証できないため、正確性は不明です」、warnings は英語。本文はオーナーの記述で、'King of Spades' の説明としては正確。前回 [即] の `manual` 化を実施し、`verification` ブロックは manual 記録では描画しない（`pages.js` 1100 付近）。
- 'Galaxy'(110): `manual` なのに `verification.warnings` "The provided Instagram link is not a reliable source for botanical verification" が英語で表示される。同上。
- 'Ace of Spades'(7): `source_type='ai_research'`、author "AI (GPT-4o mini)"、trust 23、Tier D 赤「不明・未検証」。本文はオーナーによる詳細な来歴（Orchid Jungle → Rotolante 選抜）で、サイト内で最も内容のある記録に最低の信頼度と赤バッジが付いている。手動記録の trust は 30/23 固定で内容を反映しない。→ 出典なしの手動記録は % を出さず「投稿者の記録 · 出典なし」の mono 1行（T27 の Tier 統合と同時）。% は出典 Tier から算出できる記録だけに表示。
- 台帳の「由来 1件」表記: 'Dark Mama' の AI 記録が「1件」と数えられる。折り畳み対象は件数に含めない。

### B-8. [表記] 引用符・綴り・自動生成の残骸

| id | 箇所 | 問題 | 修正 |
|---|---|---|---|
| 7 | 'Ace of Spades' 本文 | ‘Ace of Spades’（曲引用符） | 'Ace of Spades' |
| 52 | 'Red Crystallinum' 本文 | ‘Red crystallinum’ “Wonderboy”（曲引用符、小文字） | 'Red Crystallinum' 'Wonderboy' |
| 108 | aff. besseae 本文 | 「分類: aff.. 生息地: panama Darien(パナマ　ダリエン)」二重ピリオド・小文字・全角空白 | 本文「*Anthurium besseae*（ボリビア産）とは別物として扱う。パナマ Darién 産として流通。」、known_habitats "Darién, Panama" |
| 10, 11, 83 | first_description | "(1865)  (1865)" 年の重複 | 1回に（GBIF 経路のフォーマッタ修正） |
| 10, 11, 83 | POWO 引用 | `powo.science.kew.org/results?q=…`（検索 URL） | taxon LSID（`/taxon/urn:lsid:ipni.org:names:84980-1` 等） |
| 55, 89 | cultivar_name | 末尾 " [Seedling]" が DB の名前に入っている | 表示は除去済み。Phase B `display_name` まで維持、OGP/URL に漏れないことを確認 |
| 55 | parent_b_text | "Anthurium 'Titanium' (aff. besseae × nigrolaminum)" 括弧で交配式を内包 | "Anthurium 'Titanium'"。括弧内は 'Titanium' 登録時の交配式へ。*A. nigrolaminum* Croat & D.Weber は GBIF ACCEPTED なので正規名で入れる |
| 109 | parent_b_text | "Anthurium 'Red Crystallinum' (NSE)" | `parent_b_id=52`、系統注記「NSE 系統」は notes に |
| 110 | 本文 | "X-one" "Dark phoenix" | 'X-One' 'Dark Phoenix'（名前欄と同じ大文字） |
| 2 | name_status | `accepted` | NULL（`accepted` は学名用。ICNCP 登録品種ではない） |
| 6 | known_habitats | 「熱帯雲霧林、標高300-1000mの着生植物、Colombia」日英混在 | "Colombia"（環境は本文へ） |
| 38 | 本文 | 片仮名学名 | 削除 |
| 77 | type_locality | "Colombia" | [要確認] 原記載（Bol. Soc. Venez. Ci. Nat. 26: 151）のタイプ産地。確認できなければ NULL、分布は POWO |

### B-9. [表記] by-line の人物名の揺れ
- "Mr Chandra"（敬称）→ 公開名を確認（§5-2）。"Denis Rotolante (SKG)" → 人名 "Denis Rotolante"、所属 "Silver Krome Gardens" は notes。"@hare_anthurium" → 表示 "hare_anthurium"（@ は除去、`/profile/` へリンク）。"Space Hijau" はナーセリー名 → 人物索引の role に `nursery` を追加するか breeder のまま注記。"kunzo" はハンドルとして現状維持。
- 原種側: 略称ページ（§1 A3）。

### B-10. 画像テーブル
- 孤児 5 枚（表示されない）: forgetii × Titanium 実生の旧表記 1枚、carlablackiae HR1 × HR2 実生の旧表記 2枚（2種類の綴り）、`Anthurium debilis` 1枚、`Anthurium テスト` 1枚。前3件は現在名へ UPDATE、debilis → `Anthurium debile`、テストは削除。
- `user_id` 全件 NULL（§1 A1 参照）。

### B-11. 正しかったもの（安心材料）
IPNI 照合で一致: carlablackiae（Croat & O.Ortiz, Phytotaxa 467(1): 10, 2020）、regale（Linden, Belgique Hort. 16: 200, 1866）、wendlingeri（G.M.Barroso, 1965）、luxurians（Croat & R.N.Cirino, Aroideana 28: 56, 2005）、veitchii（Mast., Gard. Chron. n.s. 775, 1876）。前回確認済みの debile（Croat & D.C.Bay 2004、原綴 debilis）も正しい。記載者略称は全件 IPNI 標準形。名前と記載者・年の骨格は信頼できる。壊れているのは AI が足した肉（採集者・分布・形態文）。

---

## 3. C. 告知時に「この図鑑は正確」と言える最低条件（数値）

対象: 告知時点の公開 Anthurium（現行 31 + T24 で追加する分）。すべて `recordGate` と SQL で機械的に検査できる形にする。

| # | 条件 | 現状 | 目標 |
|---|---|---|---|
| C1 | 記載種: 記載者・発表年・出版物（first_description）が IPNI レコード ID と一致 | 17/18（splendidum 不整合） | 18/18（100%） |
| C2 | 記載種: `collector`/`collection_year` は原記載由来か NULL | 疑義 10件 | 疑義 0件 |
| C3 | 記載種: `known_habitats` に非自生国（United States 等）が含まれない | 3件混入 | 0件 |
| C4 | 全記録: 本文にサイズ（cm/m/mm）・生育速度が無い | 3件 | 0件（正規表現 `[0-9]+ ?(cm|mm|m)` で検査） |
| C5 | 記載種: 本文が形態テンプレ文でなく由来文（記載者・年・出版物・産地を含む） | 0/18 | 18/18 |
| C6 | 全記録: 曲引用符 ‘ ’ “ ” が名前・本文に無い | 2件 | 0件 |
| C7 | 未記載・暫定名（antolakii, aff. besseae, sp. "Peru"）: `name_status='informal'` + `species_qualifier` or `species_status` + locality | 3/3 | 3/3 維持。antolakii に `aliases=['BVEP','Black Velvet Eastern Panama']` |
| C8 | Clone/Hybrid: 親 A・B または `formula_status` 明示 | 7/8（52 が NULL） | 8/8 |
| C9 | Clone/Hybrid: 作出者または命名者 | 7/8（'Dark Mama' 不明は formula で代替） | 8/8 |
| C10 | Clone/Hybrid: Tier C 以上の出典 URL を持つ | 0/8（Instagram のみ） | 3/8 以上（'Ace of Spades' 'King of Spades' 'Dark Mama' は Vannini / 4aroids / NSE で取れる見込み） |
| C11 | 出典 0 件の AI 記録が Tier C 以上・trust > 30 で表示されていない | 1件（'Dark Mama'） | 0件 |
| C12 | 区分の判定軸違反（1個体の名前が Hybrid、複数個体の名前が Clone） | 2件疑義（109, 110） | 0件（オーナー判定後） |
| C13 | 人物索引: 略称・敬称・@ がそのまま見出しのページ | 7本 | 0本（典拠表） |
| C14 | 人物索引: 捏造 collector から生成されたロール | 1件以上（croat ← crystallinum） | 0件（C2 で解消） |
| C15 | 管理者「検証済」（T26）: 記載種 18 + Clone/Hybrid | 0 | 記載種 18/18、Clone/Hybrid 4/8 以上 |
| C16 | 画像: 孤児・テスト画像 | 5枚 | 0枚 |
| C17 | 画像: 撮影者 by-line（`user_id` または `credit`） | 0/40 | 40/40 |
| C18 | 公開ページ: recordGate 不合格の詳細ページは noindex、sitemap 除外 | 未実装 | 100% |
| C19 | 由来ラベル: AI 単独・未検証記録が「AI 下書き」表示で一等地に出ない | 未実装 | 100% |

告知の Go 条件: C1〜C9・C11・C13・C14・C16〜C19 がすべて達成、C10・C12・C15 は数値どおり。C15 が間に合わない場合は「検証済 0 件」で告知しない（検証印の無い状態で「正確」と言うと後で撤回することになる）。

---

## 4. D. T23 の優先順位（告知準備の観点で並べ直し）

前回は「ゲート → 折り畳み → P1 → P2 → P3 → データ修正」の順だった。目利きの初見で効く順に並べ替える。P1/P3 は見えないので後ろへ。

| 順 | 作業 | 理由 | 目安 |
|---|---|---|---|
| 1 | データ修正 SQL 一括: B-2 の collector NULL 化（確定分 5件）、B-3 分布 3件、B-5 サイズ文 3件、B-8 表記（引用符・year 重複・POWO URL・parent_b_text・name_status・known_habitats）、前回 [即]（52 complex、7/2 manual、59 aliases、34 注記）、B-10 画像名寄せ・テスト削除、`collector='不明'` → NULL | UI 変更ゼロ・可逆・1セッション。C1〜C4, C6〜C8, C16 が埋まる | 0.5日 |
| 2 | 原種本文の由来文化: `generateBodyFromStructured`（species）と research-origin の species プロンプトを由来のみに。既存 18 件の body を再生成（AI 不要、structured から組み立て）。形態文は削除 | C5。目利きが最初に読む場所 | 0.5日 |
| 3 | research-origin の採集者・分布・引用ルール: collector は protologue のみ、known_habitats は POWO native のみ、POWO は LSID URL、first_description の年重複修正、出典 0 件は Tier D / trust 30 以下 | T24 の原種 9 件を登録する前に直す（同じ壊れ方を 9 件増やさない） | 0.5日 |
| 4 | 低信頼記録の折り畳み + Tier 表示の mono 化 + 手動記録の % 非表示 + verification ブロックの manual 非描画 | B-7。C11・C19 | 0.5日 |
| 5 | 状態列 3 値 + `recordGate` + 詳細の未収録シート + noindex + sitemap 除外 + 属カード件数 + admin 未収録一覧 | A2。C18 | 1日 |
| 6 | P2 `p_meta` RPC + `#formula-complex` | オーナーのシード投稿（9/12）で親・区分・status を列に落とすため、投稿前に必要 | 0.5日 |
| 7 | 人物典拠表 `data/people-authority.json` + 読み込み（archive.js / scripts/lib/people.js） | A3。C13。30 本の人物ページは index 対象 | 0.25日 |
| 8 | P1 `species_qualifier` バッジ | 対象 2 件で regex が正しく動いている。効果小 | 0.25日 |
| 9 | P3 `origin_type` 廃止 | 見えない。告知後でよい | 0.25日 |

1〜5・7 が告知の前提（合計 3.25 日程度）。6 は 9/12 前。8・9 は告知後でも構わない。T26（検証済印）は T23 とは別だが C15 のため告知前に必要 — 順序としては T23(1〜5) → T24 原種 9 件 → T26 → T25 の順を推す。

---

## 5. オーナーへの確認事項（回答が無ければ既定で進める）

1. 'Mystique A88'(109) と 'Galaxy'(110) の区分: 'King of Spades' 則に従うと両方 Clone（Mystique は + tag `line`）。ただし作出者が名前を F1 群の系統名として使っているなら Hybrid のまま。既定: 現状維持（Hybrid）、本文に「オリジナル個体は存在する／流通は F1」を明記。
2. by-line の公開名: "Mr Chandra" の公開名（敬称なし）、"Space Hijau" は人物かナーセリーか。既定: "Chandra"、Space Hijau は breeder 表示のまま注記「ナーセリー」。
3. 画像 40 枚の撮影者: すべてオーナー撮影か、hare_anthurium 等の提供分があるか。既定: 回答分だけ `user_id`/`credit` を埋め、残りは「撮影者未記録」と表示。
4. 'Ace of Spades' の来歴の出所: Orchid Jungle → Rotolante 選抜の話はどこから（Vannini 記事／SKG／本人交信）。URL があれば Tier C に上がる。既定: 出典なしのまま「投稿者の記録」表示。
5. splendidum の表記: POWO 表示に合わせて "W.Bull ex Rodigas (1884)" に改めてよいか。既定: 改める。
6. forgetii × 'Titanium'(55) の播種日・作出者（前回から継続）。
7. 写真の個体区分ラベルの語彙（A1-2）: オリジナル個体／組織培養／F1／F2／系統実生／不明 の 6 択でよいか。既定: この 6 択。

---

## 6. BOARD.md への差分（product-owner 向け）

- §3 に追記: 「状態列は3値（記録なし／調査中 72h／未収録＝ゲート不合格）」「採集者・採集年は原記載由来のみ、分布は POWO native のみ、出典 0 件の AI 記録は Tier D・trust 30 以下」「原種の本文は structured から生成する由来文（形態・サイズを書かない）」「人物典拠表 `data/people-authority.json`」。
- §4 撤去リストに注記: 「画像 Real/Fake 投票は削除維持。代替: 撮影者 by-line（`credit`, `user_id`）+ 個体区分ラベル（`specimen_status`）+ 疑義申告（`image_reports`）」「ユーザー名検索は削除維持、復活条件: 登録 50 人超・投稿者 5 人以上」。
- §6 T23 を本レポート §4 の順に差し替え。告知 Go 条件を §3 の C1〜C19 として追加。
- §7 オーナー待ちに §5 の 1〜5・7 を追加。

## 参考（本日照合）
- IPNI: carlablackiae 77212524-1（Phytotaxa 467(1): 10, 2020）／ regale 85270-1（Belgique Hort. 16: 200, 1866）／ splendidum 85368-1（W.Bull ex Rodigas, Ill. Hort. 31: 13, t. 510, 1884）・77368786-1（W.Bull ex T.Moore & Mast., Gard. Chron. n.s. 19: 381, 1883）・77368787-1（W.Bull, Nursery Cat. 193: 11, 1883）／ wendlingeri 15824-2（Bol. Soc. Venez. Ci. Nat. 26: 151, 1965）／ luxurians 60439860-2（Aroideana 28: 56, 2005）／ veitchii 85473-1（Gard. Chron. n.s. 775, 1876） https://www.ipni.org/api/1/search
- GBIF backbone: nigrolaminum 8222727（Croat & D.Weber, ACCEPTED）／ besseae 2873162／ wendlingeri 2873660／ sagittatum 2873573 https://api.gbif.org/v1/species/match
- 本番データ: `cultivars` 69 件・`cultivar_images` 40 枚（2026-09-05 取得、anon）
