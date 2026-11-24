-- RUN 2026-11-24: the owner reported that ValueCommerce passed its review of the site. The site draws the 1x1 image
-- inside each link (tools.js vcPixel), and the terms, the privacy policy (4) and the CSP name ValueCommerce (8dad10a).
-- The link was tested from outside: it sets the ValueCommerce cookie and resolves to the Yahoo! Shopping page.
-- 11-21: Yahoo! links through ValueCommerce (MyLink), prepared — NOT RUN YET.
-- Run only after ValueCommerce finishes its review of the site "Aroid Origins" (sid 3789153): until then the
-- dashboard says ads are not counted correctly. The program Yahoo!ショッピング(ヤフーショッピング) (2025875, 2%) is
-- 提携済み for this site since 11-21. MyLink ad 2840499, ad space pid 892753750.
-- Today the seven links are Yahoo! Shopping's own share links (yahoo.jp → affiliate.shopping.yahoo.co.jp); the
-- old values are kept in the comments so they can be put back.
-- The MyLink code also carries a 1×1 image (//ad.jp.ap.valuecommerce.com/servlet/gifbanner?sid=3789153&pid=892753750):
-- before running this, tools.js must draw it beside the link, and the privacy policy (4) and the CSP (img-src)
-- must name ValueCommerce.
update public.affiliates set yahoo = 'https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3789153&pid=892753750&vc_url=' || v.enc
from (values
  (1, 'https%3A%2F%2Fstore.shopping.yahoo.co.jp%2Fe-kurashi%2Fs1j71.html'),             -- was https://yahoo.jp/emnJPd
  (2, 'https%3A%2F%2Fstore.shopping.yahoo.co.jp%2Fhome-grown%2Fsup-002.html'),          -- was https://yahoo.jp/P6uRdw
  (3, 'https%3A%2F%2Fstore.shopping.yahoo.co.jp%2Fbaroness%2Fks-p-pxa290-8.html'),      -- was https://yahoo.jp/4NhWnuz
  (4, 'https%3A%2F%2Fstore.shopping.yahoo.co.jp%2F39way-2nd%2F39way20257db4606e94.html'), -- was https://yahoo.jp/S4_cwH
  (5, 'https%3A%2F%2Fstore.shopping.yahoo.co.jp%2Fdaiyu8-y%2F4522909000012.html'),      -- was https://yahoo.jp/osujS4
  (6, 'https%3A%2F%2Fstore.shopping.yahoo.co.jp%2Fzippy%2Fba72.html'),                  -- was https://yahoo.jp/zFFtS9
  (7, 'https%3A%2F%2Fstore.shopping.yahoo.co.jp%2Fmiipas%2Fex00001s.html')              -- was https://yahoo.jp/wvAcFPy
) as v(id, enc)
where public.affiliates.id = v.id;

select id, product_name, yahoo from public.affiliates where id between 1 and 7 order by id;
