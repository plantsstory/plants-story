# 広告を始めるときの規約・プライバシーポリシー 改定文案（M6・T207）

2026-11-16 作成。**まだサイトには載せない。** Google AdSense などの広告を表示し始める日に、この文案で差し替える（BOARD §2: 広告は月 1 万 PV を超えてから判断）。
ads.txt と CSP（script-src / frame-src / img-src に広告の配信元を足す）は、申請するときまで触らない。

差し替える日にやること:

1. 下の 3 か所を index.html と i18n/translations.json（jp・en）で差し替える。
2. プライバシーポリシーの「最終更新」を差し替えた日にする。
3. お知らせ（ホームの知らせの行）に「広告の表示を始めます。規約 第9条とプライバシーポリシー 4・5 を改定しました」を 30 日出す。
4. EEA・英国・スイスから見られる間は、Google 認定の同意管理（CMP）が要る。AdSense の「プライバシーとメッセージ」で Google の CMP をオンにする（文案の「同意の画面」はこれを指す）。

---

## 1. 利用規約 第9条（いまの文 → 改定案）

**いま**:
> 道具の目録（/tools/）には、楽天市場・Yahoo!ショッピング・Amazon のアフィリエイトリンクを含む商品の紹介を掲載します。商品情報の一部は楽天ウェブサービスから取得しており、価格・在庫は各ストアの表示が最新です。本サービスは現在、第三者の広告ネットワークによる広告を表示していません。表示を始める場合は、あらかじめ本規約とプライバシーポリシーを改定してお知らせします。

**改定案（見出しは「第9条 道具の目録と広告」）**:
> 道具の目録（/tools/）には、楽天市場・Yahoo!ショッピング・Amazon のアフィリエイトリンクを含む商品の紹介を掲載します。商品情報の一部は楽天ウェブサービスから取得しており、価格・在庫は各ストアの表示が最新です。
> 本サービスは、第三者の広告配信サービス（Google AdSense）による広告を表示します。広告には「広告」または「スポンサー」と表示し、由来の記録・検証・信頼度とは分けて置きます。広告の内容は広告主と配信事業者の責任によるもので、運営者は広告の商品やサービスを推薦するものではありません。広告の表示の有無や内容によって、記録の扱いが変わることはありません。

## 2. プライバシーポリシー 4（Cookie・アクセス解析・外部サービスへの送信）に足す項目

一覧の「アフィリエイトリンク」の前に、次の 1 項目を足す:

> **Google AdSense（広告の配信）**: 本サービスは広告の配信に Google AdSense を使用しています。Google などの第三者配信事業者は Cookie を使用して、ユーザーが本サービスやほかのウェブサイトに過去にアクセスした情報に基づいて広告を配信します。Google は広告 Cookie を使用することにより、ユーザーが本サービスやほかのサイトにアクセスした際の情報に基づいて、ユーザーに適切な広告を表示できます。ページを開くと、IPアドレス、閲覧したページ、端末とブラウザの種類などの情報が Google と広告配信事業者のサーバーに送信されます。
> パーソナライズ広告は、Google の広告設定（https://myadcenter.google.com/ ）で無効にできます。第三者配信事業者の Cookie は https://www.aboutads.info/choices/ でも無効にできます。Google による情報の使われ方は https://policies.google.com/technologies/partner-sites で確認できます。
> 欧州経済領域（EEA）・英国・スイスからのアクセスでは、Cookie を使う前に同意の画面を表示し、同意の内容に応じて広告を配信します。

## 3. プライバシーポリシー 5（情報の利用目的）

「アフィリエイトリンクを通じた収益化」を次の行に置き換える:

> アフィリエイトリンクと広告の表示による収益化（広告の表示回数・クリックの集計を含む）

---

### 英語版（translations.json の en に入れる）

- 第9条 見出し: "Article 9 The tools catalogue and advertising"
- 第9条 本文の 2 段落目: "The Service displays ads from a third-party ad network (Google AdSense). Ads are marked "Ad" or "Sponsored" and kept apart from the records, verification and trust scores. Ads are the responsibility of the advertiser and the ad network; the operator does not endorse the products or services advertised. Whether or what ads are shown never changes how records are handled."
- プライバシー 4 の項目: "Google AdSense (ads): The Service uses Google AdSense to serve ads. Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites. Google's use of advertising cookies enables it and its partners to serve ads based on visits to this site and/or other sites on the Internet. When a page opens, information such as the IP address, the page viewed and the device and browser type is sent to Google and ad vendors. Personalised advertising can be turned off in Google's ad settings (https://myadcenter.google.com/), and third-party vendor cookies at https://www.aboutads.info/choices/. How Google uses information: https://policies.google.com/technologies/partner-sites. For visitors from the EEA, the UK and Switzerland, a consent screen is shown before cookies are used, and ads follow the choice made."
- プライバシー 5: "Monetisation through affiliate links and ads (including counting ad views and clicks)"

### 根拠（差し替えの前に、もう一度その時点の要件を確かめる）

- AdSense のプログラムポリシー「プライバシーに関する要件」: 第三者配信事業者の Cookie 使用、Google の広告 Cookie、パーソナライズ広告の無効化の案内を、サイトのプライバシーポリシーに書くこと。
- EEA・英国・スイス: Google 認定の CMP（TCF 対応）の使用が必須（2024-01 から）。
- 日本の電気通信事業法の外部送信規律（2023-06）: 送信先・送信される情報・目的を公表する。いまの「4」の書き方（送信先ごとの一覧）に 1 項目を足せば足りる。
