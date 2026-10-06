# 第8回ボード（2026-10-07b）分類・命名編集長の報告

書き込みツールがないため、下に報告の全文を載せます。保存先は `docs/board/2026-10-07b-taxonomy.md` です。

**作業メモ**
- **確かめた本番データ**: 本日 anon キーで `cultivars` 82 行（うち Anthurium 44 行）、`genera`、`cultivar_images` を取得しました。`record-gate.js` を全件にかけ、IPNI と GBIF の API で名前を照合しました。
- **確かめた表示**: plantsstory.com の静的ページ（品種・人物・産地・sitemap）を curl で取得しました。SPA の画面は Chrome を起動できず撮れていないため、コードを読んで確かめています。
- **'Galaxy' の出典**: IAS 登録ページ（Wix 製）は機械取得すると 404 になります。中身は検索エンジンの抜粋で確認しました。適用前に 1 度ブラウザで開いて目視してください（修正 #2）。

---

```markdown
# 第8回ボード（2026-10-07b）分類・命名 — 名前の取り違えと「わからない」の書き分け

担当: 分類・命名編集長。根拠: 本番 cultivars 82 行（Anthurium 44）を anon で取得、record-gate.js を全件実行、IPNI / GBIF API、本番の静的ページ（品種・人物・産地・sitemap）。

## 0. 要約

- 収録判定は今日も **40 件合格**（記載種と未記載 32・Clone 5・Hybrid 3）。不合格は 'BVIT'（作出者なし）と実生 55（記録なし）。
- 今日の修正（系統図の完全一致・未記載の書式・antolakii の表示・分布の和訳）が本番データと合っていることを確かめた。
- そのほかに、名前・国の部分一致や取り違えによる誤りが **5 種類**残っている。
  1. **産地ページが「タイプ産地」を名乗っているが、多くは分布から取った国**。「Peru をタイプ産地とする原種 3 種」の 3 種は、どれもペルーがタイプ産地ではない（regale はタイプ産地なし、sp. "Peru" は流通情報、villenaorum は未記載）。Colombia の 12 種のうち 7 種も同じ状態。さらに静的ページ側（`scripts/lib/geo.js`）は、今日 SPA で直した「テキスト中で最も早く出る国」を使っていない。そのため hookeri が /locality/venezuela/ に載り、SPA とずれている。
  2. **'Fort Sherman' の導入者「Jay Vannini」のリンクが /people/jay-vannini/ に向いていて 404**。人物表の索引名は「Vannini」。
  3. **'Queen of Hearts' の「'Ace of Spades' から選抜」は出典がない推測**なのに、`selected_from_id=7` として系統図の親子と収録判定の事実に使われている。'Red Crystallinum' の本文にも「'Wonderboy' の関与が指摘される」という、出典のない具体名がある。
  4. **親の名前を探す関数が 2 通り**ある。子を探す `normParent`（「A.」・属名・引用符を外す）と、親を探す `findByEpithet`（外さない）。「A. warocqueanum」と書いた親は、子の側からは結ばれるのに、親のラベルでは「未登録」になって重複登録を誘う。今のデータでは起きていない。
  5. **'Angels dream' に別名がなく**、「エンジェルスドリーム」「Angel's Dream」で検索しても見つからない。
- 未決の 6 論点はすべて結論を出した（§2）。オーナーに聞くのは 3 点だけで、どれも既定回答つき（§7）。

## 1. 本番データの点検結果（誤り・食い違い・取り違え）

| # | 重 | 対象 | 見つけたこと | 根拠 |
|---|---|---|---|---|
| 1 | A | 産地ページ（静的ページ・SPA の meta） | 題名と説明文が「{国} をタイプ産地とする原種 n 種」。中身は「タイプ産地 → なければ分布の先頭」で選んだ国。Peru 3 種はタイプ産地 0 件、Colombia 12 種中 7 件（crystallinum・veitchii・magnificum・luxurians・metallicum・sp. "queremalense"・sagittatum）、Panama 6 種中 2 件（aff. besseae・antolakii）はタイプ産地ではない | `scripts/generate-static-pages.js:389`、`wireframe/js/archive.js:1017` |
| 2 | A | 国の決め方 | `scripts/lib/geo.js:23-31` は国名リストの順で選ぶ（T62 の修正が入っていない）。hookeri → Venezuela・sagittatum → Colombia（静的ページ）、SPA ではどちらも French Guiana。/locality/french-guiana/ は 404 | `geo.js` と `archive.js:64-78` |
| 3 | A | 産地ページの対象 | 流通情報だけの産地（121 sp. "Peru"「ペルー（流通情報）」、108 aff. besseae「Darién 産として流通」）が、原種の産地として並ぶ | 同上 |
| 4 | A | 140 'Fort Sherman' | ラベルの導入者「Jay Vannini」が `personKey` で「Jay Vannini」のまま → /people/jay-vannini/ は 404。導入者は人物索引の対象外なので、Vannini のページに 'Fort Sherman' が出ない | `archive.js:631`・`peopleRolesOf:180`、`people-authority.json` に「Jay Vannini」がない |
| 5 | A | 8 'Queen of Hearts' | 本文「…変異から生まれた品種である可能性が高い（出典未確認）」。検索で見つかるのは小売店の「仮説」という記述だけ（ormbunker.se）。それなのに `selected_from_id=7` で、系統図・ラベル「選抜元」・収録判定の事実 1 つに数えている | 記憶事項「推測を書かない」、BOARD 09-07 G「係争中の親は事実に数えない」の趣旨 |
| 6 | A | 52 'Red Crystallinum' | 本文「（'Wonderboy' の関与が指摘されるが確証はない）」は、出典なしで具体的な品種名を挙げた推測 | 記憶事項 |
| 7 | A | 110 'Galaxy' | IAS（国際アロイド協会）の栽培品種登録に 'Galaxy' がある。作出 Hendry Kharismawan（Spacehijau、インドネシア・マラン）、母 papillilaminum 'X-One'（Indo variant）、父 papillilaminum 'Dark Phoenix'（Indo variant）、形態の記録は Azri（シンガポール）。登録品種は 1 株とそのクローンの名前なので Clone。英文は今も「is a hybrid cultivar」 | aroidcultivars.org（検索エンジンの抜粋）。BOARD 7-00 O-1 |
| 8 | A | 5 'Dark Mama' | 二つの出典は**交配親で一致**している（Vannini: warocqueanum × papillilaminum、NSE: 同じ）。食い違いは**作出者**（Vannini: John Banta が最初、2003 年に Vannini が作り直して NSE へ送った／NSE: Karel Havilcek と表記）。Vannini は「この 2 種の単純な交配はすべて Dark Mama」と書いている＝交配式の名前。いまは Clone・`formula_status=disputed`・tag `disputed_parentage` | Exotica Esoterica（Vannini）、nsetropicals.com |
| 9 | B | 109 'Mystique A88' | 本文「名付けたオリジナル個体はあるが、流通株は同じ交配式の F1」。オーナーの規則（09-04「名前はオリジナル個体を指す。F 個体が流通していても Clone + tag line」）では Clone。いまは Hybrid（09-05b の既定回答で、オーナーの回答ではない） | 記憶事項 feedback_clone_name_original |
| 10 | B | 53 'Angels dream' | 出典 0・別名 0。anthurium-japan.com（花宇宙への問い合わせ）に裏づけがある: 2000 年にフィリピンのナーセリーから譲り受け、元はアメリカから来た株。KUNZO が magnificum 'Angel's Dream' と命名。magnificum の交配種で、交配式は不明 | https://anthurium-japan.com/angles-dream/ |
| 11 | B | 32 papillilaminum | `body_en` に IPNI の注記「14: 152. 1986 Revis. Gen Anthurium. Part 2. Panama.」が残る（10-03 は和文だけ直した）。和文は、タイプ産地と分布がどちらも Panama なのに T70 の型（「タイプ産地・分布とも…」）になっていない（採集者の文があるため T70 の対象から漏れた） | 本番 origins |
| 12 | B | 2 'King of Spades' | 本文「Haji Ulih（ハジ・ウリ）氏」に敬称が残る | BOARD §3 ⑤ |
| 13 | B | 89 実生 | 本文「2025-11-10 播種」が ISO 形式。全画面 YYYY.MM.DD の決まりに反する | 10-07 裁定「日付」 |
| 14 | B | 108・121 | `structured.notes` が本文と同じ文。一覧などは notes を先に読むため、108 の説明は「Anthurium besseaeとは別物」（空白なし）の 1 句になる | `archive.js:112` |
| 15 | B | 人物表 | Sodiro・Koch（K.Koch）・Haage（A.Haage）・John Banta が未登録。人物ページの見出しが略記のまま、生没年が出ない | `wireframe/data/people-authority.json` |
| 16 | B | `updated_at` | T68・T70 で本文を変えた行（4・11・35・129・59・127・138・108・121）の `updated_at` が 10-02（121 は 09-04）のまま。ページの「更新」が実際より古く、修正 SQL の更新日ガードも今日の変更を検出できない | 本番 updated_at |
| 17 | C | 表示の残り | `index.html:232` と `translations.json` の `species_badge` に「原種 / Original Species」が残る（10-03 D9 で廃止）。JS が動かないクローラーには見える。使い方ガイドは「見出しの『IPNI / POWO · Tier S · 95%』」（T64 で廃止した形）と「検証済…（準備中）」（実装済み）のまま | `wireframe/index.html:1074,1078` |
| 18 | C | 写真と名前 | `cultivar_images` が品種名の文字列で結ばれている。名前を変えると写真が外れる（実生 2 件は「[Seedling]」を除いた名前で保存） | `cultivar_images.cultivar_name` |
| 19 | C | 未記載名の現状 | antolakii・villenaorum は IPNI・GBIF ともに 0 件（本文どおり）。queremalense は IPNI 0 件だが、GBIF に「Anthurium queremalense Croat」DOUBTFUL（key 7968142）がある。本文の「IPNI・WCVP に登録なし」は正しい | IPNI・GBIF API |
| 20 | C | 132 radicans | 記載者「K.Koch & A.Haage」は IPNI と一致（GBIF の表記は「K.Koch & Haage」）。修正不要（T68 の照合を閉じる） | IPNI 85262-1 |

問題なし: 記載種 27 件の記載者・年・出版物・採集者は 10-03 の照合から変わっていない。サイズの記述 0 件。系統図の子は完全一致だけになり、'Fort Sherman' も 'Mystique A88' も crystallinum や warocqueanum の子に出ない。検索の部分一致（「crystallinum」で 'Red Crystallinum' も出る）は関連づけではないので、そのままでよい。

## 2. 未決の論点への結論

| 論点 | 結論 | 理由 |
|---|---|---|
| **D4 引用符** | **確定・閉じる**。品種名・個体名・流通名は ' '、種レベルの非公式名（sp. "Peru"、obliqua "Peru"）は " "、記載済みの種小名は引用符なし。流通名は ' ' のままラベル下に「流通名」と注記する。用語集の g-trade-name に 1 文を足す:「国際栽培植物命名規約は流通名を引用符で囲まないが、このサイトは流通の書き方に合わせて ' ' で囲み、『流通名』と注記する。」 | 名前は URL なので、引用符を変えると URL が変わる。規約との違いは隠さず書くほうが信頼につながる |
| **D12 Platycerium** | **削除する**（オーナーの作業は不要。Claude Code が JSON に退避してから削除。修正 #10） | ビカクシダはシダでアロイドではなく、定義文「アロイドの由来」と合わない。非表示のまま 18 行を anon が読める。退避があるので戻せる |
| **'Galaxy' の区分** | **Clone**。作出者は「Space Hijau」のまま（人物 URL を変えない）で、人物表の注記に Hendry Kharismawan。種小名は付けない | IAS 登録＝1 株の名前。両親は「Indo variant の papillilaminum」とされるが、流通する papillilaminum には交配株が多い（Vannini）ため、単一の種に由来するとは言えない。**O-1 は閉じる**: F1 が同名で売られていても、オーナーの規則では Clone + tag line になり区分は変わらない |
| **'Dark Mama' の区分** | **Hybrid**、`formula_status=known`（親は 2 出典で一致）、tag `disputed_parentage` を外す、`name_status=disputed` は残す（作出者の異説）。注記の文言は「作出者・命名の経緯に異説あり（本文を参照）」に変える | 判定の軸「名前を名乗る株が複数の遺伝的に異なる個体を含むか」。Vannini は交配全体を Dark Mama と呼んでいる（Banta の株・Vannini の実生・NSE の母株は別の個体）。親は争われていない |
| **'BVIT' の作出者** | 作出者は**「該当なし（流通ラベル）」**と明示する値を入れる。推測の名前は書かない。この値を収録判定の事実に数える → 収録になる | 出典（Collector's Guide）が「単一のクローンでも登録品種でもない、親の違う株に同じ名前が付く」と書いている。作出者がいないことが事実。日本語で「不明は不明と書く」ページは差別化になる（09-05 content） |
| **必須項目が空のとき（記録なし と sine loc.）** | **3 つの値に分ける**。`structured.absent` に項目ごとの理由を置く:「記録なし」（未調査・未確認。値なし）／「原記載に記載なし」（`sine_loc`。luxurians・metallicum）／「該当なし」（`not_applicable`。BVIT の作出者）。ラベルの必須項目が空なら、この 3 つのどれかを薄い文字で出す。収録判定は後の 2 つを「事実あり」と数える | 原記載を確かめて産地がなかったことと、まだ調べていないことは別の事実。T72 の残りを解く |

BOARD.md §3 の書き換え（`docs/board/data/` の SQL と同時に）:
- 09-05b 既定の「'Mystique A88'・'Galaxy' は現状維持（Hybrid）」→「Galaxy は Clone（IAS 登録）、Mystique A88 は Clone + line（09-04 オーナー規則）」。
- 「'Dark Mama' → disputed 両説」→「Hybrid。親は一致、作出者に異説（Banta / Havilcek）」。

## 3. 定義集（使い方ページ「区分と名前の書き方」の差し替え文）

区分は一覧では 6 つの語で示します（原種・未記載・Hybrid・Clone・個体・実生）。データの区分は 4 つで、未記載は原種の一部、個体は Clone の一部です。判定の軸はひとつ、**「その名前を名乗る株は、1 個体を株分け・挿し木・組織培養で増やしたものだけか」**です。

**原種**: 学名として正式に発表された種です。IPNI・POWO で記載者・発表年・出版物を確かめ、タイプ産地と分布を記録します。異名（シノニム）の場合は、受理名をラベルに出します。
- *Anthurium warocqueanum* T.Moore（1878）
- *Anthurium sagittatum* (Sims) G.Don — 組み替えでできた名前
- *Anthurium angamarcanum* Sodiro — WCVP では *A. dolichostachyum* の異名

**未記載**: 学名の発表がない、または同定できていない株です。sp.（種が未特定）、aff.（既知の種に近いが別とみる）、cf.（その種らしいが要確認）を付けます。仮の名前は " " で囲み、名前を推測して作りません。
- *Anthurium* sp. "Peru" — 流通名
- *Anthurium* aff. *besseae* — besseae に近い別のもの
- *Anthurium* sp. "antolakii" — 未発表名（ined.）。IPNI に登録なし

**Hybrid**: ひとつの交配式から生まれた**実生群**の名前です。名前を名乗る株が、遺伝的に違う複数の個体を含みます。交配式を書き、親が不明・複合なら、そう書きます。
- 'Dark Mama' — warocqueanum × papillilaminum の単純交配はすべてこの名前（Vannini）
- 'Red Crystallinum' — 親は不明。複数の系統の総称
- 'BVIT' — 親の違う株に付く流通ラベル（作出者は該当なし）

**Clone**: **1 株**（オリジナル個体）の名前です。分け株・組織培養株は同じ名前、実生（F 個体）は別の株です。F 個体が同名で流通していれば、印「系統（line）」を付けます。
- 'King of Spades' — オリジナルは Haji Ulih の 1 株。流通株は F 個体
- 'Galaxy' — F1 から選んだ 1 株。IAS 登録
- 'Ace of Spades' — 実生群から選んだ 1 株

**個体**: **原種**の 1 株に付けた番号や名前です。原種のページの「個体」欄に載り、一覧と件数には数えません。
- *A. papillilaminum* 'Fort Sherman' — Vannini が維持する野生由来の株
- *A. carlablackiae* 'HR1'
- 'Dark Star'

**実生**: 自分で播いた記録です。交配式・播種日・作出者で見分けます。名前を付けて配った時点で、Hybrid か Clone として別に登録します。
- *A. forgetii* × 'Titanium'
- *A. carlablackiae* 'HR1' × 'HR2'
- 自家受粉 *A. crystallinum* ⊗

**迷ったときの順番**
1. 学名が発表されているか → はい: 原種。
2. いいえで、野生由来の種レベルの株か → 未記載。
3. 原種の 1 株に付けた名前か → 個体。
4. 名前が 1 株を指すと言える出典（登録・作出者の説明）があるか → Clone。
5. 名前が交配全体・実生群を指すと書いた出典があるか → Hybrid。
6. どちらの出典もないときは、オーナーの規則「名前はオリジナル個体を指す」で Clone にする。
7. 名前のない自分の播種 → 実生。

**実生から選んだ株に名前が付いたら**: その 1 株とクローンだけが名乗るなら Clone（選抜元の実生を `selected_from` で結ぶ）。作出者が同名で実生を出し続けるなら Hybrid（'Michelle'・'Zara'）。

**「わからない」の書き分け（ラベル）**
- **記録なし**: まだ確かめていない。
- **原記載に記載なし**: 原記載を見たが書かれていない（sine loc.）。
- **該当なし**: その項目が存在しない（流通ラベルの作出者など）。

## 4. 区分・タグの変更（増やさない）

- **区分は 4 値のまま**。sp./aff./cf.・var.・forma・斑入り・地域個体・流通名は区分にせず、次の「属性」で表す。区分を増やすと一覧・収録判定・投稿フォームがすべて分かれ、決めることが増えるだけで、読む人の判断材料は増えないため。
  - 限定語 → `species_qualifier`（sp / aff / cf / var / f.）
  - 名前の状態 → `name_status`（trade / informal / disputed）
  - 印 → `tags`（variegata / line / locality_form / individual / tc_origin）
- **新しい値は 2 つ**:
  - `structured.absent`（項目 → `sine_loc` | `not_applicable`）
  - tag `parentage_unconfirmed`（出典のない親・選抜元）。収録判定では係争中と同じく事実に数えず、系統図では点線と「とされる」で描く。#5 で 'Queen of Hearts' の選抜元を消した後、出典のない親が再び入ったときの受け皿にする。
- **移行**: どちらも JSON とタグの追加だけで、スキーマ変更はない。既存行は #5・#6 の 3 行だけ。

## 5. グループ分けと並び（画面ごと）

- **属一覧**: 今の順（原種 → 未記載 → Hybrid → Clone、個体は原種の下に畳む、実生は別タブ、記録不足は末尾に畳む）を維持する。見た目のグループ（ベルベット系など）は主観なので作らない。
- **産地ページ**: 「タイプ産地がこの国」と「分布にこの国を含む」の 2 つに分けて載せる。分布が多くの国にまたがる種は、各国のページに出る。流通情報だけの産地（`origin_region` に「流通」を含むもの・aff./sp. の流通産地）は、下に「流通上の産地」として小さく分けるか、載せない。題名は「コロンビアの原種 — タイプ産地 5 · 分布 12」。
- **系統図**: 親が登録されていない枠（未登録）は、収録候補の一覧として管理画面に集める（§8-A）。
- **節（section）による分類**は将来案。出典（Croat の節分類）を 1 件ずつ付けられるものだけを `tags: section:cardiolonchium` のように入れ、コレクターの言う「ベルベット系」に学術的な裏づけを付ける。今回は入れない。

## 6. 表記ルール（追加・確定分だけ）

| 対象 | 規則 | 例 |
|---|---|---|
| 学名 | 属名・種小名はイタリック。sp./aff./cf./var./×・引用符で囲んだ名前・人名は立体 | *Anthurium* aff. *besseae* |
| 品種・個体・流通名 | 半角 ' '。曲がった引用符は使わない。綴りは命名者のまま（'Angels dream'） | 'Mystique A88' |
| 種レベルの非公式名 | 半角 " " | *Anthurium* sp. "Peru" |
| 種小名を付ける条件 | 単一の原種に由来すると**出典で言える**ときだけ。疑わしければ属名 + 品種名 | 'Galaxy'（親が交配株の可能性）、*A. papillilaminum* 'Fort Sherman'（野生株） |
| × | U+00D7、前後に空白。同じ属は「A.」に略す | *A. warocqueanum* × *A. papillilaminum* |
| 人名 | IPNI の標準略記はそのまま（K.Koch・N.E.Br.）。敬称（氏・さん・Mr）は付けない。ハンドル名は本人の表記どおり | Haji Ulih |
| 推測 | 「とされる」「可能性」とともに具体的な品種名・種名を挙げない。出典がある説だけを「〜は…としている」と出典つきで書く | — |
| 日付 | YYYY.MM.DD（本文も） | 2025.11.10 播種 |
| 和名・カタカナ | `aliases` だけ（検索・JSON-LD・description）。ラベルと見出しには出さない | — |

## 7. 既存データの修正（優先順・最大 10 件）

共通の手順:
- 適用前に対象行を `docs/board/data/2026-10-07b-backup.json` に退避し、1 トランザクションで流す。
- ガードは `updated_at` と**旧値の一致**の両方を使う（#16 のとおり `updated_at` は信用できないため）。
- 今回から `updated_at = now()` を必ず書く。`created_at` は触らない。

**#1 [A] 産地ページの国と題名**（コード）
- `scripts/lib/geo.js:23-31` の `countryOf` を `archive.js:64-78` と同じ処理（最も早く出る国）にする。
- `scripts/` に `check-geo-parity.js` を足す。全行で geo.js と archive.js の結果が同じになることを CI で確かめる。
- `generate-static-pages.js:389` と `archive.js:1017` の「をタイプ産地とする原種」を「{和名の国}の原種 n 種（タイプ産地 a · 分布 b）」にする。
- 産地の一覧は §5 のとおり 2 群にし、流通情報だけの産地を除く。
- 完了条件:
  - /locality/peru/ のタイプ産地群が 0 件で、分布群に regale・moronense・villenaorum・vittariifolium が出る。
  - hookeri が静的ページと SPA の両方で同じ国になる。
  - sp. "Peru" と aff. besseae が原種の群に出ない。

**#2 [A] 110 'Galaxy' → Clone**（SQL。IAS のページを 1 度ブラウザで目視してから）

    update cultivars set type = 'clone', updated_at = now(),
      origins = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(origins,
        '{0,structured,origin_type}', '"clone"'),
        '{0,sources}', (origins #> '{0,sources}') || $j$[{"url":"https://www.aroidcultivars.org/aroid-cultivars/anthurium/galaxy","label":"IAS Aroid Cultivar Registry — Anthurium 'Galaxy'"}]$j$::jsonb),
        '{0,source_tier}', '"B"'), '{0,trust}', '65'),
        '{0,body}', to_jsonb($t$Space Hijau（Hendry Kharismawan、インドネシア・マラン）が 'X-One' × 'Dark Phoenix' の F1 から選んだ 1 株の名前。国際アロイド協会（IAS）の栽培品種登録に載っており、登録では両親ともインドネシア系の papillilaminum とされている。$t$))
    where id = 110 and type = 'hybrid' and origins #>> '{0,structured,origin_type}' = 'hybrid';
    -- body_en も同じ内容の英文に（"is a hybrid cultivar" を削除）。structured.citation_links にも同じ 1 件を追加

- 人物表の「Space Hijau」の note を「Hendry Kharismawan のナーセリー（インドネシア・マラン）。IAS の登録による」にする。
- 収録判定は Clone として合格（作出者・親・出典）。

**#3 [A] 5 'Dark Mama' → Hybrid**（SQL + 翻訳 1 行）

    update cultivars set type = 'hybrid', formula_status = 'known', tags = null, updated_at = now(),
      origins = jsonb_set(jsonb_set(jsonb_set(origins,
        '{0,structured,origin_type}', '"hybrid"'),
        '{0,sources}', (origins #> '{0,sources}') || $j$[{"url":"https://www.nsetropicals.com/product/anthurium-dark-mama/","label":"NSE Tropicals — Anthurium 'Dark Mama'"}]$j$::jsonb),
        '{0,body}', to_jsonb((origins #>> '{0,body}') || $t$ NSE Tropicals の販売ページは、最初の作出を Karel Havilcek（同ページの表記）とし、親は同じ A. warocqueanum × A. papillilaminum としている。$t$))
    where id = 5 and type = 'clone' and formula_status = 'disputed';
    -- name_status 'disputed' は残す。body_en に同じ 1 文を追加

- `translations.json` の `name_status_disputed`:
  - jp「親・作出者に異説あり」→「作出者・命名の経緯に異説あり（本文を参照）」
  - en → "Breeder or naming history disputed (see text)"

**#4 [A] 出典のない推測を消す**（SQL。#5 と同時に本番へ。そうしないと収録が 39 になる）
- 8 'Queen of Hearts':
  - 旧 `selected_from_id=7`、`tags=['tc_origin']`、本文「…可能性が高い（出典未確認）」
  - 新 `selected_from_id=null`、`tags=null`、`origins='[]'`（記録なし。旧値は退避）
  - ガードは `where id=8 and selected_from_id=7`
- 52 'Red Crystallinum': 本文から「（'Wonderboy' の関与が指摘されるが確証はない）」を `replace()` で削除。
- 53 'Angels dream':
  - sources に `https://anthurium-japan.com/angles-dream/`（C）を追加。
  - aliases を `null` から `['Angel''s Dream','エンジェルスドリーム','エンジェルズドリーム']` に。
  - 本文の事実は出典と一致しているので変えない。

