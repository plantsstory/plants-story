# BOARD.md — Aroid Origins 常設ボード 決定台帳

最終更新: 2026-10-07（第8回会議「告知前の総点検」）。これが「現行の決定事項」の唯一の台帳。会議録は `docs/board/YYYY-MM-DD.md`（第3回は `2026-09-05b.md`、第4回は `2026-09-07.md`、第5回は `2026-09-30.md`、第6回は `2026-10-03.md`、第7回は `2026-10-07-decisions.md`、第8回は `2026-10-07b-decisions.md`）、各担当の詳細は `docs/board/2026-09-05-{monetization,taxonomy,content,design}.md`、`2026-09-05b-*.md`、`2026-09-07-*.md`、`2026-10-07-*.md`、`2026-10-07b-*.md`。
運営: オーナー（個人のアロイド栽培家、開発しない）／ 開発: Claude Code。判断基準は `.claude/agents/product-owner.md`（①売上直結 ②由来の正確性＝信頼 ③1セッションで終わる ④可逆）。
**オーナー委任（09-05）**: 「何を削り、何を増やすか、料金や何を有料にするか」はボードが決める。オーナーに聞くのは本人にしかできない作業だけ。**オーナー指示（上書き）**: 由来調査の有料化はしない／住所・電話は非公開／AI 生成の植物図版は不採用／品質を決済より先に／**Stripe は放置し PAY.JP を開業届の直後に申請（09-30）**／**園芸道具のページ（楽天・Yahoo!・Amazon、ジャンル別検索、一覧 → 商品説明）を作る（09-30 オーナー指示 → 「道具の目録」§2・§2-3・T44〜T47）**／Amazon はもしもアフィリエイト経由（09-30）。

---

## 0. サイトの定義文（09-05 確定。masthead・About・og:description・meta description に共通使用）

- JP: **「誰が、いつ、どこで名付けたか — アロイドの由来を出典つきで記録する図鑑。」**
- EN: **"Who named it, when, and where — a sourced archive of aroid origins."**

---

## 1. 目標と KPI

- 短期目標: **月1万円**（会員 + 取扱店掲載 + アフィリ）を **2026年12月末** までに。中期: 日本語圏でアロイド由来情報の第一参照先。
- 月1万円の数式（12月、アクティブ ≤100人前提、**由来調査の販売は含めない**。09-30 再確認、構成は不変）: 会員 500円×12人（月10 + 年2の月割）≈ 5,800（**PAY.JP または Stripe の稼働が前提**）／ 取扱店掲載 1,000円×3店 = 3,000（**銀行振込・決済代行なし。決済と独立して立つ**）／ アフィリ ≈ 500（楽天 + Yahoo! + Amazon もしも。道具の目録と文脈行の合計。**上限 1,000円で月1万円の柱にはしない** — PV 8,000 で 175〜740円の試算、1万円には PV 40,000〜50,000 が必要）→ **約9,300〜10,000円**。**最悪ケース（決済が12月まで不稼働）は 3,500円/月**。不足分は年額会員の前払い（5,000円/人）で現金ベースでは埋まる。11月末レビューで会員5人未満なら 12月目標を 1月末へ後ろ倒し（価格は動かさない）。**会員12人には累計来訪 ≈2,500人が前提**（本告知 1,000 + 検索流入 500/月 × 3。転換: 来訪→ログイン 4〜6%、ログイン→会員 8%、年額比率 30%）。
- 原価: AI 調査 ≤1,500円/月、決済手数料 ≈ 200〜350円/月（PAY.JP 3.3% / Stripe 3.6%）。取扱店（振込）・アフィリは手数料 0。
- 現状（2026-09-05）: 売上 ¥0、登録 6人（3月以降新規ゼロ）、有料 0人、公開 Anthurium 31件（原種21・Hybrid 3・Clone 5・実生2）、非公開 Monstera 11・Philodendron 9・Platycerium 18、写真 40枚/28品種、Stripe 審査中。**サイトは植物界隈に未告知**（第2回の削除根拠「利用0件」は無効 — 09-05b）。
- **現状（2026-09-30）**: 9/8〜9/29 の実装ゼロ（T27a・T29a・T30 の 3 ブランチが 48h 規則を過ぎて滞留）。公開 Anthurium 31件のまま（T24 未着手）、検証列なし（T26 未着手）、登録 6人、売上 ¥0、決済未稼働（Stripe 25日不動）、告知未実施。9月末 KPI は全項目未達。`affiliates` 7件の Amazon 欄は旧・直接契約リンクのまま（もしも未反映）、Yahoo! の `yahoo.jp` は Yahoo!ショッピングのアフィリエイトリンク（`affiliate.shopping.yahoo.co.jp/shp-entry`、実測）。属ページに道具棚 7商品が出ている（§2 違反、T44 で削除）。
- **現状（2026-10-03、第6回）**: 売上 ¥0、決済未稼働（開業届は本日、PAY.JP 申請 10/5 予定）。公開 Anthurium 31 件（合格 29）。**T30 は未 merge だった**（§2・§6 の「10/2 merge」は誤記）→ 申込の全入口は本日「会員受付は準備中です」に切替（commit 154e0d9）、本番の料金・特商法・規約・About は 240/2,500・Stripe 表記のまま（T55 で改訂）。道具の目録は 10/02 オーナー指示でショップ型 + 楽天 API 自動リサーチ、40 点（使用中 0。範囲外 4 点を本日非公開 → 36 点）、URL 直打ちのみ・10/24 自動公開。スマホ実測（375px・回線を絞る）で直着地 10.6 秒白紙・写真 45.9 秒・Clone を一時「原種」と表示・画像は原寸 39 枚 52MB → 第6回の T48〜T59。
- **現状（2026-10-07、第8回）**: 売上 0 円。登録 6 人（最新は 2026-03-26）。課金 0 件。`shops` 0。道具 36 点（楽天 36・Yahoo! 6・もしも 0・書籍 0・使用中 0・品種との結び付け 0）。収録 40（原種 32・Hybrid 3・Clone 5）・検証済 27/27。写真は 40 件中 20 件。**M2 未達**（'Michelle'・'Zara'・'Dorayaki'・'Red Vein Dark Phoenix' が未登録 → T95 で 10/16 まで）。お問い合わせは通知も一覧もなく、取扱店の申込が誰にも読まれない状態（→ T81）。会員受付のお知らせの記録先なし（→ T86）。共有リンクの不具合（supabase.co の text/plain）と antolakii の描画停止は、会議前に修正済み（09015ff）。

| KPI | 10月末（09-30 に 9月末から繰り延べ） | 12月末 | 見る場所 |
|---|---|---|---|
| 決済稼働（PAY.JP または Stripe） | 稼働（開業届 10/3 → PAY.JP 申請 10/5） | — | 料金ページが「準備中」でない |
| 会員 | 1人 | 12人 | `subscriptions` |
| 取扱店掲載 | 合意 3店（初月無料） | 有料 3店 | `shops` + 振込 |
| 登録ユーザー | 15人 | 50人 | `profiles` |
| 公開 Anthurium（収録済み） | 40件 | 60件 | `cultivars` + `recordGate` |
| AI 再調査リクエスト処理 | 7日以内100% | 同 | `research_requests` |
| 月間PV | 3,000 | 8,000 | GA4 |
| 道具の目録 | 12商品・6ジャンルで公開 | 24商品・`toolGate` 合格 ≥12 | `affiliates` |
| affiliate_click | 30/月（公開後） | 100/月 | GA4（`page`・`genre`・`shop`） |
| 人物・別名ページの index 登録 | 15本 | 30本 | Search Console |
| AI 調査コスト | ≤1,500円/月 | ≤1,500円/月 | Admin の OpenAI usage |
| 売上（発生ベース） | 0〜500円 | 10,000円/月 | PAY.JP/Stripe + 振込 + 楽天・VC・もしも |
| **本告知**（§4b） | 目標 10/17（土）20:00、上限 10/24（確定日） | — | 必須ゲート M1〜M9 |
| 本告知 7日 → 30日 | PV 1,000・登録 10・他者投稿 5・share_click 30・会員 2 | PV 3,000・登録 15・会員 5・被リンク 5ドメイン | GA4 / `profiles` / Search Console |
| 来訪→ログイン率 | 4% | 6%（棚あり） | GA4 `sign_up` ÷ ユーザー |

---

## 2. 課金・料金の決定

| 項目 | 決定 | 状態 |
|---|---|---|
| 閲覧 | **永久無料**。由来本文・写真・系統図・人物・産地・用語集・別名ページともペイウォールなし | 決定 09-04 |
| 無料のまま恒久 | 品種登録 + **登録時の AI 由来調査 1回**、実生投稿 5件、**AI 再調査リクエスト**（承認制・無料）、由来の追記・修正提案、人物ページ自動生成、投票 | 決定 09-05 |
| **会員（Member）** | **月500円 / 年5,000円**（年額は「2ヶ月分無料」の mono ラベル、年額を既定選択）。**特典は実在する2つだけ（10-03 改訂）: ①実生投稿 無制限（非公開を含む） ②AI 再調査リクエストの優先審査（48時間以内に可否）**。標本ラベル印刷（T28a）・会員バッジと About の会員一覧は、実装された日に特典へ足す（それまで書かない）。名称は「会員」（英語 Member）。「支援者」「プレミアム」「Pro」「限定」「今だけ」「応援」は使わない | 決定 09-05。**10-03 訂正: 「09-30: T30 を 10/2 に本番 merge」は未実行だった**（branch `t30-member-plan` のみ・master と競合）。10-03 に申込の全入口を「会員受付は準備中です」に切替済（`_MEMBER_OPEN=false`・checkout 不呼出・GA `member_interest`、commit 154e0d9）。価格 500/5,000・特典 2 つ・法務文言は T55 で master 上に作り直す（branch は merge せず閉じる） |
| 240円 / 2,500円 実生プラン | **廃止**。**09-30: Stripe 判定待ちを終了し、10/2 の T30 merge で下記を一括改訂**。有料0人のため移行対象なし。Stripe 審査中はサイトの料金・特商法・規約（現在 240/2,500 表記）を**変更しない**（審査担当が見ているページとの相違を避ける）。判定翌日（不承認なら PAY.JP 申請前）に translations・料金ページ・特商法「販売価格」・規約9条の2・モーダル・OGP 説明・静的スタブを一括で 500/5,000 に改訂。Stripe 側は 240/2,500 の Price を作らず、承認後に 500/5,000 の Price を2本作る | 決定 09-05。**10-03: 本番はまだ 240/2,500・Stripe 表記（料金・特商法・規約・About・meta・スタブ）→ T55** |
| 由来調査の有料販売 | **やらない（オーナー決定）**。代替: 登録時 AI 調査（無料1回）→ 以後は「AI 再調査リクエスト」（無料、管理者が承認/却下、承認で実行）。管理者の出典確認は「検証済」印（§3）として無償で行う | 決定 09-05 |
| 取扱店掲載（PR） | 1,000円/月/店、**初月無料**、PR 明記、品種ページ「取扱店 — PR」欄（店名・リンク・一言）。**09-30 改訂: 自己申込 Checkout は作らない。DM → 合意 → 管理画面で `shops` 行 → 月末に請求書メール → 銀行振込**（決済代行なし・手数料 0。請求書に適格請求書発行事業者でない旨を明記）。掲載条件（期間・解約は翌月末）は規約に 1 条。営業は本告知 +1 週に 3 店。**12月末に有料0店なら廃止** | 決定 09-30。実装 10/10（T33） |
| アフィリエイト | **09-30 改訂**: 楽天（直接）・Yahoo!ショッピング（VC。`yahoo.jp` 短縮はアフィリエイトリンクと実測済み）・**Amazon（もしもアフィリエイト経由、全ジャンル可。09-05b の「削除維持・条件付き」は目的＝180日3件ルールの回避が消えたため廃止）**。経路は揃えない（確定額が 2ヶ月連続 3,000円以上で再検討）。Amazon はリンクのホストが `af.moshimo.com` のときだけ描画（旧 amzn.to・直接契約リンクは出さない）、href は 1 文字も変えない、imp 1px 画像を lazy なしで併置、CSP `img-src` に `https://i.moshimo.com`。かんたんリンク・script 型ウィジェット・短縮・自前リダイレクタは使わない。掲載面は **道具の目録 `/tools/`（次行）+ 産地ページ + 自生地環境（着生・雲霧林・標高）が一致する原種ページの文字行 最大 2 行**（画像・カードなし）。トップ・属ページ・Hybrid/Clone/実生・人物ページには置かない。PR は h1 直下・購入リンク直上・文脈行の見出しに常時（根拠は Amazon 運営規約・各 ASP 規約・読者の信頼）。期待 +500円/月（上限 1,000円、上方修正しない） | 決定 09-30 |
| **道具の目録**（09-30 新設、オーナー指示） | `/tools/`（目録）+ `/tools/<slug>/`（道具の 1 頁）。ジャンル 9 本（§2-3）。一覧は写真なしの台帳、詳細に図版 1 枚（自前写真 → 楽天画像を楽天リンクで包む → `.sheet--plate`）。掲載はオーナーが実際に使っている物だけ（書籍は当サイトの出典に現れる本）。価格は帯のみ。`toolGate` 合格のみ index。公開は本告知の翌週土曜（12商品・6ジャンル以上）。撤退線: 12月末に `/tools/` 経由 `affiliate_click` <30/月 かつ成約 0 → 書籍以外を休止（`is_published=false`、削除しない） | 決定 09-30。T44〜T47。**10-02 オーナー指示で上書き（T46 行）: ショップ型（画像カード・価格・ストアリンク）+ 楽天 API 自動リサーチ。「使っている物だけ」は廃止し、運営者の物は「使用中」印。10-03: 範囲外 4 点を非公開（40 → 36 点）・名前訂正 12、使用中 0 点、10/24 自動公開は維持（T58）** |
| AI 調査コスト | §2-1 参照 | 決定 09-05 |
| AdSense | やらない。プレースホルダ DOM・i18n キー・プライバシーポリシーの「導入予定」を削除 | 決定 09-05 |
| やらない | 無料トライアル、値上げのみで1万円、自社EC、PDF/API、980円サブスク、人物ページの有料掲載、会員への検証権限付与 | 決定 09-05 |
| 価格据え置き | **2027-02 まで改訂しない** | 決定 09-05 |
| **会員受付のお知らせ名簿**（10-07b） | `member_interest` に、本人がボタンで入る（未ログインはログインの後）。文言「登録したメールアドレスに、受付開始を 1 回だけお知らせします」。プライバシー 5 条に利用目的を追記。一斉送信は Secrets の承認フラグ（オーナー承認後に設定）・管理者ボタン・`notified_at` の 3 つが揃わないと動かない。宣伝メールにはしない | 決定 10-07b。T86 |
| **振込の年額会員**（10-07b） | 年 5,000 円・前払い・自動更新なし。最終確認画面（12 条の 6）→ `member_orders` → オーナーが請求書 → 入金確認で `subscriptions`（plan `annual_transfer`）。**開く条件: 10/31 に PAY.JP 未承認 かつ お知らせ名簿 ≥3 人 → 11/1 に開く**。PAY.JP が稼働したら閉じる（申込済みの人は期間満了まで有効）。特商法・規約 9 条の 2 の追記は、開くときだけ表示 | 決定 10-07b。T97（10/30 にスイッチを切った状態で作る） |
| **道具の文脈行**（10-07b 改訂） | 09-30 の「自生地環境が一致する原種だけ」を上書き。種ごとのデータがないため、**属レベルの 1 行**にする: 見出し「道具の目録 — PR」・「湿度・送風 · 温度 · 用土・植込み材」→ `/tools/?g=`。収録済みの原種と産地ページだけ、`catalogueOpen` のときだけ。GA は `tools_context_click`。種ごとの行は、WCVP の生活形を出典つきで取り込めたときに限って足す。同時に、取扱店が 0 店のときの「取扱店の掲載について（事業者向け）」1 行（10/24 から） | 決定 10-07b。T96 |

### 2-1. AI 調査コスト方針（09-05 改訂）

- 登録時: 1品種につき **無料で1回**自動実行（Web 検索 ≤8回/回、GBIF 照合）。
- 以後: 本人も第三者も自分では再実行できない。詳細ページの「**AI 再調査をリクエスト**」ボタン（無料・ログイン必須・理由 ≤500字）→ `research_requests` → 管理画面で承認/却下 → 承認時に実行（検索 ≤12回/回）。1品種につき open 1件、1人あたり open 3件まで（実装済 migration `20260905100000`）。会員は48時間以内、一般は7日以内に可否。
- 上限: サイト全体 **15回/日**（`RESEARCH_DAILY_CAP=15`、到達でメール通知。管理者の実行も数えるが admin は停止対象外）／ 一般ユーザーの登録起点 **3回/日・10回/月**／ 会員 5回/日。管理者は無制限。
- 表示: AI 単独・検証済でない記録には「**AI 下書き・未検証**」ラベル + 再調査リクエスト導線。想定コスト: 登録30件 + 承認再調査30件 = 60回 × 20円 ≈ **1,200円/月**。

