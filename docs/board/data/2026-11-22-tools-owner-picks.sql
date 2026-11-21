-- 11-22: two tools the owner sent as Amazon links. Both are sold by the maker's own Rakuten shop (HaruDesign,
-- postage included, read on 11-22), so they are published with the Rakuten link now. The Amazon column keeps the
-- plain product page for later: it is not drawn until a Moshimo link and its impression image replace it.
-- source = 'rakuten' so the weekly price check covers them; tool_reviews says they are the owner's picks.
with ins as (
  insert into public.affiliates
    (name, product_name, slug, genre, maker, model, spec, price_band, summary, description, image, icon, badge,
     rakuten, amazon, ext_id, source, shop_name, price, price_checked_at, is_published, sort_order)
  select v.name, v.product_name, v.slug, 'light', 'HaruDesign', v.model, v.spec, v.price_band, v.summary, v.description, v.image, '', '',
     v.rakuten, v.amazon, v.ext_id, 'rakuten', 'HaruDesign', v.price, now(), true,
     (select coalesce(max(sort_order), 0) from public.affiliates) + v.n
  from (values
    (1, '光', 'HaruDesign 植物育成ライト GL-A 6K ブラックボディ', 'rk-harudesign-10000128', 'GL-A 6K',
     '電球型（PAR30）、22W、白色系 5800K、フルスペクトル、フリッカーフリー、高密度 COB LED、製品 3 年保証',
     '3,000〜5,000円', '電球型の育成ライト、白色系 5800K',
     'HaruDesign の電球型の植物育成ライト。白色系（5800K）のフラットウェーブ LED を載せたフルスペクトルで、フリッカーフリー。メーカーは上位機種 GL-X の廉価版と説明している。別売りの広角レンズ（AL-WA1）に替えると照射範囲を広げられる。電気用品安全法に適合と表示、製品 3 年保証。',
     'https://thumbnail.image.rakuten.co.jp/@0_mall/harudesign/cabinet/10105468/imgrc0089411367.jpg?_ex=300x300',
     'https://hb.afl.rakuten.co.jp/hgc/51ddadd6.592101ce.51ddadd7.b054826c/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fharudesign%2F10002301%2F&m=https%3A%2F%2Fitem.rakuten.co.jp%2Fharudesign%2F10002301%2F',
     'https://www.amazon.co.jp/dp/B0BG1G3WNT', 'harudesign:10000128', 3376),
    (2, '光', 'HaruDesign 植物育成ライト GL-T5 L530 18W×2本', 'rk-harudesign-10000152', 'GL-T5 L530',
     'T5 型、全長 53cm、18W×2 本、サムスン LM281B+Pro、IP66、連結可（最大 30 本・合計 500W まで）、製品 3 年保証',
     '5,000〜10,000円', '連結できる T5 型の育成ライト 2 本組',
     'HaruDesign の T5 型の植物育成ライト 2 本組。植物工場向けの T5 型を全長 53cm にしたもので、サムスン LM281B+Pro を搭載し、フルスペクトルに青（455nm）と赤（660nm）の LED を足している。連結して棚の幅や奥行きに合わせられる（最大 30 本、合計 500W まで）。防塵防水は IP66。製品 3 年保証。',
     'https://thumbnail.image.rakuten.co.jp/@0_mall/harudesign/cabinet/10621215/imgrc0094243380.jpg?_ex=300x300',
     'https://hb.afl.rakuten.co.jp/hgc/51ddadd6.592101ce.51ddadd7.b054826c/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fharudesign%2F20001021%2F&m=https%3A%2F%2Fitem.rakuten.co.jp%2Fharudesign%2F20001021%2F',
     'https://www.amazon.co.jp/dp/B0D362RR1R', 'harudesign:10000152', 6853)
  ) as v(n, name, product_name, slug, model, spec, price_band, summary, description, image, rakuten, amazon, ext_id, price)
  where not exists (select 1 from public.affiliates a where a.ext_id = v.ext_id)
  returning id
)
insert into public.tool_reviews (affiliate_id, status, postage_included, ai_note, reviewed_at)
select id, 'approved', true, 'オーナーが Amazon のリンクで指定（11-22）。楽天はメーカー直営店・送料無料', now() from ins;

select id, product_name, genre, price, is_published, sort_order from public.affiliates where ext_id in ('harudesign:10000128', 'harudesign:10000152');
