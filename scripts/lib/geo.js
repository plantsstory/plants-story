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
  for (const c of COUNTRIES) {
    if (new RegExp('(^|[^A-Za-z])' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^A-Za-z]|$)', 'i').test(text)) return CANON[c] || c;
  }
  for (const [re, c] of REGION_HINTS) if (re.test(text)) return c;
  return '';
}
function countrySlug(c) { return String(c).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, ''); }
// species rows grouped by country -> [{ key, slug, rows }]
function localityIndex(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.type !== 'species') continue;
    const os = (row.origins || []).filter(o => o && !o._type).sort((a, b) => (parseInt(b.trust, 10) || 0) - (parseInt(a.trust, 10) || 0));
    const s = (os[0] && os[0].structured) || {};
    const c = countryOf(s.type_locality) || countryOf(s.known_habitats) || countryOf(os[0] && os[0].native_region);
    if (!c) continue;
    if (!map.has(c)) map.set(c, { key: c, slug: countrySlug(c), rows: [] });
    map.get(c).rows.push(row);
  }
  return [...map.values()].sort((a, b) => b.rows.length - a.rows.length || a.key.localeCompare(b.key));
}
module.exports = { countryOf, countrySlug, localityIndex };