**#5 [B] 「記録なし／原記載に記載なし／該当なし」**（SQL 3 行 + コード）
- SQL:
  - 57 luxurians・130 metallicum: `origins = jsonb_set(origins,'{0,structured,absent}','{"type_locality":"sine_loc"}')`
  - 131 'BVIT': `'{0,structured,absent}' = '{"breeder":"not_applicable"}'`
- `wireframe/js/record-gate.js:105`: Hybrid の人の条件に `|| (s.absent && s.absent.breeder === 'not_applicable')` を足す。CI の生成側も同じファイルを使う。
- `archive.js` の `renderSpecimen`（593〜624）: 原種の記載者・発表年・タイプ産地・分布、Hybrid と Clone の作出者・交配式が空なら、`absent` に応じて文言を出す。
  - `absent_none`「記録なし」（灰色・記録を追加へリンク）
  - `absent_sine_loc`「原記載に記載なし（sine loc.）」
  - `absent_na`「該当なし（流通ラベル）」
- 収録数の見込み: 'BVIT' +1、'Queen of Hearts' −1 → **40 を維持**。

**#6 [B] 109 'Mystique A88' → Clone + line**（SQL）

    update cultivars set type = 'clone', tags = array['line'], updated_at = now(),
      origins = jsonb_set(jsonb_set(origins, '{0,structured,origin_type}', '"clone"'),
        '{0,body}', to_jsonb($t$Chandra が 'Dorayaki'（オリジナル個体）× 'Red Crystallinum'（NSE 系統）の交配から選び、'Mystique A88' と名付けたオリジナル個体の名前。流通している株の多くは同じ交配式の F1（兄弟株）で、このクローンそのものではない。$t$))
    where id = 109 and type = 'hybrid';

