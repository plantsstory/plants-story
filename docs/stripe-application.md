# Stripe 本番申請パック（2026-09-05）

オーナーが Stripe ダッシュボードに入力する内容をここに集約する。本人確認・銀行口座・パスワードの入力はオーナーのみが行う（Claude Code は代行しない）。

## 0. 先に確認すること（申請戦略が変わる）

Stripe ダッシュボード右上 → **設定 → アカウントのステータス**（または届いているメール）を見て、次のどれかを教えてください。

| 状態 | 次の一手 |
|---|---|
| A. 「追加情報が必要」で期限切れ → **アカウントが制限（Restricted）** | 同じアカウントで **設定 → ビジネス設定 → 「要求されている情報」** を提出し直せば再審査される。新規登録は不要 |
| B. 「サポート対象外のビジネス」として **却下（Rejected）** | ダッシュボード上部の「異議申し立て（Appeal）」または support.stripe.com から **再審査依頼**。本書 §4 の文面を送る。同じ本人情報で新規アカウントを作ると重複として自動的に弾かれやすい |
| C. 有効化申請を **途中で止めたまま**（未提出） | 本書 §2 のとおり入力して提出する |

Stripe は「サイトを直したか」を見に来ないので、改善しても**こちらから提出／再審査依頼をしない限り連絡は来ません**。

## 1. サイト側で整えたもの（2026-09-05 デプロイ）

- `/pricing/` 料金とサービス内容（何を・いくらで・いつ提供・支払方法・自動更新・解約・返金・問い合わせ）
- `/tokushoho/` 販売業者を個人名＋屋号に、支払方法を Stripe に、返金条件を明記
- `/terms/` `/privacy/` の決済事業者を Stripe に更新（Stripe プライバシーポリシーへのリンク）
- 申込み確認画面（特商法 12条の6）: 料金・期間・自動更新・解約方法を表示し、同意ボタンで Stripe Checkout へ
- Stripe Checkout（ホスト型決済ページ、規約同意チェック付き）、Customer Portal（解約・カード変更）、Webhook を復旧・デプロイ済み
- すべての法務ページはクローラにも HTTP 200（静的スタブ）

残りはオーナー判断: 特商法の **所在地・電話番号**。「請求があれば遅滞なく開示」で通った個人開発の例はあるが、実住所・実電話を書く方が審査は確実。決めたら `wireframe/index.html` の `tokushoho_address_value` / `tokushoho_phone_value` を差し替える（Claude Code が反映）。

## 2. ダッシュボード入力内容（そのまま貼れる）

**ビジネスの種類**: 個人事業主（個人）
**ビジネス名（屋号）**: Aroid Origins
**ウェブサイト**: https://plantsstory.com/
**商品・サービスの説明（日本語）**:
> アンスリウムなどアロイド植物の品種の由来（記載者・発表年・産地・交配式・作出者）を出典つきで記録する日本語のウェブ図鑑です。閲覧は無料です。有料サービスは「My Seedlings サブスクリプション」1種類のみで、会員が自分で交配・播種した実生の記録を6件目以降も無制限に投稿できる機能を提供します。月額240円（税込）または年額2,500円（税込）の自動更新、解約はいつでもプロフィール編集ページから可能、決済後の返金は行いません（詳細: https://plantsstory.com/pricing/ ）。物品の販売・配送はなく、植物そのものは販売しません。

**Business description (English)**:
> Aroid Origins is a Japanese-language reference site documenting where aroid plant cultivars (Anthurium etc.) come from: describing authors, publication years, type localities, breeders and parentage, with sources. Browsing is free. The only paid product is the "My Seedlings" subscription: members who record their own seed-grown plants can post more than five seedling records (JPY 240/month or JPY 2,500/year, auto-renewing, cancel anytime from the profile page, no refunds after payment). No physical goods are shipped and no plants are sold.

