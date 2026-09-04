# Stripe 本番申請パック（2026-09-05 改訂: 登録内容の書き直し版）

Stripe からの指摘（メール）:
1. ウェブサイトがアクセス可能で、ログイン用パスワード等が設定されていないこと
2. Stripe に登録されている企業名および商品内容がウェブサイトの内容と一致していること
3. ウェブサイト内に Stripe の基準を満たす「特定商取引法に基づく表記」ページが存在すること

前回の登録は **旧サイト名（Plants story）・旧商品（実生閲覧の有料化＋30日無料トライアル）** のまま。サイトは **Aroid Origins・実生投稿6件目以降の有料化・トライアルなし** に変わっているため、2 が不一致。Stripe 側の登録内容を下の表のとおり **すべて書き直して**から再提出する。

## 1. サイト側（対応済み・本番確認済み）

| 指摘 | 状態 |
|---|---|
| 1 アクセス可能・パスワードなし | https://plantsstory.com/ は公開、ログイン不要で全ページ閲覧可。robots.txt は全許可。法務ページは JS なしでも HTTP 200 |
| 2 名称・商品の一致 | サイト名 Aroid Origins、商品「My Seedlings サブスクリプション」の内容・価格を `/pricing/` `/tokushoho/` `/about/` `/terms/` に統一。特商法に「サービス名（旧称 Plants story）」「役務の内容」の行を追加 |
| 3 特商法ページ | https://plantsstory.com/tokushoho/ — 販売業者（個人名＋屋号）、運営責任者、所在地・電話番号（請求があれば開示＋請求方法）、メール、販売URL、サービス名、役務の内容、販売価格（税込）、追加手数料、支払方法、支払時期、提供時期、返品・キャンセル・返金、動作環境 |

所在地・電話番号はオーナー判断で非公開（請求があれば遅滞なく開示。請求先メールを明記）。Stripe から掲載を求められた場合のみ再検討。

## 2. Stripe ダッシュボードで書き直す項目（設定 → ビジネス設定 / 公開情報）

| 項目 | 旧（登録されている可能性が高い値） | **新しい値（これに書き換える）** |
|---|---|---|
| 事業形態 | 個人事業主 | 個人事業主（変更なし） |
| 事業者名（法的名称） | 久恒 佑太 | 久恒 佑太（本人確認書類と同じ表記。変更なし） |
| 屋号 / ビジネス名 | Plants story | **Aroid Origins** |
| 公開ビジネス名（顧客に表示） | Plants story | **Aroid Origins** |
| ウェブサイト | https://plantsstory.com | https://plantsstory.com （変更なし。サイト名とドメインが違う理由は特商法に明記済み） |
| 商品・サービスの説明 | 実生の閲覧サブスク／30日トライアル 等 | §3 の文面 |
| 業種 | （不明） | デジタル商品 → メンバーシップ／サブスクリプション（無ければ ソフトウェア／SaaS） |
| 明細書表記（Statement descriptor） | PLANTS STORY 等 | **AROID ORIGINS**（短縮 **AROID**） |
| サポート用メール | plantsstory2026@gmail.com | 変更なし |
| サポート用電話 | （登録値） | 変更なし（非公開設定のまま） |
| サポート用 URL | — | https://plantsstory.com/contact/ |
| 利用規約 / プライバシー / 返金ポリシー URL（聞かれた場合） | — | /terms/ ・ /privacy/ ・ /pricing/（返金の項）・ /tokushoho/ |
| 商品（Products） | 旧価格・トライアル付き | 新規作成: 「My Seedlings 月額」240円/月、「My Seedlings 年額」2,500円/年（JPY、税込、トライアルなし）。旧商品はアーカイブ |

## 3. 商品・サービスの説明（そのまま貼る）

