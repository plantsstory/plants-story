/* ============================================================
   ARCHIVE LAYER
   Front-page modules (ledger stats, story of the day, index,
   timeline), the entries ledger, the specimen label and the
   related-entries block on the detail page.
   Reads the in-memory cultivar store built by app-core.js.
   ============================================================ */
(function () {
  'use strict';

  var base = (typeof _basePath === 'string') ? _basePath : '/';

  function lang() { return (window.currentLang === 'en') ? 'en' : 'jp'; }
  function T(key) { return (typeof t === 'function') ? t(key) : key; }
  function esc(s) {
    if (typeof escHtml === 'function') return escHtml(s == null ? '' : String(s));
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function clean(v) {
    if (v == null) return '';
    v = String(v).trim();
    if (!v || v === 'null' || v === 'undefined' || v === '不明' || /^unknown$/i.test(v) || /^n\/?a$/i.test(v)) return '';
    return v;
  }
  function yearOf(v) {
    var m = String(v == null ? '' : v).match(/(1[5-9]\d\d|20\d\d)/);
    return m ? parseInt(m[1], 10) : null;
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }
  function visibleSlugs() {
    var m = {};
    (window._generaData || []).forEach(function (g) { m[g.slug] = g; });
    return m;
  }

  /* ---------- geography: turn a type locality into a country ---------- */
  var COUNTRIES = [
    'Colombia', 'Panama', 'Panamá', 'Peru', 'Perú', 'Ecuador', 'Mexico', 'México', 'Brazil', 'Brasil', 'Venezuela',
    'Costa Rica', 'Guatemala', 'Bolivia', 'French Guiana', 'Guyana', 'Suriname', 'Honduras', 'Nicaragua', 'Belize',
    'Cuba', 'Jamaica', 'Trinidad', 'Dominican Republic', 'Haiti', 'Puerto Rico', 'El Salvador', 'Paraguay', 'Argentina',
    'Indonesia', 'Madagascar', 'Australia', 'Philippines', 'Malaysia', 'Malaya', 'Nepal', 'China', 'New Guinea',
    'Papua New Guinea', 'Gabon', 'Mauritius', 'Thailand', 'Vietnam', 'Viet Nam', 'India', 'Sri Lanka', 'Myanmar',
    'Burma', 'Laos', 'Cambodia', 'Japan', 'Taiwan', 'Borneo', 'Sumatra', 'Java', 'Sulawesi', 'Cameroon', 'Congo',
    'Uganda', 'Tanzania', 'Kenya', 'Ethiopia', 'Nigeria', 'Ghana', 'West Africa', 'Réunion', 'Reunion', 'Comoros',
    'Seychelles', 'Fiji', 'Solomon Islands', 'Vanuatu', 'New Caledonia', 'Singapore'
  ];
  var CANON = { 'Panamá': 'Panama', 'Perú': 'Peru', 'México': 'Mexico', 'Brasil': 'Brazil', 'Malaya': 'Malaysia', 'Viet Nam': 'Vietnam', 'Burma': 'Myanmar', 'Reunion': 'Réunion', 'Borneo': 'Indonesia', 'Sumatra': 'Indonesia', 'Java': 'Indonesia', 'Sulawesi': 'Indonesia', 'New Guinea': 'Papua New Guinea' };
  var REGION_HINTS = [
    [/\b(Guna Yala|Kuna Yala|Comarca|Darién|Darien|Chiriqu[ií]|Bocas del Toro|Coclé|Cocle|Veraguas|Col[oó]n|Puerto Obald[ií]a)\b/i, 'Panama'],
    [/\b(Choc[oó]|Antioquia|Valle del Cauca|Buenaventura|Calima|Nari[nñ]o|Cauca|Risaralda|Caldas|Santander|Cundinamarca|Putumayo|Frontino|Murr[ií])\b/i, 'Colombia'],
    [/\b(Chiapas|Oaxaca|Veracruz|Tabasco|Yucat[aá]n)\b/i, 'Mexico'],
    [/\b(Morona|Gualaquiza|Zamora|Pastaza|Napo|Esmeraldas|Pichincha|Carchi|Los R[ií]os|Sucumb[ií]os|Orellana)\b/i, 'Ecuador'],
    [/\b(Queensland|New South Wales|Northern Territory)\b/i, 'Australia'],
    [/\b(Amazonas|Loreto|San Mart[ií]n|Hu[aá]nuco|Cusco|Cuzco|Junín|Junin)\b/i, 'Peru'],
    [/\b(Amapá|Amapa|Pará|Para|Amazonas|Bahia|Espírito Santo|Minas Gerais|Rio de Janeiro|São Paulo|Brazil North)\b/, 'Brazil']
  ];
  function countryOf(text) {
    text = clean(text);
    if (!text) return '';
    var i;
    for (i = 0; i < COUNTRIES.length; i++) {
      var c = COUNTRIES[i];
      if (new RegExp('(^|[^A-Za-z])' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z]|$)', 'i').test(text)) {
        return CANON[c] || c;
      }
    }
    for (i = 0; i < REGION_HINTS.length; i++) {
      if (REGION_HINTS[i][0].test(text)) return REGION_HINTS[i][1];
    }
    return '';
  }

  /* ---------- entry description ---------- */
  function topOrigin(entry) {
    var os = ((entry && entry.origins) || []).filter(function (o) { return o && !o._type; });
    os.sort(function (a, b) { return (parseInt(b.trust, 10) || 0) - (parseInt(a.trust, 10) || 0); });
    return os[0] || null;
  }
  function describe(fullName, entry, type) {
    entry = entry || {};
    var displayName = fullName.replace(' [Seedling]', '');
    var genus = displayName.split(' ')[0];
    var epithet = displayName.slice(genus.length + 1);
    var o = topOrigin(entry);
    var s = (o && o.structured) || {};
    type = type || entry._type || (o && o.structured && o.structured.origin_type) || 'species';
    var d = {
      fullName: fullName, displayName: displayName, genus: genus, epithet: epithet, type: type,
      origin: o, trust: o ? (parseInt(o.trust, 10) || 0) : 0,
      id: entry._id || null, createdAt: entry._created_at || '',
      formula: entry.formula || null
    };
    d.author = clean(s.author_name);
    d.pubYear = yearOf(s.publication_year) || yearOf(o && o.discovery_year);
    d.collector = clean(s.collector);
    d.colYear = yearOf(s.collection_year);
    d.locality = clean(s.type_locality);
    d.habitat = clean(s.known_habitats) || clean(o && o.native_region);
    d.country = countryOf(d.locality) || countryOf(d.habitat);
    d.breeder = clean(s.breeder) || clean(o && o.discoverer_or_breeder);
    d.namer = clean(s.namer);
    d.namingYear = yearOf(s.naming_year);
    d.sowing = clean(s.sowing_date);
    d.year = d.pubYear || d.namingYear || yearOf(d.sowing);
    d.text = clean(s.notes) || clean(o && o.body) || '';
    d.textEn = clean(o && o.body_en) || d.text;
    d.parentA = clean((d.formula && d.formula.parentA) || s.parentA || s.parent_a);
    d.parentB = clean((d.formula && d.formula.parentB) || s.parentB || s.parent_b);
    d.creator = clean(d.formula && d.formula.creatorName);
    d.href = base + genus.toLowerCase() + '/' + encodeURIComponent(epithet);
    return d;
  }
  // "T. B. Croat" / "O.Ortiz" / "Croat" all index under the surname "Croat";
  // standard abbreviations ("N.E.Br.", "Mast.") and full names ("Tim Anderson") stay as written.
  function personKey(p) {
    p = p.replace(/\s+/g, ' ').trim();
    var tokens = p.split(' ');
    if (tokens.length === 1) {
      var m = p.match(/^(?:[A-Z]\.)+([A-Z][a-z]{2,})$/); // "O.Ortiz", "R.N.Cirino"
      return m ? m[1] : p;
    }
    var rest = tokens.filter(function (tk) { return !/^(?:[A-Z]\.)+$/.test(tk) && !/^[A-Z]$/.test(tk); });
    if (rest.length === 1 && /^[A-Z][a-z]{2,}$/.test(rest[0])) return rest[0]; // initials + surname
    return p;
  }
  function splitPeople(v) {
    v = clean(v);
    if (!v) return [];
    v = v.replace(/\([^)]*\)/g, ' ');           // basionym authors "(Sims) G.Don" -> G.Don
    return v.split(/\s*(?:&|,|\bet\b|\bex\b|;|\/|×)\s*/).map(function (p) { return personKey(p.trim()); }).filter(function (p) { return p.length > 1; });
  }
  function peopleOf(d) {
    var out = [];
    [d.author, d.collector, d.breeder, d.namer, d.creator].forEach(function (v) {
      splitPeople(v).forEach(function (p) { if (out.indexOf(p) === -1) out.push(p); });
    });
    return out;
  }
  function collectAll() {
    var vis = visibleSlugs();
    var out = [];
    var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
    Object.keys(store).forEach(function (name) {
      var slug = name.split(' ')[0].toLowerCase();
      if (!vis[slug]) return;
      out.push(describe(name, store[name], store[name]._type));
    });
    return out;
  }
  function waitForData(cb) {
    var tries = 0;
    (function tick() {
      if (window._dataFullyLoaded) { cb(); return; }
      if (++tries > 200) return;
      setTimeout(tick, 150);
    })();
  }
  function thumbUrl(displayName) {
    var map = (typeof _thumbMap !== 'undefined') ? _thumbMap : (window._thumbMap || {});
    var p = map[displayName];
    if (!p || !window._SUPABASE_URL) return '';
    return window._SUPABASE_URL + '/storage/v1/object/public/gallery-images/' + p;
  }
  function link(d, inner, extraClass) {
    return '<a href="' + esc(d.href) + '" data-nav="cultivar" data-key="' + esc(d.fullName) + '"' + (extraClass ? ' class="' + extraClass + '"' : '') + '>' + inner + '</a>';
  }
  function yearSpan(y) { return y ? '<span class="year">' + y + '</span>' : ''; }
  function joinParts(parts) { return parts.filter(Boolean).join(' · '); }

  /* citation line for list rows and ledger ("T.Moore · 1878 · Colombia") */
  function citeHtml(d) {
    if (d.type === 'species') {
      return joinParts([esc(d.author), yearSpan(d.pubYear), esc(d.country || d.locality)]);
    }
    var who = d.breeder || d.namer || d.creator;
    if (!who && !d.year) return '';
    var label = d.type === 'clone' && !d.breeder && d.namer ? T('cite_namer') : T('cite_breeder');
    return joinParts([who ? (lang() === 'en' ? label + ' ' + esc(who) : label + ' ' + esc(who)) : '', yearSpan(d.year)]);
  }
  window.entryCiteLine = function (fullName, entry, type) {
    try { return citeHtml(describe(fullName, entry, type)); } catch (e) { return ''; }
  };

  /* ============================================================
     FRONT PAGE
     ============================================================ */
  function renderMastheadGenera(all) {
    var el = document.getElementById('masthead-genera');
    if (!el) return;
    var counts = {};
    all.forEach(function (d) { if (d.type !== 'seedling') counts[d.genus.toLowerCase()] = (counts[d.genus.toLowerCase()] || 0) + 1; });
    var html = '';
    (window._generaData || []).forEach(function (g) {
      html += '<a href="' + esc(base + g.slug + '/') + '" data-nav="genus" data-genus="' + esc(g.slug) + '">' + esc(g.name) + ' · ' + (counts[g.slug] || 0) + ' ' + esc(T('entries_unit')) + '</a>';
    });
    el.innerHTML = html;
    var allLink = document.getElementById('ledger-all-link');
    if (allLink && window._generaData && window._generaData[0]) {
      allLink.setAttribute('data-genus', window._generaData[0].slug);
      allLink.setAttribute('href', base + window._generaData[0].slug + '/');
    }
  }

  function renderLedgerStats(all) {
    var entries = all.filter(function (d) { return d.type !== 'seedling'; });
    var years = entries.map(function (d) { return d.type === 'species' ? d.pubYear : null; }).filter(Boolean);
    var countries = {};
    entries.forEach(function (d) { if (d.country) countries[d.country] = 1; });
    var latest = '';
    all.forEach(function (d) { if (d.createdAt && d.createdAt > latest) latest = d.createdAt; });
    var set = function (id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; };
    set('ledger-count', entries.length + '<small>' + esc(T('entries_unit')) + '</small>');
    set('ledger-years', years.length ? Math.min.apply(null, years) + '–' + Math.max.apply(null, years) : '—');
    set('ledger-localities', Object.keys(countries).length ? Object.keys(countries).length + '<small>' + esc(T('countries_unit')) + '</small>' : '—');
    set('ledger-updated', latest ? fmtDate(latest) : '—');
  }

  function excerpt(text, max) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    var cut = text.slice(0, max);
    var m = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('. '), cut.lastIndexOf('！'), cut.lastIndexOf('？'));
    if (m > max * 0.5) return cut.slice(0, m + 1);
    return cut + '…';
  }
  function renderStory(all) {
    var body = document.getElementById('story-body');
    var dateEl = document.getElementById('story-date');
    if (!body) return;
    if (dateEl) dateEl.textContent = fmtDate(new Date().toISOString());
    var pool = all.filter(function (d) { return d.type === 'species' && d.trust >= 70 && d.text.length >= 60; });
    if (!pool.length) pool = all.filter(function (d) { return d.text.length >= 60; });
    if (!pool.length) { body.innerHTML = ''; return; }
    pool.sort(function (a, b) { return a.displayName.localeCompare(b.displayName); });
    var d = pool[Math.floor(Date.now() / 864e5) % pool.length];
    var thumb = thumbUrl(d.displayName);
    var text = lang() === 'en' ? d.textEn : d.text;
    var html = '';
    if (thumb) html += '<figure class="story__figure">' + link(d, '<img src="' + esc(thumb) + '" alt="' + esc(d.displayName) + '" loading="lazy" decoding="async">') + '</figure>';
    html += '<h2 class="story__title">' + link(d, esc(d.displayName)) + '</h2>';
    var cite = citeHtml(d);
    if (cite) html += '<p class="story__cite mono">' + cite + '</p>';
    html += '<p class="story__body">' + esc(excerpt(text, lang() === 'en' ? 320 : 170)) + '</p>';
    html += link(d, esc(T('story_more')), 'story__more');
    body.innerHTML = html;
  }

  function groupBy(list, keyFn) {
    var map = {};
    list.forEach(function (d) {
      var keys = keyFn(d);
      if (!Array.isArray(keys)) keys = [keys];
      keys.forEach(function (k) { if (!k) return; (map[k] = map[k] || []).push(d); });
    });
    return Object.keys(map).map(function (k) { return { key: k, items: map[k] }; })
      .sort(function (a, b) { return b.items.length - a.items.length || a.key.localeCompare(b.key); });
  }
  function indexGroupHtml(title, groups, limit) {
    if (!groups.length) return '';
    var html = '<div class="index__group"><h3>' + esc(title) + '</h3><ul class="index__list">';
    groups.slice(0, limit || 999).forEach(function (g) {
      html += '<li class="index__item"><button type="button" class="index__toggle" aria-expanded="false"><span class="index__name">' + esc(g.key) + '</span><span class="index__count">' + g.items.length + '</span></button><ul class="index__sub">';
      g.items.slice().sort(function (a, b) { return (a.year || 9999) - (b.year || 9999) || a.displayName.localeCompare(b.displayName); }).forEach(function (d) {
        html += '<li>' + link(d, esc(d.displayName)) + (d.year ? '<span class="mono">' + d.year + '</span>' : '') + '</li>';
      });
      html += '</ul></li>';
    });
    return html + '</ul></div>';
  }
  var TYPE_LABEL = { species: ['原種', 'Species'], hybrid: ['交配種', 'Hybrids'], clone: ['クローン', 'Clones'], seedling: ['実生', 'Seedlings'] };
  function renderIndex(all) {
    var el = document.getElementById('archive-index-body');
    if (!el) return;
    var byCountry = groupBy(all.filter(function (d) { return d.type === 'species'; }), function (d) { return d.country; });
    var byPerson = groupBy(all, peopleOf);
    var byType = groupBy(all, function (d) { var l = TYPE_LABEL[d.type]; return l ? (lang() === 'en' ? l[1] : l[0]) : ''; });
    el.innerHTML = indexGroupHtml(T('index_localities'), byCountry) + indexGroupHtml(T('index_people'), byPerson, 12) + indexGroupHtml(T('index_types'), byType);
  }

  function renderTimeline(all) {
    var el = document.getElementById('archive-timeline-body');
    if (!el) return;
    var items = all.filter(function (d) { return d.type === 'species' && d.pubYear; })
      .sort(function (a, b) { return a.pubYear - b.pubYear || a.displayName.localeCompare(b.displayName); });
    if (!items.length) { el.innerHTML = '<p class="empty-state">' + esc(T('timeline_empty')) + '</p>'; return; }
    var minY = Math.floor(items[0].pubYear / 10) * 10;
    var maxY = Math.ceil((items[items.length - 1].pubYear + 1) / 10) * 10;
    var span = Math.max(10, maxY - minY);
    var labelEvery = span > 120 ? 20 : 10;
    var html = '<div class="timeline__axis" aria-hidden="true"><div class="timeline__track"></div>';
    for (var y = minY; y <= maxY; y += 10) {
      var pct = (y - minY) / span * 100;
      var major = (y - minY) % labelEvery === 0;
      html += '<div class="timeline__tick' + (major ? '' : ' timeline__tick--minor') + '" style="left:' + pct.toFixed(2) + '%">' + (major ? '<span>' + y + '</span>' : '') + '</div>';
    }
    items.forEach(function (d, i) {
      var pct = (d.pubYear - minY) / span * 100;
      html += '<a class="timeline__dot timeline__dot--' + (i % 3) + '" style="left:' + pct.toFixed(2) + '%" href="' + esc(d.href) + '" data-nav="cultivar" data-key="' + esc(d.fullName) + '" data-year="' + d.pubYear + '" aria-label="' + esc(d.displayName + ', ' + d.pubYear) + '" tabindex="-1">'
        + '<span class="timeline__tip"><i>' + esc(d.epithet) + '</i> ' + d.pubYear + '</span></a>';
    });
    html += '</div>';
    // decade ledger
    var decades = {};
    items.forEach(function (d) { var k = Math.floor(d.pubYear / 10) * 10; (decades[k] = decades[k] || []).push(d); });
    html += '<ol class="timeline__list">';
    Object.keys(decades).sort(function (a, b) { return a - b; }).forEach(function (k) {
      html += '<li class="timeline__decade"><span class="mono">' + k + 's</span><div>';
      decades[k].forEach(function (d) {
        html += link(d, esc(d.epithet) + '<span class="num">' + d.pubYear + '</span>');
      });
      html += '</div></li>';
    });
    html += '</ol>';
    el.innerHTML = html;
  }

  var _front = null;
  function renderFront() {
    if (!document.getElementById('story-body')) return;
    var all = collectAll();
    _front = all;
    renderMastheadGenera(all);
    renderLedgerStats(all);
    renderStory(all);
    renderIndex(all);
    renderTimeline(all);
  }

  /* ============================================================
     ENTRIES LEDGER (replaces "recently updated" cards)
     ============================================================ */
  var _ledgerArgs = null;
  window.renderEntriesLedger = function (grid, items, thumbMap) {
    _ledgerArgs = [grid, items, thumbMap];
    thumbMap = thumbMap || {};
    var baseUrl = window._SUPABASE_URL || '';
    var html = '<div class="overflow-auto"><table class="ledger-table"><thead><tr>'
      + '<th>' + esc(T('ledger_no')) + '</th><th>' + esc(T('ledger_name')) + '</th><th class="ledger-table__cell-type">' + esc(T('ledger_type')) + '</th>'
      + '<th>' + esc(T('ledger_meta')) + '</th><th class="right">' + esc(T('ledger_trust')) + '</th></tr></thead><tbody>';
    items.forEach(function (item, i) {
      var origins = (item.origins || []);
      var formula = null;
      origins = origins.filter(function (o) { if (o && o._type === 'formula') { formula = o.formula; return false; } return true; });
      var d = describe(item.cultivar_name, { origins: origins, formula: formula, _type: item.type, _id: item.id }, item.type);
      var bi = (typeof getBadgeInfo === 'function') ? getBadgeInfo(d.type, d.fullName) : { cls: 'badge--' + d.type, txt: d.type };
      var trustCls = (typeof getTrustClass === 'function') ? getTrustClass(d.trust) : '';
      var no = d.id ? String(d.id).padStart(3, '0') : String(i + 1).padStart(2, '0');
      var thumb = thumbMap[d.displayName] && baseUrl ? baseUrl + '/storage/v1/object/public/gallery-images/' + thumbMap[d.displayName] : '';
      html += '<tr role="link" tabindex="0" data-nav="cultivar" data-key="' + esc(d.fullName) + '">';
      html += '<td class="ledger-table__no">' + no + '</td>';
      html += '<td class="ledger-table__cell-name"><div class="flex-center-sm">' + (thumb ? '<img class="ledger-table__thumb" src="' + esc(thumb) + '" alt="" loading="lazy" decoding="async">' : '') + '<span class="ledger-table__name">' + esc(d.displayName) + '</span></div></td>';
      html += '<td class="ledger-table__cell-type"><span class="badge ' + esc(bi.cls) + '">' + esc(bi.txt) + '</span></td>';
      var cite = citeHtml(d);
      html += '<td class="ledger-table__cell-meta ledger-table__meta">' + (cite ? '<span class="mono">' + cite + '</span>' : '') + (d.parentA && d.parentB ? '<div class="text-xs">' + esc(d.parentA) + ' × ' + esc(d.parentB) + '</div>' : '') + '</td>';
      html += '<td class="ledger-table__cell-trust right">' + (d.trust > 0 ? '<div class="trust"><div class="trust__bar"><div class="trust__fill ' + trustCls + '" style="width:' + d.trust + '%"></div></div><span class="trust__label">' + d.trust + '%</span></div>' : '<span class="mono">—</span>') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    grid.innerHTML = html;
  };

  /* ============================================================
     DETAIL PAGE: specimen label + related entries
     ============================================================ */
  var _detailArgs = null;
  function cell(k, v) { return v ? '<div class="specimen__cell"><span class="specimen__k">' + esc(T(k)) + '</span><span class="specimen__v">' + v + '</span></div>' : ''; }
  function findByEpithet(all, name) {
    name = clean(name).replace(/^['"‘’“”]+|['"‘’“”]+$/g, '').toLowerCase();
    if (!name) return null;
    for (var i = 0; i < all.length; i++) {
      var e = all[i].epithet.replace(/^['"‘’“”]+|['"‘’“”]+$/g, '').toLowerCase();
      if (e === name || all[i].displayName.toLowerCase() === name) return all[i];
    }
    return null;
  }
  function parentHtml(all, name) {
    var d = findByEpithet(all, name);
    return d ? link(d, esc(name)) : esc(name);
  }
  function renderSpecimen(d, all) {
    var el = document.getElementById('specimen-label');
    if (!el) return;
    var cells = '';
    if (d.type === 'species') {
      cells += cell('spec_author', esc(d.author));
      cells += cell('spec_pub_year', yearSpan(d.pubYear));
      cells += cell('spec_collector', esc(d.collector));
      cells += cell('spec_col_year', yearSpan(d.colYear));
      cells += cell('spec_locality', esc(d.locality));
      cells += cell('spec_habitat', esc(d.habitat));
    } else {
      if (d.type === 'clone' && !d.breeder && d.namer) cells += cell('spec_namer', esc(d.namer));
      else cells += cell('spec_breeder', esc(d.breeder || d.namer || d.creator));
      cells += cell(d.type === 'seedling' ? 'spec_sowing' : 'spec_year', d.type === 'seedling' ? esc(d.sowing) : yearSpan(d.year));
      if (d.parentA || d.parentB) cells += cell('spec_parents', parentHtml(all, d.parentA) + ' × ' + parentHtml(all, d.parentB));
    }
    el.innerHTML = cells ? '<div class="specimen">' + cells + '</div>' : '';
  }
  function normParent(p) { return clean(p).replace(/^['"‘’“”]+|['"‘’“”]+$/g, '').toLowerCase().replace(/^(anthurium|monstera|philodendron)\s+/, ''); }
  function relatedGroupHtml(titleKey, list) {
    if (!list.length) return '';
    var html = '<div class="related__group"><h3>' + esc(T(titleKey)) + '</h3><ul>';
    list.slice(0, 6).forEach(function (d) {
      var meta = d.type === 'species' ? joinParts([d.pubYear, d.country]) : joinParts([TYPE_LABEL[d.type] ? (lang() === 'en' ? TYPE_LABEL[d.type][1] : TYPE_LABEL[d.type][0]) : '', d.year]);
      html += '<li>' + link(d, esc(d.displayName)) + (meta ? '<span class="mono">' + esc(meta) + '</span>' : '') + '</li>';
    });
    return html + '</ul></div>';
  }
  function renderRelated(d, all) {
    var section = document.getElementById('related-section');
    var el = document.getElementById('related-container');
    if (!section || !el) return;
    var others = all.filter(function (x) { return x.fullName !== d.fullName; });
    var self = normParent(d.epithet);
    var myPeople = peopleOf(d);
    var myParents = [normParent(d.parentA), normParent(d.parentB)].filter(Boolean);

    var sameCountry = d.country ? others.filter(function (x) { return x.type === 'species' && x.country === d.country; }) : [];
    var samePerson = myPeople.length ? others.filter(function (x) { return peopleOf(x).some(function (p) { return myPeople.indexOf(p) !== -1; }); }) : [];
    var children = self.length >= 4 ? others.filter(function (x) {
      if (x.type === 'species') return false;
      var ps = [normParent(x.parentA), normParent(x.parentB)];
      if (ps.indexOf(self) !== -1 || ps.some(function (p) { return p && p.indexOf(self) !== -1; })) return true;
      return new RegExp('(^|[^a-z])' + self.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)', 'i').test(x.text);
    }) : [];
    var siblings = myParents.length ? others.filter(function (x) {
      var ps = [normParent(x.parentA), normParent(x.parentB)].filter(Boolean);
      return ps.some(function (p) { return myParents.indexOf(p) !== -1; });
    }) : [];
    if (d.type !== 'species' && d.parentA && d.parentB) {
      // show the parents themselves first among "siblings" context
      [d.parentA, d.parentB].forEach(function (p) { var pd = findByEpithet(others, p); if (pd && siblings.indexOf(pd) === -1) siblings.unshift(pd); });
    }

    // previous / next within the same genus and the same broad group
    var group = others.concat([d]).filter(function (x) { return x.genus === d.genus && (x.type === 'seedling') === (d.type === 'seedling'); })
      .sort(function (a, b) { return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }); });
    var idx = -1;
    group.forEach(function (x, i) { if (x.fullName === d.fullName) idx = i; });
    var prev = idx > 0 ? group[idx - 1] : null;
    var next = idx >= 0 && idx < group.length - 1 ? group[idx + 1] : null;

    var html = '<div class="related__grid">'
      + relatedGroupHtml('related_children', children)
      + relatedGroupHtml('related_siblings', siblings)
      + relatedGroupHtml('related_same_locality', sameCountry)
      + relatedGroupHtml('related_same_person', samePerson)
      + '</div>';
    if (prev || next) {
      html += '<nav class="related__nav" aria-label="' + esc(T('related_title')) + '">';
      if (prev) html += link(prev, '<span class="mono">← ' + esc(T('related_prev')) + '</span><span class="related__nav-name">' + esc(prev.displayName) + '</span>');
      if (next) html += link(next, '<span class="mono">' + esc(T('related_next')) + ' →</span><span class="related__nav-name">' + esc(next.displayName) + '</span>', 'related__nav--next');
      html += '</nav>';
    }
    var any = children.length || siblings.length || sameCountry.length || samePerson.length || prev || next;
    el.innerHTML = any ? html : '';
    section.classList.toggle('d-none', !any);
  }
  function renderDetail() {
    if (!_detailArgs) return;
    var displayName = _detailArgs[0];
    var h1 = document.querySelector('#page-cultivar h1');
    if (!h1 || h1.textContent.trim() !== displayName) return; // page moved on
    var all = collectAll();
    var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
    var key = _detailArgs[4] || displayName;
    var entry = store[key] || store[displayName] || store[displayName + ' [Seedling]'] || _detailArgs[1];
    if (!entry) return;
    var d = describe(key in store ? key : (store[displayName] ? displayName : (store[displayName + ' [Seedling]'] ? displayName + ' [Seedling]' : key)), entry, entry._type || _detailArgs[2]);
    renderSpecimen(d, all);
    renderRelated(d, all);
  }
  window.onCultivarDetailRendered = function (displayName, cData, type, genusName, cultivarName) {
    _detailArgs = [displayName, cData, type, genusName, cultivarName];
    var spec = document.getElementById('specimen-label');
    var section = document.getElementById('related-section');
    if (spec) spec.innerHTML = '';
    if (section) section.classList.add('d-none');
    waitForData(renderDetail);
  };

  /* ---------- interactions ---------- */
  document.addEventListener('click', function (e) {
    var tg = e.target.closest ? e.target.closest('.index__toggle') : null;
    if (!tg) return;
    var li = tg.parentNode;
    var open = !li.classList.contains('open');
    li.classList.toggle('open', open);
    tg.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  function hotDot(e, on) {
    var a = e.target.closest ? e.target.closest('.timeline__list a[data-key]') : null;
    if (!a) return;
    var key = a.getAttribute('data-key');
    var dots = document.querySelectorAll('.timeline__dot');
    for (var i = 0; i < dots.length; i++) {
      if (dots[i].getAttribute('data-key') === key) dots[i].classList.toggle('is-hot', on);
    }
  }
  document.addEventListener('mouseover', function (e) { hotDot(e, true); });
  document.addEventListener('mouseout', function (e) { hotDot(e, false); });
  document.addEventListener('focusin', function (e) { hotDot(e, true); });
  document.addEventListener('focusout', function (e) { hotDot(e, false); });

  /* re-render dynamic modules after a language switch */
  if (typeof window.applyLanguage === 'function') {
    var _applyLanguage = window.applyLanguage;
    window.applyLanguage = function (l) {
      var r = _applyLanguage.apply(this, arguments);
      try {
        if (window._dataFullyLoaded) { renderFront(); renderDetail(); }
        if (_ledgerArgs) window.renderEntriesLedger.apply(null, _ledgerArgs);
      } catch (err) { /* ignore */ }
      return r;
    };
  }

  /* boot */
  function boot() {
    waitForData(function () {
      // thumbnails arrive shortly after the full fetch; give them a moment
      var tries = 0;
      (function tick() {
        var ready = (typeof _thumbMapLoaded !== 'undefined') ? _thumbMapLoaded : true;
        if (ready || ++tries > 20) { renderFront(); return; }
        setTimeout(tick, 150);
      })();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
