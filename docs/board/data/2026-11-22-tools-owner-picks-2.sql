-- 11-22 (second pair): two more tools the owner sent as Amazon links, published with Rakuten links (postage
-- included, read on 11-22). ねこチップ: the Amazon link was M 10L (5L×2); on Rakuten the 5L bag with postage
-- included is at the shop パリジェンヌ (sunnypop), M and S sizes. GL-T5 L830: the maker's own shop.
with ins as (
  insert into public.affiliates
    (name, product_name, slug, genre, maker, model, spec, price_band, summary, description, image, icon, badge,
     rakuten, amazon, ext_id, source, shop_name, price, price_checked_at, is_published, sort_order)
  select v.name, v.product_name, v.slug, v.genre, v.maker, v.model, v.spec, v.price_band, v.summary, v.description, v.image, '', '',
     v.rakuten, v.amazon, v.ext_id, 'rakuten', v.shop, v.price, now(), true,
     (select coalesce(max(sort_order), 0) from public.affiliates) + v.n
  from (values
    (1, '用土・植込み材', 'ねこチップ Mサイズ 5L（ココチップ＋日向石）', 'rk-sunnypop-10004178', 'soil', 'ねこの道具屋', 'ねこチップ M',
     'ココチップ：軽石（日向石）＝ 2：1、Mサイズ、5L',
     '2,000〜3,000円', 'ココチップと日向石の室内向け植込み材',
     'ココチップと日向石（軽石）を 2：1 で混ぜた室内向けの植込み材。販売元は、軽石を洗い、ココチップをふるって微塵を減らしていると説明している。YouTube で園芸を発信する nekoteito さんの考案と書かれている。粒の大きさ（S・M など）と容量に種類があり、ここは M サイズ 5L。',
     'https://thumbnail.image.rakuten.co.jp/@0_mall/sunnypop/cabinet/08381025/imgrc0127544930.jpg?_ex=300x300',
     'https://hb.afl.rakuten.co.jp/hgc/51ddadd6.592101ce.51ddadd7.b054826c/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fsunnypop%2Fi-030%2F&m=https%3A%2F%2Fitem.rakuten.co.jp%2Fsunnypop%2Fi-030%2F',
     'https://www.amazon.co.jp/dp/B0D8YTS212', 'sunnypop:10004178', 'パリジェンヌ', 2099),
    (2, '光', 'HaruDesign 植物育成ライト GL-T5 L830 25W×2本', 'rk-harudesign-10000192', 'light', 'HaruDesign', 'GL-T5 L830',
     'T5 型、全長 83cm、25W×2 本、サムスン LM281B+Pro、IP66、連結可（最大 20 本・合計 500W まで）、製品 3 年保証',
     '5,000〜10,000円', '連結できる T5 型の育成ライト、長い 83cm の 2 本組',
     'HaruDesign の T5 型の植物育成ライト 2 本組で、全長 83cm の長いほう。サムスン LM281B+Pro を搭載し、フルスペクトルに青（455nm）と赤（660nm）の LED を足している。短い L530 とも連結できる（最大 20 本、合計 500W まで）。防塵防水は IP66。製品 3 年保証。',
     'https://thumbnail.image.rakuten.co.jp/@0_mall/harudesign/cabinet/13413388/830-2_1100.jpg?_ex=300x300',
     'https://hb.afl.rakuten.co.jp/hgc/51ddadd6.592101ce.51ddadd7.b054826c/?pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fharudesign%2F20001805%2F&m=https%3A%2F%2Fitem.rakuten.co.jp%2Fharudesign%2F20001805%2F',
     'https://www.amazon.co.jp/dp/B0H5VL58TR', 'harudesign:10000192', 'HaruDesign', 9524)
  ) as v(n, name, product_name, slug, genre, maker, model, spec, price_band, summary, description, image, rakuten, amazon, ext_id, shop, price)
  where not exists (select 1 from public.affiliates a where a.ext_id = v.ext_id)
  returning id
)
insert into public.tool_reviews (affiliate_id, status, postage_included, ai_note, reviewed_at)
select id, 'approved', true, 'オーナーが Amazon のリンクで指定（11-22）。楽天は送料無料の出品', now() from ins;

select id, product_name, genre, price, is_published from public.affiliates where ext_id in ('sunnypop:10004178', 'harudesign:10000192');