日本語:
> Aroid Origins（https://plantsstory.com）は、アンスリウムなどアロイド植物の品種の由来（記載者・発表年・産地・交配式・作出者）を出典つきで記録する日本語のウェブ図鑑です。閲覧はすべて無料です。有料サービスは「My Seedlings サブスクリプション」1種類のみで、会員がご自身で交配・播種した実生の記録を、無料枠（5件）を超えて無制限に投稿できる機能を提供します。月額240円（税込）または年額2,500円（税込）の自動更新で、無料トライアルはありません。解約はいつでもプロフィール編集ページから可能で、解約後も契約期間の満了日まで利用できます。決済後の返金は行いません（詳細: https://plantsstory.com/pricing/ ）。物品の販売・配送はなく、植物そのものは販売しません。

English:
> Aroid Origins (https://plantsstory.com) is a Japanese-language reference site documenting where aroid cultivars (Anthurium etc.) come from: describing authors, publication years, type localities, breeders and parentage, with sources. Browsing is entirely free. The only paid product is the "My Seedlings" subscription, which lets members post more than five records of plants they raised from seed. JPY 240/month or JPY 2,500/year, auto-renewing, no free trial; cancel anytime from the profile page with access until the end of the paid period; no refunds after payment. No physical goods are shipped and no plants are sold.

## 4. 提出手順

1. ダッシュボード → 設定 → **ビジネス設定 / 公開情報 / ブランディング** を §2 のとおり書き換えて保存。
2. **商品カタログ**: 旧商品（トライアル付き・旧価格）をアーカイブし、§2 の2商品を作成。
3. 上部バナーの「情報を提出」または **設定 → アカウントのステータス** から、要求されている項目（ウェブサイト URL・事業内容）を再提出。
4. 提出画面にコメント欄があれば §5 の文を貼る。無ければサポート（ダッシュボード右上 ? → お問い合わせ）に §5 を送る。
5. 承認後: Customer Portal 有効化（解約・カード変更を許可）、Webhook `https://jpgbehsrglsiwijglhjo.supabase.co/functions/v1/stripe-webhook`（`checkout.session.completed` `customer.subscription.updated` `customer.subscription.deleted` `invoice.payment_failed`）を登録し、秘密鍵・価格ID 2つ・Webhook 署名シークレットを **画面共有で** Claude Code に見せる（チャットに貼らない）。Claude Code が Supabase Secrets に設定し、テストカードで一通り確認してから本番化。

## 5. 再提出時のコメント（貼る文面）

> ご指摘の3点について対応しました。
> 1. ウェブサイト https://plantsstory.com/ は公開されており、ログインやパスワードなしで全ページを閲覧できます。
> 2. サービス名を「Plants story」から「Aroid Origins」に改称し、有料サービスの内容を変更したため、Stripe の登録内容（ビジネス名・商品説明・商品）を現在のサイトに合わせて更新しました。有料サービスは「My Seedlings サブスクリプション」（会員が自分で育てた実生の記録を6件目以降も投稿できる機能、月額240円／年額2,500円、税込、自動更新、トライアルなし）1種類のみで、物品や植物の販売はありません。内容は https://plantsstory.com/pricing/ に掲載しています。
> 3. 特定商取引法に基づく表記を整備しました: https://plantsstory.com/tokushoho/ （販売業者名・運営責任者・連絡先・販売価格・支払方法と時期・提供時期・返品と解約の条件）。住所・電話番号は個人事業のため、消費者庁の指針に沿って「請求があった場合に遅滞なく開示」する旨と請求方法を記載しています。
> 利用規約 https://plantsstory.com/terms/ 、プライバシーポリシー https://plantsstory.com/privacy/ 、お問い合わせ https://plantsstory.com/contact/ も公開しています。ご確認のほどよろしくお願いいたします。
> 久恒 佑太（Aroid Origins）

## 6. 承認されなかった場合

PAY.JP に切り替える。`wireframe/js/app-core.js` の `window._PAYMENT_PROVIDER` を `'payjp'` に、法務ページの決済事業者名を PAY.JP に戻す（Claude Code が実施）。
