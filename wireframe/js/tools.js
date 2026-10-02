/* Tools catalogue — /tools/ (目録) and /tools/<slug>/ (道具の1頁). BOARD 第5回 (2026-09-30).
   Reads the `affiliates` rows and `tool_genres`; the index/noindex decision and the shop-link
   checks live in tool-gate.js so the page, the CI stubs and the sitemap agree.
   No card grid, no emoji, no photos in the list: a ruled ledger like the rest of the archive. */
(function () {
  'use strict';
  var base = (typeof _basePath === 'string') ? _basePath : '/';
  var Gate = window.ToolGate;
  var SEARCH_FROM = 20;       // the text box and sort chips appear from 20 items (C10)
  var GENRE_MIN = 2;          // a genre is listed on its own from 2 items; single items go under ほか

  var JP = {
    tools_title: '道具の目録',
    tools_lead: '自生地の条件（雲霧林・着生・標高）に近づけるための道具を、使った記録とともに並べます。育て方は書きません。',
    tools_pr: 'PR — このページには楽天市場・Yahoo!ショッピング・Amazon のアフィリエイトリンクを含みます。リンク経由の購入で当サイトに紹介料が入ります。価格・在庫は各ストアの表示が最新です。',
    tools_pr_amazon: 'Amazonのアソシエイトとして、Aroid Origins は適格販売により収入を得ています。',
    tools_pr_buy: 'PR — 以下のリンクから購入があった場合、運営者に紹介料が入ります。掲載は運営者が実際に使っているものに限ります。',
    tools_genres: 'ジャンル',
    tools_all: 'すべて',
    tools_other: 'ほか',
    tools_search: '道具を検索…',
    tools_sort_genre: 'ジャンル順',
    tools_sort_price: '価格帯順',
    tools_sort_new: '新着順',
    tools_col_no: 'NO.',
    tools_col_name: '道具',
    tools_col_genre: 'ジャンル',
    tools_col_maker: 'メーカー · 型番',
    tools_col_price: '価格帯',
    tools_none: 'この条件に合う道具はまだありません。',
    tools_none_other: 'ほかのジャンルを見る →',
    tools_count: '{n} 点',
    tools_items: 'ITEMS',
    tools_exit: 'Anthurium の台帳 →',
    tools_exit_locality: '産地索引 →',
    tools_back: '道具の目録 →',
    tools_same_genre: '{g}のほかの道具 →',
    tools_record: 'この道具の記録',
    tools_habitat: '対応する自生地の条件',
    tools_species: 'この道具を使っている種',
    tools_buy: '購入先',
    tools_plate_none: 'PLATE — 図版なし',
    tools_plate_rakuten: '図版: 楽天市場の商品画像',
    tools_k_genre: 'ジャンル',
    tools_k_maker: 'メーカー',
    tools_k_model: '型番',
    tools_k_spec: '規格・容量',
    tools_k_price: '価格帯',
    tools_k_recorded: '収録',
    tools_k_updated: '更新',
    tools_colophon_note: '価格と在庫は各ストアの表示が最新です',
    tools_not_found: 'この道具は見つかりませんでした。',
    tools_loading: '…',
    tools_rule: '当サイトは育て方を書きません。ここにあるのは自生地の環境に近づけるための道具の定義と入手先です。'
  };
  function T(k) { var v = (typeof t === 'function') ? t(k) : k; return (v && v !== k) ? v : (JP[k] || k); }
  function en() { return typeof currentLang !== 'undefined' && currentLang === 'en'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtDate(iso) { return iso ? String(iso).slice(0, 10).replace(/-/g, '.') : ''; }
  function no(t) { return 'NO. ' + String(t.id).padStart(3, '0'); }
  var SHOP_NAME = { rakuten: '楽天市場', yahoo: 'Yahoo!ショッピング', amazon: 'Amazon' };

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
  function genreCounts() {
    var c = {};
    (_tools || []).forEach(function (x) { c[x.genre] = (c[x.genre] || 0) + 1; });
    return c;
  }
  // genres shown on their own (≥2 items); the rest fall under 「ほか」
  function listedGenres() {
    var c = genreCounts();
    return (_genres || []).filter(function (g) { return (c[g.slug] || 0) >= GENRE_MIN; });
  }
  function isOther(slug) { var c = genreCounts(); return (c[slug] || 0) > 0 && (c[slug] || 0) < GENRE_MIN; }

  /* ---------- page state ---------- */
  var _slug = '', _genre = '', _q = '', _sort = 'genre';

  window.renderToolsPage = function (slug, genre) {
    _slug = slug ? decodeURIComponent(slug) : '';
    _genre = genre || '';
    var body = document.getElementById('tools-body');
    if (body && !_tools) body.innerHTML = '<div class="loading-text p-xl">' + esc(T('tools_loading')) + '</div>';
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
  function meta(opts) {
    // navigateTo writes generic meta after the render hook; write ours after it
    setTimeout(function () { if (typeof updateMeta === 'function') updateMeta(opts); }, 0);
  }

  /* ---------- /tools/ ---------- */
  function renderIndex() {
    var body = document.getElementById('tools-body');
    var title = document.getElementById('tools-title');
    if (!body) return;
    if (title) title.textContent = T('tools_title');
    crumbs('');
    var tools = _tools || [];
    var listed = listedGenres();
    var counts = genreCounts();
    var otherN = tools.filter(function (x) { return isOther(x.genre); }).length;
    var genreN = Object.keys(counts).length;

    var html = '<p class="detail-standard mono">TOOLS — ' + esc(T('tools_title')) + ' · ' + tools.length + ' ' + esc(T('tools_items')) + ' · ' + genreN + ' GENRES</p>';
    html += '<p class="tools-lead">' + esc(T('tools_lead')) + '</p>';
    html += '<p class="pr-line mono">' + esc(T('tools_pr')) + '<br>' + esc(T('tools_pr_amazon')) + '</p>';

    // genre index with counts: pressing one filters the ledger below
    html += '<section class="index tools-index" aria-label="' + esc(T('tools_genres')) + '"><div class="index__group"><h3>' + esc(T('tools_genres')) + '</h3><ul class="index__list">';
    html += genreItem('', T('tools_all'), 'ALL', tools.length);
    listed.forEach(function (g) { html += genreItem(g.slug, genreLabel(g), g.code, counts[g.slug]); });
    if (otherN) html += genreItem('other', T('tools_other'), 'OTHER', otherN);
    html += '</ul></div></section>';

    if (tools.length >= SEARCH_FROM) {
      html += '<div class="sort-bar tools-sortbar">'
        + '<div class="search-bar search-bar--inline"><input type="search" enterkeyhint="search" class="search-bar__input" id="tools-q" placeholder="' + esc(T('tools_search')) + '" value="' + esc(_q) + '">'
        + '<button class="search-bar__btn" aria-label="検索"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg></button></div>'
        + '<div class="chips">' + ['genre', 'price', 'new'].map(function (k) {
          return '<button type="button" class="chip' + (_sort === k ? ' active' : '') + '" aria-pressed="' + (_sort === k) + '" data-tools-sort="' + k + '">' + esc(T('tools_sort_' + k)) + '</button>';
        }).join('') + '</div></div>';
    }
    html += '<div id="tools-ledger"></div>';
    html += '<p class="related__exit mono"><a href="' + esc(base + 'anthurium') + '" data-nav="genus" data-genus="Anthurium">' + esc(T('tools_exit')) + '</a><span class="related__exit-sep">·</span><a href="' + esc(base + 'locality/') + '" data-nav="locality">' + esc(T('tools_exit_locality')) + '</a></p>';
    body.innerHTML = html;
    renderLedger();

    body.querySelectorAll('[data-tools-genre]').forEach(function (b) {
      b.addEventListener('click', function () {
        _genre = b.getAttribute('data-tools-genre');
        syncGenreUrl();
        body.querySelectorAll('[data-tools-genre]').forEach(function (x) {
          var on = x.getAttribute('data-tools-genre') === _genre;
          x.closest('.index__item').classList.toggle('is-current', on);
          x.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        renderLedger();
        if (typeof gtag === 'function') gtag('event', 'tools_filter', { genre: _genre || 'all' });
      });
    });
    var q = document.getElementById('tools-q');
    if (q) q.addEventListener('input', function () { _q = q.value; renderLedger(); });
    body.querySelectorAll('[data-tools-sort]').forEach(function (b) {
      b.addEventListener('click', function () {
        _sort = b.getAttribute('data-tools-sort');
        body.querySelectorAll('[data-tools-sort]').forEach(function (x) { var on = x === b; x.classList.toggle('active', on); x.setAttribute('aria-pressed', on); });
        renderLedger();
      });
    });

    var g = _genre && _genre !== 'other' ? genreOf(_genre) : null;
    meta({
      title: (g ? genreLabel(g) + ' — ' : '') + T('tools_title') + ' - Aroid Origins',
      description: T('tools_lead'),
      path: 'tools/',
      noindex: !open() || !!_genre
    });
  }
  function genreItem(slug, label, code, n) {
    var on = (_genre || '') === slug;
    return '<li class="index__item' + (on ? ' is-current' : '') + '"><button type="button" class="index__toggle" data-tools-genre="' + esc(slug) + '" aria-pressed="' + on + '">'
      + '<span class="index__name"><span class="tools-index__code mono">' + esc(code) + '</span>' + esc(label) + '</span><span class="index__count">' + n + '</span></button></li>';
  }
  function syncGenreUrl() {
    var url = base + 'tools/' + (_genre ? '?g=' + encodeURIComponent(_genre) : '');
    var st = history.state || {};
    st.genre = _genre;
    history.replaceState(st, '', url);
  }
  var BAND_ORDER = ['〜1,000円', '1,000〜2,000円', '2,000〜3,000円', '3,000〜5,000円', '5,000〜10,000円', '10,000〜20,000円', '20,000円〜'];
  function renderLedger() {
    var el = document.getElementById('tools-ledger');
    if (!el) return;
    var q = _q.trim().toLowerCase();
    var order = {};
    (_genres || []).forEach(function (g, i) { order[g.slug] = i; });
    var rows = (_tools || []).filter(function (x) {
      if (_genre === 'other') { if (!isOther(x.genre)) return false; }
      else if (_genre && x.genre !== _genre) return false;
      if (!q) return true;
      return [x.product_name, x.product_name_en, x.maker, x.model, x.spec, x.summary, genreOf(x.genre).label].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    rows.sort(function (a, b) {
      if (_sort === 'price') return BAND_ORDER.indexOf(a.price_band) - BAND_ORDER.indexOf(b.price_band) || a.sort_order - b.sort_order;
      if (_sort === 'new') return String(b.created_at).localeCompare(String(a.created_at));
      return (order[a.genre] - order[b.genre]) || (a.sort_order - b.sort_order);
    });
    if (!rows.length) {
      el.innerHTML = '<div class="sheet sheet--search"><p>' + esc(T('tools_none')) + '</p><p class="sheet__actions mono"><button type="button" class="sheet__cta" data-tools-reset>' + esc(T('tools_none_other')) + '</button></p></div>';
      var r = el.querySelector('[data-tools-reset]');
      if (r) r.addEventListener('click', function () { var all = document.querySelector('[data-tools-genre=""]'); if (all) all.click(); });
      return;
    }
    var html = '<div class="overflow-auto"><table class="ledger-table tools-ledger"><thead><tr>'
      + '<th>' + esc(T('tools_col_no')) + '</th><th>' + esc(T('tools_col_name')) + '</th><th class="ledger-table__cell-type">' + esc(T('tools_col_genre')) + '</th>'
      + '<th>' + esc(T('tools_col_maker')) + '</th><th class="right">' + esc(T('tools_col_price')) + '</th></tr></thead><tbody>';
    rows.forEach(function (x) {
      var g = genreOf(x.genre);
      var href = base + 'tools/' + encodeURIComponent(x.slug) + '/';
      html += '<tr role="link" tabindex="0" data-nav="tools" data-tool="' + esc(x.slug) + '">';
      html += '<td class="ledger-table__no">' + esc(String(x.id).padStart(3, '0')) + '</td>';
      html += '<td class="ledger-table__cell-name"><a class="ledger-table__name tools-ledger__name" href="' + esc(href) + '" data-nav="tools" data-tool="' + esc(x.slug) + '">' + esc(toolName(x)) + '</a>'
        + (x.summary ? '<div class="tools-ledger__summary">' + esc(x.summary) + '</div>' : '') + '</td>';
      html += '<td class="ledger-table__cell-type"><span class="ledger-table__genre mono">' + esc(g.code) + '</span></td>';
      html += '<td class="ledger-table__cell-meta ledger-table__meta"><span class="mono">' + esc([x.maker, x.model].filter(Boolean).join(' · ') || '—') + '</span></td>';
      html += '<td class="ledger-table__cell-trust right"><span class="ledger-table__price">' + esc(x.price_band || '—') + '</span></td>';
      html += '</tr>';
    });
    el.innerHTML = html + '</tbody></table></div>';
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
    var g = genreOf(x.genre);
    var name = toolName(x);
    if (title) title.textContent = name;
    crumbs(name);
    var gate = Gate ? Gate.gate(x) : { pass: false };

    var html = '<p class="detail-standard mono">TOOLS · ' + esc(genreLabel(g)) + ' · ' + esc(no(x)) + '</p>';
    var cite = [x.maker, x.model, x.price_band].filter(Boolean);
    if (cite.length) html += '<p class="tool-cite mono">' + esc(cite.join(' · ')) + '</p>';

    html += '<div class="tool-head">' + plateHtml(x) + '<div class="tool-label">';
    var cells = '';
    function cell(k, v) { if (v) cells += '<div class="specimen__cell"><span class="specimen__k">' + esc(T(k)) + '</span><span class="specimen__v">' + v + '</span></div>'; }
    cell('tools_k_genre', '<a href="' + esc(base + 'tools/?g=' + encodeURIComponent(g.slug)) + '" data-nav="tools" data-genre="' + esc(g.slug) + '">' + esc(g.code + ' · ' + genreLabel(g)) + '</a>');
    cell('tools_k_maker', esc(x.maker));
    cell('tools_k_model', esc(x.model));
    cell('tools_k_spec', esc(x.spec));
    cell('tools_k_price', esc(x.price_band));
    if (x.habitat_tags && x.habitat_tags.length) cell('tools_habitat', esc(x.habitat_tags.join(' · ')));
    cell('tools_k_recorded', esc(fmtDate(x.created_at)));
    if (x.updated_at && fmtDate(x.updated_at) !== fmtDate(x.created_at)) cell('tools_k_updated', esc(fmtDate(x.updated_at)));
    html += '<div class="specimen">' + cells + '</div></div></div>';

    if (x.body) {
      html += '<section class="tool-section"><h2 class="section-title"><span>' + esc(T('tools_record')) + '</span></h2><div class="tool-body">'
        + String(x.body).split(/\n{2,}|\r\n\r\n/).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join('') + '</div></section>';
    }
    var sp = (x.species || []).filter(Boolean);
    if (sp.length) {
      var store = window.cultivarData || {};
      html += '<p class="tool-species mono"><span>' + esc(T('tools_species')) + '</span> ' + sp.map(function (n) {
        var parts = n.split(' ');
        var known = !!store[n];
        return known ? '<a href="' + esc(base + parts[0].toLowerCase() + '/' + encodeURIComponent(parts.slice(1).join(' '))) + '" data-nav="cultivar" data-key="' + esc(n) + '"><i>' + esc(n) + '</i></a>' : '<i>' + esc(n) + '</i>';
      }).join('<span class="related__exit-sep">·</span>') + '</p>';
    }

    var shops = Gate ? Gate.shops(x) : [];
    if (shops.length) {
      html += '<p class="pr-line mono">' + esc(T('tools_pr_buy')) + (shops.some(function (s) { return s.shop === 'amazon'; }) ? '<br>' + esc(T('tools_pr_amazon')) : '') + '</p>';
      html += '<p class="tool-buy" aria-label="' + esc(T('tools_buy')) + '">' + shops.map(function (s) {
        return '<a href="' + esc(s.url) + '" target="_blank" rel="nofollow sponsored noopener" data-tool-shop="' + s.shop + '">' + esc(SHOP_NAME[s.shop]) + ' ↗</a>';
      }).join('') + '</p>';
      var imp = Gate.impUrl(x);
      // Moshimo's impression pixel, kept as handed out (no lazy loading)
      if (imp) html += '<img class="tool-imp" src="' + esc(imp) + '" width="1" height="1" alt="" referrerpolicy="no-referrer-when-downgrade">';
    }

    html += '<p class="detail-colophon mono">' + [T('tools_k_recorded') + ' ' + fmtDate(x.created_at), x.updated_at ? T('tools_k_updated') + ' ' + fmtDate(x.updated_at) : '', T('tools_colophon_note')].filter(Boolean).map(esc).join('<span class="detail-colophon__sep">·</span>') + '</p>';
    html += '<p class="related__exit mono"><a href="' + esc(base + 'tools/') + '" data-nav="tools">' + esc(T('tools_back')) + '</a><span class="related__exit-sep">·</span><a href="' + esc(base + 'tools/?g=' + encodeURIComponent(g.slug)) + '" data-nav="tools" data-genre="' + esc(g.slug) + '">' + esc(T('tools_same_genre').replace('{g}', genreLabel(g))) + '</a></p>';
    body.innerHTML = html;

    var plateImg = body.querySelector('.tool-plate img');
    if (plateImg) {
      var fail = function () { var p = plateImg.closest('.tool-plate'); if (p) p.outerHTML = plateNone(); };
      plateImg.addEventListener('error', fail);
      setTimeout(function () { if (plateImg.isConnected && !plateImg.naturalWidth) fail(); }, 5000);
    }
    var desc = x.summary || String(x.body || '').replace(/\s+/g, ' ').slice(0, 110);
    meta({
      title: name + ' — ' + genreLabel(g) + ' · ' + T('tools_title') + ' - Aroid Origins',
      description: desc || T('tools_lead'),
      path: 'tools/' + encodeURIComponent(x.slug) + '/',
      image: x.image_own || undefined,
      noindex: !open() || !gate.pass
    });
  }
  function plateNone() { return '<div class="tool-plate tool-plate--none"><p class="mono">' + esc(T('tools_plate_none')) + '</p></div>'; }
  function plateHtml(x) {
    if (x.image_own) return '<figure class="tool-plate"><img src="' + esc(x.image_own) + '" alt="' + esc(toolName(x)) + '" decoding="async"></figure>';
    var img = String(x.image || '');
    if (/^https:\/\/[^/]*rakuten\.co\.jp\//.test(img)) {
      // the Rakuten image is used as handed out, wrapped in the Rakuten link
      var link = Gate ? Gate.shopUrl(x, 'rakuten') : '';
      var tag = '<img src="' + esc(img) + '" alt="' + esc(toolName(x)) + '" decoding="async" referrerpolicy="no-referrer">';
      return '<figure class="tool-plate tool-plate--store">' + (link ? '<a href="' + esc(link) + '" target="_blank" rel="nofollow sponsored noopener" data-tool-shop="rakuten">' + tag + '</a>' : tag)
        + '<figcaption class="mono">' + esc(T('tools_plate_rakuten')) + '</figcaption></figure>';
    }
    return plateNone();
  }

  /* ---------- footer / menu links appear only once the catalogue is open ---------- */
  function refreshNavLinks() {
    var on = open();
    document.querySelectorAll('[data-tools-link]').forEach(function (a) { a.classList.toggle('d-none', !on); });
  }
  load().then(refreshNavLinks);

  /* ---------- GA ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-tool-shop]');
    if (!a || typeof gtag !== 'function') return;
    gtag('event', 'affiliate_click', { shop: a.getAttribute('data-tool-shop'), slug: _slug, genre: ((_tools || []).filter(function (r) { return r.slug === _slug; })[0] || {}).genre || '', page: 'tool' });
  });
})();
