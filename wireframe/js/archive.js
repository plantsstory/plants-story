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
    d.verifiedAt = entry._verifiedAt || null;
    d.verificationNote = clean(entry._verificationNote);
    d.nameStatus = entry._nameStatus || null;
    d.formLocality = clean(entry._locality);
    d.creator = clean(d.formula && d.formula.creatorName);
    d.href = base + genus.toLowerCase() + '/' + encodeURIComponent(epithet) + '/';   // the canonical form (no 301)
    // the name readers see (T69: undescribed species stored without sp.); displayName stays the stored key
    d.shownName = window.EntryMeta ? window.EntryMeta.name({ cultivar_name: displayName, type: type, origins: entry.origins || [], species_qualifier: entry._qualifier }) : displayName;
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
    'French Guiana': 'フランス領ギアナ', 'Suriname': 'スリナム', 'Argentina': 'アルゼンチン', 'Paraguay': 'パラグアイ', 'Cuba': 'キューバ',
    'Jamaica': 'ジャマイカ', 'Trinidad and Tobago': 'トリニダード・トバゴ', 'Dominican Republic': 'ドミニカ共和国', 'Puerto Rico': 'プエルトリコ',
    'Indonesia': 'インドネシア', 'Malaysia': 'マレーシア', 'Thailand': 'タイ', 'Vietnam': 'ベトナム', 'Philippines': 'フィリピン',
    'Papua New Guinea': 'パプアニューギニア', 'Australia': 'オーストラリア', 'Japan': '日本', 'Taiwan': '台湾', 'China': '中国' };
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
    // each part kept whole on a line (no 'パ／ナマ'); the separators are where the line may break
    return parts.map(function (x) { return '<span class="entry__seg">' + x + '</span>'; }).join(' · ');
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
  // /wanted/: recorded entries with no photo yet, the most searched first (board 9 D10)
  var WANTED_FIRST = ['Anthurium clarinervium', 'Anthurium luxurians', 'Anthurium regale', "Anthurium 'Dark Mama'", 'Anthurium antolakii'];
  // only the genera the site shows (Anthurium for now): hidden genera stay out of /wanted/ and /ig/ (board 11)
  var shownGenus = function (d) { var gs = window._generaData || []; return !gs.length || gs.some(function (g) { return g.name === d.genus; }); };
  window.renderWantedPage = function () {
    var body = document.getElementById('wanted-body');
    if (!body) return;
    waitForData(function () {
      var store = window.cultivarData || (typeof cultivarData !== 'undefined' ? cultivarData : {});
      var thumbs = window._thumbMap || {};
      var seen = {}, list = [];
      Object.keys(store).forEach(function (k) {
        var e = store[k];
        if (!e || seen[e._id || k] || e._type === 'seedling' || / \[Seedling\]$/.test(k)) return;
        seen[e._id || k] = true;
        var d;
        try { d = describe(k, e, e._type); } catch (er) { return; }
        if (d.state !== 'ok' || d.isIndividual || thumbs[d.displayName] || !shownGenus(d)) return;
        list.push(d);
      });
      list.sort(function (a, b) {
        var ia = WANTED_FIRST.indexOf(a.fullName), ib = WANTED_FIRST.indexOf(b.fullName);
        if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        return a.displayName.localeCompare(b.displayName);
      });
      if (!list.length) { body.innerHTML = '<p class="people__intro">いまは写真のない品種はありません。</p>'; return; }
      var html = '<p class="mypost-counts">写真を募集中 <span class="num">' + list.length + '</span> 品種</p><ol class="entries">';
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
        html += '<li id="p' + x.no + '">' + link(x.d, '<span class="ig-grid__img">' + (src ? '<img src="' + esc(src) + '" alt="' + esc(x.d.shownName) + '" loading="lazy" decoding="async">' : '<span class="ig-grid__name">' + sciNameHtml(x.d.shownName) + '</span>') + '</span>'
          + '<span class="ig-grid__no num">図版 ' + x.no + '</span>') + '</li>';
      });
      body.innerHTML = html + '</ol>';
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
  window.renderReadingPage = function () {
    var body = document.getElementById('reading-body');
    if (!body) return;
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
      if (mine.length > 3) html += '<details class="timeline__fold"><summary>ほか ' + (mine.length - 3) + ' 件</summary><ul>' + mine.slice(3).map(li).join('') + '</ul></details>';
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
  var _storyPost = '';
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-story-copy]');
    if (!c || !_storyPost) return;
    navigator.clipboard.writeText(_storyPost).then(function () { showToast(T('story_copied')); }, function () { showToast(T('story_copy_failed'), true); });
    if (typeof gtag === 'function') gtag('event', 'share_click', { channel: 'instagram_copy', source: 'story' });
  });
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
    html += '<h2 class="story__title">' + link(d, sciNameHtml(d.shownName)) + '</h2>';
    var cite = citeHtml(d);
    if (cite) html += '<p class="story__cite mono">' + cite + '</p>';
    var ex = excerpt(text, lang() === 'en' ? 320 : 170);
    // no drop cap: the text opens with a scientific name, and a raised first letter splits it ('A nthurium')
    html += '<p class="story__body">' + (window.italicizeSciNames ? window.italicizeSciNames(esc(ex)) : esc(ex)) + '</p>';
    html += link(d, esc(T('story_more')), 'story__more');
    // for the owner's Instagram post: the text to paste and the 1080×1350 image made in CI (T94)
    if (d.state === 'ok' && window.ogSlug) {
      html += '<p class="story__share"><button type="button" class="story__copy" data-story-copy>' + esc(T('story_copy')) + '</button>'
        + '<a class="story__img" href="' + esc(base + 'images/ig/' + window.ogSlug(d.genus, d.fullName) + '.png') + '" download target="_blank" rel="noopener">' + esc(T('story_save_image')) + '</a></p>';
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
    }
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
      if (countEl) countEl.textContent = week > 0 ? T('new_entries_week').replace('{n}', week) : '';
    }
    var html = '<ol class="entries">', lastDay = '';
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
        var n = items.filter(function (it) { var st = it.created_at || it.updated_at || ''; return st && fmtDate(st) === day; }).length;
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
  // a parent name found by the same whole-name rule as the children (normParent): genus, A., quotes and extra
  // spaces aside, the names must be equal — 'Red Crystallinum' never finds crystallinum
  function findByEpithet(all, name) {
    var key = normParent(name);
    if (!key) return null;
    for (var i = 0; i < all.length; i++) {
      if (normParent(all[i].epithet) === key || normParent(all[i].displayName) === key) return all[i];
    }
    return null;
  }
  function parentHtml(all, name) {
    var d = findByEpithet(all, name);
    return d ? link(d, sciNameHtml(name)) : sciNameHtml(name);
  }
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
      if (d.type === 'clone' && !d.breeder && d.namer) cells += cell('spec_namer', linkPeople(d.namer));
      else cells += cell('spec_breeder', linkPeople(d.breeder || d.namer || d.creator) || (d.type === 'seedling' || d.isIndividual ? '' : absentHtml(d, 'breeder')));
      cells += cell(d.type === 'seedling' ? 'spec_sowing' : 'spec_year', d.type === 'seedling' ? esc(/^\d{4}-\d{2}-\d{2}/.test(d.sowing) ? fmtDate(d.sowing) : d.sowing) : ((d.namingYear || d.year) ? '<span class="num">' + (d.namingYear || d.year) + '</span>' : ''));
      var unconfirmed = d.tags.indexOf('parentage_unconfirmed') !== -1;
      if (d.parentA || d.parentB) cells += cell('spec_parents', parentHtml(all, d.parentA || T('lineage_unknown')) + ' × ' + parentHtml(all, d.parentB || T('lineage_unknown')) + (unconfirmed ? ' <span class="absent">' + esc(T('parentage_unconfirmed')) + '</span>' : ''));
      else if (d.type === 'hybrid') cells += cell('spec_parents', d.formulaStatus === 'unknown' ? esc(T('lineage_unknown')) : absentHtml(d, 'formula'));
    }
    if (d.selectedFrom) {
      // an individual names its species; a Clone selected from another plant names that plant
      var parentSp = all.filter(function (x) { return x.id && x.id === d.selectedFrom; })[0];
      if (parentSp) cells = cell(d.isIndividual ? 'spec_selected_from' : 'spec_selected_from_clone', link(parentSp, sciNameHtml(parentSp.shownName))) + cells;
    }
    // an individual: who brought it in and where it came from
    if (d.isIndividual) cells += cell('spec_introduced_by', linkPeople(d.introducedBy)) + cell('spec_region', distributionHtml(d.originRegion || d.formLocality || d.locality || d.habitat));
    // on the label: at most three Latin-script names; katakana stays for search and JSON-LD
    // an alias with sp./aff./cf. on a Hybrid, Clone or individual contradicts the kind: kept for search, not shown
    var qualifierClash = function (a) { return d.type !== 'species' && /\b(sp|aff|cf)\./.test(a); };
    var labelAliases = (d.aliases || []).filter(function (a, i, arr) { return /[A-Za-z]/.test(a) && !/[゠-ヿ]/.test(a) && arr.indexOf(a) === i && !qualifierClash(a); }).slice(0, 3);
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
    var url = window.getShareUrl ? window.getShareUrl(d.fullName) : 'https://plantsstory.com/';
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

  /* share text: {name} — {describer or breeder} {year}、{type locality or parentage}｜Aroid Origins {URL} */
  window.shareTextFor = function (d) {
    var who = d.type === 'species' ? d.author : (d.breeder || d.namer || d.creator);
    var where = d.type === 'species' ? (d.locality || d.habitat) : ((d.parentA || d.parentB) ? (clean(d.parentA) || T('lineage_unknown')) + ' × ' + (clean(d.parentB) || T('lineage_unknown')) : '');
    var head = [who, d.year].filter(Boolean).join(' ');
    var mid = [head, where].filter(Boolean).join('、');
    // canonical page URL: the static stubs carry the OGP tags, so no proxy is needed in the text
    var url = window.getShareUrl ? window.getShareUrl(d.fullName) : 'https://plantsstory.com/' + d.genus.toLowerCase() + '/' + encodeURIComponent(d.epithet).replace(/'/g, '%27') + '/';
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
    var text = window.shareTextFor(d);
    // four actions after recording (board 9 D6): share · add a photo · add a record · see my records
    var noPhoto = !document.querySelector('#page-cultivar .gallery__item[data-user-upload], #page-cultivar .plate img');
    el.innerHTML = '<p class="share-band__title">' + esc(T('share_band_title')) + '</p>'
      + '<p class="share-band__text">' + esc(text) + '</p>'
      + '<p class="share-band__actions">'
      + '<button type="button" class="share-band__btn' + (noPhoto ? '' : ' share-band__btn--main') + '" id="share-band-share">共有</button>'
      + '<button type="button" class="share-band__btn' + (noPhoto ? ' share-band__btn--main' : '') + '" id="share-band-photo">写真を足す</button>'
      + (d.type === 'seedling' ? '' : '<button type="button" class="share-band__btn" id="share-band-record">記録を追加</button>')
      + '<a class="share-band__btn" href="' + esc(base + 'mypost') + '" data-nav="mypost">記録を見る</a>'
      + '<button type="button" class="share-band__close" id="share-band-close" aria-label="閉じる">×</button></p>'
      + '<p class="share-band__note">共有したときのカード画像は、30 分ほどで用意されます。</p>';
    // after the third seedling or later: the allowance left and the members' notice, one line (board 9 D9)
    if (d.type === 'seedling' && window._currentUser && typeof cultivarData !== 'undefined') {
      var mine = Object.keys(cultivarData).filter(function (k) { var e = cultivarData[k]; return e && e._type === 'seedling' && e._userId === window._currentUser.id && / \[Seedling\]$/.test(k); }).length;
      if (mine >= 3) { el.innerHTML += '<p class="share-band__note">実生の無料枠 あと <span class="num">' + Math.max(0, 20 - mine) + '</span> 件 <span id="band-notify"></span></p>'; if (window.drawNotifyLink) window.drawNotifyLink(document.getElementById('band-notify'), 'seedling_done'); }
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
      html += '<li>' + link(d, sciNameHtml(d.shownName)) + (meta ? '<span class="num">' + esc(meta) + '</span>' : '') + '</li>';
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
    var KIND_RANK = { species: 0, hybrid: 1, clone: 2, seedling: 3 };
    var group = others.concat([d]).filter(function (x) { return x.genus === d.genus && (x.type === 'seedling') === (d.type === 'seedling') && !x.isIndividual && (x.type === 'seedling' || x.state === 'ok' || x.fullName === d.fullName); })
      .sort(function (a, b) { return ((KIND_RANK[a.type] || 0) - (KIND_RANK[b.type] || 0)) || sortKey(a).localeCompare(sortKey(b), undefined, { sensitivity: 'base' }); });
    var idx = -1;
    group.forEach(function (x, i) { if (x.fullName === d.fullName) idx = i; });
    var prev = idx > 0 ? group[idx - 1] : null;
    var next = idx >= 0 && idx < group.length - 1 ? group[idx + 1] : null;

    var groups = relatedGroupHtml('related_siblings', siblings)
      + relatedGroupHtml('related_same_locality', sameCountry, d.country ? '<a href="' + esc(base + 'locality/' + encodeURIComponent(countrySlug(d.country)) + '/') + '" data-nav="locality" data-place="' + esc(countrySlug(d.country)) + '">' + esc(T('related_same_locality_n').replace('{country}', countryLabel(d.country)).replace('{n}', sameCountry.length)) + ' →</a>' : '')
      + relatedGroupHtml('related_same_person', samePerson);
    // no empty frame under the heading when there is nothing to list (board 11)
    var html = lineageHtml(d, all, children) + (groups ? '<div class="related__grid">' + groups + '</div>' : '');
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
      var unsure = d.tags.indexOf('parentage_unconfirmed') !== -1;
      html += '<div class="lineage__row lineage__row--parents' + (unsure ? ' lineage__row--unconfirmed' : '') + '">' + lineageNode(all, d.parentA) + '<span class="lineage__x">×</span>' + lineageNode(all, d.parentB) + '</div>';
      if (unsure) html += '<p class="lineage__note">' + esc(T('parentage_unconfirmed')) + '</p>';
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
          html += '<li><a href="' + esc(base + 'people/' + encodeURIComponent(p.slug) + '/') + '" data-nav="people" data-person="' + esc(p.slug) + '">' + esc(personLabel(p)) + (a && a.name && a.name !== p.key ? ' <span class="people__abbr mono">' + esc(p.key) + '</span>' : '') + '</a><span class="mono">' + rolesLine(p) + '</span></li>';
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
    if (countries.length) facts += '<div><dt>' + esc(T('people_localities')) + '</dt><dd class="people__facts-small">' + esc(countries.map(function (c) { return window.countryLabel ? window.countryLabel(c) : c; }).join('、')) + '</dd></div>';
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
      + (g.rangeItems.length ? '<h2 class="section-title"><span>' + esc(T('locality_group_range')) + '</span></h2><div id="locality-ledger-range"></div>' : '');
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
    if (window.releaseStaticEntry) setTimeout(window.releaseStaticEntry, 0);
    _labelEntry = d.type === 'seedling' ? null : d;
    // 「この品種を親に実生を記録」: the seedling form opens with this name as the mother
    var sdl = document.getElementById('detail-add-seedling');
    if (sdl) { sdl.setAttribute('data-prefill-parent', d.displayName); sdl.classList.toggle('d-none', d.type === 'seedling' || d.isIndividual); }
    var plb = document.getElementById('detail-print-label');
    if (plb) plb.classList.toggle('d-none', d.type === 'seedling');
    renderRelated(d, all);
    renderNameNote(d);
    renderArticlesFor(d);
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
      if (!id || isSeedling || !sb()) { btn.classList.add('d-none'); status.classList.add('d-none'); return; }
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
    $('post-sheet-photo-d').textContent = _sheetOnEntry ? 'この品種に、自分で撮った写真を' : '写真のない品種に、自分で撮った写真を';
    $('post-sheet-seedling-d').textContent = _sheetOnEntry ? 'この品種を母に、交配式と播種日' : '自分で播いた株の交配式と播種日';
    var ind = $('detail-add-individual'), sdl = $('detail-add-seedling'), rec = $('detail-add-record-btn'), ph = $('detail-add-photo-btn');
    $('post-sheet-entry-more').classList.toggle('d-none', !_sheetOnEntry);
    $('post-sheet-ind').classList.toggle('d-none', !_sheetOnEntry || !ind || ind.classList.contains('d-none'));
    dlg.querySelector('[data-post-act="record"]').parentNode.classList.toggle('d-none', !_sheetOnEntry || !rec || rec.style.display === 'none');
    // on a plant page without a photo button (another person's seedling) there is nothing to add a photo to
    dlg.querySelector('[data-post-act="photo"]').parentNode.classList.toggle('d-none', _sheetOnEntry && (!ph || ph.style.display === 'none'));
    dlg.querySelector('[data-post-act="seedling"]').parentNode.classList.toggle('d-none', _sheetOnEntry && (!sdl || sdl.classList.contains('d-none')));
    dlg.showModal();
  }
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
    if (act === 'photo') {
      // off a plant page: the entries waiting for a photo (/wanted/ once it exists), else the person's records
      if ($('page-wanted')) { if (typeof navigateTo === 'function') navigateTo('wanted', {}); return; }
      if (window.requireLogin && !window.requireLogin({ a: 'mypost', path: base + 'mypost' })) return;
      if (typeof navigateTo === 'function') navigateTo('mypost', {});
      showToast('写真を足す品種の「写真を追加」を押してください');
      return;
    }
    // seedling / new name: the contribute form (the header link carries the login check and the kind)
    var l = document.createElement('a');
    l.href = base + 'contribute'; l.setAttribute('data-nav', 'contribute');
    if (act === 'seedling') l.setAttribute('data-contribute-type', 'seedling');
    l.style.display = 'none'; document.body.appendChild(l); l.click(); l.remove();
  });

  // ---- posting in five steps (§4-4): 区分 → 名前 → 由来 → 写真 → 確認 ----
  var STEPS = ['区分', '名前', '由来', '写真', '確認'];
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
    genusGroup.setAttribute('data-cstep', '2'); nameGroup.setAttribute('data-cstep', '2');
    infoCard.setAttribute('data-cstep', '1 2');
    Array.prototype.forEach.call(infoCard.children, function (c) { if (!c.hasAttribute('data-cstep')) c.setAttribute('data-cstep', '2'); });
    originCard.setAttribute('data-cstep', '3');
    imgCard.setAttribute('data-cstep', '4');
    // step 5: a label of what will be recorded, then the existing submit button
    var review = document.createElement('div');
    review.className = 'cstep-review'; review.id = 'cstep-review'; review.setAttribute('data-cstep', '5');
    submit.parentNode.insertBefore(review, submit);
    submit.setAttribute('data-cstep', '5');
    // heading line and bottom bar
    var head = document.createElement('div');
    head.className = 'cstep-head'; head.id = 'cstep-head';
    head.innerHTML = '<p class="cstep-head__label"><span class="num" id="cstep-count"></span> · <span id="cstep-name"></span></p><ol class="cstep-head__ticks">' + STEPS.map(function () { return '<li></li>'; }).join('') + '</ol>';
    infoCard.parentNode.insertBefore(head, infoCard);
    var bar = document.createElement('div');
    bar.className = 'cstep-bar'; bar.id = 'cstep-bar';
    bar.innerHTML = '<button type="button" class="btn btn--secondary" id="cstep-back">戻る</button><button type="button" class="btn btn--primary" id="cstep-next">次へ</button>';
    p.appendChild(bar);
    $('cstep-back').addEventListener('click', function () { if (step > 1) history.back(); });
    $('cstep-next').addEventListener('click', function () {
      if (step === 5) { var sbtn = $('contribute-submit-btn'); if (sbtn) sbtn.click(); return; }
      if (check(step)) go(step + 1, true);
    });
    // choosing the kind moves on by itself (unless the choice was undone, e.g. a seedling needing a login)
    p.querySelectorAll('input[name="cultivar-type"]').forEach(function (r) {
      r.addEventListener('change', function (ev) {
        var me = this;
        if (!ev.isTrusted || !stepped() || step !== 1) return;   // a tap, not the form resetting itself
        setTimeout(function () { if (me.checked && step === 1) go(2, true); }, 250);
      });
    });
    var up = p.querySelector('#contribute-upload-area .upload-area__text');
    if (up) up.textContent = '写真を選ぶ・撮る · 3 枚まで（あとから足せます）';
    review.addEventListener('click', function (e) { var a = e.target.closest('[data-goto]'); if (a) { e.preventDefault(); go(+a.getAttribute('data-goto'), true); } });
    built = true;
  }
  function check(n) {
    if (n === 2) {
      var sel = $('contribute-genus-select');
      if (sel && !sel.value) { showToast('属を選んでください', true); sel.focus(); return false; }
      var nm = $('cultivar-name-input');
      if (nm && !nm.value.trim()) { showToast('名前を入れてください', true); var f = document.querySelector('#name-builder input:not([readonly])'); if (f) f.focus(); return false; }
      var dup = $('duplicate-alert');
      if (dup && dup.getAttribute('data-kind') === 'exact' && dup.offsetParent) { showToast('この品種はもう収録されています。写真や記録はそのページから足せます', true); return false; }
    }
    return true;
  }
  function val(id) { var el = $(id); return el ? String(el.value || '').trim() : ''; }
  function review() {
    var type = (document.querySelector('#page-contribute input[name="cultivar-type"]:checked') || {}).value || 'species';
    var genus = ($('contribute-genus-select') || {}).value || 'Anthurium';
    var full = window.buildContributeFullName ? window.buildContributeFullName(genus, type, val('cultivar-name-input')) : val('cultivar-name-input');
    var sciHtml = function (t) { return typeof italicizeSciNames === 'function' ? italicizeSciNames(esc(t)) : esc(t); };
    var sub = (document.querySelector('#species-subcategory input:checked') || {}).value || '';
    var kinds = { species: '原種', hybrid: 'Hybrid', clone: 'Clone', seedling: '実生' };
    var kindLine = kinds[type] + (type === 'species' && sub && sub !== 'species' ? '（未記載 ' + esc(sub) + '.）' : '');
    var words = val('sf-notes');
    var pair = function (sel) { var ins = document.querySelectorAll(sel + ' input'); return ins.length >= 2 ? [ins[0].value.trim(), ins[1].value.trim()] : ['', '']; };
    var pp = type === 'clone' ? pair('#formula-inputs') : type === 'hybrid' ? pair('#hybrid-formula-inputs') : type === 'seedling' ? pair('#seedling-formula-inputs') : ['', ''];
    var known = function (n) { if (!n) return ''; var hit = window.findContributeDuplicate ? window.findContributeDuplicate(/^[A-Z][a-z]+ /.test(n) ? n : genus + ' ' + n, genus).exact : null; return sciHtml(n) + ' <span class="cstep-tag">' + (hit ? '登録済み' : '未登録') + '</span>'; };
    var cross = pp[0] || pp[1] ? known(pp[0] || '不明') + ' × ' + known(pp[1] || '不明') : '';
    var aiFields = window._aiAutofillValues ? Object.keys(window._aiAutofillValues) : [];
    var FIELD = { author_name: '記載者', publication_year: '発表年', collector: '採集者', collection_year: '採集年', type_locality: 'タイプ産地', known_habitats: '分布' };
    // what the record gate will say about this draft
    var draft = { _type: type, origins: [{ trust: 30, source_type: 'manual', body: words, structured: { origin_type: type, author_name: val('sf-author-name'), publication_year: val('sf-publication-year'), type_locality: val('sf-type-locality'), known_habitats: val('sf-known-habitats'), namer: val('sf-clone-namer'), breeder: val('sf-hybrid-breeder') || val('creator-name-input'), formula: (pp[0] && pp[1]) ? { parentA: pp[0], parentB: pp[1] } : null } }] };
    var gate = '';
    try { gate = typeof window.recordStateOf === 'function' ? window.recordStateOf(full, draft, { type: type }) : ''; } catch (e) { gate = ''; }
    var priv = $('seedling-private') && $('seedling-private').checked && type === 'seedling';
    var scope = priv ? 'あなただけ（非公開の実生）' : gate && gate !== 'ok' ? 'このままだと記録不足として一覧では畳まれます（作出者か交配式、または出典があれば収録）' : '一覧・検索・共有に出ます';
    var rows = [
      ['登録名', sciHtml(full.replace(' [Seedling]', '')), 2],
      ['区分', esc(kindLine), 1],
      ['本文', words ? '<span class="cstep-words">' + esc(words) + '</span><span class="cstep-note">あなたの文のまま載ります。編集部と AI は書き換えません</span>' : '<span class="absent">（本文なし。項目から 1 行を作ります）</span>', 3],
      ['交配式', cross || '<span class="absent">（なし）</span>', 3],
      ['AI 下書き', aiFields.length ? esc(aiFields.map(function (f) { return FIELD[f] || f; }).join('・')) + ' <span class="cstep-tag">確かめてください</span>' : '<span class="absent">（なし）</span>', 3],
      ['公開の範囲', esc(scope), 1]
    ];
    var photos = document.querySelectorAll('#contribute-preview img').length;
    var html = '<div class="specimen">' + rows.map(function (r) {
      return '<div class="specimen__cell"><span class="specimen__k">' + esc(r[0]) + '</span><span class="specimen__v"><span>' + r[1] + '</span> <a href="#" class="cstep-fix" data-goto="' + r[2] + '">直す</a></span></div>';
    }).join('') + '</div>';
    html += '<p class="cstep-review__scope">写真 ' + (photos ? photos + ' 枚' : 'なし（あとから足せます）') + '</p>';
    $('cstep-review').innerHTML = html;
    return;
    var type = (document.querySelector('#page-contribute input[name="cultivar-type"]:checked') || {}).value || 'species';
    var kinds = { species: '原種', hybrid: 'Hybrid', clone: 'Clone', seedling: '実生' };
    var rows = [['区分', esc(kinds[type] || type), 1], ['名前', typeof italicizeSciNames === 'function' ? italicizeSciNames(esc(val('cultivar-name-input'))) : esc(val('cultivar-name-input')), 2]];
    var pairs = function (sel) { var ins = document.querySelectorAll(sel + ' input'); return ins.length >= 2 && ins[0].value.trim() && ins[1].value.trim() ? esc(ins[0].value.trim()) + ' × ' + esc(ins[1].value.trim()) : ''; };
    if (type === 'species') { rows.push(['記載者', esc(val('sf-author-name')), 3], ['発表年', esc(val('sf-publication-year')), 3], ['タイプ産地', esc(val('sf-type-locality')), 3], ['分布', esc(val('sf-known-habitats')), 3]); }
    if (type === 'clone') { rows.push(['名付けた人物', esc(val('sf-clone-namer')), 3], ['名付けた年', esc(val('sf-clone-naming-year')), 3], ['交配式', pairs('#formula-inputs'), 3]); }
    if (type === 'hybrid') { rows.push(['作出者', esc(val('sf-hybrid-breeder')), 3], ['名付けた年', esc(val('sf-hybrid-naming-year')), 3], ['交配式', pairs('#hybrid-formula-inputs'), 3]); }
    if (type === 'seedling') { rows.push(['作出者', esc(val('creator-name-input')), 3], ['播種日', esc(val('sf-sowing-date').replace(/-/g, '.')), 3], ['交配式', pairs('#seedling-formula-inputs'), 3]); }
    var photos = document.querySelectorAll('#contribute-preview img').length;
    rows.push(['写真', photos ? photos + ' 枚' : 'なし（あとから足せます）', 4]);
    var priv = $('seedling-private') && $('seedling-private').checked && type === 'seedling';
    var html = '<div class="specimen">' + rows.map(function (r) {
      return '<div class="specimen__cell"><span class="specimen__k">' + esc(r[0]) + '</span><span class="specimen__v">' + (r[1] || '<span class="absent absent--none">記録なし</span>') + ' <a href="#" class="cstep-fix" data-goto="' + r[2] + '">直す</a></span></div>';
    }).join('') + '</div>';
    html += '<p class="cstep-review__scope">' + (priv ? '公開の範囲: あなただけ（非公開の実生）' : '公開の範囲: 一覧・検索・共有に出ます') + '</p>';
    $('cstep-review').innerHTML = html;
  }
  function go(n, push) {
    n = Math.max(1, Math.min(5, n));
    step = n;
    var p = page();
    p.querySelectorAll('[data-cstep]').forEach(function (el) {
      el.classList.toggle('cstep-off', el.getAttribute('data-cstep').split(' ').indexOf(String(n)) === -1);
    });
    $('cstep-count').textContent = n + ' / 5';
    $('cstep-name').textContent = STEPS[n - 1];
    Array.prototype.forEach.call($('cstep-head').querySelectorAll('li'), function (li, i) { li.classList.toggle('is-done', i < n); });
    $('cstep-back').disabled = n === 1;
    // step 5: the bar's main button records (the form's own submit button is hidden while stepped)
    $('cstep-next').textContent = n === 5 ? 'この内容で記録する' : '次へ';
    if (n === 5) review();
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
      return;
    }
    build();
    if (!built) return;
    p.classList.add('contribute--stepped');
    document.body.classList.add('appbar-hidden');
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

  // ---- 自分の記録 (§4-6): the person's entries as list lines, each with 写真を追加 · 撮る · 記録を追加 ----
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
      return;
    }
    if (loginMsg) loginMsg.style.display = 'none';
    var sbc = window._supabaseClient;
    if (!sbc) return;
    grid.innerHTML = '<p class="text-muted">読み込み中…</p>';
    sbc.from('cultivars').select('id, genus, cultivar_name, type, created_at, origins, tags, is_private')
      .eq('user_id', window._currentUser.id).order('created_at', { ascending: false }).limit(200)
      .then(function (res) {
        if (res.error) { grid.innerHTML = '<p class="error-text">読み込めませんでした。もう一度開いてください</p>'; return; }
        var rows = res.data || [];
        if (!rows.length) {
          // nothing yet: the allowance and the members' notice still show (board 9 D9)
          grid.innerHTML = '<p class="mypost-quota">実生 <span class="num">0 / 20</span>（無料） <span id="mypost-notify"></span></p>';
          drawNotifyLink($('mypost-notify'), 'mypost');
          if (emptyMsg) { emptyMsg.style.display = ''; emptyMsg.classList.remove('d-none'); }
          return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';
        // photos are filed under the shown name (a seedling without ' [Seedling]')
        var shown = function (n) { return String(n || '').replace(' [Seedling]', ''); };
        var names = rows.map(function (r) { return shown(r.cultivar_name); });
        return sbc.from('cultivar_images').select('cultivar_name, storage_path').in('cultivar_name', names).then(function (ir) {
          var count = {}, first = {};
          (ir.data || []).forEach(function (i) { count[i.cultivar_name] = (count[i.cultivar_name] || 0) + 1; if (!first[i.cultivar_name]) first[i.cultivar_name] = i.storage_path; });
          rows.forEach(function (r) { count[r.cultivar_name] = count[shown(r.cultivar_name)]; first[r.cultivar_name] = first[shown(r.cultivar_name)]; });
          var priv = rows.filter(function (r) { return r.is_private; }).length;
          var html = '<p class="mypost-counts">記録 <span class="num">' + rows.length + '</span>' + (priv ? ' · 非公開 <span class="num">' + priv + '</span>' : '') + ' · <button type="button" class="mypost-notify-btn" data-my-export>書き出す（CSV）</button></p>';
          // the free seedling allowance and, beside it, the members' notice (board 9 D9)
          var seeds = rows.filter(function (r) { return r.type === 'seedling'; }).length;
          html += '<p class="mypost-quota">実生 <span class="num">' + seeds + ' / 20</span>（無料） <span id="mypost-notify"></span></p><div id="mypost-updates"></div><ol class="entries">';
          var baseUrl = window._SUPABASE_URL || '';
          rows.forEach(function (r) {
            var cached = (typeof cultivarData !== 'undefined' && cultivarData[r.cultivar_name]) || null;
            var origins = (r.origins || []).filter(function (o) { return !(o && o._type === 'formula'); });
            var d = window._describeEntry(r.cultivar_name, cached || { origins: origins, _type: r.type, _id: r.id, tags: r.tags }, r.type);
            var thumb = first[r.cultivar_name] && baseUrl ? (window.galleryImg ? window.galleryImg(first[r.cultivar_name], 120) : baseUrl + '/storage/v1/object/public/gallery-images/' + first[r.cultivar_name]) : '';
            var line = window.entryLine(d, { thumb: thumb, noPerson: true });
            var n = count[r.cultivar_name] || 0;
            var acts = (r.is_private ? '<span class="mypost-acts__note">非公開（写真もあなただけ）</span> ' : '')
              + '<button type="button" data-my="pick" data-key="' + esc(r.cultivar_name) + '">写真を追加</button> · <button type="button" data-my="shoot" data-key="' + esc(r.cultivar_name) + '">撮る</button>'
                + (r.type === 'seedling' ? '' : ' · <button type="button" data-my="record" data-key="' + esc(r.cultivar_name) + '">記録を追加</button>');
            var date = r.created_at ? String(r.created_at).slice(0, 10).replace(/-/g, '.') : '';
            line = line.replace(/<\/li>$/, '<p class="mypost-acts"><span class="mypost-acts__meta">写真 <span class="num">' + n + '</span> · <span class="num">' + esc(date) + '</span></span>' + acts + '</p></li>');
            html += line;
          });
          grid.innerHTML = html + '</ol>';
          drawNotifyLink($('mypost-notify'), 'mypost');
          if (window.drawMyUpdates) window.drawMyUpdates($('mypost-updates'));
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
      if (typeof gtag === 'function') gtag('event', 'my_export', { entries: (d.entries || []).length, photos: (d.photos || []).length });
    }, function () { b.disabled = false; showToast('書き出せませんでした。もう一度お試しください', true); });
  });
  // 「会員の受付開始を知らせる」 / 「登録済み · 取り消す」 (the list lives in member_interest; join/leave in app-core)
  function drawNotifyLink(el, source) {
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
          drawNotifyLink(el, source);
        });
      });
    }, function () {});
  }
  window.drawNotifyLink = drawNotifyLink;
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
