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
    var i, best = '', bestAt = Infinity;
    for (i = 0; i < COUNTRIES.length; i++) {
      var c = COUNTRIES[i];
      var m = new RegExp('(^|[^A-Za-z])' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z]|$)', 'i').exec(text);
      if (m && m.index < bestAt) { bestAt = m.index; best = CANON[c] || c; }
    }
    for (i = 0; i < REGION_HINTS.length; i++) {
      var r = REGION_HINTS[i][0].exec(text);
      if (r && r.index < bestAt) { bestAt = r.index; best = REGION_HINTS[i][1]; }
    }
    return best;
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
      id: entry._id || null, createdAt: entry._created_at || '', updatedAt: entry._updatedAt || '',
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
    // a % is shown only for a record that cites something (same rule as the record head)
    d.hasSources = !!o && (o.source_type === 'ipni_powo' || (o.sources || []).some(function (x) { return x && clean(x.url); }) || !!clean(o.source_url));
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
    d.selectedFrom = entry._selectedFrom || null;
    d.formulaStatus = entry._formulaStatus || null;
    // Record gate (shared module): 'ok' | 'unrecorded' | 'researching' | 'none'
    d.state = (window.RecordGate && typeof window.recForGate === 'function' && type !== 'seedling') ? window.RecordGate.state(window.recForGate(fullName, entry, { type: type })) : 'ok';
    d.missing = (d.state === 'unrecorded' && window.RecordGate) ? window.RecordGate.gate(window.recForGate(fullName, entry, { type: type })).missing : [];
    // an individual (numbered or named plant of a species) is marked by its tag only (BOARD 09-07);
    // a Clone selected from another clone keeps its own page in the index
    d.isIndividual = d.tags.indexOf('individual') !== -1;
    d.verifiedAt = entry._verifiedAt || null;
    d.verificationNote = clean(entry._verificationNote);
    d.nameStatus = entry._nameStatus || null;
    d.formLocality = clean(entry._locality);
    d.creator = clean(d.formula && d.formula.creatorName);
    d.href = base + genus.toLowerCase() + '/' + encodeURIComponent(epithet);
    return d;
  }
  // "T. B. Croat" / "O.Ortiz" / "Croat" all index under the surname "Croat";
  // standard abbreviations ("N.E.Br.", "Mast.") and full names ("Tim Anderson") stay as written.
  // a key the people authority marks alias_of folds into that person ("M. A. Pérez-Farrera" -> "Pérez-Farr.")
  function personKey(p) {
    var k = personKeyRaw(p);
    var a = (typeof _authority !== "undefined" && _authority && _authority[k]) || null;
    return a && a.alias_of ? a.alias_of : k;
  }
  function personKeyRaw(p) {
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
    // Seedling notes are personal records: their growers are listed apart from breeders of named plants
    var breederRole = d.type === 'seedling' ? 'grower' : 'breeder';
    push(d.author, 'author'); push(d.collector, 'collector'); push(d.breeder, breederRole); push(d.namer, 'namer'); push(d.creator, breederRole);
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
  function thumbUrl(displayName, w) {
    var map = (typeof _thumbMap !== 'undefined') ? _thumbMap : (window._thumbMap || {});
    var p = map[displayName];
    if (!p || !window._SUPABASE_URL) return '';
    return window.galleryImg ? window.galleryImg(p, w || 800) : window._SUPABASE_URL + '/storage/v1/object/public/gallery-images/' + p;
  }
  function link(d, inner, extraClass) {
    return '<a href="' + esc(d.href) + '" data-nav="cultivar" data-key="' + esc(d.fullName) + '"' + (extraClass ? ' class="' + extraClass + '"' : '') + '>' + inner + '</a>';
  }
  function yearSpan(y) { return y ? '<span class="year">' + y + '</span>' : ''; }
  function joinParts(parts) { return parts.filter(Boolean).join(' · '); }

  /* citation line for list rows and ledger ("T.Moore · 1878 · Colombia") */
  function citeHtml(d) {
    if (d.type === 'species') {
      return joinParts([esc(d.author), yearSpan(d.pubYear), esc(d.country ? countryLabel(d.country) : d.locality)]);
    }
    var who = d.breeder || d.namer || d.creator;
    if (!who && !d.year) return '';
    var label = d.type === 'clone' && !d.breeder && d.namer ? T('cite_namer') : T('cite_breeder');
    return joinParts([who ? (lang() === 'en' ? label + ' ' + esc(who) : label + ' ' + esc(who)) : '', yearSpan(d.year)]);
  }
  /* ---------- one list line for every list (BOARD 10-07 T62) ----------
     line 1: name, and one state at the right end; line 2: [date ·] kind · person · year · country */
  var COUNTRY_JA = { 'Colombia': 'コロンビア', 'Ecuador': 'エクアドル', 'Panama': 'パナマ', 'Peru': 'ペルー', 'Mexico': 'メキシコ',
    'Costa Rica': 'コスタリカ', 'Brazil': 'ブラジル', 'Bolivia': 'ボリビア', 'Venezuela': 'ベネズエラ', 'Guatemala': 'グアテマラ',
    'Honduras': 'ホンジュラス', 'Nicaragua': 'ニカラグア', 'Belize': 'ベリーズ', 'El Salvador': 'エルサルバドル', 'Guyana': 'ガイアナ',
    'French Guiana': '仏領ギアナ', 'Suriname': 'スリナム', 'Argentina': 'アルゼンチン', 'Paraguay': 'パラグアイ', 'Cuba': 'キューバ',
    'Jamaica': 'ジャマイカ', 'Trinidad and Tobago': 'トリニダード・トバゴ', 'Dominican Republic': 'ドミニカ共和国', 'Puerto Rico': 'プエルトリコ',
    'Indonesia': 'インドネシア', 'Malaysia': 'マレーシア', 'Thailand': 'タイ', 'Vietnam': 'ベトナム', 'Philippines': 'フィリピン',
    'Papua New Guinea': 'パプアニューギニア', 'Australia': 'オーストラリア', 'Japan': '日本', 'Taiwan': '台湾', 'China': '中国' };
  function countryLabel(c) { c = clean(c); if (!c) return ''; return lang() === 'en' ? c : (COUNTRY_JA[c] || c); }
  window.countryLabel = countryLabel;
  function isUndescribed(d) {
    var q = String(d.qualifier || '').toLowerCase().replace(/\./g, '');
    return q === 'sp' || q === 'aff' || q === 'cf' || (!!d.speciesStatus && d.speciesStatus !== 'described');
  }
  function kindWord(d) {
    if (d.isIndividual) return T('kind_individual');
    if (d.type === 'species') return isUndescribed(d) ? T('kind_undescribed') : T('kind_species');
    if (d.type === 'seedling') return T('kind_seedling');
    return d.type === 'hybrid' ? 'Hybrid' : d.type === 'clone' ? 'Clone' : String(d.type || '');
  }
  function entrySubHtml(d, opts) {
    opts = opts || {};
    var parts = [];
    if (opts.date) parts.push('<span class="num">' + esc(opts.date) + '</span>');
    parts.push(esc(kindWord(d)));
    var species = d.type === 'species' && !d.isIndividual;
    if (!opts.noPerson) {
      if (species) { if (d.author) parts.push(esc(d.author)); }
      else {
        var who = d.breeder || d.creator;
        if (who) parts.push(esc(T('cite_breeder')) + ' ' + esc(who));
        else if (d.namer) parts.push(esc(T('cite_namer')) + ' ' + esc(d.namer));
      }
    }
    if (species) { if (d.pubYear) parts.push(yearSpan(d.pubYear)); }
    else if (d.namingYear) parts.push('<span class="num">' + d.namingYear + '</span>');
    if (!opts.noCountry && species && d.country) parts.push(esc(countryLabel(d.country)));
    return parts.join(' · ');
  }
  function entryStateHtml(d) {
    if (d.type === 'seedling') return '';
    if (d.state !== 'ok') return '<span class="entry__state entry__state--' + esc(d.state) + '">' + esc(T('state_' + d.state)) + '</span>';
    if (!d.hasSources) return '<span class="entry__state">' + esc(T('record_by_user')) + '</span>';
    if (d.trust > 0) return '<span class="entry__state entry__state--pct">' + (d.verifiedAt ? '<span class="verified-mark" title="' + esc(T('verified_title')) + '">✓</span> ' : '') + '<span class="num">' + d.trust + '%</span></span>';
    return '';
  }
  // pieces for list rows drawn elsewhere (the genus list in app-core.js)
  window.entryKind = function (fullName, entry, type) {
    try { return kindWord(describe(fullName, entry || {}, type)); } catch (e) { return ''; }
  };
  window.entryParts = function (fullName, entry, type, opts) {
    try { var d = describe(fullName, entry, type); return { sub: entrySubHtml(d, opts), state: entryStateHtml(d) }; } catch (e) { return null; }
  };
  // one entry as an <li>: thumbnail (48px, dashed empty frame without a photo), two lines, state
  window.entryLine = function (d, opts) {
    opts = opts || {};
    var thumb = opts.thumb ? '<img src="' + esc(opts.thumb) + '" alt="" width="48" height="48" loading="lazy" decoding="async">' : '';
    return '<li class="entry"><a class="entry__link" href="' + esc(d.href) + '" data-nav="cultivar" data-key="' + esc(d.fullName) + '">'
      + '<span class="entry__thumb' + (thumb ? '' : ' entry__thumb--empty') + '" aria-hidden="true">' + thumb + '</span>'
      + '<span class="entry__main"><span class="entry__name">' + sciNameHtml(d.displayName) + '</span>'
      + '<span class="entry__sub">' + entrySubHtml(d, opts) + '</span></span>'
      + entryStateHtml(d) + '</a></li>';
  };

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
    all.forEach(function (d) { if (d.type !== 'seedling' && d.state === 'ok') counts[d.genus.toLowerCase()] = (counts[d.genus.toLowerCase()] || 0) + 1; });
    var html = '';
    (window._generaData || []).forEach(function (g) {
      html += '<a href="' + esc(base + g.slug + '/') + '" data-nav="genus" data-genus="' + esc(g.slug) + '">' + esc(g.name) + ' · ' + (counts[g.slug] || 0) + ' ' + esc(T('entries_unit')) + '</a>';
    });
    // The archive grows by demand: one mono link to ask for another genus
    html += '<a href="#" class="genus-request-link" data-i18n="genus_request_link">' + esc(T('genus_request_link')) + '</a>';
    el.innerHTML = html;
    var allLink = document.getElementById('ledger-all-link');
    if (allLink && window._generaData && window._generaData[0]) {
      allLink.setAttribute('data-genus', window._generaData[0].slug);
      allLink.setAttribute('href', base + window._generaData[0].slug + '/');
    }
  }

  function renderLedgerStats(all) {
    var entries = all.filter(function (d) { return d.type !== 'seedling' && !d.isIndividual && d.state === 'ok'; });
    var years = entries.map(function (d) { return d.type === 'species' ? d.pubYear : null; }).filter(Boolean);
    var countries = {};
    entries.forEach(function (d) { if (d.country) countries[d.country] = 1; });
    // one line under the search: 収録 40 品種 · 発表年 1829–2020 · 9 か国
    var el = document.getElementById('masthead-stats');
    if (!el) return;
    var n = Object.keys(countries).length;
    el.innerHTML = joinParts([
      esc(T('stats_recorded')) + ' <span class="num">' + entries.length + '</span> ' + esc(T('entries_unit')),
      years.length ? esc(T('ledger_years')) + ' <span class="num">' + Math.min.apply(null, years) + '–' + Math.max.apply(null, years) + '</span>' : '',
      n ? '<span class="num">' + n + '</span> ' + esc(T('countries_unit')) : ''
    ]);
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
    // Candidates in order of preference; within each tier, entries with a photo come first
    // (the front page is a plate, so a story without an image is the last resort).
    var hasThumb = function (d) { return !!thumbUrl(d.displayName); };
    var tiers = [
      all.filter(function (d) { return d.type === 'species' && d.trust >= 70 && d.text.length >= 60; }),
      all.filter(function (d) { return d.text.length >= 60; })
    ];
    var pool = [];
    for (var ti = 0; ti < tiers.length && !pool.length; ti++) pool = tiers[ti].filter(hasThumb);
    for (ti = 0; ti < tiers.length && !pool.length; ti++) pool = tiers[ti];
    if (!pool.length) { body.innerHTML = ''; return; }
    pool.sort(function (a, b) { return a.displayName.localeCompare(b.displayName); });
    var d = pool[Math.floor(Date.now() / 864e5) % pool.length];
    var thumb = thumbUrl(d.displayName);
    var text = lang() === 'en' ? d.textEn : d.text;
    var html = '';
    if (thumb) html += '<figure class="story__figure">' + link(d, '<img src="' + esc(thumb) + '" alt="' + esc(d.displayName) + '" loading="lazy" decoding="async">') + '</figure>';
    html += '<h2 class="story__title">' + link(d, sciNameHtml(d.displayName)) + '</h2>';
    var cite = citeHtml(d);
    if (cite) html += '<p class="story__cite mono">' + cite + '</p>';
    var ex = excerpt(text, lang() === 'en' ? 320 : 170);
    // no drop cap: the text opens with a scientific name, and a raised first letter splits it ('A nthurium')
    html += '<p class="story__body">' + esc(ex) + '</p>';
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
  function indexGroupHtml(title, groups, limit, titleHref, navPage, labelOf) {
    if (!groups.length) return '';
    var head = titleHref ? '<a href="' + esc(titleHref) + '" data-nav="' + esc(navPage || 'people') + '">' + esc(title) + ' →</a>' : esc(title);
    var html = '<div class="index__group"><h3>' + head + '</h3><ul class="index__list">';
    groups.slice(0, limit || 999).forEach(function (g) {
      html += '<li class="index__item"><button type="button" class="index__toggle" aria-expanded="false"><span class="index__name">' + esc(labelOf ? labelOf(g.key) : g.key) + '</span><span class="index__count">' + g.items.length + '</span></button><ul class="index__sub">';
      g.items.slice().sort(function (a, b) { return (a.year || 9999) - (b.year || 9999) || a.displayName.localeCompare(b.displayName); }).forEach(function (d) {
        html += '<li>' + link(d, sciNameHtml(d.displayName)) + (d.year ? '<span class="mono">' + d.year + '</span>' : '') + '</li>';
      });
      html += '</ul></li>';
    });
    return html + '</ul></div>';
  }
  function renderIndex(all) {
    var el = document.getElementById('archive-index-body');
    if (!el) return;
    var counted = all.filter(function (d) { return d.type !== 'seedling' && d.state === 'ok'; }); // same rule as 収録
    var byCountry = groupBy(counted.filter(function (d) { return d.type === 'species'; }), function (d) { return d.country; });
    var byPerson = groupBy(counted, peopleOf);
    var fullName = function (key) { var a = authorityOf(key); return a && a.name ? a.name : key; };
    // the kind group is gone (the genus list filters by kind); five people, then the people index
    el.innerHTML = indexGroupHtml(T('index_localities'), byCountry, 999, base + 'locality/', 'locality', countryLabel) + indexGroupHtml(T('index_people'), byPerson, 5, base + 'people/', 'people', fullName);
    // people are shown by full name: draw again once the authority table is in
    if (!_authority) loadAuthority(function () { renderIndex(all); });
  }

  function renderTimeline(all) {
    var el = document.getElementById('archive-timeline-body');
    if (!el) return;
    // folded on phones; open on wide screens and when someone came for it (#archive-timeline)
    var fold = document.getElementById('timeline-fold');
    if (fold && !fold._init) { fold._init = true; if (window.innerWidth >= 900 || /timeline/.test(location.hash)) fold.open = true; }
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
        html += link(d, '<i>' + esc(d.epithet) + '</i><span class="num">' + d.pubYear + '</span>');
      });
      html += '</div></li>';
    });
    html += '</ol>';
    el.innerHTML = html;
  }

  var _front = null;
  // Thumbnails load separately from the records; when they arrive, pick the story again
  window.renderStoryOfDay = function () { if (_front) renderStory(_front); };
  function renderFront() {
    if (!document.getElementById('story-body')) return;
    var all = collectAll();
    _front = all;
    var pub = all.filter(function (d) { return !d.isIndividual; }); // individuals are not separate entries
    renderMastheadGenera(pub);
    renderLedgerStats(pub);
    renderStory(all);
    renderIndex(pub);
    renderTimeline(pub);
  }

  /* ============================================================
     ENTRIES LEDGER (replaces "recently updated" cards)
     ============================================================ */
  var _ledgerArgs = null;
  window.renderEntriesLedger = function (grid, items, thumbMap, opts) {
    _ledgerArgs = [grid, items, thumbMap, opts];
    // drawn from bare rows first; drawn again once the full entries (tags, verification) are in
    if (!window._dataFullyLoaded) waitForData(function () { if (_ledgerArgs && _ledgerArgs[0] === grid) window.renderEntriesLedger.apply(null, _ledgerArgs); });
    thumbMap = thumbMap || {};
    opts = opts || {};
    var baseUrl = window._SUPABASE_URL || '';
    // The front page ledger is a record of the archive growing: show the date
    var withDate = !!opts.showDate;
    if (withDate) {
      var weekAgo = Date.now() - 7 * 864e5;
      var week = items.filter(function (it) { return new Date(it.created_at || it.updated_at || 0).getTime() >= weekAgo; }).length;
      var countEl = document.getElementById('new-entries-count');
      if (countEl) countEl.textContent = week > 0 ? T('new_entries_week').replace('{n}', week) : '';
    }
    var html = '<ol class="entries">';
    items.forEach(function (item) {
      var origins = (item.origins || []);
      var formula = null;
      origins = origins.filter(function (o) { if (o && o._type === 'formula') { formula = o.formula; return false; } return true; });
      // the full entry (tags, verification, parents) when the archive is loaded, else the bare row
      var cached = (typeof cultivarData !== 'undefined' && cultivarData[item.cultivar_name]) || null;
      var d = describe(item.cultivar_name, cached || { origins: origins, formula: formula, _type: item.type, _id: item.id }, item.type);
      var stamp = withDate ? (item.created_at || item.updated_at || '') : '';
      var thumb = thumbMap[d.displayName] && baseUrl ? (window.galleryImg ? window.galleryImg(thumbMap[d.displayName], 120) : baseUrl + '/storage/v1/object/public/gallery-images/' + thumbMap[d.displayName]) : '';
      html += window.entryLine(d, { thumb: thumb, date: stamp ? fmtDate(stamp) : '', noPerson: opts.noPerson, noCountry: opts.noCountry });
    });
    html += '</ol>';
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
    return d ? link(d, sciNameHtml(name)) : sciNameHtml(name);
  }
  function renderSpecimen(d, all) {
    var el = document.getElementById('specimen-label');
    if (!el) return;
    var cells = '';
    // sp. / aff. / cf. names take the undescribed form too (BOARD 10-07)
    var undescribed = d.type === 'species' && !d.isIndividual && isUndescribed(d);
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
      // type locality and distribution with the same value take one cell
      if (d.locality && d.habitat && d.locality === d.habitat) cells += cell('spec_locality_habitat', esc(countryLabel(d.locality)));
      else {
        cells += cell('spec_locality', esc(countryLabel(d.locality)));
        if (!d.locality && d.formLocality) cells += cell('spec_form_locality', esc(d.formLocality));
        cells += cell('spec_habitat', esc(countryLabel(d.habitat)));
      }
    } else {
      if (d.type === 'clone' && !d.breeder && d.namer) cells += cell('spec_namer', linkPeople(d.namer));
      else cells += cell('spec_breeder', linkPeople(d.breeder || d.namer || d.creator));
      cells += cell(d.type === 'seedling' ? 'spec_sowing' : 'spec_year', d.type === 'seedling' ? esc(/^\d{4}-\d{2}-\d{2}/.test(d.sowing) ? fmtDate(d.sowing) : d.sowing) : ((d.namingYear || d.year) ? '<span class="num">' + (d.namingYear || d.year) + '</span>' : ''));
      if (d.parentA || d.parentB) cells += cell('spec_parents', parentHtml(all, d.parentA || T('lineage_unknown')) + ' × ' + parentHtml(all, d.parentB || T('lineage_unknown')));
    }
    if (d.selectedFrom) {
      // an individual names its species; a Clone selected from another plant names that plant
      var parentSp = all.filter(function (x) { return x.id && x.id === d.selectedFrom; })[0];
      if (parentSp) cells = cell(d.isIndividual ? 'spec_selected_from' : 'spec_selected_from_clone', link(parentSp, sciNameHtml(parentSp.displayName))) + cells;
    }
    // an individual: who brought it in and where it came from
    if (d.isIndividual) cells += cell('spec_introduced_by', linkPeople(d.introducedBy)) + cell('spec_region', esc(d.originRegion || d.formLocality || d.locality || d.habitat));
    // on the label: at most three Latin-script names; katakana stays for search and JSON-LD
    var labelAliases = (d.aliases || []).filter(function (a, i, arr) { return /[A-Za-z]/.test(a) && !/[゠-ヿ]/.test(a) && arr.indexOf(a) === i; }).slice(0, 3);
    if (labelAliases.length) cells += cell('spec_aliases', esc(labelAliases.join(' / ')));
    // the last line of every label: 検証 (BOARD §3.4)
    if (d.type !== 'seedling') {
      var ver;
      // the date once: the note loses any date of its own
      var vnote = d.verificationNote && d.verificationNote.indexOf('[要再確認]') !== 0 ? d.verificationNote.replace(/[（(]\s*\d{4}-\d{2}-\d{2}\s*点検\s*[)）]/g, '').trim() : '';
      if (d.verifiedAt) ver = '<span class="verified-mark">✓</span> ' + esc(T('verified_label')) + ' <span class="num">' + esc(fmtDate(d.verifiedAt)) + '</span>' + (vnote ? ' · ' + esc(vnote) : '');
      else {
        var vv = (d.origin && d.origin.votes) || {}, ag = parseInt(vv.agree, 10) || 0, dg = parseInt(vv.disagree, 10) || 0;
        ver = (ag >= 3 && ag > dg) ? esc(T('verified_community').replace('{a}', ag).replace('{d}', dg)) : esc(T('verified_none'));
      }
      cells += '<div class="specimen__cell specimen__cell--wide specimen__cell--verify"><span class="specimen__k">' + esc(T('spec_verification')) + '</span><span class="specimen__v">' + ver + '</span></div>';
    }
    // a dispute is said once, in the note under the label
    var note = d.nameStatus === 'disputed' ? T('name_status_disputed') : d.formulaStatus === 'disputed' ? T('formula_disputed') : d.nameStatus === 'trade' ? T('name_status_trade') : d.nameStatus === 'informal' ? T('name_status_informal') : '';
    el.innerHTML = (cells ? '<div class="specimen">' + cells + '</div>' : '') + (note ? '<p class="specimen__note">' + esc(note) + '</p>' : '');
  }
  /* share text: {name} — {describer or breeder} {year}、{type locality or parentage}｜Aroid Origins {URL} */
  window.shareTextFor = function (d) {
    var who = d.type === 'species' ? d.author : (d.breeder || d.namer || d.creator);
    var where = d.type === 'species' ? (d.locality || d.habitat) : ((d.parentA || d.parentB) ? (clean(d.parentA) || T('lineage_unknown')) + ' × ' + (clean(d.parentB) || T('lineage_unknown')) : '');
    var head = [who, d.year].filter(Boolean).join(' ');
    var mid = [head, where].filter(Boolean).join('、');
    // canonical page URL: the static stubs carry the OGP tags, so no proxy is needed in the text
    var url = 'https://plantsstory.com/' + d.genus.toLowerCase() + '/' + encodeURIComponent(d.epithet);
    return d.displayName + (mid ? ' — ' + mid : '') + '｜Aroid Origins ' + url;
  };
  /* one-time band after a registration: 収録しました · この台紙を共有 */
  function renderShareBand(d, entry) {
    var el = document.getElementById('share-band');
    if (!el) return;
    var flag = null;
    try { flag = sessionStorage.getItem('just_recorded'); } catch (e) {}
    if (!flag || flag !== d.fullName) { el.classList.add('d-none'); el.innerHTML = ''; return; }
    try { sessionStorage.removeItem('just_recorded'); } catch (e) {}
    var text = window.shareTextFor(d);
    el.innerHTML = '<p class="share-band__title mono">' + esc(T('share_band_title')) + '</p>'
      + '<p class="share-band__text">' + esc(text) + '</p>'
      + '<p class="share-band__actions mono"><button type="button" class="share-band__btn" id="share-band-copy">' + esc(T('share_band_copy')) + '</button>'
      + '<a class="share-band__btn" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '" id="share-band-x">' + esc(T('share_band_x')) + '</a>'
      + '<button type="button" class="share-band__close" id="share-band-close" aria-label="close">×</button></p>';
    el.classList.remove('d-none');
    var track = function (ch) { if (typeof gtag === 'function') gtag('event', 'share_click', { cultivar: d.displayName, channel: ch, source: 'submit' }); };
    document.getElementById('share-band-copy').addEventListener('click', function () {
      navigator.clipboard.writeText(text).then(function () { showToast(T('share_band_copied')); track('copy'); });
    });
    document.getElementById('share-band-x').addEventListener('click', function () { track('x'); });
    document.getElementById('share-band-close').addEventListener('click', function () { el.classList.add('d-none'); });
  }
  /* 取扱店 — PR: paid listings, per genus (never tied to one plant), at most three, rotated daily */
  var _shopsByGenus = {};
  function renderShops(d) {
    var el = document.getElementById('shops-section');
    if (!el) return;
    var draw = function (list) {
      if (!list || !list.length) { el.classList.add('d-none'); el.innerHTML = ''; return; }
      var day = Math.floor(Date.now() / 864e5), n = list.length, shown = [];
      for (var i = 0; i < Math.min(3, n); i++) shown.push(list[(day + i) % n]);
      el.innerHTML = '<h2 class="section-title"><span>' + esc(T('shops_title')) + '</span></h2><p class="shops__note mono">' + esc(T('shops_note')) + '</p><ul class="shops__list">'
        + shown.map(function (s) { return '<li><a href="' + esc(s.url) + '" target="_blank" rel="sponsored noopener" data-shop-id="' + s.id + '"><span class="shops__name">' + esc(s.name) + '</span>' + (s.blurb ? '<span class="shops__blurb">' + esc(s.blurb) + '</span>' : '') + '</a></li>'; }).join('') + '</ul>';
      el.classList.remove('d-none');
    };
    if (_shopsByGenus[d.genus]) { draw(_shopsByGenus[d.genus]); return; }
    var sb = window._supabaseClient;
    if (!sb) return;
    sb.rpc('list_public_shops', { p_genus: d.genus }).then(function (r) { _shopsByGenus[d.genus] = (r && r.data) || []; draw(_shopsByGenus[d.genus]); }, function () {});
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-shop-id]');
    if (a && typeof gtag === 'function') gtag('event', 'shop_click', { shop: a.getAttribute('data-shop-id'), page: 'cultivar' });
  });

  /* colophon line at the foot of the sheet: 登録 · 更新 · 投稿 */
  function renderColophonLine(d, entry) {
    var el = document.getElementById('detail-colophon');
    if (!el) return;
    var parts = [];
    if (d.createdAt) parts.push(esc(T('colophon_recorded')) + ' ' + esc(fmtDate(d.createdAt)));
    if (entry._updatedAt && fmtDate(entry._updatedAt) !== fmtDate(d.createdAt || '')) parts.push(esc(T('colophon_updated')) + ' ' + esc(fmtDate(entry._updatedAt)));
    if (entry._posterName && entry._userId) parts.push(esc(T('colophon_poster')) + ' <a href="' + esc(base + 'profile/' + entry._userId) + '" data-nav="profile" data-userid="' + esc(entry._userId) + '">' + esc(entry._posterName) + '</a>');
    el.innerHTML = parts.join('<span class="detail-colophon__sep">·</span>');
  }
  /* record gate on the detail page: a sheet naming what is missing, and noindex until it is recorded */
  function renderGateNote(d) {
    var el = document.getElementById('record-gate');
    if (!el) return;
    var st = d.type === 'seedling' ? 'ok' : d.state;
    if (st === 'ok') { el.innerHTML = ''; el.classList.add('d-none'); }
    else {
      var missing = (d.missing || []).map(function (k) { return T('gate_missing_' + k); }).join(' · ');
      el.innerHTML = '<div class="sheet sheet--gate"><p class="sheet__title">' + esc(T(st === 'unrecorded' ? 'gate_title_unrecorded' : st === 'researching' ? 'gate_title_researching' : 'gate_title_none')) + '</p>'
        + (missing ? '<p class="sheet__note mono">' + esc(T('gate_missing_label')) + ' ' + esc(missing) + '</p>' : '<p class="sheet__note mono">' + esc(T('gate_note')) + '</p>')
        + '<a href="#add-origin-section" class="sheet__cta" id="gate-cta">' + esc(T('gate_cta')) + '</a></div>';
      el.classList.remove('d-none');
      var cta = document.getElementById('gate-cta');
      if (cta) cta.addEventListener('click', function (e) { e.preventDefault(); var b = document.getElementById('detail-add-record-btn'); if (b) b.click(); });
    }
    // Unrecorded pages stay out of the index until they carry a real record
    var robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.setAttribute('content', (st === 'ok' && d.type !== 'seedling') ? 'index, follow' : 'noindex, follow');
  }
  /* individuals of a species: numbered or named single plants ('HR1', 'Dark Star') */
  function individualsOf(d, all) {
    var self = normParent(d.epithet);
    return all.filter(function (x) {
      if (!x.isIndividual || x.fullName === d.fullName) return false;
      if (d.id && x.selectedFrom === d.id) return true;
      return !!self && normParent(x.epithet).indexOf(self + " '") === 0;
    }).sort(function (a, b) { return a.displayName.localeCompare(b.displayName, undefined, { numeric: true, sensitivity: 'base' }); });
  }
  function renderIndividuals(d, all) {
    var section = document.getElementById('individuals-section');
    var el = document.getElementById('individuals-container');
    var count = document.getElementById('individuals-count');
    if (!section || !el) return;
    var addLink = document.getElementById('detail-add-individual');
    var isSpeciesPage = d.type === 'species' && !d.isIndividual;
    if (addLink) {
      addLink.classList.toggle('d-none', !isSpeciesPage);
      if (isSpeciesPage) { addLink.setAttribute('data-species-id', d.id || ''); addLink.setAttribute('data-species-name', d.displayName); addLink.setAttribute('data-genus', d.genus); addLink.setAttribute('href', base + 'contribute'); }
    }
    if (!isSpeciesPage) { section.classList.add('d-none'); return; }
    var list = individualsOf(d, all);
    if (!list.length) { section.classList.add('d-none'); if (count) count.textContent = ''; return; }
    var html = '';
    if (list.length) {
      html += '<ul class="individuals__list">';
      list.forEach(function (x) {
        var code = x.epithet.indexOf(d.epithet) === 0 ? x.epithet.slice(d.epithet.length).trim() : x.epithet;
        var meta = joinParts([x.namer || x.breeder, x.year]);
        html += '<li>' + link(x, esc(code)) + (meta ? '<span class="mono">' + esc(meta) + '</span>' : '') + '</li>';
      });
      html += '</ul>';
    }
    html += '<a href="' + esc(base + 'contribute') + '" class="individuals__add" data-nav="contribute" data-contribute-type="individual" data-species-id="' + esc(d.id || '') + '" data-species-name="' + esc(d.displayName) + '" data-genus="' + esc(d.genus) + '">' + esc(T('individuals_add')) + '</a>';
    if (count) count.textContent = list.length ? String(list.length) : '';
    el.innerHTML = html;
    section.classList.remove('d-none');
  }
  // a parent name compared whole: genus (or "A.") and outer quotes dropped, nothing else
  function normParent(p) { return clean(p).replace(/^['"‘’“”]+|['"‘’“”]+$/g, '').toLowerCase().replace(/^(?:(?:anthurium|monstera|philodendron)\s+|a\.\s*)/, '').replace(/^['"‘’“”]+|['"‘’“”]+$/g, '').replace(/\s+/g, ' ').trim(); }
  function relatedGroupHtml(titleKey, list, headHtml) {
    if (!list.length) return '';
    var html = '<div class="related__group"><h3>' + (headHtml || esc(T(titleKey))) + '</h3><ul>';
    list.slice(0, 6).forEach(function (d) {
      var meta = d.type === 'species' && !d.isIndividual ? (d.pubYear || '') : joinParts([kindWord(d), d.namingYear || d.year]);
      html += '<li>' + link(d, sciNameHtml(d.displayName)) + (meta ? '<span class="num">' + esc(meta) + '</span>' : '') + '</li>';
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
    // children come from recorded parents or "selected from" only — a name mentioned in the text is not parentage.
    // Individuals have their own block, so they are left out here.
    var children = self.length >= 4 ? others.filter(function (x) {
      if (x.type === 'species' || x.isIndividual) return false;
      if (d.id && x.selectedFrom === d.id) return true;
      var ps = [normParent(x.parentA), normParent(x.parentB)];
      // the whole name must match: 'Red Crystallinum' is a different plant from crystallinum
      return ps.indexOf(self) !== -1;
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
    // quotes and sp./aff./cf. do not decide the order (aff. besseae sits next to besseae)
    var sortKey = function (x) { return x.displayName.replace(/['"‘’“”]/g, '').replace(/\b(?:sp|aff|cf)\.\s*/g, ''); };
    var group = others.concat([d]).filter(function (x) { return x.genus === d.genus && (x.type === 'seedling') === (d.type === 'seedling'); })
      .sort(function (a, b) { return sortKey(a).localeCompare(sortKey(b), undefined, { sensitivity: 'base' }); });
    var idx = -1;
    group.forEach(function (x, i) { if (x.fullName === d.fullName) idx = i; });
    var prev = idx > 0 ? group[idx - 1] : null;
    var next = idx >= 0 && idx < group.length - 1 ? group[idx + 1] : null;

    var html = lineageHtml(d, all, children)
      + '<div class="related__grid">'
      + relatedGroupHtml('related_siblings', siblings)
      + relatedGroupHtml('related_same_locality', sameCountry, d.country ? '<a href="' + esc(base + 'locality/' + encodeURIComponent(countrySlug(d.country)) + '/') + '" data-nav="locality" data-place="' + esc(countrySlug(d.country)) + '">' + esc(T('related_same_locality_n').replace('{country}', countryLabel(d.country)).replace('{n}', sameCountry.length)) + ' →</a>' : '')
      + relatedGroupHtml('related_same_person', samePerson)
      + '</div>';
    if (prev || next) {
      html += '<nav class="related__nav" aria-label="' + esc(T('related_title')) + '">';
      if (prev) html += link(prev, '<span class="mono">← ' + esc(T('related_prev')) + '</span><span class="related__nav-name">' + sciNameHtml(prev.displayName) + '</span>');
      if (next) html += link(next, '<span class="mono">' + esc(T('related_next')) + ' →</span><span class="related__nav-name">' + sciNameHtml(next.displayName) + '</span>', 'related__nav--next');
      html += '</nav>';
    }
    // exit: back to the genus list (same locality is the heading above)
    html += '<p class="related__exit"><a href="' + esc(base + d.genus.toLowerCase() + '/') + '" data-nav="genus" data-genus="' + esc(d.genus.toLowerCase()) + '">' + esc(T('related_exit_ledger').replace('{genus}', d.genus)) + '</a></p>';
    // the exit line alone is reason enough to show the section
    el.innerHTML = html;
    section.classList.remove('d-none');
  }
  /* lineage tree: parents (with their own parents when known) → this plant → offspring */
  function lineageNode(all, name, extraClass) {
    var d = typeof name === 'object' ? name : findByEpithet(all, name);
    var label = d ? d.displayName : clean(name);
    if (!label) label = T('lineage_unknown');
    var inner = '<span class="lineage__name">' + sciNameHtml(label) + '</span>';
    // A parent that is only a name: invite the reader to record it
    if (!d && label !== T('lineage_unknown')) {
      inner += '<span class="lineage__meta">' + esc(T('lineage_missing')) + '</span>'
        + '<a class="lineage__add" href="' + esc(base + 'contribute') + '" data-nav="contribute" data-prefill="' + esc(label) + '">' + esc(T('lineage_add_parent')) + '</a>';
    }
    if (d) {
      inner += '<span class="lineage__meta">' + esc(kindWord(d)) + '</span>';
    }
    var cls = 'lineage__node' + (extraClass ? ' ' + extraClass : '') + (d ? '' : ' lineage__node--text');
    return d && !extraClass ? link(d, inner, cls) : '<div class="' + cls + '">' + inner + '</div>';
  }
  function lineageHtml(d, all, children) {
    var hasParents = d.type !== 'species' && (d.parentA || d.parentB);
    if (!hasParents && !children.length) return '';
    var html = '<div class="lineage"><h3 class="lineage__title">' + esc(T('lineage_title')) + '</h3>';
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
  var ROLE_KEYS = { author: 'role_author', collector: 'role_collector', breeder: 'role_breeder', namer: 'role_namer', grower: 'role_grower' };
  /* people authority (wireframe/data/people-authority.json): IPNI abbreviation → full name, years, note */
  var _authority = null;
  function loadAuthority(cb) {
    if (_authority) { cb(_authority); return; }
    fetch(base + 'data/people-authority.json?v=' + (window._assetVersion || '1')).then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (j) { _authority = j || {}; cb(_authority); })
      .catch(function () { _authority = {}; cb(_authority); });
  }
  function authorityOf(key) { return (_authority && _authority[key]) || null; }
  function personLabel(p) { var a = authorityOf(p.key); return a && a.name ? a.name : p.key; }
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
    if (!_authority) { loadAuthority(function () { renderPeoplePageInner(); }); return; }
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
      ['author', 'collector', 'breeder', 'namer', 'grower'].forEach(function (r) {
        if (!groups[r]) return;
        html += '<div class="people__group"><h2 class="mono">' + esc(T(ROLE_KEYS[r])) + '</h2><ul class="people__list">';
        groups[r].forEach(function (p) {
          var a = authorityOf(p.key);
          html += '<li><a href="' + esc(base + 'people/' + encodeURIComponent(p.slug)) + '" data-nav="people" data-person="' + esc(p.slug) + '">' + esc(personLabel(p)) + (a && a.name && a.name !== p.key ? ' <span class="people__abbr mono">' + esc(p.key) + '</span>' : '') + '</a><span class="mono">' + rolesLine(p) + '</span></li>';
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
    var auth = authorityOf(p.key);
    if (title) title.textContent = personLabel(p);
    if (crumbName) crumbName.textContent = personLabel(p);
    if (crumbSep) crumbSep.classList.remove('d-none');
    var years = p.entries.map(function (d) { return d.year; }).filter(Boolean);
    var countries = [];
    p.entries.forEach(function (d) { if (d.country && countries.indexOf(d.country) === -1) countries.push(d.country); });
    var facts = '<dl class="ledger people__facts">';
    facts += '<div><dt>' + esc(T('people_entries')) + '</dt><dd>' + p.entries.length + '</dd></div>';
    if (years.length) facts += '<div><dt>' + esc(T('people_years')) + '</dt><dd>' + Math.min.apply(null, years) + (years.length > 1 ? '–' + Math.max.apply(null, years) : '') + '</dd></div>';
    if (countries.length) facts += '<div><dt>' + esc(T('people_localities')) + '</dt><dd class="people__facts-small">' + esc(countries.join(', ')) + '</dd></div>';
    facts += '</dl>';
    var authLine = auth ? [auth.name && auth.name !== p.key ? p.key : '', auth.years, auth.ipni && auth.ipni !== p.key ? 'IPNI: ' + auth.ipni : ''].filter(Boolean).join(' · ') : '';
    var html = '<p class="people__roles mono">' + rolesLine(p) + (authLine ? ' · ' + esc(authLine) : '') + '</p>' + (auth && auth.note ? '<p class="people__note">' + esc(auth.note) + '</p>' : '') + facts + '<h2 class="section-title"><span>' + esc(T('people_entries')) + '</span></h2><div id="people-ledger"></div>';
    body.innerHTML = html;
    var sorted = p.entries.slice().sort(function (a, b) { return (a.year || 9999) - (b.year || 9999) || a.displayName.localeCompare(b.displayName); });
    var thumbs = {};
    sorted.forEach(function (d) { var u = (typeof _thumbMap !== 'undefined') ? _thumbMap[d.displayName] : null; if (u) thumbs[d.displayName] = u; });
    window.renderEntriesLedger(document.getElementById('people-ledger'), toLedgerItems(sorted), thumbs, { noPerson: true });
    if (typeof updateMeta === 'function') {
      setTimeout(function () {
        updateMeta({ title: personLabel(p) + ' — ' + T('people_entries') + ' ' + p.entries.length + ' | Aroid Origins', description: p.key + ': ' + rolesLine(p).replace(/<[^>]+>/g, '') + (years.length ? ' (' + Math.min.apply(null, years) + '–' + Math.max.apply(null, years) + ')' : ''), path: 'people/' + encodeURIComponent(p.slug) });
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
    window.renderEntriesLedger(document.getElementById('locality-ledger'), toLedgerItems(sorted), thumbs, { noCountry: true });
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
    if (!entry) { if (window._dataFullyLoaded) renderUnrecorded(displayName); return; }
    setUnrecorded(false);
    var d = describe(key in store ? key : (store[displayName] ? displayName : (store[displayName + ' [Seedling]'] ? displayName + ' [Seedling]' : key)), entry, entry._type || _detailArgs[2]);
    renderSpecimen(d, all);
    renderRelated(d, all);
    renderIndividuals(d, all);
    renderGateNote(d);
    renderShareBand(d, entry);
    renderColophonLine(d, entry);
    renderShops(d);
    if (window.refreshRerunButton) window.refreshRerunButton(entry);
    if (window.refreshPrivateButton) window.refreshPrivateButton(entry);
    var pnote = document.getElementById("detail-private-note");
    if (pnote) pnote.classList.toggle("d-none", !entry._isPrivate);
  }
  function setUnrecorded(on) {
    var page = document.getElementById('page-cultivar');
    if (page) page.classList.toggle('is-unrecorded', !!on);
    var sheet = document.getElementById('detail-unrecorded');
    if (sheet && !on) { sheet.classList.add('d-none'); sheet.innerHTML = ''; }
  }
  /* a name that is not in the archive: one plain sheet, never a made-up species page */
  function renderUnrecorded(displayName) {
    var sheet = document.getElementById('detail-unrecorded');
    if (!sheet) return;
    setUnrecorded(true);
    var std = document.getElementById('detail-standard');
    if (std) std.textContent = '';
    sheet.innerHTML = '<div class="sheet sheet--search"><p class="sheet__title">' + esc(T('unrecorded_title')) + '</p>'
      + '<p class="sheet__note">' + esc(T('unrecorded_note')) + '</p>'
      + '<p class="sheet__actions mono"><a class="sheet__cta" href="' + esc(base + 'search?q=' + encodeURIComponent(displayName)) + '">' + esc(T('unrecorded_search')) + '</a>'
      + '<a class="sheet__cta" href="' + esc(base + 'anthurium') + '" data-nav="genus" data-genus="Anthurium">' + esc(T('unrecorded_ledger')) + '</a></p></div>';
    sheet.classList.remove('d-none');
    var robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.setAttribute('content', 'noindex, follow');
    document.title = displayName + ' — ' + T('unrecorded_title') + ' - Aroid Origins';
  }
  window.onCultivarDetailRendered = function (displayName, cData, type, genusName, cultivarName) {
    _detailArgs = [displayName, cData, type, genusName, cultivarName];
    setUnrecorded(false);
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
        var lab = quoteS(seedLabel.value); // numbers/labels take single quotes (owner decision 2026-09-07)
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
    ['管理番号', 'g-code'], ['記録不足', 'g-unrecorded'], ['AI 下書き', 'g-draft'], ['系統', 'g-line'],
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

  /* ============================================================
     AI RE-RESEARCH REQUESTS (free; admin approves in admin.html)
     ============================================================ */
  function rerunRequestsInit() {
    var btn = $id('detail-rerun-btn'), status = $id('detail-rerun-status'), dlg = $id('research-request-dialog');
    if (!btn || !dlg) return;
    var reason = $id('research-request-reason'), submit = $id('research-request-submit'), cancel = $id('research-request-cancel');
    function $id(i) { return document.getElementById(i); }
    function sb() { return window._supabaseClient; }
    function cultivarId() { return parseInt(document.getElementById('page-cultivar').getAttribute('data-cultivar-id'), 10) || null; }
    function setStatus(kind) {
      btn.classList.toggle('d-none', kind !== 'none');
      status.classList.toggle('d-none', kind === 'none');
      status.textContent = kind === 'pending' ? T('rerun_pending') : kind === 'approved' ? T('rerun_approved') : '';
    }
    // Called after the detail page renders: show the button only for entries that already had an AI run
    window.refreshRerunButton = function (cData) {
      // Seedlings are personal records and never researched; every other type
      // can be requested (hybrids are no longer researched automatically).
      var id = cultivarId();
      var isSeedling = cData && cData._type === 'seedling';
      if (!id || isSeedling || !sb()) { btn.classList.add('d-none'); status.classList.add('d-none'); return; }
      sb().from('research_requests').select('status').eq('cultivar_id', id).in('status', ['pending', 'approved']).limit(1)
        .then(function (res) { setStatus(res.data && res.data[0] ? res.data[0].status : 'none'); })
        .catch(function () { setStatus('none'); });
    };
    btn.addEventListener('click', function () {
      if (!window._currentUser) { showToast(T('rerun_login'), true); return; }
      var h1 = document.querySelector('#page-cultivar h1');
      $id('research-request-target').textContent = h1 ? h1.textContent : '';
      reason.value = '';
      dlg.showModal();
    });
    cancel.addEventListener('click', function () { dlg.close(); });
    submit.addEventListener('click', function () {
      var id = cultivarId(), h1 = document.querySelector('#page-cultivar h1');
      if (!id || !sb() || !window._currentUser) return;
      submit.disabled = true;
      sb().from('research_requests').insert({ cultivar_id: id, cultivar_name: h1 ? h1.textContent.trim() : '', user_id: window._currentUser.id, reason: reason.value.trim() || null })
        .then(function (res) {
          submit.disabled = false;
          if (res.error) {
            var msg = /one_open|duplicate key/i.test(res.error.message) ? T('rerun_exists') : res.error.message;
            showToast(msg, true); return;
          }
          dlg.close();
          showToast(T('rerun_sent'));
          setStatus('pending');
          if (typeof gtag === 'function') gtag('event', 'rerun_request', { cultivar_id: id });
        });
    });
  }
  // the dialog markup sits after this script tag, so wait for the DOM
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rerunRequestsInit); else rerunRequestsInit();

  /* ============================================================
     GENUS REQUESTS: "add this genus" — no login needed, demand decides
     ============================================================ */
  function genusRequestsInit() {
    var dlg = document.getElementById('genus-request-dialog');
    if (!dlg) return;
    var genusIn = document.getElementById('genus-request-genus'), noteIn = document.getElementById('genus-request-note');
    var submit = document.getElementById('genus-request-submit'), cancel = document.getElementById('genus-request-cancel');
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('.genus-request-link');
      if (!a) return;
      e.preventDefault();
      genusIn.value = ''; noteIn.value = '';
      dlg.showModal();
      setTimeout(function () { genusIn.focus(); }, 50);
    });
    cancel.addEventListener('click', function () { dlg.close(); });
    function send() {
      var sb = window._supabaseClient;
      var g = genusIn.value.trim();
      if (!sb) return;
      if (!/^[A-Za-z]{3,40}$/.test(g)) { showToast(T('genus_request_invalid'), true); genusIn.focus(); return; }
      submit.disabled = true;
      sb.rpc('request_genus', { p_genus: g, p_note: noteIn.value.trim() || null }).then(function (res) {
        submit.disabled = false;
        var r = res.data;
        if (res.error || !r || !r.success) {
          var code = (r && r.error) || 'error';
          var msg = code === 'already_visible' ? T('genus_request_exists') : code === 'duplicate' ? T('genus_request_duplicate') : code === 'invalid_genus' ? T('genus_request_invalid') : (res.error ? res.error.message : T('genus_request_invalid'));
          showToast(msg, true); return;
        }
        dlg.close();
        showToast(T('genus_request_sent').replace('{genus}', r.genus).replace('{n}', r.count));
        if (typeof gtag === 'function') gtag('event', 'genus_request', { genus: r.genus });
      });
    }
    submit.addEventListener('click', send);
    genusIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); send(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', genusRequestsInit); else genusRequestsInit();

  /* ============================================================
     PRIVATE SEEDLINGS: owner-only records
     ============================================================ */
  (function privateToggle() {
    var btn = document.getElementById('detail-private-btn');
    if (!btn) return;
    var _entry = null;
    window.refreshPrivateButton = function (entry) {
      _entry = entry;
      var owner = entry && window._currentUser && entry._userId === window._currentUser.id;
      var isSeedling = entry && entry._type === 'seedling';
      if (!owner || !isSeedling) { btn.classList.add('d-none'); return; }
      btn.classList.remove('d-none');
      btn.textContent = entry._isPrivate ? T('private_toggle_to_public') : T('private_toggle_to_private');
    };
    btn.addEventListener('click', function () {
      var sb = window._supabaseClient;
      var id = parseInt(document.getElementById('page-cultivar').getAttribute('data-cultivar-id'), 10);
      if (!sb || !id || !_entry) return;
      var next = !_entry._isPrivate;
      btn.disabled = true;
      sb.rpc('set_cultivar_private', { p_cultivar_id: id, p_private: next }).then(function (res) {
        btn.disabled = false;
        if (res.error || !res.data || !res.data.success) {
          showToast((res.error && res.error.message) || (res.data && res.data.error) || 'error', true);
          return;
        }
        _entry._isPrivate = next;
        btn.textContent = next ? T('private_toggle_to_public') : T('private_toggle_to_private');
        showToast(next ? T('private_on') : T('private_off'));
        var note = document.getElementById('detail-private-note');
        if (note) note.classList.toggle('d-none', !next);
      });
    });
  })();

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
