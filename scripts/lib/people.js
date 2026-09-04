// Person extraction shared by the static generators.
// Mirrors personKey / splitPeople in wireframe/js/archive.js — keep both in sync.
'use strict';

const NULLISH = new Set(['', 'null', 'undefined', '不明', 'unknown']);
function clean(v) {
  if (v == null) return '';
  v = String(v).trim();
  return NULLISH.has(v.toLowerCase()) ? '' : v;
}
// "T. B. Croat" / "O.Ortiz" / "Croat" -> "Croat"; abbreviations ("N.E.Br.") and full names stay
function personKey(p) {
  p = p.replace(/\s+/g, ' ').trim();
  const tokens = p.split(' ');
  if (tokens.length === 1) {
    const m = p.match(/^(?:[A-Z]\.)+([A-Z][a-z]{2,})$/);
    return m ? m[1] : p;
  }
  const rest = tokens.filter(tk => !/^(?:[A-Z]\.)+$/.test(tk) && !/^[A-Z]$/.test(tk));
  if (rest.length === 1 && /^[A-Z][a-z]{2,}$/.test(rest[0])) return rest[0];
  return p;
}
function splitPeople(v) {
  v = clean(v);
  if (!v) return [];
  v = v.replace(/\([^)]*\)/g, ' ');
  return v.split(/\s*(?:&|,|\bet\b|\bex\b|;|\/|×)\s*/).map(p => personKey(p.trim())).filter(p => p.length > 1);
}
function personSlug(name) {
  return String(name).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
}
function topOrigin(origins) {
  const os = (origins || []).filter(o => o && !o._type);
  os.sort((a, b) => (parseInt(b.trust, 10) || 0) - (parseInt(a.trust, 10) || 0));
  return os[0] || null;
}
const ROLE_FIELDS = [['author_name', 'author'], ['collector', 'collector'], ['breeder', 'breeder'], ['namer', 'namer']];
// -> [{ key, role }] for one cultivar row
function peopleOfRow(row) {
  const o = topOrigin(row.origins);
  const s = (o && o.structured) || {};
  const out = [];
  const push = (v, role) => splitPeople(v).forEach(key => { if (!out.some(x => x.key === key)) out.push({ key, role }); });
  for (const [field, role] of ROLE_FIELDS) push(s[field], role);
  const f = (row.origins || []).find(x => x && x._type === 'formula');
  if (f && f.formula) push(f.formula.creatorName, 'breeder');
  if (o && !s.breeder) push(o.discoverer_or_breeder, 'breeder');
  return out;
}
// -> Map key -> { key, slug, roles: {role: count}, rows: [] }
function peopleIndex(rows) {
  const map = new Map();
  for (const row of rows) {
    for (const { key, role } of peopleOfRow(row)) {
      if (!map.has(key)) map.set(key, { key, slug: personSlug(key), roles: {}, rows: [] });
      const p = map.get(key);
      p.roles[role] = (p.roles[role] || 0) + 1;
      if (!p.rows.includes(row)) p.rows.push(row);
    }
  }
  return [...map.values()].sort((a, b) => b.rows.length - a.rows.length || a.key.localeCompare(b.key));
}
module.exports = { clean, personKey, splitPeople, personSlug, topOrigin, peopleOfRow, peopleIndex };
