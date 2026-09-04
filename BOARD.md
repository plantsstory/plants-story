# BOARD.md — Aroid Origins 常設ボード 決定台帳

最終更新: 2026-09-04（第1回会議）。これが「現行の決定事項」の唯一の台帳。会議録は `docs/board/YYYY-MM-DD.md`、各担当の詳細は `docs/board/2026-09-04-{monetization,taxonomy,content,design}.md`。
運営: オーナー（個人のアロイド栽培家、開発しない）／ 開発: Claude Code。判断基準は `.claude/agents/product-owner.md`（①売上直結 ②由来の正確性＝信頼 ③1セッションで終わる ④可逆）。

---

## 1. 目標と KPI

- 短期目標: **月1万円**（サブスク + 単発 + 掲載料 + アフィリ）を **2026年12月末** までに。中期: 日本語圏でアロイド由来情報の第一参照先。
- 月1万円の数式（12月時点の想定）: 支援者 500円×8人 = 4,000 ／ 由来調査 500円×4件 = 2,000 ／ ショップ掲載 1,000円×2店 = 2,000 ／ アフィリ 1,500 ／ 実生 240円×2人 = 480 → **約1万円**。「240円×42人」は追わない。
- 現状（2026-09-04）: 売上 ¥0、登録 6人、有料 0人、公開 Anthurium 29件 + 実生 2件、非公開 38件、写真 40枚、PAY.JP キー未設定。

| KPI | 9月末 | 12月末 | 見る場所 |
|---|---|---|---|
| PAY.JP 本番稼働 | 稼働 | — | 決済が「準備中」でない |
| 有料会員（支援者+実生） | 2人 | 10人 | `subscriptions` |
| 登録ユーザー | 20人 | 60人 | `profiles` |
| 月間PV | 3,000 | 8,000 | GA4 |
| affiliate_click | 60/月 | 200/月 | GA4 |
| 人物ページの index 登録 | 10本 | 20本 | Search Console |
| 売上 | 1,000円 | 10,000円/月 | PAY.JP + 楽天レポート |

---

## 2. 課金・料金の決定

| 項目 | 決定 | 状態 |
|---|---|---|
| 閲覧 | **永久無料**。由来本文・写真ともペイウォールなし（SEO と信頼が商品価値） | 決定 09-04 |
| 実生プラン | 月240円 / 年2,500円（実生6件目以降の投稿）。価格据え置き | 実装済（Stripe Checkout / PAY.JP 両対応、`window._PAYMENT_PROVIDER`）・本番キー待ち |
| **支援者（Supporter）プラン** | **月500円 / 年5,000円**（年額は「2ヶ月分無料」表記）。特典: 支援者バッジ、About の支援者一覧（任意）、実生投稿無制限、標本ラベル印刷、非公開属の先行閲覧、将来の広告非表示 | 9月実装、キー待ち |
| 由来調査リクエスト（単発） | 500円。有料は7日以内回答、無料会員は順番待ち。着手後キャンセル不可。結果は公開（コンテンツにもなる） | 10月開始 |
| 取扱ショップ掲載枠 | 1,000円/月/店、初回3ヶ月無料、「PR」明記 | 10月営業開始 |
| AdSense | **やらない**（月2万PV超で品種ページ最下部1枠のみ再検討）。プレースホルダは非表示のまま | 決定 09-04 |
| Amazon アソシエイト | 月2,000PV超まで登録しない（180日3件ルール）。楽天・Yahoo!(VC) が主軸 | 決定 09-04 |
| やらない | 無料トライアル、Stripe 再移行、自社EC（苗販売）、値上げのみで1万円 | 決定 09-04 |

**決済事業者の順番（09-05 オーナー決定）**: PAY.JP の前に **Stripe に最後の申請**をする。サイトは Stripe 審査向けに整備済み（/pricing/ 料金とサービス内容、特商法の販売業者を個人名＋屋号、返金条件、規約・プライバシーの決済事業者を Stripe に）。Stripe 関数（create-checkout / create-portal / stripe-webhook）を復旧・デプロイ済み、PAY.JP 関数は温存。申請手順・入力文面・再審査依頼文は `docs/stripe-application.md`。承認されなければ `_PAYMENT_PROVIDER` を payjp に戻して PAY.JP へ。

法務・規約: 申込最終確認画面（特商法12条の6）は対応済（09-04）。支援者プラン追加時に規約9条の2・特商法「販売価格」を追記。由来調査追加時に「引渡時期7日以内」「着手後キャンセル不可」を追記。商品カード見出し直下に「PR / アフィリエイトリンクを含みます」を常時表示。楽天画像は楽天ボタンにのみ紐付ける（他社リンクの装飾に使わない）。

