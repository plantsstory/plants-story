/* Record gate (BOARD §3, 2026-09-05): one function decides whether a record is
   「収録済み」 or 「未収録」, shared by the site (archive.js / app-core.js / pages.js),
   the CI generators (scripts/generate-sitemap.js, generate-static-pages.js) and admin.
   Input is a row-like object: { type, origins, formula, parent_a_text, parent_b_text,
   formula_status, species_qualifier, selected_from_id, tags, locality, ai_status,
   updated_at, cultivar_name }. Pure; no DOM. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RecordGate = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var NULLISH = { '': 1, 'null': 1, 'undefined': 1, '不明': 1, 'unknown': 1, 'n/a': 1 };
  var RESEARCH_HOURS = 72;

  function clean(v) {
    if (v == null) return '';
    v = String(v).trim();
    return NULLISH[v.toLowerCase()] ? '' : v;
  }
  function num(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
  function records(rec) {
    return ((rec && rec.origins) || []).filter(function (o) { return o && typeof o === 'object' && !o._type; });
  }
  function formulaOf(rec) {
    if (rec && rec.formula && typeof rec.formula === 'object') return rec.formula;
    var f = ((rec && rec.origins) || []).filter(function (o) { return o && o._type === 'formula' && o.formula; })[0];
    return f ? f.formula : null;
  }
  function hasSourceUrl(o) {
    if (!o) return false;
    if (((o.sources || []).some(function (s) { return s && clean(s.url); }))) return true;
    var links = (o.structured && o.structured.citation_links) || [];
    if (links.some(function (l) { return l && clean(l.url); })) return true;
    return !!clean(o.source_url);
  }
  // AI text with no citable source and low trust: shown folded as a draft, never counted as a record
  function isDraft(o) {
    if (!o || o.source_type === 'ipni_powo' || o.source_type === 'manual') return false;
    var ai = !!(o.author && o.author.isAI) || /^ai_/.test(String(o.source_type || ''));
    return ai && num(o.trust) < 40 && !hasSourceUrl(o) && !o.verified;
  }
  function qualifierOf(rec) {
    var q = clean(rec && rec.species_qualifier).toLowerCase();
    if (q) return q;
    var m = clean(rec && rec.cultivar_name).match(/\b(sp|aff|cf|ssp|var)\.\s/);
    return m ? m[1] : '';
  }
  function textLen(o) {
    var s = (o && o.structured) || {};
    return Math.max(clean(s.notes).length, clean(o && o.body).length);
  }
  function isIndividual(rec) {
    var tags = (rec && rec.tags) || [];
    return tags.indexOf('individual') !== -1 || !!(rec && rec.selected_from_id);
  }
  function parentsOf(rec, s) {
    var f = formulaOf(rec) || (s && s.formula) || {};
    var a = clean(rec && rec.parent_a_text) || clean(f.parentA), b = clean(rec && rec.parent_b_text) || clean(f.parentB);
    return { a: a, b: b, both: !!(a && b), any: !!(a || b), creator: clean(f.creatorName) };
  }

  /* gate(rec) → { pass, missing: [key...] } ; keys map to i18n gate_missing_<key> */
  function gate(rec) {
    var type = String((rec && rec.type) || 'species').toLowerCase();
    var os = records(rec).filter(function (o) { return !isDraft(o); })
      .sort(function (a, b) { return num(b.trust) - num(a.trust); });
    var missing = [];
    if (!os.length) return { pass: false, missing: ['record'] };
    var o = os[0], s = o.structured || {};
    var anySource = os.some(hasSourceUrl);
    var longest = Math.max.apply(null, os.map(textLen));
    var q = qualifierOf(rec);
    var p = parentsOf(rec, s);

    if (type === 'species') {
      var undescribed = (q === 'sp' || q === 'aff' || q === 'cf') || (clean(s.species_status) && clean(s.species_status) !== 'described');
      if (undescribed) {
        var loc = clean(s.type_locality) || clean(s.known_habitats) || clean(o.native_region) || clean(rec.locality);
        var ctx = clean(s.closest_species) || clean(s.introduced_by) || clean(s.species_status) || longest >= 40;
        if (!loc) missing.push('locality');
        if (!ctx) missing.push('context');
      } else {
        if (!clean(s.author_name)) missing.push('author');
        if (!(num(s.publication_year) || num(o.discovery_year))) missing.push('year');
        if (!(clean(s.type_locality) || clean(s.known_habitats) || clean(o.native_region) || clean(rec.locality))) missing.push('place');
        if (!anySource) missing.push('source');
      }
    } else if (type === 'hybrid') {
      var fs = clean(rec.formula_status).toLowerCase();
      if (!(p.both || fs === 'unknown' || fs === 'complex')) missing.push('parents');
      if (!(clean(s.breeder) || clean(s.namer) || num(s.naming_year) || clean(o.discoverer_or_breeder) || p.creator)) missing.push('person');
      if (!(anySource || longest >= 80)) missing.push('evidence');
    } else if (type === 'clone') {
      if (isIndividual(rec)) {
        if (!(rec.selected_from_id || p.any)) missing.push('parents');
      } else {
        var facts = 0;
        if (clean(s.namer) || clean(s.breeder) || clean(o.discoverer_or_breeder)) facts++;
        if (num(s.naming_year) || num(o.discovery_year)) facts++;
        if (p.any || rec.selected_from_id) facts++;
        if (longest >= 80) facts++;
        if (anySource) facts++;
        if (facts < 2) missing.push('clone_facts');
      }
    } else if (type === 'seedling') {
      if (!p.both) missing.push('parents');
      if (!clean(s.sowing_date)) missing.push('sowing');
      if (!(clean(s.breeder) || p.creator || clean(o.discoverer_or_breeder))) missing.push('breeder');
    }
    return { pass: missing.length === 0, missing: missing };
  }

  /* state(rec) → 'ok' | 'unrecorded' | 'researching' | 'none' */
  function state(rec, now) {
    var os = records(rec);
    if (!os.length) {
      var st = String((rec && rec.ai_status) || '');
      if (st === 'pending' || st === 'researching') {
        var t = rec && rec.updated_at ? new Date(rec.updated_at).getTime() : 0;
        if (t && ((now || Date.now()) - t) < RESEARCH_HOURS * 3600 * 1000) return 'researching';
      }
      return 'none';
    }
    return gate(rec).pass ? 'ok' : 'unrecorded';
  }
  function visibleCount(rec) { return records(rec).filter(function (o) { return !isDraft(o); }).length; }

  return { gate: gate, state: state, isDraft: isDraft, hasSourceUrl: hasSourceUrl, visibleCount: visibleCount, RESEARCH_HOURS: RESEARCH_HOURS };
});
