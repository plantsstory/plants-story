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
    // the day in Japan, as the static pages print it: a reader abroad saw 2026.10.02 where the stub said 2026.10.03
    // (site check 2026-11-25)
    try { return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }).replace(/-/g, '.'); } catch (e) {}
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

  function countriesOf(text) {
    text = clean(text);
    if (!text) return [];
    var hits = [];
    COUNTRIES.forEach(function (c) {
      var m = new RegExp('(^|[^A-Za-z])' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z]|$)', 'i').exec(text);
      if (m) hits.push({ at: m.index, c: CANON[c] || c });
    });
    REGION_HINTS.forEach(function (h) { var m = h[0].exec(text); if (m) hits.push({ at: m.index, c: h[1] }); });
    hits.sort(function (a, b) { return a.at - b.at; });
    var out = [];
    hits.forEach(function (h) { if (out.indexOf(h.c) === -1) out.push(h.c); });
    return out;
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
    // no type locality and a range of several countries: the one shown is only the first of them (board 16 T6)
    d.countryMore = !countryOf(d.locality) && countriesOf(d.habitat).length > 1;
    d.breeder = clean(s.breeder) || clean(o && o.discoverer_or_breeder);
    d.namer = clean(s.namer);
    d.namingYear = yearOf(s.naming_year);
    d.sowing = clean(s.sowing_date);
    d.year = d.pubYear || d.namingYear || yearOf(d.sowing);
    // a contributor's record speaks in their own words: the body first (notes are only what the body does not say)
    var byPerson = o && (o.source_type === 'manual' || (o.author && o.author.isAI === false)) && !o.body_generated;
    d.text = byPerson ? (clean(o.body) || clean(s.notes) || '') : (clean(s.notes) || clean(o && o.body) || '');
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
    // an individual: its number as typed, how the plant came to its keeper, and from whom (11-03)
    d.indCode = clean(s.individual_code);
    d.acquisition = clean(s.acquisition);
    d.acquiredFrom = clean(s.acquired_from);
    d.closestSpecies = clean(s.closest_species);
    d.qualifier = entry._qualifier || null;
    d.aliases = entry._aliases || [];
    d.tags = entry._tags || [];
    d.selectedFrom = entry._selectedFrom || null;
    d.formulaStatus = entry._formulaStatus || null;
    d.absent = (s.absent && typeof s.absent === 'object') ? s.absent : {};
    // Record gate (shared module): 'ok' | 'unrecorded' | 'researching' | 'none'
    d.state = (window.RecordGate && typeof window.recForGate === 'function' && type !== 'seedling') ? window.RecordGate.state(window.recForGate(fullName, entry, { type: type })) : 'ok';
    d.missing = (d.state === 'unrecorded' && window.RecordGate) ? window.RecordGate.gate(window.recForGate(fullName, entry, { type: type })).missing : [];
    // an individual (numbered or named plant of a species) is marked by its tag only (BOARD 09-07);
    // a Clone selected from another clone keeps its own page in the index
    d.isIndividual = d.tags.indexOf('individual') !== -1;
    // a synonym (board 16 T1): listed under its own name, counted apart from the species, and pointing to the
    // accepted name by the id in its tag
    d.isSynonym = d.type === 'species' && d.tags.indexOf('synonym') !== -1;
    d.synonymOf = (d.tags.filter(function (t) { return /^synonym_of:\d+$/.test(t); })[0] || '').replace('synonym_of:', '') || null;
    // an individual is numbered or named, never bred: the person who gave the number is its namer (board 15 T1)
    if (d.isIndividual) { d.namer = d.namer || d.breeder; d.breeder = ''; }
    // tag breeder_unconfirmed: the record says 「〜に由来するとされる」, not that the person bred it. The name stays on
    // the label with that reservation, and is left out of the list line, the share text and the people index (T3)
    if (d.tags.indexOf('breeder_unconfirmed') !== -1) { d.breederSaid = d.breeder; d.breeder = ''; }
    d.verifiedAt = entry._verifiedAt || null;
    d.verificationNote = clean(entry._verificationNote);
    d.nameStatus = entry._nameStatus || null;
    d.formLocality = clean(entry._locality);
    d.creator = clean(d.formula && d.formula.creatorName);
    d.href = base + (window.entryPathOf ? window.entryPathOf(genus + ' ' + epithet) : genus.toLowerCase() + '/' + encodeURIComponent(epithet)) + '/';   // the canonical form (no 301)
    // the name readers see (T69: undescribed species stored without sp.); displayName stays the stored key
    d.shownName = window.EntryMeta ? window.EntryMeta.name({ cultivar_name: displayName, type: type, origins: entry.origins || [], species_qualifier: entry._qualifier }) : displayName;
    // the same number from a second person is stored as 「… 'RA1' (name)」: the bracket is a storage key, and the
    // person is shown on a line of their own instead (board 15 T4)
    if (d.isIndividual) d.shownName = d.shownName.replace(/(['’])\s+\([^()]*\)$/, '$1');
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
    push(d.author, 'author'); push(d.collector, 'collector'); push(d.breeder, breederRole); push(d.namer, 'namer'); push(d.creator, breederRole); push(d.introducedBy, 'introducer');
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
      return '<a href="' + esc(base + 'people/' + encodeURIComponent(personSlug(key)) + '/') + '" data-nav="people" data-person="' + esc(personSlug(key)) + '">' + esc(part) + '</a>';
    }).join('');
  }
  window.aoLinkPeople = linkPeople;
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
    var label = d.isIndividual ? T('cite_numbered') : d.type === 'clone' && !d.breeder && d.namer ? T('cite_namer') : T('cite_breeder');
    return joinParts([who ? (lang() === 'en' ? label + ' ' + esc(who) : label + ' ' + esc(who)) : '', yearSpan(d.year)]);
  }
  /* ---------- one list line for every list (BOARD 10-07 T62) ----------
     line 1: name, and one state at the right end; line 2: [date ·] kind · person · year · country */
  var COUNTRY_JA = { 'Colombia': 'コロンビア', 'Ecuador': 'エクアドル', 'Panama': 'パナマ', 'Peru': 'ペルー', 'Mexico': 'メキシコ',
    'Costa Rica': 'コスタリカ', 'Brazil': 'ブラジル', 'Bolivia': 'ボリビア', 'Venezuela': 'ベネズエラ', 'Guatemala': 'グアテマラ',
    'Honduras': 'ホンジュラス', 'Nicaragua': 'ニカラグア', 'Belize': 'ベリーズ', 'El Salvador': 'エルサルバドル', 'Guyana': 'ガイアナ',
    'French Guiana': 'フランス領ギアナ', 'Suriname': 'スリナム', 'Argentina': 'アルゼンチン', 'Paraguay': 'パラグアイ', 'Cuba': 'キューバ',
    'Jamaica': 'ジャマイカ', 'Trinidad and Tobago': 'トリニダード・トバゴ', 'Dominican Republic': 'ドミニカ共和国', 'Puerto Rico': 'プエルトリコ',
    'Indonesia': 'インドネシア', 'Malaysia': 'マレーシア', 'Thailand': 'タイ', 'Vietnam': 'ベトナム', 'Philippines': 'フィリピン',
    'Papua New Guinea': 'パプアニューギニア', 'Trinidad': 'トリニダード', 'Australia': 'オーストラリア', 'Japan': '日本', 'Taiwan': '台湾', 'China': '中国' };
  // WCVP level-3 region names as they appear in the distribution field (BOARD 10-07 T71)
  var REGION_JA = { 'Angola': 'アンゴラ', 'Assam': 'アッサム', 'Bangladesh': 'バングラデシュ', 'Benin': 'ベナン',
    'Bismarck Archipelago': 'ビスマルク諸島', 'Borneo': 'ボルネオ', 'Brazil North': 'ブラジル北部', 'Brazil Northeast': 'ブラジル北東部',
    'Burundi': 'ブルンジ', 'Cambodia': 'カンボジア', 'Cameroon': 'カメルーン', 'Central African Republic': '中央アフリカ共和国',
    'China South-Central': '中国中南部', 'Comoros': 'コモロ', 'Darién': 'ダリエン', 'Equatorial Guinea': '赤道ギニア', 'Ethiopia': 'エチオピア',
    'Gabon': 'ガボン', 'Ghana': 'ガーナ', 'Guinea': 'ギニア', 'Gulf of Guinea Is.': 'ギニア湾諸島', 'Ivory Coast': 'コートジボワール',
    'Jawa': 'ジャワ', 'Kenya': 'ケニア', 'Laos': 'ラオス', 'Lesser Sunda Is.': '小スンダ列島', 'Liberia': 'リベリア', 'Madagascar': 'マダガスカル',
    'Malawi': 'マラウイ', 'Malaya': 'マレー半島', 'Maluku': 'マルク諸島', 'Mauritius': 'モーリシャス', 'Mexico Southeast': 'メキシコ南東部',
    'Mozambique': 'モザンビーク', 'Myanmar': 'ミャンマー', 'Netherlands Antilles': 'オランダ領アンティル', 'New Caledonia': 'ニューカレドニア',
    'New Guinea': 'ニューギニア', 'New South Wales': 'ニューサウスウェールズ', 'Queensland': 'クイーンズランド', 'Nigeria': 'ナイジェリア', 'Norfolk Is.': 'ノーフォーク島',
    'Réunion': 'レユニオン', 'Rwanda': 'ルワンダ', 'Senegal': 'セネガル', 'Seychelles': 'セーシェル', 'Sierra Leone': 'シエラレオネ',
    'Sudan': 'スーダン', 'Sulawesi': 'スラウェシ', 'Sumatera': 'スマトラ', 'Tanzania': 'タンザニア', 'Trinidad-Tobago': 'トリニダード・トバゴ',
    'Uganda': 'ウガンダ', 'Venezuelan Antilles': 'ベネズエラ領アンティル諸島', 'Windward Is.': 'ウィンドワード諸島', 'Zaire': 'コンゴ民主共和国',
    'Zambia': 'ザンビア', 'Zimbabwe': 'ジンバブエ' };
  function regionJa(r) { return COUNTRY_JA[r] || REGION_JA[r] || ''; }
  function countryLabel(c) { c = clean(c); if (!c) return ''; return lang() === 'en' ? c : (regionJa(c) || c); }
  // "Colombia (Valle del Cauca)" -> コロンビア（Valle del Cauca）; '' when the name is not in the tables
  function regionLabel(r) {
    var m = r.match(/^(.+?)\s*\((.+)\)$/);
    var head = m ? m[1] : r, ja = regionJa(head);
    if (!ja) return '';
    if (lang() === 'en') return r;
    return m ? ja + '（' + m[2] + '）' : ja;
  }
  // the distribution cell: a list of known regions shows four, the rest behind a button; free text stays as written
  var DIST_SHOWN = 4;
  function distributionHtml(v) {
    v = clean(v);
    if (!v) return '';
    var parts = v.split(/\s*,\s*/).filter(Boolean);
    var labels = parts.map(regionLabel);
    if (parts.length < 2 || labels.some(function (x) { return !x; })) return esc(countryLabel(v));
    var sep = lang() === 'en' ? ', ' : '、';
    if (labels.length <= DIST_SHOWN + 1) return esc(labels.join(sep));
    var rest = labels.slice(DIST_SHOWN);
    return esc(labels.slice(0, DIST_SHOWN).join(sep))
      + '<span class="dist-rest" hidden>' + esc(sep + rest.join(sep)) + '</span>'
      + ' <a href="#" role="button" class="dist-more" aria-expanded="false">' + esc(T('dist_more').replace('{n}', rest.length)) + '</a>';
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.dist-more');
    if (!b) return;
    e.preventDefault();
    var rest = b.previousElementSibling;
    if (rest && rest.classList.contains('dist-rest')) rest.hidden = false;
    b.remove();
  });
  window.countryLabel = countryLabel;
  function isUndescribed(d) {
    var q = String(d.qualifier || '').toLowerCase().replace(/\./g, '');
    return q === 'sp' || q === 'aff' || q === 'cf' || (!!d.speciesStatus && d.speciesStatus !== 'described');
  }
  // 原種 / Hybrid / 不明, with ・Clone when the name covers one plant only (owner, 11-25; EntryMeta.kind)
  function kindWord(d) {
    var en = typeof currentLang !== 'undefined' && currentLang === 'en';
    if (d.isIndividual) return window.EntryMeta ? window.EntryMeta.kind({ type: 'clone', tags: ['individual'] }, en) : T('kind_individual');
    if (d.isSynonym) return T('kind_synonym');
    if (d.type === 'species') return String(d.qualifier || '').toLowerCase().replace(/\./g, '') === 'cf' ? T('kind_cf') : isUndescribed(d) ? T('kind_undescribed') : T('kind_species');
    if (d.type === 'seedling') return T('kind_seedling');
    if (window.EntryMeta) return window.EntryMeta.kind({ type: d.type, tags: d.tags }, en);
    return d.type === 'hybrid' ? 'Hybrid' : d.type === 'clone' ? 'Clone' : String(d.type || '');
  }
  function entrySubHtml(d, opts) {
    opts = opts || {};
    var parts = [];
    if (opts.date) parts.push('<span class="num">' + esc(opts.date) + '</span>');
    parts.push(esc(kindWord(d)));
    if (d.nameStatus === 'trade' && d.type !== 'species') parts.push(esc(T('kind_trade_name')));
    var species = d.type === 'species' && !d.isIndividual;
    if (!opts.noPerson) {
      if (species) { if (d.author) parts.push(esc(d.author)); }
      else {
        var who = d.breeder || d.creator;
        if (who) parts.push(esc(T('cite_breeder')) + ' ' + esc(who));
        else if (d.namer) parts.push(esc(T(d.isIndividual ? 'cite_numbered' : 'cite_namer')) + ' ' + esc(d.namer));
      }
    }
    if (species) { if (d.pubYear) parts.push(yearSpan(d.pubYear)); }
    else if (d.namingYear) parts.push('<span class="num">' + d.namingYear + '</span>');
    if (!opts.noCountry && species && d.country) parts.push(esc(countryLabel(d.country)) + (d.countryMore ? esc(T('country_more')) : ''));
    // each part kept whole on a line (no 'パ／ナマ'); the separators are where the line may break
    return parts.map(function (x) { return '<span class="entry__seg">' + x + '</span>'; }).join(LABEL ? (lang() === 'en' ? ', ' : '、') : ' · ');
  }
  function entryStateHtml(d) {
    if (d.type === 'seedling') return '';
    if (d.state !== 'ok') return '<span class="entry__state entry__state--' + esc(d.state) + '">' + esc(T('state_' + d.state)) + '</span>';
    if (!d.hasSources) return '<span class="entry__state">' + esc(T('record_by_user')) + '</span>';
    // lists show ✓ for a verified record; the % is on the plant page (board 9)
    if (d.verifiedAt) return '<span class="entry__state entry__state--pct"><span class="verified-mark" title="' + esc(T('verified_title')) + '">✓</span></span>';
    return '';
  }
  // pieces for list rows drawn elsewhere (the genus list in app-core.js)
  window.entryUndescribed = function (fullName, entry, type) {
    try { var d = describe(fullName, entry || {}, type); return d.type === 'species' && !d.isIndividual && isUndescribed(d); } catch (e) { return false; }
  };
  // 「27、未記載 5」: the described species, and beside them the names still waiting for a description
  function speciesCountHtml(described, undescribed) {
    return String(described) + (undescribed ? '<span class="n__sub">' + (lang() === 'en' ? ', ' : '、') + esc(T('kind_undescribed')) + ' ' + undescribed + '</span>' : '');
  }
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
      + '<span class="entry__main"><span class="entry__name">' + sciNameHtml(d.shownName) + '</span>'
      + '<span class="entry__sub">' + entrySubHtml(d, opts) + entryStateHtml(d) + '</span></span>'
      + '</a></li>';
  };

  window._describeEntry = function (fullName, entry, type) { return describe(fullName, entry, type); };
  function weekLine() {
    var el = document.getElementById('new-entries-count');
    if (!el || !window._dataFullyLoaded) return;
    var since = new Date(Date.now() - 7 * 864e5).toISOString();
    var store = window.cultivarData || {}, seen = {}, names = 0, verified = 0;
    Object.keys(store).forEach(function (k) {
      var e = store[k]; if (!e || seen[e._id || k] || e._isPrivate) return; seen[e._id || k] = 1;
      if (e._type !== 'seedling' && (e._created_at || '') > since) names++;
      if (e._verifiedAt && String(e._verifiedAt) > since) verified++;
    });
    var photos = (window._photoTimes || []).filter(function (t) { return t > since; }).length;
    var en = lang() === 'en';
    var parts = [names ? (en ? 'names' : '名前') + ' <span class="num">+' + names + '</span>' : '', photos ? (en ? 'photos' : '写真') + ' <span class="num">+' + photos + '</span>' : '', verified ? (en ? 'verified' : '検証済') + ' <span class="num">+' + verified + '</span>' : ''].filter(Boolean);
    el.innerHTML = parts.length ? (en ? 'This week — ' + parts.join(', ') : 'この 1 週間 — ' + parts.join('、')) : '';
  }
  document.addEventListener('ao:thumbs', function () { setTimeout(weekLine, 60); });
  document.addEventListener('ao:page', function (e) { if (e.detail === 'top') setTimeout(weekLine, 300); });
  waitForData(function () { setTimeout(weekLine, 300); });
  // /wanted/: recorded entries with no photo yet, the most searched first (board 9 D10)
  var WANTED_FIRST = ['Anthurium clarinervium', 'Anthurium luxurians', 'Anthurium regale', "Anthurium 'Dark Mama'", 'Anthurium antolakii'];
  // only the genera the site shows (Anthurium for now): hidden genera stay out of /wanted/ and /ig/ (board 11)
  var shownGenus = function (d) { var gs = window._generaData || []; return !gs.length || gs.some(function (g) { return g.name === d.genus; }); };
  // the site's counts, the same on every screen (board 17 T212): recorded entries of the shown genera, without
  // seedlings. Individuals (原種・Clone) are counted since 11-25, but add no people or places and ask for no photo. A synonym is not one more species and asks for no photo (its photos go to the
  // accepted name); its people and places are those of the accepted name anyway.
  function siteCounts() {
    var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
    var thumbs = window._thumbMap || {};
    var seen = {}, n = { species: 0, undescribed: 0, synonyms: 0, cultivar: 0, hybrid: 0, unknown: 0, clone: 0, wanted: 0 }, people = {}, places = {};
    Object.keys(store).forEach(function (k) {
      var e = store[k]; if (!e || seen[e._id || k] || / \[Seedling\]$/.test(k)) return; seen[e._id || k] = true;
      var d; try { d = describe(k, e, e._type); } catch (er) { return; }
      if (d.state !== 'ok' || d.type === 'seedling' || !shownGenus(d)) return;
      if (!d.isIndividual) { peopleOf(d).forEach(function (p) { people[p] = 1; }); if (d.country) places[d.country] = 1; }
      if (d.isSynonym) { n.synonyms++; return; }
      if (d.type === 'species') { if (isUndescribed(d)) n.undescribed++; else n.species++; }
      else {
        // 「Hybrid を探す」 counts Hybrid with its Clones, 「Clone を探す」 every Clone (they overlap, like the list chips)
        n.cultivar++;
        var par = window.EntryMeta ? window.EntryMeta.parentage({ type: d.type, tags: d.tags }) : (d.type === 'hybrid' ? 'hybrid' : 'unknown');
        if (par === 'hybrid') n.hybrid++; else if (par === 'unknown') n.unknown++;
        if (d.type === 'clone') n.clone++;
      }
      if (!thumbs[d.displayName] && !d.isIndividual) n.wanted++;
    });
    n.people = Object.keys(people).length; n.locality = Object.keys(places).length;
    return n;
  }
  window.aoSiteCounts = siteCounts;
  // the recorded names still without a photo, the ones most people are likely to own first
  function wantedList() {
    var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
    var thumbs = window._thumbMap || {};
    var seen = {}, list = [];
    Object.keys(store).forEach(function (k) {
      var e = store[k];
      if (!e || seen[e._id || k] || e._type === 'seedling' || / \[Seedling\]$/.test(k)) return;
      seen[e._id || k] = true;
      var d;
      try { d = describe(k, e, e._type); } catch (er) { return; }
      if (d.state !== 'ok' || d.isIndividual || d.isSynonym || thumbs[d.displayName] || !shownGenus(d)) return;
      list.push(d);
    });
    list.sort(function (a, b) {
      var ia = WANTED_FIRST.indexOf(a.fullName), ib = WANTED_FIRST.indexOf(b.fullName);
      if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.displayName.localeCompare(b.displayName);
    });
    return list;
  }
  // on the home: one more row of 「名前を探す」 — 写真を募集中, the first three names, the count (board 16 C6 / G3)
  function drawWantedRow() {
    var ways = document.querySelector('.label-ways .ways');
    if (!ways || !window._dataFullyLoaded || !window._photoTimes) return;   // not before the photo list is in
    var list = wantedList(), row = ways.querySelector('.way--wanted');
    if (!list.length) { if (row) row.remove(); return; }
    if (!row) {
      row = document.createElement('a');
      row.className = 'way way--wanted'; row.href = base + 'wanted/'; row.setAttribute('data-nav', 'wanted');
      ways.appendChild(row);
    }
    var names = list.slice(0, 3).map(function (d) { return d.shownName.replace(/^\S+\s+/, ''); }).join('、');
    row.innerHTML = '<span>' + esc(T('front_wanted_row')) + '<small class="way__sub">' + esc(names) + (list.length > 3 ? ' ' + esc(T('country_more').trim()) : '') + '</small></span><span class="n">' + list.length + '</span><span class="chev">›</span>';
  }
  document.addEventListener('ao:thumbs', function () { setTimeout(drawWantedRow, 0); });
  document.addEventListener('ao:page', function (e) { if (e.detail === 'top') setTimeout(drawWantedRow, 120); });
  window.renderWantedPage = function () {
    var body = document.getElementById('wanted-body');
    if (!body) return;
    waitForData(function () {
      var list = wantedList();
      if (!list.length) { body.innerHTML = '<p class="people__intro">いまは写真のない名前はありません。</p>'; return; }
      var html = '<p class="mypost-counts">' + (lang() === 'en' ? 'Photos wanted: <span class="num">' + list.length + '</span>' : '写真を募集中 <span class="num">' + list.length + '</span> 件') + '</p><ol class="entries">';
      list.forEach(function (d) {
        var line = window.entryLine(d, { noPerson: true });
        line = line.replace(/<\/li>$/, '<p class="mypost-acts"><button type="button" data-wanted-pick="' + esc(d.fullName) + '">写真を追加</button></p></li>');
        html += line;
      });
      body.innerHTML = html + '</ol>';
    });
  };
  // /ig/: every recorded entry as a plate, newest first, 「図版 n」 = the entry's id (board 11 T147)
  window.igPlateNo = function (fullName) {
    var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
    var e = store[fullName];
    return e && e._id ? e._id : '';
  };
  window.renderIgPage = function () {
    var body = document.getElementById('ig-body');
    if (!body) return;
    if (!window._photoTimes && !window._igWaited) {
      // the photo list decides the order: without it the photo-less plates come first and then jump (T163)
      clearTimeout(window._igWait);
      window._igWait = setTimeout(function () { window._igWaited = true; window.renderIgPage(); }, 6000);
      return;
    }
    waitForData(function () {
      var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
      var thumbs = window._thumbMap || {};
      var seen = {}, list = [];
      Object.keys(store).forEach(function (k) {
        var e = store[k];
        if (!e || !e._id || seen[e._id] || e._type === 'seedling' || / \[Seedling\]$/.test(k)) return;
        seen[e._id] = true;
        var d;
        try { d = describe(k, e, e._type); } catch (er) { return; }
        if (d.state !== 'ok' || d.isIndividual || !shownGenus(d)) return;
        list.push({ d: d, no: e._id });
      });
      // the plates with a photo first (newest first), then the ones still waiting for a photo
      list.forEach(function (x) { x.photo = !!thumbs[x.d.displayName]; });
      list.sort(function (a, b) { return (b.photo - a.photo) || (b.no - a.no); });
      var html = '<form class="ig-find" id="ig-find"><label for="ig-find-no">図版の番号</label><input type="number" inputmode="numeric" id="ig-find-no" min="1"><button type="submit" class="btn btn--primary">開く</button></form><ol class="ig-grid">';
      list.forEach(function (x) {
        var p = thumbs[x.d.displayName], src = p && window.galleryImg ? window.galleryImg(p, 360) : '';
        html += '<li id="p' + x.no + '">' + link(x.d, '<span class="ig-grid__img">' + (src ? '<img src="' + esc(src) + '" alt="' + esc(x.d.shownName) + '" loading="lazy" decoding="async">' : '<span class="ig-grid__name"><span>' + sciNameHtml(x.d.shownName) + '</span></span>') + '</span>'
          + '<span class="ig-grid__no num">図版 ' + x.no + '</span>') + '</li>';
      });
      // the day's Instagram text and image, for whoever posts it (moved here from the home, board 15 B12)
      var ig = window._storyIg;
      body.innerHTML = html + '</ol>' + (ig ? '<p class="story__share ig-today"><span class="ig-today__k">今日の一葉（' + sciNameHtml(ig.name) + '）</span><button type="button" class="story__copy" data-story-copy>' + esc(T('story_copy')) + '</button>'
        + '<a class="story__img" href="' + esc(ig.img) + '" download target="_blank" rel="noopener">' + esc(T('story_save_image')) + '</a></p>' : '');
      if (window.releaseStaticEntry) window.releaseStaticEntry();   // the stub's plates give way (T157)
      var form = document.getElementById('ig-find');
      if (form) form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var no = parseInt(document.getElementById('ig-find-no').value, 10);
        var hit = list.filter(function (x) { return x.no === no; })[0];
        if (!hit) { showToast('図版 ' + (no || '') + ' は見つかりませんでした', true); return; }
        if (typeof navigateTo === 'function') navigateTo('cultivar', { cultivar: hit.d.fullName });
        if (typeof gtag === 'function') gtag('event', 'ig_find', { plate: no });
      });
      // /ig/#p53 opens plate 53 directly
      var m = /^#p(\d+)$/.exec(location.hash || '');
      if (m) { var el = document.getElementById('p' + m[1]); if (el) el.scrollIntoView({ block: 'center' }); }
    });
  };
  /* ---------- 調べる (board 13, direction B) ---------- */
  window.renderExplorePage = function () {
    var page = document.getElementById('page-explore');
    if (!page) return;
    if (window._openTimeline) {
      window._openTimeline = false;
      var tlf = page.querySelector('.explore__tl');
      if (tlf) { tlf.open = true; setTimeout(function () { tlf.scrollIntoView({ block: 'start' }); }, 400); }
    }
    // people are counted the way the people index folds them, so the authority table comes first
    waitForData(function () { loadAuthority(function () {
      var n = siteCounts();
      var set = function (key, v) { var el = page.querySelector('[data-count="' + key + '"]'); if (el) el.textContent = v ? String(v) : ''; };
      set('hybrid', n.hybrid); set('clone', n.clone);
      var spEl = page.querySelector('[data-count="species"]');
      if (spEl) spEl.innerHTML = speciesCountHtml(n.species, n.undescribed); set('people', n.people); set('places', n.locality); set('wanted', n.wanted);
      // the explore search box behaves like the top one
      var inp = page.querySelector('.search-bar__input');
      var go = function (ev) { if (ev) ev.preventDefault(); if (inp.value.trim() && typeof globalSearch === 'function') globalSearch(inp.value.trim()); };
      var btn = page.querySelector('.search-bar__btn');
      if (inp && !inp._wired) { inp._wired = true; inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') go(ev); }); if (btn) btn.addEventListener('click', go); }
    }); });
  };
  /* ---------- search beyond names: people, places, children of a named parent (board 14 T179) ---------- */
  var fold = function (s) { return typeof foldName === 'function' ? foldName(s) : String(s || '').toLowerCase(); };
  var _sIdx = null, _sIdxN = -1;
  function searchIndex() {
    var store = window.cultivarData || {};
    var n = Object.keys(store).length + (_authority ? 100000 : 0);
    if (_sIdx && _sIdxN === n) return _sIdx;
    var all = collectAll().filter(function (d) { return d.state === 'ok' && shownGenus(d); });
    var people = peopleIndex(all).map(function (p) {
      var a = authorityOf(p.key) || {};
      return { label: personLabel(p), sub: rolesLine(p), href: base + 'people/' + encodeURIComponent(p.slug) + '/', nav: 'people', attr: 'data-person', slug: p.slug,
        keys: [p.key, a.name, a.ipni].filter(Boolean).map(fold) };
    });
    var places = placeGroups(all).map(function (g) {
      var slug = countrySlug(g.key);
      return { label: countryLabel(g.key), sub: '原種 ' + g.count, href: base + 'locality/' + encodeURIComponent(slug) + '/', nav: 'locality', attr: 'data-place', slug: slug,
        keys: [g.key, regionJa(g.key)].filter(Boolean).map(fold) };
    });
    _sIdx = { all: all, people: people, places: places }; _sIdxN = n;
    return _sIdx;
  }
  var TYPE_SHORT = { species: '原種', clone: 'Clone', hybrid: 'Hybrid', seedling: '実生' };
  window.aoSearchExtras = function (q, cb) {
    waitForData(function () { loadAuthority(function () {
      var fq = fold(q), ix = searchIndex();
      var hit = function (x) { return x.keys.some(function (k) { return k.indexOf(fq) !== -1; }); };
      cb({ people: fq.length >= 2 ? ix.people.filter(hit) : [], places: fq.length >= 2 ? ix.places.filter(hit) : [] });
    }); });
  };
  function extraRow(x, icon) {
    return '<li><a href="' + esc(x.href) + '" data-nav="' + x.nav + '" ' + x.attr + '="' + esc(x.slug) + '"><svg class="ico" aria-hidden="true"><use href="#' + icon + '"/></svg><span>' + esc(x.label) + '</span><span class="num">' + x.sub + '</span></a></li>';
  }
  function extraGroup(title, rows) {
    return rows.length ? '<h2 class="section-heading search-extra__h">' + esc(title) + '</h2><ul class="explore__list search-extra">' + rows.join('') + '</ul>' : '';
  }
  window.aoExtrasHtml = function (r) {
    return extraGroup('人物', r.people.slice(0, 8).map(function (p) { return extraRow(p, 'i-person'); }))
      + extraGroup('産地', r.places.slice(0, 6).map(function (p) { return extraRow(p, 'i-place'); }));
  };

  /* ---------- suggestions while typing (board 14 T180): six lines at most, 48px each ---------- */
  function suggestRows(q) {
    var fq = fold(q);
    if (fq.length < 2 || !window._dataFullyLoaded) return [];
    var ix = searchIndex(), store = window.cultivarData || {};
    var plants = ix.all.filter(function (d) { return d.type !== 'seedling'; }).map(function (d) {
      var keys = [d.displayName, d.epithet].concat((store[d.fullName] || {})._aliases || []).map(fold).filter(Boolean);
      var rank = keys.indexOf(fq) !== -1 ? 0 : keys.some(function (k) { return k.indexOf(fq) === 0; }) ? 1 : keys.some(function (k) { return k.indexOf(fq) !== -1; }) ? 2 : 9;
      return { d: d, rank: rank };
    }).filter(function (x) { return x.rank < 9; }).sort(function (a, b) { return a.rank - b.rank || a.d.shownName.localeCompare(b.d.shownName); });
    var hit = function (x) { return x.keys.some(function (k) { return k.indexOf(fq) !== -1; }); };
    var people = ix.people.filter(hit), places = ix.places.filter(hit);
    var rows = [];
    plants.slice(0, 6 - Math.min(people.length, 1) - Math.min(places.length, 1)).forEach(function (x) {
      rows.push('<li role="option">' + link(x.d, '<svg class="ico" aria-hidden="true"><use href="#' + (x.d.type === 'species' ? 'i-species' : 'i-cross') + '"/></svg><span>' + esc(x.d.shownName) + '</span><span class="suggest__k">' + esc(TYPE_SHORT[x.d.type] || '') + '</span>') + '</li>');
    });
    people.slice(0, 6 - rows.length - Math.min(places.length, 1)).forEach(function (p) { rows.push('<li role="option">' + extraRow(p, 'i-person').replace(/^<li>|<\/li>$/g, '').replace('<span class="num">' + p.sub + '</span>', '<span class="suggest__k">人物</span>') + '</li>'); });
    places.slice(0, 6 - rows.length).forEach(function (p) { rows.push('<li role="option">' + extraRow(p, 'i-place').replace(/^<li>|<\/li>$/g, '').replace('<span class="num">' + p.sub + '</span>', '<span class="suggest__k">産地</span>') + '</li>'); });
    return rows;
  }
  function wireSuggest(inp) {
    if (!inp || inp._sugg) return;
    inp._sugg = true;
    var bar = inp.closest('.search-bar');
    if (!bar) return;
    var box = document.createElement('ul');
    box.className = 'suggest'; box.setAttribute('role', 'listbox'); box.hidden = true;
    bar.appendChild(box);
    inp.setAttribute('autocomplete', 'off');
    var timer = null;
    function close() { box.hidden = true; box.innerHTML = ''; }
    function run() {
      var rows = suggestRows(inp.value);
      if (!rows.length || document.activeElement !== inp) { close(); return; }
      box.innerHTML = rows.join('') + '<li><button type="button" class="suggest__all">「' + esc(inp.value.trim()) + '」をすべて検索</button></li>';
      box.hidden = false;
    }
    inp.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 120); });
    inp.addEventListener('focus', function () { loadAuthority(function () { _sIdxN = -1; }); if (inp.value.trim()) run(); });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Escape' || e.key === 'Enter') close(); });
    inp.addEventListener('blur', function () { setTimeout(close, 200); });
    box.addEventListener('click', function (e) {
      if (e.target.closest('.suggest__all')) { e.preventDefault(); var q = inp.value.trim(); close(); if (q && typeof globalSearch === 'function') globalSearch(q); return; }
      setTimeout(function () { close(); inp.blur(); }, 0);
    });
    document.addEventListener('click', function (e) { if (!bar.contains(e.target)) close(); });
  }
  var colo = document.getElementById('colophon-fold');
  if (colo && window.matchMedia && window.matchMedia('(min-width: 641px)').matches) colo.open = true;
  wireSuggest(document.querySelector('.masthead .search-bar__input'));
  wireSuggest(document.querySelector('#page-explore .search-bar__input'));
  (function () {
    var inp = document.querySelector('#search-again .search-bar__input'), btn = document.querySelector('#search-again .search-bar__btn');
    if (!inp) return;
    var go = function (ev) { if (ev) ev.preventDefault(); if (inp.value.trim() && typeof globalSearch === 'function') globalSearch(inp.value.trim()); };
    inp.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') go(ev); });
    if (btn) btn.addEventListener('click', go);
    wireSuggest(inp);
    // the box shows what was searched
    document.addEventListener('ao:page', function (e) {
      if (e.detail !== 'search') return;
      var q = ''; try { q = new URLSearchParams(location.search).get('q') || ''; } catch (er) {}
      if (q && document.activeElement !== inp) inp.value = q;
    });
    window.aoSearchAgainFill = function (q) { if (document.activeElement !== inp) inp.value = q || ''; };
  })();

  /* ---------- 最近見た品種 (board 14 T182): five names on this device only, never sent anywhere ---------- */
  var RECENT_KEY = 'ao-recent';
  function recentList() {
    try { var l = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(l) ? l.filter(function (x) { return typeof x === 'string'; }) : []; } catch (e) { return []; }
  }
  window.aoRemember = function (fullName) {
    var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
    var e = store[fullName];
    if (!e || e._isPrivate) return;   // private seedlings are never kept
    var l = recentList().filter(function (x) { return x !== fullName; });
    l.unshift(fullName);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(l.slice(0, 5))); } catch (er) {}
  };
  function drawRecent() {
    var box = document.getElementById('recent-views');
    if (!box) return;
    var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
    var rows = recentList().map(function (k) {
      var e = store[k];
      if (!e || e._isPrivate) return null;
      try { var d = describe(k, e, e._type); return d.state === 'ok' && shownGenus(d) ? d : null; } catch (er) { return null; }
    }).filter(Boolean);
    box.hidden = !rows.length;
    box.innerHTML = rows.length ? '<div class="recent__head"><h2 class="recent__h">最近見た名前</h2><button type="button" class="recent__clear" data-recent-clear>消す</button></div>'
      + '<ul class="explore__list recent__list">' + rows.map(function (d) {
        return '<li>' + link(d, '<svg class="ico" aria-hidden="true"><use href="#' + (d.type === 'species' ? 'i-species' : 'i-cross') + '"/></svg><span>' + esc(d.shownName) + '</span><span class="num">' + esc(TYPE_SHORT[d.type] || '') + '</span>') + '</li>';
      }).join('') + '</ul>' : '';
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('[data-recent-clear]')) return;
    try { localStorage.removeItem(RECENT_KEY); } catch (er) {}
    drawRecent();
  });
  document.addEventListener('ao:page', function (e) { if (e.detail === 'top') waitForData(drawRecent); });
  waitForData(drawRecent);

  /* ---------- the kind chips say what the kind is, in one line (board 14 T183) ---------- */
  var KIND_NOTE = {
    species: '原種＝自然に生えている種。学名が発表されたものと、まだ名前のないもの（sp.）を含みます。原種の 1 株につけた名前は Clone に並びます。',
    cultivar: '品種＝人が選んで名前を付けた株。Hybrid・不明・Clone をまとめて表示しています。',
    hybrid: 'Hybrid＝交配でできた株の名前。1 株だけの名前（Hybrid・Clone）も含みます。',
    unknown: '不明＝野生の種か交配か、確かめられる出典がない名前。推測で Hybrid にはしません。',
    clone: 'Clone＝1 株と、その株分け・組織培養で増えた株だけが名乗る名前。原種・Hybrid・不明のどれにもあります。'
  };
  function showKindNote(scope, kind) {
    var p = scope && scope.querySelector('.kind-note');
    if (!p) return;
    var text = KIND_NOTE[kind];
    p.hidden = !text;
    p.innerHTML = text ? esc(text) + ' <a href="' + esc(base) + 'glossary/" data-nav="glossary">用語集 →</a>' : '';
  }
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('.filter-chip[data-filter-type]');
    if (c) showKindNote(c.closest('.genus-content') || document, c.getAttribute('data-filter-type'));
  });
  document.addEventListener('change', function (e) {
    var s = e.target.closest && e.target.closest('.filter-select');
    if (s) showKindNote(s.closest('.genus-content') || document, s.value);
  });

  /* ---------- OFUSE (board 14 T185): text links only, switched off until the owner's page exists ---------- */
  var OFUSE_URL = 'https://ofuse.me/ad4a1628';   // the owner's OFUSE page (11-01); '' turns the three links off
  window.aoDonateHtml = function (source) {
    if (!OFUSE_URL) return '';
    return '<a class="donate-link" href="' + esc(OFUSE_URL) + '" target="_blank" rel="noopener" data-donate="' + esc(source) + '">このサイトの運営費（サーバー・出典の調査）に充てる送金を OFUSE で受け付けています →</a>';
  };
  if (OFUSE_URL) document.querySelectorAll('[data-donate-slot]').forEach(function (p) { p.innerHTML = window.aoDonateHtml(p.getAttribute('data-donate-slot')); p.hidden = false; });
  // measured, not guessed (board 15 M6): the donation line seen, the catalogue entered and from where, 「その他」 opened
  if ('IntersectionObserver' in window) {
    var _donSeen = {};
    var _donIo = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        var s = en.target.getAttribute('data-donate');
        if (!en.isIntersecting || _donSeen[s]) return;
        _donSeen[s] = 1;
        if (typeof gtag === 'function') gtag('event', 'donate_view', { source: s });
      });
    });
    document.querySelectorAll('[data-donate]').forEach(function (a) { _donIo.observe(a); });
  }
  document.addEventListener('click', function (e) {
    if (typeof gtag !== 'function' || !e.target.closest) return;
    var c = e.target.closest('[data-tools-context]');
    if (c) { gtag('event', 'tools_context_click', { genre: c.getAttribute('data-genre') || '', source: c.getAttribute('data-tools-context') }); return; }
    var a = e.target.closest('a[data-nav="tools"]');
    if (a && !a.closest('#page-tools')) gtag('event', 'tools_enter', { source: a.closest('#mobileNav') ? 'menu' : a.closest('footer') ? 'footer' : a.closest('#page-explore') ? 'explore' : 'other' });
  });
  document.addEventListener('toggle', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('detail-more') && e.target.open && typeof gtag === 'function') gtag('event', 'more_open', {});
  }, true);
  // 「その他」 on a phone is a sheet from the bottom: a tap outside it, on 閉じる or on one of its rows closes it (board 15 B2)
  (function () {
    var dm = document.querySelector('#page-cultivar .detail-more');
    if (!dm) return;
    dm.addEventListener('click', function (e) {
      if (e.target === dm) { dm.open = false; return; }
      if (e.target.closest('.detail-more__items') && e.target.closest('button, a')) setTimeout(function () { dm.open = false; }, 0);
    });
    document.addEventListener('ao:page', function () { dm.open = false; });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dm.open) dm.open = false; });
    // on a wide screen the list hangs under the strip: a click anywhere else puts it away
    document.addEventListener('click', function (e) { if (dm.open && !dm.contains(e.target)) dm.open = false; });
  })();
  // after the records: the same 写真を追加, for someone who has read to the end (board 15 B16)
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('#read-end-photo')) return;
    var pb = document.getElementById('detail-add-photo-btn'); if (pb) pb.click();
  });
  /* 道具の目録 — PR: one genus-level line on recorded species and locality pages, only while the catalogue is open (T96) */
  var _toolCtxD = null;
  function toolContextHtml(src) {
    var g = [['humidity', '湿度・送風'], ['heat', '温度'], ['soil', '用土・植込み材']];
    return '<p class="tool-context__line"><span class="tool-context__h">道具の目録 — PR</span>' + g.map(function (x) {
      return '<a href="' + esc(base + 'tools/?g=' + x[0]) + '" data-nav="tools" data-genre="' + x[0] + '" data-tools-context="' + src + '">' + esc(x[1]) + '</a>';
    }).join('') + '</p>';
  }
  function renderToolContext(d) {
    _toolCtxD = d;
    var el = document.getElementById('tool-context');
    if (!el) return;
    var ok = !!window._toolsOpen && d && d.type === 'species' && !d.isIndividual && d.state === 'ok';
    el.classList.toggle('d-none', !ok);
    el.innerHTML = ok ? toolContextHtml('species') : '';
  }
  document.addEventListener('ao:tools-open', function () {
    if (_toolCtxD) renderToolContext(_toolCtxD);
    var lc = document.getElementById('locality-tools');
    if (lc && window._toolsOpen) lc.innerHTML = toolContextHtml('locality');
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-donate]');
    if (a && typeof gtag === 'function') gtag('event', 'donate_click', { source: a.getAttribute('data-donate') });
  });

  /* ---------- ?preview=label (10-31): 「名札の図鑑」, the owner's approved design ---------- */
  var LABEL = document.documentElement.classList.contains('pv-label');
  // the original published plates, all public domain (author died before 1900), as Wikimedia Commons holds them
  var PLATES = {
    'Anthurium warocqueanum': { src: 'images/plates/warocqueanum-ih392.jpg', file: "L'Illustration horticole (Plate 392).jpg", cite: "L'Illustration Horticole、図版 392（1880 年）。P. De Pannemaeker 画、J. Linden 刊" },
    'Anthurium veitchii': { src: 'images/plates/veitchii-ih406.jpg', file: "L'Illustration horticole (Plate 406).jpg", cite: "L'Illustration Horticole、図版 406（1880 年）。P. De Pannemaeker 画、J. Linden 刊" },
    'Anthurium splendidum': { src: 'images/plates/splendidum-ih510.jpg', file: "L'Illustration horticole (Plate 510).jpg", cite: "L'Illustration Horticole、図版 510（1884 年）。P. De Pannemaeker 画、J. Linden 刊" }
  };
  function plateUrl(file, w) { return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file) + '?width=' + (w || 900); }
  function plateFor(name) {
    var p = PLATES[name];
    if (!p) return '';
    return '<figure class="plate-hist"><img src="' + esc(base + p.src) + '" alt="' + esc(name) + ' の原記載の図版" loading="lazy" decoding="async">'
      + '<figcaption>' + esc(p.cite) + '。公共財。<a href="https://commons.wikimedia.org/wiki/File:' + esc(encodeURIComponent(p.file.replace(/ /g, '_'))) + '" target="_blank" rel="noopener">Wikimedia Commons</a></figcaption></figure>';
  }
  if (LABEL) {
    // the label laid on the photo of the day: 学名 ／ 記載者、年。産地 — once the story is drawn
    function labelOnStory() {
      var fig = document.querySelector('#story-body .story__figure');
      var title = document.querySelector('#story-body .story__title');
      if (!fig || !title || fig.querySelector('.plate-label')) return;
      var a0 = title.querySelector('a');
      var key = a0 && a0.getAttribute('data-key');
      var store = window.cultivarData || {};
      var e = key && store[key];
      if (!e) return;
      var d; try { d = describe(key, e, e._type); } catch (er) { return; }
      var by = lang() === 'en' ? (d.type === 'species'
        ? [d.author ? 'Described by ' + esc(d.author) : '', d.pubYear ? '<span class="year">' + d.pubYear + '</span>' : '', d.country ? esc(countryLabel(d.country)) : ''].filter(Boolean).join(', ')
        : [esc(kindWord(d)), (d.breeder || d.namer || d.creator) ? 'bred by ' + esc(d.breeder || d.namer || d.creator) : ''].filter(Boolean).join('. '))
        : d.type === 'species'
        ? [d.author ? esc(d.author) + ' が記載' : '', d.pubYear ? '<span class="year">' + d.pubYear + '</span>年' : '', d.country ? esc(countryLabel(d.country)) : ''].filter(Boolean).join('、').replace('年、', '年。')
        : [esc(kindWord(d)), (d.breeder || d.namer || d.creator) ? esc(d.breeder || d.namer || d.creator) + ' 作出' : ''].filter(Boolean).join('。');
      fig.insertAdjacentHTML('beforeend', '<figcaption class="plate-label"><span class="plate-label__name">' + sciNameHtml(d.shownName) + '</span><span class="plate-label__by">' + by + '</span></figcaption>');
    }
    // the timeline under 「名前を探す」: the species stack into one column per decade. A tap on the strip
    // (or on ‹ ›) picks a decade and its names follow as label rows — one dot per name was too fine to tap.
    function timelineStrip() {
      var host = document.getElementById('label-timeline');
      if (!host || host.childElementCount) return;
      var all = collectAll().filter(function (d) { return d.type === 'species' && d.pubYear && d.state === 'ok' && shownGenus(d); })
        .sort(function (x, y) { return x.pubYear - y.pubYear; });
      if (all.length < 3) return;
      var decs = {}, keys = [];
      all.forEach(function (d) { var k = Math.floor(d.pubYear / 10) * 10; if (!decs[k]) { decs[k] = []; keys.push(k); } decs[k].push(d); });
      var minY = keys[0], maxY = Math.max(keys[keys.length - 1] + 10, new Date().getFullYear());
      var W = 343, AX = 92, x = function (y) { return ((y - minY) / (maxY - minY) * W).toFixed(1); };
      var svg = '<svg viewBox="0 0 ' + W + ' 116" role="img" aria-label="記載史の年表。年代ごとの原種の数"><line class="axis" x1="0" y1="' + AX + '" x2="' + W + '" y2="' + AX + '"/>';
      [minY, Math.round((minY + maxY) / 20) * 10, maxY].forEach(function (y, i) { svg += '<line class="tick" x1="' + x(y) + '" y1="' + (AX - 4) + '" x2="' + x(y) + '" y2="' + (AX + 4) + '"/><text x="' + x(y) + '" y="' + (AX + 20) + '" text-anchor="' + (i === 0 ? 'start' : i === 2 ? 'end' : 'middle') + '">' + y + '</text>'; });
      // up to 7 dots; from 8 names on, six dots and the count in a circle on top (the column keeps one height)
      keys.forEach(function (k) {
        var n = decs[k].length, cx = x(k + 5), dots = n > 7 ? 6 : n, i;
        for (i = 0; i < dots; i++) svg += '<circle class="dot" data-dec="' + k + '" cx="' + cx + '" cy="' + (AX - 7 - i * 11) + '" r="4.5"/>';
        if (n > 7) svg += '<circle class="dot dot--n" data-dec="' + k + '" cx="' + cx + '" cy="' + (AX - 7 - 6 * 11 - 5) + '" r="9.5"/><text class="cnt" x="' + cx + '" y="' + (AX - 7 - 6 * 11 - 5 + 3.5) + '" text-anchor="middle"' + (n > 99 ? ' font-size="8"' : '') + '>' + n + '</text>';
      });
      svg += '</svg>';
      var early = all.filter(function (d) { return d.pubYear < 1900; }).length, late = all.filter(function (d) { return d.pubYear >= 2000; }).length;
      host.innerHTML = '<p class="lede">' + minY + '年から。原種が学名として発表された年。年表を押すと、その年代の名前が並びます。</p>' + svg
        + '<div class="tl__step"><button type="button" data-tl="-1" aria-label="前の年代">‹</button><p class="tl__cur"></p><button type="button" data-tl="1" aria-label="次の年代">›</button></div>'
        + '<ol class="entries tl__list"></ol><p class="tl__note">' + (lang() === 'en' ? '<b>' + early + '</b> names from the 19th century, <b>' + late + '</b> since 2000.' : '19世紀に <b>' + early + '</b>、2000年以降に <b>' + late + '</b> の名前。') + '</p>';
      // the fullest decade opens first (the earliest on a tie)
      var sel = keys.reduce(function (best, k) { return decs[k].length > decs[best].length ? k : best; }, keys[0]);
      function draw() {
        host.querySelectorAll('.dot').forEach(function (c) { c.classList.toggle('is-on', +c.getAttribute('data-dec') === sel); });
        host.querySelector('.tl__cur').innerHTML = (lang() === 'en' ? '<b>' + sel + 's</b><span>' + decs[sel].length + ' names</span>' : '<b>' + sel + '年代</b><span>' + decs[sel].length + ' つの名前</span>');
        host.querySelector('.tl__list').innerHTML = decs[sel].map(function (d) { return window.entryLine(d, { thumb: thumbUrl(d.displayName, 160) }); }).join('');
        host.querySelector('[data-tl="-1"]').disabled = keys.indexOf(sel) === 0;
        host.querySelector('[data-tl="1"]').disabled = keys.indexOf(sel) === keys.length - 1;
      }
      draw();
      host._tlDraw = draw;
      host.querySelector('svg').addEventListener('click', function (e) {
        var r = this.getBoundingClientRect(), yr = minY + (e.clientX - r.left) / r.width * (maxY - minY);
        sel = keys.reduce(function (best, k) { return Math.abs(k + 5 - yr) < Math.abs(best + 5 - yr) ? k : best; }, keys[0]);
        draw();
      });
      host.querySelectorAll('[data-tl]').forEach(function (b) { b.addEventListener('click', function () { var i = keys.indexOf(sel) + (+b.getAttribute('data-tl')); if (keys[i] !== undefined) { sel = keys[i]; draw(); } }); });
    }
    // the decade's rows pick up their thumbnails once the photo list is in
    document.addEventListener('ao:thumbs', function () { var h = document.getElementById('label-timeline'); if (h && h._tlDraw) h._tlDraw(); });
    // the home's order: hero → search → photo of the day → 名前を探す → new names → the rest.
    // The timeline left the home for 調べる › 読む (owner, 11-03)
    function arrangeHome() {
      var main = document.querySelector('.masthead__main'), front = document.querySelector('.front'), story = document.getElementById('story-of-day');
      var ways = document.querySelector('.masthead .ways'), newSec = document.getElementById('front-new');
      if (!main || !front || !story || !ways || document.querySelector('.label-ways')) return;
      var container = front.parentNode;
      // the search leaves the masthead body and sits right under the hero
      var hero = document.getElementById('label-hero'), search = main.querySelector('.search-bar');
      if (hero && search) hero.insertAdjacentElement('afterend', search);
      // 名前を探す, then the new names, after the photo of the day
      var ways2 = document.createElement('section'); ways2.className = 'label-ways'; ways2.innerHTML = '<h2 class="sec">名前を探す</h2>';
      ways2.appendChild(ways);
      story.insertAdjacentElement('afterend', ways2);
      if (newSec) ways2.insertAdjacentElement('afterend', newSec);
      // the four ways read as rows with counts
      ways.querySelectorAll('.way').forEach(function (w) { if (!w.querySelector('.n')) w.insertAdjacentHTML('beforeend', '<span class="n" data-wcount></span><span class="chev">›</span>'); });
      // 写真を募集中 keeps its place from the start (it was added once the photos were in and pushed the rest down, 11-26);
      // drawWantedRow fills it, or takes it away when every name has a photo
      if (!ways.querySelector('.way--wanted')) {
        var lbl = T('front_wanted_row'); if (!lbl || lbl === 'front_wanted_row') lbl = '写真を募集中';
        var row = document.createElement('a');
        row.className = 'way way--wanted'; row.href = base + 'wanted/'; row.setAttribute('data-nav', 'wanted');
        row.innerHTML = '<span>' + esc(lbl) + '<small class="way__sub">&nbsp;</small></span><span class="n"></span><span class="chev">›</span>';
        ways.appendChild(row);
      }
    }
    // the home takes its final order at once, not when the records are in (it changed under the reader, 11-26)
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrangeHome); else arrangeHome();
    // the counts are drawn every time (also after the authority table, which folds people: board 17 T212)
    function homeCounts() {
      var ways = document.querySelector('.label-ways .ways');
      if (!ways) return;
      var n = siteCounts(), sp = n.species + n.undescribed, und = n.undescribed;
      ways.querySelectorAll('.way').forEach(function (w) {
        var k = w.getAttribute('data-kind') || (w.getAttribute('data-nav') === 'people' ? 'people' : 'locality'); var el = w.querySelector('[data-wcount]');
        if (!el || !n[k]) return;
        // people are counted the way the people index folds them: not before the authority table (37 → 36, 11-26)
        if (k === 'people' && !_authority) return;
        if (k === 'species') el.innerHTML = speciesCountHtml(sp - und, und); else el.textContent = n[k];
      });
    }
    function homeAll() { arrangeHome(); homeCounts(); loadAuthority(function () { arrangeHome(); homeCounts(); timelineStrip(); }); labelOnStory(); }
    waitForData(homeAll);
    document.addEventListener('ao:page', function (e) { if (e.detail === 'top') setTimeout(homeAll, 50); });
    document.addEventListener('ao:thumbs', function () { setTimeout(labelOnStory, 50); });
    // the same-era rows draw their thumbnails once the photo list is in
    document.addEventListener('ao:thumbs', function () { var p = document.getElementById('page-cultivar'); if (p && p.classList.contains('active') && window._labelLast) renderLabelExtras(window._labelLast.d, window._labelLast.all); });
    var storyBody = document.getElementById('story-body');
    if (storyBody && window.MutationObserver) new MutationObserver(function () { labelOnStory(); }).observe(storyBody, { childList: true });
    // the plant page opens with the original plate when there is one, before the photos
    function drawPlate() {
      var page = document.getElementById('page-cultivar');
      if (!page || !page.classList.contains('active')) return;
      var old = page.querySelector('.plate-hist'); if (old) old.remove();
      var h = document.querySelector('#page-cultivar h1');
      var name = h ? (window.h1Key ? window.h1Key(h) : h.textContent).replace(/\s+/g, ' ').trim() : '';
      var html = plateFor(name);
      var car = document.getElementById('gallery-carousel');
      if (html && car) car.insertAdjacentHTML('beforebegin', html);
    }
    document.addEventListener('ao:page', function (e) { if (e.detail === 'cultivar') setTimeout(drawPlate, 0); });
    setTimeout(drawPlate, 400);
  }

  // An entry (原種を探す / Hybrid を探す / Clone を探す / ?kind=…) lands on the genus list with that kind chosen.
  // The kind is also kept for a few seconds in this tab: on a first visit a new version reloads the page at the
  // first page change, and the kind was lost then (11-25). The list can be drawn again after the first moment
  // (its chips start over at すべて), so it is chosen once more at each of these times; a kind the reader picks
  // afterwards is theirs and is left alone.
  var KIND_KEY = 'ao-kind';
  function storedKind() {
    try { var o = JSON.parse(sessionStorage.getItem(KIND_KEY) || 'null'); return o && Date.now() - o.t < 15000 ? o.k : ''; } catch (er) { return ''; }
  }
  function forgetKind() { try { sessionStorage.removeItem(KIND_KEY); } catch (er) {} }
  document.addEventListener('ao:page', function (e) {
    if (e.detail !== 'genus') return;
    var kind = new URLSearchParams(location.search).get('kind') || window._pendingKind || storedKind();
    window._pendingKind = '';
    if (!kind) return;
    window._kindTouched = false;
    [80, 500, 1200, 2500].forEach(function (ms) {
      setTimeout(function () {
        var pg = document.getElementById('page-genus');
        if (!pg || !pg.classList.contains('active') || window._kindTouched) return;
        var chip = document.querySelector('#page-genus .filter-chip[data-filter-type="' + kind + '"], .page.active .filter-chip[data-filter-type="' + kind + '"]');
        if (chip && !chip.classList.contains('active')) chip.click();
      }, ms);
    });
    setTimeout(forgetKind, 3000);
  });
  function readerChose() { window._kindTouched = true; forgetKind(); }
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('.filter-chip[data-filter-type]');
    if (!c) return;
    if (e.isTrusted) readerChose();
    // phones show the kind as a select: it says the chosen kind too (it stayed on すべて, 11-25)
    var bar = c.closest('.sort-bar'), sel = bar && bar.querySelector('.filter-select');
    var v = c.getAttribute('data-filter-type');
    if (sel && [].some.call(sel.options, function (o) { return o.value === v; })) sel.value = v;
  });
  document.addEventListener('change', function (e) {
    if (e.target && e.target.matches && e.target.matches('.filter-select') && e.isTrusted) readerChose();
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-kind]');
    if (!a) return;
    window._pendingKind = a.getAttribute('data-kind');
    try { sessionStorage.setItem(KIND_KEY, JSON.stringify({ k: window._pendingKind, t: Date.now() })); } catch (er) {}
  }, true);

  /* ---------- 読みもの (board 12): articles by people who know these plants ---------- */
  var _articles = null, _articlesWaiters = [];
  function loadArticles(cb) {
    if (_articles) { cb(_articles); return; }
    _articlesWaiters.push(cb);
    if (_articlesWaiters.length > 1) return;
    var sbc = window._supabaseClient;
    var done = function (rows) { _articles = rows || []; var w = _articlesWaiters; _articlesWaiters = []; w.forEach(function (f) { f(_articles); }); };
    if (!sbc) { done([]); return; }
    sbc.from('articles').select('id, url, title, author, site, lang, published_on, kind, credential, summary, topics')
      .eq('is_published', true).order('published_on', { ascending: false, nullsFirst: false }).limit(500)
      .then(function (r) { done(r && !r.error ? r.data : []); }, function () { done([]); });
  }
  var extLink = function (a, inner, cls) {
    return '<a' + (cls ? ' class="' + cls + '"' : '') + ' href="' + esc(a.url) + '" target="_blank" rel="noopener noreferrer">' + inner
      + '<span aria-hidden="true"> ↗</span><span class="visually-hidden">（外部サイト）</span></a>';
  };
  var yearOfDate = function (v) { return v ? String(v).slice(0, 4) : ''; };
  var entryByName = function (n) {
    var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
    var e = store[n];
    if (!e) return null;
    try { return describe(n, e, e._type); } catch (er) { return null; }
  };
  // 11-25 owner: both lists are 「近日公開」 for everyone; ?preview=reading / ?preview=nurseries shows what is ready
  function soonBlock(text) { return '<div class="soon"><p class="soon__label">近日公開</p><p>' + esc(text) + '</p></div>'; }
  window.renderReadingPage = function () {
    var body = document.getElementById('reading-body');
    if (!body) return;
    if (!document.documentElement.classList.contains('pv-reading')) { body.innerHTML = soonBlock('ブログや note などに書かれた、アンスリウムに詳しい人の記事を一覧にします。準備ができしだい公開します。'); return; }
    waitForData(function () {
      loadArticles(function (rows) {
        if (!rows.length) { body.innerHTML = '<p class="people__intro">準備中です。</p>'; return; }
        var ja = rows.filter(function (a) { return a.lang === 'ja'; }).length, en = rows.filter(function (a) { return a.lang === 'en'; }).length;
        var html = '<p class="mypost-counts">記事 <span class="num">' + rows.length + '</span> 件 · 日本語 <span class="num">' + ja + '</span> · 英語 <span class="num">' + en + '</span></p>';
        if (en >= 3 && ja >= 1) html += '<div class="genus-tabs reading-tabs" role="tablist"><button type="button" class="genus-tab active" data-reading-lang="">全部</button><button type="button" class="genus-tab" data-reading-lang="ja">日本語</button><button type="button" class="genus-tab" data-reading-lang="en">英語</button></div>';
        html += '<ol class="entries reading-list">';
        rows.forEach(function (a) {
          var sub = [esc(a.author), esc(a.site), a.published_on ? '<span class="year">' + esc(yearOfDate(a.published_on)) + '</span>' : '', a.lang === 'en' ? '英語' : ''].filter(Boolean).join(' · ');
          var plants = (a.topics || []).map(function (n) { var d = entryByName(n); return d && d.state === 'ok' ? link(d, sciNameHtml(d.shownName)) : ''; }).filter(Boolean);
          html += '<li class="entry reading-item" data-lang="' + esc(a.lang) + '"><div class="entry__main">'
            + extLink(a, esc(a.title), 'entry__name reading-item__title')
            + '<span class="entry__sub">' + sub + '</span>'
            + (a.credential ? '<span class="entry__sub reading-item__cred">' + esc(a.credential) + '</span>' : '')
            + '<p class="people__note reading-item__summary">' + (window.italicizeSciNames ? window.italicizeSciNames(esc(a.summary)) : esc(a.summary)) + '</p>'
            + (plants.length ? '<p class="related__exit reading-item__plants">' + plants.join(' · ') + '</p>' : '')
            + '</div></li>';
        });
        body.innerHTML = html + '</ol>';
        body.querySelectorAll('[data-reading-lang]').forEach(function (b) {
          b.addEventListener('click', function () {
            var v = b.getAttribute('data-reading-lang');
            body.querySelectorAll('[data-reading-lang]').forEach(function (x) { x.classList.toggle('active', x === b); });
            body.querySelectorAll('.reading-item').forEach(function (li) { li.style.display = !v || li.getAttribute('data-lang') === v ? '' : 'none'; });
          });
        });
      });
    });
  };
  /* ---------- ナーセリー (owner, 11-25): nurseries' own sales sites ---------- */
  window.renderNurseriesPage = function () {
    var body = document.getElementById('nurseries-body');
    if (!body) return;
    var soon = soonBlock('国内外のナーセリーの販売サイトを一覧にします。準備ができしだい公開します。');
    if (!document.documentElement.classList.contains('pv-nurseries')) { body.innerHTML = soon; return; }
    var sbc = window._supabaseClient;
    if (!sbc) { body.innerHTML = soon; return; }
    sbc.from('nurseries').select('id, name, url, country, instagram, note').order('sort_order').order('name').limit(500).then(function (r) {
      var rows = r && !r.error ? r.data || [] : [];
      if (!rows.length) { body.innerHTML = soon; return; }
      var html = '<p class="mypost-counts">' + (lang() === 'en' ? 'Nurseries: <span class="num">' + rows.length + '</span>' : 'ナーセリー <span class="num">' + rows.length + '</span> 件') + '</p><ol class="entries nursery-list">';
      rows.forEach(function (a) {
        var sub = [esc(a.country), a.instagram ? '<a href="' + esc(a.instagram) + '" target="_blank" rel="noopener noreferrer">Instagram</a>' : ''].filter(Boolean).join(' · ');
        html += '<li class="entry"><div class="entry__main">' + extLink(a, esc(a.name), 'entry__name') + '<span class="entry__sub">' + sub + '</span>'
          + (a.note ? '<p class="people__note">' + esc(a.note) + '</p>' : '') + '</div></li>';
      });
      body.innerHTML = html + '</ol>';
    }, function () { body.innerHTML = soon; });
  };
  // 「この植物についての記事」 on a plant page: topics match the entry's name exactly (never a partial match)
  function renderArticlesFor(d) {
    var sec = document.getElementById('reading-for-section'), box = document.getElementById('reading-for-container');
    if (!sec || !box) return;
    sec.classList.add('d-none'); box.innerHTML = '';
    loadArticles(function (rows) {
      var mine = rows.filter(function (a) { return (a.topics || []).indexOf(d.fullName) !== -1; });
      var h1 = document.querySelector('#page-cultivar h1');
      if (!mine.length || !h1 || h1Key(h1) !== d.fullName) return;
      var li = function (a) { return '<li>' + extLink(a, esc(a.title)) + ' <span class="num">' + [esc(a.site), esc(yearOfDate(a.published_on))].filter(Boolean).join(' · ') + '</span></li>'; };
      var html = '<div class="related__group"><ul>' + mine.slice(0, 3).map(li).join('') + '</ul>';
      if (mine.length > 3) html += '<details class="timeline__fold"><summary>' + (lang() === 'en' ? (mine.length - 3) + ' more' : 'ほか ' + (mine.length - 3) + ' 件') + '</summary><ul>' + mine.slice(3).map(li).join('') + '</ul></details>';
      html += '</div><p class="related__exit"><a href="' + esc(base + 'reading/') + '" data-nav="reading">読みもの一覧へ →</a></p>';
      box.innerHTML = html;
      sec.classList.remove('d-none');
    });
  }
  // /wanted/ and /ig/ depend on which entries have a photo: draw them again once the photo list is in
  document.addEventListener('ao:thumbs', function () {
    var w = document.getElementById('page-wanted'), g = document.getElementById('page-ig');
    if (w && w.classList.contains('active')) window.renderWantedPage();
    if (g && g.classList.contains('active')) window.renderIgPage();
    var x = document.getElementById('page-explore');
    if (x && x.classList.contains('active')) window.renderExplorePage();
  });
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
    var entries = all.filter(function (d) { return d.type !== 'seedling' && d.state === 'ok'; });
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
    // Japanese text ends a sentence only at 。！？ — 「A. warocqueanum」「R. L. Dressler」「Gard. Chron.」 are not ends;
    // English text at '. ' after a word of three letters or more that is not capitalised (board 11)
    var m = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('！'), cut.lastIndexOf('？'));
    if (m < 0 && !/[぀-ヿ一-鿿]/.test(cut)) {
      var re = /[a-z0-9)]{3,}\. /g, hit;
      while ((hit = re.exec(cut))) m = hit.index + hit[0].length - 2;
    }
    if (m > max * 0.5) return cut.slice(0, m + 1);
    return cut + '…';
  }
  var _storyPost = '', _storyD = null;
  document.addEventListener('click', function (e) {
    var s = e.target.closest && e.target.closest('[data-story-share]');
    if (!s || !_storyD || !window.shareTextFor) return;
    var text = window.shareTextFor(_storyD);
    var track = function (ch) { if (typeof gtag === 'function') gtag('event', 'share_click', { cultivar: _storyD.displayName, channel: ch, source: 'story' }); };
    if (navigator.share) { navigator.share({ text: text }).then(function () { track('os'); }, function () {}); return; }
    navigator.clipboard.writeText(text).then(function () { showToast(T('share_band_copied')); track('copy'); }, function () { showToast(T('story_copy_failed'), true); });
  });
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-story-copy]');
    if (!c || !_storyPost) return;
    navigator.clipboard.writeText(_storyPost).then(function () { showToast(T('story_copied')); }, function () { showToast(T('story_copy_failed'), true); });
    if (typeof gtag === 'function') gtag('event', 'share_click', { channel: 'instagram_copy', source: 'story' });
  });
  // The leaf of the day turns at 0 時 in Japan (it turned at 9 時, on the UTC day, until 11-26)
  function storyDay() { return Math.floor((Date.now() + 9 * 36e5) / 864e5); }
  // The leaf waits for every record (several seconds on a phone): a reader who has been here today sees the copy
  // kept on their phone at once, and it is drawn again when the records are in (11-26)
  var STORY_KEY = 'ao-story';
  window.aoPaintStoryCopy = function () {
    var body = document.getElementById('story-body');
    if (!body || !body.querySelector('.loading-text')) return;
    try {
      var o = JSON.parse(localStorage.getItem(STORY_KEY) || 'null');
      if (!o || o.day !== storyDay() || o.lang !== lang() || !o.html) return;
      body.innerHTML = o.html;
      var dateEl = document.getElementById('story-date');
      if (dateEl && o.date) dateEl.textContent = o.date;
    } catch (er) {}
  };
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
    var day = storyDay();
    var d = pool[day % pool.length];
    var thumb = thumbUrl(d.displayName);
    var text = lang() === 'en' ? d.textEn : d.text;
    var html = '';
    if (thumb) html += '<figure class="story__figure">' + link(d, '<img src="' + esc(thumb) + '" alt="' + esc(d.displayName) + '" loading="lazy" decoding="async">') + '</figure>';
    html += '<h2 class="story__title">' + link(d, sciNameHtml(d.shownName)) + '</h2>';
    var cite = citeHtml(d);
    if (cite) html += '<p class="story__cite mono">' + cite + '</p>';
    var ex = excerpt(text, lang() === 'en' ? 320 : 170);
    // no drop cap: the text opens with a scientific name, and a raised first letter splits it ('A nthurium')
    html += '<p class="story__body">' + (window.italicizeSciNames ? window.italicizeSciNames(esc(ex)) : esc(ex)) + '</p>';
    html += link(d, esc(T('story_more')), 'story__more');
    // the leaf changes every day: yesterday's is one tap away (board 17 T221; no streak counts)
    var yd = pool.length > 1 ? pool[(day - 1 + pool.length) % pool.length] : null;
    if (yd && yd !== d && lang() !== 'en') html += '<p class="story__yesterday">昨日の一葉: ' + link(yd, sciNameHtml(yd.shownName)) + '<span class="story__tomorrow">次の一葉は 0 時に替わります</span></p>';
    // for the owner's Instagram post: the text to paste and the 1080×1350 image made in CI (T94)
    if (d.state === 'ok' && window.ogSlug) {
      html += '<p class="story__share"><button type="button" class="story__copy" data-story-share>' + esc(T('detail_share')) + '</button></p>';
      _storyD = d;
      // Instagram does not link a URL in a caption: the profile link goes to /ig/, where the plate number leads on
      // (T147). Tags only from the registered name and its katakana alias, never guessed.
      var plate = window.igPlateNo ? window.igPlateNo(d.fullName) : '';
      var tags = ['#アンスリウム', '#Anthurium'];
      var st = (window.cultivarData || {})[d.fullName] || {};
      var kanaAlias = (st._aliases || []).filter(function (a) { return /[ァ-ヺー]/.test(a); })[0];
      if (kanaAlias) tags.push('#' + kanaAlias.replace(/[・\s]/g, ''));
      if (!/\b(sp|aff|cf)\./.test(d.fullName) && d.genus && d.epithet) tags.push('#' + (d.genus + d.epithet).toLowerCase().replace(/[^a-z0-9]/g, ''));
      tags.push('#AroidOrigins');
      _storyPost = [d.shownName + (citeHtml(d) ? ' — ' + citeHtml(d).replace(/<[^>]+>/g, '') : ''), excerpt(text, 120), plate ? 'プロフィールのリンク → 図版 ' + plate : (window.getShareUrl ? window.getShareUrl(d.fullName) : ''), tags.join(' ')].filter(Boolean).join('\n\n');
      window._storyIg = { name: d.shownName, img: base + 'images/ig/' + window.ogSlug(d.genus, d.fullName) + '.png' };
    }
    body.innerHTML = html;
    if (window.linkGlossaryTerms) window.linkGlossaryTerms(body.querySelector('.story__body'), 3);
    try { localStorage.setItem(STORY_KEY, JSON.stringify({ day: day, lang: lang(), html: body.innerHTML, date: dateEl ? dateEl.textContent : '' })); } catch (er) {}
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
        html += '<li>' + link(d, sciNameHtml(d.shownName)) + (d.year ? '<span class="mono">' + d.year + '</span>' : '') + '</li>';
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
    var pub = all; // individuals (原種・Clone) are names in the lists since 11-25
    renderMastheadGenera(pub);
    renderLedgerStats(pub);
    renderStory(all);
    renderIndex(pub);
    renderTimeline(pub);
  }

  /* ============================================================
     ENTRIES LEDGER (replaces "recently updated" cards)
     ============================================================ */
  var _ledgerArgs = null, _ledgers = {};
  window.refreshEntriesLedger = function () {
    Object.keys(_ledgers).forEach(function (id) { var a = _ledgers[id]; if (document.body.contains(a[0])) window.renderEntriesLedger.apply(null, a); else delete _ledgers[id]; });
  };
  window.renderEntriesLedger = function (grid, items, thumbMap, opts) {
    _ledgerArgs = [grid, items, thumbMap, opts];
    _ledgers[grid.id || 'grid'] = _ledgerArgs;
    // drawn from bare rows first; drawn again once the full entries (tags, verification) are in
    if (!window._dataFullyLoaded) waitForData(function () { var a = _ledgers[grid.id || 'grid']; if (a && a[0] === grid) window.renderEntriesLedger.apply(null, a); });
    thumbMap = thumbMap || {};
    opts = opts || {};
    var baseUrl = window._SUPABASE_URL || '';
    // The front page ledger is a record of the archive growing: show the date
    var withDate = !!opts.showDate;
    if (withDate) {
      var weekAgo = Date.now() - 7 * 864e5;
      var week = items.filter(function (it) { return new Date(it.created_at || it.updated_at || 0).getTime() >= weekAgo; }).length;
      var countEl = document.getElementById('new-entries-count');
      if (countEl && !countEl.innerHTML) countEl.textContent = '';   // 「この 1 週間」 fills it (board 17 T221)
    }
    var html = '<ol class="entries">', lastDay = '', fetched = items;
    if (withDate && grid.id === 'recently-updated-grid') {
      var newest = items.reduce(function (m, it) { return Math.max(m, new Date(it.created_at || it.updated_at || 0).getTime()); }, 0);
      var quiet = Date.now() - newest > 14 * 864e5;
      var newH = document.querySelector('#front-new .section-title');
      if (newH) newH.textContent = T(quiet ? 'new_entries_title_quiet' : 'new_entries_title');
      if (quiet) withDate = false;
    }
    if (opts.max) items = items.slice(0, opts.max);
    items.forEach(function (item) {
      var origins = (item.origins || []);
      var formula = null;
      origins = origins.filter(function (o) { if (o && o._type === 'formula') { formula = o.formula; return false; } return true; });
      // the full entry (tags, verification, parents) when the archive is loaded, else the bare row
      var cached = (typeof cultivarData !== 'undefined' && cultivarData[item.cultivar_name]) || null;
      var d = describe(item.cultivar_name, cached || { origins: origins, formula: formula, _type: item.type, _id: item.id }, item.type);
      var stamp = withDate ? (item.created_at || item.updated_at || '') : '';
      // the map passed in may predate the thumbnails query; fall back to the live one
      if (!thumbMap[d.displayName] && window._thumbMap && window._thumbMap[d.displayName]) thumbMap[d.displayName] = window._thumbMap[d.displayName];
      var thumb = thumbMap[d.displayName] && baseUrl ? (window.galleryImg ? window.galleryImg(thumbMap[d.displayName], 120) : baseUrl + '/storage/v1/object/public/gallery-images/' + thumbMap[d.displayName]) : '';
      // new entries: one date heading per day (「2026.10.03 — 8 品種」) instead of the date on every line (T91)
      var day = stamp ? fmtDate(stamp) : '';
      if (withDate && day && day !== lastDay) {
        lastDay = day;
        var n = fetched.filter(function (it) { var st = it.created_at || it.updated_at || ''; return st && fmtDate(st) === day; }).length;
        html += '<li class="entries__day"><span class="num">' + esc(day) + '</span> — ' + esc(T('entries_day_count').replace('{n}', n)) + '</li>';
      }
      html += window.entryLine(d, { thumb: thumb, date: '', noPerson: opts.noPerson, noCountry: opts.noCountry });
    });
    html += '</ol>';
    grid.innerHTML = html;
  };

  /* ============================================================
     DETAIL PAGE: specimen label + related entries
     ============================================================ */
  var _detailArgs = null;
  function cell(k, v) { return v ? '<div class="specimen__cell"><span class="specimen__k">' + esc(T(k)) + '</span><span class="specimen__v">' + v + '</span></div>' : ''; }
  // a parent is written as recorded and never linked: the same name on two plants does not make them the same
  // individual, so a cross is not tied to any entry by name (owner, 11-02)
  function parentHtml(all, name) { return sciNameHtml(name); }
  // why a required field is empty: sine loc. / not applicable are facts; anything else is 記録なし (not yet checked)
  function absentHtml(d, field) {
    var v = d.absent[field];
    var key = v === 'sine_loc' ? 'absent_sine_loc' : v === 'not_applicable' ? 'absent_na' : 'absent_none';
    return '<span class="absent' + (key === 'absent_none' ? ' absent--none' : '') + '">' + esc(T(key)) + '</span>';
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
      cells += cell('spec_region', distributionHtml(d.originRegion || d.habitat));
      cells += cell('spec_closest', esc(d.closestSpecies));
      cells += cell('spec_introduced_by', esc(d.introducedBy));
      cells += cell('spec_trade_names', esc(d.tradeNames.join(' / ')));
      cells += cell('spec_working_name', esc(d.workingNameOrigin));
    } else if (d.type === 'species') {
      cells += cell('spec_author', linkPeople(d.author) || absentHtml(d, 'author_name'));
      cells += cell('spec_pub_year', yearSpan(d.pubYear) || absentHtml(d, 'publication_year'));
      cells += cell('spec_collector', linkPeople(d.collector));
      cells += cell('spec_col_year', yearSpan(d.colYear));
      // type locality and distribution with the same value take one cell
      if (d.locality && d.habitat && d.locality === d.habitat) cells += cell('spec_locality_habitat', distributionHtml(d.locality));
      else {
        cells += cell('spec_locality', d.locality ? esc(countryLabel(d.locality)) : absentHtml(d, 'type_locality'));
        if (!d.locality && d.formLocality) cells += cell('spec_form_locality', esc(d.formLocality));
        cells += cell('spec_habitat', distributionHtml(d.habitat) || absentHtml(d, 'known_habitats'));
      }
    } else {
      if (d.isIndividual) cells += cell('individual_namer', linkPeople(d.namer));
      else if (d.type === 'clone' && !d.breeder && d.namer) cells += cell('spec_namer', linkPeople(d.namer));
      else if (d.breederSaid) cells += cell('spec_breeder', esc(d.breederSaid) + ' <span class="absent">' + esc(T('parentage_unconfirmed')) + '</span>');
      else cells += cell('spec_breeder', linkPeople(d.breeder || d.namer || d.creator) || (d.type === 'seedling' || d.isIndividual ? '' : absentHtml(d, 'breeder')));
      cells += cell(d.type === 'seedling' ? 'spec_sowing' : d.isIndividual ? 'individual_year' : 'spec_year', d.type === 'seedling' ? esc(/^\d{4}-\d{2}-\d{2}/.test(d.sowing) ? fmtDate(d.sowing) : d.sowing) : ((d.namingYear || d.year) ? '<span class="num">' + (d.namingYear || d.year) + '</span>' : ''));
      var unconfirmed = d.tags.indexOf('parentage_unconfirmed') !== -1;
      if (d.parentA || d.parentB) cells += cell('spec_parents', parentHtml(all, d.parentA || T('lineage_unknown')) + ' × ' + parentHtml(all, d.parentB || T('lineage_unknown')) + (unconfirmed ? ' <span class="absent">' + esc(T('parentage_unconfirmed')) + '</span>' : ''));
      else if (d.type === 'hybrid') cells += cell('spec_parents', d.formulaStatus === 'unknown' ? esc(T('lineage_unknown')) : absentHtml(d, 'formula'));
    }
    if (d.selectedFrom) {
      // an individual names its species; a Clone selected from another plant names that plant
      var parentSp = all.filter(function (x) { return x.id && x.id === d.selectedFrom; })[0];
      if (parentSp) cells = cell(d.isIndividual ? 'spec_selected_from' : 'spec_selected_from_clone', link(parentSp, sciNameHtml(parentSp.shownName))
        + (d.tags.indexOf('selection_unconfirmed') !== -1 ? ' <span class="absent">' + esc(T('parentage_unconfirmed')) + '</span>' : '')) + cells;
    }
    // an individual: who brought it in and where it came from
    if (d.isIndividual) cells += cell('spec_introduced_by', linkPeople(d.introducedBy)) + cell('individual_acquisition', d.acquisition ? esc(T('acq_' + d.acquisition)) : '') + cell('spec_acquired_from', esc(d.acquiredFrom)) + cell(d.acquisition === 'wild' ? 'spec_collected_at' : 'spec_region', distributionHtml(d.originRegion || d.formLocality || d.locality || d.habitat));
    // on the label: at most three Latin-script names; katakana stays for search and JSON-LD
    // an alias with sp./aff./cf. on a Hybrid, Clone or individual contradicts the kind: kept for search, not shown
    var qualifierClash = function (a) { return d.type !== 'species' && /\b(sp|aff|cf)\./.test(a); };
    var labelAliases = (d.aliases || []).filter(function (a, i, arr) { return /[A-Za-z]/.test(a) && !/[゠-ヿ]/.test(a) && arr.indexOf(a) === i && !qualifierClash(a) && d.displayName.toLowerCase().indexOf("'" + a.toLowerCase() + "'") === -1; }).slice(0, 3);
    // under the name, not in the label (BOARD 10-07 T73)
    var aliasEl = document.getElementById('detail-aliases');
    if (aliasEl) {
      aliasEl.textContent = labelAliases.length ? T('spec_aliases') + ': ' + labelAliases.join(' / ') : '';
      aliasEl.classList.toggle('d-none', !labelAliases.length);
    }
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
  /* ---------- name-confusion pages (BOARD 10-07b T99): /names/<slug>/ from data/names.json ---------- */
  var _names = null;
  function loadNames(cb) {
    if (_names) { cb(_names); return; }
    var av = ((document.querySelector('script[src*="archive.js"]') || {}).src || '').split('v=')[1] || '1';
    fetch(base + 'data/names.json?v=' + av).then(function (r) { return r.ok ? r.json() : { pages: [] }; })
      .then(function (j) { _names = j || { pages: [] }; cb(_names); }, function () { _names = { pages: [] }; cb(_names); });
  }
  function nameItemHtml(it, store) {
    var e = it.entry && store[it.entry] ? describe(it.entry, store[it.entry], store[it.entry]._type) : null;
    var title = e ? link(e, sciNameHtml(e.shownName)) : sciNameHtml(it.name || it.entry || '');
    var src = (it.sources || []).map(function (s) { return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.label) + '</a>'; }).join(' · ');
    return '<li class="names__item"><p class="names__name">' + title + '<span class="names__kind">' + esc(it.kind || (e ? kindWord(e) : '')) + '</span></p>'
      + '<p class="names__text">' + window.italicizeSciNames(esc(it.text || '')) + '</p>' + (src ? '<p class="names__src">' + esc(T('source_label')) + ' ' + src + '</p>' : '') + '</li>';
  }
  // a names title: scientific names and a bare epithet (crystallinum) in italics, cultivar names in quotes stay roman
  function namesTitleHtml(t) {
    return window.italicizeSciNames(esc(t)).replace(/(^|[\s・（(])([a-z][a-z-]{3,})(?=[\s・）)]|$)/g, '$1<i>$2</i>');
  }
  window.renderNamesPage = function (slug) {
    var body = document.getElementById('names-body'), title = document.getElementById('names-title'), crumb = document.getElementById('names-crumb');
    if (!body) return;
    loadNames(function (j) {
      waitForData(function () {
        var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
        var pages = j.pages || [];
        var pg = slug ? pages.filter(function (x) { return x.slug === slug; })[0] : null;
        if (!pg) {
          if (title) title.textContent = '名前の違い';
          if (crumb) crumb.textContent = '名前の違い';
          body.innerHTML = '<p class="people__intro">名前が似ていても別の植物、という例をまとめています。</p><ul class="names__index">'
            + pages.map(function (x) { return '<li><a href="' + esc(base + 'names/' + x.slug + '/') + '" data-nav="names" data-name-slug="' + esc(x.slug) + '">' + namesTitleHtml(x.title) + '</a></li>'; }).join('') + '</ul>';
          if (typeof updateMeta === 'function') setTimeout(function () { updateMeta({ title: '名前の違い — 似た名前の別の植物 | Aroid Origins', description: pages.map(function (x) { return x.title; }).join('、'), path: 'names/' }); }, 0);
          return;
        }
        if (title) title.innerHTML = namesTitleHtml(pg.title);
        if (crumb) crumb.innerHTML = namesTitleHtml(pg.title);
        body.innerHTML = '<p class="names__lead">' + window.italicizeSciNames(esc(pg.lead)) + '</p><ol class="names__list">' + pg.items.map(function (it) { return nameItemHtml(it, store); }).join('') + '</ol>'
          + '<p class="names__summary">' + window.italicizeSciNames(esc(pg.summary)) + '</p><p class="related__exit"><a href="' + esc(base + 'names/') + '" data-nav="names">名前の違いの一覧 →</a></p>';
        if (typeof updateMeta === 'function') setTimeout(function () { updateMeta({ title: pg.title + ' | Aroid Origins', description: (pg.lead + ' ' + pg.summary).slice(0, 120), path: 'names/' + pg.slug + '/' }); }, 0);
      });
    });
  };
  // on an entry a names page covers: one line pointing to it
  // the meaning of the species epithet (board 16 C2): only what a botanical publication or IPNI states in so many
  // words, with that source; no translation worked out from a dictionary. Checked 2026-11-16.
  var EPITHETS = {
    carlablackiae: { jp: 'パナマ・チリキ州の園芸家 Carla Black さんにちなむ。', en: 'Named after Carla Black, a horticulturist in Chiriquí, Panama.', src: 'Ortiz et al. 2020, Phytotaxa 467(1): 10', url: 'https://www.ipni.org/n/77212524-1' },
    debile: { jp: '栽培すると近縁の A. luxurians より弱く育つことから（debilis は「弱い」）。', en: 'From its weaker growth in cultivation than its relative A. luxurians (debilis, "weak").', src: 'Croat & Cirino 2005, Aroideana 28', url: 'https://www.aroid.org/gallery/croat/0280007.pdf' },
    dressleri: { jp: 'この種を再発見して栽培に導いた Robert Dressler 博士（スミソニアン熱帯研究所）にちなむ。', en: 'Named after Dr. Robert Dressler (Smithsonian Tropical Research Institute), who rediscovered it and brought it into cultivation.', src: 'Croat 1978, Aroideana 1: 54', url: 'https://www.aroid.org/gallery/croat/0010202.pdf' },
    faustomirandae: { jp: 'メキシコで活動したスペイン出身の植物学者 Faustino Miranda（1905–1964）にちなむ。この種を最初に採集し、栽培に導いた人。', en: 'Named after Faustino Miranda (1905–1964), the Spanish botanist who worked in Mexico, first collected this species and brought it into cultivation.', src: 'Pérez-Farrera & Croat 2001, Novon 11: 88', url: 'https://archive.org/download/biostor-64456/biostor-64456.pdf' },
    forgetii: { jp: 'Sander 商会の採集人 Forget にちなむ。', en: 'Named after Forget, a collector for Sander.', src: 'IPNI', url: 'https://www.ipni.org/n/15285-2' },
    kunayalense: { jp: 'パナマのクナ・ヤラ（旧サン・ブラス）地方に結びつく種であることから。', en: 'From its association with Kuna Yala (formerly San Blas), Panama.', src: 'Croat & Vannini 2010, Aroideana 33: 162', url: 'https://www.aroid.org/gallery/croat/0330004.pdf' },
    luxurians: { jp: '科の中でも特に美しい観賞植物であることから（luxurians は「豪華な」）。', en: 'From its being one of the most beautiful ornamentals in the family (luxurians, "luxuriant").', src: 'Croat & Cirino 2005, Aroideana 28', url: 'https://www.aroid.org/gallery/croat/0280007.pdf' },
    veitchii: { jp: 'この植物を導入した Veitch 商会にちなむ。採集人 Wallis の依頼で名づけられた。', en: 'Named after Messrs. Veitch, who introduced it, at the request of the collector Wallis.', src: 'Gard. Chron. n.s. 6 (1876)', url: 'https://archive.org/details/gardenerschronic61876lond' },
    warocqueanum: { jp: 'ベルギーの著名な愛好家 M. Warocqué に献名。', en: 'Dedicated to M. Warocqué, an eminent Belgian amateur.', src: 'T. Moore, Florist & Pomologist 1878: 101', url: 'https://archive.org/details/floristandpomol03hogggoog' },
    besseae: { jp: 'セルビー植物園の長年の後援者で、タイプ標本の元株を採集した Libby Besse さんにちなむ。', en: 'Named after Libby Besse, a long-time supporter of Selby Botanical Gardens, who collected the plant the type came from.', src: 'Croat & Acebey 2005, Novon 15: 84', url: 'https://www.missouribotanicalgarden.org/Portals/0/staff/PDFs/croat/NewSpeciesBolivia_Croat-Acebey_Novon-15-01-80.pdf' }
  };
  function renderRecordHeadNotes(d, all) {
    var el = document.getElementById('record-head-notes');
    if (!el) return;
    var en = typeof currentLang !== 'undefined' && currentLang === 'en';
    var html = '';
    var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
    var byId = function (id) { var k = Object.keys(store).filter(function (n) { return store[n] && String(store[n]._id) === String(id); })[0]; return k || null; };
    var link = function (key) { var e = store[key] || {}; var dd; try { dd = describe(key, e, e._type); } catch (er) { return esc(key); } return '<a href="' + esc(dd.href) + '" data-nav="cultivar" data-key="' + esc(key) + '">' + sciNameHtml(dd.shownName || key) + '</a>'; };
    if (d.isSynonym && d.synonymOf) {
      var acc = byId(d.synonymOf);
      if (acc) html += '<p class="record-head-note record-head-note--synonym">' + esc(T('synonym_of_note')) + ' ' + link(acc) + '</p>';
    }
    if (d.type === 'species' && !d.isIndividual && d.id != null) {
      var syn = Object.keys(store).filter(function (n) { var t = (store[n] && store[n]._tags) || []; return t.indexOf('synonym_of:' + d.id) !== -1; });
      if (syn.length) html += '<p class="record-head-note record-head-note--synonym">' + esc(T('synonyms_note')) + ' ' + syn.map(link).join('・') + '</p>';
    }
    var ep = d.type === 'species' && !d.isIndividual && !d.qualifier && EPITHETS[String(d.epithet || '').toLowerCase()];
    if (ep) html += '<p class="record-head-note record-head-note--epithet"><span class="record-head-note__label">' + esc(T('epithet_meaning')) + '</span> ' + esc(en ? ep.en : ep.jp) + ' <span class="record-head-note__src">（' + esc(T('source_word')) + ': <a href="' + esc(ep.url) + '" target="_blank" rel="noopener">' + esc(ep.src) + '</a>）</span></p>';
    el.innerHTML = html;
  }
  function renderNameNote(d) {
    var el = document.getElementById('names-note');
    if (!el) return;
    el.innerHTML = '';
    loadNames(function (j) {
      var hit = (j.pages || []).filter(function (pg) { return pg.items.some(function (it) { return it.entry === d.fullName; }); })[0];
      if (!hit) return;
      // the other names only (this entry is not listed against itself), then the page that tells them apart (board 11)
      var bare = function (n) { return String(n || '').replace(/^Anthurium\s+/, '').trim(); };
      var self = bare(d.shownName || d.displayName || d.fullName);
      var others = (hit.items || []).map(function (it) { return it.entry || it.name; }).filter(function (n) { return n && n !== d.fullName && bare(n) !== self; })
        .map(function (n) { return sciNameHtml(String(n).replace(/^Anthurium\s+(?=')/, '')); }).join('・');
      if (!others) return;
      el.innerHTML = '<p class="names-note">' + esc(T('names_note')) + ' ' + others + ' — <a href="' + esc(base + 'names/' + hit.slug + '/') + '" data-nav="names" data-name-slug="' + esc(hit.slug) + '">' + esc(T('names_note_link')) + ' →</a></p>';
    });
  }

  /* ---------- specimen labels to print (BOARD 10-07b T89) ---------- */
  var _labelEntry = null;
  function loadQr(cb) {
    if (window.qrcode) { cb(); return; }
    var sc = document.createElement('script');
    sc.src = base + 'js/vendor/qrcode.js';
    sc.onload = function () { cb(); };
    sc.onerror = function () { showToast(T('label_qr_error'), true); };
    document.head.appendChild(sc);
  }
  function labelHtml(d) {
    var url = window.getShareUrl ? window.getShareUrl(d.fullName) : 'https://aroidorigins.com/';
    var q = window.qrcode(0, 'M'); q.addData(url); q.make();
    var qr = q.createSvgTag({ cellSize: 2, margin: 0, scalable: true });
    var species = d.type === 'species' && !d.isIndividual;
    var who = species ? d.author : (d.breeder || d.namer || d.creator);
    var year = species ? d.pubYear : (d.namingYear || d.year);
    var place = species ? countryLabel(d.country || d.locality) : (d.parentA || d.parentB ? (d.parentA || '?') + ' × ' + (d.parentB || '?') : '');
    var ver = d.verifiedAt ? '✓ ' + T('verified_label') + ' ' + fmtDate(d.verifiedAt) : '';
    return '<div class="lb"><div class="lb__t"><p class="lb__k">' + esc(kindWord(d)) + '</p><p class="lb__n">' + sciNameHtml(d.shownName) + '</p>'
      + (who ? '<p class="lb__l">' + esc(who) + (year ? ' · ' + year : '') + '</p>' : (year ? '<p class="lb__l">' + year + '</p>' : ''))
      + (place ? '<p class="lb__l">' + sciNameHtml(place) + '</p>' : '')
      + (ver ? '<p class="lb__v">' + esc(ver) + '</p>' : '') + '<p class="lb__s">Aroid Origins</p></div><div class="lb__q">' + qr + '</div></div>';
  }
  function printLabels(d) {
    var w = window.open('', '_blank');
    if (!w) { showToast(T('label_popup'), true); return; }
    var one = labelHtml(d);
    var page = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>' + esc(d.shownName) + ' — label</title>'
      + '<style>@page{size:A4;margin:10mm}body{margin:0;font-family:"BIZ UDPGothic","Noto Sans JP",sans-serif;color:#1E2622}'
      + '.bar{padding:12px;font-size:14px;display:flex;gap:12px;align-items:center}.bar select,.bar button{font-size:16px;min-height:44px;padding:0 12px}'
      + '.sheet{display:grid;grid-template-columns:91mm 91mm;grid-auto-rows:55mm;gap:4mm;justify-content:center}'
      + '.lb{box-sizing:border-box;border:0.3mm solid #1E2622;padding:4mm;display:flex;gap:3mm;overflow:hidden}.lb__t{flex:1;min-width:0}'
      + '.lb__k{margin:0;font-size:8pt;color:#5B655F}.lb__n{margin:1mm 0 2mm;font-family:"Cormorant Garamond","Shippori Mincho",serif;font-weight:600;font-size:13pt;line-height:1.15}'
      + '.lb__l{margin:0 0 1mm;font-size:8.5pt}.lb__v{margin:1mm 0 0;font-size:7.5pt;color:#2F5D4A}.lb__s{margin:2mm 0 0;font-size:7pt;letter-spacing:.12em;color:#5B655F}'
      + '.lb__q{width:20mm;flex:0 0 20mm;align-self:flex-end}.lb__q svg{width:20mm;height:20mm;display:block}'
      + '@media print{.bar{display:none}}</style></head><body>'
      + '<div class="bar"><label>' + esc(T('label_count')) + ' <select id="n"><option>1</option><option>2</option><option>4</option><option selected>8</option></select></label>'
      + '<button onclick="window.print()">' + esc(T('label_do_print')) + '</button></div><div class="sheet" id="s"></div>'
      + '<script>var one=' + JSON.stringify(one).replace(/</g, '\\u003c') + ';function draw(){var n=+document.getElementById("n").value,h="";for(var i=0;i<n;i++)h+=one;document.getElementById("s").innerHTML=h;}document.getElementById("n").onchange=draw;draw();<\/script>'
      + '</body></html>';
    w.document.write(page); w.document.close();
    if (typeof gtag === 'function') gtag('event', 'label_print', { cultivar: d.displayName, member: !!window._isSubscribed });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#detail-print-label');
    if (!b) return;
    e.preventDefault();
    if (!_labelEntry) return;
    if (!window._currentUser) { showToast(T('label_login'), false); if (window.startGoogleLogin) window.startGoogleLogin(location.pathname, 'label_print'); return; }
    var d = _labelEntry;
    loadQr(function () { printLabels(d); });
  });

  // 「名前・番号・URL をコピー」: a few lines for a hand-over or a listing (board 16 C7)
  window.individualCopyText = function (d) {
    var url = window.getShareUrl ? window.getShareUrl(d.fullName) : 'https://aroidorigins.com' + d.href;
    var sp = (d.selectedFrom && typeof cultivarData !== 'undefined') ? Object.keys(cultivarData).filter(function (k) { return cultivarData[k] && cultivarData[k]._id === d.selectedFrom; })[0] : '';
    var code = d.indCode || (String(d.shownName || '').match(/'[^']*'(?:[A-Za-z]+')?/) || [''])[0];
    return [d.shownName, sp ? '種: ' + sp : '', code ? '番号・名前: ' + code : '', d.namer ? 'つけた人: ' + d.namer : '', url].filter(Boolean).join('\n');
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#detail-copy-individual');
    if (!b || !_labelEntry) return;
    e.preventDefault();
    var text = window.individualCopyText(_labelEntry);
    var done = function () { showToast('コピーしました'); };
    var fallback = function () {
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (er) { showToast('コピーできませんでした', true); }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
    if (typeof gtag === 'function') gtag('event', 'individual_copy', {});
  });

  /* share text: {name} — {describer or breeder} {year}、{type locality or parentage}｜Aroid Origins {URL} */
  window.shareTextFor = function (d) {
    var who = d.type === 'species' ? d.author : (d.breeder || d.namer || d.creator);
    var where = d.type === 'species' ? (d.locality || d.habitat) : ((d.parentA || d.parentB) ? (clean(d.parentA) || T('lineage_unknown')) + ' × ' + (clean(d.parentB) || T('lineage_unknown')) : '');
    var head = [who, d.year].filter(Boolean).join(' ');
    var mid = [head, where].filter(Boolean).join('、');
    // canonical page URL: the static stubs carry the OGP tags, so no proxy is needed in the text
    var url = window.getShareUrl ? window.getShareUrl(d.fullName) : 'https://aroidorigins.com/' + d.genus.toLowerCase() + '/' + encodeURIComponent(d.epithet).replace(/'/g, '%27') + '/';
    return d.shownName + (mid ? ' — ' + mid : '') + '｜Aroid Origins ' + url;
  };
  /* one-time band after a registration: 収録しました · この台紙を共有 */
  function renderShareBand(d, entry) {
    var el = document.getElementById('share-band');
    if (!el) return;
    var flag = null;
    try { flag = sessionStorage.getItem('just_recorded'); } catch (e) {}
    if (!flag || flag !== d.fullName) { el.classList.add('d-none'); el.innerHTML = ''; return; }
    try { sessionStorage.removeItem('just_recorded'); } catch (e) {}
    drawShareBand(el, d, 'record');
  }
  // after a photo is sent: the same band, shorter (board 15 B15)
  document.addEventListener('ao:photo-sent', function (e) {
    var el = document.getElementById('share-band'), d = _labelEntry || (window._labelLast && window._labelLast.d);
    var pg = document.getElementById('page-cultivar');
    if (!el || !d || !pg || !pg.classList.contains('active') || (e.detail && String(e.detail).replace(' [Seedling]', '') !== d.displayName)) return;
    drawShareBand(el, d, 'photo');
  });
  function drawShareBand(el, d, kind) {
    var text = window.shareTextFor(d);
    if (kind === 'photo') {
      var nPh = document.querySelectorAll('#page-cultivar #gallery-carousel .gallery__item[data-user-upload]').length;
      var left = siteCounts().wanted;
      var me = window._currentUser;
      var nextLine = nPh <= 1
        ? '<p class="share-band__next">この名前の 1 枚目になりました。' + (me ? ' <a href="' + esc(base + 'profile/' + me.id) + '" data-nav="profile" data-userid="' + esc(me.id) + '">あなたのページ</a>に並びます。' : '') + '</p>'
        : '<p class="share-band__next">この名前の写真は ' + nPh + ' 枚目です。</p>';
      if (left) nextLine += '<p class="share-band__next">写真のない名前があと <span class="num">' + left + '</span> あります → <a href="' + esc(base + 'wanted/') + '" data-nav="wanted">写真を募集中</a></p>';
      el.innerHTML = '<p class="share-band__title">' + esc(T('share_band_photo_title')) + '</p>' + nextLine
        + '<p class="share-band__actions">'
        + '<button type="button" class="share-band__btn share-band__btn--main" id="share-band-share">共有</button>'
        + '<a class="share-band__btn" href="' + esc(base + 'mypost') + '" data-nav="mypost">自分の株を見る</a>'
        + '<button type="button" class="share-band__close" id="share-band-close" aria-label="閉じる">×</button></p>';
      el.classList.remove('d-none');
      var trackP = function (ch) { if (typeof gtag === 'function') gtag('event', 'share_click', { cultivar: d.displayName, channel: ch, source: 'photo' }); };
      document.getElementById('share-band-share').addEventListener('click', function () {
        if (navigator.share) { navigator.share({ text: text }).then(function () { trackP('os'); }, function () {}); return; }
        navigator.clipboard.writeText(text).then(function () { showToast(T('share_band_copied')); trackP('copy'); });
      });
      document.getElementById('share-band-close').addEventListener('click', function () { el.classList.add('d-none'); });
      return;
    }
    // four actions after recording (board 9 D6): share · add a photo · add a record · see my records
    var noPhoto = !document.querySelector('#page-cultivar .gallery__item[data-user-upload], #page-cultivar .plate img');
    el.innerHTML = '<p class="share-band__title">' + esc(T('share_band_title')) + '</p>'
      + '<p class="share-band__text">' + esc(text) + '</p>'
      + '<p class="share-band__actions">'
      + '<button type="button" class="share-band__btn' + (noPhoto ? '' : ' share-band__btn--main') + '" id="share-band-share">共有</button>'
      + '<button type="button" class="share-band__btn' + (noPhoto ? ' share-band__btn--main' : '') + '" id="share-band-photo">写真を追加</button>'
      + (d.type === 'seedling' ? '' : '<button type="button" class="share-band__btn" id="share-band-record">記録を追加</button>')
      + '<a class="share-band__btn" href="' + esc(base + 'mypost') + '" data-nav="mypost">自分の株を見る</a>'
      + '<button type="button" class="share-band__close" id="share-band-close" aria-label="閉じる">×</button></p>'
      + '<p class="share-band__note">共有したときのカード画像は、30 分ほどで用意されます。</p>';
    // after the third seedling or later: the allowance left and the members' notice, one line (board 9 D9)
    if (d.type === 'seedling' && window._currentUser && typeof cultivarData !== 'undefined') {
      var mine = Object.keys(cultivarData).filter(function (k) { var e = cultivarData[k]; return e && e._type === 'seedling' && e._userId === window._currentUser.id && / \[Seedling\]$/.test(k); }).length;
      if (mine >= 3 && !window._MEMBER_PAUSED) { el.innerHTML += '<p class="share-band__note">実生の無料枠 あと <span class="num">' + Math.max(0, 20 - mine) + '</span> 件 <span id="band-notify"></span></p>'; if (window.drawNotifyLink) window.drawNotifyLink(document.getElementById('band-notify'), 'seedling_done'); }
    }
    el.classList.remove('d-none');
    var track = function (ch) { if (typeof gtag === 'function') gtag('event', 'share_click', { cultivar: d.displayName, channel: ch, source: 'submit' }); };
    var url = window.getShareUrl ? window.getShareUrl() : location.href;
    document.getElementById('share-band-share').addEventListener('click', function () {
      if (navigator.share) { navigator.share({ text: text, url: url }).then(function () { track('os'); }, function () {}); return; }
      navigator.clipboard.writeText(text + ' ' + url).then(function () { showToast(T('share_band_copied')); track('copy'); });
    });
    document.getElementById('share-band-photo').addEventListener('click', function () { var pb = document.getElementById('detail-add-photo-btn'); if (pb) pb.click(); });
    var rb = document.getElementById('share-band-record');
    if (rb) rb.addEventListener('click', function () { var r = document.getElementById('detail-add-record-btn'); if (r) r.click(); });
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
  /* individuals of a species: numbered or named single plants ('HR1', 'Dark Star').
     Tied to the species by its id only: a number is someone's number, never matched by name (owner, 11-03) */
  function individualsOf(d, all) {
    if (!d.id) return [];
    return all.filter(function (x) { return x.isIndividual && x.fullName !== d.fullName && x.selectedFrom === d.id; });
  }
  // who numbered or named it; the same 'RA1' from two people is two plants
  function individualKeeper(x) { return x.namer || x.breeder || x.introducedBy || ''; }
  function individualCode(x, d) {
    if (x.indCode) return x.indCode;
    var c = x.epithet.indexOf(d.epithet) === 0 ? x.epithet.slice(d.epithet.length).trim() : x.epithet;
    return c.replace(/\s+\([^)]*\)$/, '').replace(/^['‘’"“”]+|['‘’"“”]+$/g, '');
  }
  function individualLine(x, d) {
    var t = thumbUrl(x.displayName, 160);
    var img = t ? '<img src="' + esc(t) + '" alt="" width="48" height="48" loading="lazy" decoding="async">' : '';
    var place = x.originRegion ? (countryLabel(countryOf(x.originRegion) || '') || x.originRegion) : '';
    var sub = [x.namingYear ? '<span class="num">' + x.namingYear + '</span>' : '', x.acquisition && x.acquisition !== 'unsure' ? esc(T('acq_' + x.acquisition)) : '', esc(place)]
      .filter(Boolean).map(function (s) { return '<span class="entry__seg">' + s + '</span>'; }).join(LABEL ? (lang() === 'en' ? ', ' : '、') : ' · ');
    return '<li class="entry"><a class="entry__link" href="' + esc(x.href) + '" data-nav="cultivar" data-key="' + esc(x.fullName) + '">'
      + '<span class="entry__thumb' + (img ? '' : ' entry__thumb--empty') + '" aria-hidden="true">' + img + '</span>'
      + '<span class="entry__main"><span class="entry__name individuals__code">&#39;' + esc(individualCode(x, d)) + '&#39;</span>'
      + (sub ? '<span class="entry__sub">' + sub + '</span>' : '') + '</span></a></li>';
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
    var titleEl = section.querySelector('[data-i18n="individuals_title"]');
    if (titleEl) titleEl.textContent = T(d.isIndividual ? 'individuals_siblings_title' : 'individuals_title');
    if (d.isIndividual && d.selectedFrom) {
      var sp = all.filter(function (x) { return String(x.id) === String(d.selectedFrom); })[0];
      if (!sp) { section.classList.add('d-none'); return; }
      var sibs = individualsOf(sp, all).filter(function (x) { return x.fullName !== d.fullName; });
      if (count) count.textContent = sibs.length ? String(sibs.length) : '';
      el.innerHTML = (sibs.length ? '<ul class="entries">' + sibs.map(function (x) { return individualLine(x, sp); }).join('') + '</ul>' : '<p class="individuals__note">' + esc(T('individuals_siblings_none')) + '</p>')
        + '<p class="individuals__back"><a href="' + esc(sp.href) + '" data-nav="cultivar" data-key="' + esc(sp.fullName) + '">← ' + sciNameHtml(sp.shownName) + ' のページへ</a></p>';
      section.classList.remove('d-none');
      return;
    }
    if (!isSpeciesPage) { section.classList.add('d-none'); return; }
    var list = individualsOf(d, all);
    // every individual on the species page itself, grouped by the person who numbered it (owner, 11-03)
    var groups = {}, order = [];
    list.forEach(function (x) {
      var k = individualKeeper(x), key = k.toLowerCase();
      if (!groups[key]) { groups[key] = { who: k, items: [] }; order.push(key); }
      groups[key].items.push(x);
    });
    order.sort(function (a, b) { return groups[b].items.length - groups[a].items.length || (groups[a].who ? 0 : 1) - (groups[b].who ? 0 : 1) || groups[a].who.localeCompare(groups[b].who); });
    var html = '<p class="individuals__note">' + esc(T(list.length ? 'individuals_note' : 'individuals_empty')) + '</p>';
    order.forEach(function (key) {
      var g = groups[key];
      g.items.sort(function (a, b) { return individualCode(a, d).localeCompare(individualCode(b, d), undefined, { numeric: true, sensitivity: 'base' }); });
      html += '<div class="individuals__group"><h3 class="individuals__who">' + (g.who ? linkPeople(g.who) : esc(T('individuals_who_unknown')))
        + '<span class="num">' + g.items.length + '</span></h3><ul class="entries">'
        + g.items.map(function (x) { return individualLine(x, d); }).join('') + '</ul></div>';
    });
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
      html += '<li>' + link(d, '<span>' + sciNameHtml(d.shownName) + '</span>') + (meta ? '<span class="num">' + esc(meta) + '</span>' : '') + '</li>';
    });
    return html + '</ul></div>';
  }
  // 「名札の図鑑」: the people who described it; the names of the same decade
  function renderLabelExtras(d, all) {
    var host = document.getElementById('label-extras');
    var spec = document.getElementById('specimen-label');
    // after the photos, before 由来の記録 — the photo stays near the top of the page
    if (!host) { host = document.createElement('div'); host.id = 'label-extras'; var car = document.getElementById('gallery-carousel'); var anchor = car && car.parentNode && car.parentNode.classList.contains('mb-lg') ? car.parentNode : spec; if (anchor) anchor.insertAdjacentElement('afterend', host); else return; }
    var html = '';
    if (d.type === 'species' && !d.isIndividual && d.author) {
      var people = splitPeople(d.author);
      if (people.length) {
        html += '<h2 class="section-title">記載者</h2>';
        people.forEach(function (key) {
          var au = authorityOf(key) || {};
          var cnt = all.filter(function (x) { return x.state === 'ok' && peopleOf(x).indexOf(key) !== -1; }).length;
          html += '<a class="person" href="' + esc(base + 'people/' + encodeURIComponent(personSlug(key)) + '/') + '" data-nav="people" data-person="' + esc(personSlug(key)) + '"><div><b>' + esc(au.name || key) + (au.years ? '（' + esc(au.years) + '）' : '') + '</b><span>' + esc(au.note || '') + (cnt > 1 ? (au.note ? '。' : '') + 'このサイトで ' + cnt + ' つの名前に関わる' : '') + '</span></div><span class="chev">›</span></a>';
        });
      }
    }
    host.innerHTML = html;
  }
  function renderRelated(d, all) {
    var section = document.getElementById('related-section');
    var el = document.getElementById('related-container');
    if (!section || !el) return;
    var others = all.filter(function (x) { return x.fullName !== d.fullName; });
    var myPeople = peopleOf(d);

    var sameCountry = d.country ? others.filter(function (x) { return x.type === 'species' && x.country === d.country; }) : [];
    var samePerson = myPeople.length ? others.filter(function (x) { return peopleOf(x).some(function (p) { return myPeople.indexOf(p) !== -1; }); }) : [];
    // previous / next within the same genus and the same broad group
    // quotes and sp./aff./cf. do not decide the order (aff. besseae sits next to besseae)
    var sortKey = function (x) { return x.displayName.replace(/['"‘’“”]/g, '').replace(/\b(?:sp|aff|cf)\.\s*/g, ''); };
    var KIND_RANK = { species: 0, hybrid: 1, clone: 2, seedling: 3 };
    var group = others.concat([d]).filter(function (x) { return x.genus === d.genus && (x.type === 'seedling') === (d.type === 'seedling') && !x.isIndividual && (x.type === 'seedling' || x.state === 'ok' || x.fullName === d.fullName); })
      .sort(function (a, b) { return ((KIND_RANK[a.type] || 0) - (KIND_RANK[b.type] || 0)) || sortKey(a).localeCompare(sortKey(b), undefined, { sensitivity: 'base' }); });
    var idx = -1;
    group.forEach(function (x, i) { if (x.fullName === d.fullName) idx = i; });
    var prev = idx > 0 ? group[idx - 1] : null;
    var next = idx >= 0 && idx < group.length - 1 ? group[idx + 1] : null;

    var groups = relatedGroupHtml('related_same_locality', sameCountry, d.country ? '<a href="' + esc(base + 'locality/' + encodeURIComponent(countrySlug(d.country)) + '/') + '" data-nav="locality" data-place="' + esc(countrySlug(d.country)) + '">' + esc(T('related_same_locality_n').replace('{country}', countryLabel(d.country)).replace('{n}', sameCountry.length)) + ' →</a>' : '')
      + relatedGroupHtml('related_same_person', samePerson);
    // the names described in the same decade (moved here from under the photos, board 16 G7)
    if (d.type === 'species' && !d.isIndividual && d.pubYear) {
      var dec = Math.floor(d.pubYear / 10) * 10;
      var era = others.filter(function (x) { return x.type === 'species' && !x.isIndividual && x.state === 'ok' && x.pubYear && Math.floor(x.pubYear / 10) * 10 === dec; }).sort(function (x, y) { return x.pubYear - y.pubYear; });
      groups += relatedGroupHtml('related_same_era', era, esc(T('related_same_era').replace('{dec}', dec)));
    }
    // a Clone or Hybrid ends with the people in its record: their pages are the next thing to read (board 16 C5;
    // never the parents — a parent's name is not a link, T192)
    if (d.type !== 'species' && d.type !== 'seedling' && !d.isIndividual && myPeople.length) {
      groups += '<div class="related__group"><h3>' + esc(T('related_people')) + '</h3><ul>' + myPeople.map(function (key) {
        var au = authorityOf(key) || {};
        var cnt = all.filter(function (x) { return x.state === 'ok' && peopleOf(x).indexOf(key) !== -1; }).length;
        return '<li><a href="' + esc(base + 'people/' + encodeURIComponent(personSlug(key)) + '/') + '" data-nav="people" data-person="' + esc(personSlug(key)) + '"><span>' + esc(au.name || key) + '</span></a><span class="num">' + cnt + '</span></li>';
      }).join('') + '</ul></div>';
    }
    // no empty frame under the heading when there is nothing to list (board 11)
    var html = groups ? '<div class="related__grid">' + groups + '</div>' : '';
    var relH = section.querySelector('.section-title');
    if (relH) relH.style.display = groups ? '' : 'none';
    if (prev || next) {
      html += '<nav class="related__nav" aria-label="' + esc(T('related_title')) + '">';
      if (prev) html += link(prev, '<span class="mono">← ' + esc(T('related_prev')) + '</span><span class="related__nav-name">' + sciNameHtml(prev.shownName) + '</span>');
      if (next) html += link(next, '<span class="mono">' + esc(T('related_next')) + ' →</span><span class="related__nav-name">' + sciNameHtml(next.shownName) + '</span>', 'related__nav--next');
      html += '</nav>';
    }
    // exit: back to the genus list (same locality is the heading above)
    html += '<p class="related__exit"><a href="' + esc(base + d.genus.toLowerCase() + '/') + '" data-nav="genus" data-genus="' + esc(d.genus.toLowerCase()) + '">' + esc(T('related_exit_ledger').replace('{genus}', d.genus)) + '</a>'
      + (idx >= 0 ? '<span class="related__pos num">' + (idx + 1) + ' / ' + group.length + '</span>' : '') + '</p>';
    // the exit line alone is reason enough to show the section
    el.innerHTML = html;
    section.classList.remove('d-none');
  }
  /* ============================================================
     PEOPLE: /people/ index and /people/<slug>/ pages
     ============================================================ */
  var ROLE_KEYS = { author: 'role_author', collector: 'role_collector', breeder: 'role_breeder', namer: 'role_namer', introducer: 'role_introducer', grower: 'role_grower' };
  /* people authority (wireframe/data/people-authority.json): IPNI abbreviation → full name, years, note */
  var _authority = null;
  function loadAuthority(cb) {
    if (_authority) { cb(_authority); return; }
    // same version as the scripts (the ?v= of archive.js), so an updated table is never hidden by a cache
    var av = ((document.querySelector('script[src*="archive.js"]') || {}).src || '').split('v=')[1] || '1';
    fetch(base + 'data/people-authority.json?v=' + av).then(function (r) { return r.ok ? r.json() : {}; })
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
          html += '<li><a href="' + esc(base + 'people/' + encodeURIComponent(p.slug) + '/') + '" data-nav="people" data-person="' + esc(p.slug) + '">' + esc(personLabel(p)) + (a && a.name && a.name !== p.key ? ' <span class="people__abbr mono">' + esc(p.key) + '</span>' : '') + '</a><span class="num">' + p.entries.length + '</span></li>';
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
    if (countries.length) facts += '<div><dt>' + esc(T('people_localities')) + '</dt><dd class="people__facts-small">' + esc(countries.map(function (c) { return window.countryLabel ? window.countryLabel(c) : c; }).join(lang() === 'en' ? ', ' : '、')) + '</dd></div>';
    facts += '</dl>';
    var authLine = auth ? [auth.name && auth.name !== p.key ? p.key : '', auth.years, auth.ipni && auth.ipni !== p.key ? 'IPNI: ' + auth.ipni : ''].filter(Boolean).join(' · ') : '';
    var html = '<p class="people__roles mono">' + rolesLine(p) + (authLine ? ' · ' + esc(authLine) : '') + '</p>' + (auth && auth.note ? '<p class="people__note">' + esc(auth.note) + '</p>' : '') + facts + '<h2 class="section-title"><span>' + esc(T('people_entries')) + '</span></h2><div id="people-ledger"></div>';
    body.innerHTML = html;
    var sorted = p.entries.slice().sort(function (a, b) { return (a.year || 9999) - (b.year || 9999) || a.displayName.localeCompare(b.displayName); });
    var thumbs = {};
    sorted.forEach(function (d) { var u = (typeof _thumbMap !== 'undefined') ? _thumbMap[d.displayName] : null; if (u) thumbs[d.displayName] = u; });
    if (typeof window.loadCultivarThumbnails === 'function') window.loadCultivarThumbnails();
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
  // places: recorded species only; a country page lists species whose type locality is there and species whose range
  // includes it. Places known only from the trade (unresolved names, 「流通」 regions) are not places (BOARD 10-07b T80).
  function placeGroups(all) {
    var map = {};
    var get = function (c) { return map[c] || (map[c] = { key: c, typeItems: [], rangeItems: [] }); };
    all.forEach(function (d) {
      if (d.type !== 'species' || d.isIndividual || d.state !== 'ok') return;
      if (d.speciesStatus === 'unresolved' || /流通/.test(d.originRegion)) return;
      var typeC = countryOf(d.locality);
      if (typeC) get(typeC).typeItems.push(d);
      countriesOf(d.habitat || d.originRegion).forEach(function (c) { if (c !== typeC) get(c).rangeItems.push(d); });
    });
    return Object.keys(map).map(function (k) { var g = map[k]; g.count = g.typeItems.length + g.rangeItems.length; return g; })
      .sort(function (a, b) { return b.count - a.count || a.key.localeCompare(b.key); });
  }
  function renderLocalityPageInner() {
    var body = document.getElementById('locality-body');
    var title = document.getElementById('locality-title');
    var crumbName = document.getElementById('locality-crumb-name');
    var crumbSep = document.getElementById('locality-crumb-sep');
    if (!body) return;
    var all = collectAll();
    var groups = placeGroups(all);
    var slug = _placeSlug ? decodeURIComponent(_placeSlug) : '';
    if (!slug) {
      if (title) title.textContent = T('locality_title');
      if (crumbName) crumbName.textContent = '';
      if (crumbSep) crumbSep.classList.add('d-none');
      var html = '<p class="people__intro">' + esc(T('locality_intro')) + '</p><div class="people__grid"><div class="people__group"><ul class="people__list">';
      groups.forEach(function (g) {
        var meta = T('locality_count').replace('{n}', g.count).replace('{a}', g.typeItems.length).replace('{b}', g.rangeItems.length);
        html += '<li><a href="' + esc(base + 'locality/' + encodeURIComponent(countrySlug(g.key)) + '/') + '" data-nav="locality" data-place="' + esc(countrySlug(g.key)) + '">' + esc(countryLabel(g.key)) + '</a><span class="num">' + esc(meta) + '</span></li>';
      });
      body.innerHTML = html + '</ul></div></div>';
      return;
    }
    var g = groups.filter(function (x) { return countrySlug(x.key) === slug; })[0];
    if (!g) { if (title) title.textContent = slug; body.innerHTML = '<p class="empty-state">' + esc(T('locality_none')) + '</p>'; return; }
    var name = countryLabel(g.key);
    if (title) title.textContent = T('locality_page_title').replace('{country}', name);
    if (crumbName) crumbName.textContent = name;
    if (crumbSep) crumbSep.classList.remove('d-none');
    var items = g.typeItems.concat(g.rangeItems);
    var years = items.map(function (d) { return d.pubYear; }).filter(Boolean);
    var authors = {};
    items.forEach(function (d) { splitPeople(d.author).forEach(function (p) { authors[p] = (authors[p] || 0) + 1; }); });
    var topAuthors = Object.keys(authors).sort(function (a, b) { return authors[b] - authors[a]; }).slice(0, 4);
    var facts = '<dl class="people__facts">';
    facts += '<div><dt>' + esc(T('locality_species')) + '</dt><dd>' + esc(T('locality_count').replace('{n}', g.count).replace('{a}', g.typeItems.length).replace('{b}', g.rangeItems.length)) + '</dd></div>';
    if (years.length) facts += '<div><dt>' + esc(T('ledger_years')) + '</dt><dd class="num">' + Math.min.apply(null, years) + (years.length > 1 ? '–' + Math.max.apply(null, years) : '') + '</dd></div>';
    if (topAuthors.length) facts += '<div><dt>' + esc(T('role_author')) + '</dt><dd>' + topAuthors.map(function (p) { return linkPeople(p); }).join(', ') + '</dd></div>';
    facts += '</dl>';
    var byYear = function (list) { return list.slice().sort(function (a, b) { return (a.pubYear || 9999) - (b.pubYear || 9999) || a.displayName.localeCompare(b.displayName); }); };
    body.innerHTML = facts
      + (g.typeItems.length ? '<h2 class="section-title"><span>' + esc(T('locality_group_type')) + '</span></h2><div id="locality-ledger"></div>' : '')
      + (g.rangeItems.length ? '<h2 class="section-title"><span>' + esc(T('locality_group_range')) + '</span></h2><div id="locality-ledger-range"></div>' : '')
      + '<section class="tool-context" id="locality-tools" aria-label="道具">' + (window._toolsOpen ? toolContextHtml('locality') : '') + '</section>';
    if (typeof window.loadCultivarThumbnails === 'function') window.loadCultivarThumbnails();
    if (g.typeItems.length) window.renderEntriesLedger(document.getElementById('locality-ledger'), toLedgerItems(byYear(g.typeItems)), {}, { noCountry: true });
    if (g.rangeItems.length) window.renderEntriesLedger(document.getElementById('locality-ledger-range'), toLedgerItems(byYear(g.rangeItems)), {});
    if (typeof updateMeta === 'function') {
      setTimeout(function () {
        updateMeta({ title: T('locality_page_title').replace('{country}', name) + ' ' + g.count + '種（' + T('locality_count_short').replace('{a}', g.typeItems.length).replace('{b}', g.rangeItems.length) + '） | Aroid Origins',
          description: T('locality_meta_desc').replace('{country}', name) + byYear(items).slice(0, 6).map(function (d) { return d.shownName; }).join('、'), path: 'locality/' + encodeURIComponent(countrySlug(g.key)) + '/' });
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

  // whole-name match after setting aside quotes, case, hyphens/underscores/extra spaces and width; also the aliases
  function looseKey(s) {
    s = String(s || '');
    if (s.normalize) s = s.normalize('NFKC');
    return s.toLowerCase().replace(/['"‘’“”]/g, '').replace(/[-_\s]+/g, ' ').trim();
  }
  function resolveLooseName(displayName, store) {
    var want = looseKey(displayName);
    var genus = displayName.split(' ')[0];
    var wantRest = looseKey(displayName.slice(genus.length + 1));
    if (!want) return null;
    var hits = [];
    Object.keys(store).forEach(function (k) {
      if (k.indexOf(' [Seedling]') !== -1 || store[k]._isPrivate) return;
      if (looseKey(k.split(' ')[0]) !== looseKey(genus)) return;
      var names = [k].concat((store[k]._aliases || []).map(function (a) { return a; }));
      var ok = names.some(function (n) { return looseKey(n) === want || looseKey(n) === wantRest; });
      if (ok && hits.indexOf(k) === -1) hits.push(k);
    });
    return hits.length === 1 ? hits[0] : null;
  }
  function renderDetail() {
    if (!_detailArgs) return;
    var displayName = _detailArgs[0];
    var h1 = document.querySelector('#page-cultivar h1');
    if (!h1 || h1Key(h1).trim() !== displayName) return; // page moved on
    var all = collectAll();
    var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
    var key = _detailArgs[4] || displayName;
    var entry = store[key] || store[displayName] || store[displayName + ' [Seedling]'] || _detailArgs[1];
    if (!entry && window._dataFullyLoaded) {
      // a link that lost its quotes, changed case, used hyphens or a katakana alias: if exactly one entry matches
      // once those are set aside, show it under its own URL; never a partial match (BOARD 10-07b T76)
      var hit = resolveLooseName(displayName, store);
      if (hit && typeof window.updateCultivarDetail === 'function') {
        var hd = describe(hit, store[hit], store[hit]._type);
        try { history.replaceState(history.state, '', hd.href); } catch (e) { /* ignore */ }
        window.updateCultivarDetail(hit);
        return;
      }
    }
    if (!entry) { if (window._dataFullyLoaded) renderUnrecorded(displayName); return; }
    // people links fold aliases ("Jay Vannini" -> Vannini) once the authority table is in: draw again then
    if (!_authority) loadAuthority(function () { renderDetail(); });
    setUnrecorded(false);
    var d = describe(key in store ? key : (store[displayName] ? displayName : (store[displayName + ' [Seedling]'] ? displayName + ' [Seedling]' : key)), entry, entry._type || _detailArgs[2]);
    renderSpecimen(d, all);
    if (LABEL) { window._labelLast = { d: d, all: all }; renderLabelExtras(d, all); }
    if (window.releaseStaticEntry) setTimeout(window.releaseStaticEntry, 0);
    _labelEntry = d.type === 'seedling' ? null : d;
    // 「この品種を親に実生を記録」: the seedling form opens with this name as the mother
    var sdl = document.getElementById('detail-add-seedling');
    if (sdl) {
      sdl.setAttribute('data-prefill-parent', d.isIndividual ? d.displayName.replace(/\s+\([^)]*\)$/, '') : d.displayName);
      sdl.classList.toggle('d-none', d.type === 'seedling');
      var sdlKey = d.isIndividual ? 'detail_add_seedling_plant' : (d.type === 'species' ? 'detail_add_seedling_species' : 'detail_add_seedling');
      sdl.setAttribute('data-i18n', sdlKey); sdl.textContent = T(sdlKey);
    }
    var plb = document.getElementById('detail-print-label');
    if (plb) plb.classList.toggle('d-none', d.type === 'seedling');
    var cpi = document.getElementById('detail-copy-individual');
    if (cpi) cpi.classList.toggle('d-none', !d.isIndividual);
    renderRelated(d, all);
    renderNameNote(d);
    renderRecordHeadNotes(d, all);
    renderArticlesFor(d);
    renderIndividuals(d, all);
    renderGateNote(d);
    renderShareBand(d, entry);
    renderColophonLine(d, entry);
    renderShops(d);
    renderToolContext(d);
    var pi = window._postIntent;
    if (pi && Date.now() - pi.at < 5 * 60000) {
      window._postIntent = null;
      window._aoHoldReload = Date.now() + 3000; // no version reload until the sheet below has opened (sw-register.js)
      setTimeout(function () {
        if (pi.act === 'photo') { var pb = document.getElementById('detail-add-photo-btn'); if (pb && pb.style.display !== 'none') pb.click(); }
        else if (d.type === 'species' && !d.isIndividual) { var ib = document.getElementById('detail-add-individual'); if (ib) ib.click(); }
        else showToast(T('post_intent_species_only'), true);
      }, 700);
    }
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
    if (window.releaseStaticEntry) window.releaseStaticEntry();
    var std = document.getElementById('detail-standard');
    if (std) std.textContent = '';
    var uh = document.querySelector('#page-cultivar h1');
    if (uh) uh.textContent = displayName; // roman: not a recorded name
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
     HOW A NAME IS WRITTEN (owner's check of name forms, 11-27)
     One reader for the label box and the name fields, so both read a name the same way. The text comes with the
     genus already taken off. Author names (Linden & André, (Schott) Engl.) are dropped: they say who described the
     name, not which plant it is. 「nov.」 / 「ined.」 mean the name is not published yet: the name is kept and the
     scientific-name list is not asked. A forma (f. alba) is read as its species. 「spp.」 is several species at once.
     ============================================================ */
  var AUTHOR_KNOWN = /^(schott|croat|engl|sodiro|linden|andr[eé]|krause|matuda|standl|kunth|lindl|poepp|bunting|madison|mayo|carlsen|sheffer|baker|hook|regel|mast|hemsl|rusby|jacq|vell|sakur|haager|boyce|nicolson|ridl|hett|lingan|grayum|mora|hoff|cuatrec|steyerm|marchal|kurz|liebm)/i;
  var AUTHOR_WORD = "[A-ZÀ-Þ][A-Za-zÀ-ÿ.'’-]*";
  var AUTHOR_ONE = AUTHOR_WORD + '(?:\\s+' + AUTHOR_WORD + ')?';
  var AUTHOR_LIST = AUTHOR_ONE + '(?:\\s*(?:&|,|\\bex\\b|\\bet\\b)\\s*' + AUTHOR_ONE + ')*';
  var AUTHOR_RE = new RegExp('^(?:\\(' + AUTHOR_LIST + '\\)\\s*)?' + AUTHOR_LIST + '$');
  // true when the words read as who described the name, not as a plant's own name
  function isAuthors(v) {
    v = String(v || '').trim();
    if (!v || !AUTHOR_RE.test(v)) return false;
    return /&|\bex\b|\bet\b|^\(|[A-Za-z]\.(?:\s|$|[A-Z])/.test(v) || AUTHOR_KNOWN.test(v.replace(/^\(/, ''));
  }
  function readName(raw) {
    var s = String(raw || '').replace(/\s+/g, ' ').trim(), m, out = {};
    if (s.length < 2) return null;
    if (/^spp\.?(?:\s|$)/i.test(s) || /\sspp\.?$/i.test(s)) return { spp: true };
    if (/\s[x×]\s/i.test(s)) return { cross: true };
    // 「sp. nov.」 / 「X nov.」 / 「X sp. ined.」: not published yet
    if ((m = /(?:^|\s+)(?:(sp)\.?\s*)?(nov|ined)\.?\s*$/i.exec(s))) {
      out.unpub = (m[2] || '').toLowerCase() + '.';
      s = s.slice(0, m.index).trim();
      if (!s) { if (m[1]) { out.q = 'sp'; out.extra = ''; return out; } return null; }
    }
    if ((m = /^(sp|aff|cf)\.?(?:\s+(.*))?$/i.exec(s))) {
      var q = m[1].toLowerCase(), rest = (m[2] || '').trim();
      out.q = q;
      if (q === 'sp') {
        var nv = /^(nov|ined)\.?(?:\s+|$)/i.exec(rest);
        if (nv) { out.unpub = nv[1].toLowerCase() + '.'; rest = rest.slice(nv[0].length); }
        out.extra = rest.replace(/^["']+|["']+$/g, '');
        return out;
      }
      var w = /^([a-z][a-z-]*)\s*(.*)$/i.exec(rest) || ['', '', ''];
      out.epithet = w[1].toLowerCase();
      var tail = w[2].trim();
      if (isAuthors(tail)) { out.authors = tail; tail = ''; }
      out.extra = tail.replace(/^["']+|["']+$/g, '');
      return out;
    }
    // subspecies, variety, forma: authors may stand after the species and after the lower name
    if ((m = /^([a-z][a-z-]+)\s+(?:(.+?)\s+)?(var|ssp|subsp|f|forma)\.?\s+([a-z][a-z-]+)(?:\s+(.+))?$/.exec(s)) && (!m[2] || isAuthors(m[2])) && (!m[5] || isAuthors(m[5]))) {
      out.epithet = m[1];
      var a = [m[2], m[5]].filter(Boolean).join(' / ');
      if (a) out.authors = a;
      var rk = m[3].toLowerCase();
      if (rk === 'f' || rk === 'forma') { out.q = ''; out.forma = m[4]; return out; }
      out.q = rk === 'var' ? 'var' : 'ssp';
      out.infra = m[4];
      return out;
    }
    if ((m = /^([a-z][a-z-]+)\s+(.+)$/.exec(s))) {
      var r2 = m[2].trim();
      var qd = /^"([^"]+)"?$/.exec(r2);
      if (qd) { out.q = ''; out.epithet = m[1]; out.extra = qd[1]; return out; }
      if (isAuthors(r2)) { out.q = ''; out.epithet = m[1]; out.authors = r2; return out; }
      if (/^['A-Z0-9#]/.test(r2)) { out.clone = true; out.epithet = m[1]; out.cultivar = r2.replace(/^['"]+|['"]+$/g, ''); return out; }
    }
    if (/^[a-z][a-z-]+$/.test(s)) { out.q = ''; out.epithet = s; return out; }
    if (out.unpub) return null;
    return { other: true, cultivar: s.replace(/^['"]+|['"]+$/g, '') };
  }
  window.aoReadName = readName;
  window.aoIsAuthors = isAuthors;

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
    // full-width letters and curly quotes are put right without asking (board 17 T218); capitals are only suggested
    function plain(v) { v = clean(v); try { v = v.normalize('NFKC'); } catch (e) {} return v.replace(/[‘’]/g, "'").replace(/[“”]/g, '"'); }
    function quoteS(v) { v = plain(v).replace(/^['‘’]+|['‘’]+$/g, ''); return v ? "'" + v + "'" : ''; }
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
        var q = qualifier(), ep = plain(epithet.value).toLowerCase().replace(/\s+/g, ''), ex = plain(extra.value);
        if (q === 'sp') name = joinParts2(['sp.', quoteD(ex)]);
        else if (q === 'aff' || q === 'cf') name = ep ? joinParts2([q + '. ' + ep, quoteD(ex)]) : '';
        else if (q === 'ssp' || q === 'var') name = ep && ex ? ep + ' ' + q + '. ' + clean(ex).toLowerCase() : (ep || '');
        else name = joinParts2([ep, quoteD(ex)]);
      } else if (type === 'clone') {
        var par2 = (document.querySelector('#page-contribute input[name="cultivar-parentage"]:checked') || {}).value || 'species';
        var cn = quoteS(cultivarName.value), ep2 = par2 === 'species' ? clean(epithet.value).toLowerCase().replace(/\s+/g, '') : '';   // the epithet field is hidden for a Hybrid / 不明 Clone
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
      var pg0 = $('page-contribute'), par = (document.querySelector('#page-contribute input[name="cultivar-parentage"]:checked') || {}).value || 'species';
      if (pg0) pg0.setAttribute('data-parentage', par);
      document.querySelectorAll('#name-builder [data-for]').forEach(function (el) {
        var ok = el.getAttribute('data-for').split(' ').indexOf(type) !== -1;
        if (el.id === 'nb-epithet-row' && type === 'species' && q === 'sp') ok = false;
        // a Hybrid or 不明 Clone has no species epithet (owner, 11-27): only 原種 + Clone asks it
        if (el.id === 'nb-epithet-row' && type === 'clone' && par !== 'species') ok = false;
        el.hidden = !ok;
      });
      // 原種 + Clone (a numbered plant of a species): the epithet is asked first and may be left blank; the clone's
      // name or number comes second (owner, 11-27). Hybrid / 不明 + Clone keep the clone's name first (CSS).
      var spClone = type === 'clone' && par === 'species';
      if (epithetLabel) epithetLabel.textContent = spClone ? T('nb_epithet_species_clone') : type === 'clone' ? T('nb_epithet_optional') : T('nb_epithet');
      if (epithet) epithet.placeholder = spClone ? '例: papillilaminum' : '例: crystallinum';
      if (extraLabel) extraLabel.textContent = q === 'sp' ? T('nb_extra_sp') : (q === 'ssp' || q === 'var') ? T('nb_extra_sub') : T('nb_extra_locality');
      if (extra) extra.placeholder = (q === 'ssp' || q === 'var') ? '例: variegatum' : '例: Peru';
      if (cultivarLabel) cultivarLabel.textContent = type === 'hybrid' ? T('nb_hybrid_name') : spClone ? T('nb_clone_name_species') : T('nb_clone_name');
      // the example matches the kind: 'Dark Mama' is a Hybrid, 'Fort Sherman' a numbered papillilaminum, 'King of Spades' a Clone
      if (cultivarName) cultivarName.placeholder = (type === 'hybrid' ? '例: Dark Mama' : spClone ? '例: Fort Sherman' : '例: King of Spades') + '（引用符は不要）';
      // the kind decides which field comes first (CSS), and what the chosen chip means is said under the chips
      var pg = $('page-contribute'); if (pg) pg.setAttribute('data-ctype', type);
      var help = $('subcat-help');
      if (help) help.textContent = {
        '': '学名が発表されている種。例: crystallinum',
        sp: '種が決まっていない株。産地か呼び名を入れます（必須）。例: sp. "Peru"',
        aff: '記載された種に近いが、別の種と考えられる株。例: aff. besseae',
        cf: 'その種らしいが、まだ確かめられていない株。例: cf. regale',
        ssp: '亜種。種小名と亜種名を入れます。',
        'var': '変種。種小名と変種名を入れます。'
      }[q] || '';
      // the five other qualifiers stay folded until asked for, and open by themselves when one of them is chosen (11-27)
      var sc = $('species-subcategory'), more = $('subcat-more');
      if (sc && q) sc.classList.add('is-open');
      if (more && sc) more.setAttribute('aria-expanded', sc.classList.contains('is-open') ? 'true' : 'false');
      var dis = !!result.disabled;
      [epithet, extra, cultivarName, seedLabel].forEach(function (i) { if (i) i.disabled = dis; });
      document.querySelectorAll('#species-subcategory .chip').forEach(function (c) { c.disabled = dis; });
    }
    function onUserInput() { seeded = false; compose(); }
    // 「aff. besseae」 or 「sp.」 typed into the epithet: the qualifier moves to its chip (board 17 T213)
    if (epithet) epithet.addEventListener('input', function () {
      if (currentType() !== 'species') return;
      // only once the word is closed by a dot or a space: 「sp」 alone is also how spectabile, splendidum, variabile
      // and affine begin, and those were being turned into a qualifier at the second letter (11-27)
      var m = /^\s*(sp|aff|cf|ssp|subsp|var)(?:\.\s*|\s+)/i.exec(epithet.value);
      if (!m) return;
      var chip = document.querySelector('#species-subcategory .chip[data-subcategory="' + (m[1].toLowerCase() === 'subsp' ? 'ssp' : m[1].toLowerCase()) + '"]');
      if (!chip) return;
      epithet.value = epithet.value.slice(m[0].length);
      chip.click();
      // sp. has no epithet: what comes next is the locality, so the typing goes on there
      // (at once, not after a pause, so a fast typist's next letters are not left behind in the epithet)
      if (chip.getAttribute('data-subcategory') === 'sp' && extra) { extra.value = epithet.value.trim() || extra.value; epithet.value = ''; extra.focus(); onUserInput(); }
    });
    // 「crystallinum var.」 typed into the epithet: the rank moves to its chip, and the typing goes on in the next field (11-27)
    if (epithet) epithet.addEventListener('input', function () {
      if (currentType() !== 'species' || qualifier() === 'sp') return;
      var m = /^\s*([a-z][a-z-]+)\s+(var|ssp|subsp)\.\s*(.*)$/i.exec(epithet.value);
      if (!m) return;
      var chip = document.querySelector('#species-subcategory .chip[data-subcategory="' + (m[2].toLowerCase() === 'var' ? 'var' : 'ssp') + '"]');
      if (!chip) return;
      epithet.value = m[1].toLowerCase();
      if (!chip.classList.contains('active')) chip.click();
      // the focus moves at once, so the next letter typed lands in the lower-name field
      if (extra) { extra.value = m[3].trim() || extra.value; extra.focus(); }
      onUserInput();
    });
    // the space typed after 「var.」 or 「sp.」 lands in the next field: it is not part of the name
    if (extra) extra.addEventListener('input', function () { if (/^\s/.test(extra.value)) extra.value = extra.value.replace(/^\s+/, ''); });
    // 「sp. nov.」 typed straight into the epithet: after sp. moves to its chip, 「nov.」 would become the locality.
    // It means the species is not named yet, which sp. already says, so it is taken off with a line (11-27)
    var exTidy = null;
    function exNote(html) {
      if (!exTidy && extra) { exTidy = document.createElement('p'); exTidy.id = 'nb-extra-tidy'; exTidy.className = 'nb-tidy'; extra.parentNode.appendChild(exTidy); }
      if (exTidy) { exTidy.innerHTML = html || ''; exTidy.hidden = !html; }
    }
    function spUnpub(closedOnly) {
      if (!extra || qualifier() !== 'sp') return;
      var m = (closedOnly ? /^(nov|ined)\.\s*/i : /^(nov|ined)\.?(?:\s+|$)/i).exec(extra.value);
      if (!m) return;
      extra.value = extra.value.slice(m[0].length);
      var w = m[1].toLowerCase() + '.';
      exNote(lang() === 'en' ? '<i>sp. ' + w + '</i> means the species has no name yet, which sp. already says, so ' + w + ' is not used as the locality.'
        : '「sp. ' + w + '」は名前がまだない種という意味で、sp. と同じなので、' + w + ' は産地に入れません。');
      onUserInput();
    }
    if (extra) {
      extra.addEventListener('input', function () { if (exTidy && !exTidy.hidden && qualifier() !== 'sp') exNote(''); spUnpub(true); });
      extra.addEventListener('change', function () { spUnpub(false); });
    }
    // 「aff. besseae」 / 「sp. "Peru"」 / 「X var. Y」 written in the Hybrid / 不明 name field: that is a species' way of
    // writing, so a line under the field offers to record it as a species with the right rank, in one tap (11-27).
    // It is offered, not done by itself, because the person chose Hybrid / 不明 on purpose.
    var cvTidy = null, cvRead = null;
    function cvNote(html) {
      if (!cvTidy && cultivarName) { cvTidy = document.createElement('div'); cvTidy.id = 'nb-cultivar-tidy'; cvTidy.className = 'nb-tidy'; cultivarName.parentNode.appendChild(cvTidy); }
      if (cvTidy) { cvTidy.innerHTML = html || ''; cvTidy.hidden = !html; }
    }
    function cvCheck() {
      cvRead = null;
      var type = currentType(), par = (document.querySelector('#page-contribute input[name="cultivar-parentage"]:checked') || {}).value || 'species';
      if (!(type === 'hybrid' || (type === 'clone' && par !== 'species')) || !window.aoReadName) { cvNote(''); return; }
      var r = window.aoReadName(stripGenus(plain(cultivarName.value).replace(/^['‘’]+|['‘’]+$/g, '')));
      if (!r || !r.q || ['sp', 'aff', 'cf', 'var', 'ssp'].indexOf(r.q) === -1) { cvNote(''); return; }
      cvRead = r;
      var en = lang() === 'en', show = r.q === 'sp' ? 'sp.' + (r.extra ? ' "' + r.extra + '"' : '') : (r.q === 'aff' || r.q === 'cf') ? r.q + '. ' + r.epithet + (r.extra ? ' "' + r.extra + '"' : '') : r.epithet + ' ' + r.q + '. ' + r.infra;
      cvNote(en ? 'This is how a species is written (' + esc(r.q) + '.). <button type="button" class="namecheck__btn" data-cv-species>Record as species: ' + esc(show) + '</button>'
        : '原種（' + esc(r.q) + '.）の書き方です。 <button type="button" class="namecheck__btn" data-cv-species>原種「' + esc(show) + '」として登録する</button>');
    }
    if (cultivarName) { cultivarName.addEventListener('input', function () { clearTimeout(cultivarName._t); cultivarName._t = setTimeout(cvCheck, 500); }); cultivarName.addEventListener('change', cvCheck); }
    document.addEventListener('change', function (e) { if (e.target && /^(cultivar-type|cultivar-parentage|kind-clone-yn)$/.test(e.target.name || '')) setTimeout(cvCheck, 50); });
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('[data-cv-species]') || !cvRead) return;
      var r = cvRead, pg1 = $('page-contribute');
      function pick(sel) { var el = pg1 && pg1.querySelector(sel); if (el && !el.checked) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); } }
      pick('input[name="cultivar-parentage"][value="species"]');
      pick('input[name="kind-clone-yn"][value="no"]');
      setTimeout(function () {
        var chip = document.querySelector('#species-subcategory .chip[data-subcategory="' + r.q + '"]');
        if (chip && !chip.classList.contains('active')) chip.click();
        setTimeout(function () {
          cultivarName.value = '';
          epithet.value = r.epithet || '';
          extra.value = r.q === 'var' || r.q === 'ssp' ? r.infra : (r.extra || '');
          cvNote('');
          (r.epithet ? epithet : extra).dispatchEvent(new Event('input', { bubbles: true }));
        }, 30);
      }, 30);
    });
    // when the person leaves the epithet: author names, 「nov.」 and 「f. alba」 typed after it are read and set aside,
    // and a line says what was done with them, so nothing goes missing without a word (11-27)
    var tidy = null, tidying = false;
    function tidyNote(html) {
      if (!tidy && epithet) { tidy = document.createElement('p'); tidy.id = 'nb-epithet-tidy'; tidy.className = 'nb-tidy'; var row0 = $('nb-epithet-row'); if (row0) row0.appendChild(tidy); }
      if (!tidy) return;
      tidy.innerHTML = html || ''; tidy.hidden = !html;
    }
    window.aoTidyNote = tidyNote;
    if (epithet) epithet.addEventListener('input', function () { if (/^\s/.test(epithet.value)) epithet.value = epithet.value.replace(/^\s+/, ''); if (!tidying && tidy && !tidy.hidden) tidyNote(''); if (epithet.getAttribute('data-unpub') && epithet.getAttribute('data-unpub') !== epithet.value.trim().toLowerCase()) epithet.removeAttribute('data-unpub'); });
    if (epithet) epithet.addEventListener('change', function () {
      var v = plain(epithet.value).trim();
      // 「sp」 alone (no dot) is not an epithet: it is the sp. chip
      if (/^sp$/i.test(v) && currentType() === 'species' && !qualifier()) {
        var spc = document.querySelector('#species-subcategory .chip[data-subcategory="sp"]');
        if (spc) { epithet.value = ''; spc.click(); setTimeout(function () { if (extra) extra.focus(); onUserInput(); }, 0); }
        return;
      }
      if (v.indexOf(' ') === -1 || !window.aoReadName) return;
      var type = currentType(), par = (document.querySelector('#page-contribute input[name="cultivar-parentage"]:checked') || {}).value || 'species';
      if (type !== 'species' && !(type === 'clone' && par === 'species')) return;
      var r = window.aoReadName(v);
      if (!r || !r.epithet || r.clone || r.other || (r.q && r.q !== 'var' && r.q !== 'ssp' && type === 'species')) return;
      if (type === 'clone' && (r.q || r.extra)) return;
      var en = lang() === 'en', said = [];
      epithet.value = r.epithet;
      if (r.unpub) { epithet.setAttribute('data-unpub', r.epithet); said.push(en ? '<i>' + esc(r.unpub) + '</i> means the name is not published yet. It is recorded as <i>' + esc(r.epithet) + '</i>.' : '「' + esc(r.unpub) + '」は発表前の名前という意味です。<i>' + esc(r.epithet) + '</i> として記録します。'); }
      if (r.forma) said.push(en ? 'A forma (f. ' + esc(r.forma) + ') is recorded as its species, so it is not part of the name.' : '品種（f. ' + esc(r.forma) + '）は種として記録するので、登録名には入りません。');
      if (r.authors) said.push(en ? esc(r.authors) + ' is who described the name (the author), so it is not part of the name.' : esc(r.authors) + ' は名前をつけた人（著者名）なので、登録名には入れません。');
      if ((r.q === 'var' || r.q === 'ssp') && type === 'species') {
        var chip = document.querySelector('#species-subcategory .chip[data-subcategory="' + r.q + '"]');
        if (chip && !chip.classList.contains('active')) chip.click();
        if (extra) extra.value = r.infra;
      }
      tidyNote(said.join(' '));
      tidying = true;
      epithet.dispatchEvent(new Event('input', { bubbles: true }));
      tidying = false;
    });
    [epithet, extra, cultivarName, seedLabel].forEach(function (i) { if (i) i.addEventListener('input', onUserInput); });
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#species-subcategory .chip')) setTimeout(function () { refreshVisibility(); onUserInput(); }, 0);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('#subcat-more')) return;
      var sc = $('species-subcategory'); if (!sc) return;
      var open = !sc.classList.contains('is-open');
      // folding goes back to 記載種, so no hidden qualifier is left chosen
      if (!open && qualifier()) { var sp = sc.querySelector('.chip[data-subcategory="species"]'); if (sp) sp.click(); }
      sc.classList.toggle('is-open', open);
      e.target.closest('#subcat-more').setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.querySelectorAll('#page-contribute input[name="cultivar-type"]').forEach(function (r) {
      r.addEventListener('change', function () { setTimeout(function () { refreshVisibility(); if (!seeded) compose(); }, 0); });
    });
    // 原種 ⇄ Hybrid / 不明 with Clone ticked keeps the type 'clone': the labels and the order follow the parentage too
    document.querySelectorAll('#page-contribute input[name="cultivar-parentage"]').forEach(function (r) {
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
      if (epithet) epithet.removeAttribute('data-unpub');
      tidyNote(''); exNote(''); cvNote('');
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
     CONTRIBUTION FORM: scientific-name check (owner's list 2026-11-27, item 2)
     When a species epithet is typed, the name is looked up in the archive first, then in GBIF's name
     list (the world list that includes Kew's plant names; free, no key). A name it does not know gets a
     note under the field and on the review step. The note never stops the post: newly described species
     can be missing from the list for a while. If the list cannot be reached, nothing is said.
     ============================================================ */
  (function nameCheck() {
    var $ = function (id) { return document.getElementById(id); };
    var epithet = $('nb-epithet'), row = $('nb-epithet-row');
    if (!epithet || !row) return;
    var cache = {}, timer = null, seq = 0;
    var state = { name: '', result: '' };   // result: '', 'known', 'missing', 'near'
    var box = document.createElement('div');
    box.id = 'nb-namecheck';
    box.className = 'namecheck';
    box.setAttribute('role', 'status');
    box.hidden = true;
    row.appendChild(box);

    function binomial() {
      var type = (document.querySelector('#page-contribute input[name="cultivar-type"]:checked') || {}).value || 'species';
      var par = (document.querySelector('#page-contribute input[name="cultivar-parentage"]:checked') || {}).value || 'species';
      var chip = document.querySelector('#species-subcategory .chip.active');
      var q = chip ? chip.getAttribute('data-subcategory') : 'species';
      if (type !== 'species' && !(type === 'clone' && par === 'species')) return '';
      if (type === 'species' && q === 'sp') return '';
      var g = (($('contribute-genus-select') || {}).value || '').trim();
      // only the first word is the epithet: author names or anything else after it are not part of the name (11-27)
      var ep = String(epithet.value || '').normalize('NFKC').trim().toLowerCase().split(/\s+/)[0];
      if (!g || !/^[a-z][a-z-]{2,}$/.test(ep)) return '';
      return g + ' ' + ep;
    }
    // a subspecies or variety: the lower name is checked too, once the species itself is known (11-27)
    function trinomial(bin) {
      var chip = document.querySelector('#species-subcategory .chip.active');
      var q = chip ? chip.getAttribute('data-subcategory') : '';
      var type = (document.querySelector('#page-contribute input[name="cultivar-type"]:checked') || {}).value || 'species';
      if (!bin || type !== 'species' || (q !== 'var' && q !== 'ssp')) return '';
      var inf = String((($('nb-extra') || {}).value) || '').normalize('NFKC').trim().toLowerCase().split(/\s+/)[0];
      if (!/^[a-z][a-z-]{2,}$/.test(inf)) return '';
      return bin + (q === 'var' ? ' var. ' : ' subsp. ') + inf;
    }
    function unpublished(bin) {
      var u = epithet.getAttribute('data-unpub');
      return !!(bin && u && bin.split(' ')[1] === u);
    }
    function inArchive(name) {
      var data = (typeof cultivarData !== 'undefined' && cultivarData) ? cultivarData : (window.cultivarData || {});
      var k = name.toLowerCase();
      return Object.keys(data).some(function (n) {
        var e = data[n] || {}, keys = [n].concat(e._aliases || []);
        return keys.some(function (x) { x = String(x).toLowerCase(); return x === k || x.indexOf(k + ' ') === 0; });
      });
    }
    function lookup(name) {
      if (cache[name]) return cache[name];
      var ctl = window.AbortController ? new AbortController() : null;
      var to = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
      cache[name] = fetch('https://api.gbif.org/v1/species/match?kingdom=Plantae&name=' + encodeURIComponent(name), ctl ? { signal: ctl.signal } : {})
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          clearTimeout(to);
          if (!d) return '';
          var g = name.split(' ')[0];
          var sp = d.rank === 'SPECIES' || d.rank === 'SUBSPECIES' || d.rank === 'VARIETY' || d.rank === 'FORM';
          var parts = name.split(' ');
          if (parts.length === 4) {
            // 「Anthurium ernesti var. foo」: GBIF gives the species back (HIGHERRANK) when it does not know the lower name
            var infra = d.rank === 'SUBSPECIES' || d.rank === 'VARIETY' || d.rank === 'FORM';
            var cn3 = String(d.canonicalName || '').split(' ');
            if (d.matchType === 'EXACT' && infra) return { result: 'known' };
            if (d.matchType === 'FUZZY' && infra && cn3.length === 3 && (cn3[0] + ' ' + cn3[1]).toLowerCase() === (parts[0] + ' ' + parts[1]).toLowerCase()) {
              if (cn3[2].toLowerCase() === parts[3].toLowerCase()) return { result: 'known' };
              return { result: 'near', suggest: cn3[2].toLowerCase(), infra: true };
            }
            if (d.matchType === 'HIGHERRANK' && d.rank === 'SPECIES') return { result: 'missing', infra: true };
            return '';
          }
          if (d.matchType === 'EXACT' && sp) return { result: 'known' };
          if (d.matchType === 'FUZZY' && sp && d.genus === g && d.canonicalName) {
            var cn = d.canonicalName.split(' ').slice(0, 2).join(' ');
            if (cn.toLowerCase() === name.toLowerCase()) return { result: 'known' };
            return { result: 'near', suggest: cn.split(' ')[1] };
          }
          return { result: 'missing' };
        })
        .catch(function () { clearTimeout(to); delete cache[name]; return ''; });
      return cache[name];
    }
    // the note's words, in the page's language
    function words(name, r) {
      var en = lang() === 'en', g = name.split(' ')[0];
      if (r.result === 'unpub') return {
        q: en ? '<i>' + esc(name) + '</i> is taken as a name not published yet (nov. / ined.). It is not checked against the list of scientific names (GBIF).'
          : '<i>' + esc(name) + '</i> は、発表前の名前（nov. / ined.）として受け付けます。学名の一覧（GBIF）では確かめません。', s: '', note: '', review: '', fix: ''
      };
      var sugName = r.result !== 'near' ? '' : r.infra ? name.split(' ').slice(0, 3).join(' ') + ' ' + r.suggest : g + ' ' + r.suggest;
      return {
        q: en ? '<i>' + esc(name) + '</i> was not found in the GBIF list of scientific names.' : '<i>' + esc(name) + '</i> は、学名の一覧（GBIF）で見つかりませんでした。',
        s: r.result !== 'near' ? '' : (en ? 'Did you mean <i>' + esc(sugName) + '</i>?' : 'もしかして <i>' + esc(sugName) + '</i> ですか？')
          + ' <button type="button" class="namecheck__btn" ' + (r.infra ? 'data-extra-fix' : 'data-epithet-fix') + '="' + esc(r.suggest) + '">' + (en ? 'Use this' : 'こちらにする') + '</button>',
        note: r.infra
          ? (en ? 'Please check the spelling of the subspecies or variety. Many of them are missing from the list, so you can still post as it is.'
            : '亜種名・変種名の綴りを確かめてください。一覧に載っていない亜種・変種も多いので、このまま投稿もできます。')
          : (en ? 'Please check the spelling. Newly described species can be missing from the list for a while. You can still post as it is.'
            : '綴りを確かめてください。新しく発表された種は、一覧にまだ載っていないことがあります。このまま投稿もできます。'),
        review: r.infra ? (en ? 'If the name is right, you can record it as it is.' : '名前が合っていれば、このまま記録して大丈夫です。')
          : (en ? 'If it is a newly described species, you can record it as it is.' : '新しく発表された種なら、このまま記録して大丈夫です。'),
        fix: en ? 'Fix the name' : '名前を直す'
      };
    }
    function show(name, r) {
      state = { name: name, result: r ? r.result : '', suggest: r && r.suggest, infra: r && r.infra };
      box.classList.toggle('namecheck--info', !!(r && r.result === 'unpub'));
      if (!r || r.result === 'known') { box.hidden = true; box.innerHTML = ''; return; }
      var w = words(name, r);
      box.innerHTML = '<p class="namecheck__q">' + w.q + '</p>' + (w.s.indexOf('<i>') !== -1 ? '<p class="namecheck__s">' + w.s + '</p>' : '') + (w.note ? '<p class="namecheck__note">' + w.note + '</p>' : '');
      box.hidden = false;
    }
    function check() {
      var name = binomial(), my = ++seq;
      if (!name) { show('', null); return; }
      if (unpublished(name)) { show(name, { result: 'unpub' }); return; }
      var tri = trinomial(name);
      var first = inArchive(name) ? Promise.resolve({ result: 'known' }) : lookup(name);
      first.then(function (r) {
        if (my !== seq) return;
        // the lower name is asked only when the species is known: a wrong species is said first
        if (!tri || !r || r.result !== 'known') { show(name, r); return; }
        if (inArchive(tri)) { show(tri, { result: 'known' }); return; }
        lookup(tri).then(function (r3) { if (my === seq) show(tri, r3 || null); });
      });
    }
    function later() { clearTimeout(timer); timer = setTimeout(check, 700); }
    epithet.addEventListener('input', function () { box.hidden = true; later(); });
    epithet.addEventListener('blur', function () { clearTimeout(timer); check(); });
    var ex0 = $('nb-extra');
    if (ex0) { ex0.addEventListener('input', function () { if (state.infra || trinomial(binomial())) { box.hidden = true; later(); } }); ex0.addEventListener('blur', function () { if (trinomial(binomial())) { clearTimeout(timer); check(); } }); }
    var gs = $('contribute-genus-select'); if (gs) gs.addEventListener('change', later);
    document.addEventListener('change', function (e) { if (e.target && /^(cultivar-type|cultivar-parentage)$/.test(e.target.name || '')) later(); });
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#species-subcategory .chip')) later();
      var bx = e.target.closest && e.target.closest('[data-extra-fix]');
      if (bx) {
        var exf = $('nb-extra');
        if (exf) { exf.value = bx.getAttribute('data-extra-fix'); exf.dispatchEvent(new Event('input', { bubbles: true })); }
        clearTimeout(timer); check();
        if (window.aoContributeReview) setTimeout(window.aoContributeReview, 50);
        return;
      }
      var b = e.target.closest && e.target.closest('[data-epithet-fix]');
      if (!b) return;
      // the label box at the top says the same name, so it follows (without being read again)
      var nf = $('nf-input'), old = String(epithet.value || '').trim().toLowerCase();
      if (nf && old && nf.value.trim().toLowerCase().split(/\s+/).pop() === old) nf.value = nf.value.replace(new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'i'), b.getAttribute('data-epithet-fix'));
      epithet.value = b.getAttribute('data-epithet-fix');
      epithet.dispatchEvent(new Event('input', { bubbles: true }));
      clearTimeout(timer); check();
      if (window.aoContributeReview) setTimeout(window.aoContributeReview, 50);
    });
    // the review step asks this; the answer is only for the name now in the field
    window.aoNameCheck = function () {
      var b = binomial(), n = state.name && (state.name === b || state.name === trinomial(b)) ? state.name : '';
      if (!n || (state.result !== 'missing' && state.result !== 'near')) return null;
      var w = words(n, state);
      return '<div class="cstep-near namecheck-review"><p class="cstep-near__q">' + w.q + '</p>' + (state.result === 'near' ? '<p>' + w.s + '</p>' : '')
        + '<p class="cstep-note">' + w.review + ' <a href="#" class="cstep-fix" data-goto="1">' + w.fix + '</a></p></div>';
    };
    // a language switch while the note is up: say it again in the new language
    var _al = window.applyLanguage;
    if (typeof _al === 'function') window.applyLanguage = function () { var r = _al.apply(this, arguments); if (!box.hidden) show(state.name, state); return r; };
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
        a.className = 'term'; a.href = base + 'glossary/' + id + '/'; a.setAttribute('data-nav', 'glossary'); a.setAttribute('data-anchor', id);
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
      // an individual has no literature of its own to research (§3)
      var isInd = cData && (cData._tags || []).indexOf('individual') !== -1;
      if (!id || isSeedling || isInd || !sb()) { btn.classList.add('d-none'); status.classList.add('d-none'); return; }
      sb().from('research_requests').select('status').eq('cultivar_id', id).in('status', ['pending', 'approved']).limit(1)
        .then(function (res) { setStatus(res.data && res.data[0] ? res.data[0].status : 'none'); })
        .catch(function () { setStatus('none'); });
    };
    btn.addEventListener('click', function () {
      if (!window._currentUser) { showToast(T('rerun_login'), true); return; }
      var h1 = document.querySelector('#page-cultivar h1');
      $id('research-request-target').textContent = h1 ? h1Key(h1) : '';
      reason.value = '';
      dlg.showModal();
    });
    cancel.addEventListener('click', function () { dlg.close(); });
    submit.addEventListener('click', function () {
      var id = cultivarId(), h1 = document.querySelector('#page-cultivar h1');
      if (!id || !sb() || !window._currentUser) return;
      submit.disabled = true;
      sb().from('research_requests').insert({ cultivar_id: id, cultivar_name: h1 ? h1Key(h1).trim() : '', user_id: window._currentUser.id, reason: reason.value.trim() || null })
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
        window.refreshEntriesLedger();
      } catch (err) { /* ignore */ }
      return r;
    };
  }

  /* boot */
  function boot() {
    window.aoPaintStoryCopy();
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

/* Glossary table of contents (BOARD 10-07b I6): the sections as a ruled two-column list at the top, built from the
   page's own h2s, with a way back from each section. */
(function () {
  function build() {
    var page = document.getElementById('page-glossary');
    if (!page || page.querySelector('.glossary-toc')) return;
    var heads = page.querySelectorAll('.legal-page > h2');
    if (heads.length < 3) return;
    var items = '';
    heads.forEach(function (h, i) {
      if (!h.id) h.id = 'gs-' + (i + 1);
      items += '<li><a href="#' + h.id + '" data-toc="' + h.id + '">' + h.textContent.replace(/[<>&]/g, '') + '</a></li>';
      var back = document.createElement('p');
      back.className = 'glossary-toc__back';
      back.innerHTML = '<a href="#glossary-toc" data-toc="glossary-toc">目次へ ↑</a>';
      if (i > 0) h.parentNode.insertBefore(back, h);
    });
    var nav = document.createElement('nav');
    nav.className = 'glossary-toc';
    nav.id = 'glossary-toc';
    nav.setAttribute('aria-label', '目次');
    nav.innerHTML = '<ul>' + items + '</ul>';
    heads[0].parentNode.insertBefore(nav, heads[0]);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-toc]');
    if (!a) return;
    e.preventDefault();
    var el = document.getElementById(a.getAttribute('data-toc'));
    if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();


/* ============================================================
   App-like screens (BOARD 10-08 §4-1〜4-6) — only with html.app-ui (?preview=app)
   ============================================================ */
(function () {
  var root = document.documentElement;
  // the 名札の図鑑 flag (the first block's LABEL is not in scope here; my plants failed without it, 11-03)
  var LABEL = root.classList.contains('pv-label');
  function on() { return root.classList.contains('app-ui'); }
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function currentPage() { var a = document.querySelector('.page.active'); return a ? a.id.replace(/^page-/, '') : ''; }
  function entryName() { var h = document.querySelector('#page-cultivar h1'); return h && typeof h1Key === 'function' ? h1Key(h) : ''; }

  // ---- bottom bar ----
  function markBar(pageId) {
    if (!on()) return;
    document.querySelectorAll('.appbar [data-appbar]').forEach(function (a) {
      var k = a.getAttribute('data-appbar');
      if (k === pageId || (k === 'genus' && pageId === 'cultivar')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.body.classList.toggle('appbar-hidden', pageId === 'contribute' && !!$('page-contribute') && $('page-contribute').classList.contains('contribute--stepped'));
  }
  document.addEventListener('ao:page', function (e) { document.body.classList.remove('appbar-away'); markBar(e.detail); if (e.detail === 'contribute') setTimeout(stepperInit, 0); });
  var post = $('appbar-post');
  if (post) post.addEventListener('click', function () {
    if (typeof gtag === 'function') gtag('event', 'appbar_click', { item: 'post' });
    openPostSheet();
  });
  // wide screens have no bottom bar: the header's ＋投稿 opens the same sheet (owner, 11-24)
  var hpost = $('header-post');
  if (hpost) hpost.addEventListener('click', function () {
    if (typeof gtag === 'function') gtag('event', 'appbar_click', { item: 'post_header' });
    openPostSheet();
  });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.appbar [data-appbar]');
    if (a && typeof gtag === 'function') gtag('event', 'appbar_click', { item: a.getAttribute('data-appbar') });
  }, true);
  var mine = document.querySelector('.appbar [data-appbar="mypost"]');
  if (mine) mine.addEventListener('click', function (e) {
    if (window._currentUser || !window._supabaseClient || !window.requireLogin) return;
    e.preventDefault(); e.stopPropagation();
    window.requireLogin({ a: 'mypost', path: (typeof _basePath !== 'undefined' ? _basePath : '/') + 'mypost' });
  }, true);
  // the row the reader taps is remembered, so Back can bring it on screen (T121)
  document.addEventListener('click', function (e) {
    var n = e.target.closest && e.target.closest('[data-nav]');
    if (!n) return;
    var inner = n.querySelector('[data-key]');
    window._lastNavKey = n.getAttribute('data-key') || (inner && inner.getAttribute('data-key')) || null;
  }, true);
  // tapping the tab you are on: back to the top; on 一覧, the search field (T121)
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('.appbar [data-appbar][aria-current]');
    if (!a || !on()) return;
    var k = a.getAttribute('data-appbar');
    if (k !== currentPage()) return;
    e.preventDefault(); e.stopPropagation();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (k === 'genus') { var si = document.querySelector('.page.active input[type=search], .page.active .genus-search input'); if (si) setTimeout(function () { si.focus(); }, 300); }
  }, true);
  var more = $('appbar-more');
  if (more) more.addEventListener('click', function () { var h = $('hamburger'); if (h) h.click(); });
  // the menu is closed from several places; one watcher keeps the tab, the page and the bar in step with it
  var nav = $('mobileNav'), navClose = $('mobile-nav-close');
  if (navClose) navClose.addEventListener('click', function () { var h = $('hamburger'); if (nav && nav.classList.contains('open') && h) h.click(); else if (nav) nav.classList.remove('open'); });
  if (nav && window.MutationObserver) new MutationObserver(function () {
    var isOpen = nav.classList.contains('open');
    document.body.classList.toggle('menu-open', isOpen);
    if (isOpen) document.body.classList.remove('appbar-away');
    if (more) more.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }).observe(nav, { attributes: true, attributeFilter: ['class'] });
  // the bar steps aside while the keyboard is up
  function kb() {
    var vv = window.visualViewport, a = document.activeElement;
    var typing = a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) && !/^(checkbox|radio|button|submit|file|range)$/.test(a.type || '');
    document.body.classList.toggle('kb-open', !!typing && (!vv || (vv.scale < 1.05 && (window.innerHeight - vv.height) > 150)));
  }
  if (window.visualViewport) window.visualViewport.addEventListener('resize', kb);
  document.addEventListener('focusin', kb);
  document.addEventListener('focusout', function () { setTimeout(kb, 120); });
  // H1: like Safari's own toolbar, the bar slides away while scrolling down and comes back on the way up
  // or at the end of the page (always shown when opened from the home screen)
  var lastY = window.scrollY, standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  window.addEventListener('scroll', function () {
    if (!on() || standalone) return;
    var y = window.scrollY, dy = y - lastY;
    if (Math.abs(dy) < 8) return;
    var atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 40;
    document.body.classList.toggle('appbar-away', dy > 0 && y > 120 && !atEnd);
    lastY = y;
  }, { passive: true });

  // ---- 「＋投稿」 sheet on a plant page ----
  // three choices on every page (board 9 D3); on a plant page photo and seedling belong to that plant
  var _sheetOnEntry = false;
  function openPostSheet() {
    var dlg = $('post-sheet');
    if (!dlg || typeof dlg.showModal !== 'function') return;
    _sheetOnEntry = currentPage() === 'cultivar' && !!entryName();
    var std = document.querySelector('#page-cultivar .detail-standard');
    var h1 = document.querySelector('#page-cultivar h1');
    $('post-sheet-kind').textContent = _sheetOnEntry && std ? std.textContent.trim() : '';
    $('post-sheet-name').innerHTML = _sheetOnEntry && h1 ? h1.innerHTML : '何を記録しますか';
    $('post-sheet-photo-t').textContent = _sheetOnEntry ? '写真を追加' : '図鑑にある種・品種に写真を載せる';
    $('post-sheet-photo-d').textContent = _sheetOnEntry ? 'このページの名前に、自分で撮った写真を' : '名前を選んで、写真を足すだけ（約 30 秒）';
    // off a plant page the individual row leads to choosing a species; on one, the row below does it
    $('post-sheet-ind-any').classList.toggle('d-none', _sheetOnEntry);
    $('post-sheet-seedling-d').textContent = _sheetOnEntry ? '親の欄にこの名前を入れて、交配式と播種日' : '自分で種を播いた株の交配式と播種日';
    var ind = $('detail-add-individual'), sdl = $('detail-add-seedling'), rec = $('detail-add-record-btn'), ph = $('detail-add-photo-btn');
    $('post-sheet-entry-more').classList.toggle('d-none', !_sheetOnEntry);
    $('post-sheet-ind').classList.toggle('d-none', !_sheetOnEntry || !ind || ind.classList.contains('d-none'));
    dlg.querySelector('[data-post-act="record"]').parentNode.classList.toggle('d-none', !_sheetOnEntry || !rec || rec.style.display === 'none');
    // on a plant page without a photo button (another person's seedling) there is nothing to add a photo to
    dlg.querySelector('[data-post-act="photo"]').parentNode.classList.toggle('d-none', _sheetOnEntry && (!ph || ph.style.display === 'none'));
    dlg.querySelector('[data-post-act="seedling"]').parentNode.classList.toggle('d-none', _sheetOnEntry && (!sdl || sdl.classList.contains('d-none')));
    dlg.showModal();
    var psName = $('post-sheet-name'); psName.setAttribute('tabindex', '-1'); psName.focus();
  }
  // off a plant page, a photo or an individual starts by choosing the name: a band under the top bar says so and
  // stays until a name is chosen or 「やめる」 (board 17 T214; it was a notice gone in two seconds)
  window.aoStartPick = function (act) {
    window._postIntent = { act: act, at: Date.now() };
    if (typeof navigateTo === 'function') navigateTo('explore', {});
    // phones: under the top bar; wide screens have no top bar (it is display:none), so under the header (11-24)
    var tb = $('topbar'), hd = document.querySelector('.header');
    var shown = function (el) { return !!el && getComputedStyle(el).display !== 'none'; };
    var bar = shown(tb) ? tb : (shown(hd) ? hd : (tb || document.body));
    var band = $('intent-band');
    if (!band) { band = document.createElement('div'); band.id = 'intent-band'; band.className = 'intent-band'; }
    if (band.parentNode !== bar) bar.appendChild(band);
    band.innerHTML = '<span>' + (act === 'photo' ? '写真を追加する名前を選んでください' : '個体を追加する原種を選んでください') + '</span><button type="button" id="intent-band-stop">やめる</button>';
    band.hidden = false;
    setTimeout(function () { var si = document.querySelector('#page-explore .search-bar__input'); if (si) si.focus(); }, 350);
  };
  function endPick() { var band = $('intent-band'); if (band) band.hidden = true; }
  document.addEventListener('click', function (e) { if (e.target && e.target.id === 'intent-band-stop') { window._postIntent = null; endPick(); } });
  document.addEventListener('ao:page', function (e) { if (e.detail === 'cultivar' || e.detail === 'top' || e.detail === 'mypost' || e.detail === 'contribute' || !window._postIntent) endPick(); });
  var ps = $('post-sheet');
  if (ps) ps.addEventListener('click', function (e) {
    if (e.target === ps) { ps.close(); return; }
    var b = e.target.closest('[data-post-act]');
    if (!b) return;
    var act = b.getAttribute('data-post-act');
    ps.close();
    // each row hands over to the button that already does it (same login check, same form)
    if (typeof gtag === 'function') gtag('event', 'post_sheet_choice', { choice: act, on_entry: _sheetOnEntry ? 1 : 0 });
    var map = { photo: 'detail-add-photo-btn', record: 'detail-add-record-btn', individual: 'detail-add-individual', seedling: 'detail-add-seedling' };
    if (_sheetOnEntry && map[act]) { var el = $(map[act]); if (el) el.click(); return; }
    var base = (typeof _basePath !== 'undefined' ? _basePath : '/');
    if (act === 'photo' || act === 'individual-any') {
      // off a plant page: the name is chosen first (any name, not only the ones without a photo); its page then
      // opens the photo sheet or the individual form by itself (board 15 B7)
      window.aoStartPick(act === 'photo' ? 'photo' : 'individual');
      return;
    }
    // seedling / new name: the contribute form (the header link carries the login check and the kind)
    var l = document.createElement('a');
    l.href = base + 'contribute'; l.setAttribute('data-nav', 'contribute');
    if (act === 'seedling') l.setAttribute('data-contribute-type', 'seedling');
    l.style.display = 'none'; document.body.appendChild(l); l.click(); l.remove();
  });

  // ---- posting in three steps (owner, 11-21; it was five): 名前（どんな名前か＋名前）→ 由来と写真 → 確認.
  //      A seedling is chosen before the form opens, so it starts at the second step: 記録 → 確認 ----
  var STEPS = ['名前', '由来と写真', '確認'];
  var LAST = 3;
  function isSeedling() { return ((document.querySelector('#page-contribute input[name="cultivar-type"]:checked') || {}).value) === 'seedling'; }
  var step = 1, built = false;
  function page() { return $('page-contribute'); }
  function stepped() { var p = page(); return p && p.classList.contains('contribute--stepped'); }
  function editingOrIndividual() {
    var p = page();
    return !p || p.classList.contains('contribute--individual') || (typeof window.isContributeEditMode === 'function' && window.isContributeEditMode());
  }
  function build() {
    if (built) return;
    var p = page();
    var typeRadio = p.querySelector('input[name="cultivar-type"]');
    var typeGroup = typeRadio && typeRadio.closest('.form-group');
    var infoCard = typeGroup && typeGroup.closest('.card');
    var genusGroup = $('contribute-genus-select') && $('contribute-genus-select').closest('.form-group');
    var nameGroup = $('name-builder');
    var imgCard = $('contribute-upload-area') && $('contribute-upload-area').closest('.card');
    var originCard = $('origin-card');
    var submit = $('contribute-submit-btn');
    if (!typeGroup || !infoCard || !genusGroup || !nameGroup || !imgCard || !originCard || !submit) return;
    // the kind first, then the name: move the kind's group to the top of its card (ids unchanged)
    infoCard.insertBefore(typeGroup, infoCard.firstChild);
    typeGroup.setAttribute('data-cstep', '1');
    genusGroup.setAttribute('data-cstep', '1'); nameGroup.setAttribute('data-cstep', '1');
    infoCard.setAttribute('data-cstep', '1');
    Array.prototype.forEach.call(infoCard.children, function (c) { if (!c.hasAttribute('data-cstep')) c.setAttribute('data-cstep', '1'); });
    // the second step: what is known first (the words, the fields), then the photos
    originCard.setAttribute('data-cstep', '2');
    originCard.insertAdjacentElement('afterend', imgCard);
    imgCard.setAttribute('data-cstep', '2');
    // the last step: a label of what will be recorded, then the existing submit button
    var review = document.createElement('div');
    review.className = 'cstep-review'; review.id = 'cstep-review'; review.setAttribute('data-cstep', '3');
    submit.parentNode.insertBefore(review, submit);
    submit.setAttribute('data-cstep', '3');
    // heading line and bottom bar
    var head = document.createElement('div');
    head.className = 'cstep-head'; head.id = 'cstep-head';
    head.innerHTML = '<p class="cstep-head__label"><span class="num" id="cstep-count"></span> · <span id="cstep-name"></span></p><ol class="cstep-head__ticks">' + STEPS.map(function () { return '<li></li>'; }).join('') + '</ol>';
    infoCard.parentNode.insertBefore(head, infoCard);
    var bar = document.createElement('div');
    bar.className = 'cstep-bar'; bar.id = 'cstep-bar';
    bar.innerHTML = '<button type="button" class="btn btn--secondary" id="cstep-back">戻る</button><button type="button" class="btn btn--primary" id="cstep-next">次へ</button>';
    p.appendChild(bar);
    $('cstep-back').addEventListener('click', function () {
      if (step > 1 || history.length > 1) history.back();
      else if (typeof navigateTo === 'function') navigateTo('top');
    });
    $('cstep-next').addEventListener('click', function () {
      if (step === LAST) { var sbtn = $('contribute-submit-btn'); if (sbtn) sbtn.click(); return; }
      if (check(step)) go(step + 1, true);
    });
    // the kind and the name share the first step: choosing a kind only changes the name's fields below it.
    // A seedling has no first step (its name comes from the cross on the second)
    p.querySelectorAll('input[name="cultivar-type"]').forEach(function (r) {
      r.addEventListener('change', function () {
        if (!stepped()) return;
        setTimeout(function () { if (isSeedling() ? step === 1 : false) go(2, false); else go(step, false); }, 60);
      });
    });
    p.addEventListener('click', function (e) {
      var o = e.target.closest && e.target.closest('[data-type-other]');
      if (!o) return;
      if (o.getAttribute('data-type-other') === 'individual') { if (window.aoStartPick) window.aoStartPick('individual'); return; }
      var sr = p.querySelector('input[name="cultivar-type"][value="seedling"]'); if (sr) sr.click();
    });
    // step 1 says the login comes at the end and nothing typed is lost (board 17 T216)
    var login = document.createElement('p');
    login.className = 'cstep-login'; login.id = 'cstep-login';
    login.textContent = '記録するときに Google のログインが要ります（入力した内容は残ります）。';
    typeGroup.insertBefore(login, typeGroup.firstChild);
    var up = p.querySelector('#contribute-upload-area .upload-area__text');
    if (up) up.textContent = '写真を選ぶ・撮る · 3 枚まで（あとから足せます）';
    review.addEventListener('click', function (e) { var a = e.target.closest('[data-goto]'); if (a) { e.preventDefault(); go(+a.getAttribute('data-goto'), true); } });
    built = true;
  }
  // a problem is said under its field, one line, and the field gets the focus (no stack of notices, board 17 T213)
  function fieldError(input, msg) {
    if (typeof clearAllFieldErrors === 'function') clearAllFieldErrors(page());
    if (input && typeof showFieldError === 'function') showFieldError(input, msg); else showToast(msg, true);
    if (input) { input.focus(); if (input.scrollIntoView) input.scrollIntoView({ block: 'center' }); }
    return false;
  }
  function ctype() { return (document.querySelector('#page-contribute input[name="cultivar-type"]:checked') || {}).value || 'species'; }
  // the line under a field goes as soon as the person types in it again
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('form-input--invalid') && t.closest('#page-contribute') && typeof clearFieldError === 'function') clearFieldError(t);
  });
  function check(n) {
    if (typeof clearAllFieldErrors === 'function') clearAllFieldErrors(page());
    if (n === 1 || (n === 2 && isSeedling())) {
      var sel = $('contribute-genus-select');
      if (sel && !sel.value) return fieldError(sel, '属を選んでください');
      var type = ctype();
      var q = (document.querySelector('#species-subcategory .chip.active') || {}).getAttribute ? document.querySelector('#species-subcategory .chip.active').getAttribute('data-subcategory') : 'species';
      var ep = $('nb-epithet'), ex = $('nb-extra'), cn = $('nb-cultivar');
      if (type === 'species' && q === 'sp' && ex && !ex.value.trim()) return fieldError(ex, 'sp. の名前には、産地か呼び名が要ります（例: Peru）');
      if (ep && !ep.hidden && !ep.closest('[hidden]') && ep.value.trim() && !/^[a-z]+(-[a-z]+)*$/.test(ep.value.trim().normalize ? ep.value.trim().normalize('NFKC') : ep.value.trim()))
        return fieldError(ep, '種小名は英字の小文字とハイフンだけで書きます（例: crystallinum）');
      var nm = $('cultivar-name-input');
      if (nm && !nm.value.trim()) {
        var f = window.nameBuilderPrimaryField ? window.nameBuilderPrimaryField(type) : null;
        return fieldError(f || document.querySelector('#name-builder input:not([readonly])'), type === 'clone' || type === 'hybrid' ? 'この欄に名前を入れてください（引用符は要りません）' : type === 'seedling' ? '母と父を入れるか、「交配式が不明」を選んでください' : 'この欄に種小名を入れてください');
      }
      var dup = $('duplicate-alert');
      if (dup && dup.getAttribute('data-kind') === 'exact' && dup.offsetParent) return fieldError(nm, 'この名前はもう収録されています。写真や記録はその名前のページから足せます');
    }
    if (n === 2 && ctype() === 'hybrid') {
      var hb = document.querySelectorAll('#hybrid-formula-inputs input');
      var known = hb.length >= 2 && hb[0].value.trim() && hb[1].value.trim();
      var fu = $('hybrid-formula-unknown'), fc = $('hybrid-formula-complex');
      if (!known && !(fu && fu.checked) && !(fc && fc.checked)) return fieldError(hb[0], '親を 2 つ入れるか、「親が不明」「複合交配」のどちらかを選んでください');
    }
    return true;
  }
  // 書き方の例: a tap puts the example's opening into the body (only into an empty box)
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-words-ex]');
    if (!b) return;
    var box = $('sf-notes');
    if (!box) return;
    var ex = b.getAttribute('data-words-ex'), start = ex.indexOf('例: ');
    var text = start === -1 ? '' : ex.slice(start + 3);
    if (!box.value.trim()) box.value = text;
    box.focus();
    var at = box.value.indexOf('〇〇'); if (at !== -1 && box.setSelectionRange) box.setSelectionRange(at, at + 2);
    if (typeof gtag === 'function') gtag('event', 'words_example', { kind: b.textContent });
  });
  // the parents' fields step aside when the person says the parents are unknown or many
  document.addEventListener('change', function (e) {
    if (!e.target || (e.target.id !== 'hybrid-formula-unknown' && e.target.id !== 'hybrid-formula-complex')) return;
    var other = $(e.target.id === 'hybrid-formula-unknown' ? 'hybrid-formula-complex' : 'hybrid-formula-unknown');
    if (e.target.checked && other) other.checked = false;
    var off = ($('hybrid-formula-unknown') || {}).checked || ($('hybrid-formula-complex') || {}).checked;
    document.querySelectorAll('#hybrid-formula-inputs input').forEach(function (i) { i.disabled = !!off; });
  });
  // capitals: a word of a Clone / Hybrid name that starts in lower case is offered once in title case (not forced:
  // 'Angels dream' stays as its breeder wrote it)
  function titleSuggestion() {
    var t = ctype();
    if (t !== 'clone' && t !== 'hybrid') return '';
    var cn = $('nb-cultivar'); if (!cn) return '';
    var v = cn.value.trim(); if (!v) return '';
    var SMALL = ['of', 'de', 'la', 'del', 'van', 'von', 'x', 'and', 'the', 'y', 'e'];
    var out = v.split(/(\s+)/).map(function (w, i) {
      if (/^\s+$/.test(w) || !/^[a-z]/.test(w) || (i > 0 && SMALL.indexOf(w) !== -1)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join('');
    return out !== v ? out : '';
  }
  function val(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
  function review() {
    var type = (document.querySelector('#page-contribute input[name="cultivar-type"]:checked') || {}).value || 'species';
    var genus = ($('contribute-genus-select') || {}).value || 'Anthurium';
    var full = window.buildContributeFullName ? window.buildContributeFullName(genus, type, val('cultivar-name-input')) : val('cultivar-name-input');
    var sciHtml = function (t) { return typeof italicizeSciNames === 'function' ? italicizeSciNames(esc(t)) : esc(t); };
    var subChip = document.querySelector('#species-subcategory .chip.active');
    var sub = subChip ? subChip.getAttribute('data-subcategory') || '' : '';
    var kinds = { species: '原種', hybrid: 'Hybrid', clone: 'Clone', seedling: '実生' };
    var kindLine = (type !== 'seedling' && window.aoKindChoice ? window.aoKindChoice().label : kinds[type]) + (type === 'species' && sub && sub !== 'species' ? '（未記載 ' + esc(sub) + '.）' : '');
    var words = val('sf-notes');
    var pair = function (sel) { var ins = document.querySelectorAll(sel + ' input'); return ins.length >= 2 ? [ins[0].value.trim(), ins[1].value.trim()] : ['', '']; };
    var pp = type === 'clone' ? pair('#formula-inputs') : type === 'hybrid' ? pair('#hybrid-formula-inputs') : type === 'seedling' ? pair('#seedling-formula-inputs') : ['', ''];
    var known = function (n) { if (!n) return ''; var hit = window.findContributeDuplicate ? window.findContributeDuplicate(/^[A-Z][a-z]+ /.test(n) ? n : genus + ' ' + n, genus).exact : null; return sciHtml(n) + ' <span class="cstep-tag">' + (hit ? '登録済み' : '未登録') + '</span>'; };
    var cross = pp[0] || pp[1] ? known(pp[0] || '不明') + ' × ' + known(pp[1] || '不明') : '';
    var aiFields = window._aiAutofillValues ? Object.keys(window._aiAutofillValues) : [];
    var FIELD = { author_name: '記載者', publication_year: '発表年', collector: '採集者', collection_year: '採集年', type_locality: 'タイプ産地', known_habitats: '分布' };
    // what the record gate will say about this draft
    var hfu = $('hybrid-formula-unknown'), hfc = $('hybrid-formula-complex');
    var draftFs = type === 'hybrid' && !(pp[0] && pp[1]) ? (hfc && hfc.checked ? 'complex' : hfu && hfu.checked ? 'unknown' : null) : null;
    var draft = { _type: type, _formulaStatus: draftFs, origins: [{ trust: 30, source_type: 'manual', body: words, structured: { origin_type: type, author_name: val('sf-author-name'), publication_year: val('sf-publication-year'), type_locality: val('sf-type-locality'), known_habitats: val('sf-known-habitats'), namer: val('sf-clone-namer'), breeder: val('sf-hybrid-breeder') || val('creator-name-input'), formula: (pp[0] && pp[1]) ? { parentA: pp[0], parentB: pp[1] } : null } }] };
    var gate = '';
    try { gate = typeof window.recordStateOf === 'function' ? window.recordStateOf(full, draft, { type: type }) : ''; } catch (e) { gate = ''; }
    var priv = $('seedling-private') && $('seedling-private').checked && type === 'seedling';
    var short = type === 'species' ? '記載者と発表年、または出典' : '作出者か交配式、または出典';
    var scope = priv ? 'あなただけが見られます（非公開の実生）'
      : gate && gate !== 'ok' ? '載ります。ただ、このままだと一覧の終わりの「記録が足りない名前」にまとめられます。' + short + 'を足すと、ふつうに並びます'
      : '一覧・検索に出て、共有もできます';
    var hf = $('hybrid-formula-unknown'), hc = $('hybrid-formula-complex');
    var crossText = cross || (type === 'hybrid' && hc && hc.checked ? '複合交配（2 つに書けない）' : type === 'hybrid' && hf && hf.checked ? '親が不明' : '');
    var rows = [
      ['登録名', sciHtml(full.replace(' [Seedling]', '')), 1],
      ['区分', esc(kindLine), 1],
      ['本文', words ? '<span class="cstep-words">' + esc(words) + '</span><span class="cstep-note">あなたの文のまま載ります。編集部と AI は書き換えません</span>' : '<span class="absent">（本文なし。項目から 1 行を作ります）</span>', 2]
    ];
    // only the rows that belong to this kind (board 17 T216)
    if (type !== 'species') rows.push(['交配式', crossText ? (cross ? crossText : esc(crossText)) : '<span class="absent">（なし）</span>', 2]);
    if (aiFields.length) rows.push(['AI 下書き', esc(aiFields.map(function (f) { return FIELD[f] || f; }).join('・')) + ' <span class="cstep-tag">確かめてください</span>', 2]);
    rows.push(['公開の範囲', esc(scope), 1]);
    var photos = document.querySelectorAll('#contribute-preview img').length;
    var html = '<div class="specimen">' + rows.map(function (r) {
      return '<div class="specimen__cell"><span class="specimen__k">' + esc(r[0]) + '</span><span class="specimen__v"><span>' + r[1] + '</span> <a href="#" class="cstep-fix" data-goto="' + r[2] + '">直す</a></span></div>';
    }).join('') + '</div>';
    html += '<p class="cstep-review__scope">写真 ' + (photos ? photos + ' 枚' : 'なし（あとから足せます）') + '</p>';
    if (window.aoQuickPost && window.aoQuickPost()) html += '<p class="cstep-quick">写真と名前だけの投稿です。確認待ちとして載り、一覧では「記録が足りない名前」にまとめられます。区分や由来がそろうと、ふつうに並びます。</p>';
    // a name one or two letters from one already here: asked once more, here, before it is recorded (11-27)
    var near = [];
    try { near = window.findContributeDuplicate ? window.findContributeDuplicate(full, genus).near : []; } catch (e) { near = []; }
    if (near.length) {
      html += '<div class="cstep-near"><p class="cstep-near__q">似た名前がもうあります。打ち間違いではありませんか？</p><ul>' + near.map(function (n) {
        var nm = n.replace(' [Seedling]', '');
        return '<li>' + sciHtml(nm) + ' <a href="#" data-nav="cultivar" data-key="' + esc(n) + '">この名前のページを見る</a></li>';
      }).join('') + '</ul><p class="cstep-note">同じ植物なら、そのページから写真や記録を足せます。別の植物なら、このまま記録して大丈夫です。<a href="#" class="cstep-fix" data-goto="1">名前を直す</a></p></div>';
    }
    // the scientific-name check's note, said once more before recording (item 2, 11-27)
    var nc = window.aoNameCheck ? window.aoNameCheck() : null;
    if (nc) html += nc;
    var sug = titleSuggestion();
    if (sug) html += '<p class="cstep-suggest">表記の確認: <b>\'' + esc(sug) + '\'</b> ではありませんか？ <button type="button" class="cstep-suggest__btn" data-title-fix="' + esc(sug) + '">こちらにする</button> <span class="cstep-note">作出者の書いたとおりなら、このままで大丈夫です</span></p>';
    $('cstep-review').innerHTML = html;
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-title-fix]');
    if (!b) return;
    var cn = $('nb-cultivar'); if (!cn) return;
    cn.value = b.getAttribute('data-title-fix');
    cn.dispatchEvent(new Event('input', { bubbles: true }));
    setTimeout(review, 50);
  });
  window.aoContributeReview = function () { if ($('cstep-review') && step === LAST) review(); };
  function go(n, push) {
    var seed = isSeedling(), first = seed ? 2 : 1;
    n = Math.max(first, Math.min(LAST, n));
    step = n;
    var p = page();
    p.querySelectorAll('[data-cstep]').forEach(function (el) {
      var at = el.getAttribute('data-cstep').split(' ');
      // a seedling's name (label, registered name) sits with its cross on the one recording step
      var show = at.indexOf(String(n)) !== -1 || (seed && n === 2 && at.indexOf('1') !== -1);
      el.classList.toggle('cstep-off', !show);
    });
    $('cstep-count').textContent = (n - first + 1) + ' / ' + (LAST - first + 1);
    $('cstep-name').textContent = seed && n === 2 ? '記録' : STEPS[n - 1];
    Array.prototype.forEach.call($('cstep-head').querySelectorAll('li'), function (li, i) { li.classList.toggle('is-done', i < n); li.hidden = seed && i === 0; });
    $('cstep-back').textContent = n === first ? 'やめる' : '戻る';
    // the last step: the bar's main button records (the form's own submit button is hidden while stepped)
    $('cstep-next').textContent = n === LAST ? 'この内容で記録する' : '次へ';
    var ttl = $('contribute-page-title'); if (ttl) ttl.textContent = seed ? '実生を記録' : '新しい種・品種を登録';
    if (n === LAST) review();
    p.setAttribute('data-cstep-now', String(n === first ? 1 : n));
    var ln = $('cstep-login'); if (ln) ln.hidden = !!window._currentUser;
    // a name-check notice from the previous step is not left on screen (R8)
    document.querySelectorAll('#toast-container .toast-error').forEach(function (t) { t.remove(); });
    if (push) history.pushState({ page: 'contribute', cstep: n }, '', location.href);
    if (typeof gtag === 'function') gtag('event', 'contribute_step', { step: n });
    window.scrollTo(0, 0);
  }
  function stepperInit() {
    var p = page();
    if (!p) return;
    var want = on() && !editingOrIndividual();
    if (!want) {
      p.classList.remove('contribute--stepped');
      p.querySelectorAll('.cstep-off').forEach(function (el) { el.classList.remove('cstep-off'); });
      document.body.classList.remove('appbar-hidden');
      document.body.classList.remove('cstep-on');
      return;
    }
    build();
    if (!built) return;
    p.classList.add('contribute--stepped');
    document.body.classList.add('appbar-hidden');
    document.body.classList.add('cstep-on');
    // the one genus that is open is chosen for the person
    var sel = $('contribute-genus-select');
    if (sel) {
      var opts = Array.prototype.filter.call(sel.options, function (o) { return !o.disabled && o.value; });
      if (opts.length === 1) {
        if (!sel.value) { sel.value = opts[0].value; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        var grp = sel.closest('.form-group');
        if (grp && !grp.querySelector('.cstep-genus')) { var line = document.createElement('p'); line.className = 'cstep-genus'; line.innerHTML = '属 <i>' + esc(opts[0].textContent.trim()) + '</i>'; grp.appendChild(line); }
        if (grp) grp.classList.add('cstep-one-genus');
      }
    }
    var st = history.state && history.state.cstep;
    go(st || 1, false);
    if (!st) history.replaceState(Object.assign({}, history.state || {}, { page: 'contribute', cstep: 1 }), '', location.href);
  }
  // editing an entry or adding an individual uses the one-page form
  ['enterEditMode', 'exitEditMode', 'setIndividualMode'].forEach(function (fn) {
    var orig = window[fn];
    if (typeof orig !== 'function') return;
    window[fn] = function () { var r = orig.apply(this, arguments); if (currentPage() === 'contribute') stepperInit(); return r; };
  });
  window.addEventListener('popstate', function (e) {
    if (e.state && e.state.page === 'contribute' && e.state.cstep && stepped()) setTimeout(function () { go(e.state.cstep, false); }, 0);
  });
  document.addEventListener('ao:page', function (e) { if (e.detail !== 'contribute') document.body.classList.remove('cstep-on'); });
  // a failed check on submit points at a field in some step: show that step
  var sb = $('contribute-submit-btn');
  if (sb) sb.addEventListener('click', function () {
    if (!stepped()) return;
    setTimeout(function () {
      var bad = document.querySelector('#page-contribute .form-input--invalid');
      var holder = bad && bad.closest('[data-cstep]');
      if (holder) go(+holder.getAttribute('data-cstep').split(' ').pop(), true);
    }, 50);
  });

  // ---- 自分の株 (§4-6, board 14 T181): the person's entries as list lines, each with 写真を追加 · 記録を追加 ----
  var _loadMyPostsPlain = null;
  function loadMine() {
    var grid = $('mypost-grid'), emptyMsg = $('mypost-empty'), loginMsg = $('mypost-login-msg');
    if (!grid) return;
    grid.className = 'mypost-list';
    if (!window._currentUser) {
      grid.innerHTML = '<p class="mypost-login"><button type="button" class="btn btn--primary" id="mypost-login-btn">Google でログイン</button></p>';
      if (loginMsg) { loginMsg.style.display = ''; loginMsg.classList.remove('d-none'); }
      if (emptyMsg) emptyMsg.style.display = 'none';
      var lb = $('mypost-login-btn');
      if (lb) lb.addEventListener('click', function () { if (window.requireLogin) window.requireLogin({ a: 'mypost', path: (typeof _basePath !== 'undefined' ? _basePath : '/') + 'mypost' }); });
      drawMineExample(grid);
      return;
    }
    if (loginMsg) loginMsg.style.display = 'none';
    var sbc = window._supabaseClient;
    if (!sbc) return;
    grid.innerHTML = '<p class="text-muted">読み込み中…</p>';
    var meId = window._currentUser.id;
    Promise.all([
      sbc.from('cultivars').select('id, genus, cultivar_name, type, created_at, origins, tags, is_private')
        .eq('user_id', meId).order('created_at', { ascending: false }).limit(200),
      // the names the person put photos on, also when someone else recorded the name (T199 B14)
      sbc.from('cultivar_images').select('cultivar_name, created_at').eq('user_id', meId).order('created_at', { ascending: false }).limit(300)
    ]).then(function (both) {
        var res = both[0], mine = both[1];
        if (res.error) { grid.innerHTML = '<p class="error-text">読み込めませんでした。もう一度開いてください</p>'; return; }
        var rows = res.data || [];
        var have = {};
        rows.forEach(function (r) { have[String(r.cultivar_name || '').replace(' [Seedling]', '')] = 1; });
        ((mine && mine.data) || []).forEach(function (i) {
          var n = i.cultivar_name, c = (typeof cultivarData !== 'undefined') && cultivarData[n];
          if (!n || have[n] || !c) return;
          have[n] = 1;
          rows.push({ id: c._id, genus: n.split(' ')[0], cultivar_name: n, type: c._type || 'species', created_at: i.created_at, origins: c.origins || [], tags: c._tags || [], is_private: false, _photoOnly: true });
        });
        if (!rows.length) {
          // nothing yet: just the way to start (the allowance shows once it matters, board 14 T181)
          grid.innerHTML = '';
          if (emptyMsg) { emptyMsg.style.display = ''; emptyMsg.classList.remove('d-none'); }
          return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';
        // photos are filed under the shown name (a seedling without ' [Seedling]')
        var shown = function (n) { return String(n || '').replace(' [Seedling]', ''); };
        var names = rows.map(function (r) { return shown(r.cultivar_name); });
        // newest photo first: it is the thumbnail and its date is the line's date
        return sbc.from('cultivar_images').select('cultivar_name, storage_path, created_at, taken_on').in('cultivar_name', names).order('created_at', { ascending: false }).then(function (ir) {
          var count = {}, first = {}, lastAt = {};
          (ir.data || []).forEach(function (i) {
            count[i.cultivar_name] = (count[i.cultivar_name] || 0) + 1;
            if (!first[i.cultivar_name]) { first[i.cultivar_name] = i.storage_path; lastAt[i.cultivar_name] = i.taken_on ? { label: '撮影', day: i.taken_on } : { label: '写真', day: i.created_at }; }
          });
          rows.forEach(function (r) { count[r.cultivar_name] = count[shown(r.cultivar_name)]; first[r.cultivar_name] = first[shown(r.cultivar_name)]; lastAt[r.cultivar_name] = lastAt[shown(r.cultivar_name)]; });
          var priv = rows.filter(function (r) { return r.is_private; }).length;
          var seeds = rows.filter(function (r) { return r.type === 'seedling'; }).length;
          var day = function (t) { return t ? String(t).slice(0, 10).replace(/-/g, '.') : ''; };
          var foldQ = typeof foldName === 'function' ? foldName : function (t) { return String(t || '').toLowerCase(); };
          var baseUrl = window._SUPABASE_URL || '';
          var items = [];
          rows.forEach(function (r) {
            var cached = (typeof cultivarData !== 'undefined' && cultivarData[r.cultivar_name]) || null;
            var origins = (r.origins || []).filter(function (o) { return !(o && o._type === 'formula'); });
            var d = window._describeEntry(r.cultivar_name, cached || { origins: origins, _type: r.type, _id: r.id, tags: r.tags }, r.type);
            var thumb = first[r.cultivar_name] && baseUrl ? (window.galleryImg ? window.galleryImg(first[r.cultivar_name], 120) : baseUrl + '/storage/v1/object/public/gallery-images/' + first[r.cultivar_name]) : '';
            var line = window.entryLine(d, { thumb: thumb, noPerson: true });
            var n = count[r.cultivar_name] || 0;
            var acts = (r.is_private ? '<span class="mypost-acts__note">非公開（写真もあなただけ）</span> ' : '')
              + (r._photoOnly ? '<span class="mypost-acts__note">写真を載せた名前</span> ' : '')
              + '<button type="button" data-my="pick" data-key="' + esc(r.cultivar_name) + '">写真を追加</button>'
                + (r.type === 'seedling' ? '' : (LABEL ? ' ' : ' · ') + '<button type="button" data-my="record" data-key="' + esc(r.cultivar_name) + '">記録を追加</button>');
            // the last photo's day (撮影 when the photo carries it), else the day the plant was added
            var last = lastAt[r.cultivar_name];
            var sep = LABEL ? '、' : ' · ';
            var meta = n ? '写真 <span class="num">' + n + '</span>' + sep + last.label + ' <span class="num">' + esc(day(last.day)) + '</span>' : '写真なし' + sep + '登録 <span class="num">' + esc(day(r.created_at)) + '</span>';
            line = line.replace(/<\/li>$/, '<p class="mypost-acts"><span class="mypost-acts__meta">' + meta + '</span>' + acts + '</p></li>');
            items.push({ r: r, n: n, name: d.shownName || shown(r.cultivar_name), fold: foldQ(shown(r.cultivar_name)), at: n ? String(last.day) : '', html: line });
          });
          var state = { f: 'all', sort: 'new', q: '' };
          var many = items.length >= 8;
          var noPhoto = items.filter(function (x) { return !x.n; }).length;
          var head = '<p class="mypost-counts">株 <span class="num">' + items.length + '</span>' + (priv ? ' · 非公開 <span class="num">' + priv + '</span>' : '') + '</p>'
            + '<div id="mypost-updates"></div>'
            + (noPhoto ? '<p class="mypost-next"><button type="button" data-my-filter="nophoto">写真のない株が <span class="num">' + noPhoto + '</span> 件あります → 写真を足す</button></p>' : '');
          if (many) {
            var chip = function (k, label) { return '<button type="button" class="chip" aria-pressed="' + (k === 'all') + '" data-my-filter="' + k + '">' + label + '</button>'; };
            head += '<div class="mypost-tools"><div class="chips">' + chip('all', 'すべて') + (noPhoto ? chip('nophoto', '写真なし') : '') + (seeds ? chip('seedling', '実生') : '') + (priv ? chip('private', '非公開') : '') + '</div>'
              + '<div class="mypost-tools__row"><input type="search" class="form-input" id="mypost-q" placeholder="名前で絞り込む" aria-label="名前で絞り込む" autocomplete="off">'
              + '<select class="form-input" id="mypost-sort" aria-label="並べ替え"><option value="new">新しい順</option><option value="name">名前順</option><option value="old-photo">写真が古い順</option></select></div></div>';
          }
          // the seedling allowance and the members' notice: only once the count gets near the free 20 (board 10: when it matters)
          var foot = (seeds >= 15 && !window._MEMBER_PAUSED ? '<p class="mypost-quota">実生 <span class="num">' + seeds + ' / 20</span>（無料） <span id="mypost-notify"></span></p>' : '')
            + '<p class="mypost-foot"><button type="button" class="mypost-notify-btn" data-my-export>記録を書き出す（CSV）</button></p>';
          grid.innerHTML = head + '<p class="mypost-filtered" hidden><span></span> <button type="button" class="mypost-notify-btn" data-my-filter="all">すべて表示</button></p><ol class="entries" id="mypost-entries"></ol>' + foot;
          function draw() {
            var list = items.filter(function (x) {
              if (state.f === 'nophoto' && x.n) return false;
              if (state.f === 'seedling' && x.r.type !== 'seedling') return false;
              if (state.f === 'private' && !x.r.is_private) return false;
              return !state.q || x.fold.indexOf(state.q) !== -1;
            });
            if (state.sort === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
            // 写真が古い順: plants without a photo first, then the longest since a photo
            if (state.sort === 'old-photo') list.sort(function (a, b) { return (a.at || '0').localeCompare(b.at || '0'); });
            $('mypost-entries').innerHTML = list.map(function (x) { return x.html; }).join('') || '<li class="mypost-none">当てはまる株はありません</li>';
            var note = grid.querySelector('.mypost-filtered');
            var label = { nophoto: '写真のない株', seedling: '実生', private: '非公開' }[state.f];
            note.hidden = !(label && !many);
            if (label) note.querySelector('span').textContent = label + ' ' + list.length + ' 件を表示中';
            grid.querySelectorAll('.mypost-tools [data-my-filter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-my-filter') === state.f)); });
          }
          grid.onclick = function (e) {
            var b = e.target.closest('[data-my-filter]');
            if (!b) return;
            state.f = b.getAttribute('data-my-filter');
            draw();
            if (state.f === 'nophoto') { var top = $('mypost-entries'); if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
          };
          var qi = $('mypost-q'), so = $('mypost-sort');
          if (qi) qi.addEventListener('input', function () { state.q = foldQ(qi.value.trim()); draw(); });
          if (so) so.addEventListener('change', function () { state.sort = so.value; draw(); });
          draw();
          drawInstallLine(grid);
          drawNotifyLink($('mypost-notify'), 'mypost');
          if (window.drawMyUpdates) window.drawMyUpdates($('mypost-updates'));
        });
      });
  }
  // home-screen hint (board 17 T222): from the second visit, never in the installed app, gone once closed
  (function () { try { if (!sessionStorage.getItem('ao-visit-counted')) { sessionStorage.setItem('ao-visit-counted', '1'); localStorage.setItem('ao-visits', String((+localStorage.getItem('ao-visits') || 0) + 1)); } } catch (e) {} })();
  function drawInstallLine(grid) {
    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
    var visits = 0, shut = false;
    try { visits = +localStorage.getItem('ao-visits') || 0; shut = !!localStorage.getItem('ao-a2hs-shut'); } catch (e) { return; }
    if (standalone || shut || visits < 2 || !grid || document.getElementById('a2hs-line')) return;
    var ios = /iPhone|iPad|iPod/.test(navigator.userAgent || '');
    var can = window.aoCanInstall && window.aoCanInstall();
    if (!ios && !can) return;
    grid.insertAdjacentHTML('beforeend', '<p class="a2hs-line" id="a2hs-line">' + (ios ? 'Safari の共有ボタン（□↑）から「ホーム画面に追加」を選ぶと、アプリのように開けます。' : 'ホーム画面に追加すると、アプリのように開けます。 <button type="button" class="mypost-notify-btn" data-a2hs-go>追加する</button>')
      + ' <button type="button" class="mypost-notify-btn" data-a2hs-shut>閉じる</button></p>');
  }
  document.addEventListener('click', function (e) {
    var go = e.target.closest && e.target.closest('[data-a2hs-go]'), shut = e.target.closest && e.target.closest('[data-a2hs-shut]');
    if (!go && !shut) return;
    if (go && window.aoInstall) window.aoInstall();
    try { localStorage.setItem('ao-a2hs-shut', String(Date.now())); } catch (er) {}
    var l = document.getElementById('a2hs-line'); if (l) l.remove();
  });
  // logged out: what the page becomes, with three of the operator's public plants that have photos (board 16 G10)
  var MINE_EXAMPLE_USER = '629508da-9fdd-4d3a-9ec6-22fd3bdb7346';
  function drawMineExample(grid) {
    var sbc = window._supabaseClient;
    if (!sbc || !window.entryLine || !window._describeEntry) return;
    sbc.from('cultivars').select('id, cultivar_name, type, origins, tags').eq('user_id', MINE_EXAMPLE_USER).eq('is_private', false).limit(100).then(function (res) {
      var rows = (res && res.data) || [];
      if (!rows.length) return;
      var shown = function (n) { return String(n || '').replace(' [Seedling]', ''); };
      return sbc.from('cultivar_images').select('cultivar_name, storage_path, created_at').in('cultivar_name', rows.map(function (r) { return shown(r.cultivar_name); })).order('created_at', { ascending: false }).then(function (ir) {
        var count = {}, first = {};
        ((ir && ir.data) || []).forEach(function (i) {
          if (/^pv:/.test(i.storage_path || '')) return;
          count[i.cultivar_name] = (count[i.cultivar_name] || 0) + 1;
          if (!first[i.cultivar_name]) first[i.cultivar_name] = i;
        });
        var pick = rows.filter(function (r) { return count[shown(r.cultivar_name)]; })
          .sort(function (a, b) { return String(first[shown(b.cultivar_name)].created_at).localeCompare(String(first[shown(a.cultivar_name)].created_at)); }).slice(0, 3);
        if (!pick.length || window._currentUser || !grid.isConnected) return;
        var day = function (t) { return t ? String(t).slice(0, 10).replace(/-/g, '.') : ''; };
        var html = pick.map(function (r) {
          var n = shown(r.cultivar_name), cached = (typeof cultivarData !== 'undefined' && cultivarData[r.cultivar_name]) || null;
          var d = window._describeEntry(r.cultivar_name, cached || { origins: r.origins || [], _type: r.type, _id: r.id, tags: r.tags }, r.type);
          var thumb = window.galleryImg ? window.galleryImg(first[n].storage_path, 120) : '';
          var line = window.entryLine(d, { thumb: thumb, noPerson: true });
          return line.replace(/<\/li>$/, '<p class="mypost-acts"><span class="mypost-acts__meta">写真 <span class="num">' + count[n] + '</span>、写真 <span class="num">' + esc(day(first[n].created_at)) + '</span></span></p></li>');
        }).join('');
        var old = document.getElementById('mypost-example'); if (old) old.remove();
        grid.insertAdjacentHTML('beforeend', '<section class="mypost-example" id="mypost-example"><h2 class="mypost-example__head">たとえば、こう並びます</h2><p class="mypost-example__note">運営者の株から 3 件。ログインすると、あなたの株がこの形で並び、写真や記録をここから足せます。</p><ol class="entries">' + html + '</ol></section>');
      });
    });
  }
  // 「書き出す（CSV）」: the person's own entries and photos, private ones included; free, also after membership ends (T132)
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-my-export]');
    if (!b || !window._supabaseClient || !window._currentUser) return;
    b.disabled = true;
    window._supabaseClient.rpc('my_export').then(function (r) {
      b.disabled = false;
      var d = r && r.data;
      if (!d || d.success === false) { showToast('書き出せませんでした。もう一度お試しください', true); return; }
      var q = function (v) { v = v == null ? '' : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      var day = function (t) { return t ? String(t).slice(0, 10).replace(/-/g, '.') : ''; };
      var kind = { species: '原種', clone: 'Clone', hybrid: 'Hybrid', seedling: '実生', unknown: '不明' };
      var base = (window._SUPABASE_URL || '') + '/storage/v1/object/public/gallery-images/';
      var lines = [['種類', '名前', '区分', '公開', '作出者・記載者', '母', '父', '播種日', '本文', '撮影日', '写真のひとこと', '撮影者', 'リンク', '写真', '登録日'].join(',')];
      (d.entries || []).forEach(function (x) {
        lines.push(['記録', String(x.name || '').replace(' [Seedling]', ''), kind[x.type] || x.type || '', x.private ? '非公開' : '公開', x.breeder, x.parent_a, x.parent_b, day(x.sowing_date), x.body, '', '', '', '', '', day(x.created_at)].map(q).join(','));
      });
      (d.photos || []).forEach(function (x) {
        var pv = /^pv:/.test(x.path || '');
        lines.push(['写真', x.name, '', pv ? '非公開' : '公開', '', '', '', '', '', day(x.taken_on), x.caption, x.credit, x.link, pv ? '（非公開の写真はサイトの中だけで見られます）' : base + String(x.path || '').split('/').map(encodeURIComponent).join('/'), day(x.created_at)].map(q).join(','));
      });
      var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'aroid-origins-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      showToast('記録 ' + (d.entries || []).length + ' 件・写真 ' + (d.photos || []).length + ' 枚を書き出しました');
      var dl = window.aoDonateHtml && window.aoDonateHtml('csv');
      var shut = 0; try { shut = +localStorage.getItem('ao-donate-shut') || 0; } catch (er) {}
      if (dl && Date.now() - shut > 30 * 864e5 && b.parentNode && !document.getElementById('donate-after-csv')) {
        b.parentNode.insertAdjacentHTML('afterend', '<p class="donate-after" id="donate-after-csv">' + dl + ' <button type="button" class="mypost-notify-btn" data-donate-shut>閉じる</button></p>');
      }
      if (typeof gtag === 'function') gtag('event', 'my_export', { entries: (d.entries || []).length, photos: (d.photos || []).length });
    }, function () { b.disabled = false; showToast('書き出せませんでした。もう一度お試しください', true); });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('[data-donate-shut]')) return;
    try { localStorage.setItem('ao-donate-shut', String(Date.now())); } catch (er) {}
    var p = document.getElementById('donate-after-csv'); if (p) p.remove();
  });
  // 「会員の受付開始を知らせる」 / 「登録済み · 取り消す」 (the list lives in member_interest; join/leave in app-core)
  function drawNotifyLink(el, source) {
    if (window._MEMBER_PAUSED) { if (el) el.innerHTML = ''; return; }   // no sign-up to be told about
    if (!el || !window._currentUser || !window._supabaseClient) return;
    window._supabaseClient.from('member_interest').select('user_id').eq('user_id', window._currentUser.id).maybeSingle().then(function (r) {
      var joined = !!(r && r.data);
      // what it is, in so many words: one e-mail when sign-up opens; and a way back out on the same line (board 11 T154)
      el.innerHTML = joined
        ? '· 受付開始のメール: 登録済み · <button type="button" class="mypost-notify-btn" data-notify-leave>取り消す</button>'
        : '· <button type="button" class="mypost-notify-btn" data-notify-join>会員の受付開始をメールで受け取る（1 回だけ）</button>';
      var join = el.querySelector('[data-notify-join]'), leave = el.querySelector('[data-notify-leave]');
      if (join) join.addEventListener('click', function () { if (window.joinMemberNotify) window.joinMemberNotify(source); setTimeout(function () { drawNotifyLink(el, source); }, 1200); });
      if (leave) leave.addEventListener('click', function () {
        window._supabaseClient.from('member_interest').delete().eq('user_id', window._currentUser.id).then(function (d) {
          if (d.error) { showToast('取り消せませんでした。時間をおいてお試しください', true); return; }
          showToast('お知らせの登録を取り消しました');
          if (typeof gtag === 'function') gtag('event', 'member_notify_cancel', { source: source });
          drawNotifyLink(el, source);
        });
      });
    }, function () {});
  }
  window.drawNotifyLink = drawNotifyLink;
  function drawPricingNotify() {
    var el = $('pricing-notify');
    if (!el) return;
    var plain = '<button class="btn btn--primary" type="button" data-action="open-paywall">受付開始のお知らせを受け取る</button>';
    if (!window._currentUser || !window._supabaseClient) { el.innerHTML = plain; return; }
    window._supabaseClient.from('member_interest').select('user_id').eq('user_id', window._currentUser.id).maybeSingle().then(function (r) {
      var joined = !!(r && r.data);
      el.innerHTML = joined
        ? '<p class="pricing-notify__on">受付開始のメール: 登録済み <button type="button" class="mypost-notify-btn" data-pn-leave>取り消す</button></p>'
        : '<button class="btn btn--primary" type="button" data-pn-join>受付開始のお知らせを受け取る</button>';
      var join = el.querySelector('[data-pn-join]'), leave = el.querySelector('[data-pn-leave]');
      if (join) join.addEventListener('click', function () { join.disabled = true; if (window.joinMemberNotify) window.joinMemberNotify('pricing'); setTimeout(drawPricingNotify, 1400); });
      if (leave) leave.addEventListener('click', function () {
        window._supabaseClient.from('member_interest').delete().eq('user_id', window._currentUser.id).then(function (d) {
          if (d.error) { showToast('取り消せませんでした。時間をおいてお試しください', true); return; }
          showToast('お知らせの登録を取り消しました');
          if (typeof gtag === 'function') gtag('event', 'member_notify_cancel', { source: 'pricing' });
          drawPricingNotify();
        });
      });
    }, function () { el.innerHTML = plain; });
  }
  document.addEventListener('ao:page', function (e) { if (e.detail === 'pricing') drawPricingNotify(); });
  function hookMyPosts() {
    if (_loadMyPostsPlain || typeof window.loadMyPosts !== 'function') return;
    _loadMyPostsPlain = window.loadMyPosts;
    window.loadMyPosts = function () { return on() ? loadMine() : _loadMyPostsPlain.apply(this, arguments); };
  }
  hookMyPosts();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hookMyPosts);
  var _pickFor = '';
  // /wanted/ rows: log in first (a file chosen before the login would be lost), then the picker, inside the tap
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-wanted-pick]');
    if (!b) return;
    var key = b.getAttribute('data-wanted-pick');
    if (window.requireLogin && !window.requireLogin({ a: 'photo', k: key, path: location.pathname })) return;
    _pickFor = key;
    var inp = $('sheet-pick-input'); if (inp) inp.click();
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-my]');
    if (!b) return;
    var key = b.getAttribute('data-key'), act = b.getAttribute('data-my');
    if (act === 'pick' || act === 'shoot') {
      _pickFor = key;
      var inp = $(act === 'pick' ? 'sheet-pick-input' : 'sheet-shoot-input');
      if (inp) inp.click();
    } else if (act === 'record') {
      if (typeof navigateTo === 'function') navigateTo('cultivar', { cultivar: key });
      var tries = 0;
      (function wait() {
        if (entryName() === key) { var rb = $('detail-add-record-btn'); if (rb) rb.click(); return; }
        if (++tries < 40) setTimeout(wait, 200);
      })();
    }
  });
  ['sheet-pick-input', 'sheet-shoot-input'].forEach(function (id) {
    var inp = $(id);
    if (inp) inp.addEventListener('change', function () {
      var files = Array.prototype.slice.call(this.files || []);
      this.value = '';
      if (files.length && _pickFor && window.openPhotoSheet) window.openPhotoSheet(_pickFor, files);
    });
  });
  document.addEventListener('ao:photo-sent', function () { if (on() && currentPage() === 'mypost') loadMine(); });
  // measuring the new screens (board 9 T115): which interface, and opened from the home screen or not
  if (typeof gtag === 'function') {
    var dm = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser';
    gtag('set', 'user_properties', { app_ui: on() ? '1' : '0', display_mode: dm });
    try { if (!sessionStorage.getItem('ao-dm-sent')) { gtag('event', 'display_mode', { mode: dm, app_ui: on() ? 1 : 0 }); sessionStorage.setItem('ao-dm-sent', '1'); } } catch (e) {}
  }
  // ?do=photo|record|seedling|new|mypost&k=<entry>: the action asked for elsewhere (an in-app browser's copied link,
  // a home-screen shortcut) continues here — after the login if needed (board 9 T118/T122)
  (function () {
    var q = new URLSearchParams(location.search), act = q.get('do'), k = q.get('k') || '';
    if (!act) return;
    q.delete('do'); q.delete('k');
    history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q.toString() : '') + location.hash);
    var base = (typeof _basePath !== 'undefined' ? _basePath : '/');
    var intent = act === 'photo' ? { a: 'photo', k: k } : act === 'record' ? { a: 'record', k: k } : act === 'mypost' ? { a: 'mypost', path: base + 'mypost' }
      : { a: 'contribute', type: act === 'seedling' ? 'seedling' : '', parent: act === 'seedling' ? k : '', path: base + 'contribute' };
    var t0 = Date.now();
    (function go() {
      if (!window._dataFullyLoaded && Date.now() - t0 < 8000) { setTimeout(go, 300); return; }
      setTimeout(function () {
        if (!window._currentUser) { if (window.requireLogin) window.requireLogin(intent); return; }
        if ((act === 'photo' || act === 'record') && k && typeof navigateTo === 'function') navigateTo('cultivar', { cultivar: k });
        if (window.resumeLoginIntentPublic) window.resumeLoginIntentPublic(intent);
      }, 900);
    })();
  })();
  // opened from the home screen: no browser Back button, so the header has one after the first move
  var standaloneMode = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  var moves = 0;
  document.addEventListener('ao:page', function () {
    moves++;
    var b = $('header-back');
    if (b) b.classList.toggle('d-none', !(standaloneMode && moves > 1));
  });
  var hb = $('header-back');
  if (hb) hb.addEventListener('click', function () { history.back(); });
  // 「前回から」 on the top page: what the archive gained since this browser's last visit (T124)
  var fmtDay = function (t) { var d = new Date(t); return (d.getMonth() + 1) + '.' + d.getDate(); };
  function sinceLine() {
    var page = document.getElementById('page-top');
    if (!page || !page.classList.contains('active')) return;
    var last = null;
    try { last = localStorage.getItem('ao-last-visit'); } catch (e) {}
    var stamp = function () { try { localStorage.setItem('ao-last-visit', new Date().toISOString()); } catch (e) {} };
    if (!last) { stamp(); return; }
    if (Date.now() - new Date(last).getTime() < 30 * 60 * 1000) return;   // the same visit
    var t0 = Date.now();
    (function draw() {
      if ((!window._dataFullyLoaded || !window._photoTimes) && Date.now() - t0 < 8000) { setTimeout(draw, 400); return; }
      var items = (typeof _genusItems !== 'undefined') ? [].concat.apply([], Object.keys(_genusItems).map(function (k) { return _genusItems[k] || []; })) : [];
      var entries = items.filter(function (it) { return it.meta && it.meta.type !== 'seedling' && it.meta.created_at && it.meta.created_at > last; }).length;
      var photos = (window._photoTimes || []).filter(function (t) { return t > last; }).length;
      stamp();
      if (!entries && !photos) return;
      var el = document.getElementById('since-line');
      if (!el) { el = document.createElement('p'); el.id = 'since-line'; el.className = 'since-line'; var c = page.querySelector('.container'); if (c) c.insertBefore(el, c.firstChild); }
      el.innerHTML = '前回（<span class="num">' + fmtDay(last) + '</span>）から — ' + [entries ? '収録 <span class="num">+' + entries + '</span>' : '', photos ? '写真 <span class="num">+' + photos + '</span>' : ''].filter(Boolean).join(' · ');
      if (typeof gtag === 'function') gtag('event', 'since_line', { entries: entries, photos: photos });
    })();
  }
  document.addEventListener('ao:page', function (e) { if (e.detail === 'top') setTimeout(sinceLine, 0); });
  // the updates are read without marking them seen (自分の株 marks them), so the home and the bar can point to them
  function peekUpdates(cb) {
    if (!window._currentUser || !window._supabaseClient) return;
    var since = null;
    try { since = localStorage.getItem('ao-last-mypost:' + window._currentUser.id); } catch (e) {}
    window._supabaseClient.rpc('my_updates', { p_since: since || new Date(Date.now() - 14 * 864e5).toISOString() }).then(function (r) {
      var d = r && r.data; if (!d || d.success === false) { cb([]); return; }
      var shown = function (n) { return esc(String(n || '').replace(' [Seedling]', '')); };
      var lines = [];
      (d.photos || []).forEach(function (x) { lines.push('<i>' + shown(x.name) + '</i> に写真が足されました'); });
      (d.records || []).forEach(function (x) { lines.push('<i>' + shown(x.name) + '</i> に記録が足されました'); });
      (d.verified || []).forEach(function (x) { lines.push('<i>' + shown(x.name) + '</i> が検証済になりました'); });
      cb(lines);
    }, function () { cb([]); });
  }
  function markBar(n) {
    var a = document.querySelector('.appbar [data-appbar="mypost"]');
    if (a) a.classList.toggle('has-dot', n > 0);
  }
  function mineLine() {
    var page = document.getElementById('page-top');
    var old = document.getElementById('mine-line');
    if (!window._currentUser || !window._supabaseClient || !page) { if (old) old.remove(); markBar(0); return; }
    var sbc = window._supabaseClient, me = window._currentUser.id;
    Promise.all([
      sbc.from('cultivars').select('id', { count: 'exact', head: true }).eq('user_id', me),
      sbc.from('cultivar_images').select('created_at, taken_on').eq('user_id', me).order('created_at', { ascending: false }).limit(1)
    ]).then(function (r) {
      var n = (r[0] && r[0].count) || 0, last = r[1] && r[1].data && r[1].data[0];
      peekUpdates(function (lines) {
        markBar(lines.length);
        var el = document.getElementById('mine-line');
        if (!el) { el = document.createElement('div'); el.id = 'mine-line'; el.className = 'mine-line'; var c = page.querySelector('.container'); if (!c) return; var sl = document.getElementById('since-line'); if (sl && sl.parentNode === c) sl.insertAdjacentElement('afterend', el); else c.insertBefore(el, c.firstChild); }
        var day = function (t) { return t ? String(t).slice(0, 10).replace(/-/g, '.') : ''; };
        el.innerHTML = '<p class="mine-line__row"><a href="' + esc((typeof _basePath !== 'undefined' ? _basePath : '/') + 'mypost') + '" data-nav="mypost">自分の株 <span class="num">' + n + '</span></a>'
          + (last ? '<span class="mine-line__seg">最後の写真 <span class="num">' + esc(day(last.taken_on || last.created_at)) + '</span></span>' : '')
          + '<button type="button" class="mine-line__btn" data-mine-photo>写真を追加</button></p>'
          + (lines.length ? '<ul class="mine-line__news">' + lines.slice(0, 3).map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' : '');
      });
    });
  }
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('[data-mine-photo]')) { if (window.aoStartPick) window.aoStartPick('photo'); } });
  document.addEventListener('ao:page', function (e) { if (e.detail === 'top') setTimeout(mineLine, 200); if (e.detail === 'mypost') markBar(0); });
  document.addEventListener('ao:auth', function () { setTimeout(mineLine, 200); });
  setTimeout(function () { if (window._currentUser) { mineLine(); } }, 2500);
  // 記録: what happened to my entries since I last looked (my_updates), at most five lines (T124)
  window.drawMyUpdates = function (holder) {
    if (!holder || !window._currentUser || !window._supabaseClient) return;
    var key = 'ao-last-mypost:' + window._currentUser.id, since = null;
    try { since = localStorage.getItem(key); } catch (e) {}
    var from = since || new Date(Date.now() - 14 * 864e5).toISOString();
    window._supabaseClient.rpc('my_updates', { p_since: from }).then(function (r) {
      try { localStorage.setItem(key, new Date().toISOString()); } catch (e) {}
      var d = r && r.data;
      if (!d || d.success === false) return;
      var shown = function (n) { return esc(String(n || '').replace(' [Seedling]', '')); };
      var lines = [];
      (d.photos || []).forEach(function (x) { lines.push('<i>' + shown(x.name) + '</i> に写真が足されました'); });
      (d.records || []).forEach(function (x) { lines.push('<i>' + shown(x.name) + '</i> に記録が足されました'); });
      (d.verified || []).forEach(function (x) { lines.push('<i>' + shown(x.name) + '</i> が検証済になりました'); });
      (d.as_parent || []).forEach(function (x) { lines.push('<i>' + shown(x.parent) + '</i> が <i>' + shown(x.name) + '</i> の親として登録されました'); });
      if (!lines.length) return;
      holder.innerHTML = '<p class="mypost-updates__head">' + (since ? '前回（<span class="num">' + fmtDay(since) + '</span>）から' : 'この 2 週間') + '</p><ul class="mypost-updates">'
        + lines.slice(0, 5).map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>';
    });
  };
  // back after 30+ minutes away: read the archive again (a reload served from the cache), unless the person is in
  // the middle of something — a form, an open sheet (T127)
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (!hiddenAt || Date.now() - hiddenAt < 30 * 60 * 1000) return;
    var busy = currentPage() === 'contribute' || document.querySelector('dialog[open]') || (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName));
    if (!busy && navigator.onLine !== false) location.reload();
  });
  window.addEventListener('offline', function () { showToast('電波がありません。電波が戻ると、そのまま続けられます', true); });
  // a touch on a list row starts loading that plant's photo (T128)
  document.addEventListener('pointerdown', function (e) {
    var row = e.target.closest && e.target.closest('[data-nav="cultivar"]');
    if (!row || !window._thumbMap || !window.galleryImg) return;
    var k = row.getAttribute('data-key') || ((row.querySelector('[data-key]') || {}).getAttribute ? row.querySelector('[data-key]').getAttribute('data-key') : '');
    var shown = String(k || '').replace(' [Seedling]', '');
    var p = window._thumbMap[shown];
    if (p) { var im = new Image(); im.src = window.galleryImg(p, 1200); }
  }, { passive: true, capture: true });
  // the first page was shown before this script ran
  function firstMark() { markBar(currentPage()); if (currentPage() === 'contribute') stepperInit(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', firstMark); else setTimeout(firstMark, 0);
})();