- 収録判定は Clone として合格（作出者・親）。
- 区分の内訳は Clone 5 → 6、Hybrid 3 → 3（Dark Mama・Red Crystallinum・BVIT）。

**#7 [B] 人物の名寄せ**（JSON + コード）
- `wireframe/data/people-authority.json` に追加する:
  - `"Jay Vannini": {"alias_of":"Vannini"}`
  - `"Sodiro": {"name":"Luis Sodiro","years":"1836–1909","ipni":"Sodiro"}`
  - `"Koch": {"name":"Karl Heinrich Emil Koch","years":"1809–1879","ipni":"K.Koch"}`
  - `"Haage": {"name":"A. Haage","ipni":"A.Haage"}`（IPNI に本名の記載がないので略記のまま）
  - `"John Banta": {"name":"John Banta"}`
- `archive.js` の `peopleRolesOf`（180）に `push(d.introducedBy, 'introducer')` を足し、翻訳「導入者」を入れる（`scripts/lib/people.js` も同じに）。
- 完了条件: 'Fort Sherman' の導入者リンクが /people/vannini/ に向き、Vannini のページに kunayalense と 'Fort Sherman' が並ぶ。

**#8 [B] 文面の修正**（SQL・HTML）
- 2 'King of Spades': 本文の「氏が」→「が」。
- 32 papillilaminum:
  - 和文 →「Anthurium papillilaminum は 1986 年、Croat が Monogr. Syst. Bot. Missouri Bot. Gard. 14: 152 で記載した。タイプ産地・分布ともパナマ。採集者は R. L. Dressler。」
  - `body_en` から「1986 Revis. Gen Anthurium. Part 2. Panama. 」を削除し、「Type locality and distribution: Panama.」に。
