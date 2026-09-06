# BOARD.md — Aroid Origins 常設ボード 決定台帳

最終更新: 2026-09-07（第4回会議）。これが「現行の決定事項」の唯一の台帳。会議録は `docs/board/YYYY-MM-DD.md`（第3回は `2026-09-05b.md`、第4回は `2026-09-07.md`）、各担当の詳細は `docs/board/2026-09-05-{monetization,taxonomy,content,design}.md`、`2026-09-05b-*.md`、`2026-09-07-*.md`。
運営: オーナー（個人のアロイド栽培家、開発しない）／ 開発: Claude Code。判断基準は `.claude/agents/product-owner.md`（①売上直結 ②由来の正確性＝信頼 ③1セッションで終わる ④可逆）。
**オーナー委任（09-05）**: 「何を削り、何を増やすか、料金や何を有料にするか」はボードが決める。オーナーに聞くのは本人にしかできない作業だけ。**オーナー指示（上書き）**: 由来調査の有料化はしない／住所・電話は非公開／AI 生成の植物図版は不採用／品質を決済より先に／Stripe 申請中（09-05 提出）、不承認なら PAY.JP。

---

## 0. サイトの定義文（09-05 確定。masthead・About・og:description・meta description に共通使用）

- JP: **「誰が、いつ、どこで名付けたか — アロイドの由来を出典つきで記録する図鑑。」**
- EN: **"Who named it, when, and where — a sourced archive of aroid origins."**

---

## 1. 目標と KPI

- 短期目標: **月1万円**（会員 + 取扱店掲載 + アフィリ）を **2026年12月末** までに。中期: 日本語圏でアロイド由来情報の第一参照先。
- 月1万円の数式（12月、アクティブ ≤100人前提、**由来調査の販売は含めない**）: 会員 500円×12人（月10 + 年2の月割）≈ 5,800 ／ 取扱店掲載 1,000円×3店 = 3,000 ／ アフィリ ≈ 500 → **約9,300〜10,000円**。不足分は年額会員の前払い（5,000円/人）で現金ベースでは埋まる。11月末レビューで会員5人未満なら 12月目標を 1月末へ後ろ倒し（価格は動かさない）。**会員12人には累計来訪 ≈2,500人が前提**（本告知 1,000 + 検索流入 500/月 × 3。転換: 来訪→ログイン 4〜6%、ログイン→会員 8%、年額比率 30%）。
- 原価: AI 調査 ≤1,500円/月、Stripe 手数料 ≈ 350円/月。
- 現状（2026-09-05）: 売上 ¥0、登録 6人（3月以降新規ゼロ）、有料 0人、公開 Anthurium 31件（原種21・Hybrid 3・Clone 5・実生2）、非公開 Monstera 11・Philodendron 9・Platycerium 18、写真 40枚/28品種、Stripe 審査中。**サイトは植物界隈に未告知**（第2回の削除根拠「利用0件」は無効 — 09-05b）。

| KPI | 9月末 | 12月末 | 見る場所 |
|---|---|---|---|
| 決済稼働（Stripe または PAY.JP） | 稼働 | — | 料金ページが「準備中」でない |
| 会員 | 1人 | 12人 | `subscriptions` |
| 登録ユーザー | 15人 | 50人 | `profiles` |
| 公開 Anthurium（収録済み） | 45件 | 60件 | `cultivars` + `recordGate` |
| AI 再調査リクエスト処理 | 7日以内100% | 同 | `research_requests` |
| 月間PV | 3,000（**10月末**に読み替え。9月は告知前で計測のみ） | 8,000 | GA4 |
| affiliate_click | 30/月 | 100/月 | GA4（`page` 付き） |
| 人物・別名ページの index 登録 | 15本 | 30本 | Search Console |
| AI 調査コスト | ≤1,500円/月 | ≤1,500円/月 | Admin の OpenAI usage |
| 売上 | 500円 | 10,000円/月 | Stripe + 楽天 |
| **本告知**（§4b） | 目標 10/3（土）20:00、上限 10/24 | — | 必須ゲート M1〜M10 |
| 本告知 7日 → 30日 | PV 1,000・登録 10・他者投稿 5・share_click 30・会員 2 | PV 3,000・登録 15・会員 5・被リンク 5ドメイン | GA4 / `profiles` / Search Console |
| 来訪→ログイン率 | 4% | 6%（棚あり） | GA4 `sign_up` ÷ ユーザー |

---

## 2. 課金・料金の決定

| 項目 | 決定 | 状態 |
|---|---|---|
| 閲覧 | **永久無料**。由来本文・写真・系統図・人物・産地・用語集・別名ページともペイウォールなし | 決定 09-04 |
| 無料のまま恒久 | 品種登録 + **登録時の AI 由来調査 1回**、実生投稿 5件、**AI 再調査リクエスト**（承認制・無料）、由来の追記・修正提案、人物ページ自動生成、投票 | 決定 09-05 |
| **会員（Member）** | **月500円 / 年5,000円**（年額は「2ヶ月分無料」の mono ラベル、年額を既定選択）。特典は実在する4つだけ: ①実生投稿 無制限 ②標本ラベル印刷（全収録品種） ③会員バッジ + About の会員一覧（任意） ④AI 再調査リクエストの**優先審査（48時間以内に可否）**。名称は「会員」（英語 Member）。「支援者」「プレミアム」「Pro」「限定」「今だけ」「応援」は使わない | 決定 09-05。切替は Stripe 判定翌日 |
| 240円 / 2,500円 実生プラン | **廃止**。有料0人のため移行対象なし。Stripe 審査中はサイトの料金・特商法・規約（現在 240/2,500 表記）を**変更しない**（審査担当が見ているページとの相違を避ける）。判定翌日（不承認なら PAY.JP 申請前）に translations・料金ページ・特商法「販売価格」・規約9条の2・モーダル・OGP 説明・静的スタブを一括で 500/5,000 に改訂。Stripe 側は 240/2,500 の Price を作らず、承認後に 500/5,000 の Price を2本作る | 決定 09-05 |
| 由来調査の有料販売 | **やらない（オーナー決定）**。代替: 登録時 AI 調査（無料1回）→ 以後は「AI 再調査リクエスト」（無料、管理者が承認/却下、承認で実行）。管理者の出典確認は「検証済」印（§3）として無償で行う | 決定 09-05 |
| 取扱店掲載（PR） | 1,000円/月/店、**初月無料**、PR 明記、品種ページ「取扱店」欄（店名・リンク・一言）。自己申込 Checkout → オーナー承認。10月に3店へ営業。**12月末に有料0店なら廃止** | 10月 |
| アフィリエイト | 楽天・Yahoo!(VC) のみ。**Amazon は削除維持、条件付き**（09-05b: 12月レビュー、出典書籍限定、楽天+Yahoo! `affiliate_click` 2ヶ月連続 ≥60/月で申請。いまは出典書籍の書誌欄（リンク無し、T38）のみ）。掲載は **産地ページ + 自生地環境（標高・雲霧林・着生）を持つ原種ページのみ**。トップ・属ページ・Hybrid/Clone/実生ページには置かない。見出し直下に「PR」常時。期待 +500円/月 | 決定 09-05 |
| AI 調査コスト | §2-1 参照 | 決定 09-05 |
| AdSense | やらない。プレースホルダ DOM・i18n キー・プライバシーポリシーの「導入予定」を削除 | 決定 09-05 |
| やらない | 無料トライアル、値上げのみで1万円、自社EC、PDF/API、980円サブスク、人物ページの有料掲載、会員への検証権限付与 | 決定 09-05 |
| 価格据え置き | **2027-02 まで改訂しない** | 決定 09-05 |

### 2-1. AI 調査コスト方針（09-05 改訂）

- 登録時: 1品種につき **無料で1回**自動実行（Web 検索 ≤8回/回、GBIF 照合）。
- 以後: 本人も第三者も自分では再実行できない。詳細ページの「**AI 再調査をリクエスト**」ボタン（無料・ログイン必須・理由 ≤500字）→ `research_requests` → 管理画面で承認/却下 → 承認時に実行（検索 ≤12回/回）。1品種につき open 1件、1人あたり open 3件まで（実装済 migration `20260905100000`）。会員は48時間以内、一般は7日以内に可否。
- 上限: サイト全体 **15回/日**（`RESEARCH_DAILY_CAP=15`、到達でメール通知。管理者の実行も数えるが admin は停止対象外）／ 一般ユーザーの登録起点 **3回/日・10回/月**／ 会員 5回/日。管理者は無制限。
- 表示: AI 単独・検証済でない記録には「**AI 下書き・未検証**」ラベル + 再調査リクエスト導線。想定コスト: 登録30件 + 承認再調査30件 = 60回 × 20円 ≈ **1,200円/月**。

### 2-2. 決済事業者と法務