### 2-2. 決済事業者と法務

- **09-30 改訂（これが現行）**: Stripe は取り下げず放置（問い合わせもしない）。**PAY.JP を開業届（10/3）の直後に本番申請（10/5）**。先に通った方で稼働し、後から通った方は 2027-02 まで使わない。料金ページの事業者表記は「クレジットカード決済（決済代行会社）」。**決済稼働は本告知の必須条件ではない**（§4b）。未稼働の間は料金ページ・ペイウォールに「会員受付は準備中です。ログインしておくと開始時にサイト上でお知らせします」（価格は出す、押せないボタンは置かない、`notify_member_launch`）。以下は 09-05〜09-07 の経緯。
- **10-08 オーナー決定（これが現行。09-30 の日付を上書き）**: **開業届は 2027-01-01 付で提出**（e-Tax。同時に青色申告承認申請書、期限は 2027-03-15）。**PAY.JP の本番申請は 2027-01 上旬**、決済の稼働は早くて 2027-02。それまでは「品質を上げる」に集中する（オーナー「1月にする前提で改善を重ねたい」）。影響: 会員はクレジットカードでは 2027-02 まで受け付けない／振込の年額（T97）は裁定どおり 10/31 に「名簿 ≥3 人」なら 11/1 に開く（開業前の売上も確定申告の対象になるだけで、受け付けること自体に支障はない）／取扱店の掲載（請求書・振込）は今のまま受け付ける／月 1 万円の到達見込みは 2027-03 以降にずれる（第9回で数式を引き直す）。
- **Stripe を先に**（09-05 提出、決済一時停止中）。2〜3日でステータスが変わらなければサポート問い合わせ（`docs/stripe-application.md` §5）。承認 → 会員 Price 2本作成 → 鍵受け渡し → 1プラン化デプロイ。不承認 → `_PAYMENT_PROVIDER=payjp`、PAY.JP 申請（プランは会員2本のみ）。判定後、敗者側の関数・分岐は削除。**09-05b**: Stripe が **10/3 までに判定なしなら T30（500/5,000 改訂）を先行実施し PAY.JP を申請**（両事業者に同じ料金ページを見せる）。本告知の必須条件に決済稼働を含めるが、**上限 10/24 に決済のみ未達なら決済なしで告知**（料金ページ・ペイウォールに「会員受付は準備中です。ログインしておくと開始時にサイト上でお知らせします」）。
- 特商法: 所在地・電話は「請求があれば遅滞なく開示」（オーナー決定）。販売価格・引渡時期・返品条件は判定翌日に会員プランへ更新。取扱店掲載開始時に「掲載料 1,000円/月・初月無料」を追記。
- 申込最終確認画面（12条の6）は現行形式を踏襲。ステマ規制: 取扱店欄・アフィリ欄に「PR」常時。
- ペイウォール文言（実生6件目）: 見出し「実生ノートを続ける」／「実生の記録は5件まで無料です。6件目からは会員（月500円 / 年5,000円）でご利用いただけます。閲覧はどなたでも無料です。」／特典2つ（10-03: 実生投稿 無制限・再調査リクエストの優先審査）／「会費は出典調査と収録の拡充に使います。決済は決済代行会社（PAY.JP または Stripe）、カード情報は当サイトに保存されません。」
- 料金ページ冒頭: 「Aroid Origins は閲覧無料の由来資料館です。有料なのは、ご自身の記録を増やすことと、その記録を紙のラベルにすることだけです。」 **10-03 改訂: ラベル印刷が特典に入るまでは「Aroid Origins は閲覧無料の由来資料館です。有料なのは、ご自身の実生の記録を 6 件目から増やすことだけです（会員の受付は準備中）。」**

### 2-3. 道具の目録（09-30 決定。詳細は `docs/board/2026-09-30.md` §2）

| 並び | slug | code | 日本語名 | 範囲 |
|---|---|---|---|---|
| 1 | `soil` | SOIL | 用土・植込み材 | 軽石・日向土・ベラボン・水苔・バーク（配合比は書かない） |
| 2 | `mount` | MOUNT | 着生・ヘゴ | ヘゴ板・コルク・結束資材 |
| 3 | `pots` | POTS | 鉢 | スリット鉢・プラ鉢・腰水容器 |
| 4 | `humidity` | AIR | 湿度・送風 | 加湿器・霧吹き・サーキュレーター・衣装ケース |
| 5 | `heat` | HEAT | 温度 | パネルヒーター・サーモスタット・簡易温室 |
| 6 | `light` | LIGHT | 光 | 育成 LED・ソケット・タイマー（園芸カテゴリの製品を優先） |
| 7 | `measure` | MEASURE | 計測 | 温湿度計・照度計・水分計 |
| 8 | `nutrient` | NUTRIENT | 肥料・活力剤 | 商品名・成分表示・容量のみ。効能・用量・頻度は書かない |
| 9 | `books` | BOOKS | 書籍・資料 | 当サイトの出典に現れる本だけ。T38 の書誌欄と相互リンク |

- 作らない: 病害虫・殺虫殺菌剤（農薬取締法・薬機法）、水やり（湿度・用土に吸収）、棚（温度・湿度に吸収）。ジャンルは `tool_genres` の行なので足し引きは可逆。既存 7 件: 用土 → soil、霧吹き → humidity、サスティー → measure、SUPERthrive・HB-101・Calmag・緩効性肥料 → nutrient。
- 各ジャンル冒頭に定型 1 行「当サイトは育て方を書きません。ここにあるのは自生地の環境に近づけるための道具の定義と入手先です。」+ 自生地由来の解説 150〜300 字（サイズ・育て方なし）+ 該当する収録済み品種 2〜3 リンク。書籍は「この本を出典に持つ品種」へ逆引き。
- **`toolGate(tool)`**: 合格 = ジャンル・メーカーまたは型番・有効な購入先 1 件以上・オーナーの使用記録 80 字以上（書籍は書誌 + 当サイトでの引用品種 1 件以上）・禁止語なし（おすすめ／最安／ランキング／効く／効果／改善／治る／No.1）・本文に価格の数字なし。不合格は詳細 noindex + sitemap 除外（一覧には出す）。`/tools/` 自体は公開時から index。
- **公開と絞り込み**: 公開条件 12 商品・6 ジャンル以上。ジャンル目録（件数つき、押すと `?g=<slug>` で絞り込み）は初日から、2 件以上のジャンルだけ並べる（1 件は「ほか」、0 件は非表示）。検索窓と並び順 chips は 20 商品から。上限 40 商品。
- **PR 文**: `/tools/` h1 直下 mono 2 行「PR — このページには楽天市場・Yahoo!ショッピング・Amazon のアフィリエイトリンクを含みます。リンク経由の購入で当サイトに紹介料が入ります。価格・在庫は各ストアの表示が最新です。」「Amazonのアソシエイトとして、Aroid Origins は適格販売により収入を得ています。」／ 詳細は購入リンク直上「PR — 以下のリンクから購入があった場合、運営者に紹介料が入ります。掲載は運営者が実際に使っているものに限ります。価格と在庫は各ストアの表示が最新です。」／ 原種・産地の文脈行の見出し「この種の自生環境に近い道具 — PR」。「管理人おすすめ」「Staff Picks」「サイト運営をサポート」は撤去。 **10-03 改訂（T58）: 詳細の「掲載は運営者が実際に使っているものに限ります」は 10-02 の自動リサーチ化で事実と合わないため削除。「使用中」の文は `owner_used` が 1 点以上のときだけ。PR 2 行は一覧の前（`tools-lead` の直後）、Amazon の 1 文は Amazon リンクが 1 件以上のときだけ。meta は「…部門別に。販売実績（レビュー数・評価）と仕様で選んでいます。育て方は書きません。」**
- **リンク点検**: `last_checked_at`、管理画面「点検モード」で月 1 回（オーナー 15 分）。切れたら `is_published=false`（削除しない）。

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

既定回答（オーナー未確認・異論なければ確定）: Glorious / Splendid / Majestic → Hybrid ／ 'Dark Mama' → disputed 両説 ／ 'Albo Variegata' 'Aurea' → Clone + tag `variegata`+`line` ／ 未収録ページは noindex ／ 'Michelle' 'Zara' は Hybrid。オーナー回答済: 'King of Spades' Clone、'Angels dream' 綴り維持。**09-05b 既定**（無回答なら確定）: 'Mystique A88'(109)・'Galaxy'(110) は現状維持（Hybrid）+ 本文に「オリジナル個体は存在する／流通は F1」／ splendidum(35) は W.Bull ex Rodigas, Ill. Hort. 31: 13, t. 510 (1884) + 注記「1883 年 Gard. Chron. で W.Bull 名義の先行発表」／ Mr Chandra → Chandra、Space Hijau は breeder 表示 + 注記「ナーセリー」／ 個体区分は上記6択。 **10-07b 上書き**: 'Galaxy' は Clone（IAS 登録。作出の表示は Space Hijau のまま・種小名なし。O-1 は閉じる）／'Mystique A88' は Clone + tag `line`（09-04 のオーナー規則。Chandra 本人が兄弟株を同じ名前で売っている出典が出たら Hybrid に戻す）／'Dark Mama' は Hybrid（親 warocqueanum × papillilaminum は Vannini・NSE で一致、`formula_status=known`、tag `disputed_parentage` を外し、`name_status=disputed` は作出者の異説 Banta / Havilcek として残す）。09-05b の「Mystique A88・Galaxy は現状維持（Hybrid）」と、09-05 の「Dark Mama → disputed 両説」は廃止。