- 89 実生: 本文「2025-11-10 播種」→「2025.11.10 播種」。
- 108・121: `structured.notes` → null（本文と同じ文のため）。
- `wireframe/index.html:232` と `translations.json` の `species_badge`: 「原種 / Original Species」→「原種」。
- 使い方ガイドの差し替え:
  - 1061〜1069 → §3 の定義集
  - 1074 → 「見出しの『出典 S · 95% · 日付』」
  - 1078 → 「検証済 — 管理者が IPNI などの出典と照合した記録に付く印。日付は照合した日」
- `updated_at` の補正: T68・T70 で本文を変えた 9 行（4・11・35・129・59・127・138・108・121）を `updated_at='2026-10-07'` に（「更新」の日付を正しくする）。

**#9 [C] 名前の照合関数を 1 つに**（コード）
- `archive.js:580` の `findByEpithet` を `normParent(name) === normParent(all[i].epithet)` の比較に変え、`normParent` と同じ規則（属名・「A.」・引用符・余分な空白を外し、ほかは完全一致）にする。
- `lineage_add_parent` で事前に入る名前も `normParent` で既存名と照らし、一致すれば「追加」ではなくリンクを出す。
- 完了条件: 親を「A. warocqueanum」と書いた試験データで、ラベル・系統図・子の判定がすべて warocqueanum に結ばれる。

