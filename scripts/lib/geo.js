// Type locality -> country. Mirrors countryOf() in wireframe/js/archive.js — keep both in sync.
'use strict';
const COUNTRIES = [
  'Colombia', 'Panama', 'Panamá', 'Peru', 'Perú', 'Ecuador', 'Mexico', 'México', 'Brazil', 'Brasil', 'Venezuela',
  'Costa Rica', 'Guatemala', 'Bolivia', 'French Guiana', 'Guyana', 'Suriname', 'Honduras', 'Nicaragua', 'Belize',
  'Cuba', 'Jamaica', 'Trinidad', 'Dominican Republic', 'Haiti', 'Puerto Rico', 'El Salvador', 'Paraguay', 'Argentina',
  'Indonesia', 'Madagascar', 'Australia', 'Philippines', 'Malaysia', 'Malaya', 'Nepal', 'China', 'New Guinea',
  'Papua New Guinea', 'Gabon', 'Mauritius', 'Thailand', 'Vietnam', 'Viet Nam', 'India', 'Sri Lanka', 'Myanmar',
  'Burma', 'Laos', 'Cambodia', 'Japan', 'Taiwan', 'Borneo', 'Sumatra', 'Java', 'Sulawesi', 'Cameroon', 'Congo',
  'Uganda', 'Tanzania', 'Kenya', 'Ethiopia', 'Nigeria', 'Ghana', 'West Africa', 'Réunion', 'Reunion', 'Comoros',
  'Seychelles', 'Fiji', 'Solomon Islands', 'Vanuatu', 'New Caledonia', 'Singapore'
];
const CANON = { 'Panamá': 'Panama', 'Perú': 'Peru', 'México': 'Mexico', 'Brasil': 'Brazil', 'Malaya': 'Malaysia', 'Viet Nam': 'Vietnam', 'Burma': 'Myanmar', 'Reunion': 'Réunion', 'Borneo': 'Indonesia', 'Sumatra': 'Indonesia', 'Java': 'Indonesia', 'Sulawesi': 'Indonesia', 'New Guinea': 'Papua New Guinea' };
const REGION_HINTS = [
  [/\b(Guna Yala|Kuna Yala|Comarca|Darién|Darien|Chiriqu[ií]|Bocas del Toro|Coclé|Cocle|Veraguas|Col[oó]n|Puerto Obald[ií]a)\b/i, 'Panama'],
  [/\b(Choc[oó]|Antioquia|Valle del Cauca|Buenaventura|Calima|Nari[nñ]o|Cauca|Risaralda|Caldas|Santander|Cundinamarca|Putumayo|Frontino|Murr[ií])\b/i, 'Colombia'],
  [/\b(Chiapas|Oaxaca|Veracruz|Tabasco|Yucat[aá]n)\b/i, 'Mexico'],
  [/\b(Morona|Gualaquiza|Zamora|Pastaza|Napo|Esmeraldas|Pichincha|Carchi|Los R[ií]os|Sucumb[ií]os|Orellana)\b/i, 'Ecuador'],
  [/\b(Queensland|New South Wales|Northern Territory)\b/i, 'Australia'],
  [/\b(Amazonas|Loreto|San Mart[ií]n|Hu[aá]nuco|Cusco|Cuzco|Junín|Junin)\b/i, 'Peru'],
  [/\b(Amapá|Amapa|Pará|Para|Amazonas|Bahia|Espírito Santo|Minas Gerais|Rio de Janeiro|São Paulo|Brazil North)\b/, 'Brazil']
];
function countryOf(text) {
  text = text == null ? '' : String(text).trim();
  if (!text || text === 'null') return '';
  // the country mentioned first in the text (same rule as archive.js since 10-07), not the first in our list
  let best = '', bestAt = Infinity;
  for (const c of COUNTRIES) {
    const m = new RegExp('(^|[^A-Za-z])' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z]|$)', 'i').exec(text);
    if (m && m.index < bestAt) { bestAt = m.index; best = CANON[c] || c; }
  }
  for (const [re, c] of REGION_HINTS) { const m = re.exec(text); if (m && m.index < bestAt) { bestAt = m.index; best = c; } }
  return best;
}
// every country a text mentions, in order of mention
function countriesOf(text) {
  text = text == null ? '' : String(text).trim();
  if (!text || text === 'null') return [];
  const hits = [];
  for (const c of COUNTRIES) {
    const m = new RegExp('(^|[^A-Za-z])' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z]|$)', 'i').exec(text);
    if (m) hits.push({ at: m.index, c: CANON[c] || c });
  }
  for (const [re, c] of REGION_HINTS) { const m = re.exec(text); if (m) hits.push({ at: m.index, c }); }
  hits.sort((a, b) => a.at - b.at);
  return [...new Set(hits.map(h => h.c))];
}
// Japanese country names (same table as COUNTRY_JA in wireframe/js/archive.js)
const COUNTRY_JA = { 'Colombia': 'コロンビア', 'Ecuador': 'エクアドル', 'Panama': 'パナマ', 'Peru': 'ペルー', 'Mexico': 'メキシコ',
  'Costa Rica': 'コスタリカ', 'Brazil': 'ブラジル', 'Bolivia': 'ボリビア', 'Venezuela': 'ベネズエラ', 'Guatemala': 'グアテマラ',
  'Honduras': 'ホンジュラス', 'Nicaragua': 'ニカラグア', 'Belize': 'ベリーズ', 'El Salvador': 'エルサルバドル', 'Guyana': 'ガイアナ',
  'French Guiana': 'フランス領ギアナ', 'Suriname': 'スリナム', 'Argentina': 'アルゼンチン', 'Paraguay': 'パラグアイ', 'Cuba': 'キューバ',
  'Jamaica': 'ジャマイカ', 'Trinidad': 'トリニダード', 'Dominican Republic': 'ドミニカ共和国', 'Puerto Rico': 'プエルトリコ' };
function countryJa(c) { return COUNTRY_JA[c] || c; }
function countrySlug(c) { return String(c).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, ''); }
// recorded species grouped by country (same rule as placeGroups() in archive.js):
// typeRows = type locality in the country, rangeRows = the range includes it; trade-only places are left out.
// isRecorded(row) is the caller's record gate. -> [{ key, slug, ja, typeRows, rangeRows, rows }]
function localityIndex(rows, isRecorded) {
  const map = new Map();
  const get = c => { if (!map.has(c)) map.set(c, { key: c, slug: countrySlug(c), ja: countryJa(c), typeRows: [], rangeRows: [] }); return map.get(c); };
  for (const row of rows) {
    if (row.type !== 'species' || (row.tags || []).includes('individual')) continue;
    if (isRecorded && !isRecorded(row)) continue;
    const os = (row.origins || []).filter(o => o && !o._type).sort((a, b) => (parseInt(b.trust, 10) || 0) - (parseInt(a.trust, 10) || 0));
    const s = (os[0] && os[0].structured) || {};
    if (String(s.species_status || '') === 'unresolved' || /流通/.test(String(s.origin_region || ''))) continue;
    const typeC = countryOf(s.type_locality);
    if (typeC) get(typeC).typeRows.push(row);
    for (const c of countriesOf(s.known_habitats || (os[0] && os[0].native_region) || s.origin_region)) if (c !== typeC) get(c).rangeRows.push(row);
  }
  return [...map.values()].map(g => Object.assign(g, { rows: g.typeRows.concat(g.rangeRows) }))
    .sort((a, b) => b.rows.length - a.rows.length || a.key.localeCompare(b.key));
}
module.exports = { countryOf, countriesOf, countryJa, countrySlug, localityIndex };
