// Share cards ("標本カード", board 2026-09-07 design §3): one 1200×630 PNG per public cultivar,
// every entry on the same paper mat — name, describer/year or parentage, locality, one line of origin,
// and the photo (or a monogram) on a 4:5 plate. Written to wireframe/images/og/<slug>.png in CI
// before the static stubs are generated. Usage: node scripts/make-og-cards.js [--only anthurium]
'use strict';
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { ogSlug } = require('./lib/og-slug');
const RecordGate = require('../wireframe/js/record-gate');

const SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';
const OUT = path.join(__dirname, '..', 'wireframe', 'images', 'og');
const FONTS = ['CormorantGaramond-Bold.ttf', 'CormorantGaramond-Italic.ttf', 'BIZUDMincho-Regular.ttf', 'IBMPlexMono-Regular.ttf', 'IBMPlexMono-Medium.ttf']
  .map(f => path.join(__dirname, 'fonts', f));
const PAPER = '#F4F1EA', PLATE = '#EDE9E0', INK = '#1E2622', MID = '#5B625E', GREEN = '#2F5D4A', OCHRE = '#A8712E';
const TYPE_EN = { species: 'SPECIES', hybrid: 'HYBRID', clone: 'CLONE', seedling: 'SEEDLING' };

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clean = v => { if (v == null) return ''; v = String(v).trim(); return /^(不明|unknown|null|undefined|n\/a)$/i.test(v) ? '' : v; };
async function getJSON(p) {
  const r = await fetch(SUPABASE_URL + p, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } });
  if (!r.ok) throw new Error('fetch ' + p + ' → ' + r.status);
  return r.json();
}
function topRecord(origins) {
  return (origins || []).filter(o => o && !o._type && !RecordGate.isDraft(o)).sort((a, b) => (parseInt(b.trust, 10) || 0) - (parseInt(a.trust, 10) || 0))[0] || null;
}
// full-width aware truncation for the one-line summary
function truncateJp(text, maxCols) {
  let cols = 0, out = '';
  for (const ch of String(text || '')) {
    cols += /[　-鿿＀-￯]/.test(ch) ? 2 : 1;
    if (cols > maxCols * 2) return out.replace(/[、。,.\s]+$/, '') + '…';
    out += ch;
  }
  return out;
}
function firstSentence(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  const m = t.match(/^(.+?[。.!?])(\s|$)/);
  return m ? m[1] : t;
}
function titleSize(name) {
  const n = [...name].length;
  return n <= 12 ? 96 : n <= 18 ? 76 : n <= 26 ? 58 : 46;
}
function monogramLetter(rest) {
  const m = rest.replace(/^(sp\.|aff\.|cf\.)\s*/i, '').match(/[A-Za-z]/);
  return m ? m[0].toUpperCase() : 'A';
}