---

## 3. 分類・命名の決定

**区分は 4 値のまま**（原種 / Hybrid / Clone / Seedling）。追加しない。唯一の判定軸: **「その名前を名乗る株は、1個体の栄養繁殖（株分け・TC）由来だけか（→ Clone）、複数の遺伝的に異なる個体を含むか（→ Hybrid）」**。

| 区分 | 定義の要点 | 名前の書き方 |
|---|---|---|
| 原種 Species | 自然界の種。記載種のほか sp. / aff. / cf. / ssp. / var. を含む。人が交配した株は同種どうしでも原種ではない | *Anthurium crystallinum* ／ *Anthurium* sp. "Peru" |
| Hybrid | 特定の交配式から得た**実生群**の名前。同名の兄弟株が複数ある。交配式必須（不明・複合交配は可） | *Anthurium* 'Mystique A88' |
| Clone | **1個体**の名前。その個体の株分け・TC 由来だけが名乗れる。単一原種由来なら種小名必須 | *Monstera deliciosa* 'Thai Constellation' ／ *Anthurium* 'Ace of Spades' |
| Seedling | 自分の播種記録。名前なし、交配式 + 播種日で識別。命名・配布するなら新規 Clone を登録してリンク | *Anthurium forgetii* × 'Titanium' |

決定フロー: 学名（属+種小名、sp./aff./cf. 含む）→ 原種 ／ 'クォート'名で「種から増やしても同名で売られている」→ Hybrid、売られていない → Clone ／ 名前なし → Seedling。

表記ルール（ICNCP 準拠）: 属名・種小名はイタリック、修飾子（sp. aff. cf.）はローマン + 半角スペース、栽培品種名は **半角シングルクォート・各語頭大文字**、非公式名・管理番号・産地は **ダブルクォート**、交配式は `母 × 父`（× は U+00D7、前後スペース）、異名・旧綴りは `aliases`、和名は `japanese_name`（10月）、英語 UI は Species / Hybrid / Clone / Seedling（"Original species" は使わない）、由来文にサイズ・生育速度を書かない、不明は NULL（表示で「不明」）、推測名を作らない。

**未記載種・非公式名の扱い（09-04 決定）**: IPNI/POWO/GBIF に無い名前は「未記載種 / 暫定名 / 未解決」として登録し、記載者・発表年・タイプ産地は空欄のまま（捏造しない）。代わりに **名前の状態・報告産地・近縁種・導入者・流通名・名前の由来** を記録する。情報源は A 学術誌 → B IAS・Vannini 等の専門家記事（aroid.org / exoticrainforest / exoticaesoterica）→ C 導入ナーセリー・ブリーダー本人の発信・複数の独立したコレクター証言、の順で採用し、**Tier は実際に引用した URL のドメインから機械的に決める**（モデルの自己申告より下げることはあっても上げない）。マーケットプレイスと匿名ブログは不採用。実装: research-origin の `buildUndescribedSpeciesPrompt` / `tierFromUrls`。例: *A.* "antolakii"（Vannini & Croat ined.、BVEP、aff. papillilaminum、Tier B 67）。

「種小名必須」ルールの適用範囲: **単一の原種に由来する品種のみ必須**。種間交配・親不明の Clone/Hybrid は属名 + '名前'。

スキーマ: **Phase A（9月）** `cultivars` に NULL 許容で追加 — `species_qualifier`, `aliases[]`, `tags[]`, `name_status`, `locality`, `parent_a_id/parent_b_id`, `parent_a_text/parent_b_text`, `formula_status`, `selected_from_id`。バッジは `species_qualifier` から表示、`structured.origin_type` は廃止し `cultivars.type` を正とする。**Phase B（10月）** `species_epithet`, `cultivar_epithet`, `display_name`, `propagation`, `japanese_name` と投稿フォームの分割入力（属 / 種小名 / 修飾子 / 品種名 / 管理番号）。

既定回答（★はオーナー未確認、異論なければ確定）: ★Glorious / Splendid / Majestic → Hybrid（IAS 登録簿どおり）／ ★'Dark Mama' → `name_status=disputed` で両説併記 ／ 未同定株は `sp. "Peru"`（ダブルクォート）／ Seedling→Clone 昇格は新規 Clone 登録 + `selected_from_id` ／ ★'Albo Variegata' 'Aurea' は Clone のまま tag `variegata`+`line`、本文に「複数変異の総称」と明記 ／ Platycerium は分類ルール同一、公開は保留。**オーナー回答（09-04）**: 'King of Spades' はオリジナル個体があるので **Clone**（流通株は F 個体＝オリジナルの実生。同名で流通していてもクローンではない）。→ 一般則: **名前はオリジナル個体を指す。実生流通があっても Clone のまま、tag `line` で「実生流通あり」を表す**。'Angels dream' も **現状の綴りのまま**（オーナー回答 09-04）。