/* ---------- the phone's top bar (owner, 11-10): 戻る and the site's name on every page but the home ----------
   戻る is left out on the tabs' own pages (調べる・自分の株) and on the posting steps (which have やめる／戻る).
   It goes back through the pages opened in this visit; arrived at from outside, it goes up to the page's parent. */
(function () {
  var bar = document.getElementById('topbar'), btn = document.getElementById('page-back');
  if (!bar || !btn) return;
  var NO_BACK = { top: 1, explore: 1, mypost: 1, contribute: 1 };
  var trail = [], cur = '';
  // the same page is written with and without its closing slash, encoded and not
  function here() { var pth = location.pathname; try { pth = decodeURIComponent(pth); } catch (e) {} return (pth.replace(/\/+$/, '') || '/') + location.search; }
  // while the app starts, the address settles in more than one step (a direct landing, a login coming back):
  // until the reader has touched something, whatever is shown is the first page of the visit, not a step away from it
  var touched = false;
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { touched = true; }, true); });
  function show(pageId) {
    cur = pageId;
    bar.classList.toggle('is-on', pageId !== 'top');
    bar.classList.toggle('is-off', pageId === 'top');
    btn.hidden = !!NO_BACK[pageId];
  }
  btn.addEventListener('click', function () {
    if (typeof gtag === 'function') gtag('event', 'back_click', { page: cur, depth: trail.length });
    if (trail.length > 1) { history.back(); return; }
    // nothing behind it in this visit: up to the parent
    var a = document.createElement('a'), sub = function (seg) { return new RegExp('/' + seg + '/.+').test(location.pathname); };
    a.href = '#'; a.style.display = 'none';
    if (cur === 'cultivar') {
      var ex = document.querySelector('#page-cultivar .related__exit a[data-genus]');
      a.setAttribute('data-nav', 'genus'); a.setAttribute('data-genus', ex ? ex.getAttribute('data-genus') : 'anthurium');
    } else if ((cur === 'people' && sub('people')) || (cur === 'locality' && sub('locality')) || (cur === 'tools' && sub('tools'))) a.setAttribute('data-nav', cur);
    else a.setAttribute('data-nav', { genus: 1, people: 1, locality: 1, search: 1, glossary: 1, names: 1, wanted: 1, ig: 1, tools: 1, reading: 1, nurseries: 1 }[cur] ? 'explore' : 'top');
    document.body.appendChild(a); a.click(); a.remove();
  });
  document.addEventListener('ao:page', function (e) {
    show(e.detail);
    // the address is written after the page is shown: read it a moment later
    setTimeout(function () {
      var url = here();
      if (!touched) { trail = [url]; return; }
      if (trail.length && trail[trail.length - 1] === url) return;                      // the same page drawn again
      if (trail.length > 1 && trail[trail.length - 2] === url) { trail.pop(); return; }  // went back
      trail.push(url);
      if (trail.length > 50) trail.shift();
    }, 0);
  });
  var first = document.querySelector('.page.active');
  // a shared link still has the home page marked active in its HTML: marking it here hid the bar the first paint
  // drew, and the router showed it again a moment later, so the page jumped up and back down (CLS, 11-26).
  // While the start flag is up the router names the page itself.
  var deep = document.documentElement.hasAttribute('data-boot');
  if (first) { if (!deep) show(first.id.replace(/^page-/, '')); trail.push(here()); }
})();

