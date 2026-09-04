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
    var sf = (s.formula && typeof s.formula === 'object') ? s.formula : {};
    var dbp = entry._parents || [];
    d.parentA = clean(dbp[0]) || clean((d.formula && d.formula.parentA) || sf.parentA || s.parentA || s.parent_a);
    d.parentB = clean(dbp[1]) || clean((d.formula && d.formula.parentB) || sf.parentB || s.parentB || s.parent_b);
    d.speciesStatus = clean(s.species_status);
    d.originRegion = clean(s.origin_region);
    d.workingNameOrigin = clean(s.working_name_origin);
    d.tradeNames = Array.isArray(s.trade_names) ? s.trade_names.map(clean).filter(Boolean) : [];
    d.introducedBy = clean(s.introduced_by);
    d.closestSpecies = clean(s.closest_species);
    d.qualifier = entry._qualifier || null;
    d.aliases = entry._aliases || [];
    d.tags = entry._tags || [];
    d.nameStatus = entry._nameStatus || null;
    d.formLocality = clean(entry._locality);
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
  // [{key, role}] — role order matters for the people index
  function peopleRolesOf(d) {
    var out = [];
    function push(v, role) { splitPeople(v).forEach(function (p) { if (!out.some(function (x) { return x.key === p; })) out.push({ key: p, role: role }); }); }
    push(d.author, 'author'); push(d.collector, 'collector'); push(d.breeder, 'breeder'); push(d.namer, 'namer'); push(d.creator, 'breeder');
    return out;
  }
  function personSlug(name) {
    return String(name).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
  }
  function peopleIndex(all) {
    var map = {};
    all.forEach(function (d) {
      peopleRolesOf(d).forEach(function (pr) {
        var p = map[pr.key] || (map[pr.key] = { key: pr.key, slug: personSlug(pr.key), roles: {}, entries: [] });
        p.roles[pr.role] = (p.roles[pr.role] || 0) + 1;
        if (p.entries.indexOf(d) === -1) p.entries.push(d);
      });
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.entries.length - a.entries.length || a.key.localeCompare(b.key); });
  }
  // Wrap each person in an author string with a link to their page ("Croat & O.Ortiz" -> two links)
  function linkPeople(raw) {
    raw = clean(raw);
    if (!raw) return '';
    return raw.split(/(\s*(?:&|,|;|\/|\bex\b|\bet\b)\s*)/).map(function (part, i) {
      if (i % 2 === 1) return esc(part);
      var key = personKey(part.replace(/\([^)]*\)/g, ' ').trim());
      if (key.length < 2) return esc(part);
      return '<a href="' + esc(base + 'people/' + encodeURIComponent(personSlug(key))) + '" data-nav="people" data-person="' + esc(personSlug(key)) + '">' + esc(part) + '</a>';
    }).join('');
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
    var ex = excerpt(text, lang() === 'en' ? 320 : 170);
    html += '<p class="story__body' + (/^[A-Za-z]/.test(ex) ? ' story__body--dropcap' : '') + '">' + esc(ex) + '</p>';
    html += link(d, esc(T('story_more')), 'story__more');
    body.innerHTML = html;
    if (window.linkGlossaryTerms) window.linkGlossaryTerms(body.querySelector('.story__body'), 3);
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
  function indexGroupHtml(title, groups, limit, titleHref, navPage) {
    if (!groups.length) return '';
    var head = titleHref ? '<a href="' + esc(titleHref) + '" data-nav="' + esc(navPage || 'people') + '">' + esc(title) + ' →</a>' : esc(title);
    var html = '<div class="index__group"><h3>' + head + '</h3><ul class="index__list">';
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
    el.innerHTML = indexGroupHtml(T('index_localities'), byCountry, 999, base + 'locality/', 'locality') + indexGroupHtml(T('index_people'), byPerson, 12, base + 'people/', 'people') + indexGroupHtml(T('index_types'), byType);
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
    var undescribed = d.type === 'species' && d.speciesStatus && d.speciesStatus !== 'described';
    if (undescribed) {
      var stKey = { undescribed: 'status_undescribed', provisional_name: 'status_provisional', unresolved: 'status_unresolved' }[d.speciesStatus] || 'status_unresolved';
      cells += cell('spec_status', esc(T(stKey)));
      cells += cell('spec_region', esc(d.originRegion || d.habitat));
      cells += cell('spec_closest', esc(d.closestSpecies));
      cells += cell('spec_introduced_by', esc(d.introducedBy));
      cells += cell('spec_trade_names', esc(d.tradeNames.join(' / ')));
      cells += cell('spec_working_name', esc(d.workingNameOrigin));
    } else if (d.type === 'species') {
      cells += cell('spec_author', linkPeople(d.author));
      cells += cell('spec_pub_year', yearSpan(d.pubYear));
      cells += cell('spec_collector', linkPeople(d.collector));
      cells += cell('spec_col_year', yearSpan(d.colYear));
      cells += cell('spec_locality', esc(d.locality));
      if (!d.locality && d.formLocality) cells += cell('spec_form_locality', esc(d.formLocality));
      cells += cell('spec_habitat', esc(d.habitat));
    } else {
      if (d.type === 'clone' && !d.breeder && d.namer) cells += cell('spec_namer', linkPeople(d.namer));
      else cells += cell('spec_breeder', linkPeople(d.breeder || d.namer || d.creator));
      cells += cell(d.type === 'seedling' ? 'spec_sowing' : 'spec_year', d.type === 'seedling' ? esc(d.sowing) : yearSpan(d.year));
      if (d.parentA || d.parentB) cells += cell('spec_parents', parentHtml(all, d.parentA || T('lineage_unknown')) + ' × ' + parentHtml(all, d.parentB || T('lineage_unknown')));
    }
    if (d.aliases && d.aliases.length) cells += cell('spec_aliases', esc(d.aliases.join(' / ')));
    var note = d.nameStatus === 'disputed' ? T('name_status_disputed') : d.nameStatus === 'trade' ? T('name_status_trade') : d.nameStatus === 'informal' ? T('name_status_informal') : '';
    el.innerHTML = (cells ? '<div class="specimen">' + cells + '</div>' : '') + (note ? '<p class="specimen__note mono">' + esc(note) + '</p>' : '');
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
    var parents = [];
    if (d.type !== 'species' && (d.parentA || d.parentB)) {
      [d.parentA, d.parentB].forEach(function (p) { var pd = findByEpithet(others, p); if (pd && parents.indexOf(pd) === -1) parents.push(pd); });
    }

    // previous / next within the same genus and the same broad group
    var group = others.concat([d]).filter(function (x) { return x.genus === d.genus && (x.type === 'seedling') === (d.type === 'seedling'); })
      .sort(function (a, b) { return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }); });
    var idx = -1;
    group.forEach(function (x, i) { if (x.fullName === d.fullName) idx = i; });
    var prev = idx > 0 ? group[idx - 1] : null;
    var next = idx >= 0 && idx < group.length - 1 ? group[idx + 1] : null;

    var html = lineageHtml(d, all, children)
      + '<div class="related__grid">'
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
    var any = parents.length || children.length || siblings.length || sameCountry.length || samePerson.length || prev || next;
    el.innerHTML = any ? html : '';
    section.classList.toggle('d-none', !any);
  }
  /* lineage tree: parents (with their own parents when known) → this plant → offspring */
  function lineageNode(all, name, extraClass) {
    var d = typeof name === 'object' ? name : findByEpithet(all, name);
    var label = d ? d.displayName : clean(name);
    if (!label) label = T('lineage_unknown');
    var inner = '<span class="lineage__name">' + esc(label) + '</span>';
    if (d) {
      var meta = d.type === 'species' ? joinParts([d.pubYear, d.country]) : joinParts([TYPE_LABEL[d.type] ? (lang() === 'en' ? TYPE_LABEL[d.type][1] : TYPE_LABEL[d.type][0]) : '', d.year]);
      if (meta) inner += '<span class="lineage__meta mono">' + esc(meta) + '</span>';
      if (d.type !== 'species' && (d.parentA || d.parentB)) inner += '<span class="lineage__sub">' + esc(clean(d.parentA) || T('lineage_unknown')) + ' × ' + esc(clean(d.parentB) || T('lineage_unknown')) + '</span>';
    }
    var cls = 'lineage__node' + (extraClass ? ' ' + extraClass : '') + (d ? '' : ' lineage__node--text');
    return d && !extraClass ? link(d, inner, cls) : '<div class="' + cls + '">' + inner + '</div>';
  }
  function lineageHtml(d, all, children) {
    var hasParents = d.type !== 'species' && (d.parentA || d.parentB);
    if (!hasParents && !children.length) return '';
    var html = '<div class="lineage"><h3 class="lineage__title mono">' + esc(T('lineage_title')) + '</h3>';
    if (hasParents) {
      html += '<div class="lineage__row lineage__row--parents">' + lineageNode(all, d.parentA) + '<span class="lineage__x">×</span>' + lineageNode(all, d.parentB) + '</div>';
      html += '<div class="lineage__joint lineage__joint--down"></div>';
    }
    html += '<div class="lineage__row">' + lineageNode(all, d, 'lineage__node--self') + '</div>';
    if (children.length) {
      html += '<div class="lineage__joint lineage__joint--down"></div>';
      html += '<div class="lineage__row lineage__row--children">' + children.slice(0, 8).map(function (c) { return lineageNode(all, c); }).join('') + '</div>';
    }
    return html + '</div>';
  }

  /* ============================================================
     PEOPLE: /people/ index and /people/<slug>/ pages
     ============================================================ */
  var ROLE_KEYS = { author: 'role_author', collector: 'role_collector', breeder: 'role_breeder', namer: 'role_namer' };
  function rolesLine(p) {
    return Object.keys(ROLE_KEYS).filter(function (r) { return p.roles[r]; })
      .map(function (r) { return esc(T(ROLE_KEYS[r])) + ' ' + p.roles[r]; }).join(' · ');
  }
  function toLedgerItems(entries) {
    var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
    return entries.map(function (d) {
      var e = store[d.fullName] || {};
      var origins = (e.origins || []).slice();
      if (e.formula) origins.push({ _type: 'formula', formula: e.formula });
      return { id: d.id, cultivar_name: d.fullName, type: d.type, origins: origins };
    });
  }
  var _peopleSlug = null;
  function renderPeoplePageInner() {
    var body = document.getElementById('people-body');
    var title = document.getElementById('people-title');
    var crumbName = document.getElementById('people-crumb-name');
    var crumbSep = document.getElementById('people-crumb-sep');
    if (!body) return;
    var all = collectAll();
    var people = peopleIndex(all);
    var slug = _peopleSlug ? decodeURIComponent(_peopleSlug) : '';
    if (!slug) {
      if (title) title.textContent = T('people_title');
      if (crumbName) crumbName.textContent = '';
      if (crumbSep) crumbSep.classList.add('d-none');
      var groups = {};
      people.forEach(function (p) {
        var main = Object.keys(ROLE_KEYS).sort(function (a, b) { return (p.roles[b] || 0) - (p.roles[a] || 0); })[0];
        (groups[main] = groups[main] || []).push(p);
      });
      var html = '<p class="people__intro">' + esc(T('people_intro')) + '</p><div class="people__grid">';
      ['author', 'collector', 'breeder', 'namer'].forEach(function (r) {
        if (!groups[r]) return;
        html += '<div class="people__group"><h2 class="mono">' + esc(T(ROLE_KEYS[r])) + '</h2><ul class="people__list">';
        groups[r].forEach(function (p) {
          html += '<li><a href="' + esc(base + 'people/' + encodeURIComponent(p.slug)) + '" data-nav="people" data-person="' + esc(p.slug) + '">' + esc(p.key) + '</a><span class="mono">' + rolesLine(p) + '</span></li>';
        });
        html += '</ul></div>';
      });
      body.innerHTML = html + '</div>';
      return;
    }
    var p = people.filter(function (x) { return x.slug === slug; })[0];
    if (!p) {
      if (title) title.textContent = slug;
      body.innerHTML = '<p class="empty-state">' + esc(T('people_none')) + '</p>';
      return;
    }
    if (title) title.textContent = p.key;
    if (crumbName) crumbName.textContent = p.key;
    if (crumbSep) crumbSep.classList.remove('d-none');
    var years = p.entries.map(function (d) { return d.year; }).filter(Boolean);
    var countries = [];
    p.entries.forEach(function (d) { if (d.country && countries.indexOf(d.country) === -1) countries.push(d.country); });
    var facts = '<dl class="ledger people__facts">';
    facts += '<div><dt>' + esc(T('people_entries')) + '</dt><dd>' + p.entries.length + '</dd></div>';
    if (years.length) facts += '<div><dt>' + esc(T('people_years')) + '</dt><dd>' + Math.min.apply(null, years) + (years.length > 1 ? '–' + Math.max.apply(null, years) : '') + '</dd></div>';
    if (countries.length) facts += '<div><dt>' + esc(T('people_localities')) + '</dt><dd class="people__facts-small">' + esc(countries.join(', ')) + '</dd></div>';
    facts += '</dl>';
    var html = '<p class="people__roles mono">' + rolesLine(p) + '</p>' + facts + '<h2 class="section-title"><span>' + esc(T('people_entries')) + '</span></h2><div id="people-ledger"></div>';
    body.innerHTML = html;
    var sorted = p.entries.slice().sort(function (a, b) { return (a.year || 9999) - (b.year || 9999) || a.displayName.localeCompare(b.displayName); });
    var thumbs = {};
    sorted.forEach(function (d) { var u = (typeof _thumbMap !== 'undefined') ? _thumbMap[d.displayName] : null; if (u) thumbs[d.displayName] = u; });
    window.renderEntriesLedger(document.getElementById('people-ledger'), toLedgerItems(sorted), thumbs);
    if (typeof updateMeta === 'function') {
      setTimeout(function () {
        updateMeta({ title: p.key + ' — ' + T('people_entries') + ' ' + p.entries.length + ' | Aroid Origins', description: p.key + ': ' + rolesLine(p).replace(/<[^>]+>/g, '') + (years.length ? ' (' + Math.min.apply(null, years) + '–' + Math.max.apply(null, years) + ')' : ''), path: 'people/' + encodeURIComponent(p.slug) });
      }, 0);
    }
  }
  /* ---------- locality pages: /locality/ and /locality/<country>/ ---------- */
  function countrySlug(c) { return String(c).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, ''); }
  var _placeSlug = null;
  function renderLocalityPageInner() {
    var body = document.getElementById('locality-body');
    var title = document.getElementById('locality-title');
    var crumbName = document.getElementById('locality-crumb-name');
    var crumbSep = document.getElementById('locality-crumb-sep');
    if (!body) return;
    var all = collectAll();
    var groups = groupBy(all.filter(function (d) { return d.type === 'species'; }), function (d) { return d.country; });
    var slug = _placeSlug ? decodeURIComponent(_placeSlug) : '';
    if (!slug) {
      if (title) title.textContent = T('locality_title');
      if (crumbName) crumbName.textContent = '';
      if (crumbSep) crumbSep.classList.add('d-none');
      var html = '<p class="people__intro">' + esc(T('locality_intro')) + '</p><div class="people__grid"><div class="people__group"><ul class="people__list">';
      groups.forEach(function (g) {
        var years = g.items.map(function (d) { return d.pubYear; }).filter(Boolean);
        var y0 = years.length ? Math.min.apply(null, years) : 0, y1 = years.length ? Math.max.apply(null, years) : 0;
        var meta = g.items.length + ' ' + T('locality_species') + (years.length ? ' · ' + (y0 === y1 ? y0 : y0 + '–' + y1) : '');
        html += '<li><a href="' + esc(base + 'locality/' + encodeURIComponent(countrySlug(g.key))) + '" data-nav="locality" data-place="' + esc(countrySlug(g.key)) + '">' + esc(g.key) + '</a><span class="mono">' + esc(meta) + '</span></li>';
      });
      body.innerHTML = html + '</ul></div></div>';
      return;
    }
    var g = groups.filter(function (x) { return countrySlug(x.key) === slug; })[0];
    if (!g) { if (title) title.textContent = slug; body.innerHTML = '<p class="empty-state">' + esc(T('locality_none')) + '</p>'; return; }
    if (title) title.textContent = g.key;
    if (crumbName) crumbName.textContent = g.key;
    if (crumbSep) crumbSep.classList.remove('d-none');
    var years = g.items.map(function (d) { return d.pubYear; }).filter(Boolean);
    var authors = {};
    g.items.forEach(function (d) { splitPeople(d.author).forEach(function (p) { authors[p] = (authors[p] || 0) + 1; }); });
    var topAuthors = Object.keys(authors).sort(function (a, b) { return authors[b] - authors[a]; }).slice(0, 4);
    var facts = '<dl class="ledger people__facts">';
    facts += '<div><dt>' + esc(T('locality_species')) + '</dt><dd>' + g.items.length + '</dd></div>';
    if (years.length) facts += '<div><dt>' + esc(T('ledger_years')) + '</dt><dd>' + Math.min.apply(null, years) + (years.length > 1 ? '–' + Math.max.apply(null, years) : '') + '</dd></div>';
    if (topAuthors.length) facts += '<div><dt>' + esc(T('role_author')) + '</dt><dd class="people__facts-small">' + topAuthors.map(function (p) { return linkPeople(p); }).join(', ') + '</dd></div>';
    facts += '</dl>';
    body.innerHTML = facts + '<h2 class="section-title"><span>' + esc(T('locality_species')) + '</span></h2><div id="locality-ledger"></div>';
    var sorted = g.items.slice().sort(function (a, b) { return (a.pubYear || 9999) - (b.pubYear || 9999) || a.displayName.localeCompare(b.displayName); });
    var thumbs = {};
    sorted.forEach(function (d) { var u = (typeof _thumbMap !== 'undefined') ? _thumbMap[d.displayName] : null; if (u) thumbs[d.displayName] = u; });
    window.renderEntriesLedger(document.getElementById('locality-ledger'), toLedgerItems(sorted), thumbs);
    if (typeof updateMeta === 'function') {
      setTimeout(function () {
        updateMeta({ title: g.key + ' — ' + T('locality_species') + ' ' + g.items.length + ' | Aroid Origins', description: g.key + ' をタイプ産地とするアロイド原種 ' + g.items.length + '種: ' + sorted.slice(0, 6).map(function (d) { return d.displayName; }).join('、'), path: 'locality/' + encodeURIComponent(countrySlug(g.key)) });
      }, 0);
    }
  }
  window.renderLocalityPage = function (slug) {
    _placeSlug = slug || '';
    var body = document.getElementById('locality-body');
    if (body && !window._dataFullyLoaded) body.innerHTML = '<div class="loading-text p-xl">…</div>';
    waitForData(function () { if (document.getElementById('page-locality').classList.contains('active')) renderLocalityPageInner(); });
  };

  window.renderPeoplePage = function (slug) {
    _peopleSlug = slug || '';
    var body = document.getElementById('people-body');
    if (body && !window._dataFullyLoaded) body.innerHTML = '<div class="loading-text p-xl">…</div>';
    waitForData(function () { if (document.getElementById('page-people').classList.contains('active')) renderPeoplePageInner(); });
  };

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

  /* ============================================================
     CONTRIBUTION FORM: split name builder (BOARD §3 notation rules)
     Composes the registered name from epithet / qualifier / cultivar
     name / locality or label, and writes it into #cultivar-name-input
     so the existing duplicate check, AI autofill and submit code keep working.
     ============================================================ */
  (function nameBuilder() {
    var $ = function (id) { return document.getElementById(id); };
    var result = $('cultivar-name-input');
    if (!result || !$('name-builder')) return;
    var epithet = $('nb-epithet'), extra = $('nb-extra'), cultivarName = $('nb-cultivar'), seedLabel = $('nb-seedlabel');
    var epithetLabel = $('nb-epithet-label'), extraLabel = $('nb-extra-label'), cultivarLabel = $('nb-cultivar-label');
    var seeded = false; // true right after edit-mode prefill: keep the stored name until the user edits

    function currentType() {
      var r = document.querySelector('#page-contribute input[name="cultivar-type"]:checked');
      return r ? r.value : 'species';
    }
    function qualifier() {
      var a = document.querySelector('#species-subcategory .chip.active');
      var q = a ? a.getAttribute('data-subcategory') : 'species';
      return q === 'species' ? '' : q;
    }
    function quoteD(v) { v = clean(v).replace(/^["“”]+|["“”]+$/g, ''); return v ? '"' + v + '"' : ''; }
    function quoteS(v) { v = clean(v).replace(/^['‘’]+|['‘’]+$/g, ''); return v ? "'" + v + "'" : ''; }
    function stripGenus(v) {
      var g = ($('contribute-genus-select') || {}).value || '';
      v = clean(v);
      if (g && v.toLowerCase().indexOf(g.toLowerCase() + ' ') === 0) v = v.slice(g.length + 1);
      return v;
    }
    function compose() {
      var type = currentType();
      var name = '';
      if (type === 'species') {
        var q = qualifier(), ep = clean(epithet.value).toLowerCase().replace(/\s+/g, ''), ex = clean(extra.value);
        if (q === 'sp') name = joinParts2(['sp.', quoteD(ex)]);
        else if (q === 'aff' || q === 'cf') name = ep ? joinParts2([q + '. ' + ep, quoteD(ex)]) : '';
        else if (q === 'ssp' || q === 'var') name = ep && ex ? ep + ' ' + q + '. ' + clean(ex).toLowerCase() : (ep || '');
        else name = joinParts2([ep, quoteD(ex)]);
      } else if (type === 'clone') {
        var cn = quoteS(cultivarName.value), ep2 = clean(epithet.value).toLowerCase().replace(/\s+/g, '');
        name = cn ? joinParts2([ep2, cn]) : '';
      } else if (type === 'hybrid') {
        name = quoteS(cultivarName.value);
      } else if (type === 'seedling') {
        var box = $('seedling-formula-inputs');
        var inputs = box ? box.querySelectorAll('input') : [];
        var unknown = $('seedling-formula-unknown');
        var a = inputs[0] ? stripGenus(inputs[0].value) : '', b = inputs[1] ? stripGenus(inputs[1].value) : '';
        var lab = quoteD(seedLabel.value);
        if (unknown && unknown.checked) name = lab;
        else if (a && b) name = joinParts2([a + ' × ' + b, lab]);
        else name = '';
      }
      result.value = name;
      result.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function joinParts2(parts) { return parts.filter(Boolean).join(' '); }

    function refreshVisibility() {
      var type = currentType(), q = qualifier();
      document.querySelectorAll('#name-builder [data-for]').forEach(function (el) {
        var ok = el.getAttribute('data-for').split(' ').indexOf(type) !== -1;
        if (el.id === 'nb-epithet-row' && type === 'species' && q === 'sp') ok = false;
        el.hidden = !ok;
      });
      if (epithetLabel) epithetLabel.textContent = type === 'clone' ? T('nb_epithet_optional') : T('nb_epithet');
      if (extraLabel) extraLabel.textContent = q === 'sp' ? T('nb_extra_sp') : (q === 'ssp' || q === 'var') ? T('nb_extra_sub') : T('nb_extra_locality');
      if (extra) extra.placeholder = (q === 'ssp' || q === 'var') ? '例: variegatum' : '例: Peru';
      if (cultivarLabel) cultivarLabel.textContent = type === 'hybrid' ? T('nb_hybrid_name') : T('nb_clone_name');
      var dis = !!result.disabled;
      [epithet, extra, cultivarName, seedLabel].forEach(function (i) { if (i) i.disabled = dis; });
      document.querySelectorAll('#species-subcategory .chip').forEach(function (c) { c.disabled = dis; });
    }
    function onUserInput() { seeded = false; compose(); }
    [epithet, extra, cultivarName, seedLabel].forEach(function (i) { if (i) i.addEventListener('input', onUserInput); });
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#species-subcategory .chip')) setTimeout(function () { refreshVisibility(); onUserInput(); }, 0);
    });
    document.querySelectorAll('#page-contribute input[name="cultivar-type"]').forEach(function (r) {
      r.addEventListener('change', function () { setTimeout(function () { refreshVisibility(); if (!seeded) compose(); }, 0); });
    });
    var genusSel = $('contribute-genus-select');
    if (genusSel) genusSel.addEventListener('change', function () { if (!seeded) compose(); });
    var seedBox = $('seedling-formula-inputs');
    if (seedBox) seedBox.querySelectorAll('input').forEach(function (i) { i.addEventListener('input', onUserInput); });
    var seedUnknown = $('seedling-formula-unknown');
    if (seedUnknown) seedUnknown.addEventListener('change', onUserInput);

    // Edit mode: fill the parts from the stored short name (without recomposing)
    window.nameBuilderParse = function (shortName, type) {
      seeded = true;
      var s = clean(shortName);
      [epithet, extra, cultivarName, seedLabel].forEach(function (i) { if (i) i.value = ''; });
      var m;
      if (type === 'species') {
        if ((m = s.match(/^sp\.\s*"?([^"]*)"?$/))) { extra.value = m[1].trim(); }
        else if ((m = s.match(/^(aff|cf)\.\s*(\S+)\s*(?:"([^"]*)")?$/))) { epithet.value = m[2]; extra.value = m[3] || ''; }
        else if ((m = s.match(/^(\S+)\s+(ssp|var)\.\s+(\S+)$/))) { epithet.value = m[1]; extra.value = m[3]; }
        else if ((m = s.match(/^(\S+)\s*(?:"([^"]*)")?$/))) { epithet.value = m[1]; extra.value = m[2] || ''; }
      } else if (type === 'clone') {
        if ((m = s.match(/^(?:(\S+)\s+)?'(.+)'$/))) { epithet.value = m[1] || ''; cultivarName.value = m[2]; }
        else cultivarName.value = s.replace(/^'+|'+$/g, '');
      } else if (type === 'hybrid') {
        cultivarName.value = s.replace(/^'+|'+$/g, '');
      } else if (type === 'seedling') {
        if ((m = s.match(/"([^"]*)"\s*$/))) seedLabel.value = m[1];
      }
      setTimeout(refreshVisibility, 0);
    };
    window.nameBuilderReset = function () {
      seeded = false;
      [epithet, extra, cultivarName, seedLabel].forEach(function (i) { if (i) i.value = ''; });
      setTimeout(refreshVisibility, 0);
    };
    window.nameBuilderPrimaryField = function (type) {
      if (type === 'species') return qualifier() === 'sp' ? extra : epithet;
      if (type === 'seedling') { var box = $('seedling-formula-inputs'); return box ? box.querySelector('input') : result; }
      return cultivarName;
    };
    refreshVisibility();
  })();

  /* ============================================================
     GLOSSARY: link the first mention of each term inside origin text
     ============================================================ */
  var GLOSSARY_TERMS = [
    ['ソマクローナル変異', 'g-tc'], ['組織培養', 'g-tc'], ['タイプ標本', 'g-type-locality'], ['タイプ産地', 'g-type-locality'],
    ['産地フォーム', 'g-ecotype'], ['エコタイプ', 'g-ecotype'], ['原記載', 'g-kisai'], ['記載者', 'g-kisaisha'], ['採集者', 'g-saishusha'],
    ['シノニム', 'g-synonym'], ['異名', 'g-synonym'], ['旧綴り', 'g-synonym'], ['交配式', 'g-formula'], ['選抜個体', 'g-original'],
    ['オリジナル個体', 'g-original'], ['流通名', 'g-trade-name'], ['斑入り', 'g-variegata'], ['ハイブリッド', 'g-hybrid'], ['交配種', 'g-hybrid'],
    ['クローン', 'g-clone'], ['実生', 'g-seedling'], ['学名', 'g-gakumei'], ['信頼度', 'g-trust'],
    ['ssp.', 'g-ssp-var'], ['var.', 'g-ssp-var'], ['aff.', 'g-aff'], ['cf.', 'g-cf'], ['sp.', 'g-sp'],
    ['IPNI', 'g-databases'], ['POWO', 'g-databases'], ['GBIF', 'g-databases'], ['F1', 'g-f1'], ['F2', 'g-f1'], ['self', 'g-f1'], ['TC', 'g-tc']
  ];
  function termRegex(term) {
    var e = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return /^[A-Za-z0-9.]+$/.test(term) ? new RegExp('(^|[^A-Za-z0-9])(' + e + ')(?![A-Za-z0-9])') : new RegExp('()(' + e + ')');
  }
  window.linkGlossaryTerms = function (root, max) {
    if (!root) return;
    max = max || 6;
    var done = {};
    var count = 0;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        while (p && p !== root) { if (p.tagName === 'A' || p.tagName === 'BUTTON' || p.tagName === 'INPUT' || p.tagName === 'TEXTAREA') return NodeFilter.FILTER_REJECT; p = p.parentNode; }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      if (count >= max) return;
      var text = node.nodeValue, i, frag = null, rest = text;
      for (i = 0; i < GLOSSARY_TERMS.length && count < max; i++) {
        var term = GLOSSARY_TERMS[i][0], id = GLOSSARY_TERMS[i][1];
        if (done[id]) continue;
        var m = rest.match(termRegex(term));
        if (!m) continue;
        var idx = m.index + m[1].length;
        frag = frag || document.createDocumentFragment();
        frag.appendChild(document.createTextNode(rest.slice(0, idx)));
        var a = document.createElement('a');
        a.className = 'term'; a.href = base + 'glossary/#' + id; a.setAttribute('data-nav', 'glossary'); a.setAttribute('data-anchor', id);
        a.title = T('glossary_title'); a.textContent = m[2];
        frag.appendChild(a);
        rest = rest.slice(idx + m[2].length);
        done[id] = true; count++;
        i = -1; // restart scan on the remaining text
      }
      if (frag) { frag.appendChild(document.createTextNode(rest)); node.parentNode.replaceChild(frag, node); }
    });
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a.term[data-anchor]') : null;
    if (!a) return;
    var id = a.getAttribute('data-anchor');
    setTimeout(function () { var el = document.getElementById(id); if (el) { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); el.classList.add('glossary__hit'); } }, 350);
  });

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