---

## 4. コンテンツ方針

- **育て方は書かない**（競合が強く、誤情報が由来の信頼に波及）。「自生地の環境」（標高・雲霧林・着生）は由来として書き、そこにアフィリを文脈化する。相場は扱わない。
- 勝ち筋: 記載者・発表年・タイプ産地・採集者・交配式・出典。日本語圏に無い「人物」「系統図」「産地」「由来語彙の用語集」「誤称・別名」で取る。
- 9月の制作順（Claude Code）: ①人物ページ `/people/` → ②交配系統図 + 派生品種 → ③産地ページ `/locality/` → ④用語集 `/glossary/` → ⑤誤称・別名ページ → ⑥英語補完（`body_en` 欠損4件・hreflang）。
- 10月: **Monstera 公開**（9月中に obliqua "Peru" / 'Burle Marx's Flame' / Albo / Aurea のデータ修正を完了してから）、Philodendron は 3件の Hybrid 化と rubrijuvenile 修正後に公開判断、検索されているが未収録の Anthurium 8種（'Dorayaki' 'BVIT' 'Black Velvet' hookeri villenaorum 'Michelle' 'RVDP' 'Zara'）。Platycerium は保留（アロイドでない）。
- 投稿者の報酬設計: 投稿するとブリーダーの人物ページが自動生成され系統図に載る（フォーム冒頭に明記）、実生 OGP に交配式・播種日・作出者を焼き込む、投稿完了画面に X / Instagram 用テキストコピー。
- 存命ブリーダーの表記: 本人が店舗・SNS で公開している名義（Instagram ハンドル可）のみ。実名は本人公開のものに限る。
- SNS: Instagram が主戦場。オーナーが週3回「今日の一葉」を手動投稿（テンプレは content レポート §4）。自動化は次フェーズ。
- 空ページ（写真なし・由来薄）は「未収録」ラベル + 投稿 CTA に変える（投稿導線化）。

---

## 5. デザイン方針（Field Archive の要点）

- 世界観: 紙（`--color-paper`）・インク・罫線。masthead / 今日の一葉 / 索引（産地・人物・種別）/ 記載年表 / 台帳表。詳細は標本ラベル（`.specimen`）+ 関連品種（親・子・同産地・同人物・前後）。
- 禁止: 絵文字アイコン、グラデーション、浮き上がる影、5色 tier バッジ、パステル、汎用カードグリッド、旧パレット生 HEX（#1B4332 等）。ラベルは mono、区切りは ink 1px。
- 図版: **AI 生成の植物イラストは不採用**。オーナー写真の版画変換（まず CSS `grayscale+contrast+multiply` で試作、良ければ canvas パイプライン）。写真がない品種は「図版未収録」の点線ラベル。
- モバイル: タップ領域 44px（`pointer: coarse`）、年表の軸は ≤700px で非表示（案A）、索引は6件で折り畳み、台帳の信頼度バーは % のみ。
- 決定した文言: バッジ「原種」（英語 UI は "Species"）、属タブ「収録品種 / 実生ノート」、空状態「図版未収録 — 写真を提供する」「記録未収録 — 記録を追加する」、About の使命文は黒板でなく引用文スタイル。
- 標準手順: **見た目の変更は本番反映前にオーナーがプレビュー確認**（iPhone 実機推奨）。CSS/JS 変更時はキャッシュバスター 12 箇所 + `sw.js` の `ASSET_VERSION` を更新。決済モーダルはテストキーで表示のみ確認。
- 実装順: 今週 G1 G2 M1〜M4 D1 D8（CSS 中心）→ G5〜G7 P1 D2 → F2〜F6 W1 → 図版パイプライン A / 標本ラベル印刷 B → admin 上書き層 A1。

---

## 6. 未完了タスク（担当・期限）