データ追加修正（09-05、[即]）: 'Red Crystallinum'(52) `formula_status='complex'`／ 'Ace of Spades'(7) 'King of Spades'(2) 先頭 origin を `manual`／ antolakii(59) `aliases=['BVEP','Black Velvet Eastern Panama']`／ debile(34) 本文に「原記載では debilis」／ forgetii × 'Titanium'(55) はオーナーの播種日・作出者待ち／ `cultivar_images` の旧名3件を現名へ、`Anthurium テスト` 削除。**09-05b 追加（T23-①）**: collector NULL 化 crystallinum(3)・veitchii(6)・warocqueanum(4)・wendlingeri(77)・regale(83、本文「発見者: Linden」も削除）、collector「不明」→ NULL（10, 11, 35, 82）、分布 magnificum(10)・forgetii(11) → Colombia、regale(83) → Peru、carlablackiae(1) TDWG 残骸整理、サイズ文削除 forgetii(11)・sagittatum(82)・debile(34) `body_en`、曲引用符 7・52、aff. besseae(108) 本文と habitats「Darién, Panama」、first_description 年重複 10・11・83、POWO 検索 URL → LSID、55 `parent_b_text` → Anthurium 'Titanium'、109 `parent_b_id=52` + notes「NSE 系統」、110 'X-One' 'Dark Phoenix'、2 `name_status` NULL、6 habitats Colombia、38 片仮名削除、画像名寄せ 4枚。**09-07 第4回（T39-2、IPNI 型データ照合済みで前回の [要確認] を上書き）**: collector 記入 dressleri(31) T. B. Croat／papillilaminum(32) R. L. Dressler／luxurians(57) T. B. Croat／debile(34) T. B. Croat & Watt／nutibarense(33) J. M. MacDougal, D. Restrepo & D. S. Sylva + 年 2008（Novon 18(2): 145、2005 Aroideana 28: 61 先行発表を注記）；collector・年 NULL carlablackiae(1)（IPNI 型は T. B. Croat、Carla Black は献名の一文のみ）・clarinervium(9)・regale(83)（notes「導入株は Wallis 採集とされる（原記載未確認）」）・moronense(120) 年；kunayalense(38) → T. B. Croat & J. Vannini；wendlingeri(77) type_locality Costa Rica；crystallinum(3)・veitchii(6) type_locality NULL（Chocó は notes）；sagittatum(82) basionym *Pothos sagittatus* Sims・type_locality NULL；crystallinum(3) aliases 'cristallinum'；forgetii(11)・regale(83) の第 2 記録（manual・trust 95・形態文 30cm）削除；antolakii(59) habitats「Panama」・closest_species「Anthurium dressleri」；'Dark Mama'(5) AI 記録（Llama 3.3・出典 0）削除 + `formula_status='disputed'`；'Queen of Hearts'(8) name_status NULL + tag `tc_origin`；'Ace of Spades'(7)・'Mystique A88'(109) namer「Denis Rotolante」・formula.parentB を列と同期；89 creatorName「hare_anthurium」・本文「'HR1' × 'HR2'」；静的 `people/george-wagner` `people/mr-chandra` と `anthurium/aff.besseae` `anthurium/debile(debilis)` は生成時に掃除 + alias 名寄せ。

**10-03 第6回（T48・T56。修正 SQL `docs/board/data/2026-10-03-fixes.sql` 47 文中 46 文を適用）**: 個体判定は tag `individual` のみ（`archive.js:132` の `selected_from_id` 条件を削除。'Queen of Hearts' は Clone に戻る）／ 原種の由来文はスマホ向けの型: 出典は「巻: 初頁」の短縮形、国名・県名は日本語、小地名だけ原綴、「（POWO）」なし（`first_description` は IPNI 全文のまま、`research-origin` も同じ型）／ luxurians(57) type_locality NULL（IPNI sine loc.、タイプは栽培株）、papillilaminum(32) 出版物の注記混入を除去、antolakii(59) は引用元（Vannini）の内容だけに — 近縁種 papillilaminum・trade_names "Darkest Panamá" "Black Velvet Panama"・導入者と 2020 年の記述を削除（aliases の BVEP 系は検索用に残す。`sp. "antolakii"` への改名は slug 化と同時に告知後）、aff. besseae(108) closest_species、'King of Spades' 英文を和文の訳に、'Mystique A88' の矛盾 notes 削除、'Galaxy' は「F1 から選んだ 1 株の名前とされる（同名の F1 実生の流通は未確認）」（区分はオーナー確認 7-00 O-1）／ 標本ラベルの別名は最大 3 語・ラテン文字優先（カタカナは検索・JSON-LD・description 専用）／ 区分の表示語は全画面「原種 · Hybrid · Clone · 実生」（英小文字・「Original species」・「交配種/クローン」は使わない）／ 流通名（`name_status=trade`）はシングルクォートのまま + ラベル「流通名」注記で区別（用語集 g-trade-name の例も合わせる）／ 実生 89 の名前は変えない／ 用語集: g-line を「同じ名前で実生（F 個体）も流通していることを示す印。名前がオリジナル個体を指すか（Clone）、実生群を指すか（Hybrid）は区分で決まる。」、g-formula の例は forgetii × 'Titanium'、g-saishusha に栽培株タイプの 1 文、ガイドの Hybrid は「親が不明・複合のときはそう明記」・例は 'Red Crystallinum'、「記載年」→「発表年」、`renderStructuredOrigin` の項目名をラベルと同じ 5 語に（D2〜D9）。

---

**10-07 第7回**: 未記載の書式の条件に `species_qualifier` が sp/aff/cf の場合を加える（aff. besseae・sp. "Peru"）。国はタイプ産地 → 分布の先頭（テキスト中で最も早く出る国）の順で選び、日本語画面では 13 か国を和名にする（小地名は原綴）。ラベルの項目名「年」→「命名年」、個体の「原種」→「種」。タイプ産地と分布が同じ値なら 1 マス。照合日は検証の行だけに書く（verification_note と本文から日付を削除）。Q1: antolakii は URL を変えずに表示を sp. "antolakii" に（T69、10/14。10-03 の「告知後」を上書き）。Q2: 分布は 4 地域まで＋「ほか n 地域」（T71）。Q3: 原種の本文は記載者・年・産地を残す。

**10-07 オーナー指摘（系統・関連の名前合わせ）**: 名前の一部が同じでも別の植物（crystallinum と 'Red Crystallinum'）。系統図の子・関連は、属名・引用符・空白の違いを除いた**名前の完全一致**だけで結ぶ。部分一致・本文中の言及では結ばない（archive.js normParent / renderRelated）。

**10-07b 第8回（T77〜T80）**:
- **出典のない推測は消す**: 'Queen of Hearts' の選抜元・tag・記録を外し「記録なし」に。'Red Crystallinum' の「'Wonderboy' の関与」を削除。出典のない親・選抜元の受け皿として tag `parentage_unconfirmed` を作る（収録判定では数えず、系統図では点線と「とされる」）。
- **「わからない」は 3 つの値**（`structured.absent`）: 「記録なし」（未確認）／「原記載に記載なし（sine loc.）」（luxurians・metallicum）／「該当なし（流通ラベル）」（'BVIT' の作出者）。後の 2 つは収録判定で事実に数える。
- **引用符（D4）は確定**: 品種名・個体名・流通名は ' '、種レベルの非公式名は " "、流通名には「流通名」と注記。用語集 g-trade-name に「国際栽培植物命名規約は流通名を引用符で囲まないが、このサイトは流通の書き方に合わせて ' ' で囲み、『流通名』と注記する」。
- **Platycerium（D12）**: 退避（`docs/data/platycerium-2026-10-07.json`）と、戻すための INSERT を保存したうえで削除する（T36 を閉じる）。
- **産地ページ**: 題名は「{和名の国}の原種 n 種（タイプ産地 a · 分布 b）」。一覧は「タイプ産地がこの国」「分布に含む」の 2 群。流通情報だけの産地は載せない。国の決め方は geo.js と archive.js で同じにし、CI で一致を確かめる。
- **人物**: 導入者も人物索引の対象にする。名前の照合は `normParent` 1 つにする。
- **表記**: 敬称を付けない（氏・さん・様・Mr・Dr）。本文の日付も YYYY.MM.DD。推量の語と具体的な品種名を同じ文に並べない。説は「〈出典〉は…としている」の形でだけ書く。
- **区分の迷い方の順番**（ガイドに掲載）: 学名が発表されている → 原種／野生由来で種レベル → 未記載／原種の 1 株 → 個体／1 株を指す出典 → Clone／実生群を指す出典 → Hybrid／どちらもない → Clone（オーナー規則）／名前のない播種 → 実生。

## 4. コンテンツ方針

- **育て方は書かない**。自生地の環境は由来として書き、そこにだけアフィリを文脈化。相場は扱わない。英語補完・hreflang スタブは**凍結**（`body_en` は AI が自動生成する分のみ残す。英語からの被リンクが月10件超で再検討）。
- 勝ち筋: 記載者・発表年・タイプ産地・採集者・交配式・出典。人物・系統図・産地・用語集・**誤称・別名**で取る。
- トップの「戻る理由」3つ: ①今日の一葉は毎日変わる（日付 + 「明日の一葉は 0:00 に更新」+ シェア文コピー） ②記録が増えている（「新着記録」台帳: 日付・名前・種別・変更、見出し「今週 +n 件」、masthead の最終収録日。実生も日付順で混ぜる） ③自分の記録が残る（colophon CTA「あなたの交配を系統図に残す →」）。
- **撤去（09-05、09-05b で「告知後に必要か」で再判定）**: 画像 Real/Fake 投票（削除維持。代替は §3 ⑥ by-line + 個体区分 + 疑義申告）、お気に入り☆（**別の形: 「棚」として T28 で実装** — localStorage・ログイン不要・☆なし。11月末 保存者 <10 かつ 会員転換 0 で休止）、トップの道具棚（削除維持。**09-07: 詳細ページの道具棚も CSS で非表示**。**09-30: フッター「道具」ページは条件を待たず「道具の目録」として実装（オーナー指示、§2-3）。属ページに残っていた道具棚は T44 で削除。原種・産地ページはカードでなく文字行 最大 2 行で T47 に復活**）、トップの実生ノート区画（削除維持。**新着記録の実生除外バグ `.neq('type','seedling')` を T21b で修正**。公開実生 ≥20件 かつ 投稿者 ≥5人で `/seedlings/` 索引ページ）、AdSense 枠（30,000PV かつ 会員 <5 のみ再議題）、YouTube チャンネル検索（保留、議題にしない）、ユーザー名検索（削除維持。代替は検索対象に人物・産地・別名。登録 >50・投稿者 ≥5 で再検討）、i18n 死にキー、`trial-reminder` 関数、Amazon 直接契約リンク（09-30: もしも経由で復活、§2）、共有メニューの **LINE**（**Facebook は PC 専用で復活**、`share_click.channel` で公開90日後に全共有 5% 未満のチャネルを撤去）、`images/hero-mist.jpg`。**Platycerium 18件は `docs/data/platycerium-2026-09.csv` に退避のうえ削除**（`genera.id=4` も）。テーブル（`favorites` `image_votes`）は残す（可逆）。
- **残す**: 共有 = `navigator.share` があれば OS 共有シート、無ければ mono 1行「X · Facebook · URLコピー」（共有文「{品種名} — 誰が、いつ、どこで名付けたか｜Aroid Origins」、`hashtags=PlantsStory` は除去）／ 言語 = 既定は `ja*` なら jp、それ以外 en、masthead の mono 行末尾に `ENGLISH`／`日本語` 1リンク（ヘッダー復活は非 ja セッション ≥15%）／ 由来記録の投票（文字化「正確 / 疑問」、colophon・JSON-LD の「投票で検証」文言は削除し「出典の階層（S〜D）から算出」に統一。12月末に累計10票未満なら撤去）、今日の一葉、年表、索引、関連品種、用語自動リンク、使い方ガイド（投票・お気に入りの記述削除）。
- 次の Anthurium **20件**（union、投稿順）: オーナー投稿 5件 'Dorayaki'(disputed, 3説) → 'Red Vein Dark Phoenix'(Clone, aliases RVDP, 父 'Ace of Spades') → 'Michelle' → 'Zara' → 'Titanium' ／ Claude Code が管理者で一括登録する原種 9件 hookeri, besseae, metallicum, marmoratum, radicans, pallidiflorum, vittariifolium, faustomirandae, waterburyanum(DOUBTFUL、要確認) ／ 第3週: 'Dark Phoenix', 'Fat Mama', 'Wonderboy', 'Silver Blush', sp. "BVIT", sp. "Fort Sherman", sp. "villenaorum", portillae ／ 予備: queremalense, 'X-One', angamarcanum。
- 10月: **Monstera 公開**（obliqua "Peru" / 'Burle Marx's Flame' / Albo / Aurea の修正と deliciosa 1849 ほか発表年補完、ゲート合格後）。Philodendron は3件の Hybrid 化と gloriosum/melanochrysum 発表年補完後に11月判断。
- 投稿者の報酬: 人物ページ自動生成 + 系統図掲載（フォーム冒頭に明記）、実生 OGP に交配式・播種日・作出者、投稿完了画面に X/Instagram 用テキスト。存命ブリーダーは本人公開名義のみ。
- SNS: Instagram 主戦場。オーナー週3回「今日の一葉」（OGP + シェア文をサイトが用意し、コピペにする）。
- **10-07b 第8回**:
  - タイトルは実際の検索語の形にする。原種は「アンスリウム・{カタカナ}（学名）の学名と由来 — 記載者 年」、Hybrid・Clone は「…の由来・作出者」。カタカナは学名の読みか国内で使われている表記だけ（略号には作らない）（T83）。
  - 未登録の 4 名は、オーナーの投稿を待たずに Claude Code が出典つきで登録する（10/11 Dorayaki・10/13 Michelle・10/15 Zara・10/16 RVDP。推測は書かない）（T95）。
  - 告知の 1 投稿目をドラヤキにするのは、B 階層以上の出典が 1 件あるときだけ。なければ crystallinum。
  - 公開の実生にスタブと共有カードを作る（T85）。
  - Instagram 用の縦長画像と「投稿文をコピー」を作る（T94）。
  - `/names/` 4 本は告知後（T99）。
  - Monstera は 10/31 に第二波として判断する。
- 空ページは「未収録」シート + 投稿 CTA。系統図の「未収録の親」（'X-One' 'Dark Phoenix' 'Titanium' 'Dorayaki'）は登録 CTA にする。検索0件も「この名前で登録する →」。
- **09-07 追加（第4回）**: カタカナ別名（トップ15 + 収録済み全件）を `aliases` に投入し検索・JSON-LD・description に出す（T40）／ 検索 0 件シートに「この名前の収録を依頼」（ログイン不要、`genus_requests.kind='name'`、GA `search_zero{term}`、T41）／ 記載史年表を `/timeline/` 独立 URL + 年表画像 1 枚（T43）／ 未収録・記録なしの description は定型「記録なし · 作出者と交配式の出典を募集」（AI 本文を出さない）／ 使い方ガイドは 5 見出し（区分 4 つと名前の書き方／記録の読み方 8 行／投稿: 原種・Hybrid・Clone・個体・実生 5 件無料・非公開・再調査リクエスト／ラベル印刷／会員は価格を書かず料金ページへ）。手順リスト 5 本と「コミュニティで収集・共有するプラットフォーム」「ユーザー名」は削除（T42）／ 用語集に 個体・系統（line）・F1・オリジナル個体・管理番号・未収録・記載者・タイプ産地 の 8 語（T42、未収録シート・個体欄からリンク。basionym 著者は索引に出さない）／ 訂正の可視化（新着記録「訂正」種別・収録メモ「訂正 n 件」・訂正者 by-line）は本告知 +1 週に実例を見て形を決める。収録メモの「収録 · 記録 n 件 · 更新」は T27a／ **無料付与 `granted`（告知戦術）**: ソフトローンチ協力 2 名・本告知後の他者投稿 最初の 5 人・写真提供者に 3 か月（管理画面「無料付与」、規約 9 条に「運営者が無償で会員資格を付与することがある」を T30 で追記、会員一覧では区別しない）。付与者の 12 月継続 0 なら 1 月に終了／ 告知文 1 投稿目は 'Michelle' が 9/19 までに収録・検証済でなければ crystallinum（1873 Linden & André、原産コロンビア。「チョコ」は書かない）。

### 4b. ローンチ計画（09-05b 確定。詳細は `docs/board/2026-09-05b.md` §3）

- **原則**: 告知は界隈で一度しかできない。オーナー個人名義で栽培家として話す／各所の規約に従う／「サイトができました」でなく中身の話（'Michelle' の作出者と交配式など）でリンクは末尾／週末夜 20〜22時／最初の1週間は返信に全部返す。
- **ソフトローンチ（クローズド）**: 9/21〜10/2 → **09-30: 未実施のため 10/5〜10/15 にやり直す**。Instagram ストーリーズ（親しい友達可）+ 知人ブリーダー2名への DM、計10〜20人。目的は誤りの洗い出しと投稿導線の実地テスト（知人1名に投稿1件）。決済は不要。数字は追わない。
- **本告知（09-30 改訂）**: **必須ゲート M1〜M9 全達成の翌土曜 20:00。目標 10/17（土）、上限 10/24（土）は確定日**（10/24 は M3・M9 以外が未達でも告知し、欠けは告知文で投稿依頼に変える）。決済の稼働は条件にしない（閲覧は永久無料で、ペイウォールは実生 6 件目にしかない）。告知文に道具ページは書かない（告知 +1 週のストーリーズで 1 回だけ）。旧: M1〜M10・目標 10/3。
- **必須ゲート**: M1 収録済み Anthurium ≥40（09-30 に 45 → 40。件数は正確性ではないため）／ M2 国内流通トップ15（crystallinum, clarinervium, warocqueanum, papillilaminum, forgetii, regale, luxurians, magnificum, 'Michelle', 'Zara', 'Dorayaki', 'Red Vein Dark Phoenix', 'Ace of Spades', 'Dark Mama', 'Black Velvet'=antolakii 別名）が**学名・カタカナの両方で**検索0件を返さない（09-07 強化）／ M3 致命的データ欠陥ゼロ（taxonomy C1〜C9・C11・C13・C14・C16・C18・C19）／ M4 記載種の検証済 100%／ M5 OGP（標本台紙 og-default、share fallback 404 なし、X・Facebook・LINE の3ツールと iPhone 共有シート実機）／ M6 GA `login{source}` `sign_up` `share_click.channel` `label_print` `contribute_start{source}` `paywall_view{source}`（09-07 追加）／ M7 投稿導線 ≤90秒 + 完了画面コピペ文／ M8 当日の新着記録 直近7日 ≥3件 + 今日の一葉当日／ M9 法務・連絡先・料金整合（T30 merge 後の 500/5,000 と準備中表示）。**M10 決済稼働は 09-30 に努力ゲート E10 へ移動**。**10-03 追記**: M3 に第6回 taxonomy の A 指摘 7 件を追加（T48 で解消）。M9 は T55 の本番で達成とする。M5 の確認に「375px・回線を絞った直着地で 3 秒以内に h1・cite、写真 8 秒以内」を加える（T59）。
- **努力ゲート**（未達は告知文で欠けを正直に書き投稿依頼に変える）: E1 写真 収録済み ≥80%・トップ15 100%／ E2 人物 ≥10本・存命3名 Tier B／ E3 産地7ページ 原種 ≥3／ E4 AI 単独折り畳み ≤30%／ E5 用語集 ≥30語／ E6 Clone/Hybrid Tier C ≥3/8・検証済 ≥4/8／ E7 区分違反 0／ E8 撮影者 by-line 40/40／ E9 ラベル印刷（T28a）が本番、iPhone 印刷確認済み（**09-07: 棚は告知後、E9 から除外**）／ **E10 決済稼働・テスト決済 1 件（09-30 に必須から移動）**。
- **チャネル順（本告知週）**: 土 20:00 X スレッド5投稿 → 土 20:30 Instagram カルーセル5枚 + ストーリーズリンク → 日 LINE オープンチャット（規約確認、参加済みのみ） → 月〜火 Facebook 国内アロイド系グループ（参加済みのみ） → 以後毎日「今日の一葉」ストーリーズ。+1週: 海外ブリーダー DM（Doc Block・Siam Flora・NSE Tropicals・Ecuagenera）と国内ブログ（アンスリウムジャパン・シロウト園芸）へ相互リンク。+2週: 専門店3店（T33 と統合）・ヤフオク/BASE 出品者の知人（メルカリは URL 不可）。+2〜3週: Monstera 公開で第二波。11月: 即売会で標本ラベルの株を投稿。下書きは content §3-A〜F。
- **当日**: 0:00 今日の一葉確認 → 19:00 最終チェック（OGP 3ツール・新着記録・料金ページ・投稿通し） → 20:00 X → 20:30 Instagram → 23:00 まで返信（オーナー2時間）→ 翌日 GA4/Search Console と指摘一覧、修正は24時間以内。
- **7日/30日の指標と撤退線**: §1 KPI 表。`share_click` は channel 別に見て90日で 5% 未満を撤去。誤り指摘・再調査リクエスト 7日3件・30日10件（0なら「読まれていない」）。

---

- **属の拡張は需要で決める（09-06 オーナー決定）**: 当面 Anthurium のみ。トップの masthead と投稿フォームに「属の追加を依頼 →」（ログイン不要、`request_genus` RPC、`genus_requests` テーブル、管理画面「属の追加依頼」で件数と理由を確認）。依頼が集まった属から、非表示データを Anthurium と同じ基準で修正してから `is_visible` を立てる。Platycerium はアロイドでないため定義文と不整合（要判断）。

- **文字サイズ切替（09-07 オーナー要望、本番反映済）**: 標準 / 大 / 特大 の3段階。フッターの EN/JP の隣とスマホのメニュー内に設置。`wireframe/js/textsize.js` を head で読み、`html[data-textsize]` でルート 16 / 18 / 20.5px を切替（サイトの寸法はほぼ rem なので本文・見出し・ラベルが一緒に拡大）。選択は localStorage に保存し、次回は描画前に適用。GA `text_size`。

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
- **道具の目録（09-30、T46）**: 「アフィリの物販ページに見えない道具の目録」。`/tools/` の縦順: パンくず → mono 標題行 `TOOLS — 道具の目録 · n ITEMS · n GENRES` → h1 + Shippori 1 文 → PR 2 行 → ジャンル目録（`.index__` 流用、件数つき、375px で 2 列）→ `.sort-bar`（20 商品から）→ `.ledger-table`（PC: NO. / 道具名 / ジャンル / メーカー · 型番 / 価格帯、≤640px は `"no name price" "no meta genre"`、サムネイルなし）→ 0 件は `.sheet--search` → 出口 1 行。`/tools/<slug>/` は品種詳細と同じ型: mono 標題行 `TOOLS · 用土・植込み材 · NO. 007` → h1（一般名）→ cite 行（メーカー · 型番 · 価格帯）→ 道具ラベル（`.specimen` 流用）→ 図版 `.tool-plate`（4:5・`object-fit: contain`・`mix-blend-mode: multiply`・失敗時は絵文字でなく `.sheet--plate`）→ 使用記録 → 対応する自生地条件 + 該当原種 1〜3 件 → PR 1 行 → 購入行 mono「楽天 · Yahoo! · Amazon」（44px）→ 収録メモ → 出口。JSON-LD は `ItemList` のみ（`Product`/`Offer` は出さない）。ヘッダー 6 要素には入れず、フッター「道具」とモバイルナビ末尾だけ。CSS は `archive.css` 末尾（design 09-30 §6-3）。新規 `tools.js` はキャッシュバスターと `sw.js` の登録漏れに注意。
- 標準手順: 見た目の変更は本番前にオーナーがプレビュー確認（iPhone 実機）。**09-30: プレビュー確認待ちが 48h を過ぎたら Claude Code は待たずに merge する（T27a・T29a が 3 週間滞留した反省）**。CSS/JS 変更時はキャッシュバスター 12 箇所 + `sw.js` `ASSET_VERSION`。
- **10-03 第6回（オーナー指示「基本スマホで見るユーザーが多い」）**: 評価と優先順位は **375px が主・1280px が従**。決めたら確認を待たずに本番へ出し、本番後に 375px のスクリーンショットで報告する（48h 無反応で確定）。画像は Supabase の変換配信 `imgUrl(path,w)` だけを使う（原寸を一覧・図版に読み込まない、`onerror` で原寸）。直着地はトップを先に出さない（`data-boot=deep`）・データ到着前に区分を描かない・存在しない名前と未知ルートは `.sheet--search` / notfound + noindex。詳細の操作行は主要 3 +「その他」、「削除依頼」は所有者と管理者のみ、投票は文字。日付は全画面 YYYY.MM.DD。学名は属・種小名イタリック・lining-nums。属一覧は `.ledger-table`・50 件/頁・区分順 → 名前順。トップの 1 画面目に今日の一葉を入れ、`images/anthurium.png` は使わない。/tools/ は ≤640 で 1 列の行（左 96px 画像・ストアリンク 44px・枠線）、PC は画像カードの格子（ショップ型は維持）。

---
- **10-07 第7回（オーナー指示「デザインにまとまりがない」「基本スマホ」）— 見た目の決まり（これが現行。archive.css 末尾の「UNIFIED LAYER 2026-10-07」1 ブロックで実装）**:
  - **文字 6 段**: 見出し1 30px／見出し2 22px（上に太罫）／見出し3 17px／本文 16px（行間 1.85、ink）／小 14px（mid）／ラベル 12px（mono、和文は Noto）。12px 未満は作らない。例外はトップの題字（2.25rem）とロゴだけ。
  - **書体の役割**: 明朝・セリフは見出しと学名だけ。日本語はすべてゴシック。mono は英数字の記録情報（日付・年・%・件数・引用行）だけ。数字は lining（旧数字は使わない）。価格はゴシックの lining。
  - **大文字化はどこにも使わない**（例外なし）。英字は原文どおり。
  - **色の役割**: ink（本文・見出し・リンク・主ボタン）／mid（小とラベルだけ。段落に使わない）／緑（✓ 検証済と hover だけ）／黄土（原種の発表年だけ）／赤（エラーだけ）。区分バッジは 1 種（ink・rule-strong の枠・ゴシック 12px）。#8E958F は文字に使わない。
  - **余白** 4/8/16/24/40。左右の余白は全画面 16。
  - **罫**: 太罫は区切りに 1 本、細罫は行の間、点線は未収録シートと用語リンクだけ、2px は選択中のタブだけ。
  - **ボタン**: 主（ink の塗り・44px・1 画面に 1 つ。ヘッダーの「+ 投稿」は別枠）／副（1px の枠・44px）／テキストリンク（下線は text-decoration。→ は別ページへの移動だけ）／切替（1 画面に 1 段）。
  - **四辺の枠**を使ってよいのは、標本ラベル・写真の台紙・入力欄・副ボタンとバッジ・未収録シートの 5 つだけ。
  - **一覧の 1 行**: `entryLine(d)` 1 つで全一覧を描く。1 行目は名前と、右端に状態 1 つ（✓ n% / n% / 投稿者の記録 / 記録不足 / 調査中 / 記録なし）。2 行目は「[YYYY.MM.DD ·] 区分 · 人 · 年 · 国」。区分の語は 原種 / 未記載 / Hybrid / Clone / 個体 / 実生。サムネイル 48px（写真なしは点線の空き枠）。No. 列・信頼度バー・交配式の行・「由来: n件」は出さない。
  - **件数**: 「収録」= recordGate 合格の原種・Hybrid・Clone。単位は品種（名前）・点（道具）・件（記録・実生・検索結果）。数字は正しく出せるときだけ出す。
  - **用語**: 「収録」は件数と「収録を依頼」だけ／「記録」は由来の文章 1 本だけ／台帳・台紙・アーカイブは使わない（図鑑・一覧・このページ。「道具の目録」はページの名前として残す）／状態「未収録」→「記録不足」、「図版未収録」→「写真なし」、登録日は「登録」、系統図の未登録の親は「未登録」／操作は「〜を追加」／日付は YYYY.MM.DD、例外なし。
  - **トップの並び**: 題字・標語・定義文・検索・統計 1 行 → 今日の一葉 → 新着の品種 → 索引（産地・人物 5 人）→ 年表（`<details>`）→ この図鑑について。**英字の見出し行と ENGLISH リンクは廃止（09-05b を上書き）**。言語はメニューの「表示」行（文字サイズと EN/JP）とフッター。
  - **品種ページ**: 標題行は区分の印だけ（**09-07 の「属 · 区分 · NO.」を上書き**。NO. は共有カード画像と印刷ラベルにだけ残す）。記録を追加する入口は操作行 1 つ（記録不足のページだけシートの CTA を加える）。記録の見出しは「出典 S · n% · 日付」。検証の日付は 1 回。異説の注記は 1 行。系統図の子は親の ID・親の名前・選抜元だけで決める。出口は「Anthurium の一覧 →」。≤640 ではラベルを 1 列にする。
  - **道具の目録**: 部門は罫線の 2 列リストで、0 件の部門は出さない。英字の標題行と部門コードは使わない。「使用中」は枠つきのバッジ（緑にしない、画像に重ねない）。ストアのボタンは、商品ページの先頭だけ主ボタンで、ほかは副ボタン 44px。PR は 12px。ショップ型は維持。
  - **料金ページの並び**: 要約 2 行 → 無料 → 会員（有料）の表 → お知らせボタンと特商法・規約へのリンク → 取扱店の掲載 →「Aroid Origins について →」。契約条項は受付開始まで `<details>`。
  - **変えないもの**: 5 色・書体 3 種・角 2px・影・グラデーション・絵文字の禁止、未収録シート、写真の扱い、文字サイズ 3 段階、admin.css・print.css。収益の不変条件（PR の位置と文言、href・rel・target、もしもの imp、楽天の表示、GA の属性、禁止語、JSON-LD は ItemList のみ）。
- **10-07b 第8回（第7回の決まりの補足・上書き）**:
  - 四辺の枠を使ってよい部品に「系統図の箱」を足して 6 つにする。
  - 新着は日付の見出し「YYYY.MM.DD — n 品種」でまとめ、各行の日付を外す（第7回の「2 行目の先頭に日付」を上書き）。
  - ≤640px で写真がないときは、`.sheet--plate` を 1 行の帯「写真なし — 写真を追加」（`.sheet--inline`、56px）にする。写真の台紙は `max-height:70svh`。
  - ダークモードは作らない。`color-scheme: only light` で強制ダークを止める。
  - 前後の品種は、属一覧と同じ順番（区分 → 名前）にし、「Anthurium の一覧 · n / N →」を出す。
  - T59 はタッチ再現（`TOUCH=1`）と CLS の計測を標準にする。目標は主要 5 画面で CLS 0.1 未満（T93 で 0.25 以下、T98 で 0.1 未満）。

## 6. 未完了タスク（担当・期限）— 実装順

| ID | タスク | 担当 | 期限 | 効果 |
|---|---|---|---|---|
| T20 | **完了 09-07**（`research_requests`・admin タブ・`RESEARCH_DAILY_CAP=15`・登録起点の上限を確認）AI 再調査リクエスト | Claude Code | 9/7 | 由来無料の約束を機能にする |
| T21 | **完了 09-05**（YouTube 検索は管理者専用・未使用時は無コストのため保留） 削除バッチ1 + モバイル: お気に入り・画像投票・トップ道具棚・トップ実生区画・AdSense 枠・YouTube 検索・ユーザー名検索・i18n 死にキー・`trial-reminder`・Amazon リンク・共有 FB/LINE・`hero-mist.jpg`・AI バッジ → 状態列、EN/使い方をフッターへ、M-A/M-B/M-C、規約5・6条とガイドの投票文言 → プレビュー → 本番 | Claude Code → オーナー確認 | 9/9 | 「参加装置」より「記録」 |
| T21b | **非表示系は完了 09-06（本番）。見た目系（masthead 文字階層・ENGLISH リンク・スマホヘッダー「+ 投稿」）は branch `t21b-visual` でオーナー確認待ち → OK で merge** 告知前修正（09-05b）: 新着記録の `.neq('type','seedling')` 削除 + `is_private` 除外／ 共有: `hashtags=PlantsStory` 除去・共有文・PC 専用 mono「X · Facebook · URLコピー」・`share_click.channel`／ GA `login` `sign_up`／ `og-default-2026-09.png` 標本台紙 OG + `share/index.ts:113` fallback + `og-image` 関数削除／ `forms.js:270` 言語既定反転／ masthead 文字階層 + mono ENGLISH／ 375px ヘッダー「+ 投稿」／ 残骸（`index.html:129` aria-label、`:1142` ガイド文言、CSP amazon）／ キャッシュバスター → プレビュー → 本番 | Claude Code → オーナー実機 | 9/9 | 告知の顔と受け皿を直す（≈4h） |
| T22 | **完了 09-05** 定義文 + 新着記録 + 未収録の親 CTA: `hero_desc`/`about_mission_text`/`colophon_p1`/meta/og/静的スタブ既定文を §0 に置換、`#recently-updated-grid` → 新着記録台帳（実生含む、今週 +n）、系統ブロックの未リンク親に「登録する →」、colophon 縮約、検索0件 `.sheet--search` | Claude Code | 9/10 | 戻る理由・投稿導線 |
| T23 | **①〜⑤ 完了 09-07**（④ AI 下書き折り畳み・状態 mono・投稿者記録の%非表示 ⑤ wireframe/js/record-gate.js を site/sitemap/stub/admin で共用、台帳の状態列 3値、詳細の未収録シート + noindex、sitemap 除外、属カード件数は収録済みのみ、admin「未収録一覧」。⑥ p_meta は個体対応で RPC に追加済み） **⑦人物典拠表は T39-4 へ（JSON は 09-07 作成済み）** ①②③ 完了 09-06（本番データ修正 45件 + 原種18件の本文を由来文に再生成 + research-origin: 採集者は IPNI 原記載の型データのみ・分布は WCVP(POWO) のみ・LSID リンク・年重複解消・本文は由来のみ。バックアップ docs/board/data/）**④⑤⑥ 完了、⑦ → T39-4** 品質ゲート + データ修正（09-05b で taxonomy の順に差し替え）: ①データ修正 SQL 一括（§3 の [即] + 09-05b 追加、画像名寄せ・テスト削除） ②原種本文の由来文化（`generateBodyFromStructured` species 分岐 + `research-origin` species プロンプト、既存18件を structured から再生成） ③`research-origin` ルール（collector は protologue のみ、分布は POWO native、LSID、年重複、出典0件は Tier D） ④低信頼折り畳み + Tier mono 1行 + 手動記録の % 非表示 + `verification` manual 非描画 + 台帳件数から折り畳み除外 ⑤状態列3値 + `scripts/lib/record-gate.js` + 未収録シート + noindex + sitemap 除外 + 属カード件数 + admin「未収録一覧」「調査失敗」 ⑥P2 `p_meta` RPC + `#formula-complex`（**9/11、シード投稿前**） ⑦人物典拠表 `data/people-authority.json`。P1 `species_qualifier` バッジ・P3 `origin_type` 廃止は告知後 | Claude Code | 9/14（⑥は 9/11） | M1・M3。信頼（判断基準②） |
| T24 | **10-03: 期限 10/10 のまま。T48 の `research-origin` テンプレ修正の後に実行（旧書式で入るのを防ぐ）。** **09-30: 未着手。原種 14 件（既定 9 + portillae, queremalense, angamarcanum, sp. "BVIT"・"Fort Sherman"・"villenaorum"、waterburyanum は保留）を 10/10 までに管理者登録し合格 ≥40（M1）。トップ15 の未登録名は 10/10 までにオーナー投稿が無ければ名前と区分だけで登録（記録なし・noindex、推測の交配式は書かない）** **Anthurium 20件**: 原種9件を管理者で一括登録（GBIF 経路、≈200円。**T23-③ の後**に実行、waterburyanum は DOUBTFUL で要確認）→ オーナー投稿5件の誤り確認 → 第3週8件 → antolakii aliases | Claude Code + オーナー | 原種 9/16、全体 9/20 | M1・M2 |
| T25 | **別名・誤称ページ `/names/`** + P4（旧綴り URL 解決・JSON-LD・台帳の `= debilis` 行）+ **検索対象に人物索引・産地**（ユーザー名検索の代替）+ **T38 書誌欄** + 静的スタブ・sitemap。**09-07: `aliases` の検索一致とカタカナ別名は T40 で先行（第 1 週）**。0 件シートの「別名で探す」1 行は T41 | Claude Code | 9/23 | M2（'Black Velvet'）・購入前検索（≈6h） |
| T26 | **10-03: 期限を 10/11 に変更（T24 の 14 件と同時に検証済にするため）。投票の文字化は T52 に移す。** **09-30: 未着手（`verified_at` 列なし）。10/5 まで（M4）** **検証ワークフロー**: 列3本・RPC・`cast_origin_vote` の固定・標本ラベル「検証状況」行・台帳 ✓・admin「検証 / 再確認キュー」 + 投票の文字化「正確 / 疑問」。完了後、IPNI/GBIF 一致の記載種を admin で検証済にし **M4（記載種 100%）** を満たす。Clone/Hybrid は Tier C 出典が取れた分のみ | Claude Code | 9/19 | M4 |
| T27a | **09-30: 48h 期限超過のため 10/1 に merge（T44）** **branch t27a-reading-order で実装済 09-07** **読み順 + 削除（09-07、第 1 週）**: §5 の読み順（mono 標題行・バッジ行削除・操作行をラベル下へ・h2「画像」撤去 + `.sheet--plate`・個体 0 件非表示・出口 1 行・収録メモ）／ 詳細ページ道具棚 CSS 非表示／ D5 文言（`index.html:1052`、`add_origin_title.en`）／ ⑧ `#edit-key-section` 既定非表示 + 「報告」／ ⑥ 黒ボタン → mono 1 行「この台紙に書き足す」+ 3 要素フォーム + `<details>` → プレビュー 4 パターン（写真あり / 写真なし原種 / AI のみ trust 23 / 調査中）→ 48h 無反応で本番 | Claude Code → オーナー実機 | 9/12（本番 9/14） | 着地 1 画面の純度（≈7h） |
| T27b | **画像**: 撮影者 by-line（`credit`, `user_id`）・個体区分 `specimen_status`（original / tc / f1 / f2 / line / unknown）・「報告」の理由選択 → `image_reports`（Real/Fake 投票の置換）+ フォーム冒頭の報酬明記 | Claude Code | 9/26 | E8（≈4h） |
| T28a | **10-07b: T89 に置き換え（QR つき）。** **標本ラベル印刷（告知前）**: `print.css`（A4 2×4 = 91×55mm・二重罫・ink 1 色・`.label--stake` 60×25mm）・`buildLabelHtml` 区分別セル + 検証状況 1 行・dialog 1/2/4/8・GA `label_print{count,member}`・i18n。決済稼働までログイン全員に無料 → iPhone Safari 印刷確認 | Claude Code → オーナー実機 | 9/26 | 会員特典②の実体・第 2 のペイウォール・E9（≈4h） |
| T28b | **棚（告知後）**: §5 09-05b の仕様（`/shelf`・操作行 1 語・フッター/mobile-nav 入口・dialog 複数品種・`favorites` 同期・GA `shelf_add`、`add_favorite` は廃止）。本告知 +2 週に `share_click`・`label_print` の実測を見て着手判断 | Claude Code | 告知 +2 週以降 | ログイン率 +2pt 仮説（≈3h）。撤退: 12 月レビューで保存者 <10 かつ会員転換 0 |
| T29 | **09-30: (a) は 10/1 に merge（T44）、(c) 今日の一葉 OGP は 10/15。** **(a) 生成器は branch t29a-og-cards で実装済・見本3枚送付。(b) 完了帯は本番反映済 09-07** **標本カード + 完了帯 — 9/19 に前倒し**: (a) 生成器 `scripts/make-og-cards.js`（§5 統合仕様、`@resvg/resvg-js` + `fonts/og/` 3 書体、`images/og/<slug>.png`、deploy.yml、スタブと `share` fallback を同 URL、トップ15 先行、Validator 3 枚をオーナーへ）(b) ⑤ 投稿完了帯 + 共有文の共通式 (c) 9/28: 今日の一葉 OGP + シェア文コピー（content §3-F）+ 実生 OGP に交配式 + 人物索引「日本のブリーダー」 | Claude Code | (a)(b) 9/19、(c) 9/28 | M5・M7。Instagram 素材（≈9.5h） |
| T30 | **10-03 訂正: 未 merge のまま（branch のみ・master と競合）。申込入口の準備中化は 10-03 本番（154e0d9）、価格 500/5,000・特典 2 つ・法務は T55 で master 上に作り直し、branch は merge せず閉じる。開始通知フラグとメールは告知後。** **09-30: Stripe 判定を待たず 10/2 に merge（事業者名「クレジットカード決済（決済代行会社）」・準備中表示 + 開始通知を既定）。PAY.JP 承認日に `_PAYMENT_PROVIDER=payjp` + `#payjp-card-element`（1h）** **準備ブランチ t30-member-plan 作成済 09-07** **料金 v2（Stripe 判定翌日。10/3 に判定なしなら判定を待たず実施し PAY.JP 申請へ）**: 1プラン化 会員 500/5,000、translations・料金・特商法・規約9条の2・モーダル・OGP・静的スタブ再生成、敗者側の決済関数・分岐削除、特典「先行閲覧」「広告非表示」「支援者」文言削除、ラベル印刷の門を `window._member` に。**09-07: ブランチ `t30-member-plan` を第 1 週に作成（本番に出さない、≈3h）**: 年額既定ラジオ + 1 ボタン、`showPaywallModal(source)`（実生起点「実生ノートを続ける」／ラベル起点「このラベルを印刷する」／料金ページ「会員になる」）、規約 9 条「無償付与」1 行、About「会員（n 人）」区画、Trial 分岐削除、料金ページは「会員でなくてもできること」→ 特典 4 つの順、静的スタブ再生成。`create-checkout`・`stripe-webhook` はコード変更なし（内部キー `seedling_*` は改名しない）。判定日は merge + キャッシュバスター 30 分 → オーナー実決済 500 円 → 解約確認 → 返金。不承認・判定なしは同ブランチで事業者名を「クレジットカード決済（決済代行会社）」にし PAY.JP へ（サイト側 1h: `_PAYMENT_PROVIDER`、`#payjp-card-element` 表示、CSP `js.pay.jp`）。10/24 決済なし告知のときだけ「開始したら知らせる」（価格は出す、押せないボタンは置かない、`profiles.notify_member_launch` + RPC + GA `member_interest{source}`、バナー + Resend メール、1h） | Claude Code | 判定 +1日 | 売上化 |
| T31 | P5 異説 `alt_claims`（'Dark Mama' 2説、'Dorayaki' 3説）+ admin 編集 + AI 経路 `alternative_parentage`、産地ページの標高・生育環境行、用語集の語彙追加（F1・sib-cross・selfing・locality form・aff.） | Claude Code | 10/5 | 正確性・ロングテール |
| T32 | Monstera 公開（4件修正・発表年補完・ゲート合格・`is_visible`・sitemap） | Claude Code → オーナー承認 | 10/15 | PV 拡大 |
| T33 | **09-30 改訂** 取扱店掲載（銀行振込）: `shops` テーブル（管理画面で手入力）・品種ページ「取扱店 — PR」欄・掲載条件（1,000円/月・初月無料・月末請求・解約は翌月末）を規約に 1 条・請求書テンプレ（適格請求書発行事業者でない旨）・DM 文面。自己申込 Checkout は作らない | Claude Code / オーナー DM・請求 | 実装 10/16（10-03 改訂: 告知前必須 T48〜T57 の後。規約 9 条の 5・事業者向け料金も同時）、DM 本告知 +1 週 | +3,000円/月（決済に依存しない） |
| T34 | **09-30: T46・T47 に統合**（文脈行は T47、GA `page` は T46、Admin ファネルは 11 月） | — | — | — |
| T35 | 写真到着後: 版画変換 CSS 試作 → 可否 → 図版シリーズ | Claude Code | 写真到着 +3日 | 図版 |
| T36 | **10-07b: T77-k で実行（退避と、戻すための INSERT つき）。** Platycerium CSV 退避 → `cultivars` 18行 + `genera.id=4` 削除、テストデータ削除 SQL | Claude Code 用意 → オーナー実行 | 9/10 | 看板との整合 |
| T37 | **ローンチ実行（§4b）**: ソフト 9/21〜10/2 → 本告知 目標 10/3・上限 10/24 → +1週 海外 DM・ブログ → +2週 専門店・出品者 → Monstera 第二波。Claude Code は当日の最終チェック（19:00、M1〜M10 チェックスクリプト）と翌日以降の指摘修正（24h 以内）。**09-07 追加**: 第 4 週に 告知文の数値差し替え（'Michelle' 未収録なら 1 投稿目 crystallinum）、④「この株から実生を記録 →」（原種・Clone・個体の操作行、`data-prefill` 流用、GA `contribute_start{source:'from_parent'}`、1h）、写真到着時の版画 CSS 試作（T35、2h 予備）。本告知 +1 週に 訂正の可視化（新着記録「訂正」種別・収録メモ「訂正 n 件」・訂正者 by-line）、他者投稿 最初の 5 人へ `granted`。初週の判断線は monetization §4-3（来訪→登録 ≥4%、登録→会員 ≥8%、share ≥30、paywall 到達 ≥3%、投稿導線 ≥30%） | オーナー（投稿・返信）+ Claude Code | 9/21〜10/31 | 来訪 1,000 → 会員 5・初月現金 ≈9,250円 |
| T38 | 出典書籍の書誌欄（リンク無し、著者・年・書名・ISBN。Bown *Aroids* 2000、Croat 1986 ほか出典に現れる分だけ）。**09-30: 書誌は道具の目録「書籍・資料」と相互リンク、Amazon はもしも経由で可** | Claude Code | T25 と同時 | 資料館の価値。Amazon 条件付きの下地 |
| T39 | **①〜④ 完了 09-07（ゲート改訂・IPNI 型データ準拠のデータ修正・由来文再生成・典拠表組み込み）** **taxonomy 一括（第4回、第 1 週）**: ①ゲート G1〜G9（`wireframe/js/record-gate.js` ← `docs/board/data/2026-09-07-record-gate.proposed.js`）+ i18n 2 キー + sitemap・admin 再判定（2h） ②データ修正 SQL D1〜D15 + 削除 3 件（§3 09-07 項、バックアップ `docs/board/data/`、4h） ③由来文再生成 12 件（1, 3, 9, 31, 32, 33, 34, 38, 57, 77, 82, 83）+ 生成器 basionym・原綴分岐（2h） ④人物典拠表 `wireframe/data/people-authority.json` の組み込み（`archive.js` `peopleIndex` + `scripts/lib/people.js`、alias_of 畳み込み、kind nursery/handle ラベル、見出し本名 + mono「IPNI 略称 · 生没年」）+ 静的 people/anthurium の掃除と名寄せ（2.5h）。目標: 合格 29/31 | Claude Code | 9/12 | M1・M3（C2・C4・C5・C11・C13） |
| T40 | **完了 09-07** **content 第 1 週**: カタカナ別名 SQL（トップ15: ミッシェル/ミシェル・ザラ・ドラヤキ・RVDP/レッドベインダークフェニックス・クリスタリナム・クラリネルビウム・ワロクアナム・パピリラミナム・フォルゲティ・レガーレ・ルクスリアンス・マグニフィカム・エースオブスペード・ダークママ・ブラックベルベット + 収録済み全件、1h）+ 検索に `_aliases` 一致（`pages.js:1397/1675`）+ 静的スタブ JSON-LD `alternateName`・description 末尾「別名」+ 未収録・記録なし description 定型 + Trial 残骸（`pages.js:159-188, 328-337` `isTrial`・バッジ・「無料お試し期間」）・死にキー `add_origin_title.en` 削除 + GA 4 本（`paywall_view{source}` 7 か所、`login{source}`、`contribute_start{source}`、`share_click{channel:'copy',source:'submit'}`） | Claude Code | 9/12 | M2・M6（≈3.5h） |
| T41 | **完了 09-07** 検索 0 件 → 「この名前の収録を依頼」（ログイン不要、`genus_requests` に `kind` 列 genus/name、同 RPC・同ダイアログ、admin 集計 → 次の 20 件の収録順）+ GA `search_zero{term}` + 0 件シート「別名で探す: 'Black Velvet' → antolakii」1 行 | Claude Code | 9/19 | 告知文「足りない名前を教えて」の受け皿（1.5h） |
| T42 | **完了 09-07** 用語集 8 語（§4 09-07、未収録シート・個体欄からリンク）+ 使い方ガイド 5 見出し化（手順リスト 5 本・「コミュニティ…プラットフォーム」・「ユーザー名」削除、`.card` → hairline `<section>`、「記録の読み方」8 行: 記録 n · Tier · 信頼度 · 未収録/調査中/記録なし · AI 下書き · 検証済） | Claude Code | 9/19 | E5・初見の信頼（2.5h） |
| T43 | `/timeline/` 独立 URL（トップの年表部品流用）+ 年表画像 1 枚（標本カード描画関数、1873 crystallinum → 1878 warocqueanum → … → 2020 年代 Clone）+ 静的スタブ・sitemap | Claude Code | 9/28 | 告知素材（Instagram 2 枚目・X 2 投稿目）、被リンクの受け皿（2h） |
| T44 | **完了 09-30（本番）**: 属ページ・詳細ページの道具棚と絵文字 fallback を削除（`forms.js` の旧ブロック一式、詳細は `#tool-context` の空枠に置換）、`t29a`・`t27a` を merge（競合は双方残し）、キャッシュバスター `20260930a` / `v46`。 **滞留解消 + §2 違反の是正**: 属ページ道具棚（`forms.js:2208-2217`、`:378-380`・`:2145-2147` の `top-affiliate-grid`/`genus-affiliate-grid`）と絵文字 fallback（`:2179/2182/2200`）削除 → `t27a-reading-order`・`t29a-og-cards` merge → キャッシュバスター 12 箇所 + `sw.js` → 本番 | Claude Code | 10/1 | 決定違反の解消・M5（1.5h） |
| T45 | **完了 09-30（本番）**: migration 適用済み（`tool_genres` 9 行、既存 7 件に slug・genre 割当、`species text[]` も追加 = 詳細の「この道具を使っている種」。原種側に自生地タグの列が無いため、T47 の照合は当面この欄で行う）。共有判定 `wireframe/js/tool-gate.js`（C9 の合格条件・禁止語・価格数字・もしもホスト判定・`catalogueOpen`）。管理画面「道具（アフィリエイト）」: ジャンル select・URL名・メーカー・型番・規格・価格帯・一言・使用記録（字数と index 可否をその場で表示）・自生地条件・使っている種・自前写真・楽天/もしも HTML の分解・点検済みボタン。旧 amzn.to は管理画面で「表示されません: もしものリンクに貼り替え」と出る。 **道具の器（P0）**: migration `20260930100000_tools_catalogue.sql` に `amazon_imp text`・`last_checked_at timestamptz` を追加、`tool_genres` 9 行 seed（§2-3）、既存 7 件に slug・genre → 管理画面「道具」（ジャンル select・メーカー・型番・規格・価格帯・一言・使用記録 80 字未満は「noindex になります」・habitat_tags・自前写真・**もしもの HTML を貼ると href と imp を分解して保存**・`icon` 欄削除・点検モード） | Claude Code | 10/2 | オーナーがデータを溜め始められる（2h） |
| T46 | **10-03: 40 点 → 36 点（T48 D 節で範囲外 4 点を非公開・名前訂正 12・説明 2）。スマホ表示・PR 位置・文言は T58（10/14）。** **本番 merge 10-02（48h 経過）。URL 直打ちでのみ表示、10/24・12点・6ジャンルで自動公開** **10-02 オーナー指示で上書き**: 一覧は写真つきのショップ型（部門ナビ・画像カード・価格・ストアリンク、商品ページは大きな画像＋ストアボタン＋同じ部門の道具）。「実際に使っている物だけ」をやめ、楽天市場 API の自動リサーチ（レビュー数・評価4.0以上から AI が部門に合う物を選び、名前と中立の説明を整える）で全部門を埋める。運営者の物は「使用中」印で区別し PR 文もそれに合わせた。C10 の「2件以上の部門だけ表示」は廃止（全9部門を表示、0件は準備中）。Yahoo! の既存リンクは Yahoo!ショッピング自社アフィリで API から作れないため、Amazon（もしも）と同じく手動貼り付け。自動追加分は使用記録が無いので noindex のまま（toolGate 不変）。 旧: プレビュー branch `t46-tools`（09-30）: 目録・道具の1頁・GA `affiliate_click{shop,slug,genre,page}` と `tools_filter`・静的スタブ + sitemap（ToolGate 経由）まで実装。公開判定 `catalogueOpen` = 10/24 以降 かつ 12 点・6 ジャンル以上。それまでは noindex・フッター/メニューのリンク非表示で、URL を直接開いた人にだけ見える。 **道具の目録（P1〜P3）**: `/tools/` + `/tools/<slug>/`（§5）・`tools.js`・`toolGate`・PR 2 か所・もしも imp（lazy なし）+ CSP `img-src https://i.moshimo.com`・Amazon は `af.moshimo.com` のみ描画・GA `affiliate_click{page,genre,shop,slug}`・ジャンル解説 9 本・書籍 2 冊の書誌・静的スタブと sitemap（合格分）・`app-core.js` の `buildPath`/`parseRoute`/`navigateTo`・i18n `tools_*`。公開までフッターに出さず noindex → 10/14 プレビュー → 本告知の翌週土曜に公開 | Claude Code → オーナー実機 | プレビュー 10/14 | アフィリの受け皿・ロングテール（8h） |
| T47 | **10-07b: T96（属レベルの 1 行）に改訂。** **文脈行（P4、旧 T34）**: 自生地環境（着生・雲霧林・標高）が `habitat_tags` と一致する原種ページと産地ページに、文字行 最大 2 行 +「道具の目録 →」（見出し「この種の自生環境に近い道具 — PR」）+ フッター・モバイルナビ「道具」。T46 公開と同時 | Claude Code | 本告知の翌週土曜 | +クリック（1h） |
| T48 | **第6回 データ正確性**: 修正 SQL 46 文（'Galaxy' は差し替え文、E 節は実行しない）→ recordGate 29/31 維持を確認 → `archive.js:132` 個体判定 tag のみ・`archive.js:504` 別名 最大 3 語・`research-origin` 原種テンプレ（短縮出典・国名和訳・「（POWO）」なし） | Claude Code | 10/3 | M3（1.5h） |
| T49 | 漏れの止血: `.d-none{display:none !important}`（モバイルメニューの未公開「道具」、ログアウト時の投稿履歴・プロフィール）、フッター Admin は admin のみ | Claude Code | 10/3 | 0.3h |
| T50 | 画像の変換配信 `imgUrl(path,w)`（`/storage/v1/render/image/public/...?width=&quality=70`。一覧 120/240・今日の一葉 720・詳細 srcset 800/1600・ライトボックス 1600、`onerror` で原寸）+ 主画像枠 aspect-ratio + `sw.js` | Claude Code | 10/4 | スマホの表示と通信量 1/10（2h） |
| T51 | 直着地: `data-boot=deep`・`pages.js:1197` 区分の既定を空 + スケルトン・未収録名は `.sheet--search` + 収録依頼 + noindex・未知ルートは notfound・`#static-seo-links` は画面外 | Claude Code | 10/4 | Clone を「原種」と見せる誤りと架空ページの解消（2.5h） |
| T52 | 品種詳細（375）: 操作行 主要 3 +「その他」・「削除依頼」は所有者/管理者のみ・投票は文字「正確 n · 疑問 n」・記録見出し 1 行・日付 YYYY.MM.DD・ラベル余白と別名全幅・coarse 44px・「記載史年表 →」は `/#timeline`・Tier/信頼度を用語集へ・初回セッションのみ定義文 1 行 | Claude Code | 10/5 | 3h |
| T53 | メタデータ: `entryTitle`/`entryDesc`（カタカナ別名）をスタブと SPA で共用・スタブ select に aliases・`alternateName`・canonical 末尾スラッシュ・`Thing`+`aggregateRating` 削除・Breadcrumb 1 本・クローラー UA は jp・hreflang ja のみ・「コミュニティ投票」文言削除・人物スタブ title 本名 | Claude Code | 10/6 | カタカナ検索・正規 URL（2.5h） |
| T54 | トップと属一覧: ≤640 masthead 圧縮で今日の一葉を 1 画面目・`anthurium.png` 不使用・最終更新/最終収録・件数「収録 n」1 関数・`.ledger-table` 50 件/頁・区分順 → 名前順・% は RecordGate・チップ「原種 · Hybrid · Clone · 実生」・検索窓全幅・placeholder カタカナ例・人物索引 本名 | Claude Code | 10/7 | 3.5h |
| T55 | 料金・法務（T30 を master 上で作り直し）: 会員 500/5,000（受付準備中）・特典 2 つ・事業者表記・特商法の冒頭注記と契約行・規約 2/5/8/9/9 の 2 条と無償付与・プライバシー GA4/外部送信・About・ガイドの期日・meta/スタブ・最終更新 10/3 | Claude Code | 10/8 | M9（2.5h） |
| T56 | 表記・用語: `sciNameHtml` イタリック・lining-nums・英字始まりはドロップキャップなし／用語集 D2〜D5・ガイド D6 D7・投稿フォーム D9・`pages.js:975` D8 | Claude Code | 10/12 | §3 表記規則の実装（2.5h） |
| T57 | 品種スタブ本文のプレレンダー `#static-entry`（標題行・h1・cite・別名・由来文 1 段落・720px 写真・同産地 3 リンク、SPA 起動で除去） | Claude Code | 10/13 | 白紙 10 秒の解消・日本語本文がクローラーへ（2.5h） |
| T58 | /tools/ 品質（10/24 前）: PR 2 行を一覧の前へ・Amazon/使用中の文は条件付き・meta 文言・空欄は行ごと省く・価格の取得時点・ストアリンク 44px/0.72rem/枠線・≤640 は 1 列の行（左 96px 画像）・PC は格子維持・詳細画像 `_ex=600x600`・spec は詳細のみ・リサーチ再実行で名前を上書きしない | Claude Code | 10/14 | 2h |
| T59 | 各本番後の 375px 再計測（回線を絞り、直着地 3 秒以内に h1・cite、写真 8 秒以内）+ スクリーンショット 5 枚（トップ・属一覧・warocqueanum・'Ace of Spades'・存在しない URL）をオーナーへ | Claude Code | 各本番当日 | 0.5h/回 |
| T60 | **トークンと直書きサイズ**: variables.css のトークン（作業ツリーにあり）→ archive.css・pages.css の 0.56〜1.02rem を `--fs-label/small/body` に置き換え、余白を `--s1〜s3` に、`--color-trust-mid` を ink に | Claude Code | 10/8 | 統一の土台（1h） |
| T61 | **統一レイヤー**（archive.css 末尾 1 ブロック、design 報告 §4 手順3 A〜F ＋ `.mono` の大文字化なし・法務の段落を ink・PR 12px・≤640 でラベル 1 列・メニュー 16px・≡ と + 投稿を 44px）。完了は `cdp_audit.js` で 9 画面 ×3: サイズ ≤8、12px 未満 0、mono ≤35%、段落の mid 0、はみ出し 0、44px 未満 0 → **本番1**（会議前に直した 4 件も同梱） | Claude Code | 10/8 | まとまり（3h） |
| T62 | **一覧の 1 行** `entryLine(d)`・`countryLabel()`（archive.js:420 と app-core.js:2535 を置き換え）・`countryOf` はテキスト中の最初の国 | Claude Code | 10/9 | 件数・区分・✓ のずれをなくす（2.5h） |
| T63 | **トップ**: 英字の見出し行を削除・統計 1 行・並び（一葉 → 新着 → 索引 → 年表 details）・人物 5 人・区分の項を削除・年表の種小名をイタリックに | Claude Code | 10/9 | 1,000px 以上短く（1h） |
| T64 | **品種詳細の重複削除**（会議録 §5-1 の ①〜⑰） | Claude Code | 10/9 | 正確性・長さ（2.5h） |
| T65 | **属一覧**: タブ 1 段・select 2 つ・説明 1 文・件数 1 行・サーバー経路では件数を書かない・「+ 品種を追加」をリンクに | Claude Code | 10/9 | 0 件表示の解消（1.5h） |
| T66 | **用語**（会議録の置き換え表）→ **本番2** | Claude Code | 10/9 | 用語のつまずきをなくす（1.5h） |
| T67 | **道具の目録・料金・法務**（部門 2 列で 0 件は出さない・英字の標題行を削除・価格をゴシック lining・使用中バッジ・ストアは主 1 つと副・図版 240px・料金の並び・条項 details・最終更新 YYYY.MM.DD・特商法のパンくず）。収益の不変条件は diff で確認 | Claude Code | 10/10 | 受け皿の信頼（2.5h） |
| T68 | **データ修正**（`docs/board/data/2026-10-07-fixes.sql`）: 108・121 を unresolved、121 の origin_region、verification_note 27 件と本文 3 件の日付を削除、people-authority の Pérez-Farrera を名寄せ、radicans は IPNI で照合だけ。合格 40・検証済 27/27 を維持 → **本番3** | Claude Code | 10/10 | M1・M4 の維持・正確性（0.5h） |
| T69 | ~~antolakii の表示名~~ **10-07 済**: entry-meta.js の name() 1 か所に規則（species で qualifier なし・species_status が undescribed/provisional_name → Genus sp. "epithet"）。画面・タイトル・スタブ・パンくず JSON-LD・共有文が同じ名前。URL は不変 | Claude Code | 10/07 | — |
| T70 | ~~原種本文の型~~ **10-07 済**: research-origin のテンプレートで同じ値は「タイプ産地・分布とも X。」（英語も）。既存 4 件（4・11・35・129）は AI 再調査なしで置き換え（docs/board/data/2026-10-07-t70.sql、バックアップあり）。research-origin の旧い型エラー（496 行）も修正してデプロイ | Claude Code | 10/07 | — |
| T71 | ~~分布 4 地域まで＋WCVP 地域名の和訳表~~ **10-07 済**（オーナー要望で前倒し）: 4 地域を出し「ほか n 地域」を押すと残りが開く。和訳は archive.js REGION_JA（データにある地域名 75 件、本文の表記に合わせる）。説明文が入った値は分けずにそのまま表示 | Claude Code | 10/07 | — |
| T72 | ~~属一覧の折りたたみ~~ **10-07 済**（メモリ内の一覧）: 記録不足の名前は末尾の「記録が足りない名前（n）」に畳む（検索中は開く）。**残り**: 必須項目が空のときの「記録なし」表示は sine loc. と区別する値の定義待ち → T78 で解決 | Claude Code | 10/07 | — |
| T73 | ~~別名と本文の学名~~ **10-07 済**: 別名は名前の下の 1 行（ラベルから外す）。由来の本文と今日の一葉で学名をイタリック（italicizeSciNames、sp./aff./cf. と人名略記は立体のまま） | Claude Code | 10/07 | — |
| T74 | ~~投稿フォーム~~ **10-07 済**: 送信だけ主ボタン、絵文字を全廃（📤🗑📷🔍 → 文字か線のアイコン）、削除ボタンの直書きの赤を .btn--danger-outline に、見出しを h2 共通に。パンくず・フッターのリンクに 44px の押せる範囲 | Claude Code | 10/07 | — |
| T75 | ~~components.css の旧層~~ **10-08 済**: 使われていないセレクタ 62 個を削除（60KB→51KB）。8 画面の全要素で計算済みスタイルが変わらないことを確認。og-image・trial-reminder は本番に無く、リポジトリのフォルダを削除 | Claude Code | 10/08 | — |
| T76 | **URL の表記ゆれを救う**（正規化後の完全一致が 1 件 → replaceState。部分一致では飛ばさない）＋ `research_requests` の antolakii 名の確認（本番A） | Claude Code | 10/8 | 共有リンクの取りこぼしを防ぐ |
| T77 | **分類データの修正** `docs/board/data/2026-10-07b-fixes.sql`（Galaxy → Clone〔IAS を描画で確認後〕・Dark Mama → Hybrid・Queen of Hearts を記録なしに・Red Crystallinum の推測削除・Angels dream の出典と別名・absent 3 行・Mystique A88 → Clone + line・文面 5 件・`updated_at` の補正 9 行）＋ Platycerium の退避と削除（別ファイル、T36 を閉じる）。収録 40・検証済 27/27 を維持（本番A） | Claude Code | 10/8 | M3・正確性 |
| T78 | **「わからない」の 3 つの値**（record-gate・ラベル・系統図の点線、tag `parentage_unconfirmed`）。T72 の残りを閉じる（本番A） | Claude Code | 10/8 | 正確性 |
| T79 | **人物の名寄せ**（Vannini・Sodiro・Koch・Haage・Banta、導入者を人物索引へ）と、親の名前の照合を `normParent` 1 つに（本番A） | Claude Code | 10/8 | 404 の解消・重複登録の防止 |
| T80 | **産地ページ**（geo.js と archive.js を一致させ CI で確認・題名「{国}の原種 n 種（タイプ産地 a · 分布 b）」・2 群・流通だけの産地を除く・和名・統計を dl 行に）（本番A） | Claude Code | 10/8 | 正確性（いちばん大きい誤表示） |
| T81 | **お問い合わせの通知と一覧**（区分 shop・`/contact/?c=shop`・`contact-notify` の宛先は運営アドレスに固定・自動返信なし・管理画面一覧・料金 `#shops`）（本番A） | Claude Code | 10/8 | 取扱店 3,000 円/月の前提 |
| T82 | **About を直す**（`<br>`・特徴の一覧・「この図鑑について」・運営資金の 1 文・「投票」の削除）（本番A） | Claude Code | 10/8 | PAY.JP の審査・信頼 |
| T83 | **タイトル・別名をカタカナの検索語の形に** ＋ 別名の SQL（13 件 ＋ ワロクアーナム）（本番B） | Claude Code | 10/11 | 検索流入 +150〜250/月 |
| T84 | **スタブにリンクを書く**（記載者・国・前後・属）・内部リンクの末尾スラッシュ・Person.name を本名に・sitemap の lastmod（本番B） | Claude Code | 10/11 | 人物・産地の index |
| T85 | **実生のスタブ・共有カード・sitemap**（公開分だけ）＋ フォーム冒頭の 1 文（本番B） | Claude Code | 10/11 | 投稿者が自分の記録を見せられる |
| T86 | **会員受付のお知らせ名簿**（`member_interest`・RPC・ボタン・プライバシー 5 条・管理画面・一斉送信は承認フラグつき）（本番B） | Claude Code（送信はオーナー承認後） | 10/11 | 開始日 +1,000〜1,500 円/月 |
| T87 | **見た目の取りこぼし一括**（D5・D6・D11〜D23、D8 + I5、I8 強制ダークの停止、`/contribute`・`/search` を noindex）（本番B） | Claude Code | 10/11 | 着地の品質 |
| T88 | **使い方ガイドの定義集**（taxonomy 報告 §3）・「Original Species」の削除・g-trade-name の 1 文（本番B） | Claude Code | 10/11 | 初見の信頼 |
| T89 | **標本ラベルの印刷（QR つき）**。T28a を置き換え。ログインした全員に無料・A4 2×4・QR は自サイトの URL だけ・GA `label_print`（本番C） | Claude Code（iPhone での印刷確認はオーナーの任意） | 10/14 | E9・M6・ログイン率 |
| T90 | **写真なしを 1 行の帯にし、写真の高さに上限**（I2・I3 の一部）（本番C） | Claude Code | 10/14 | 記録を 1 画面目に |
| T91 | **新着を日付の見出しでまとめる**（I4）（本番C） | Claude Code | 10/14 | mono ≤35% |
| T92 | **投稿フォームを罫線の 1 列に**（D10。送る中身は変えない）（本番C） | Claude Code | 10/14 | M7・他者投稿 |
| T93 | **読み込み中のずれを軽く抑える**（初期の文言・骨組み・高さの確保。CLS ≤0.25）（本番C） | Claude Code | 10/14 | 着地の品質 |
| T94 | **Instagram 用の縦長画像と投稿文コピー**（`images/ig/`・告知用 launch-1〜5）（本番C） | Claude Code | 10/14（画像は 10/15 まで） | オーナーの投稿 1 回 3 分 |
| T95 | **未登録 4 名の登録**（10/11 Dorayaki・10/13 Michelle・10/15 Zara・10/16 RVDP。出典つき・推測なし） | Claude Code | 10/16 | **M2**・M8 |
| T96 | **道具の文脈行（属レベル）と取扱店の募集の 1 行**＋ 営業キット `docs/board/2026-10-24-shops-kit.md` | Claude Code | 10/24 | +100〜300 円 ＋ 申込 0〜1 店 |
| T97 | **振込の年額会員**（スイッチを切った状態で作る。開く条件は §2） | Claude Code / 入金確認はオーナー | 10/30（開くのは 11/1） | 最悪の場合 +400〜1,250 円/月 |
| T98 | ~~静的スタブを SPA と同じ骨組みに~~ **10-08 済**: スタブの最初の画面を品種ページと同じ部品で組み、品種ページが描けるまで残す。ローカル実測 CLS: 品種 0.81→0.13、属一覧 0.71→0.04 | Claude Code | 10/08 | — |
| T99 | ~~/names/~~ **10-08 済**: black-velvet・red-crystallinum・spades と一覧（dorayaki は T95 の登録後） | Claude Code | 10/08 | — |
| T100 | ~~属名の由来・用語の個別ページ~~ **10-08 済**（IPNI 329747-2、/glossary/g-…/ 29 語） | Claude Code | 10/08 | — |
| T101 | ~~プロフィール・この原種から実生~~ **10-08 済**: プロフィールは全区分を一覧の1行で、品種ページ「その他」に「この品種を親に実生を記録」（母を入れて開く）。投稿フォームの最初の 3 択はアプリ化の設計（2026-10-08-app-ux-*.md）に合わせて行う | Claude Code | 10/08 | — |
| T102 | 掲載店のクリックの記録と請求書の回数 | Claude Code | 11/25 | 取扱店の継続 |
| T103 | ~~check-names.js~~ **10-08 済**（CI で毎回、管理画面に結果。公開は止めない） | Claude Code | 10/08 | — |
| T104 | **10-08 オーナー指摘で保留**: 原種を増やすと写真のないページばかり増える。写真が手に入るもの（オーナーの株・提供の約束がある株）から足す選び方を、写真集めの仕組みと一緒に決め直す（2026-10-08-app-ux-content.md） | Claude Code | 保留 | — |
| T105 | ~~図版・用語集の目次・フッター~~ **10-08 済**（図 n / N、目次、フッター短縮） | Claude Code | 10/08 | — |
| 条件到達時 | `/seedlings/` 索引（公開実生 ≥20・投稿者 ≥5）／ ヘッダー EN（非 ja ≥15%）／ 楽天・Yahoo! のもしも移行（アフィリ確定額 2ヶ月連続 ≥3,000円）／ 道具一覧のサムネイル（オーナーが 10/14 プレビューで求めた場合、自前写真のみ） | Claude Code | — | — |

**第6回（10-03）の実装順**: T48 → T49 → T50 → T51 → T52 → T53 → T54 → T55 → T24 → T26 → T56 → T57（告知前必須、全体 10/13）→ T58 → T33（10/24 前）。T59 は各本番後。詳細は `docs/board/2026-10-03.md` §2。

**第7回（10-07）の実装順**: T60 → T61 →（本番1）→ T62 → T63 → T64 → T65 → T66 →（本番2）→ T67 → T68 →（本番3）。各本番のあとに T59。次回は T69・T70・T71・T74（10/14）、T75（本番1 +1 週）、T72・T73（本告知後）。詳細は `docs/board/2026-10-07-decisions.md` §5。

**第7回の実装結果（10-07、3 回とも同日に本番）**: 本番1 = T60・T61＋会議前の修正 4 件＋年表のイタリック・系統図の子の判定（3d6c430）。本番2 = T62〜T66（b480c08）。本番3 = T67・T68（下記）。375px 実測（ローカル、変更後）: 文字サイズ 1 画面 5〜8 種（変更前は全体で 36 種）、12px 未満 0、mono 3〜55%（人物ページだけ 35% 超。年・件数の数字が多いため）、横はみ出しなし。トップは今日の一葉 → 新着の品種 → 索引 → 年表（閉じる）。T68: 108・121 を unresolved（121 は origin_region「ペルー（流通情報）」）、検証メモ 27 件と本文 3 件（59・127・138、日英）から日付を削除、検証済 27/27 を維持。radicans は IPNI（85262-1: K.Koch & A.Haage, 1854）と一致し変更なし。Pérez-Farr. は IPNI 38770-1（Miguel Ángel Pérez-Farrera）で人物典拠に登録し、「M. A. Pérez-Farrera」を alias_of でまとめた（archive.js と scripts/lib/people.js の personKey が alias_of を読む）。バックアップ 、SQL 。残り: 44px 未満のタップ（パンくず・フッターのリンク、5〜8 個/画面）は T74 と一緒に、交配式の属名略記（A. ×）は T73 に回す。

**第8回（10-07b）の実装順**:

**第8回の実装結果（10-07、本番A・B・C を同日に出した）**: 本番A 14e56b2（T76〜T82）、本番B 672d34a（T83〜T88）、本番C（T89〜T94）。会議前の修正 09015ff（共有リンク・antolakii の描画停止・タッチ端末の崩れ・語中改行・サムネイル）。収録 40（原種 32・Hybrid 4・Clone 4）・検証済 27/27 を維持。**'Galaxy' は IAS の登録ページを機械で読めず確認できなかったため Hybrid のまま**（裁定どおり。ページを目視できたら T77-a を流す）。Platycerium の削除（T77-k）は未実行（退避と戻す SQL を作ってから別途）。お問い合わせの受付 RPC は本番の列（id bigint・status・created_ip）に合わせて作り直した（一時的に古い定義で上書きしてしまい、約 10 分間送信が失敗した可能性あり。その間の送信記録は 0 件）。会員のお知らせの一斉送信は MEMBER_NOTIFY_ENABLED が未設定のため動かない（オーナー承認待ち）。**残り**: T95（4 名の登録、10/11・10/13・10/15・10/16 の実日付で）、T96（10/24）、T97（10/30）、T98〜T105、T75。
- 本番A 10/8 = T76 → T77 → T78 → T79 → T80 → T81 → T82
- 本番B 10/11 = T83 → T84 → T85 → T86 → T87 → T88
- 本番C 10/14 = T89 → T90 → T91 → T92 → T93 → T94
- データ T95 = 10/11・10/13・10/15・10/16
- 10/24 = T96。10/30 = T97。告知後 = T75・T98〜T105
- 各本番のあとに T59（タッチ再現・CLS）。10/17 の 19:00 の最終チェックに「共有リンクで品種ページが開く」「M2 の 15 名が学名とカタカナで 0 件にならない」を加える。
- 詳細は `docs/board/2026-10-07b-decisions.md` §4。

**第6回の実装結果（10-03、すべて本番）**: T48 データ修正 46 文 + 個体判定 tag のみ・別名 3 語・原種テンプレ／T49 メニュー・Admin リンク／T50 写真を表示サイズで配信（5.1MB→8KB 等）／T51 共有リンクでトップを出さない・未収録シート・notfound／T52 操作 3 つ + その他・投票は文字・記録見出し 1 行・44px／T53 タイトル式（カタカナ別名）・canonical・aggregateRating 削除・クローラー日本語／T54 トップ 1 画面目・件数「収録」統一・区分語統一・属一覧を罫線 1 ページ／T55 料金・法務（会員 500/5,000・受付準備中・GA4・外部送信・運営者）／会員申込は全入口「準備中」（。**開く前に Stripe Price 秘密値（旧 240/2,500）を差し替え**）／T24 原種 14 件 → 点検後 12 件公開、portillae（nom. nud.）削除、Fort Sherman は papillilaminum の個体、Dark Mama に Vannini 出典の記録 → **M1 収録 40/41 達成**／T26 検証済の仕組み・管理画面「検証」・記載種 27/27 検証済 → **M4 達成**（antolakii は未記載のため対象外、sp. 化は URL 転送の後）／T56 学名イタリック・用語の統一（D1〜D3・D5〜D10）／T57 スタブに本文の 1 画面目／T58 道具の目録のスマホ 1 列・PR を上に・44px／T33 取扱店掲載（月 1,000 円・振込・請求書・帳簿連携）。research-origin は DOUBTFUL・異名・別名一致に S を付けない。record-gate の formula_status=unknown バグ修正。**残り**: D4（流通名の引用符の決定）、D12（Platycerium 行の削除）、Galaxy の区分（O-1）、Dark Mama の区分（出典は「単純交配はすべて Dark Mama」= Hybrid を示唆。2 本目の出典で確定）、BVIT の作出者、antolakii の sp. 化（旧 URL 転送）、Cloudflare 解析ビーコンが CSP で止まる（GA4 で足りるので放置可）。

完了（09-04〜09-07）: T20 AI 再調査リクエスト（09-07）、T1 Field Archive 本番、T2 データ修正22件、T3 Phase A 列追加・分割入力、T5 人物ページ、T6 系統図、T8 産地・用語集・自動リンク、AI 調査の歯止め、未記載種経路、Stripe 申請パック。**廃止**: 旧 T4（支援者2プラン）→ T30、旧 T11（有料由来調査）→ T20、旧 T9 の英語補完 → 凍結。

---

## 7. オーナー待ちタスク（各に既定回答つき、無回答なら既定で進む）

### 7-000. 10-07b 第8回の依頼（最新。全文は `docs/board/2026-10-07b-decisions.md` §6）

| # | 依頼 | 手順・所要 | 期限 | 無回答時の既定 |
|---|---|---|---|---|
| 1 | PAY.JP の状況を 1 行で | 申請したか・審査からの連絡の内容。2 分 | 10/10 | 10/31 に振込の年額の条件を判定。電話番号はそのとき相談（それまで非公開） |
| 2 | 写真 5 枚 | clarinervium・luxurians・regale・'Dark Mama'・antolakii。正面・無地・長辺 2,000px 以上。40 分 | 10/12 | 写真なしで告知 |
| 3 | 実機の確認 1 回 | 本番B の後に iPhone で、共有 → LINE と X でカードと着地、トップの年表、warocqueanum の一番下。10 分 | 10/12 | パソコンの確認だけ |
| 4 | 楽天の成果確認と GA4 のキーイベント | 楽天リンク 2 種を押して翌日のレポートを見る。4 イベントに印を付ける。15 分 | 10/12 | 「未確認」と記録 |
| 5 | ソフトローンチの DM 2 通 | 15 分 | 10/13 | ストーリーズだけ |
| 6 | 本告知 | 10/17 20:00 X → 20:30 Instagram（T94 の画像）→ 23:00 まで返信。2 時間 | 10/17 | 10/24 に確定 |
| 7 | 取扱店の候補 3〜5 店 → DM | 候補 10 分、DM 30 分（文面は T96） | 10/20・10/24 | 募集の 1 行だけで待つ |
| 8 | もしもの Amazon と書籍（7-0 #4 の継続） | 1 件 1 分 | 10/20 | 楽天・Yahoo! のみ |
| 9 | 受付開始のお知らせメールの承認 | 決済の稼働日に「送ってよい」と一言 | 稼働日 | 送らない |
| 10〜12 | （任意）登録した 4 名の確認・自分の実生 2〜3 件・Android の強制ダークの確認 | 各 5〜20 分 | 10/14〜10/16 | 未検証のまま／89・55 だけ／確認なし |

報告だけ（返事不要）: 'Galaxy' は Clone（O-1 は閉じる）、'Dark Mama' は Hybrid、'Mystique A88' は Clone + line、'Queen of Hearts' は記録なし、'BVIT' の作出者は「該当なし」、Platycerium は退避して削除。O-2 と 55 の播種日は継続。

**10-07 第7回の依頼: なし。** 任意で、本番1〜3（10/8・10/9・10/10）のあとに届く 375px のスクリーンショット（トップ・属一覧・warocqueanum・'Ace of Spades'・存在しない URL＋/tools/・料金）を見て、気になる点だけ箇条書きで返す（各 10〜15 分、48h 反応なしで確定）。

### 7-00. 10-03 第6回の依頼（最新。全文は `docs/board/2026-10-03.md` §5）

| # | 依頼 | 手順・所要 | 期限 | 無回答時の既定 |
|---|---|---|---|---|
| O-1 | **'Galaxy' の F1 実生が同じ名前で売られているか** | 見たことがあるか、売り場（店名・URL）を 1 行で。5 分 | 10/10 | Hybrid のまま、本文は「F1 から選んだ 1 株の名前とされる（同名の F1 実生の流通は未確認）」。売られていないなら Clone に変更 |
| O-2 | **'Red Crystallinum' の Tim Anderson は作出者か、個体群の保有者か** | 知っていれば 1 行。5 分 | 10/10 | 作出者欄のまま、本文は「持っていた個体群に由来するとされる」 |
| O-3 | **本番後のスクリーンショット確認（任意）** | 届く 375px の画像 5 枚（トップ・属一覧・warocqueanum・'Ace of Spades'・存在しない URL）を見て、気になる点だけ箇条書き。iPhone で同じ画面を開ければなお良い。各 10〜15 分 | 届いてから 48h | 48h 無反応で確定 |

継続: 7-0 #1 開業届（10/3）・#2 PAY.JP（10/5）・#4 もしも（10/20）・#9 シード投稿（10/10）はそのまま。7-0 #5 の「実際に使っている物だけ」は 10-02 のオーナー指示（自動リサーチ）で必須でなくなった（任意で「使用中」の印と使用記録 80 字を付ければ、その商品ページが index される）。7-1 #7 の `anthurium.png` の出所は、答えがあればトップでの再使用を検討（無回答なら使わない）。

### 7-0. 09-30 第5回の依頼（最新。旧表 #6 決済・#9 開業届はこれで置換。手順の全文は `docs/board/2026-09-30.md` §6）

| # | 依頼 | 手順・所要 | 期限 | 無回答時の既定 |
|---|---|---|---|---|
| 1 | **開業届（e-Tax）** **→ 10-08: 2027-01-01 付に変更（オーナー決定）。青色申告承認申請書も同時に** | マイナンバーカードで「個人事業の開業届出書」、屋号 Aroid Origins 可、事業内容「ウェブサイトによる情報提供・広告掲載」、受信通知 PDF を保存。30分 | 10/3 | PAY.JP 申請不可。会員受付は「準備中」のまま本告知 |
| 2 | **PAY.JP 本番申請** **→ 10-08: 2027-01 上旬に変更** | 開業届の控え・本人確認書類・サイト URL・特商法 URL `https://plantsstory.com/tokushoho/`、説明は `docs/stripe-application.md` §3 を月500円・年5,000円に読み替え。承認されたら一言、鍵は画面共有で Supabase Secrets へ（チャットに貼らない）。30分 | 10/5 | 同上 |
| 3 | **Stripe は何もしない** | 取り下げ・問い合わせ不要。承認メールが来たら一言。0分 | — | 放置 |
| 4 | **もしもの Amazon リンク** | もしも管理画面で Amazon.co.jp が「提携中」か確認 → 商品ごとにリンク発行 → HTML（`<a>` と `<img>`）を丸ごと管理画面「道具」の Amazon 欄へ（URL はいじらない）。既存 7 件 + 新規。1件1分 | 10/20 | Amazon ボタンを出さず楽天・Yahoo! の 2 ボタンで公開 |
| 5 | **道具データ（実際に使っている物だけ）** | 新規 5 件以上（2 ジャンル以上 + 書籍 2 冊）+ 既存 7 件の使用記録。1件: ジャンル・一般名・メーカー・型番/規格・価格帯・3 リンク・使用記録 80 字以上（用量・頻度・効能は書かない）。1件12分、計 2.5 時間 | 10/20 | 12 件・6 ジャンルに届いた翌週土曜まで公開を延ばす |
| 6 | **ソフトローンチと本告知** | 10/5〜10/15 に知人 2 名 + 親しい友達へ DM（文面はサイトが用意）。本告知 10/17（土）20:00 X → 20:30 Instagram、23:00 まで返信 | 10/17 | 10/24（土）20:00 に確定で告知 |
| 7 | **プレビュー確認（iPhone、15分）** | 10/14 に `/tools/` と道具ページ 2 種。「一覧にも写真が欲しい」ならここで一言 | 10/16 | 48h 無反応で確定 |
| 8 | **取扱店 3 店へ DM・月末請求** | 本告知 +1 週に文面（Claude Code 作成）を送る。合意したら店名・URL・一言を伝える。請求書の振込先口座は手元で記入（チャットに貼らない）。DM 30分、請求 月10分 | 本告知 +1 週 | 取扱店 0 のまま 12 月末に廃止判定 |
| 9 | **シード投稿 4 件（旧 #5 の継続）** | 'Dorayaki' 'Red Vein Dark Phoenix' 'Michelle' 'Zara' の作出者・交配式・出典。1時間 | 10/10 | Claude Code が名前と区分だけで登録（記録なし・noindex） |

任意: もしもの受取口座を住信 SBI ネット銀行に（最低支払 1,000円 → 1円、5分）／ 道具の実物写真（俯瞰、長辺 2,000px 以上）。

### 7-1. 旧表（09-05b で 8 件に圧縮、09-07 で #6〜#8 を更新し #9 #10 を追加）

| # | 依頼 | 手順・所要 | 期限 | 無回答時の既定 |
|---|---|---|---|---|
| 1 | **@hare_anthurium の帰属と告知名義** | 「本人か第三者か」「告知・人物ページ・投稿者名を本名か栽培家名か」を1行で。5分 | 9/12 | 本人・栽培家名 `hare_anthurium` で統一。About 現状維持。第三者なら About から外す |
| 2 | **告知チャネルの棚卸し** | Instagram フォロワー数／X の植物名義とフォロワー数／参加中の Facebook アロイド系グループ名／LINE オープンチャット「シロウト園芸」の参加有無。15分 | 9/12 | Instagram + X のみで本告知。FB・LINE OC は飛ばす。X が無ければ 9/20 までに作成しソフト期間に自分の株を10投稿 |
| 3 | **知人ブリーダー2名** | ソフトローンチの読者 + 「系統図に載せませんか」の相手。公開名と連絡手段。うち1名に投稿1件を試してもらう。10分 | 9/12 | Instagram「親しい友達」ストーリーズのみで実施。投稿の通しテストは Claude Code が別アカウントで |
| 4 | **画像40枚の撮影者** | 管理画面の画像一覧で「自分が撮っていない写真」の番号と提供者名（caption「インスタ」等を含む）。15分 | 9/12 | 全件「撮影者未記録」表示で告知（E8 未達のまま） |
| 5 | **自分の記録の補完** | ①シード投稿5件 'Dorayaki' → 'Red Vein Dark Phoenix' → 'Michelle' → 'Zara' → 'Titanium'（1.5h）、続けて系統図の未収録親から 'Dark Phoenix' 'X-One' ②実生 forgetii × 'Titanium' の播種日・作出者 ③'Ace of Spades' の来歴（Orchid Jungle → Rotolante 選抜）の出所 URL | 9/12 | ①が無いと M2 が欠け本告知が翌週へ ②播種日不明のまま未収録 ③出典なしで「投稿者の記録」 |
| 6 | **（09-30 に 7-0 #1〜#3 で置換）決済の確認と切替** | Stripe を 9/8・9/19・9/26 に確認、変化なしなら `docs/stripe-application.md` §5 でサポートへ。承認なら Product「Aroid Origins 会員」に Price 2本（会員 月500 / 年5,000、税込・トライアルなし）→ Customer Portal 有効化（解約・カード変更）→ Webhook 登録（`docs/stripe-application.md` §4-5）→ 鍵・Price ID・Webhook 秘密を**チャットに貼らず** Supabase Secrets へ（画面共有）→ merge 後に**本人が月額 500 円で実決済**（M10、`subscriptions` 行と GA `subscription_checkout_success` を確認）→ Portal から解約 → Stripe で返金（手数料 ≈18 円は戻らない）。**10/3 に判定なしなら PAY.JP 申請**（特商法 URL `https://plantsstory.com/tokushoho/`、会員2本のみ）。各30分 | 9/8〜10/4 | 手順どおり。10/24 に未稼働なら決済なしで本告知（M10 解除） |
| 7 | **写真** | clarinervium・regale 最優先、次に luxurians・moronense・nutibarense・sagittatum・交配種2〜3（葉1枚正面・無地背景・長辺 2000px 以上）+ Instagram 1枚目用に棚の引き1枚。1.5h。`images/anthurium.png` の出所（自作か AI か）を一言 | 9/21 | 「図版未収録」のまま告知し、告知文に「写真はまだ半分。あなたの株の写真を待っています」。**`anthurium.png` は出所未確認として標本カードに使わない（09-07 既定）** |
| 8 | **プレビュー確認と本告知日** | iPhone 実機で ①T21b 済（09-06 OK） ②T27a 読み順 4パターン **9/12** ③標本カード PNG 3 枚（warocqueanum・aff. besseae・'Galaxy'）を X 投稿プレビューと LINE で **9/19** ④T28a ラベル印刷（共有シート → プリント）**9/26**。「OK」か気になる点の箇条書き、各15分。あわせて **本告知 10/3（土）20:00** の可否と当日・翌日の返信対応各1時間 | 各日 | 48時間無反応なら本番反映。日程は既定（10/3、未達なら翌土曜、上限 10/24） |
| 9 | **（09-30 に 7-0 #1 で置換、期限 10/3）開業届（e-Tax）**（09-07 追加） | マイナンバーカードで e-Tax → 「個人事業の開業届出書」。屋号任意（Aroid Origins 可）、事業内容「ウェブサイトによる情報提供」。控え = 受信通知 PDF を保存。30分・費用 0。PAY.JP 本番申請の必須書類（Stripe 承認でも青色申告・屋号口座・取扱店の請求書に使えて無駄にならない） | 9/26 | 未提出なら PAY.JP 申請不可 → 10/3 判定なし時は自動的に「10/24 決済なし告知」の分岐に入る |
| 10 | **無料付与の相手**（09-07 追加） | ソフトローンチ協力のブリーダー 2 名（#3 と同一で可）に、9/21 の DM と同時に管理画面「無料付与」（`admin.html` の `granted`）で 3 か月。本告知後は他者投稿 最初の 5 人と写真提供者にも同じ操作。各 10分 | 9/21 | 相手がいなければ付与なし（About の会員一覧は非表示のまま） |

継続（変更なし）: 再調査リクエストの処理（週2回・日水、各15分。会員は48時間以内）／ テストデータ・Platycerium 削除（T36、9/10、0.25h）／ SNS「今日の一葉」週3回（T29 完成後はコピペ）／ 10月の営業（取扱店3店、本告知 +1週、7-0 #8）／ 月1回の道具リンク点検（管理画面「点検モード」、15分）。
質問しないもの（既定で進む）: 棚の概念、告知の順序、splendidum の表記、個体区分6択、Chandra・Space Hijau の表示、'Mystique A88' 'Galaxy' の区分、出典書籍の手持ち。**09-07 追加**: 採集者の IPNI 準拠、Chocó の NULL、'Dark Mama' の記録なし化、共有カードの書体と「AI・% なし」、棚の延期、用語集の置き場所、GA イベント名、開業届の屋号。

---

## 8. 次回の議題（本告知 +1 週、10月下旬）

- **10-07b 追加（第9回 = 本告知 +1 週）**:
  - 本告知の 7 日 KPI と、共有リンクの実際の着地。
  - M2・M8 の達成。
  - お知らせ名簿の人数（10/31 の振込判定）と PAY.JP の結果。
  - お問い合わせの件数と取扱店の DM の反応。
  - `label_print` と `tools_context_click`。
  - CLS の実測（T93・T98）。
  - 次回に送ったもの: 訂正の履歴 `cultivar_changes`・ラベルの各行の出典の印・`cultivar_images.cultivar_id`・`alt_claims`・Monstera の第二波（10/31）。
- **09-30 追加**: 本告知の実施日と 7 日 KPI／ 開業届・PAY.JP の審査結果と初売上／ 取扱店 DM の反応（合意店数）／ 道具の目録の公開可否（12 商品・6 ジャンル）と 10/14 プレビューの指摘（サムネイル要否）／ もしも Amazon の提携状況と `affiliate_click` の shop 別・genre 別／ M1 40 件と M4 の達成状況／ 48h merge 規則の運用
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

- **2026-10-08（オーナー決定）**: 開業届は 2027-01-01 付、PAY.JP は 2027-01 上旬に申請。それまで品質向上に集中。会員のカード決済は早くて 2027-02。振込の年額（T97）と取扱店の掲載は予定どおり。月 1 万円の到達は 2027-03 以降の見込み（第9回で再計算）。
- **2026-10-07b（第8回「告知前の総点検」）**: オーナー「T75 以外をやった後に、新しいアイデアや修正、改善を会議を開いた後に実行してほしい」→ 確認質問なしで裁定。会議前に、共有リンク（supabase.co の text/plain → plantsstory.com の正規 URL、旧リンクは 301）と antolakii の描画停止（h1Key）、タッチ端末の崩れ・語中改行・サムネイルを修正済み（09015ff）。統括の事実確認: **M2 未達**（4 名が未登録）、お問い合わせは通知も一覧もない、お知らせの記録先がない、新着は `created_at` で数える。
  - 裁定（分類）: 'Galaxy' は Clone（IAS 登録）。'Dark Mama' は Hybrid（親は 2 出典で一致、作出者に異説）。'Mystique A88' は Clone + line。'Queen of Hearts' の推測の選抜元を外す。'BVIT' の作出者は「該当なし」。「わからない」は 3 つの値。引用符 D4 は確定。Platycerium は退避して削除。taxonomy Q1〜Q3 は質問せず既定で進める（報告のみ）。
  - 裁定（デザイン）: 新着は日付の見出しでまとめる。系統図の箱を枠の例外に追加。写真なしは ≤640 で 1 行の帯。ダークモードは作らず強制ダークを止める。T59 はタッチ再現。
  - 裁定（収益）: お問い合わせの通知（宛先は運営アドレスに固定）。お知らせ名簿（一斉送信はオーナー承認後）。About の修正。ラベル印刷を QR つきで告知前に。道具の文脈行は属レベルの 1 行に改訂（09-30 を上書き）。取扱店の募集の 1 行は 10/24 から。振込の年額は 10/31 に「PAY.JP 未承認 かつ 名簿 ≥3」で 11/1 に開く。運営者の植物販売の開示は、販売へリンクする日まで書かない。
  - 裁定（集客）: タイトルをカタカナの検索語の形に。4 名を出典つきで日を分けて登録。告知の 1 投稿目のドラヤキは B 階層の出典があるときだけ。`/names/` は告知後。
  - 実装: T76〜T95 を本番 3 回（10/8・10/11・10/14）とデータ登録 4 回で行う。T96 は 10/24、T97 は 10/30、T98〜T105 は告知後。
  - 却下: ダークモード・生きた植物のアフィリエイトリンク・投げ銭・会員権の物販・特許と 'Michelle' の結び付け。
  - 月 1 万円の数式は不変（決済が 11 月上旬に稼働すれば 9,300〜10,500 円、12 月まで止まれば 3,500〜4,750 円）。
  - オーナーへの依頼は 9 件（うち必須は写真・実機・DM・告知・PAY.JP の 1 行）と任意 3 件。各に既定あり。
- **2026-10-07（第7回「見た目のまとまり（375px）」）**: オーナー「デザインにまとまりがない。もう少し見やすく」「基本スマホ」→ 確認質問なしで裁定。実測（375px・9 画面）では、文字サイズ 36 種・mono 50〜75%・12px 未満 30〜50%・灰色が黒より多い・文字色 11 色・ボタンとリンク 9〜22 種。4 報告は「同じ事実が何度も出る」「同じ語が別の意味」「件数が画面ごとに違う」で一致。裁定: 見た目の決まり（文字 6 段・書体の役割・色の役割・余白 5 刻み・ボタン 3＋切替 1・枠 5 つ）を archive.css 末尾の統一レイヤー 1 ブロックで入れる／大文字化はどこにも使わない／一覧は `entryLine(d)` の 2 行 1 種類／件数は「収録」= 合格だけ、数字は正しく出せるときだけ出す／日付は例外なく YYYY.MM.DD／→ はページ移動だけ／台帳・台紙・アーカイブは使わず、「未収録」→「記録不足」、「図版未収録」→「写真なし」／トップは一葉 → 新着 → 索引 → 年表（英字の見出し行と ENGLISH を廃止、09-05b を上書き）／品種ページの標題行は区分の印だけ（09-07 を上書き、NO. は共有カードと印刷ラベルに残す）／道具の部門は 2 列の罫線リストで 0 件は出さない、使用中はバッジ、ストアは主 1 つ／料金はお知らせボタンを会員の表の直後に置き、条項は details。却下: 検証の行を由来の記録の下へ・新着の MM.DD・部門の横スクロール・使用中の緑・108 の habitats 削除・料金の取扱店を閉じる。保留: 道具ページのクリック率の前後比較（非公開で元の数字がない）、必須項目の「記録なし」表示。taxonomy Q1 は URL を変えずに 10/14（T69）、Q2 は T71、Q3 は残す。実装 T60〜T68 は本番 3 回（10/8・10/9・10/10）、次回 T69〜T75。売上への直接効果は ±0〜+100円/月で、本告知 10/17 の着地品質を守るために行う。月 1 万円の数式は不変。オーナーへの新しい依頼はなし。
- **2026-10-03（第6回「サイト全体の質を高める」）**: オーナー「会議をしてその後実行して」「基本スマホで見るユーザーが多い」→ 375px 基準で評価し、決定は確認を待たずに本番へ（本番後にスクリーンショットで報告）。統括の事実確認: **T30 は未 merge だった**（BOARD の「10/2 merge」は誤記）。同日、申込の全入口を「会員受付は準備中です」に切替（154e0d9）。4 報告の一致点は「スマホで直着地した人が最初の 10 秒で壊れている・間違っていると判断する」原因（原寸画像 52MB・白紙 10.6 秒・Clone を一時「原種」と表示・存在しない名前が架空の原種ページ・未公開リンクの漏れ）。裁定: 実装順 T48（データ正確性。修正 SQL 47 文中 46 文を適用、'Galaxy' 本文は差し替え、antolakii 改名は告知後）→ T49 漏れ → T50 画像変換 → T51 直着地 → T52 品種詳細 → T53 メタデータ → T54 トップと一覧 → T55 料金・法務（T30 を master 上で作り直し）→ T24 → T26 → T56 表記 → T57 プレレンダー（告知前必須、10/13）→ T58 /tools/ → T33 取扱店（10/16）。会員の特典は実在する 2 つ（実生投稿 無制限・再調査リクエストの優先審査）に絞る。/tools/ はショップ型を維持しスマホだけ 1 列の行に（オーナー 10/02 指示と両立）。一覧は区分順 → 名前順、区分の表示語は「原種 · Hybrid · Clone · 実生」、日付は YYYY.MM.DD、`anthurium.png` は使わない。道具の範囲外 4 点は非公開（36 点）。取扱店は告知必須の後。分類 Q3〜Q6 はボードで確定し、オーナー確認は 3 件（'Galaxy' の流通・Tim Anderson の役割・スクリーンショット確認）に圧縮。月 1 万円の数式は不変。
- **2026-09-30（第5回）**: オーナー「Stripe をあきらめて違う収益を」「園芸商品をきれいにまとめたページ（楽天・Yahoo!・Amazon、一覧 → 商品説明、ジャンル別検索）」「Amazon はもしもに切替」。統括の事実確認: 9/8〜9/29 の実装ゼロ（3 ブランチ滞留）、Anthurium 31 件のまま、検証列なし、Amazon 欄は旧・直接契約リンク、Yahoo! 短縮はアフィリエイトリンク（実測）、属ページに道具棚が出ている（§2 違反）。裁定: **道具の目録** `/tools/` + `/tools/<slug>/` を作る（ジャンル 9 本 soil/mount/pots/humidity/heat/light/measure/nutrient/books、肥料・活力剤は効能・用量・頻度を書かない条件で作り、病害虫・水やり・棚は作らない）。一覧は写真なしの台帳・詳細に図版 1 枚（自前 → 楽天画像 → 図版なし）、`toolGate`（使用記録 80 字・禁止語・価格数字なし）で index を分け、掲載はオーナーが使っている物だけ、公開は 12 商品・6 ジャンル以上で本告知の翌週土曜。**Amazon の条件付き削除を廃止し、もしも経由のみ全ジャンルで描画**（href 無改変・imp 1px・CSP `i.moshimo.com`・アソシエイト表示文）。**本告知の必須条件から決済稼働を外し（M10 → E10）、M1 を 40 に、目標 10/17・上限 10/24 を確定日に**。Stripe は放置、PAY.JP は開業届（10/3）直後に申請、T30 は 10/2 に merge（準備中表示）。**取扱店掲載は Checkout を作らず銀行振込で前倒し**（最悪ケースでも月 3,500 円）。月 1 万円の構成は不変、アフィリは 500 円のまま（上限 1,000 円）。48h 無反応 merge を厳守。新規 T44〜T47、T33 改訂、T34 は T46/T47 に統合。オーナー依頼 9 件（開業届・PAY.JP・Stripe 放置・もしもリンク・道具データ・告知・プレビュー・取扱店 DM・シード投稿）、各に既定回答。
- **2026-09-07（第4回）**: オーナー「Stripe 承認まで聞かずに入れる・削る」→ 確認質問なしで裁定。採集者は IPNI 型データ一致に統一（前回の [要確認]→NULL を上書き、記入 5・NULL 5、Chocó は NULL）。ゲート G1〜G9 採用（AI 下書きのみは記録なし、'Dark Mama' の AI 本文削除 + `formula_status='disputed'`）。共有画像は「標本カード」（全品種同一台紙、OFL 3 書体、AI・信頼度% なし、トップ15 先行、9/19 前倒し）。T28 を分割（ラベル印刷 T28a は告知前 9/26、棚 T28b は本告知 +2 週）。完了帯は品種ページに 1 回だけ。削除統合 10 点（詳細ページ道具棚非表示・ガイド 5 見出し・Trial 残骸・標題バッジ行・重複スタブ・paywall 1 ボタン・黒ボタン → mono 1 行・h2 画像・個体 0 件・'Dark Mama' AI）。content A/B/C/E 採用、D は告知後。`granted` 無料付与・`t30-member-plan` ブランチ・GA 6 本・開業届 9/26 を採用。用語集 8 語採用。新規 T39〜T43、T27/T28 分割、T29 前倒し、T20 完了。design D1 描画バグは会議中に本番修正。オーナー依頼は 6 件（Stripe・開業届・無料付与・写真・実機 3 回・シード投稿）。
- **2026-09-05（第3回・同日2回目）**: オーナー差し戻し — 「サイトは植物界隈に未告知だったので利用者ゼロは当然」。**第2回の削除根拠「利用0件」は無効**とし、削除済み11項目を告知後の行動・金額・正確性で再判定: Facebook 共有のみ復活（PC 専用、channel 計測、90日 5% ルール）、お気に入りは「棚（栽培株）」として T28 で別の形（localStorage・ログイン不要）、トップ実生区画は削除維持だが新着記録の実生除外バグを修正（条件到達で `/seedlings/` 索引）、Amazon は出典書籍限定の条件付き（12月レビュー、いまは書誌欄）、LINE 共有・画像投票・道具棚・AdSense・ユーザー名検索は理由を差し替えて削除維持、状態列は3値、EN はフッター維持 + 言語既定反転 + masthead リンク、YouTube 検索は保留。**ローンチ計画を確定**: ソフト 9/21〜10/2、本告知は必須ゲート M1〜M10 全達成の翌土曜 20:00（目標 10/3、上限 10/24。決済稼働と記載種の検証済 100% を必須に含め、10/24 は決済のみ未達でも告知）。Stripe 10/3 判定なしで T30 先行 + PAY.JP。告知前の正確性ルール（採集者・分布・出典0件・原種本文の由来文化・人物典拠表・写真 by-line）を採択、T21b・T37・T38 追加、T23 の順序差し替え、T29 前倒し。オーナー確認は8件に圧縮（各に既定回答）。第2回の料金・AI 調査範囲・非公開実生・Platycerium などは変更なし。
- **2026-09-05（第2回）**: オーナーが製品・事業判断をボードに委任。**由来調査の有料化は却下（オーナー）** → 登録時無料1回 + 無料の再調査リクエスト（承認制）。有料は **会員 月500/年5,000 の1プラン**に統合し 240/2,500 を廃止（Stripe 判定翌日に切替、審査中は法務ページを触らない）。「支援者」→「会員」、特典は実在する4つ。月1万円の数式を 会員12 + 取扱店3 + アフィリで再構成。削除: お気に入り・画像投票・トップ道具棚・トップ実生区画・AdSense 枠・YouTube 検索・ユーザー名検索・Amazon・`trial-reminder`・Platycerium（CSV 退避）。由来投票は文字化して残す。EN 切替はフッター、英語補完凍結。品質ゲート・低信頼折り畳み・管理者のみの検証済印・Phase A 残の順番（P1→P5）を採択。Anthurium 20件（'Michelle' 'Zara' は Hybrid、'Black Velvet' は alias）。標本ラベル印刷は決済稼働までログイン全員に無料開放。定義文 JP/EN 確定。実装順 T20→T36。
- **2026-09-05（朝）**: オーナー決定「PAY.JP の前に Stripe へ最後の申請」。料金・特商法・規約を整備し Stripe 決済を復旧、申請提出。特商法の所在地・電話は非公開。
- **2026-09-04（夜）**: 未記載種の調査経路と出典ドメインによる Tier 判定（antolakii 23→67）。GBIF 照合の取りこぼし修正。
- **2026-09-04（同日追記）**: Field Archive 本番反映。「クオリティを課金より先に」で課金系を後回し。データ修正・Phase A・人物・系統図・産地・用語集をデプロイ。'King of Spades' Clone、'Angels dream' 綴り維持。
- **2026-09-04（第1回）**: 目標 月1万円を12月末に設定。閲覧永久無料。4区分・ICNCP 表記・スキーマ2段階。育て方は書かない。9月コンテンツ順。Field Archive 採択。Monstera 10月、Platycerium 保留。（支援者2プラン・有料由来調査 500円・AdSense 条件付き再検討は 09-05 で上書き）