**#10 [C] D12 Platycerium の削除**（SQL）
- `select * from cultivars where genus='Platycerium'`（18 行、id 90〜107）と `genera` の id=4 を `docs/data/platycerium-2026-10-07.json` に退避する。
- `research_requests`・`cultivar_images` に参照がないことを確かめる（`cultivar_images` は 0 件を確認済み）。
- `delete from cultivars where genus='Platycerium' and id between 90 and 107; delete from genera where id=4;`
- BOARD の T36 を閉じる。

本番の順番: #1・#9（コード）→ #2〜#6・#8（SQL を 1 本、`docs/board/data/2026-10-07b-fixes.sql`）と #5・#7 のコード → キャッシュバスター 12 箇所と `sw.js` → T59。適用前後で record-gate を全件にかけ、**収録 40・検証済 27/27** が変わらないことを確かめる。

## 8. 新しい改善アイデア

**A. 収録を増やす候補**（12 月の目標 60 件まで 20 件）
1. **系統図の空き枠を埋める**: すでにある記録が名前を挙げているのに、登録がない名前。
   - 'Dorayaki'（109 の母。3 説の異説として）
   - 'X-One' と 'Dark Phoenix'（110 の両親。IAS 登録の記述がある）
   - 'Titanium'（55）
   - 'Ralph Lynam'（papillilaminum の個体）と 'Curandero'（140 の本文、Vannini の B 出典）
   - 系統図が 1 段深くなり、どれも出典を探す手間が少ない。
