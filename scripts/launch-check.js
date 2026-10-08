// Launch check (BOARD 第11回 T161): the 19:00 check before the announcement, in one run. Reads only — the live site
// and the public data — and changes nothing. Usage: node scripts/launch-check.js [--quick]
//   M1   recorded Anthurium ≥ 40
//   M2   the fifteen most traded names are found by their Latin name and by katakana (the four still to come are
//        listed with their T95 date)
//   share  each M2 page opens (200, no redirect) and its og:image is there
//   sitemap  every URL answers 200 without a redirect and its canonical is itself (skipped with --quick)
//   /ig/   noindex and not in the sitemap; legal pages open; the tools catalogue's opening conditions on 10/24
'use strict';
const RecordGate = require('../wireframe/js/record-gate');
const ToolGate = require('../wireframe/js/tool-gate');

const SITE = 'https://plantsstory.com';
const SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
// the public anon key, as in generate-static-pages.js (readable data only)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';
const QUICK = process.argv.includes('--quick');

// BOARD §4b M2. The four registered on their own dates (T95) are expected to be missing before then.
const TOP15 = [
  { latin: 'crystallinum' }, { latin: 'clarinervium' }, { latin: 'warocqueanum' }, { latin: 'papillilaminum' },
  { latin: 'forgetii' }, { latin: 'regale' }, { latin: 'luxurians' }, { latin: 'magnificum' },
  { latin: "'Michelle'", due: '10/13' }, { latin: "'Zara'", due: '10/15' }, { latin: "'Dorayaki'", due: '10/11' },
  { latin: "'Red Vein Dark Phoenix'", due: '10/16' }, { latin: "'Ace of Spades'" }, { latin: "'Dark Mama'" },
  { latin: 'antolakii', also: 'Black Velvet' },
];
const KATAKANA = /[ァ-ヺー]/;
const fold = s => String(s || '').normalize('NFKC').toLowerCase().replace(/['"‘’“”]/g, '').replace(/\s+/g, ' ').trim();

let failures = 0, warnings = 0;
const ok = (m) => console.log('  ok    ' + m);
const ng = (m) => { failures++; console.log('  NG    ' + m); };
const warn = (m) => { warnings++; console.log('  注意  ' + m); };

async function getJSON(p) {
  const r = await fetch(SUPABASE_URL + p, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } });
  if (!r.ok) throw new Error('fetch ' + p + ' → ' + r.status);
  return r.json();
}
async function head(url) {
  try {
    const r = await fetch(url, { redirect: 'manual' });
    const text = r.status === 200 && /text\/html/.test(r.headers.get('content-type') || '') ? await r.text() : '';
    return { status: r.status, location: r.headers.get('location') || '', text };
  } catch (e) { return { status: 0, location: '', text: '', error: e.message }; }
}
const entryUrl = c => {
  const g = c.genus || 'Anthurium';
  const rest = String(c.cultivar_name).replace(' [Seedling]', '');
  const r2 = rest.startsWith(g + ' ') ? rest.slice(g.length + 1) : rest;
  return SITE + '/' + g.toLowerCase() + '/' + encodeURIComponent(r2) + '/';
};
const metaOf = (html, re) => { const m = html.match(re); return m ? m[1].replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&') : ''; };

async function main() {
  console.log('Aroid Origins launch check — ' + new Date().toISOString());
  const genera = await getJSON('/rest/v1/genera?select=name,is_visible');
  const visible = new Set(genera.filter(g => g.is_visible !== false).map(g => g.name));
  const rows = (await getJSON('/rest/v1/cultivars?select=id,cultivar_name,genus,type,origins,aliases,updated_at,verified_at,parent_a_text,parent_b_text,formula_status,species_qualifier,selected_from_id,tags,locality,ai_status&is_private=eq.false'))
    .filter(c => visible.has(c.genus || 'Anthurium'));
  const recorded = rows.filter(c => c.type !== 'seedling' && !(c.tags || []).includes('individual') && RecordGate.state(c) === 'ok');

  console.log('\nM1 収録済み Anthurium');
  const n = recorded.filter(c => (c.genus || 'Anthurium') === 'Anthurium').length;
  (n >= 40 ? ok : ng)(n + ' 件（基準 40）');

  console.log('\nM2 国内流通トップ15（学名とカタカナ）');
  const found = [];
  for (const t of TOP15) {
    const key = fold(t.latin);
    const hit = rows.find(c => {
      const nm = fold(String(c.cultivar_name).replace(/^\S+\s+/, ''));
      return nm === key || (c.aliases || []).some(a => fold(a) === key || (t.also && fold(a) === fold(t.also)));
    });
    if (!hit) { (t.due ? warn : ng)(t.latin + ' — 未収録' + (t.due ? '（T95 で ' + t.due + ' に登録予定）' : '')); continue; }
    const kana = (hit.aliases || []).filter(a => KATAKANA.test(a));
    const state = RecordGate.state(hit);
    if (state !== 'ok') { ng(t.latin + ' — 収録済みでない（' + state + '）'); continue; }
    if (!kana.length) { ng(t.latin + ' — カタカナの別名がない（カタカナで検索しても出ない）'); continue; }
    ok(t.latin + ' — ' + kana[0]);
    found.push(hit);
  }

  console.log('\n共有リンク（品種ページと og:image）');
  for (const c of found) {
    const url = entryUrl(c);
    const r = await head(url);
    if (r.status !== 200) { ng(c.cultivar_name + ' — ' + url + ' → ' + r.status + (r.location ? ' → ' + r.location : '')); continue; }
    const og = metaOf(r.text, /<meta property="og:image" content="([^"]+)"/);
    const ogr = og ? await fetch(og, { method: 'HEAD' }).then(x => x.status, () => 0) : 0;
    (ogr === 200 ? ok : ng)(c.cultivar_name + ' — ページ 200・og:image ' + (og ? ogr : 'なし'));
  }

  console.log('\n/ig/ と法務ページ');
  const ig = await head(SITE + '/ig/');
  (ig.status === 200 && /noindex/.test(ig.text) ? ok : ng)('/ig/ — ' + ig.status + (/noindex/.test(ig.text) ? '・noindex' : '・noindex がない'));
  const plates = (ig.text.match(/<li id="p\d+"/g) || []).length;
  (plates > 0 ? ok : ng)('/ig/ の図版 ' + plates + ' 枚がページに書き出されている');
  for (const p of ['/terms/', '/privacy/', '/tokushoho/', '/contact/', '/pricing/', '/about/', '/wanted/']) {
    const r = await head(SITE + p);
    (r.status === 200 ? ok : ng)(p + ' — ' + r.status);
  }

  console.log('\nsitemap');
  const sm = await fetch(SITE + '/sitemap.xml').then(r => r.text());
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&'));
  (locs.some(l => /\/ig\/?$/.test(l)) ? ng : ok)('/ig/ は sitemap に入っていない');
  console.log('  ' + locs.length + ' URL');
  if (QUICK) console.log('  （--quick: 各 URL の確認は省略）');
  else {
    let bad = 0;
    for (const loc of locs) {
      const r = await head(loc);
      if (r.status !== 200) { bad++; ng(loc + ' → ' + r.status + (r.location ? ' → ' + r.location : '')); continue; }
      const canon = metaOf(r.text, /<link rel="canonical"[^>]*href="([^"]+)"/);
      if (canon && decodeURIComponent(canon) !== decodeURIComponent(loc)) { bad++; ng(loc + ' — canonical が ' + canon); }
    }
    if (!bad) ok('全 URL が 200 で、canonical は自分自身');
  }

  console.log('\n道具の目録（10/24 の公開条件）');
  const tools = await getJSON('/rest/v1/affiliates?select=id,slug,genre,product_name,maker,model,price_band,summary,body,rakuten,yahoo,amazon,is_published&is_published=eq.true');
  const genres = new Set(tools.filter(t => t.genre && t.slug).map(t => t.genre));
  const passing = tools.filter(t => ToolGate.gate(t).pass).length;
  console.log('  公開 ' + tools.length + ' 点・' + genres.size + ' ジャンル・検索に載る条件を満たすもの ' + passing + ' 点');
  (ToolGate.catalogueOpen(tools, '2026-10-24T00:00:00Z') ? ok : warn)('10/24 に目録を開く条件（12 点・6 ジャンル）' + (ToolGate.catalogueOpen(tools, '2026-10-24T00:00:00Z') ? 'を満たす' : 'を満たさない'));
  if (!passing) warn('使用記録（80 字）のある道具が 0 点: 目録は開いても各商品は noindex のまま');
  console.log('  ※ 公開の判定は UTC の日付で、10/24 は日本時間 9:00 から');

  console.log('\n結果: NG ' + failures + ' 件・注意 ' + warnings + ' 件');
  process.exit(failures ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(2); });