- **Stripe を先に**（09-05 提出、決済一時停止中）。2〜3日でステータスが変わらなければサポート問い合わせ（`docs/stripe-application.md` §5）。承認 → 会員 Price 2本作成 → 鍵受け渡し → 1プラン化デプロイ。不承認 → `_PAYMENT_PROVIDER=payjp`、PAY.JP 申請（プランは会員2本のみ）。判定後、敗者側の関数・分岐は削除。**09-05b**: Stripe が **10/3 までに判定なしなら T30（500/5,000 改訂）を先行実施し PAY.JP を申請**（両事業者に同じ料金ページを見せる）。本告知の必須条件に決済稼働を含めるが、**上限 10/24 に決済のみ未達なら決済なしで告知**（料金ページ・ペイウォールに「会員受付は準備中です。ログインしておくと開始時にサイト上でお知らせします」）。
- 特商法: 所在地・電話は「請求があれば遅滞なく開示」（オーナー決定）。販売価格・引渡時期・返品条件は判定翌日に会員プランへ更新。取扱店掲載開始時に「掲載料 1,000円/月・初月無料」を追記。
- 申込最終確認画面（12条の6）は現行形式を踏襲。ステマ規制: 取扱店欄・アフィリ欄に「PR」常時。
- ペイウォール文言（実生6件目）: 見出し「実生ノートを続ける」／「実生の記録は5件まで無料です。6件目からは会員（月500円 / 年5,000円）でご利用いただけます。閲覧はどなたでも無料です。」／特典4つ／「会費は出典調査と収録の拡充に使います。決済は Stripe、カード情報は当サイトに保存されません。」
- 料金ページ冒頭: 「Aroid Origins は閲覧無料の由来資料館です。有料なのは、ご自身の記録を増やすことと、その記録を紙のラベルにすることだけです。」

---

## 3. 分類・命名の決定

**区分は 4 値**（原種 / Hybrid / Clone / Seedling）。唯一の判定軸: **「その名前を名乗る株は、1個体の栄養繁殖由来だけか（→ Clone）、複数の遺伝的に異なる個体を含むか（→ Hybrid）」**。名前はオリジナル個体を指す（'King of Spades' は Clone、実生流通は tag `line`）。ただし作出者自身が世代を重ねて同名で実生を出している系統名（DocBlock の 'Michelle' 'Zara'）は Hybrid。

| 区分 | 定義の要点 | 名前の書き方 |
|---|---|---|
| 原種 Species | 自然界の種。sp. / aff. / cf. / ssp. / var. を含む | *Anthurium crystallinum* ／ *Anthurium* sp. "Peru" |
| Hybrid | 特定の交配式から得た**実生群**の名前。交配式必須（不明・複合は `formula_status`） | *Anthurium* 'Mystique A88' |
| Clone | **1個体**の名前。単一原種由来なら種小名必須 | *Monstera deliciosa* 'Thai Constellation' |
| 個体 Individual（09-07） | 原種の**1株**に付けた番号・名前（'HR1'・'Dark Star'）。Clone の一種で `tags:['individual']` + `selected_from_id`。原種ページの「個体」欄と「+ 個体を追加」から登録（種固定・個体名・命名者・命名年・説明のみ）。一覧・件数・索引からは除外、AI 調査なし。同名で複数の実生が流通するなら個体ではなく原種 + tag `line` | *Anthurium carlablackiae* 'HR1' |
| Seedling | 自分の播種記録。交配式 + 播種日で識別 | *Anthurium forgetii* × 'Titanium' |

表記（ICNCP）: 属・種小名イタリック、修飾子ローマン、栽培品種名は '半角シングルクォート・語頭大文字'、個体番号・個体名は '半角シングルクォート'（09-07 オーナー決定: 管理番号も品種名と同じ扱い）、非公式名・産地は "ダブルクォート"、× は U+00D7、異名は `aliases`、和名は `japanese_name`（Phase B）、英語 UI は Species / Hybrid / Clone / Seedling、由来文にサイズ・生育速度を書かない、不明は NULL、推測名を作らない。**09-07**: 組み替え名は「G.Don が *Pothos sagittatus* Sims を *Anthurium* に組み替えた」と書く（`structured.basionym`）／原綴が異なる場合は `aliases` + 本文末注記（debile→debilis、crystallinum→cristallinum）／カタカナ別名（ミッシェル、クリスタリナム、ワロクアナム…）は `aliases` に入れ、検索・JSON-LD `alternateName`・description 末尾「別名: …」に出す。

未記載種・非公式名: IPNI/POWO/GBIF に無い名前は「未記載 / 暫定名 / 未解決」で登録し記載者・年・タイプ産地は空欄。情報源 A 学術誌 → B IAS・Vannini 等 → C 導入ナーセリー・ブリーダー本人。**Tier は引用 URL のドメインで機械判定**（`tierFromUrls`）。マーケットプレイス・匿名ブログは不採用。'Black Velvet' は新規登録せず antolakii の `aliases`（BVEP）+ 別名ページで「2つの別の植物」と説明。villenaorum は GBIF 無し → `sp. "villenaorum"` 暫定名。

**品質ゲート（09-05 決定）**: 記録は「収録済み」か「未収録」の2状態。判定は `recordGate(entry)` 1関数（`scripts/lib/record-gate.js` に切り出し、`archive.js`・sitemap・admin が共用）。条件は区分別の事実項目のみ（原種: 記載者+年、産地または分布、出典1件／sp.: locality + 近縁種・導入者・補足40字・種状態のいずれか／Hybrid: 親A・B または formula_status 明示、作出者・命名者・命名年のいずれか、出典・補足80字・投稿者＝作出者のいずれか／Clone: 命名者・年・親/selected_from・補足80字・出典のうち2つ／Seedling: 親+播種日+作出者）。投稿はブロックせず警告のみ。未収録は台帳に「未収録」mono ラベル、詳細は「記録未収録 — 記録を追加する」+ `noindex`、sitemap 除外、属カードは収録済みのみ数える。**AI 単独・信頼度40未満・未検証の記録は既定で `<details>` 折り畳み**（「AI 下書き（未検証・信頼度 n%）」）。人の記録か検証済が1件あれば展開。**09-07 追記（G1〜G9、`docs/board/data/2026-09-07-record-gate.proposed.js` を採用）**: 個体判定は tag `individual` のみ（`selected_from_id` は Clone の事実 1 つ）／AI 下書きだけの行は「記録なし」／原種の出典は命名典拠ドメイン（ipni.org・powo.science.kew.org・gbif.org・tropicos.org・biodiversitylibrary.org）のみ／出版物（first_description）必須／Hybrid・Clone の本文 80 字は人の記録のみ／係争中の親（tag `disputed_parentage` または `formula_status='disputed'`）は事実に数えない／サイズ文（`[0-9]+ ?(cm|mm|m)`）は body・notes を機械検査して不合格／NULLISH に「未確認」「未詳」「—」「-」。i18n `gate_missing_publication` `gate_missing_size`。

**検証ワークフロー（09-05 決定）**: 「検証済」を付けられるのは**管理者のみ**（`is_admin()`、将来 `reviewer` ロール）。列 `verified_at / verified_by / verification_note`、RPC `set_cultivar_verification`。検証済の記録は投票で信頼度が動かない（反対が賛成を3票以上上回り総数5以上で `[要再確認]` キュー）。未記載名の検証は「名前の状態が出典と一致」の意味で同定の確定ではない。A/B tier 出典が無い未記載名は検証済にしない。標本ラベル最終行に検証状況を必ず1行。会員は検証権限を持たない。

**告知前の正確性ルール（09-05b 決定）**: ①台帳の状態列は3値 — 記録なし（非 formula の origin 0件）／ 調査中（`ai_status` pending・researching かつ `updated_at` から 72時間以内。超過は記録なしに落とし admin「調査失敗」へ）／ 未収録（記録はあるが `recordGate` 不合格）、合格は信頼度 n% または検証済。②**採集者は IPNI 型データ（collectorTeam）に一致させる（09-07 改訂、IPNI API で 18/18 照合済み）**: IPNI にあるのに空欄・IPNI に無いのに記入のどちらも不可。採集年は原記載で確認できた場合のみ。無ければ NULL（「不明」文字列も NULL）。タイプ産地も IPNI/原記載に無ければ NULL（crystallinum・veitchii の「Chocó」は notes へ）。分布 `known_habitats` は POWO native のみ（GBIF occurrence 不使用）。POWO 引用は LSID URL。③出典 URL 0件の AI 記録は Tier D・trust ≤30 に丸め折り畳み。出典なしの手動記録は % を出さず「投稿者の記録 · 出典なし」。`verification` ブロックは manual 記録で描画しない。④原種の `body` は structured から生成する由来文（記載者・年・出版物・タイプ産地・採集者・分布のみ。形態・サイズ・栽培を書かない）。AI の形態文は削除。⑤人物典拠表 `data/people-authority.json`（IPNI 略称 → 本名・生没年、敬称・@ の除去）。見出しは本名、mono で略称併記。⑥写真は記録の一部: 撮影者 by-line（`credit`, `user_id`）+ 個体区分 `specimen_status`（original / tc / f1 / f2 / line / unknown、Clone の写真は必須）+ 疑義申告（「報告」に理由選択 → `image_reports`、非公開）。Real/Fake 投票は復活しない。

スキーマ: **Phase A 残**（順に）P1 バッジを `species_qualifier` 参照 → P2 投稿フォームから新列へ保存（RPC に `p_meta jsonb` 1個追加、Hybrid に「複合交配」チェック `#formula-complex`）→ P3 `structured.origin_type` 廃止 → P4 別名の検索・URL 解決・JSON-LD `alternateName`・台帳表示 → P5 異説 `structured.alt_claims` 両論併記（disputed は表示上限60）。**Phase B（10月）**: `species_epithet` `cultivar_epithet` `display_name` `propagation` `japanese_name`。