2. **IPNI で確認済みの記載種**（流通がある・受理名）:
   - *A. dolichostachyum* Sodiro 1902（angamarcanum の受理名。今は異名のページだけがある）
   - *A. superbum* Madison 1978
   - *A. polyschistum* R.E.Schult. & Idrobo 1959
   - *A. pendulifolium* N.E.Br. 1904
   - *A. cutucuense* Madison 1978
   - *A. rugulosum* Sodiro 1902
   - *A. reflexinervium* Croat 1991
   - *A. plowmanii* Croat 1987
   - *A. scherzerianum* Schott 1857
   - *A. andraeanum* Linden ex André 1877（切り花のアンスリウムの元の種。検索の入口になる）
   - *A. hoffmannii* Schott 1858（'Ace of Spades' の元のラベル名。系統図では結ばず、本文で触れるだけ）
   - 管理者による一括登録（T24 と同じ手順）で +11。
3. **学名をもつ古い交配種**: *A.* × *ferrierense*（GBIF では ACCEPTED。IPNI の照合が要る）。区分は Hybrid で、名前は × の学名。定義集の例として役に立つ。

**B. データ品質の自動チェック**（`scripts/check-names.js`。CI で毎回、結果を管理画面と BOARD に 1 行）
1. 国の決め方の一致（#1 の再発防止）。
2. 名前の整合:
   - `parent_*_text` が既存の名前と完全一致なのに `*_id` が空、id と名前の食い違い
   - 別名が他の品種の名前と同じ
   - 名前の中の曲がった引用符・小文字の x・二重の空白・小文字で始まる品種名
