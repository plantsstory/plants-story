/* Which words of an origin record a reader sees in their language (owner 2026-11-27: 「由来などを英訳する時は直訳では
   なく、AIで綺麗な文に…これらは投稿後、定期的なチェックで私にこれでいいか確認があってから反映。反映までは反映中として
   中途半端な分は作らない」).

   A contributor writes in one language. The other language gets an AI translation only after the owner approves it in
   the admin (RPC decide_translation writes origin.tr[lang] = { text, from, at, model }). A translation counts only while
   its `from` is still the record's body word for word; an edited body waits for a new approval.
   recordText(origin, lang) → { text, state, original }
     state 'ok'       text is in the reader's language (the body itself, an approved translation, or the site's own words)
     state 'original' the owner chose to show the original as it is (tr[lang].keep)
     state 'pending'  a translation is waiting for the owner: text is '' and the caller shows 「翻訳を反映中」
   Records by the database or the AI are bilingual already (body / body_en) and are shown as before. */
(function (root) {
  'use strict';
  var JA_RE = /[぀-ヿ㐀-鿿ｦ-ﾟ]/g;

  // same rule as supabase/functions/_shared/translate-check.mjs detectLang
  function detectLang(text) {
    var s = String(text || '');
    var ja = (s.match(JA_RE) || []).length;
    var words = (s.match(/[A-Za-zÀ-ɏ]{2,}/g) || []).length;
    if (ja >= 5 && ja >= words) return 'ja';
    if (ja >= 2 && words <= 3) return 'ja';
    return 'en';
  }
  function hasJapanese(text) { return /[぀-ヿ㐀-鿿ｦ-ﾟ]/.test(String(text || '')); }
  function clean(v) { return v == null ? '' : String(v).trim(); }

  function isPersonRecord(o) {
    if (!o || o.source_type === 'ipni_powo') return false;
    return o.source_type === 'manual' || !!(o.author && o.author.isAI === false);
  }

  // the fields a generated body is made of (forms.js generateBodyFromStructured), in English, with no AI
  var SUB = { sp: 'sp.', ssp: 'ssp.', cf: 'cf.', aff: 'aff.' };
  function generatedEn(s) {
    s = s || {};
    var parts = [];
    if (s.origin_type === 'species') {
      if (s.species_subcategory && s.species_subcategory !== 'species') parts.push('Rank: ' + (SUB[s.species_subcategory] || s.species_subcategory) + '.');
      var sent = [];
      if (s.author_name) sent.push('Described by ' + s.author_name + (s.publication_year ? ' in ' + s.publication_year : ''));
      if (s.type_locality) sent.push('Type locality: ' + s.type_locality);
      if (s.collector) sent.push('Collected by ' + s.collector + (s.collection_year ? ' in ' + s.collection_year : ''));
      if (s.known_habitats) sent.push('Distribution: ' + s.known_habitats);
      if (sent.length) parts.push(sent.join('. ') + '.');
    } else if (s.origin_type === 'clone') {
      if (s.namer) parts.push('Named by ' + s.namer + (s.naming_year ? ' (' + s.naming_year + ')' : '') + '.');
    } else if (s.origin_type === 'hybrid') {
      if (s.breeder) parts.push('Bred by ' + s.breeder + (s.naming_year ? ' (' + s.naming_year + ')' : '') + '.');
    } else if (s.origin_type === 'seedling') {
      if (s.breeder) parts.push('Grown from seed by ' + s.breeder + '.');
      if (s.sowing_date) parts.push('Sown: ' + s.sowing_date + '.');
    }
    if (s.formula && s.formula.parentA && s.formula.parentB) parts.push('Cross: ' + s.formula.parentA + ' × ' + s.formula.parentB + '.');
    return parts.join(' ');
  }
  // the field values of a generated body, without the bookkeeping keys
  function fieldText(s) {
    if (!s) return '';
    var keys = ['species_subcategory', 'author_name', 'publication_year', 'type_locality', 'collector', 'collection_year', 'known_habitats', 'namer', 'naming_year', 'breeder', 'sowing_date'];
    var out = keys.map(function (k) { return s[k] == null ? '' : String(s[k]); });
    if (s.formula) out.push(String(s.formula.parentA || ''), String(s.formula.parentB || ''));
    return out.join(' ');
  }

  function fromTr(o, want) {
    var tr = o.tr && o.tr[want];
    if (!tr || tr.from !== o.body) return null;
    if (tr.keep) return { text: clean(o.body), state: 'original', original: clean(o.body) };
    return clean(tr.text) ? { text: clean(tr.text), state: 'ok', original: clean(o.body) } : null;
  }

  function recordText(o, lang) {
    var want = lang === 'en' ? 'en' : 'ja';
    if (!o) return { text: '', state: 'ok', original: '' };
    var body = clean(o.body);
    if (!isPersonRecord(o)) {
      return { text: want === 'en' ? (clean(o.body_en) || body) : body, state: 'ok', original: body };
    }
    if (!body) return { text: '', state: 'ok', original: '' };
    var s = o.structured || {};
    if (o.body_generated) {
      // the site's own sentence from the fields: Japanese as stored; English made here, unless a field itself is
      // written in Japanese (then it waits for a translation like a person's words)
      if (want === 'ja') return { text: body, state: 'ok', original: body };
      if (!hasJapanese(fieldText(s))) { var g = generatedEn(s); if (g) return { text: g, state: 'ok', original: body }; }
      return fromTr(o, want) || { text: '', state: 'pending', original: body };
    }
    // a numbered plant with no note: the site's own sentence in both languages (individual form)
    if (s.individual_code && !clean(s.notes) && clean(o.body_en)) {
      return { text: want === 'en' ? clean(o.body_en) : body, state: 'ok', original: body };
    }
    if (detectLang(body) === want) return { text: body, state: 'ok', original: body };
    return fromTr(o, want) || { text: '', state: 'pending', original: body };
  }

  var api = { recordText: recordText, detectLang: detectLang, hasJapanese: hasJapanese, generatedEn: generatedEn, isPersonRecord: isPersonRecord };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RecordText = api;
})(typeof window !== 'undefined' ? window : this);
