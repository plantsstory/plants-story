/* Tools catalogue — /tools/ (道具の目録) and /tools/<slug>/ (道具のページ).
   Shop layout (owner, 2026-10-02): departments, an image next to every name, store links in place of a buy
   button. Items come from the operator (「使用中」) and from research on the Rakuten Ichiba API.
   The index/noindex decision and the shop-link checks live in tool-gate.js. */
(function () {
  'use strict';
  var base = (typeof _basePath === 'string') ? _basePath : '/';
  var Gate = window.ToolGate;
  var PRICE_FRESH_DAYS = 30;   // an exact price is shown only while it is this recent; otherwise the band

  var JP = {
    tools_title: '道具の目録',
    tools_lead: '自生地の条件（雲霧林・着生・標高）に近づける道具を部門別に。販売実績（レビュー数・評価）と仕様で選んでいます。育て方は書きません。',
    tools_pr: 'PR — このページにはアフィリエイトリンクを含みます。リンク経由の購入で当サイトに紹介料が入ります。価格・在庫は各ストアの表示が最新です。',
    tools_pr_used: '「使用中」の印がある物は運営者が実際に使っている物です。',
    tools_price_note: '価格は楽天市場の {d} 時点',
    tools_pr_amazon: 'Amazonのアソシエイトとして、Aroid Origins は適格販売により収入を得ています。',
    tools_pr_buy: 'PR — 以下のリンクから購入があった場合、運営者に紹介料が入ります。価格・在庫は各ストアの表示が最新です。',
    tools_departments: '部門',
    tools_all: 'すべての部門',
    tools_search: '道具を検索',
    tools_sort_genre: '部門順',
    tools_sort_low: '価格の安い順',
    tools_sort_high: '価格の高い順',
    tools_sort_new: '新着順',
    tools_count: '{n} 点',
    tools_none: 'この条件に合う道具はまだありません。',
    tools_none_other: 'すべての部門を見る →',
    tools_soon: '準備中',
    tools_used: '使用中',
    tools_back: '道具の目録 →',
    tools_same_genre: '{g}のほかの道具',
    tools_description: '商品の説明',
    tools_record: '運営者の使用記録',
    tools_habitat: '対応する自生地の条件',
    tools_species: 'この道具を使っている種',
    tools_spec: '仕様',
    tools_price_at: '{shop}での価格（{d} 時点）',
    tools_price_band: '価格帯',
    tools_view: '{shop}で見る',
    tools_plate_none: '図版なし',
    tools_k_genre: '部門', tools_k_maker: 'メーカー', tools_k_model: '型番', tools_k_spec: '規格・容量', tools_k_price: '価格帯',
    tools_k_recorded: '収録', tools_k_updated: '更新',
    tools_colophon_note: '価格と在庫は各ストアの表示が最新です',
    tools_not_found: 'この道具は見つかりませんでした。',
    tools_exit: 'Anthurium の台帳 →'
  };
  function T(k) { var v = (typeof t === 'function') ? t(k) : k; return (v && v !== k) ? v : (JP[k] || k); }
  function en() { return typeof currentLang !== 'undefined' && currentLang === 'en'; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function fmtDate(iso) { return iso ? String(iso).slice(0, 10).replace(/-/g, '.') : ''; }
  var SHOP_NAME = { rakuten: '楽天市場', yahoo: 'Yahoo!ショッピング', amazon: 'Amazon' };
  var SHOP_SHORT = { rakuten: '楽天', yahoo: 'Yahoo!', amazon: 'Amazon' };
  var RAKUTEN_CREDIT = '<a href="https://developers.rakuten.com/" target="_blank">Supported by Rakuten Developers</a>';

  /* ---------- data ---------- */
  var _tools = null, _genres = null, _loading = null;
  function load() {
    if (_loading) return _loading;
    var sb = window._supabaseClient;
    if (!sb) return Promise.resolve();
    _loading = Promise.all([
      sb.from('affiliates').select('*').eq('is_published', true).order('sort_order'),
      sb.from('tool_genres').select('*').eq('is_published', true).order('sort_order')
    ]).then(function (r) {
      _tools = ((r[0] && r[0].data) || []).filter(function (x) { return x.slug && x.genre; });
      _genres = (r[1] && r[1].data) || [];
    }).catch(function (e) { console.warn('tools load', e); _tools = _tools || []; _genres = _genres || []; });
    return _loading;
  }
  function genreOf(slug) { return (_genres || []).filter(function (g) { return g.slug === slug; })[0] || { slug: slug, code: String(slug || '').toUpperCase(), label: slug }; }
  function genreLabel(g) { return en() ? (g.label_en || g.label) : g.label; }
  function toolName(x) { return en() ? (x.product_name_en || x.product_name) : x.product_name; }
  function open() { return Gate ? Gate.catalogueOpen(_tools || []) : false; }
  function count(slug) { return (_tools || []).filter(function (x) { return x.genre === slug; }).length; }
  function imageOf(x, big) {
    if (x.image_own) return x.image_own;
    var u = String(x.image || '');
    if (!/^https:\/\/[^/]*rakuten\.co\.jp\//.test(u)) return '';
    return big ? u.replace(/_ex=\d+x\d+/, '_ex=600x600') : u;
  }
  function priceFresh(x) { return x.price && x.price_checked_at && (Date.now() - new Date(x.price_checked_at).getTime()) < PRICE_FRESH_DAYS * 864e5; }
  function priceText(x) { return priceFresh(x) ? '¥' + Number(x.price).toLocaleString('ja-JP') : (x.price_band || ''); }
  function priceNum(x) { if (x.price) return x.price; var m = String(x.price_band || '').match(/[\d,]+/); return m ? +m[0].replace(/,/g, '') : 1e9; }
  function hasRakutenData() { return (_tools || []).some(function (x) { return x.source === 'rakuten'; }); }

  /* ---------- page state ---------- */
  var _slug = '', _genre = '', _q = '', _sort = 'genre';

  window.renderToolsPage = function (slug, genre) {
    _slug = slug ? decodeURIComponent(slug) : '';
    _genre = genre || '';
    var body = document.getElementById('tools-body');
    if (body && !_tools) body.innerHTML = '<div class="loading-text p-xl">…</div>';
    load().then(function () {
      var page = document.getElementById('page-tools');
      if (!page || !page.classList.contains('active')) return;
      if (_slug) renderDetail(); else renderIndex();
      refreshNavLinks();
    });
  };
  window.refreshToolsLang = function () {
    var page = document.getElementById('page-tools');
    if (page && page.classList.contains('active') && _tools) { if (_slug) renderDetail(); else renderIndex(); }
  };
  function crumbs(name) {
    var n = document.getElementById('tools-crumb-name'), s = document.getElementById('tools-crumb-sep');
    if (n) n.textContent = name || '';
    if (s) s.classList.toggle('d-none', !name);
  }
  function meta(opts) { setTimeout(function () { if (typeof updateMeta === 'function') updateMeta(opts); }, 0); }

  /* ---------- a product card ---------- */
  function card(x) {
    var href = base + 'tools/' + encodeURIComponent(x.slug) + '/';
    var img = imageOf(x);
    var shops = Gate ? Gate.shops(x) : [];
    return '<article class="shop-card">'
      + '<a class="shop-card__img" href="' + esc(href) + '" data-nav="tools" data-tool="' + esc(x.slug) + '">'
      + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '<span class="shop-card__noimg mono">' + esc(T('tools_plate_none')) + '</span>')
      + (x.owner_used ? '<span class="shop-badge mono">' + esc(T('tools_used')) + '</span>' : '') + '</a>'
      + '<div class="shop-card__body">'
      + '<p class="shop-card__dept mono">' + esc(genreOf(x.genre).code) + '</p>'
      + '<h3 class="shop-card__name"><a href="' + esc(href) + '" data-nav="tools" data-tool="' + esc(x.slug) + '">' + esc(toolName(x)) + '</a></h3>'
      + ((x.maker || x.spec) ? '<p class="shop-card__maker">' + esc([x.maker, x.spec].filter(Boolean).join(' · ')) + '</p>' : '')
      + (priceText(x) ? '<p class="shop-card__price">' + esc(priceText(x)) + '</p>' : '')
      + '<p class="shop-card__shops">' + shops.map(function (s) {
        return '<a href="' + esc(s.url) + '" target="_blank" rel="nofollow sponsored noopener" data-tool-shop="' + s.shop + '" data-tool-slug="' + esc(x.slug) + '">' + esc(SHOP_SHORT[s.shop]) + '</a>';
      }).join('') + '</p>'
      + '</div></article>';
  }

  /* ---------- /tools/ ---------- */
  function renderIndex() {
    var body = document.getElementById('tools-body');
    var title = document.getElementById('tools-title');
    if (!body) return;
    if (title) title.textContent = _genre ? genreLabel(genreOf(_genre)) : T('tools_title');
    crumbs(_genre ? genreLabel(genreOf(_genre)) : '');
    var tools = _tools || [];
    var html = '<p class="detail-standard mono">TOOLS — ' + esc(T('tools_title')) + ' · ' + tools.length + ' ITEMS · ' + (_genres || []).length + ' DEPARTMENTS</p>';
    html += '<p class="tools-lead">' + esc(T('tools_lead')) + '</p>';
    // PR right under the lead, so it is in the first screen on a phone; only true sentences
    var anyAmazon = tools.some(function (x) { return Gate && Gate.shopUrl(x, 'amazon'); });
    var anyUsed = tools.some(function (x) { return x.owner_used; });
    html += '<p class="pr-line mono">' + esc(T('tools_pr')) + (anyUsed ? ' ' + esc(T('tools_pr_used')) : '') + (anyAmazon ? '<br>' + esc(T('tools_pr_amazon')) : '') + '</p>';
    html += '<div class="shop-search"><input type="search" enterkeyhint="search" class="search-bar__input" id="tools-q" placeholder="' + esc(T('tools_search')) + '" value="' + esc(_q) + '">'
      + '<select id="tools-sort" class="shop-sort" aria-label="並び順">' + ['genre', 'low', 'high', 'new'].map(function (k) { return '<option value="' + k + '"' + (_sort === k ? ' selected' : '') + '>' + esc(T('tools_sort_' + k)) + '</option>'; }).join('') + '</select></div>';
    html += '<div class="shop-layout"><nav class="shop-depts" aria-label="' + esc(T('tools_departments')) + '"><p class="shop-depts__title mono">' + esc(T('tools_departments')) + '</p><ul>';
    html += deptItem('', T('tools_all'), 'ALL', tools.length);
    (_genres || []).forEach(function (g) { html += deptItem(g.slug, genreLabel(g), g.code, count(g.slug)); });
    html += '</ul></nav><div class="shop-main"><div id="tools-grid"></div>'
      + (hasRakutenData() ? '<p class="shop-credit mono">' + RAKUTEN_CREDIT + '</p>' : '')
      + '<p class="related__exit mono"><a href="' + esc(base + 'anthurium') + '" data-nav="genus" data-genus="Anthurium">' + esc(T('tools_exit')) + '</a></p></div></div>';
    body.innerHTML = html;
    renderGrid();

    body.querySelectorAll('[data-tools-genre]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        _genre = b.getAttribute('data-tools-genre');
        syncGenreUrl();
        renderIndex();
        var grid = document.getElementById('tools-grid');
        if (grid && window.innerWidth < 900) grid.scrollIntoView({ block: 'start', behavior: 'smooth' });
        if (typeof gtag === 'function') gtag('event', 'tools_filter', { genre: _genre || 'all' });
      });
    });
    var q = document.getElementById('tools-q');
    q.addEventListener('input', function () { _q = q.value; renderGrid(); });
    document.getElementById('tools-sort').addEventListener('change', function (e) { _sort = e.target.value; renderGrid(); });

    var g = _genre ? genreOf(_genre) : null;
    meta({ title: (g ? genreLabel(g) + ' — ' : '') + T('tools_title') + ' - Aroid Origins', description: T('tools_lead'), path: 'tools/', noindex: !open() || !!_genre });
  }
  function deptItem(slug, label, code, n) {
    var on = (_genre || '') === slug, empty = slug && !n;
    return '<li><button type="button" class="shop-dept' + (on ? ' is-current' : '') + (empty ? ' is-empty' : '') + '" data-tools-genre="' + esc(slug) + '" aria-pressed="' + on + '"' + (empty ? ' disabled' : '') + '>'
      + '<span class="shop-dept__code mono">' + esc(code) + '</span><span class="shop-dept__name">' + esc(label) + '</span>'
      + '<span class="shop-dept__count mono">' + (empty ? esc(T('tools_soon')) : n) + '</span></button></li>';
  }
  function syncGenreUrl() {
    var st = history.state || {};
    st.genre = _genre;
    history.replaceState(st, '', base + 'tools/' + (_genre ? '?g=' + encodeURIComponent(_genre) : ''));
  }
  function renderGrid() {
    var el = document.getElementById('tools-grid');
    if (!el) return;
    var q = _q.trim().toLowerCase();
    var order = {};
    (_genres || []).forEach(function (g, i) { order[g.slug] = i; });
    var rows = (_tools || []).filter(function (x) {
      if (_genre && x.genre !== _genre) return false;
      if (!q) return true;
      return [x.product_name, x.product_name_en, x.maker, x.model, x.spec, x.summary, genreOf(x.genre).label].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    rows.sort(function (a, b) {
      if (_sort === 'low') return priceNum(a) - priceNum(b);
      if (_sort === 'high') return priceNum(b) - priceNum(a);
      if (_sort === 'new') return String(b.created_at).localeCompare(String(a.created_at));
      return (order[a.genre] - order[b.genre]) || ((b.owner_used ? 1 : 0) - (a.owner_used ? 1 : 0)) || (a.sort_order - b.sort_order);
    });
    if (!rows.length) {
      el.innerHTML = '<div class="sheet sheet--search"><p>' + esc(T('tools_none')) + '</p><p class="sheet__actions mono"><button type="button" class="sheet__cta" data-tools-reset>' + esc(T('tools_none_other')) + '</button></p></div>';
      var r = el.querySelector('[data-tools-reset]');
      if (r) r.addEventListener('click', function () { _genre = ''; _q = ''; syncGenreUrl(); renderIndex(); });
      return;
    }
    var latest = rows.map(function (x) { return x.price_checked_at || ''; }).sort().pop();
    el.innerHTML = '<p class="shop-count mono">' + esc(T('tools_count').replace('{n}', rows.length)) + (latest ? ' · ' + esc(T('tools_price_note').replace('{d}', fmtDate(latest))) : '') + '</p><div class="shop-grid">' + rows.map(card).join('') + '</div>';
  }

  /* ---------- /tools/<slug>/ ---------- */
  function renderDetail() {
    var body = document.getElementById('tools-body');
    var title = document.getElementById('tools-title');
    if (!body) return;
    var x = (_tools || []).filter(function (r) { return r.slug === _slug; })[0];
    if (!x) {
      if (title) title.textContent = T('tools_title');
      crumbs('');
      body.innerHTML = '<p class="empty-state">' + esc(T('tools_not_found')) + '</p><p class="related__exit mono"><a href="' + esc(base + 'tools/') + '" data-nav="tools">' + esc(T('tools_back')) + '</a></p>';
      meta({ title: T('tools_title') + ' - Aroid Origins', path: 'tools/', noindex: true });
      return;
    }
    var g = genreOf(x.genre), name = toolName(x);
    if (title) title.textContent = name;
    crumbs(name);
    var gate = Gate ? Gate.gate(x) : { pass: false };
    var shops = Gate ? Gate.shops(x) : [];
    var img = imageOf(x, true);
    var rk = Gate ? Gate.shopUrl(x, 'rakuten') : '';

    var html = '<p class="detail-standard mono"><a href="' + esc(base + 'tools/?g=' + encodeURIComponent(g.slug)) + '" data-nav="tools" data-genre="' + esc(g.slug) + '">' + esc(g.code + ' · ' + genreLabel(g)) + '</a> · NO. ' + esc(String(x.id).padStart(3, '0')) + '</p>';
    html += '<div class="shop-item">';
    // image
    var imgTag = img ? '<img src="' + esc(img) + '" alt="' + esc(name) + '" decoding="async" referrerpolicy="no-referrer">' : '<span class="shop-card__noimg mono">' + esc(T('tools_plate_none')) + '</span>';
    html += '<figure class="shop-item__img">' + (img && !x.image_own && rk ? '<a href="' + esc(rk) + '" target="_blank" rel="nofollow sponsored noopener" data-tool-shop="rakuten" data-tool-slug="' + esc(x.slug) + '">' + imgTag + '</a>' : imgTag)
      + (x.owner_used ? '<span class="shop-badge mono">' + esc(T('tools_used')) + '</span>' : '') + '</figure>';
    // buy box
    html += '<div class="shop-item__buy">';
    if (x.maker || x.model) html += '<p class="tool-cite mono">' + esc([x.maker, x.model].filter(Boolean).join(' · ')) + '</p>';
    if (x.summary) html += '<p class="shop-item__summary">' + esc(x.summary) + '</p>';
    if (priceFresh(x)) html += '<p class="shop-item__price">¥' + Number(x.price).toLocaleString('ja-JP') + '<span class="mono">' + esc(T('tools_price_at').replace('{shop}', x.source === 'rakuten' ? '楽天市場' : 'ストア').replace('{d}', fmtDate(x.price_checked_at))) + '</span></p>';
    else if (x.price_band) html += '<p class="shop-item__price">' + esc(x.price_band) + '<span class="mono">' + esc(T('tools_price_band')) + '</span></p>';
    if (shops.length) {
      html += '<p class="pr-line mono">' + esc(T('tools_pr_buy')) + (shops.some(function (s) { return s.shop === 'amazon'; }) ? '<br>' + esc(T('tools_pr_amazon')) : '') + '</p>';
      html += '<div class="shop-buttons">' + shops.map(function (s, i) {
        return '<a class="shop-btn' + (i === 0 ? ' shop-btn--primary' : '') + '" href="' + esc(s.url) + '" target="_blank" rel="nofollow sponsored noopener" data-tool-shop="' + s.shop + '" data-tool-slug="' + esc(x.slug) + '">' + esc(T('tools_view').replace('{shop}', SHOP_NAME[s.shop])) + '</a>';
      }).join('') + '</div>';
      var imp = Gate.impUrl(x);
      if (imp) html += '<img class="tool-imp" src="' + esc(imp) + '" width="1" height="1" alt="" referrerpolicy="no-referrer-when-downgrade">';
    }
    html += '</div></div>';

    if (x.description) html += '<section class="tool-section"><h2 class="section-title"><span>' + esc(T('tools_description')) + '</span></h2><div class="tool-body"><p>' + esc(x.description) + '</p></div></section>';
    if (x.body) {
      html += '<section class="tool-section"><h2 class="section-title"><span>' + esc(T('tools_record')) + '</span></h2><div class="tool-body">'
        + String(x.body).split(/\n{2,}|\r\n\r\n/).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('') + '</div></section>';
    }
    var cells = '';
    function cell(k, v) { if (v) cells += '<div class="specimen__cell"><span class="specimen__k">' + esc(T(k)) + '</span><span class="specimen__v">' + v + '</span></div>'; }
    cell('tools_k_genre', '<a href="' + esc(base + 'tools/?g=' + encodeURIComponent(g.slug)) + '" data-nav="tools" data-genre="' + esc(g.slug) + '">' + esc(genreLabel(g)) + '</a>');
    cell('tools_k_maker', esc(x.maker)); cell('tools_k_model', esc(x.model)); cell('tools_k_spec', esc(x.spec)); cell('tools_k_price', esc(x.price_band));
    if (x.habitat_tags && x.habitat_tags.length) cell('tools_habitat', esc(x.habitat_tags.join(' · ')));
    html += '<section class="tool-section"><h2 class="section-title"><span>' + esc(T('tools_spec')) + '</span></h2><div class="specimen">' + cells + '</div></section>';
    var sp = (x.species || []).filter(Boolean);
    if (sp.length) {
      var store = window.cultivarData || {};
      html += '<p class="tool-species mono"><span>' + esc(T('tools_species')) + '</span> ' + sp.map(function (n) {
        var parts = n.split(' ');
        return store[n] ? '<a href="' + esc(base + parts[0].toLowerCase() + '/' + encodeURIComponent(parts.slice(1).join(' '))) + '" data-nav="cultivar" data-key="' + esc(n) + '"><i>' + esc(n) + '</i></a>' : '<i>' + esc(n) + '</i>';
      }).join('<span class="related__exit-sep">·</span>') + '</p>';
    }
    var related = (_tools || []).filter(function (r) { return r.genre === x.genre && r.id !== x.id; }).slice(0, 4);
    if (related.length) html += '<section class="tool-section"><h2 class="section-title"><span>' + esc(T('tools_same_genre').replace('{g}', genreLabel(g))) + '</span></h2><div class="shop-grid shop-grid--row">' + related.map(card).join('') + '</div></section>';
    html += '<p class="detail-colophon mono">' + [T('tools_k_recorded') + ' ' + fmtDate(x.created_at), x.updated_at ? T('tools_k_updated') + ' ' + fmtDate(x.updated_at) : '', T('tools_colophon_note')].filter(Boolean).map(esc).join('<span class="detail-colophon__sep">·</span>') + '</p>';
    if (x.source === 'rakuten') html += '<p class="shop-credit mono">' + RAKUTEN_CREDIT + '</p>';
    html += '<p class="related__exit mono"><a href="' + esc(base + 'tools/') + '" data-nav="tools">' + esc(T('tools_back')) + '</a></p>';
    body.innerHTML = html;

    var plateImg = body.querySelector('.shop-item__img img');
    if (plateImg) plateImg.addEventListener('error', function () { var f = plateImg.closest('.shop-item__img'); if (f) f.innerHTML = '<span class="shop-card__noimg mono">' + esc(T('tools_plate_none')) + '</span>'; });
    meta({
      title: name + ' — ' + genreLabel(g) + ' · ' + T('tools_title') + ' - Aroid Origins',
      description: x.summary || String(x.description || x.body || '').replace(/\s+/g, ' ').slice(0, 110) || T('tools_lead'),
      path: 'tools/' + encodeURIComponent(x.slug) + '/',
      image: x.image_own || undefined,
      noindex: !open() || !gate.pass
    });
  }

  /* ---------- footer / menu links appear only once the catalogue is open ---------- */
  function refreshNavLinks() {
    var on = open();
    document.querySelectorAll('[data-tools-link]').forEach(function (a) { a.classList.toggle('d-none', !on); });
  }
  load().then(refreshNavLinks);

  /* ---------- broken store images fall back to the plain label ---------- */
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img && img.tagName === 'IMG' && img.closest && img.closest('.shop-card__img')) img.outerHTML = '<span class="shop-card__noimg mono">' + esc(T('tools_plate_none')) + '</span>';
  }, true);

  /* ---------- GA ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-tool-shop]');
    if (!a || typeof gtag !== 'function') return;
    var slug = a.getAttribute('data-tool-slug') || _slug;
    var x = (_tools || []).filter(function (r) { return r.slug === slug; })[0] || {};
    gtag('event', 'affiliate_click', { shop: a.getAttribute('data-tool-shop'), slug: slug, genre: x.genre || '', source: x.source || '', page: _slug ? 'tool' : 'tools' });
  });
})();