**業種（カテゴリ）**: デジタル商品 → メンバーシップ／サブスクリプション（該当がなければ「ソフトウェア／SaaS」）
**商品の提供時期**: 決済完了後すぐ（デジタルサービス）
**明細書表記（Statement descriptor）**: `AROID ORIGINS` ／ 短縮: `AROID`
**カスタマーサポート**: メール plantsstory2026@gmail.com、サイトのお問い合わせフォーム https://plantsstory.com/contact/
**想定売上**: 月 1万円未満（開始時）
**決済手段**: カード（Visa / Mastercard / JCB / AMEX）。コンビニ・銀行振込は申請しない
**利用規約 URL**: https://plantsstory.com/terms/ ／ **プライバシーポリシー**: https://plantsstory.com/privacy/ ／ **特商法**: https://plantsstory.com/tokushoho/ ／ **返金ポリシー**: https://plantsstory.com/pricing/（返金の項）

## 3. 申請後に Stripe ダッシュボードで行う設定（承認後）

1. 商品と価格を作成: 「My Seedlings 月額」240円/月、「My Seedlings 年額」2,500円/年（税込、JPY）。
2. **Customer Portal** を有効化（設定 → Billing → カスタマーポータル）: サブスクリプションのキャンセル（期間終了時）と支払い方法の更新を許可。
3. **Webhook** を追加: エンドポイント `https://jpgbehsrglsiwijglhjo.supabase.co/functions/v1/stripe-webhook`、イベント `checkout.session.completed` `customer.subscription.updated` `customer.subscription.deleted` `invoice.payment_failed`。署名シークレット（whsec_…）を控える。
4. Claude Code に **画面共有で** 次を渡す（チャットに貼らない）: 本番の秘密鍵 `sk_live_…`、価格 ID 2つ（`price_…`）、Webhook 署名シークレット。Claude Code が `npx supabase secrets set STRIPE_SECRET_KEY=… STRIPE_PRICE_MONTHLY=… STRIPE_PRICE_ANNUAL=… STRIPE_WEBHOOK_SIGNING_SECRET=…` を実行する。
5. テスト: テストモードのキーで一度通し（4242 4242 4242 4242）→ 本番キーに切り替え。

## 4. 再審査依頼（Appeal）の文面

件名: 再審査のお願い — Aroid Origins（plantsstory.com）

> Stripe サポート御中
>
> 先日ご案内いただいた不足事項について、ウェブサイトを次のとおり整備しましたので、再審査をお願いいたします。
>
> - 料金とサービス内容のページを新設し、提供内容・価格（税込）・提供時期・支払方法・自動更新・解約方法・返金条件を明記しました: https://plantsstory.com/pricing/
> - 特定商取引法に基づく表記を更新しました（販売業者名・連絡先・価格・支払時期・解約条件）: https://plantsstory.com/tokushoho/
> - 利用規約・プライバシーポリシーに決済事業者として Stripe を明記しました: https://plantsstory.com/terms/ , https://plantsstory.com/privacy/
> - お問い合わせフォームを実装し、メール（plantsstory2026@gmail.com）でも受け付けています: https://plantsstory.com/contact/
> - 申込み前の最終確認画面で、料金・契約期間・自動更新・解約方法を表示し、同意のうえで Stripe Checkout に進む導線にしました。
>
> 当サイトの有料サービスは、会員が自分で育てた実生の記録を追加投稿できる月額240円／年額2,500円のサブスクリプション1種類のみで、物品の販売や植物の販売・配送は行いません。閲覧は無料です。
>
> ご確認のほどよろしくお願いいたします。
> 久恒 佑太（Aroid Origins 運営）

## 5. 承認されなかった場合

PAY.JP に切り替える。コードは両対応で、`wireframe/js/app-core.js` の `window._PAYMENT_PROVIDER` を `'payjp'` に、法務ページの決済事業者名を PAY.JP に戻すだけ（Claude Code が実施）。