3. 文のチェック:
   - 推量の語（とされる・可能性・考えられ）と ' ' の品種名が同じ文にある
   - 敬称（氏・さん・様・Mr）
   - ISO 形式の日付
   - 本文の年・国・採集者が構造化欄と一致するか（papillilaminum の英文のような食い違いを拾う）
4. **学名の再照合（月 1 回）**: IPNI・GBIF を引き直し、記載者・年・受理状態の差を知らせる（異名になった、など）。
5. **記載待ちの監視**: antolakii・villenaorum・queremalense が IPNI に現れたら知らせる。「正式に記載された」は由来図鑑にとって一番のニュースで、新着の理由にもなる。
6. 収録の差分: 合格した名前の一覧を前回と比べ、落ちた名前・増えた名前を出す（今回の #4 と #5 のように同時に出すべき変更の取りこぼしを防ぐ）。

**C. 記録の信頼性を見せる工夫**
1. **項目ごとの出典の印**: ラベルの各行の右端に小さく「S」「B」「投稿」。たとえば 'Dark Mama' の交配式は B（Vannini と NSE で一致）、作出者は B と C で異説、と行ごとに読める。
2. **訂正の履歴**: ページ末尾に 1 行ずつ載せる（例「2026.10.07 区分 Clone → Hybrid（出典: Vannini の記事）」）。訂正を隠さない図鑑は信頼される。新着の「変更」列にも使える。新しい表 `cultivar_changes`（日付・項目・旧→新・理由）を作る。
3. **「わからない」を 3 つに書き分ける**（#5）。空欄より正直で、記録を追加してもらう入口にもなる。
4. **異説の両論併記**（P5 `alt_claims`）を 'Dark Mama'（Banta / Havilcek）から始める。今は本文の 1 文で代用している。
5. **写真を品種 ID で結ぶ**: `cultivar_images` に `cultivar_id` を足す。名前を変えても写真が外れないようにし、写真の個体区分（original / F1）の記録（T27b）の土台にする。