function cardSvg(c, photoDataUri) {
  const genus = c.genus || 'Anthurium';
  const displayName = String(c.cultivar_name).replace(' [Seedling]', '');
  const rest = displayName.startsWith(genus + ' ') ? displayName.slice(genus.length + 1) : displayName;
  const isIndividual = (c.tags || []).includes('individual');
  const type = String(c.type || 'species').toLowerCase();
  const o = topRecord(c.origins);
  const s = (o && o.structured) || {};
  const state = RecordGate.state(c);
  const n = RecordGate.visibleCount(c);
  const no = 'NO. ' + String(c.id || 0).padStart(3, '0');
  const kind = isIndividual ? 'INDIVIDUAL' : (TYPE_EN[type] || type.toUpperCase());

  // cite line and the two mono rows
  let cite, row1k, row1v, row2k, row2v;
  if (type === 'species') {
    cite = displayName + (clean(s.author_name) ? ' ' + clean(s.author_name) : '');
    row1k = 'DESCRIBED'; row1v = [clean(s.author_name), clean(s.publication_year) || clean(o && o.discovery_year)].filter(Boolean).join(', ') || '—';
    const tl = clean(s.type_locality), dist = clean(s.known_habitats) || clean(o && o.native_region);
    row2k = tl ? 'TYPE LOCALITY' : 'DISTRIBUTION'; row2v = tl || dist || '—';
  } else {
    cite = displayName + ' · ' + (isIndividual ? 'Individual' : type.charAt(0).toUpperCase() + type.slice(1));
    const f = (c.origins || []).find(x => x && x._type === 'formula' && x.formula); const fm = (f && f.formula) || s.formula || {};
    const pa = clean(c.parent_a_text) || clean(fm.parentA), pb = clean(c.parent_b_text) || clean(fm.parentB);
    row1k = isIndividual ? 'SPECIES' : 'PARENTAGE';
    row1v = isIndividual ? rest.replace(/\s*'[^']*'\s*$/, '') : (pa && pb ? pa.replace(genus + ' ', '') + ' × ' + pb.replace(genus + ' ', '') : (String(c.formula_status || '').toLowerCase() === 'disputed' ? '係争中' : '—'));
    row2k = type === 'clone' && !clean(s.breeder) ? 'NAMED BY' : 'BREEDER';
    row2v = [clean(s.breeder) || clean(s.namer) || clean(o && o.discoverer_or_breeder) || clean(fm.creatorName), clean(s.naming_year) || clean(o && o.discovery_year)].filter(Boolean).join(', ') || '—';
  }
  // undescribed / unresolved names: the status row replaces the description row
  const q = String(c.species_qualifier || '').toLowerCase() || ((rest.match(/^(sp|aff|cf)\./) || [])[1] || '');
  if (type === 'species' && (q === 'sp' || q === 'aff' || q === 'cf')) {
    row1k = 'STATUS'; row1v = q === 'sp' ? 'sp. — undetermined' : q === 'aff' ? 'aff. — near, undescribed' : 'cf. — to be confirmed';
  }
  // summary: one sentence from a source record or a human record; never the generated field lines,
  // never the name itself (the title already says it)
  let summary = '';
  if (o && (o.source_type === 'ipni_powo' || o.source_type === 'manual' || (o.author && o.author.isAI === false) || o.verified)) {
    let sent = firstSentence(o.body);
    if (/^(作出者|交配式|発表者|分類|生息地|採取地|命名者)\s*[:：]/.test(sent)) sent = '';
    sent = sent.replace(new RegExp('^' + displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*は\\s*'), '');
    summary = truncateJp(sent, 21);
  }
  if (!summary) summary = state === 'ok' ? '' : '由来 未収録 · 記録を募集中';
  const status = state === 'ok' ? ('記録 ' + n + ' · ' + (o && o.source_type === 'ipni_powo' ? 'IPNI / POWO' : '投稿者の記録')) : '記録 未収録';
  const url = 'plantsstory.com/' + genus.toLowerCase() + '/' + rest;

  const size = titleSize(rest);
  const plate = photoDataUri
    ? `<image x="808" y="144" width="280" height="354" preserveAspectRatio="xMidYMid meet" href="${photoDataUri}"/>`
    : `<text x="948" y="360" text-anchor="middle" font-family="Cormorant Garamond" font-weight="bold" font-size="160" fill="${MID}">${esc(monogramLetter(rest))}</text>
       <text x="948" y="470" text-anchor="middle" font-family="IBM Plex Mono" font-size="14" letter-spacing="2" fill="${MID}">PLATE NOT YET RECORDED</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${PAPER}"/>
  <rect x="28.5" y="28.5" width="1143" height="573" fill="none" stroke="${INK}" stroke-width="1"/>
  <rect x="36.5" y="36.5" width="1127" height="557" fill="none" stroke="${INK}" stroke-width="1"/>
  <text x="72" y="96" font-family="IBM Plex Mono" font-size="19" letter-spacing="3" fill="${MID}">${esc(genus.toUpperCase())} · ${esc(kind)} · ${esc(no)}</text>
  <text x="1128" y="96" text-anchor="end" font-family="IBM Plex Mono" font-size="19" letter-spacing="3" fill="${MID}">AROID ORIGINS</text>
  <line x1="72" y1="118" x2="1128" y2="118" stroke="${INK}" stroke-width="1"/>
  <text x="72" y="232" font-family="Cormorant Garamond" font-weight="bold" font-size="${size}" fill="${INK}">${esc(rest)}</text>
  <text x="72" y="300" font-family="Cormorant Garamond" font-style="italic" font-size="34" fill="${INK}">${esc(cite)}</text>
  <text x="72" y="372" font-family="IBM Plex Mono" font-size="19" letter-spacing="2" fill="${MID}">${esc(row1k)}</text>
  <text x="290" y="372" font-family="IBM Plex Mono" font-weight="500" font-size="24" fill="${INK}">${esc(truncateJp(row1v, 22))}</text>
  <text x="72" y="412" font-family="IBM Plex Mono" font-size="19" letter-spacing="2" fill="${MID}">${esc(row2k)}</text>
  <text x="290" y="412" font-family="IBM Plex Mono" font-weight="500" font-size="24" fill="${INK}">${esc(truncateJp(row2v, 22))}</text>
  ${summary ? `<text x="72" y="472" font-family="BIZ UDMincho" font-size="28" fill="${INK}">${esc(summary)}</text>` : ''}
  <rect x="800" y="136" width="296" height="370" fill="${PLATE}" stroke="${INK}" stroke-width="1"/>
  ${plate}
  <line x1="72" y1="522" x2="1128" y2="522" stroke="${INK}" stroke-width="1"/>
  <text x="72" y="558" font-family="IBM Plex Mono" font-size="21" letter-spacing="2" fill="${GREEN}">${esc(url)}</text>
  <text x="1128" y="558" text-anchor="end" font-family="IBM Plex Mono" font-size="19" letter-spacing="2" fill="${OCHRE}">${esc(status)}</text>
</svg>`;
}

async function photoDataUri(storagePath) {
  if (!storagePath) return '';
  try {
    const url = SUPABASE_URL + '/storage/v1/object/public/gallery-images/' + String(storagePath).split('/').map(encodeURIComponent).join('/');
    const r = await fetch(url);
    if (!r.ok) return '';
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 12 * 1024 * 1024) return '';
    const mime = /\.png$/i.test(storagePath) ? 'image/png' : 'image/jpeg';
    return 'data:' + mime + ';base64,' + buf.toString('base64');
  } catch (e) { return ''; }
}

async function main() {
  const only = (process.argv.indexOf('--only') >= 0) ? process.argv[process.argv.indexOf('--only') + 1] : null;
  let genera = await getJSON('/rest/v1/genera?select=slug,name&is_visible=eq.true&order=display_order');
  if (!Array.isArray(genera)) genera = await getJSON('/rest/v1/genera?select=slug,name&order=display_order');
  const visible = new Set(genera.map(g => g.name));
  const rows = await getJSON('/rest/v1/cultivars?select=id,cultivar_name,genus,type,origins,updated_at,parent_a_text,parent_b_text,formula_status,species_qualifier,selected_from_id,tags,locality,ai_status&is_private=eq.false&order=genus,cultivar_name');
  const images = await getJSON('/rest/v1/cultivar_images?select=cultivar_name,storage_path,display_order&order=display_order');
  const firstImage = {};
  for (const im of images) if (!firstImage[im.cultivar_name]) firstImage[im.cultivar_name] = im.storage_path;

  fs.mkdirSync(OUT, { recursive: true });
  const fonts = FONTS.filter(f => fs.existsSync(f));
  if (fonts.length < 5) console.warn('warning: missing fonts', FONTS.filter(f => !fs.existsSync(f)).map(f => path.basename(f)));
  let written = 0;
  for (const c of rows) {
    if (!visible.has(c.genus || 'Anthurium')) continue;
    if (c.type === 'seedling' || String(c.cultivar_name).includes('[Seedling]')) continue;
    if (only && (c.genus || '').toLowerCase() !== only.toLowerCase()) continue;
    const displayName = String(c.cultivar_name).replace(' [Seedling]', '');
    const photo = await photoDataUri(firstImage[displayName]);
    const svg = cardSvg(c, photo);
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'BIZ UDMincho' } }).render().asPng();
    const slug = ogSlug(c.genus || 'Anthurium', c.cultivar_name);
    fs.writeFileSync(path.join(OUT, slug + '.png'), png);
    written++;
  }
  console.log('wrote ' + written + ' share cards to ' + path.relative(process.cwd(), OUT));
}
main().catch(e => { console.error(e); process.exit(1); });