| ID | タスク | 担当 | 期限 | 効果 |
|---|---|---|---|---|
| T1 | Field Archive をプレビューに出す + 今週分 CSS（G1 G2 M1〜M4 D1 D8）を同梱 → オーナー承認 → push・デプロイ。**09-04: プレビュー画像送付済・CSS 同梱済（ローカル commit 029796e 以降）。残りはオーナー承認 → push のみ** | Claude Code → オーナー承認 | 9/7 | 全施策の土台 |
| T2 | **完了 09-04**（22件適用: 名称11・区分3・本文・NULL化・プレースホルダ削除・親リンク） 分類データ一括修正 [即]18項目（名前9・区分2・本文6・構造8）+ `"null"` 文字列→NULL + プレースホルダ記録削除 + `forms.js:1274` の合成修正 + × 正規化 | Claude Code | 9/10 | 信頼（判断基準②） |
| T3 | **列追加・親リンク名寄せ 09-04、origin_type バッジ廃止 09-04、投稿フォームの分割入力（種小名／分類／品種名／産地・管理番号→登録名を自動生成）09-05 完了**。残: バッジを `species_qualifier` 参照、投稿時に新列（qualifier/locality）へ保存 | スキーマ Phase A | Claude Code | 9/14 | 系統図の前提 |
| T4 | 支援者プランのコード側（プランID設定箇所、モーダルのプラン選択、成功画面に「バッジ表示・解約はここ」、規約9条の2・特商法追記）+ PR 表記 + 楽天画像の紐付け修正 | Claude Code | 9/12 | キー投入日に即売上化 |
| T5 | **完了 09-04**（伝記は書かず事実の要約のみ） 人物ページ `/people/`（静的スタブ・JSON-LD・関連品種）+ sitemap | Claude Code | 9/17 | 回遊・被リンク・投稿者獲得 |
| T6 | **系統図・逆引きは完了 09-04**。残: 実生 OGP に交配式 | 交配系統図 | Claude Code | 9/19 | 日本語圏に無いコンテンツ |
| T7 | アフィリ文脈化（`affiliates.genus/tags`、属・タイプ別出し分け）+ Admin にファネル（paywall_view→subscribe_success）と商品別 affiliate_click 集計 | Claude Code | 9/21 | アフィリ +1,500円/月 |
| T8 | **完了**（産地ページ・用語集 09-04、由来本文と今日の一葉の用語自動リンク 09-05） | 産地ページ `/locality/` + 用語集 `/glossary/` | Claude Code | 9/26 | ロングテール |
| T9 | 誤称・別名ページ + 英語補完 + 投稿完了画面のシェアボタン + 下書き保存（F6） | Claude Code | 9/30 | 購入前検索・投稿摩擦減 |
| T10 | 標本ラベル印刷（print.css、詳細ページ「ラベルを印刷」）— 支援者・実生の特典 | Claude Code | 9/30 | 特典・SNS 露出 |
| T11 | 由来調査リクエスト（フォーム・PAY.JP Charge・Admin キュー・規約追記） | Claude Code | 10/10 | +2,000円/月 |
| T12 | デザイン第2弾（G5〜G7 P1 D2 F2〜F5 W1）→ プレビュー | Claude Code | 10月 | 世界観統一 |
| T13 | Monstera 公開（`is_visible` + sitemap + 発表年補完）、Philodendron 判断 | Claude Code（オーナー承認後） | 10月 | PV 拡大 |
| T14 | テストデータ削除の SQL 用意（画像テーブル `Anthurium テスト`、`debilis` 重複） | Claude Code 用意 → オーナー実行 | 9/10 | canonical 整理 |

---

## 7. オーナー待ちタスク（手順つき）