既定回答（オーナー未確認・異論なければ確定）: Glorious / Splendid / Majestic → Hybrid ／ 'Dark Mama' → disputed 両説 ／ 'Albo Variegata' 'Aurea' → Clone + tag `variegata`+`line` ／ 未収録ページは noindex ／ 'Michelle' 'Zara' は Hybrid。オーナー回答済: 'King of Spades' Clone、'Angels dream' 綴り維持。**09-05b 既定**（無回答なら確定）: 'Mystique A88'(109)・'Galaxy'(110) は現状維持（Hybrid）+ 本文に「オリジナル個体は存在する／流通は F1」／ splendidum(35) は W.Bull ex Rodigas, Ill. Hort. 31: 13, t. 510 (1884) + 注記「1883 年 Gard. Chron. で W.Bull 名義の先行発表」／ Mr Chandra → Chandra、Space Hijau は breeder 表示 + 注記「ナーセリー」／ 個体区分は上記6択。

データ追加修正（09-05、[即]）: 'Red Crystallinum'(52) `formula_status='complex'`／ 'Ace of Spades'(7) 'King of Spades'(2) 先頭 origin を `manual`／ antolakii(59) `aliases=['BVEP','Black Velvet Eastern Panama']`／ debile(34) 本文に「原記載では debilis」／ forgetii × 'Titanium'(55) はオーナーの播種日・作出者待ち／ `cultivar_images` の旧名3件を現名へ、`Anthurium テスト` 削除。**09-05b 追加（T23-①）**: collector NULL 化 crystallinum(3)・veitchii(6)・warocqueanum(4)・wendlingeri(77)・regale(83、本文「発見者: Linden」も削除）、collector「不明」→ NULL（10, 11, 35, 82）、分布 magnificum(10)・forgetii(11) → Colombia、regale(83) → Peru、carlablackiae(1) TDWG 残骸整理、サイズ文削除 forgetii(11)・sagittatum(82)・debile(34) `body_en`、曲引用符 7・52、aff. besseae(108) 本文と habitats「Darién, Panama」、first_description 年重複 10・11・83、POWO 検索 URL → LSID、55 `parent_b_text` → Anthurium 'Titanium'、109 `parent_b_id=52` + notes「NSE 系統」、110 'X-One' 'Dark Phoenix'、2 `name_status` NULL、6 habitats Colombia、38 片仮名削除、画像名寄せ 4枚。**09-07 第4回（T39-2、IPNI 型データ照合済みで前回の [要確認] を上書き）**: collector 記入 dressleri(31) T. B. Croat／papillilaminum(32) R. L. Dressler／luxurians(57) T. B. Croat／debile(34) T. B. Croat & Watt／nutibarense(33) J. M. MacDougal, D. Restrepo & D. S. Sylva + 年 2008（Novon 18(2): 145、2005 Aroideana 28: 61 先行発表を注記）；collector・年 NULL carlablackiae(1)（IPNI 型は T. B. Croat、Carla Black は献名の一文のみ）・clarinervium(9)・regale(83)（notes「導入株は Wallis 採集とされる（原記載未確認）」）・moronense(120) 年；kunayalense(38) → T. B. Croat & J. Vannini；wendlingeri(77) type_locality Costa Rica；crystallinum(3)・veitchii(6) type_locality NULL（Chocó は notes）；sagittatum(82) basionym *Pothos sagittatus* Sims・type_locality NULL；crystallinum(3) aliases 'cristallinum'；forgetii(11)・regale(83) の第 2 記録（manual・trust 95・形態文 30cm）削除；antolakii(59) habitats「Panama」・closest_species「Anthurium dressleri」；'Dark Mama'(5) AI 記録（Llama 3.3・出典 0）削除 + `formula_status='disputed'`；'Queen of Hearts'(8) name_status NULL + tag `tc_origin`；'Ace of Spades'(7)・'Mystique A88'(109) namer「Denis Rotolante」・formula.parentB を列と同期；89 creatorName「hare_anthurium」・本文「'HR1' × 'HR2'」；静的 `people/george-wagner` `people/mr-chandra` と `anthurium/aff.besseae` `anthurium/debile(debilis)` は生成時に掃除 + alias 名寄せ。

---

## 4. コンテンツ方針

- **育て方は書かない**。自生地の環境は由来として書き、そこにだけアフィリを文脈化。相場は扱わない。英語補完・hreflang スタブは**凍結**（`body_en` は AI が自動生成する分のみ残す。英語からの被リンクが月10件超で再検討）。
- 勝ち筋: 記載者・発表年・タイプ産地・採集者・交配式・出典。人物・系統図・産地・用語集・**誤称・別名**で取る。
- トップの「戻る理由」3つ: ①今日の一葉は毎日変わる（日付 + 「明日の一葉は 0:00 に更新」+ シェア文コピー） ②記録が増えている（「新着記録」台帳: 日付・名前・種別・変更、見出し「今週 +n 件」、masthead の最終収録日。実生も日付順で混ぜる） ③自分の記録が残る（colophon CTA「あなたの交配を系統図に残す →」）。
- **撤去（09-05、09-05b で「告知後に必要か」で再判定）**: 画像 Real/Fake 投票（削除維持。代替は §3 ⑥ by-line + 個体区分 + 疑義申告）、お気に入り☆（**別の形: 「棚」として T28 で実装** — localStorage・ログイン不要・☆なし。11月末 保存者 <10 かつ 会員転換 0 で休止）、トップの道具棚（削除維持。**09-07: 詳細ページの道具棚も T34 まで CSS で非表示**。産地・原種棚が 2ヶ月連続 `affiliate_click` ≥100 かつ成約 ≥1/月でフッター「道具」ページを12月検討）、トップの実生ノート区画（削除維持。**新着記録の実生除外バグ `.neq('type','seedling')` を T21b で修正**。公開実生 ≥20件 かつ 投稿者 ≥5人で `/seedlings/` 索引ページ）、AdSense 枠（30,000PV かつ 会員 <5 のみ再議題）、YouTube チャンネル検索（保留、議題にしない）、ユーザー名検索（削除維持。代替は検索対象に人物・産地・別名。登録 >50・投稿者 ≥5 で再検討）、i18n 死にキー、`trial-reminder` 関数、Amazon リンク（条件付き、§2）、共有メニューの **LINE**（**Facebook は PC 専用で復活**、`share_click.channel` で公開90日後に全共有 5% 未満のチャネルを撤去）、`images/hero-mist.jpg`。**Platycerium 18件は `docs/data/platycerium-2026-09.csv` に退避のうえ削除**（`genera.id=4` も）。テーブル（`favorites` `image_votes`）は残す（可逆）。
- **残す**: 共有 = `navigator.share` があれば OS 共有シート、無ければ mono 1行「X · Facebook · URLコピー」（共有文「{品種名} — 誰が、いつ、どこで名付けたか｜Aroid Origins」、`hashtags=PlantsStory` は除去）／ 言語 = 既定は `ja*` なら jp、それ以外 en、masthead の mono 行末尾に `ENGLISH`／`日本語` 1リンク（ヘッダー復活は非 ja セッション ≥15%）／ 由来記録の投票（文字化「正確 / 疑問」、colophon・JSON-LD の「投票で検証」文言は削除し「出典の階層（S〜D）から算出」に統一。12月末に累計10票未満なら撤去）、今日の一葉、年表、索引、関連品種、用語自動リンク、使い方ガイド（投票・お気に入りの記述削除）。
- 次の Anthurium **20件**（union、投稿順）: オーナー投稿 5件 'Dorayaki'(disputed, 3説) → 'Red Vein Dark Phoenix'(Clone, aliases RVDP, 父 'Ace of Spades') → 'Michelle' → 'Zara' → 'Titanium' ／ Claude Code が管理者で一括登録する原種 9件 hookeri, besseae, metallicum, marmoratum, radicans, pallidiflorum, vittariifolium, faustomirandae, waterburyanum(DOUBTFUL、要確認) ／ 第3週: 'Dark Phoenix', 'Fat Mama', 'Wonderboy', 'Silver Blush', sp. "BVIT", sp. "Fort Sherman", sp. "villenaorum", portillae ／ 予備: queremalense, 'X-One', angamarcanum。
- 10月: **Monstera 公開**（obliqua "Peru" / 'Burle Marx's Flame' / Albo / Aurea の修正と deliciosa 1849 ほか発表年補完、ゲート合格後）。Philodendron は3件の Hybrid 化と gloriosum/melanochrysum 発表年補完後に11月判断。
- 投稿者の報酬: 人物ページ自動生成 + 系統図掲載（フォーム冒頭に明記）、実生 OGP に交配式・播種日・作出者、投稿完了画面に X/Instagram 用テキスト。存命ブリーダーは本人公開名義のみ。
- SNS: Instagram 主戦場。オーナー週3回「今日の一葉」（OGP + シェア文をサイトが用意し、コピペにする）。
- 空ページは「未収録」シート + 投稿 CTA。系統図の「未収録の親」（'X-One' 'Dark Phoenix' 'Titanium' 'Dorayaki'）は登録 CTA にする。検索0件も「この名前で登録する →」。
- **09-07 追加（第4回）**: カタカナ別名（トップ15 + 収録済み全件）を `aliases` に投入し検索・JSON-LD・description に出す（T40）／ 検索 0 件シートに「この名前の収録を依頼」（ログイン不要、`genus_requests.kind='name'`、GA `search_zero{term}`、T41）／ 記載史年表を `/timeline/` 独立 URL + 年表画像 1 枚（T43）／ 未収録・記録なしの description は定型「記録なし · 作出者と交配式の出典を募集」（AI 本文を出さない）／ 使い方ガイドは 5 見出し（区分 4 つと名前の書き方／記録の読み方 8 行／投稿: 原種・Hybrid・Clone・個体・実生 5 件無料・非公開・再調査リクエスト／ラベル印刷／会員は価格を書かず料金ページへ）。手順リスト 5 本と「コミュニティで収集・共有するプラットフォーム」「ユーザー名」は削除（T42）／ 用語集に 個体・系統（line）・F1・オリジナル個体・管理番号・未収録・記載者・タイプ産地 の 8 語（T42、未収録シート・個体欄からリンク。basionym 著者は索引に出さない）／ 訂正の可視化（新着記録「訂正」種別・収録メモ「訂正 n 件」・訂正者 by-line）は本告知 +1 週に実例を見て形を決める。収録メモの「収録 · 記録 n 件 · 更新」は T27a／ **無料付与 `granted`（告知戦術）**: ソフトローンチ協力 2 名・本告知後の他者投稿 最初の 5 人・写真提供者に 3 か月（管理画面「無料付与」、規約 9 条に「運営者が無償で会員資格を付与することがある」を T30 で追記、会員一覧では区別しない）。付与者の 12 月継続 0 なら 1 月に終了／ 告知文 1 投稿目は 'Michelle' が 9/19 までに収録・検証済でなければ crystallinum（1873 Linden & André、原産コロンビア。「チョコ」は書かない）。

### 4b. ローンチ計画（09-05b 確定。詳細は `docs/board/2026-09-05b.md` §3）

- **原則**: 告知は界隈で一度しかできない。オーナー個人名義で栽培家として話す／各所の規約に従う／「サイトができました」でなく中身の話（'Michelle' の作出者と交配式など）でリンクは末尾／週末夜 20〜22時／最初の1週間は返信に全部返す。
- **ソフトローンチ（クローズド）**: 9/21〜10/2。Instagram ストーリーズ（親しい友達可）+ 知人ブリーダー2名への DM、計10〜20人。目的は誤りの洗い出しと投稿導線の実地テスト（知人1名に投稿1件）。決済は不要。数字は追わない。
- **本告知**: **必須ゲート M1〜M10 全達成の翌土曜 20:00。目標 10/3、未達なら 10/10 → 10/17 → 上限 10/24**（10/24 は M10 決済のみ未達でも告知）。
- **必須ゲート**: M1 収録済み Anthurium ≥45／ M2 国内流通トップ15（crystallinum, clarinervium, warocqueanum, papillilaminum, forgetii, regale, luxurians, magnificum, 'Michelle', 'Zara', 'Dorayaki', 'Red Vein Dark Phoenix', 'Ace of Spades', 'Dark Mama', 'Black Velvet'=antolakii 別名）が**学名・カタカナの両方で**検索0件を返さない（09-07 強化）／ M3 致命的データ欠陥ゼロ（taxonomy C1〜C9・C11・C13・C14・C16・C18・C19）／ M4 記載種の検証済 100%／ M5 OGP（標本台紙 og-default、share fallback 404 なし、X・Facebook・LINE の3ツールと iPhone 共有シート実機）／ M6 GA `login{source}` `sign_up` `share_click.channel` `label_print` `contribute_start{source}` `paywall_view{source}`（09-07 追加）／ M7 投稿導線 ≤90秒 + 完了画面コピペ文／ M8 当日の新着記録 直近7日 ≥3件 + 今日の一葉当日／ M9 法務・連絡先・料金整合／ M10 決済稼働（テスト決済1件）。
- **努力ゲート**（未達は告知文で欠けを正直に書き投稿依頼に変える）: E1 写真 収録済み ≥80%・トップ15 100%／ E2 人物 ≥10本・存命3名 Tier B／ E3 産地7ページ 原種 ≥3／ E4 AI 単独折り畳み ≤30%／ E5 用語集 ≥30語／ E6 Clone/Hybrid Tier C ≥3/8・検証済 ≥4/8／ E7 区分違反 0／ E8 撮影者 by-line 40/40／ E9 ラベル印刷（T28a）が本番、iPhone 印刷確認済み（**09-07: 棚は告知後、E9 から除外**）。
- **チャネル順（本告知週）**: 土 20:00 X スレッド5投稿 → 土 20:30 Instagram カルーセル5枚 + ストーリーズリンク → 日 LINE オープンチャット（規約確認、参加済みのみ） → 月〜火 Facebook 国内アロイド系グループ（参加済みのみ） → 以後毎日「今日の一葉」ストーリーズ。+1週: 海外ブリーダー DM（Doc Block・Siam Flora・NSE Tropicals・Ecuagenera）と国内ブログ（アンスリウムジャパン・シロウト園芸）へ相互リンク。+2週: 専門店3店（T33 と統合）・ヤフオク/BASE 出品者の知人（メルカリは URL 不可）。+2〜3週: Monstera 公開で第二波。11月: 即売会で標本ラベルの株を投稿。下書きは content §3-A〜F。
- **当日**: 0:00 今日の一葉確認 → 19:00 最終チェック（OGP 3ツール・新着記録・料金ページ・投稿通し） → 20:00 X → 20:30 Instagram → 23:00 まで返信（オーナー2時間）→ 翌日 GA4/Search Console と指摘一覧、修正は24時間以内。
- **7日/30日の指標と撤退線**: §1 KPI 表。`share_click` は channel 別に見て90日で 5% 未満を撤去。誤り指摘・再調査リクエスト 7日3件・30日10件（0なら「読まれていない」）。

---

- **属の拡張は需要で決める（09-06 オーナー決定）**: 当面 Anthurium のみ。トップの masthead と投稿フォームに「属の追加を依頼 →」（ログイン不要、`request_genus` RPC、`genus_requests` テーブル、管理画面「属の追加依頼」で件数と理由を確認）。依頼が集まった属から、非表示データを Anthurium と同じ基準で修正してから `is_visible` を立てる。Platycerium はアロイドでないため定義文と不整合（要判断）。

## 5. デザイン方針（Field Archive）

- 世界観: 紙・インク・罫線。禁止: 絵文字、グラデーション、影、5色 tier バッジ、パステル、汎用カードグリッド、旧 HEX。**AI 生成の植物図版は不採用**（オーナー写真の版画変換のみ。写真がない品種は「図版未収録」）。
- 判断軸: その要素は「由来を読む・確かめる・書き足す」に直接効くか。効かなければ UI を休止（データは残す）。
- ヘッダー6要素: ロゴ / 属 / 人物 / 産地 / + 投稿 / ログイン / ≡。EN/JP 切替と「使い方」はフッター（自動判定は維持）。モバイルナビ: Home / Anthurium / 人物 / 産地 / 用語集 / + 投稿 / ログイン / ENGLISH。
- 詳細ページの読み順: 標題行 mono（属 · 区分 · NO.）→ 名前 + cite 行（記載者 · 年 · 産地）→ 図版 → 標本ラベル → 操作行 mono 1行（共有 · 写真を追加 · 記録を追加 · AI 再調査をリクエスト · ラベルを印刷 · 編集(所有者) · 報告）→ 由来記録（第1記録全文、以降 `<details>`）→ 系統 → 関連 + 前後 → 道具棚（文脈ありのみ）→ 収録メモ 1行。PC ≥900px は図版 5fr / 本文 7fr。
- 「未収録」は部品 `.sheet` で統一（`--missing` 不足リスト付き / `--plate` 図版未収録 / `--pending` 調査中 / `--search` 該当なし）。点線1本・紙2色・セリフ1文・mono 1行・下線 CTA。
- 統合: Tier チップ + 出典名 → mono 1行「出典 — B · aroid.org」／ カードフッターのバッジ群 → 見出し行「記録 1 · 信頼度 67% · IPNI/Kew · 2026.09.04」／ 登録日・投稿者 → 末尾「収録メモ」／ 「AI生成待ち」バッジ → 信頼度列に「未収録」「調査中」／ 投稿フォーム: ログイン特典カードを1行に、「?」ポップアップを常時定義に、順序 品種名 → 区分 → 由来 → 図版、採取年・発見者・命名年は `<details>` に。
- モバイル: M-A 操作行1行化、M-B 一覧2列目の簡略化（≤640px でバー非表示）、M-C `pointer: coarse` で 44px（chip / page-link / index toggle / 関連 / 年表 / フッター / ハンバーガー / ギャラリー矢印）、年表軸の非表示境界を 700px に。
- 標本ラベル印刷: `print.css`（A4 2×4 = 91×55mm 互換、二重罫、ink 1色、`.label--stake` 60×25mm）、`buildLabelHtml` 区分別セル、dialog で枚数 1/2/4/8・種類、GA `label_print`。**公開範囲: 決済稼働までログインユーザー全員に無料開放 → 稼働後は会員が全収録品種、非会員ログインは自分の投稿分のみ**。
- 図版パイプライン（版画変換）はオーナー写真到着後に CSS 試作30分で判断。系統エクスプローラは Hybrid 50件超で再検討。
- **09-05b 追加**: 「棚」= 詳細ページ操作行に「棚に入れる／棚にある」1語、`localStorage['plants-story-shelf']`、入口はフッターと mobile-nav 末尾「棚（n）」（0件は非表示、ヘッダー6要素は守る）、`/shelf` は `.ledger-table` + 「棚のラベルを印刷 →」+ 図版なしは「写真を提供 →」、空は `.sheet`。☆・ハート・カウンター・トーストなし。ログイン時は `favorites` へ同期。／ 標本台紙 OG（1200×630）: 紙 `#F4F1EA`、外周 8px + 内側 20px の二重罫、左上 mono `AROID ORIGINS · plantsstory.com`、中央 Shippori Mincho 定義文、右下 mono `ANTHURIUM · n ENTRIES · 2026`、インク1色 + 黄土、植物イラストなし。品種別は同じ台紙に名前 + cite 行 + `NO.`、写真があれば写真優先。静的 PNG 生成器（`@resvg/resvg-js` + 同梱フォント）に統一し `og-image` Edge Function は削除。／ masthead: 定義文を `--color-ink` 1rem、タグライン「一葉に、千の物語。」を 1.05rem `--color-mid` 600 に下げる。／ 375px ヘッダーに「+ 投稿」を出し「ログイン」をハンバーガーへ。／ 詳細ページ操作行の文言「この台紙に書き足す — 写真 · 由来記録 · 訂正」、フォーム冒頭に「投稿者名は人物索引と系統図に載ります」。
- **09-07 追加（第4回）**: **読み順の確定（T27a）**: mono 標題行「ANTHURIUM · 原種 · NO. 013」→ h1（バッジ行・登録日は削除）→ 標本ラベル → 操作行（共有 · 写真を追加 · 記録を追加 · 再調査を依頼 · 編集(所有者) · 報告。`#edit-key-section` は既定非表示、「削除依頼」→「報告」）→ 図版（h2「画像」なし、写真下 mono 1 行「栽培者本人の写真のみ · 撮影者未記録 · 報告」、写真なしは `.sheet--plate` + 「あなたの株の写真を提供 →」）→ 未収録シート → 記録 → mono 1 行「**この台紙に書き足す** — 記録を追加 · 写真を追加 · 訂正を報告」（黒い `.btn--primary` 撤去。既定フォームは本文 + 出典 URL + 送信の 3 要素、構造化欄は `<details>`「項目で書く」、未ログインは「投稿者名は人物索引と系統図に載ります · ログイン →」）→ 個体（1 件以上のときのみ。0 件は操作行に「個体を追加」）→ 関連 + 前後 + 出口 1 行「Anthurium の台帳 → · 記載史年表 → · 同じ産地 →」→ 収録メモ「収録 2026.03.13 · 記録 n 件 · 更新 2026.09.06」。詳細ページの道具棚は T34 まで非表示。
- **標本カード（品種別 OG、T29a、09-07 統合仕様）**: 生写真を og:image にしない。全品種を同じ台紙（1200×630、紙 `#F4F1EA`、インク `#1E2622`、補助 `#5B625E`、深緑 `#2F5D4A`、黄土 `#A8712E`、二重罫 28.5/36.5）に組む。左上 mono「ANTHURIUM · SPECIES · NO. 013」、右上「AROID ORIGINS」、上罫、大見出しは種小名・品種名のみ（Cormorant Garamond Bold、≤12 字 96px / ≤18 字 76px / 以上 58px）、cite 行 Italic 34、mono「DESCRIBED」「LOCALITY」（交配種は PARENTAGE / BREEDER）、要約 1 行（BIZ UDMincho 28、全角 26 字。**人の記録か検証済のときだけ。AI 下書きは載せない**）、右に 4:5 の写真台紙（preserveAspectRatio meet。写真なしはモノグラム「A」+ mono PLATE NOT YET RECORDED）、下罫、URL（深緑）、右下の状態行は「記録 n · 出典 IPNI / POWO」か「検証済」か「記録 未収録」（**「AI」「信頼度 %」は載せない**、写真ありは末尾に撮影者名）。フォント 3 種（Cormorant Garamond・BIZ UDMincho・IBM Plex Mono、いずれも OFL）を `fonts/og/` に自己ホスト。Georgia は使わない。`images/anthurium.png` は出所未確認のため使わない。`scripts/make-og-cards.js` → `images/og/<slug>.png`、deploy.yml の静的スタブ生成直前に差分のみ再描画、`share/index.ts` fallback とスタブを同 URL。トップ15 から生成。検証は X Card Validator と LINE で warocqueanum・aff. besseae・Galaxy の 3 枚（オーナーに PNG を送る）。年表画像・今日の一葉 OGP も同じ描画関数。
- **投稿完了帯（T29b）**: 別画面は作らない。登録直後に遷移する品種ページの標本ラベル直下に 1 回だけ hairline 帯（`.record` と同じ罫）: mono「収録しました · この台紙を共有」+ 共有文 1 行 + 「コピー · X」。sessionStorage で再表示なし。GA share_click{channel: copy, source: submit}。共有文の共通式（共有ボタンと同じ）: 「{品種名} — {記載者 or 作出者} {年}、{タイプ産地 or 交配式}｜Aroid Origins {URL}」、cite が無ければ定義文。数値・「AI」・信頼度は入れない。
- **棚は告知後（T28b）**: 09-05b の仕様は維持し、着手は本告知 +2 週に share_click・label_print の実測を見て判断（10 月上旬ボード）。ラベル印刷（T28a）は告知前に単独で出す。使い方ガイドの `.card` 4 枚は hairline `<section>` に。
- 標準手順: 見た目の変更は本番前にオーナーがプレビュー確認（iPhone 実機）。CSS/JS 変更時はキャッシュバスター 12 箇所 + `sw.js` `ASSET_VERSION`。

---

## 6. 未完了タスク（担当・期限）— 実装順

| ID | タスク | 担当 | 期限 | 効果 |
|---|---|---|---|---|
| T20 | **完了 09-07**（`research_requests`・admin タブ・`RESEARCH_DAILY_CAP=15`・登録起点の上限を確認）AI 再調査リクエスト | Claude Code | 9/7 | 由来無料の約束を機能にする |
| T21 | **完了 09-05**（YouTube 検索は管理者専用・未使用時は無コストのため保留） 削除バッチ1 + モバイル: お気に入り・画像投票・トップ道具棚・トップ実生区画・AdSense 枠・YouTube 検索・ユーザー名検索・i18n 死にキー・`trial-reminder`・Amazon リンク・共有 FB/LINE・`hero-mist.jpg`・AI バッジ → 状態列、EN/使い方をフッターへ、M-A/M-B/M-C、規約5・6条とガイドの投票文言 → プレビュー → 本番 | Claude Code → オーナー確認 | 9/9 | 「参加装置」より「記録」 |
| T21b | **非表示系は完了 09-06（本番）。見た目系（masthead 文字階層・ENGLISH リンク・スマホヘッダー「+ 投稿」）は branch `t21b-visual` でオーナー確認待ち → OK で merge** 告知前修正（09-05b）: 新着記録の `.neq('type','seedling')` 削除 + `is_private` 除外／ 共有: `hashtags=PlantsStory` 除去・共有文・PC 専用 mono「X · Facebook · URLコピー」・`share_click.channel`／ GA `login` `sign_up`／ `og-default-2026-09.png` 標本台紙 OG + `share/index.ts:113` fallback + `og-image` 関数削除／ `forms.js:270` 言語既定反転／ masthead 文字階層 + mono ENGLISH／ 375px ヘッダー「+ 投稿」／ 残骸（`index.html:129` aria-label、`:1142` ガイド文言、CSP amazon）／ キャッシュバスター → プレビュー → 本番 | Claude Code → オーナー実機 | 9/9 | 告知の顔と受け皿を直す（≈4h） |
| T22 | **完了 09-05** 定義文 + 新着記録 + 未収録の親 CTA: `hero_desc`/`about_mission_text`/`colophon_p1`/meta/og/静的スタブ既定文を §0 に置換、`#recently-updated-grid` → 新着記録台帳（実生含む、今週 +n）、系統ブロックの未リンク親に「登録する →」、colophon 縮約、検索0件 `.sheet--search` | Claude Code | 9/10 | 戻る理由・投稿導線 |
| T23 | **①〜⑤ 完了 09-07**（④ AI 下書き折り畳み・状態 mono・投稿者記録の%非表示 ⑤ wireframe/js/record-gate.js を site/sitemap/stub/admin で共用、台帳の状態列 3値、詳細の未収録シート + noindex、sitemap 除外、属カード件数は収録済みのみ、admin「未収録一覧」。⑥ p_meta は個体対応で RPC に追加済み） **⑦人物典拠表は T39-4 へ（JSON は 09-07 作成済み）** ①②③ 完了 09-06（本番データ修正 45件 + 原種18件の本文を由来文に再生成 + research-origin: 採集者は IPNI 原記載の型データのみ・分布は WCVP(POWO) のみ・LSID リンク・年重複解消・本文は由来のみ。バックアップ docs/board/data/）**④⑤⑥ 完了、⑦ → T39-4** 品質ゲート + データ修正（09-05b で taxonomy の順に差し替え）: ①データ修正 SQL 一括（§3 の [即] + 09-05b 追加、画像名寄せ・テスト削除） ②原種本文の由来文化（`generateBodyFromStructured` species 分岐 + `research-origin` species プロンプト、既存18件を structured から再生成） ③`research-origin` ルール（collector は protologue のみ、分布は POWO native、LSID、年重複、出典0件は Tier D） ④低信頼折り畳み + Tier mono 1行 + 手動記録の % 非表示 + `verification` manual 非描画 + 台帳件数から折り畳み除外 ⑤状態列3値 + `scripts/lib/record-gate.js` + 未収録シート + noindex + sitemap 除外 + 属カード件数 + admin「未収録一覧」「調査失敗」 ⑥P2 `p_meta` RPC + `#formula-complex`（**9/11、シード投稿前**） ⑦人物典拠表 `data/people-authority.json`。P1 `species_qualifier` バッジ・P3 `origin_type` 廃止は告知後 | Claude Code | 9/14（⑥は 9/11） | M1・M3。信頼（判断基準②） |
| T24 | **Anthurium 20件**: 原種9件を管理者で一括登録（GBIF 経路、≈200円。**T23-③ の後**に実行、waterburyanum は DOUBTFUL で要確認）→ オーナー投稿5件の誤り確認 → 第3週8件 → antolakii aliases | Claude Code + オーナー | 原種 9/16、全体 9/20 | M1・M2 |
| T25 | **別名・誤称ページ `/names/`** + P4（旧綴り URL 解決・JSON-LD・台帳の `= debilis` 行）+ **検索対象に人物索引・産地**（ユーザー名検索の代替）+ **T38 書誌欄** + 静的スタブ・sitemap。**09-07: `aliases` の検索一致とカタカナ別名は T40 で先行（第 1 週）**。0 件シートの「別名で探す」1 行は T41 | Claude Code | 9/23 | M2（'Black Velvet'）・購入前検索（≈6h） |
| T26 | **検証ワークフロー**: 列3本・RPC・`cast_origin_vote` の固定・標本ラベル「検証状況」行・台帳 ✓・admin「検証 / 再確認キュー」 + 投票の文字化「正確 / 疑問」。完了後、IPNI/GBIF 一致の記載種を admin で検証済にし **M4（記載種 100%）** を満たす。Clone/Hybrid は Tier C 出典が取れた分のみ | Claude Code | 9/19 | M4 |
| T27a | **branch t27a-reading-order で実装済 09-07・プレビュー確認待ち（48h 無反応で merge）** **読み順 + 削除（09-07、第 1 週）**: §5 の読み順（mono 標題行・バッジ行削除・操作行をラベル下へ・h2「画像」撤去 + `.sheet--plate`・個体 0 件非表示・出口 1 行・収録メモ）／ 詳細ページ道具棚 CSS 非表示／ D5 文言（`index.html:1052`、`add_origin_title.en`）／ ⑧ `#edit-key-section` 既定非表示 + 「報告」／ ⑥ 黒ボタン → mono 1 行「この台紙に書き足す」+ 3 要素フォーム + `<details>` → プレビュー 4 パターン（写真あり / 写真なし原種 / AI のみ trust 23 / 調査中）→ 48h 無反応で本番 | Claude Code → オーナー実機 | 9/12（本番 9/14） | 着地 1 画面の純度（≈7h） |
| T27b | **画像**: 撮影者 by-line（`credit`, `user_id`）・個体区分 `specimen_status`（original / tc / f1 / f2 / line / unknown）・「報告」の理由選択 → `image_reports`（Real/Fake 投票の置換）+ フォーム冒頭の報酬明記 | Claude Code | 9/26 | E8（≈4h） |
| T28a | **標本ラベル印刷（告知前）**: `print.css`（A4 2×4 = 91×55mm・二重罫・ink 1 色・`.label--stake` 60×25mm）・`buildLabelHtml` 区分別セル + 検証状況 1 行・dialog 1/2/4/8・GA `label_print{count,member}`・i18n。決済稼働までログイン全員に無料 → iPhone Safari 印刷確認 | Claude Code → オーナー実機 | 9/26 | 会員特典②の実体・第 2 のペイウォール・E9（≈4h） |
| T28b | **棚（告知後）**: §5 09-05b の仕様（`/shelf`・操作行 1 語・フッター/mobile-nav 入口・dialog 複数品種・`favorites` 同期・GA `shelf_add`、`add_favorite` は廃止）。本告知 +2 週に `share_click`・`label_print` の実測を見て着手判断 | Claude Code | 告知 +2 週以降 | ログイン率 +2pt 仮説（≈3h）。撤退: 12 月レビューで保存者 <10 かつ会員転換 0 |
| T29 | **(a) 生成器は branch t29a-og-cards で実装済・見本3枚送付・48h 無反応で merge。(b) 完了帯は本番反映済 09-07** **標本カード + 完了帯 — 9/19 に前倒し**: (a) 生成器 `scripts/make-og-cards.js`（§5 統合仕様、`@resvg/resvg-js` + `fonts/og/` 3 書体、`images/og/<slug>.png`、deploy.yml、スタブと `share` fallback を同 URL、トップ15 先行、Validator 3 枚をオーナーへ）(b) ⑤ 投稿完了帯 + 共有文の共通式 (c) 9/28: 今日の一葉 OGP + シェア文コピー（content §3-F）+ 実生 OGP に交配式 + 人物索引「日本のブリーダー」 | Claude Code | (a)(b) 9/19、(c) 9/28 | M5・M7。Instagram 素材（≈9.5h） |
| T30 | **準備ブランチ t30-member-plan 作成済 09-07（判定日に merge + Price ID）** **料金 v2（Stripe 判定翌日。10/3 に判定なしなら判定を待たず実施し PAY.JP 申請へ）**: 1プラン化 会員 500/5,000、translations・料金・特商法・規約9条の2・モーダル・OGP・静的スタブ再生成、敗者側の決済関数・分岐削除、特典「先行閲覧」「広告非表示」「支援者」文言削除、ラベル印刷の門を `window._member` に。**09-07: ブランチ `t30-member-plan` を第 1 週に作成（本番に出さない、≈3h）**: 年額既定ラジオ + 1 ボタン、`showPaywallModal(source)`（実生起点「実生ノートを続ける」／ラベル起点「このラベルを印刷する」／料金ページ「会員になる」）、規約 9 条「無償付与」1 行、About「会員（n 人）」区画、Trial 分岐削除、料金ページは「会員でなくてもできること」→ 特典 4 つの順、静的スタブ再生成。`create-checkout`・`stripe-webhook` はコード変更なし（内部キー `seedling_*` は改名しない）。判定日は merge + キャッシュバスター 30 分 → オーナー実決済 500 円 → 解約確認 → 返金。不承認・判定なしは同ブランチで事業者名を「クレジットカード決済（決済代行会社）」にし PAY.JP へ（サイト側 1h: `_PAYMENT_PROVIDER`、`#payjp-card-element` 表示、CSP `js.pay.jp`）。10/24 決済なし告知のときだけ「開始したら知らせる」（価格は出す、押せないボタンは置かない、`profiles.notify_member_launch` + RPC + GA `member_interest{source}`、バナー + Resend メール、1h） | Claude Code | 判定 +1日 | 売上化 |
| T31 | P5 異説 `alt_claims`（'Dark Mama' 2説、'Dorayaki' 3説）+ admin 編集 + AI 経路 `alternative_parentage`、産地ページの標高・生育環境行、用語集の語彙追加（F1・sib-cross・selfing・locality form・aff.） | Claude Code | 10/5 | 正確性・ロングテール |
| T32 | Monstera 公開（4件修正・発表年補完・ゲート合格・`is_visible`・sitemap） | Claude Code → オーナー承認 | 10/15 | PV 拡大 |
| T33 | 取扱店掲載: `shops` テーブル・品種ページ PR 欄・自己申込 Checkout（1,000円/月・初月無料）・特商法追記・DM 文面 | Claude Code / オーナー DM | 10/20 | +3,000円/月 |
| T34 | アフィリ限定運用（産地 + 自生地環境つき原種のみ、`affiliate_click` に `page`）+ Admin ファネル | Claude Code / オーナー（楽天リンク） | 10/31 | +500円/月 |
| T35 | 写真到着後: 版画変換 CSS 試作 → 可否 → 図版シリーズ | Claude Code | 写真到着 +3日 | 図版 |
| T36 | Platycerium CSV 退避 → `cultivars` 18行 + `genera.id=4` 削除、テストデータ削除 SQL | Claude Code 用意 → オーナー実行 | 9/10 | 看板との整合 |
| T37 | **ローンチ実行（§4b）**: ソフト 9/21〜10/2 → 本告知 目標 10/3・上限 10/24 → +1週 海外 DM・ブログ → +2週 専門店・出品者 → Monstera 第二波。Claude Code は当日の最終チェック（19:00、M1〜M10 チェックスクリプト）と翌日以降の指摘修正（24h 以内）。**09-07 追加**: 第 4 週に 告知文の数値差し替え（'Michelle' 未収録なら 1 投稿目 crystallinum）、④「この株から実生を記録 →」（原種・Clone・個体の操作行、`data-prefill` 流用、GA `contribute_start{source:'from_parent'}`、1h）、写真到着時の版画 CSS 試作（T35、2h 予備）。本告知 +1 週に 訂正の可視化（新着記録「訂正」種別・収録メモ「訂正 n 件」・訂正者 by-line）、他者投稿 最初の 5 人へ `granted`。初週の判断線は monetization §4-3（来訪→登録 ≥4%、登録→会員 ≥8%、share ≥30、paywall 到達 ≥3%、投稿導線 ≥30%） | オーナー（投稿・返信）+ Claude Code | 9/21〜10/31 | 来訪 1,000 → 会員 5・初月現金 ≈9,250円 |
| T38 | 出典書籍の書誌欄（リンク無し、著者・年・書名・ISBN。Bown *Aroids* 2000、Croat 1986 ほか出典に現れる分だけ）。Amazon リンクは12月レビュー後 | Claude Code | T25 と同時 | 資料館の価値。Amazon 条件付きの下地 |
| T39 | **①〜④ 完了 09-07（ゲート改訂・IPNI 型データ準拠のデータ修正・由来文再生成・典拠表組み込み）** **taxonomy 一括（第4回、第 1 週）**: ①ゲート G1〜G9（`wireframe/js/record-gate.js` ← `docs/board/data/2026-09-07-record-gate.proposed.js`）+ i18n 2 キー + sitemap・admin 再判定（2h） ②データ修正 SQL D1〜D15 + 削除 3 件（§3 09-07 項、バックアップ `docs/board/data/`、4h） ③由来文再生成 12 件（1, 3, 9, 31, 32, 33, 34, 38, 57, 77, 82, 83）+ 生成器 basionym・原綴分岐（2h） ④人物典拠表 `wireframe/data/people-authority.json` の組み込み（`archive.js` `peopleIndex` + `scripts/lib/people.js`、alias_of 畳み込み、kind nursery/handle ラベル、見出し本名 + mono「IPNI 略称 · 生没年」）+ 静的 people/anthurium の掃除と名寄せ（2.5h）。目標: 合格 29/31 | Claude Code | 9/12 | M1・M3（C2・C4・C5・C11・C13） |
| T40 | **完了 09-07** **content 第 1 週**: カタカナ別名 SQL（トップ15: ミッシェル/ミシェル・ザラ・ドラヤキ・RVDP/レッドベインダークフェニックス・クリスタリナム・クラリネルビウム・ワロクアナム・パピリラミナム・フォルゲティ・レガーレ・ルクスリアンス・マグニフィカム・エースオブスペード・ダークママ・ブラックベルベット + 収録済み全件、1h）+ 検索に `_aliases` 一致（`pages.js:1397/1675`）+ 静的スタブ JSON-LD `alternateName`・description 末尾「別名」+ 未収録・記録なし description 定型 + Trial 残骸（`pages.js:159-188, 328-337` `isTrial`・バッジ・「無料お試し期間」）・死にキー `add_origin_title.en` 削除 + GA 4 本（`paywall_view{source}` 7 か所、`login{source}`、`contribute_start{source}`、`share_click{channel:'copy',source:'submit'}`） | Claude Code | 9/12 | M2・M6（≈3.5h） |
| T41 | **完了 09-07** 検索 0 件 → 「この名前の収録を依頼」（ログイン不要、`genus_requests` に `kind` 列 genus/name、同 RPC・同ダイアログ、admin 集計 → 次の 20 件の収録順）+ GA `search_zero{term}` + 0 件シート「別名で探す: 'Black Velvet' → antolakii」1 行 | Claude Code | 9/19 | 告知文「足りない名前を教えて」の受け皿（1.5h） |
| T42 | **完了 09-07** 用語集 8 語（§4 09-07、未収録シート・個体欄からリンク）+ 使い方ガイド 5 見出し化（手順リスト 5 本・「コミュニティ…プラットフォーム」・「ユーザー名」削除、`.card` → hairline `<section>`、「記録の読み方」8 行: 記録 n · Tier · 信頼度 · 未収録/調査中/記録なし · AI 下書き · 検証済） | Claude Code | 9/19 | E5・初見の信頼（2.5h） |
| T43 | `/timeline/` 独立 URL（トップの年表部品流用）+ 年表画像 1 枚（標本カード描画関数、1873 crystallinum → 1878 warocqueanum → … → 2020 年代 Clone）+ 静的スタブ・sitemap | Claude Code | 9/28 | 告知素材（Instagram 2 枚目・X 2 投稿目）、被リンクの受け皿（2h） |
| 条件到達時 | `/seedlings/` 索引（公開実生 ≥20・投稿者 ≥5）／ Amazon 書籍リンク（`affiliate_click` 2ヶ月連続 ≥60）／ ヘッダー EN（非 ja ≥15%）／ フッター「道具」ページ（棚クリック ≥100 + 成約） | Claude Code | — | — |

完了（09-04〜09-07）: T20 AI 再調査リクエスト（09-07）、T1 Field Archive 本番、T2 データ修正22件、T3 Phase A 列追加・分割入力、T5 人物ページ、T6 系統図、T8 産地・用語集・自動リンク、AI 調査の歯止め、未記載種経路、Stripe 申請パック。**廃止**: 旧 T4（支援者2プラン）→ T30、旧 T11（有料由来調査）→ T20、旧 T9 の英語補完 → 凍結。

---

## 7. オーナー待ちタスク（09-05b で 8件に圧縮、09-07 で #6〜#8 を更新し #9 #10 を追加。各に既定回答つき、無回答なら既定で進む）

| # | 依頼 | 手順・所要 | 期限 | 無回答時の既定 |
|---|---|---|---|---|
| 1 | **@hare_anthurium の帰属と告知名義** | 「本人か第三者か」「告知・人物ページ・投稿者名を本名か栽培家名か」を1行で。5分 | 9/12 | 本人・栽培家名 `hare_anthurium` で統一。About 現状維持。第三者なら About から外す |
| 2 | **告知チャネルの棚卸し** | Instagram フォロワー数／X の植物名義とフォロワー数／参加中の Facebook アロイド系グループ名／LINE オープンチャット「シロウト園芸」の参加有無。15分 | 9/12 | Instagram + X のみで本告知。FB・LINE OC は飛ばす。X が無ければ 9/20 までに作成しソフト期間に自分の株を10投稿 |
| 3 | **知人ブリーダー2名** | ソフトローンチの読者 + 「系統図に載せませんか」の相手。公開名と連絡手段。うち1名に投稿1件を試してもらう。10分 | 9/12 | Instagram「親しい友達」ストーリーズのみで実施。投稿の通しテストは Claude Code が別アカウントで |
| 4 | **画像40枚の撮影者** | 管理画面の画像一覧で「自分が撮っていない写真」の番号と提供者名（caption「インスタ」等を含む）。15分 | 9/12 | 全件「撮影者未記録」表示で告知（E8 未達のまま） |
| 5 | **自分の記録の補完** | ①シード投稿5件 'Dorayaki' → 'Red Vein Dark Phoenix' → 'Michelle' → 'Zara' → 'Titanium'（1.5h）、続けて系統図の未収録親から 'Dark Phoenix' 'X-One' ②実生 forgetii × 'Titanium' の播種日・作出者 ③'Ace of Spades' の来歴（Orchid Jungle → Rotolante 選抜）の出所 URL | 9/12 | ①が無いと M2 が欠け本告知が翌週へ ②播種日不明のまま未収録 ③出典なしで「投稿者の記録」 |
| 6 | **決済の確認と切替** | Stripe を 9/8・9/19・9/26 に確認、変化なしなら `docs/stripe-application.md` §5 でサポートへ。承認なら Product「Aroid Origins 会員」に Price 2本（会員 月500 / 年5,000、税込・トライアルなし）→ Customer Portal 有効化（解約・カード変更）→ Webhook 登録（`docs/stripe-application.md` §4-5）→ 鍵・Price ID・Webhook 秘密を**チャットに貼らず** Supabase Secrets へ（画面共有）→ merge 後に**本人が月額 500 円で実決済**（M10、`subscriptions` 行と GA `subscription_checkout_success` を確認）→ Portal から解約 → Stripe で返金（手数料 ≈18 円は戻らない）。**10/3 に判定なしなら PAY.JP 申請**（特商法 URL `https://plantsstory.com/tokushoho/`、会員2本のみ）。各30分 | 9/8〜10/4 | 手順どおり。10/24 に未稼働なら決済なしで本告知（M10 解除） |
| 7 | **写真** | clarinervium・regale 最優先、次に luxurians・moronense・nutibarense・sagittatum・交配種2〜3（葉1枚正面・無地背景・長辺 2000px 以上）+ Instagram 1枚目用に棚の引き1枚。1.5h。`images/anthurium.png` の出所（自作か AI か）を一言 | 9/21 | 「図版未収録」のまま告知し、告知文に「写真はまだ半分。あなたの株の写真を待っています」。**`anthurium.png` は出所未確認として標本カードに使わない（09-07 既定）** |
| 8 | **プレビュー確認と本告知日** | iPhone 実機で ①T21b 済（09-06 OK） ②T27a 読み順 4パターン **9/12** ③標本カード PNG 3 枚（warocqueanum・aff. besseae・'Galaxy'）を X 投稿プレビューと LINE で **9/19** ④T28a ラベル印刷（共有シート → プリント）**9/26**。「OK」か気になる点の箇条書き、各15分。あわせて **本告知 10/3（土）20:00** の可否と当日・翌日の返信対応各1時間 | 各日 | 48時間無反応なら本番反映。日程は既定（10/3、未達なら翌土曜、上限 10/24） |
| 9 | **開業届（e-Tax）**（09-07 追加） | マイナンバーカードで e-Tax → 「個人事業の開業届出書」。屋号任意（Aroid Origins 可）、事業内容「ウェブサイトによる情報提供」。控え = 受信通知 PDF を保存。30分・費用 0。PAY.JP 本番申請の必須書類（Stripe 承認でも青色申告・屋号口座・取扱店の請求書に使えて無駄にならない） | 9/26 | 未提出なら PAY.JP 申請不可 → 10/3 判定なし時は自動的に「10/24 決済なし告知」の分岐に入る |
| 10 | **無料付与の相手**（09-07 追加） | ソフトローンチ協力のブリーダー 2 名（#3 と同一で可）に、9/21 の DM と同時に管理画面「無料付与」（`admin.html` の `granted`）で 3 か月。本告知後は他者投稿 最初の 5 人と写真提供者にも同じ操作。各 10分 | 9/21 | 相手がいなければ付与なし（About の会員一覧は非表示のまま） |

継続（変更なし）: 再調査リクエストの処理（週2回・日水、各15分。会員は48時間以内）／ テストデータ・Platycerium 削除（T36、9/10、0.25h）／ SNS「今日の一葉」週3回（T29 完成後はコピペ）／ 10月の営業（専門店3店、本告知 +2週）／ 楽天アフィリ ID 連携（10月末、20分）。
質問しないもの（既定で進む）: 棚の概念、告知の順序、splendidum の表記、個体区分6択、Chandra・Space Hijau の表示、'Mystique A88' 'Galaxy' の区分、出典書籍の手持ち。**09-07 追加**: 採集者の IPNI 準拠、Chocó の NULL、'Dark Mama' の記録なし化、共有カードの書体と「AI・% なし」、棚の延期、用語集の置き場所、GA イベント名、開業届の屋号。

---

## 8. 次回の議題（10月上旬）

- Stripe/PAY.JP の稼働と初売上、9月末 KPI 実測（PV・登録・収録数・Search Console）
- 再調査リクエストの件数・処理日数・AI コスト実績（15回/日で足りているか）
- 20件追加後の検索流入、`/names/` の index 状況
- Monstera 公開の Go/No-Go、Philodendron の Hybrid 化結果
- スキーマ Phase B 着手、版画変換の試作結果、取扱店の営業結果と DM 文面
- 投票の累計（10票未満なら撤去判断）、ラベル印刷の利用数
- **09-05b 追加**: ローンチ実績（7日/30日 KPI、指摘件数、被リンク）／ `share_click` channel 別（90日で 5% 未満は撤去）／ 棚の保存者数と会員転換（11月末: <10人 かつ 0 で休止）／ Amazon 申請可否（楽天+Yahoo! `affiliate_click` 2ヶ月連続 ≥60）／ トップ道具棚の再検討条件（≥100 + 成約）／ `/seedlings/` 索引の要否（実生 ≥20・投稿者 ≥5）／ ヘッダー EN（非 ja ≥15%）／ ユーザー名検索（登録 >50・投稿者 ≥5）
- **09-07 追加**: T28b 棚の着手判断（`share_click`・`label_print` 実測）／ `search_zero` と `genus_requests.kind='name'` の集計 → 次の 20 件の収録順／ `granted` 付与者数と About 会員一覧／ 訂正の可視化の形（指摘の実例から）／ T39 後の合格数（目標 29/31 → T24 後 ≥45）／ 初週の判断線（monetization §4-3）の実測

---

## 8b. 2026-09-05 追加実装（会議後）

- **セキュリティ**: 匿名ユーザーが全品種を改ざん・全画像を削除できる RLS の穴を発見し即日修正（migration 20260905110000）。書き込みは所有者/admin のみ、anon はテーブル権限も剥奪。
- **非公開の実生**（オーナー要望）: `is_private` 列、所有者だけに見える RLS、RPC の明示フィルタ、投稿フォームのチェックボックス、詳細ページの切替、静的生成・sitemap・OGP からの除外。無料枠5件には非公開もカウント。
- **AI再調査リクエスト**: 登録時1回は無料、以後は無料の承認制（`research_requests` テーブル、管理画面で承認/却下）。由来調査の有料販売は取り下げ。

- **AI調査の対象（09-05 オーナー決定）**: 原種（登録前の「AI自動記入」）とクローン（登録時に自動1回）のみ。ハイブリッドは投稿内容をそのまま掲載し、承認制リクエストのときだけ調査。実生は対象外（サーバー側で400を返す）。理由: 実測でハイブリッド/実生のAI記録は信頼度20〜30の汎用文にとどまり、費用に見合わないため。

## 9. 決定履歴

- **2026-09-07（第4回）**: オーナー「Stripe 承認まで聞かずに入れる・削る」→ 確認質問なしで裁定。採集者は IPNI 型データ一致に統一（前回の [要確認]→NULL を上書き、記入 5・NULL 5、Chocó は NULL）。ゲート G1〜G9 採用（AI 下書きのみは記録なし、'Dark Mama' の AI 本文削除 + `formula_status='disputed'`）。共有画像は「標本カード」（全品種同一台紙、OFL 3 書体、AI・信頼度% なし、トップ15 先行、9/19 前倒し）。T28 を分割（ラベル印刷 T28a は告知前 9/26、棚 T28b は本告知 +2 週）。完了帯は品種ページに 1 回だけ。削除統合 10 点（詳細ページ道具棚非表示・ガイド 5 見出し・Trial 残骸・標題バッジ行・重複スタブ・paywall 1 ボタン・黒ボタン → mono 1 行・h2 画像・個体 0 件・'Dark Mama' AI）。content A/B/C/E 採用、D は告知後。`granted` 無料付与・`t30-member-plan` ブランチ・GA 6 本・開業届 9/26 を採用。用語集 8 語採用。新規 T39〜T43、T27/T28 分割、T29 前倒し、T20 完了。design D1 描画バグは会議中に本番修正。オーナー依頼は 6 件（Stripe・開業届・無料付与・写真・実機 3 回・シード投稿）。
- **2026-09-05（第3回・同日2回目）**: オーナー差し戻し — 「サイトは植物界隈に未告知だったので利用者ゼロは当然」。**第2回の削除根拠「利用0件」は無効**とし、削除済み11項目を告知後の行動・金額・正確性で再判定: Facebook 共有のみ復活（PC 専用、channel 計測、90日 5% ルール）、お気に入りは「棚（栽培株）」として T28 で別の形（localStorage・ログイン不要）、トップ実生区画は削除維持だが新着記録の実生除外バグを修正（条件到達で `/seedlings/` 索引）、Amazon は出典書籍限定の条件付き（12月レビュー、いまは書誌欄）、LINE 共有・画像投票・道具棚・AdSense・ユーザー名検索は理由を差し替えて削除維持、状態列は3値、EN はフッター維持 + 言語既定反転 + masthead リンク、YouTube 検索は保留。**ローンチ計画を確定**: ソフト 9/21〜10/2、本告知は必須ゲート M1〜M10 全達成の翌土曜 20:00（目標 10/3、上限 10/24。決済稼働と記載種の検証済 100% を必須に含め、10/24 は決済のみ未達でも告知）。Stripe 10/3 判定なしで T30 先行 + PAY.JP。告知前の正確性ルール（採集者・分布・出典0件・原種本文の由来文化・人物典拠表・写真 by-line）を採択、T21b・T37・T38 追加、T23 の順序差し替え、T29 前倒し。オーナー確認は8件に圧縮（各に既定回答）。第2回の料金・AI 調査範囲・非公開実生・Platycerium などは変更なし。
- **2026-09-05（第2回）**: オーナーが製品・事業判断をボードに委任。**由来調査の有料化は却下（オーナー）** → 登録時無料1回 + 無料の再調査リクエスト（承認制）。有料は **会員 月500/年5,000 の1プラン**に統合し 240/2,500 を廃止（Stripe 判定翌日に切替、審査中は法務ページを触らない）。「支援者」→「会員」、特典は実在する4つ。月1万円の数式を 会員12 + 取扱店3 + アフィリで再構成。削除: お気に入り・画像投票・トップ道具棚・トップ実生区画・AdSense 枠・YouTube 検索・ユーザー名検索・Amazon・`trial-reminder`・Platycerium（CSV 退避）。由来投票は文字化して残す。EN 切替はフッター、英語補完凍結。品質ゲート・低信頼折り畳み・管理者のみの検証済印・Phase A 残の順番（P1→P5）を採択。Anthurium 20件（'Michelle' 'Zara' は Hybrid、'Black Velvet' は alias）。標本ラベル印刷は決済稼働までログイン全員に無料開放。定義文 JP/EN 確定。実装順 T20→T36。
- **2026-09-05（朝）**: オーナー決定「PAY.JP の前に Stripe へ最後の申請」。料金・特商法・規約を整備し Stripe 決済を復旧、申請提出。特商法の所在地・電話は非公開。
- **2026-09-04（夜）**: 未記載種の調査経路と出典ドメインによる Tier 判定（antolakii 23→67）。GBIF 照合の取りこぼし修正。
- **2026-09-04（同日追記）**: Field Archive 本番反映。「クオリティを課金より先に」で課金系を後回し。データ修正・Phase A・人物・系統図・産地・用語集をデプロイ。'King of Spades' Clone、'Angels dream' 綴り維持。
- **2026-09-04（第1回）**: 目標 月1万円を12月末に設定。閲覧永久無料。4区分・ICNCP 表記・スキーマ2段階。育て方は書かない。9月コンテンツ順。Field Archive 採択。Monstera 10月、Platycerium 保留。（支援者2プラン・有料由来調査 500円・AdSense 条件付き再検討は 09-05 で上書き）