## 9. オーナーへの確認（3 点。無回答なら既定で進める）

| # | 質問 | 既定 |
|---|---|---|
| Q1 | 'Queen of Hearts' の「'Ace of Spades' の組織培養からの変異」は、出典（作出者・ナーセリーの説明）を知っていますか | 知らなければ、記録を外して「記録なし」にする（#4）。出典が見つかれば、tag `parentage_unconfirmed` か出典つきで戻す |
| Q2 | 'Mystique A88' の兄弟株を、Chandra 本人が同じ名前で売っていますか | 売っていなければ Clone + line（#6）。本人が売っているなら Hybrid（'Michelle'・'Zara' と同じ扱い） |
| Q3 | 'Dark Mama' を Hybrid（交配全体の名前）にすることに異論はありますか | Hybrid（#3）。出典は Vannini |

継続（変更なし）: 55 forgetii × 'Titanium' の播種日、'Red Crystallinum' の Tim Anderson の役割（10-03 Q2、既定は作出者のまま）。**7-00 O-1（'Galaxy'）は閉じる。**

## 出典

- IAS Aroid Cultivar Registry — Anthurium 'Galaxy'（検索エンジンの抜粋で確認。ページは JS で描かれ、機械取得は 404）: https://www.aroidcultivars.org/aroid-cultivars/anthurium/galaxy
- NSE Tropicals — Anthurium 'Dark Mama': https://www.nsetropicals.com/product/anthurium-dark-mama/
- Exotica Esoterica（Jay Vannini）: https://www.exoticaesoterica.com/magazine/the-ultimate-guide-to-velvet-leaf-anthuriums
- アンスリウムジャパン — エンジェルスドリーム: https://anthurium-japan.com/angles-dream/
- 'Queen of Hearts' の「仮説」の記述（小売店。出典には採らない）: https://www.ormbunker.se/en/products/anthurium-queen-of-hearts
- 'Dark Mama'（NSE）のクローン株の販売例（参考）: https://www.carnivero.com/products/w081-anthurium-dark-mama-clone
- IPNI API（radicans 85262-1、carlablackiae 77212524-1、候補種）、GBIF species API（queremalense 7968142 ほか）
```

---

関係するファイル:
- `C:\Users\nojyu\OneDrive\デスクトップ\Plants story\scripts\lib\geo.js`（23〜31 行。国の決め方が古いまま）
- `C:\Users\nojyu\OneDrive\デスクトップ\Plants story\scripts\generate-static-pages.js`（389 行。産地ページの題名）
- `C:\Users\nojyu\OneDrive\デスクトップ\Plants story\wireframe\js\archive.js`（580 行 findByEpithet、631 行 導入者リンク、180 行 peopleRolesOf、1017 行 産地の説明文、593〜654 行 renderSpecimen）
- `C:\Users\nojyu\OneDrive\デスクトップ\Plants story\wireframe\js\record-gate.js`（105 行。Hybrid の作出者の条件）
- `C:\Users\nojyu\OneDrive\デスクトップ\Plants story\wireframe\data\people-authority.json`
- `C:\Users\nojyu\OneDrive\デスクトップ\Plants story\wireframe\index.html`（232 行、1061〜1078 行）
- `C:\Users\nojyu\OneDrive\デスクトップ\Plants story\wireframe\i18n\translations.json`（`species_badge`、`name_status_disputed`）
- 取得した本番データ: `C:\Users\nojyu\AppData\Local\Temp\claude\C--Users-nojyu-OneDrive--------Plants-story\f7a443bb-89fc-4871-8dd8-77fd0d8106cb\scratchpad\cv.json`（cultivars 82 行）、`anth_dump.txt`（Anthurium の由来の抜き出し）