/* ---------- the list (owner's choice 11-10, 案B): names with a photo come first, as two columns of pictures;
   the names without one follow as plain lines under 「写真のない名前 n」. The order is drawn by CSS (order), so the
   sorting, the kind chips and the search keep working on the same rows. ---------- */
(function () {
  function split(container) {
    if (!container || !document.documentElement.classList.contains('pv-label') || !container.closest('#page-genus')) return;
    var old = container.querySelector('.list-split');
    if (old) old.remove();
    var rows = container.querySelectorAll('.cultivar-row').length;
    var none = container.querySelectorAll('.cultivar-row .entry__thumb--empty').length;
    if (!none || none === rows) return;   // all with a photo, or none: nothing to divide
    var p = document.createElement('p');
    p.className = 'list-split';
    p.innerHTML = '写真のない名前<span class="num">' + none + '</span>';
    container.appendChild(p);
  }
  window.aoListSplit = split;
  // the search results are drawn once; a search opened directly is drawn before the photo list arrives (board 16 G9)
  document.addEventListener('ao:thumbs', function () {
    var map = window._thumbMap || {};
    document.querySelectorAll('#search-cultivar-list .cultivar-row').forEach(function (row) {
      var th = row.querySelector('.entry__thumb--empty'), nm = row.querySelector('[data-key]');
      var path = th && nm && map[String(nm.getAttribute('data-key')).replace(' [Seedling]', '')];
      if (!path || !window.galleryImg) return;
      th.classList.remove('entry__thumb--empty');
      th.innerHTML = '<img src="' + window.galleryImg(path, 160).replace(/"/g, '&quot;') + '" class="thumb-img lazy-loaded" alt="" width="60" height="60" decoding="async">';   // shown at once: no lazy observer adds the class here
    });
  });
})();

/* ---------- photos on a plant page (owner's choice 11-13, 案B): one photo large in a 3:4 frame, the others as a row
   of small ones under it; a tap on a small one puts it in the frame, a tap on the frame opens the photo whole ---------- */
(function () {
  if (!document.documentElement.classList.contains('pv-label')) return;
  var gal = document.querySelector('#gallery-carousel .gallery');
  if (!gal || !window.MutationObserver) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var strip = document.createElement('div'); strip.className = 'gallery-thumbs'; strip.hidden = true;
  var count = document.createElement('p'); count.className = 'gallery-count'; count.hidden = true;
  gal.insertAdjacentElement('afterend', strip); strip.insertAdjacentElement('afterend', count);
  var shown = '';
  function keyOf(it) { var im = it.querySelector('img'); return it.getAttribute('data-image-id') || it.getAttribute('data-storage-path') || (im ? im.getAttribute('src') : ''); }
  function layout() {
    var items = [].slice.call(gal.querySelectorAll('.gallery__item[data-user-upload]'));
    gal.classList.toggle('gallery--b', items.length > 0);
    if (!items.length) { strip.hidden = true; strip.innerHTML = ''; count.hidden = true; return; }
    var cur = items.filter(function (it) { return keyOf(it) === shown; })[0] || items[0];
    shown = keyOf(cur);
    items.forEach(function (it) { it.classList.toggle('is-shown', it === cur); });
    var many = items.length > 1;
    strip.hidden = !many; count.hidden = !many;
    strip.classList.toggle('is-many', items.length > 5);
    var left = strip.scrollLeft;   // drawing the row again would send it back to the start
    strip.innerHTML = many ? items.map(function (it, i) {
      var im = it.querySelector('img');
      return '<button type="button" data-k="' + esc(keyOf(it)) + '" aria-pressed="' + (it === cur) + '" aria-label="写真 ' + (i + 1) + '"><img src="' + esc(im ? im.getAttribute('src') : '') + '" alt="" decoding="async"></button>';
    }).join('') : '';
    strip.scrollLeft = left;
    var on = strip.querySelector('[aria-pressed="true"]');
    if (on) {
      var x = on.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft;
      if (x < strip.scrollLeft || x + on.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = x - (strip.clientWidth - on.offsetWidth) / 2;
    }
    count.textContent = many ? '写真 ' + items.length + ' 枚' + (items.length > 5 ? '（小さな写真は横にずらせます）' : '') : '';
  }
  // at once, before the next paint: a 30 ms wait let every photo show at full height for a frame and push the page down (CLS, 11-26)
  new MutationObserver(function () { layout(); }).observe(gal, { childList: true });
  strip.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-k]'); if (!b) return;
    shown = b.getAttribute('data-k'); layout();
    if (typeof gtag === 'function') gtag('event', 'photo_thumb', {});
  });
  // the photo whole, on black; any tap puts it away
  var zoom = null;
  gal.addEventListener('click', function (e) {
    var im = e.target.closest && e.target.closest('.gallery--b .gallery__item.is-shown .gallery__img img');
    if (!im || e.target.closest('a')) return;
    if (!zoom) {
      zoom = document.createElement('dialog'); zoom.className = 'photo-zoom';
      zoom.innerHTML = '<img alt=""><button type="button" aria-label="閉じる">閉じる</button>';
      document.body.appendChild(zoom);
      zoom.addEventListener('click', function () { zoom.close(); });
    }
    if (typeof zoom.showModal !== 'function') return;
    var it = im.closest('.gallery__item'), path = it && it.getAttribute('data-storage-path');
    zoom.querySelector('img').src = path && window.galleryImg ? window.galleryImg(path, 1600) : im.getAttribute('src');
    zoom.showModal();
  });
  layout();
})();

