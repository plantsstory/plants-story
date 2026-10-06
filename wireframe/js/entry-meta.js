/* Entry title and description (BOARD 第6回 T53): one formula for the static stubs (CI) and the SPA,
   so search results show the same text whichever one the crawler reads.
   Title: 「{学名}（{先頭のカタカナ別名}）の由来 — {記載者 or 作出者} {年} · Aroid Origins」
   Description: the record's prose cut at 120 characters, then 「別名: …」.
   Input is a row-like object { cultivar_name, type, origins, aliases }. Pure; no DOM. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EntryMeta = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var NULLISH = { '': 1, 'null': 1, 'undefined': 1, '不明': 1, '未確認': 1, '未詳': 1, 'unknown': 1, 'n/a': 1, 'none': 1, '-': 1, '—': 1 };
  var TYPE_JP = { species: '原種', hybrid: 'Hybrid', clone: 'Clone', seedling: '実生' };
  var KATAKANA = /[ァ-ヺー]/;
  var DESC_LEN = 120;

  function clean(v) {
    if (v == null) return '';
    v = String(v).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return NULLISH[v.toLowerCase()] ? '' : v;
  }
  function yearOf(v) { var m = String(v == null ? '' : v).match(/\b(1[6-9]\d{2}|20\d{2})\b/); return m ? m[1] : ''; }
  function records(rec) {
    var os = ((rec && rec.origins) || []).filter(function (o) { return o && typeof o === 'object' && !o._type; });
    return os.sort(function (a, b) { return (parseInt(b.trust, 10) || 0) - (parseInt(a.trust, 10) || 0); });
  }
  // The name shown to readers. A species whose record says it is not yet described (species_status undescribed /
  // provisional_name) but whose stored name has no sp. reads as  Genus sp. "epithet"  (BOARD 10-07 T69).
  // The stored name, and so the URL, stay as they are.
  function displayName(rec) {
    var name = String((rec && rec.cultivar_name) || '').replace(' [Seedling]', '');
    var type = (rec && rec.type) || '';
    var q = String((rec && rec.species_qualifier) || '').toLowerCase();
    if (type && type !== 'species') return name;
    if (q) return name;
    var st = clean(((records(rec)[0] || {}).structured || {}).species_status);
    if (st !== 'undescribed' && st !== 'provisional_name') return name;
    var m = name.match(/^([A-Z][a-z]+) ([a-z][a-z-]+)$/);
    return m ? m[1] + ' sp. "' + m[2] + '"' : name;
  }
  function kana(rec) { return ((rec && rec.aliases) || []).filter(function (a) { return KATAKANA.test(a); })[0] || ''; }
  function whoAndYear(rec) {
    var o = records(rec)[0] || {}, s = o.structured || {};
    var type = (rec && rec.type) || s.origin_type || 'species';
    var who = type === 'species' ? clean(s.author_name) : (clean(s.breeder) || clean(o.discoverer_or_breeder) || clean(s.namer));
    var year = yearOf(s.publication_year) || yearOf(o.discovery_year) || yearOf(s.naming_year);
    return [who, year].filter(Boolean).join(' ');
  }

  // In the form Japanese searches take: 「アンスリウム・クリスタリナム（Anthurium crystallinum）の学名と由来」 for a species,
  // 「…の由来・作出者」 for a hybrid or clone (BOARD 10-07b T83). Without a katakana alias, the name alone leads.
  var GENUS_KANA = { Anthurium: 'アンスリウム', Monstera: 'モンステラ', Philodendron: 'フィロデンドロン' };
  function title(rec) {
    var k = kana(rec), tail = whoAndYear(rec), name = displayName(rec);
    var o = records(rec)[0] || {}, s = o.structured || {};
    var type = (rec && rec.type) || s.origin_type || 'species';
    var what = type === 'species' ? 'の学名と由来' : type === 'seedling' ? 'の由来' : 'の由来・作出者';
    var gk = GENUS_KANA[name.split(' ')[0]];
    var head = k ? (gk ? gk + '・' : '') + k + '（' + name + '）' : name;
    return head + what + (tail ? ' — ' + tail : '') + ' · Aroid Origins';
  }
  function description(rec) {
    var name = displayName(rec);
    var o = records(rec)[0] || {}, s = o.structured || {};
    var text = clean(o.body) || clean(s.notes);
    if (text.length > DESC_LEN) text = text.slice(0, DESC_LEN - 1) + '…';
    if (!text) {
      var type = TYPE_JP[(rec && rec.type) || s.origin_type] || '';
      text = name + (type ? '（' + type + '）' : '') + 'の由来。誰が、いつ、どこで名付けたかを出典つきで記録しています。';
    }
    var aliases = ((rec && rec.aliases) || []).map(clean).filter(function (a, i, arr) { return a && a !== name && arr.indexOf(a) === i; }).slice(0, 3);
    return text + (aliases.length ? ' 別名: ' + aliases.join('、') : '');
  }

  return { title: title, description: description, kana: kana, name: displayName };
});