1. **Field Archive の承認**（15分・最優先）: Claude Code が出すプレビュー URL を PC と iPhone で見る → トップ / 品種詳細 / 属ページ / 投稿フォーム の4画面 → 「OK」または気になる点を箇条書きで返信。これが無いと本番は旧デザインのまま。
2. **Stripe 申請（PAY.JP より先）** — **09-05: 「ウェブサイトに関する情報」タスクを提出済み（決済・入金は 2026-04-01 から一時停止中）。2〜3日待ってステータスが変わらなければサポートへ問い合わせ（docs/stripe-application.md の 5 番）。承認後は 4 番の設定と鍵の受け渡し。**（30分 + 審査）: `docs/stripe-application.md` §0 でアカウントの状態を確認 → §2 の文面で入力・提出（制限中なら要求情報の提出、却下なら §4 の再審査依頼）→ 承認後 §3 の設定と鍵の受け渡し。特商法の所在地・電話番号は **非公開（請求があれば開示）で確定（09-05 オーナー回答）**。Stripe から掲載を求められた場合のみ再検討。
2b. **PAY.JP 本番化（Stripe 不承認の場合のみ）**（申請30分 + 審査待ち）: pay.jp でアカウント作成 → 本人確認・住所・特商法 URL `https://plantsstory.com/tokushoho/` を提出 → 審査通過後、ダッシュボードで **プラン4つ**を作成（`monthly` 240円 / `annual` 2,500円 / `supporter_monthly` 500円 / `supporter_annual` 5,000円）→ 公開鍵・秘密鍵・プランIDを **チャットに貼らず** Supabase Secrets と `app-core.js` 設定に入れる（画面共有で Claude Code が案内）。テストキーで表示確認 → 本番キー。
3. **分類の2件回答**（5分）: (a) 回答済: Clone のまま (b) 回答済: 'Angels dream' は現状のまま。あわせて §3 の ★既定回答に異論があれば。
4. **写真**（1〜2時間）: 図版用の葉写真 6〜10 枚（自撮影、長辺 2000px 以上、葉1枚正面、無地背景）— 優先 crystallinum / clarinervium / veitchii / warocqueanum / magnificum + 交配種 2〜3。写真なし原種（clarinervium, regale, luxurians, moronense, nutibarense, sagittatum）は手元の株だけでよい。`images/anthurium.png` と `images/og-default.png` の出所（自作か AI か）を一言で。
5. **シード投稿**（1〜2時間、T3 完了後）: 自分の実生 5件以上 + 流通の多い交配種 5件（'Dorayaki' 'BVIT' 'Black Velvet' 'Michelle' 'RVDP'）。AI 由来調査後に明らかな誤りだけ直す。空の系統図には誰も載りたがらない。
6. **アフィリ口座**（20分）: 楽天アフィリエイトで楽天カード or 楽天銀行と ID 連携（3,001円超の受取に必要）→ LED・温湿度計・ヒーターマット・アロイド用土のリンクを楽天リンク生成で発行し Admin から登録。Yahoo!(ValueCommerce) の既存リンクが有効か管理画面で確認。
7. **SNS**（週30分）: Instagram / X のアカウント有無を確認 → 週3回「今日の一葉」をテンプレで投稿 → 人物ページ完成後 @hare_anthurium に連絡、知人ブリーダー 2名に「系統図に載せませんか」。
8. **10月の営業**（準備は Claude Code）: 国内アロイド専門店 3〜5店へ「品種ページ取扱店枠（3ヶ月無料）」の DM。
9. **テストデータ削除**（5分）: T14 の SQL/手順どおり管理画面から削除。

---

## 8. 次回の議題（10月上旬）

- PAY.JP 稼働の有無と初売上 ／ 9月末 KPI の実測（PV・登録・affiliate_click・Search Console）
- 支援者プランの初期反応、由来調査リクエストの開始判断
- Monstera 公開の Go/No-Go、Philodendron の Hybrid 化結果、Platycerium の扱い
- スキーマ Phase B（投稿フォーム分割・`display_name`・`japanese_name`）の着手
- 図版パイプライン A の CSS 試作結果と本実装の可否
- ショップ営業の DM 文面と候補店
- 検索されている未収録 8種の追加

---

## 9. 決定履歴

- **2026-09-05**: オーナー決定「PAY.JP の前に Stripe へ最後の申請」。サイトを Stripe 審査向けに整備し（料金ページ・特商法・規約・返金条件）、Stripe 決済を復旧して本番デプロイ。申請パック docs/stripe-application.md。
- **2026-09-04（夜）**: 未記載種・非公式名の調査経路と出典ドメインによる Tier 判定を導入（antolakii 23→67）。GBIF 照合の取りこぼし（rubrijuvenile）を修正。
- **2026-09-04（同日追記）**: オーナー承認で Field Archive を本番反映。オーナー方針「開業届・PAY.JP より先にクオリティ」を受け、課金系 T4/T11 は後回し。T2 データ修正・スキーマ Phase A・人物ページ・系統図・産地索引・用語集を同日デプロイ。'King of Spades' は Clone 確定（名前はオリジナル個体を指す一般則）、'Angels dream' は綴り現状維持。
- **2026-09-04（第1回）**: 目標 月1万円を12月末に設定。閲覧永久無料を確定。支援者プラン 500/5,000円を新設決定。由来調査リクエスト 500円・ショップ掲載 1,000円/月を10月開始と決定。AdSense・Amazon は当面見送り。4区分維持と判定軸・ICNCP 表記ルール・スキーマ2段階を採択。育て方は書かない。9月コンテンツ順（人物→系統図→産地→用語集→誤称→英語）。Field Archive をサイトのデザイン方針として採択（本番反映はオーナー承認後）。Monstera 公開は10月、Platycerium は保留。
