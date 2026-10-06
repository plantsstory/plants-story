// Instagram portrait images (BOARD 10-07b T94): one 1080×1350 PNG per recorded entry, on the same paper mat as the
// share cards, so the owner can post today's leaf in a few minutes; plus five launch slides (images/ig/launch-1..5.png).
// No AI marks, no %, no affiliate anything. Written to wireframe/images/ig/ in CI. Usage: node scripts/make-ig-images.js
'use strict';
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { ogSlug } = require('./lib/og-slug');
const RecordGate = require('../wireframe/js/record-gate');
const EntryMeta = require('../wireframe/js/entry-meta');
const geo = require('./lib/geo');

const SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';
const OUT = path.join(__dirname, '..', 'wireframe', 'images', 'ig');
const FONTS = ['CormorantGaramond-Bold.ttf', 'CormorantGaramond-Italic.ttf', 'BIZUDMincho-Regular.ttf', 'IBMPlexMono-Regular.ttf', 'IBMPlexMono-Medium.ttf']
  .map(f => path.join(__dirname, 'fonts', f));
const PAPER = '#F4F1EA', PLATE = '#EDE9E0', INK = '#1E2622', MID = '#5B625E', GREEN = '#2F5D4A';
const W = 1080, H = 1350;
const KIND_JP = { species: '原種', hybrid: 'Hybrid', clone: 'Clone', seedling: '実生' };

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
// wrap Japanese / Latin text into lines of at most `cols` full-width columns
function wrap(text, cols, maxLines) {
  const out = []; let line = '', w = 0;
  for (const ch of String(text || '')) {
    const cw = /[　-鿿＀-￯]/.test(ch) ? 2 : 1;
    if (w + cw > cols * 2) { out.push(line); line = ''; w = 0; if (out.length === maxLines) break; }
    line += ch; w += cw;
  }
  if (line && out.length < maxLines) out.push(line);
  if (out.length === maxLines && String(text).length > out.join('').length) out[maxLines - 1] = out[maxLines - 1].replace(/.$/, '…');
  return out;
}
function textLines(lines, x, y, lh, attrs) {
  return lines.map((l, i) => `<text x="${x}" y="${y + i * lh}" ${attrs}>${esc(l)}</text>`).join('\n');
}
function frame(inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PAPER}"/>
  <rect x="32.5" y="32.5" width="${W - 65}" height="${H - 65}" fill="none" stroke="${INK}" stroke-width="1"/>
  <rect x="40.5" y="40.5" width="${W - 81}" height="${H - 81}" fill="none" stroke="${INK}" stroke-width="1"/>
  ${inner}
  <line x1="80" y1="${H - 120}" x2="${W - 80}" y2="${H - 120}" stroke="${INK}" stroke-width="1"/>
  <text x="80" y="${H - 78}" font-family="IBM Plex Mono" font-size="26" letter-spacing="2" fill="${GREEN}">plantsstory.com</text>
  <text x="${W - 80}" y="${H - 78}" text-anchor="end" font-family="IBM Plex Mono" font-size="24" letter-spacing="3" fill="${MID}">AROID ORIGINS</text>
