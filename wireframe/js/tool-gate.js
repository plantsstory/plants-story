/* Tool gate (BOARD 第5回 C9, 2026-09-30): decides whether a tool page is indexed.
   Shared by the site (tools.js), admin.html and the CI generators (generate-static-pages.js,
   generate-sitemap.js), so the page, the stub and the sitemap never disagree.
   Input is an `affiliates` row. Pure; no DOM. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ToolGate = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var MIN_RECORD = 80;
  // superlatives and claims of effect: misleading-advertising and pharmaceutical-law guard
  var BANNED = ['おすすめ', 'オススメ', '最安', 'ランキング', '効く', '効果', '改善', '治る', 'No.1', 'NO.1', 'ナンバーワン'];
  var PRICE = /\d[\d,]*\s*(円|yen)|[¥￥]\s*\d/i;
  var HABITATS = ['着生', '地生', '雲霧林', '低地林', '高湿度', '半日陰'];
  var SHOP_ORDER = ['rakuten', 'yahoo', 'amazon'];

  function clean(v) { return v == null ? '' : String(v).trim(); }
  function host(u) { try { return new URL(u).hostname.toLowerCase(); } catch (e) { return ''; } }

  // a shop link is shown only when it is the affiliate program's own link, untouched
  function shopUrl(t, shop) {
    var u = clean(t && t[shop]);
    if (!/^https:\/\//i.test(u)) return '';
    var h = host(u);
    if (shop === 'amazon') return h === 'af.moshimo.com' ? u : '';          // old amzn.to links are not drawn
    if (shop === 'rakuten') return /(^|\.)rakuten\.co\.jp$/.test(h) ? u : '';
    if (shop === 'yahoo') return (h === 'yahoo.jp' || /(^|\.)valuecommerce\.com$/.test(h) || /(^|\.)shopping\.yahoo\.co\.jp$/.test(h)) ? u : '';
    return '';
  }
  function shops(t) {
    return SHOP_ORDER.map(function (s) { return { shop: s, url: shopUrl(t, s) }; }).filter(function (x) { return x.url; });
  }
  // Moshimo impression pixel: only the i.moshimo.com image the program hands out
  function impUrl(t) {
    var u = clean(t && t.amazon_imp);
    return host(u) === 'i.moshimo.com' && /^https:\/\//i.test(u) && shopUrl(t, 'amazon') ? u : '';
  }
  function bannedIn(text) {
    return BANNED.filter(function (w) { return text.indexOf(w) !== -1; });
  }

  /* gate(t, ctx) → { pass, missing[] }. ctx.cited: how many recorded entries cite this book */
  function gate(t, ctx) {
    ctx = ctx || {};
    var missing = [];
    var body = clean(t && t.body);
    var words = clean(t && t.summary) + '\n' + body + '\n' + clean(t && t.product_name);
    if (!clean(t && t.genre)) missing.push('genre');
    if (!clean(t && t.slug)) missing.push('slug');
    if (!clean(t && t.maker) && !clean(t && t.model)) missing.push('maker');
    if (!shops(t).length) missing.push('shop');
    if (clean(t && t.genre) === 'books') {
      if (!(ctx.cited > 0) && body.length < MIN_RECORD) missing.push('record');
    } else if (body.length < MIN_RECORD) missing.push('record');
    if (bannedIn(words).length) missing.push('banned');
    if (PRICE.test(body) || PRICE.test(clean(t && t.summary))) missing.push('price');
    return { pass: missing.length === 0, missing: missing };
  }

  var LABELS = {
    genre: 'ジャンル', slug: 'URL名（英小文字）', maker: 'メーカーか型番', shop: '有効な購入先リンク1件以上',
    record: '使用記録 ' + MIN_RECORD + '字以上', banned: '禁止語（おすすめ・最安・効く・効果 など）を外す', price: '本文に価格の数字を書かない'
  };
  function label(k) { return LABELS[k] || k; }

  function slugify(s) {
    return clean(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  }

  return { gate: gate, shops: shops, shopUrl: shopUrl, impUrl: impUrl, bannedIn: bannedIn, label: label, slugify: slugify, HABITATS: HABITATS, MIN_RECORD: MIN_RECORD };
});