// ---- 「？」 beside the words a newcomer may not know (owner, 11-27: 正しい知識がない人も投稿しやすく). A tap opens one
//      short line under the word; a second tap closes it. The labels themselves are left as they are ----
(function () {
  var TERMS = {
    species: ['原種', '自然の中に生えている野生の種そのものです。学名（例: Anthurium crystallinum）がついています。人が交配して作ったものではありません。'],
    hybrid: ['Hybrid', '人が 2 つ以上の種や品種を交配して作った植物です。作った人やナーセリー（作出者）が説明していることが多いです。'],
    unknown: ['不明', '野生の種なのか、交配で作られたのか、はっきり書いた情報が見つからない名前です。迷ったらこれで大丈夫です。'],
    clone: ['Clone', '1 株と、その株から株分けや組織培養で増やした株だけが名乗る名前です。種から育てた兄弟の株は、同じ名前を名乗れません。'],
    qualifier: ['分類', 'ほとんどの場合は「記載種」のままで大丈夫です。sp. などは、学名がまだ決まっていない株や、亜種・変種のときに使います。'],
    author: ['記載者', 'その種の学名を、論文などで初めて発表した人です。Engl.（エングラー）のように略して書かれます。わからなければ空欄で大丈夫です。「AI自動記入」でも調べられます。'],
    year: ['発表年', 'その学名が発表された年です。わからなければ空欄で大丈夫です。'],
    collector: ['採集者', '学名のもとになった標本（タイプ標本）を野外で採った人です。お店や輸入した人ではありません。'],
    locality: ['タイプ産地', '学名のもとになった標本が採られた場所です。買ったお店や、輸入元の国とは別のものです。'],
    habitat: ['分布', 'その種が野生で生えている国や地域です。'],
    cross: ['交配式', '母（種をつけた株）× 父（花粉を出した株）の組み合わせです。「A × B」のように書きます。わからなければ「親が不明」を選んでください。'],
    namer: ['名付けた人', 'その名前や番号をつけた人やナーセリーです。ラベルや販売ページに書かれていることがあります。わからなければ空欄で大丈夫です。']
  };
  function button(key) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'term-help'; b.setAttribute('data-term', key);
    b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-label', '「' + TERMS[key][0] + '」とは');
    b.textContent = '?';
    return b;
  }
  function add(el, key, where) {
    if (!el || el.querySelector('.term-help[data-term="' + key + '"]')) return;
    if (where === 'after') { if (el.nextElementSibling && el.nextElementSibling.matches && el.nextElementSibling.matches('.term-help[data-term="' + key + '"]')) return; el.insertAdjacentElement('afterend', button(key)); }
    else el.appendChild(button(key));
  }
  // a label whose own words start with the given text (labels are matched by text: they carry no ids)
  function labelIn(root, text) {
    if (!root) return null;
    var ls = root.querySelectorAll('label.form-label');
    for (var i = 0; i < ls.length; i++) if (ls[i].textContent.trim().indexOf(text) === 0) return ls[i];
    return null;
  }
  function wire() {
    var p = document.getElementById('page-contribute');
    if (!p) return;
    ['species', 'hybrid', 'unknown'].forEach(function (v) {
      var r = p.querySelector('input[name="cultivar-parentage"][value="' + v + '"]');
      var term = r && r.closest('.form-radio') && r.closest('.form-radio').querySelector('.type-term');
      add(term, v, 'after');
    });
    var q2 = p.querySelector('#kind-clone-q .type-q'); add(q2, 'clone');
    var sub = p.querySelector('#species-subcategory > label'); add(sub, 'qualifier');
    var sf = document.getElementById('species-fields');
    add(labelIn(sf, '記載者'), 'author'); add(labelIn(sf, '発表年'), 'year'); add(labelIn(sf, '採集者'), 'collector');
    add(labelIn(sf, 'タイプ産地'), 'locality'); add(labelIn(sf, '分布'), 'habitat');
    add(labelIn(document.getElementById('clone-fields'), '名付けた人物'), 'namer');
    add(labelIn(document.getElementById('hybrid-fields'), '作出者'), 'namer');
    ['clone-fields', 'hybrid-fields', 'seedling-fields'].forEach(function (id) { add(labelIn(document.getElementById(id), '交配式'), 'cross'); });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.term-help');
    if (!b) return;
    // inside a radio's label: open the line, do not choose the radio
    e.preventDefault(); e.stopPropagation();
    var key = b.getAttribute('data-term'), t = TERMS[key];
    if (!t) return;
    var host = b.closest('.form-radio') || b.closest('label') || b.parentElement;
    var tip = host.nextElementSibling && host.nextElementSibling.classList && host.nextElementSibling.classList.contains('term-tip') && host.nextElementSibling.getAttribute('data-term') === key ? host.nextElementSibling : null;
    if (tip) { tip.remove(); b.setAttribute('aria-expanded', 'false'); return; }
    tip = document.createElement('p');
    tip.className = 'term-tip'; tip.setAttribute('data-term', key); tip.setAttribute('role', 'note');
    tip.innerHTML = '<b></b>';
    tip.firstChild.textContent = t[0];
    tip.appendChild(document.createTextNode(' ' + t[1]));
    host.insertAdjacentElement('afterend', tip);
    b.setAttribute('aria-expanded', 'true');
    if (typeof gtag === 'function') gtag('event', 'term_help', { term: key });
  }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  document.addEventListener('ao:page', function (e) { if (e.detail === 'contribute') setTimeout(wire, 0); });
})();