</svg>`;
}

function entrySvg(c, photo) {
  const genus = c.genus || 'Anthurium';
  const name = EntryMeta.name(c);
  const rest = name.startsWith(genus + ' ') ? name.slice(genus.length + 1) : name;
  const type = String(c.type || 'species').toLowerCase();
  const o = topRecord(c.origins) || {}, s = o.structured || {};
  const species = type === 'species';
  const who = species ? clean(s.author_name) : (clean(s.breeder) || clean(s.namer) || clean(o.discoverer_or_breeder));
  const year = (String(species ? (s.publication_year || o.discovery_year) : (s.naming_year || o.discovery_year) || '').match(/\d{4}/) || [''])[0];
  const cc = species ? (geo.countryOf(s.type_locality) || geo.countriesOf(s.known_habitats)[0] || '') : '';
  const place = species ? (cc ? geo.countryJa(cc) : '') : ((c.parent_a_text || c.parent_b_text) ? (c.parent_a_text || '?').replace(genus + ' ', '') + ' × ' + (c.parent_b_text || '?').replace(genus + ' ', '') : '');
  let first = String(o.body || '').replace(/\s+/g, ' ').trim();
  const m = first.match(/^(.+?。)(.+?。)?/); first = m ? (m[1] + (m[2] || '')) : first;
  const plateY = 150, plateH = photo ? 640 : 0;
  const plate = photo
    ? `<rect x="80" y="${plateY}" width="${W - 160}" height="${plateH}" fill="${PLATE}" stroke="${INK}" stroke-width="1"/>
       <image x="96" y="${plateY + 16}" width="${W - 192}" height="${plateH - 32}" preserveAspectRatio="xMidYMid meet" href="${photo}"/>`
    : '';
  const y0 = photo ? plateY + plateH + 90 : 300;
  const size = [...rest].length <= 14 ? 84 : [...rest].length <= 22 ? 64 : 50;
  return frame(`
  <text x="80" y="104" font-family="BIZ UDMincho" font-size="28" fill="${MID}">${esc(genus)} · ${esc(KIND_JP[type] || type)}</text>
  ${plate}
  <text x="80" y="${y0}" font-family="Cormorant Garamond" font-weight="bold" font-style="${species ? 'italic' : 'normal'}" font-size="${size}" fill="${INK}">${esc(rest)}</text>
  <text x="80" y="${y0 + 62}" font-family="BIZ UDMincho" font-size="32" fill="${INK}">${esc([who, year, place].filter(Boolean).join(' · '))}</text>
  ${textLines(wrap(first, 26, photo ? 3 : 8), 80, y0 + 140, 50, `font-family="BIZ UDMincho" font-size="32" fill="${INK}"`)}`);
}

function launchSvgs(byName) {
  const cr = byName['Anthurium crystallinum'], dm = byName["Anthurium 'Dark Mama'"];
  const big = (t, y, size) => `<text x="80" y="${y}" font-family="BIZ UDMincho" font-size="${size || 64}" fill="${INK}">${esc(t)}</text>`;
  const small = (lines, y) => textLines(lines, 80, y, 54, `font-family="BIZ UDMincho" font-size="34" fill="${INK}"`);
  const box = (x, y, w, label, sub, roman) => `<rect x="${x}" y="${y}" width="${w}" height="120" fill="${PLATE}" stroke="${INK}" stroke-width="1"/>
    <text x="${x + w / 2}" y="${y + 58}" text-anchor="middle" font-family="Cormorant Garamond" font-weight="bold" font-style="${roman ? 'normal' : 'italic'}" font-size="40" fill="${INK}">${esc(label)}</text>
    <text x="${x + w / 2}" y="${y + 96}" text-anchor="middle" font-family="BIZ UDMincho" font-size="24" fill="${MID}">${esc(sub)}</text>`;
  const crRec = cr ? topRecord(cr.origins) : null;
  const dmRec = dm ? topRecord(dm.origins) : null;
  return [
    frame(`<text x="80" y="104" font-family="IBM Plex Mono" font-size="26" letter-spacing="3" fill="${MID}">1 / 5</text>
      ${big('誰が、いつ、どこで', 420, 76)}${big('名付けたか。', 520, 76)}
      ${small(['アロイド（アンスリウムなど）の品種の由来を、', '出典つきで記録する図鑑を作りました。', '', '原種は学名データベースと原記載で照合、', '交配種・クローンは作出者と交配式を記録。'], 700)}`),
    frame(`<text x="80" y="104" font-family="IBM Plex Mono" font-size="26" letter-spacing="3" fill="${MID}">2 / 5 · 原種</text>
      <text x="80" y="380" font-family="Cormorant Garamond" font-weight="bold" font-style="italic" font-size="88" fill="${INK}">Anthurium crystallinum</text>
      ${big('Linden & André · 1873', 470, 44)}
      ${small(wrap(crRec ? String(crRec.body || '').replace(/\s+/g, ' ') : '', 26, 8), 600)}`),
    frame(`<text x="80" y="104" font-family="IBM Plex Mono" font-size="26" letter-spacing="3" fill="${MID}">3 / 5 · 系統図</text>
      ${big('親と子を、名前の完全一致だけで結ぶ。', 260, 44)}
      ${box(80, 380, 420, 'warocqueanum', '原種 · 1878')}
      <text x="${W / 2}" y="460" text-anchor="middle" font-family="Cormorant Garamond" font-size="56" fill="${MID}">×</text>
      ${box(580, 380, 420, 'papillilaminum', '原種 · 1986')}
      <line x1="${W / 2}" y1="520" x2="${W / 2}" y2="640" stroke="${INK}" stroke-width="1"/>
      ${box(290, 640, 500, "'Dark Mama'", 'Hybrid', true)}
      ${small(['名前の一部が同じでも別の植物です。', "crystallinum と 'Red Crystallinum' は結びません。"], 900)}`),
    frame(`<text x="80" y="104" font-family="IBM Plex Mono" font-size="26" letter-spacing="3" fill="${MID}">4 / 5 · 説が分かれるとき</text>
      <text x="80" y="330" font-family="Cormorant Garamond" font-weight="bold" font-size="96" fill="${INK}">'Dark Mama'</text>
      ${big('親は 2 つの出典で一致。', 450, 46)}${big('作出者には異説あり。', 520, 46)}
      ${small(wrap(dmRec ? String(dmRec.body || '').replace(/\s+/g, ' ') : '', 26, 7), 640)}`),
    frame(`<text x="80" y="104" font-family="IBM Plex Mono" font-size="26" letter-spacing="3" fill="${MID}">5 / 5</text>
      ${big('あなたの交配を、', 420, 76)}${big('系統図に。', 520, 76)}
      ${small(['実生の交配式と播種日を記録すると、', '親の原種のページから系統図でつながります。', '', '閲覧は無料。投稿は Google でログインして。'], 700)}`)
  ];
}

async function photoDataUri(storagePath) {
  if (!storagePath) return '';
  try {
    const r = await fetch(SUPABASE_URL + '/storage/v1/object/public/gallery-images/' + String(storagePath).split('/').map(encodeURIComponent).join('/'));
    if (!r.ok) return '';
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 12 * 1024 * 1024) return '';
    return 'data:' + (/\.png$/i.test(storagePath) ? 'image/png' : 'image/jpeg') + ';base64,' + buf.toString('base64');
  } catch (e) { return ''; }
}

async function main() {
  const genera = await getJSON('/rest/v1/genera?select=name,is_visible');
  const visible = new Set(genera.filter(g => g.is_visible !== false).map(g => g.name));
  const rows = await getJSON('/rest/v1/cultivars?select=id,cultivar_name,genus,type,origins,parent_a_text,parent_b_text,formula_status,species_qualifier,selected_from_id,tags,locality,ai_status,updated_at&is_private=eq.false&order=genus,cultivar_name');
  const images = await getJSON('/rest/v1/cultivar_images?select=cultivar_name,storage_path,display_order&order=display_order');
  const firstImage = {};
  for (const im of images) if (!firstImage[im.cultivar_name]) firstImage[im.cultivar_name] = im.storage_path;
  fs.mkdirSync(OUT, { recursive: true });
  const fonts = FONTS.filter(f => fs.existsSync(f));
  const render = svg => new Resvg(svg, { fitTo: { mode: 'width', value: W }, font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'BIZ UDMincho' } }).render().asPng();
  const byName = {};
  let n = 0;
  for (const c of rows) {
    byName[c.cultivar_name] = c;
    if (!visible.has(c.genus || 'Anthurium')) continue;
    if (c.type === 'seedling' || (c.tags || []).includes('individual') || RecordGate.state(c) !== 'ok') continue;
    const photo = await photoDataUri(firstImage[c.cultivar_name]);
    fs.writeFileSync(path.join(OUT, ogSlug(c.genus || 'Anthurium', c.cultivar_name) + '.png'), render(entrySvg(c, photo)));
    n++;
  }
  launchSvgs(byName).forEach((svg, i) => fs.writeFileSync(path.join(OUT, 'launch-' + (i + 1) + '.png'), render(svg)));
  console.log('wrote ' + n + ' Instagram images and 5 launch slides to ' + path.relative(process.cwd(), OUT));
}
main().catch(e => { console.error(e); process.exit(1); });
