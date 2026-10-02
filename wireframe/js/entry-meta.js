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
  function displayName(rec) { return String((rec && rec.cultivar_name) || '').replace(' [Seedling]', ''); }
  function kana(rec) { return ((rec && rec.aliases) || []).filter(function (a) { return KATAKANA.test(a); })[0] || ''; }
  function whoAndYear(rec) {
    var o = records(rec)[0] || {}, s = o.structured || {};
    var type = (rec && rec.type) || s.origin_type || 'species';
    var who = type === 'species' ? clean(s.author_name) : (clean(s.breeder) || clean(o.discoverer_or_breeder) || clean(s.namer));
    var year = yearOf(s.publication_year) || yearOf(o.discovery_year) || yearOf(s.naming_year);
    return [who, year].filter(Boolean).join(' ');
  }

  function title(rec) {
    var k = kana(rec), tail = whoAndYear(rec);
    return displayName(rec) + (k ? '（' + k + '）' : '') + 'の由来' + (tail ? ' — ' + tail : '') + ' · Aroid Origins';
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

  return { title: title, description: description, kana: kana };
});