/* ============================================================
   名前から始める (11-27, proposal 4): the label's words first. Names already in the archive are offered as they are
   typed (the photo or record goes on that page); a new name is read for its kind, and the person only confirms it.
   写真と名前だけ (proposal 5): the kind questions and the origin fields step aside; the record is tagged quick_post and,
   being short of a record, sits folded under 「記録が足りない名前」 until someone fills it in.
   ============================================================ */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pg() { return $('page-contribute'); }
  function genus() { var s = $('contribute-genus-select'); return (s && s.value) || ((window._generaData && window._generaData[0]) ? window._generaData[0].name : 'Anthurium'); }
  function plain(v) { v = String(v || ''); try { v = v.normalize('NFKC'); } catch (e) {} return v.replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim(); }
  function stripGenus(v) {
    var g = genus().toLowerCase(), l = v.toLowerCase();
    if (l.indexOf(g + ' ') === 0) return v.slice(g.length + 1);
    if (/^[a-z]\.\s/i.test(v) && l[0] === g[0]) return v.replace(/^[a-z]\.\s*/i, '');
    return v;
  }
  function unq(v) { return String(v || '').replace(/^['"]+|['"]+$/g, '').trim(); }
  var KIND = { species: '原種', hybrid: 'Hybrid', clone: 'Clone', seedling: '実生' };

  // what the words look like. Returns null for too little to read. The reading itself is shared with the name
  // fields (aoReadName, above the name builder); this adds the kind and the words that explain it
  function guess(raw) {
    var r = window.aoReadName ? window.aoReadName(stripGenus(plain(raw))) : null;
    if (!r) return null;
    if (r.cross) return { cross: true };
    if (r.spp) return { spp: true };
    var g, au = r.authors ? '。' + r.authors + ' は名前をつけた人（著者名）なので、登録名には入れません' : '';
    // what was set aside, said on its own too (for when the name is already in the archive and the guess steps aside)
    var aside = [r.authors ? r.authors + ' は著者名なので外して探しました。' : '', r.forma ? 'f. ' + r.forma + '（品種）は種として探しました。' : '', r.unpub && r.q !== 'sp' ? '「' + r.unpub + '」は発表前の名前という意味です。' : ''].join('');
    if (r.other) return { parentage: 'unknown', clone: false, cultivar: r.cultivar, label: '品種名', why: '大文字や引用符のある、品種名の書き方です', open: true };
    if (r.clone) return { parentage: 'species', clone: true, epithet: r.epithet, cultivar: r.cultivar, label: '原種の 1 株につけた名前（ナンバリング）', why: '小文字の種小名のあとに、番号や名前が続いています' };
    g = { tidy: !!(r.authors || r.forma || r.unpub), aside: aside, parentage: 'species', clone: false, q: r.q || '', epithet: r.epithet || '', extra: r.q === 'var' || r.q === 'ssp' ? r.infra : (r.extra || ''), unpub: r.unpub && r.q !== 'sp' ? r.unpub : '' };
    if (r.q === 'sp') { g.label = '学名がまだない原種（sp.）'; g.why = r.unpub ? '「sp. ' + r.unpub + '」は、まだ名前が発表されていない種という意味です。産地や呼び名があれば足せます' : '「sp.」で始まっています'; }
    else if (r.q === 'aff' || r.q === 'cf') { g.label = r.q === 'aff' ? 'ある種に近い別の原種（aff.）' : 'その種らしい原種（cf.）'; g.why = '「' + r.q + '.」で始まっています' + au; }
    else if (r.q === 'var' || r.q === 'ssp') { g.label = r.q === 'var' ? '原種の変種（var.）' : '原種の亜種（ssp.）'; g.why = '「' + r.q + '.」が入っています' + au; }
    else if (r.forma) { g.label = '原種（品種 f. ' + r.forma + ' つき）'; g.why = '「f.」は種の中の品種（forma）です。この図鑑では種として登録し、f. ' + r.forma + ' は登録名に入りません' + au; }
    else if (g.unpub) { g.label = 'まだ発表されていない原種（' + g.unpub + '）'; g.why = '「' + g.unpub + '」は、発表前の名前という意味です。学名の一覧では確かめずに受け付けます' + au; }
    else if (g.extra) { g.label = '原種（産地つき）'; g.why = '小文字の種小名に、" " で産地が続いています' + au; }
    else { g.label = '原種（学名のある種）'; g.why = (r.authors ? '小文字の種小名のあとに、著者名が続いています' : '小文字 1 語の、学名の書き方です') + au; }
    return g;
  }

  function preview(g) {
    if (!g || g.cross || g.spp) return '';
    var gen = genus(), name;
    if (g.parentage === 'species' && !g.clone) {
      if (g.q === 'sp') name = 'sp.' + (g.extra ? ' "' + g.extra + '"' : '');
      else if (g.q === 'aff' || g.q === 'cf') name = g.q + '. ' + g.epithet + (g.extra ? ' "' + g.extra + '"' : '');
      else if (g.q === 'var' || g.q === 'ssp') name = g.epithet + ' ' + g.q + '. ' + g.extra;
      else name = g.epithet + (g.extra ? ' "' + g.extra + '"' : '');
    } else name = (g.parentage === 'species' && g.epithet ? g.epithet + ' ' : '') + "'" + g.cultivar + "'";
    return gen + ' ' + name;
  }

  function folded(s) { return plain(s).toLowerCase().replace(/['"]/g, '').replace(/\s+/g, ' '); }
  // names in the archive that hold the typed words, or are one or two letters from them
  function hits(raw) {
    var data = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : null);
    if (!data) return [];
    var q = folded(stripGenus(plain(raw)));
    if (q.length < 3) return [];
    var g = genus().toLowerCase(), out = [], near = [];
    var g0 = guess(raw), gs = preview(g0) || (g + ' ' + q);
    // authors, f. or nov. typed after the name: look for the name itself
    if (g0 && g0.tidy && preview(g0) && !(g0.q === 'sp' && !g0.extra)) q = folded(preview(g0)).replace(/^\S+\s+/, '');
    Object.keys(data).forEach(function (name) {
      var e = data[name] || {};
      if (e._isPrivate) return;
      var low = folded(name);
      if (low.indexOf(g + ' ') !== 0) return;
      var keys = [name].concat(e._aliases || []);
      if (keys.some(function (k) { return folded(stripGenus(k)).indexOf(q) !== -1; })) out.push(name);
      else if (window.nameNearly && keys.some(function (k) { try { return window.nameNearly({ fullName: k, entry: {} }, gs); } catch (x) { return false; } })) near.push(name);
    });
    out.sort(function (a, b) { return a.length - b.length; });
    return out.concat(near).slice(0, 5);
  }
  function kindOf(name) {
    var data = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
    var e = data[name] || {};
    return KIND[String(e._type || '').toLowerCase()] || '';
  }

  var last = null;
  function draw() {
    var input = $('nf-input'); if (!input) return;
    var raw = input.value, hb = $('nf-hits'), gb = $('nf-guess');
    var hs = hits(raw), g = guess(raw);
    var gp = preview(g).toLowerCase();
    var exact = !!gp && hs.some(function (n) { return folded(n) === folded(gp); });
    if (hs.length) {
      hb.innerHTML = '<p class="nf-hits__q">図鑑にある名前</p><ul>' + hs.map(function (n) {
        var short = n.replace(/^\S+\s+/, '').replace(' [Seedling]', '');
        return '<li><a href="#" data-nav="cultivar" data-key="' + esc(n) + '"><i>' + esc(short) + '</i><span class="nf-kind">' + esc(kindOf(n)) + '</span><span class="nf-go">写真や記録を足す →</span></a></li>';
      }).join('') + '</ul>' + (exact && g && g.aside ? '<p class="nf-note">' + esc(g.aside) + '</p>' : '') + '<p class="nf-note">同じ植物なら、新しく登録せずに、その名前のページから写真や記録を足せます。</p>';
      hb.hidden = false;
    } else { hb.innerHTML = ''; hb.hidden = true; }
    last = g;
    if (!g || exact) { gb.innerHTML = ''; gb.hidden = true; return; }
    if (g.spp) {
      gb.innerHTML = '<p class="nf-guess__q">「spp.」は、いくつかの種をまとめて呼ぶ書き方です。</p><p class="nf-note">1 つの名前にはできないので、株ごとに、わかる種名か「sp.」で入れてください。</p>';
      gb.hidden = false; return;
    }
    if (g.cross) {
      gb.innerHTML = '<p class="nf-guess__q">親の組み合わせ（交配式）のようです。</p><p class="nf-note">名前がついていれば、その名前を入れてください。名前のない、自分で播いた株は<button type="button" class="nf-link" data-type-other="seedling">実生として記録</button>できます。</p>';
      gb.hidden = false; return;
    }
    var h = '<p class="nf-guess__q">' + (hs.length ? 'ほかの名前なら、' : '') + '書き方から見ると<b>「' + esc(g.label) + '」</b>のようです</p>'
      + '<p class="nf-guess__name">登録名: <i>' + esc(preview(g)) + '</i></p>'
      + '<p class="nf-note">' + esc(g.why) + '。</p>';
    if (g.open) {
      h += '<p class="nf-guess__q2">野生か交配か、わかりますか？</p><div class="nf-actions">'
        + '<button type="button" class="btn btn--primary btn--sm" data-nf-apply="unknown">わからない（不明で進む）</button>'
        + '<button type="button" class="btn btn--secondary btn--sm" data-nf-apply="hybrid">交配でできた（Hybrid）</button>'
        + '<button type="button" class="btn btn--secondary btn--sm" data-nf-apply="clone">1 株だけの名前（Clone）</button></div>';
    } else {
      h += '<div class="nf-actions"><button type="button" class="btn btn--primary btn--sm" data-nf-apply="as-is">この区分で進む</button>'
        + '<button type="button" class="nf-link" data-nf-pick>違うので自分で選ぶ</button></div>';
    }
    gb.innerHTML = h; gb.hidden = false;
  }

  function click(el) { if (el && !el.checked) { el.checked = true; el.dispatchEvent(new Event('change', { bubbles: true })); } }
  function setVal(id, v) { var el = $(id); if (el) el.value = v || ''; }
  function apply(g, how) {
    var p = pg(); if (!p || !g) return;
    var parentage = g.parentage, clone = !!g.clone;
    if (how === 'hybrid') { parentage = 'hybrid'; clone = false; }
    if (how === 'clone') { parentage = 'unknown'; clone = true; }
    if (how === 'unknown') { parentage = 'unknown'; clone = false; }
    click(p.querySelector('input[name="cultivar-parentage"][value="' + parentage + '"]'));
    click(p.querySelector('input[name="kind-clone-yn"][value="' + (clone ? 'yes' : 'no') + '"]'));
    setTimeout(function () {
      if (parentage === 'species' && !clone) {
        var chip = document.querySelector('#species-subcategory .chip[data-subcategory="' + (g.q || 'species') + '"]');
        if (chip && !chip.classList.contains('active')) chip.click();
      }
      setTimeout(function () {
        setVal('nb-epithet', g.epithet); setVal('nb-extra', g.extra); setVal('nb-cultivar', g.cultivar);
        // a name not published yet (nov. / ined.) is not looked up in the scientific-name list
        var epEl = $('nb-epithet');
        if (epEl) { if (g.unpub && g.epithet) epEl.setAttribute('data-unpub', g.epithet); else epEl.removeAttribute('data-unpub'); }
        var f = (parentage === 'species' && !clone) ? ($('nb-epithet').value ? $('nb-epithet') : $('nb-extra')) : $('nb-cultivar');
        if (f) f.dispatchEvent(new Event('input', { bubbles: true }));
        var label = parentage === 'species' ? (clone ? '原種のナンバリング（Clone）' : '原種') : (parentage === 'hybrid' ? 'Hybrid' : '不明') + (clone ? '・Clone' : '');
        p.classList.add('nf-applied');
        var s = $('nf-summary');
        if (s) {
          var en = window.currentLang === 'en';
          var labelEn = parentage === 'species' ? (clone ? 'Species, numbered plant (Clone)' : 'Species') : (parentage === 'hybrid' ? 'Hybrid' : 'Unknown') + (clone && parentage !== 'species' ? ', Clone' : '');
          s.innerHTML = en ? 'Kind set to <b>' + esc(labelEn) + '</b>. <button type="button" class="nf-link" data-nf-pick>Choose again</button>'
            : '区分は<b>「' + esc(label) + '」</b>にしました。 <button type="button" class="nf-link" data-nf-pick>選び直す</button>';
          s.hidden = false;
        }
        $('nf-guess').hidden = true;
        if (typeof gtag === 'function') gtag('event', 'name_first_apply', { kind: label });
      }, 30);
    }, 30);
  }
  function pick() {
    var p = pg(); if (!p) return;
    p.classList.remove('nf-applied');
    var s = $('nf-summary'); if (s) s.hidden = true;
    var q = p.querySelector('.kind-axis'); if (q && q.scrollIntoView) q.scrollIntoView({ block: 'center' });
  }

  // 写真と名前だけ: the kind as read (or 不明), the second step is the photos alone, and the record is tagged
  function quick() {
    var p = pg(), input = $('nf-input'); if (!p || !input) return;
    if (!input.value.trim()) { input.focus(); if (typeof showFieldError === 'function') showFieldError(input, 'まず名前を入れてください'); return; }
    if (!p.classList.contains('nf-applied')) { var g = last || guess(input.value); if (g && !g.cross && !g.spp) apply(g, g.open ? 'unknown' : 'as-is'); }
    p.classList.add('contribute--quick');
    if (typeof gtag === 'function') gtag('event', 'quick_post_start');
    setTimeout(function () { var n = $('cstep-next'); if (n) n.click(); }, 120);
  }
  window.aoQuickPost = function () { var p = pg(); return !!(p && p.classList.contains('contribute--quick')); };

  function build(tries) {
    var p = pg(); if (!p || $('name-first')) return;
    if (!p.classList.contains('contribute--stepped')) { if ((tries || 0) < 20) setTimeout(function () { build((tries || 0) + 1); }, 150); return; }
    var r = p.querySelector('input[name="cultivar-type"]'), typeGroup = r && r.closest('.form-group');
    if (!typeGroup) return;
    typeGroup.classList.add('kind-group');
    var box = document.createElement('div');
    box.className = 'name-first'; box.id = 'name-first'; box.setAttribute('data-cstep', '1');
    box.innerHTML = '<label class="form-label type-q" for="nf-input">ラベルや名札の名前を、そのまま入れてください</label>'
      + '<input type="text" class="form-input" id="nf-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="例: crystallinum / papillilaminum \'Fort Sherman\' / King of Spades">'
      + '<p class="type-def">図鑑にある名前なら候補が出ます。ない名前は、書き方から区分を読み取ります。</p>'
      + '<div class="nf-hits" id="nf-hits" hidden></div><div class="nf-guess" id="nf-guess" hidden></div>'
      + '<p class="nf-summary" id="nf-summary" hidden></p>'
      + '<p class="nf-quick"><button type="button" class="nf-link" id="nf-quick">わからないことが多いときは、写真と名前だけで投稿する</button></p>';
    typeGroup.parentNode.insertBefore(box, typeGroup);
    // the login line stays in view when the questions step aside
    var ln = $('cstep-login'); if (ln) box.insertBefore(ln, box.firstChild);
    // the second step in 写真と名前だけ: what happens to the record, said once above the photos
    var img = $('contribute-upload-area'), card = img && img.closest('.card');
    if (card && !$('quick-note')) {
      var n = document.createElement('p');
      n.className = 'quick-note'; n.id = 'quick-note';
      n.textContent = 'わからない所は空けたままで大丈夫です。区分や由来は、詳しい人や管理者があとで確かめて足します。写真があると確かめやすくなります。';
      card.insertBefore(n, card.firstChild.nextSibling);
      var back = document.createElement('p');
      back.className = 'quick-back'; back.id = 'quick-back';
      back.innerHTML = '<button type="button" class="nf-link" id="quick-off">由来もわかるので、ふつうに書く</button>';
      n.insertAdjacentElement('afterend', back);
      // the parents, when the label or the seller gives them (item 3, 11-27). Optional; written into the cross
      // fields the full form uses, so they are saved the same way. A wild species has no parents: not asked then
      var qp = document.createElement('div');
      qp.className = 'quick-parents'; qp.id = 'quick-parents';
      qp.innerHTML = '<label class="form-label" for="qp-a">交配親（わかれば）</label>'
        + '<div class="formula-box"><input type="text" class="form-input flex-1" id="qp-a" placeholder="母（種子親）" autocomplete="off" autocapitalize="off" spellcheck="false">'
        + '<span class="formula-operator">&times;</span><input type="text" class="form-input flex-1" id="qp-b" placeholder="父（花粉親）" autocomplete="off" autocapitalize="off" spellcheck="false"></div>'
        + '<p class="type-def">ラベルに「crystallinum × magnificum」のように親が書いてあれば、2 つとも入れてください。わからなければ空けたままで大丈夫です。</p>';
      back.insertAdjacentElement('afterend', qp);
    }
    var t;
    $('nf-input').addEventListener('input', function () {
      clearTimeout(t); t = setTimeout(draw, 150);
      if (typeof clearFieldError === 'function') clearFieldError(this);
      // a changed name is read again: the kind chosen for the old one is not kept on screen as if it still fit
      if (p.classList.contains('nf-applied')) { p.classList.remove('nf-applied'); var s = $('nf-summary'); if (s) s.hidden = true; }
    });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var a = e.target.closest('[data-nf-apply]');
    if (a) { e.preventDefault(); apply(last, a.getAttribute('data-nf-apply')); return; }
    if (e.target.closest('[data-nf-pick]')) { e.preventDefault(); pick(); return; }
    if (e.target.closest('#nf-quick')) { e.preventDefault(); quick(); return; }
    if (e.target.closest('#quick-off')) { e.preventDefault(); var p = pg(); if (p) p.classList.remove('contribute--quick'); }
  });
  // the quick post's parents go into the cross fields of the kind as read: Clone → 交配式, Hybrid / 不明 → 交配式.
  // Both given: the 'parents unknown' tick that 不明 sets by itself comes off. One or none: nothing is recorded as a cross
  function quickParents() {
    var a = $('qp-a'), b = $('qp-b'); if (!a || !b) return;
    var t = (document.querySelector('#page-contribute input[name="cultivar-type"]:checked') || {}).value;
    var box = t === 'clone' ? $('formula-inputs') : t === 'hybrid' ? $('hybrid-formula-inputs') : null;
    var unk = t === 'clone' ? $('formula-unknown') : t === 'hybrid' ? $('hybrid-formula-unknown') : null;
    if (!box) return;
    var ins = box.querySelectorAll('input');
    if (ins.length < 2) return;
    var va = a.value.trim(), vb = b.value.trim();
    ins[0].value = va; ins[1].value = vb;
    if (va && vb && unk && unk.checked) { unk.checked = false; unk.dispatchEvent(new Event('change', { bubbles: true })); }
    var cx = $('hybrid-formula-complex');
    if (va && vb && t === 'hybrid' && cx && cx.checked) { cx.checked = false; cx.dispatchEvent(new Event('change', { bubbles: true })); }
  }
  document.addEventListener('input', function (e) { if (e.target && (e.target.id === 'qp-a' || e.target.id === 'qp-b')) quickParents(); });
  // a fresh start empties them with the rest
  document.addEventListener('ao:page', function (e) { if (e.detail === 'contribute') { var a = $('qp-a'), b = $('qp-b'); if (a) a.value = ''; if (b) b.value = ''; } });
  // a fresh visit starts with an empty box and the questions shown
  function reset() {
    var p = pg(); if (!p) return;
    build();
    p.classList.remove('nf-applied', 'contribute--quick');
    var i = $('nf-input'); if (i) i.value = '';
    ['nf-hits', 'nf-guess', 'nf-summary'].forEach(function (id) { var el = $(id); if (el) { el.hidden = true; el.innerHTML = ''; } });
  }
  document.addEventListener('ao:page', function (e) { if (e.detail === 'contribute') setTimeout(reset, 60); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(build, 300); }); else setTimeout(build, 300);
  window.aoNameGuess = guess; // for the tests
})();
