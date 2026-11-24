-- 11-24: two of the seven Yahoo! links lead to a store page that no longer exists (HTTP 404, read on 11-24;
-- the old share links yahoo.jp/emnJPd and yahoo.jp/S4_cwH end at the same missing pages, so this is older than
-- the move to ValueCommerce). The Yahoo! button is taken off these two; their Rakuten buttons stay.
-- To put one back, set yahoo to a ValueCommerce link whose vc_url is a page that exists:
--   https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3789153&pid=892753750&vc_url=<encoded store URL>
--   id 1 GARDENA 電池式霧吹き EasyPump 1L   was …vc_url=https%3A%2F%2Fstore.shopping.yahoo.co.jp%2Fe-kurashi%2Fs1j71.html
--   id 4 マグァンプK 中粒 1.1kg             was …vc_url=https%3A%2F%2Fstore.shopping.yahoo.co.jp%2F39way-2nd%2F39way20257db4606e94.html
update public.affiliates set yahoo = null
where id in (1, 4) and yahoo like 'https://ck.jp.ap.valuecommerce.com/%';

select id, product_name, yahoo is not null has_yahoo, rakuten is not null has_rakuten from public.affiliates where id between 1 and 7 order by id;
