// Generate static SEO stub pages for genus / cultivar URLs.
//
// GitHub Pages serves SPA deep links via 404.html (HTTP 404), which search
// engines refuse to index. This script writes a real index.html for every
// genus and cultivar URL so crawlers get HTTP 200 + correct meta/OGP/JSON-LD.
// Each stub is a copy of wireframe/index.html with page-specific meta tags;
// the SPA's dynamic <base href="/"> makes all relative assets resolve from
// the site root, and handleInitialRoute() renders the right page on load.
//
// Intended to run in CI (Linux) right before upload — generated directories
// are NOT committed. Usage: node scripts/generate-static-pages.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const people = require('./lib/people');
const geo = require('./lib/geo');
const RecordGate = require('../wireframe/js/record-gate');
const ToolGate = require('../wireframe/js/tool-gate');
const EntryMeta = require('../wireframe/js/entry-meta');
const AUTHORITY = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'wireframe', 'data', 'people-authority.json'), 'utf8')); } catch (e) { return {}; } })();
const { ogSlug } = require('./lib/og-slug');

const SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';
const SITE = 'https://plantsstory.com';
const WIREFRAME = path.join(__dirname, '..', 'wireframe');

function fetchJSON(urlPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, SUPABASE_URL);
    const options = {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      }
    };
    https.get(url.toString(), options, (res) => {
      // Without utf8 encoding, multi-byte chars split across chunks become U+FFFD
      res.setEncoding('utf8');
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

// plain first screen of a cultivar page (removed by the SPA once it renders)
const TYPE_JP = { species: '原種', hybrid: 'Hybrid', clone: 'Clone', seedling: '実生' };
function sciHtml(name) {
  return String(name).split(/('[^']*'|"[^"]*")/).map(part => {
    if (/^['"]/.test(part)) return escAttr(part);
    return part.split(/(\s+)/).map(w => (/^[A-Za-z][A-Za-z.-]*$/.test(w) && !/^(sp|aff|cf|var|subsp)\.$/.test(w)) ? '<i>' + escAttr(w) + '</i>' : escAttr(w)).join('');
  }).join('').replace(/<\/i>(\s+)<i>/g, '$1');
}
// scientific names inside prose, as italicizeSciNames does on the site (app-core.js)
function sciText(text) {
  const G = 'Anthurium|Monstera|Philodendron|Platycerium|Alocasia|Syngonium|Rhaphidophora|Amydrium|Epipremnum';
  return escAttr(text)
    .replace(new RegExp('\\b(' + G + ')\\s+(?!(?:sp|aff|cf|var|subsp|ssp|x)\\b)([a-z][a-z-]{2,})\\b', 'g'), '<i>$1 $2</i>')
    .replace(new RegExp('\\b(' + G + ')(?=\\s+(?:sp|aff|cf)\\.)', 'g'), '<i>$1</i>');
}
function namesTitle(t) { return sciText(t).replace(/(^|[\s・（(])([a-z][a-z-]{3,})(?=[\s・）)]|$)/g, '$1<i>$2</i>'); }
function staticEntryHtml(c, ctx) {
  // laid out like the plant page (same classes), so the page does not move when the app takes over (BOARD 10-07b T98)
  const os = (c.origins || []).filter(o => o && !o._type).sort((a, b) => (parseInt(b.trust, 10) || 0) - (parseInt(a.trust, 10) || 0));
  const o = os[0] || {}, s = o.structured || {};
  const type = c.type || s.origin_type || 'species';
  const genus = c.genus || 'Anthurium';
  const q = String(c.species_qualifier || '').toLowerCase().replace(/\./g, '');
  const undescribed = type === 'species' && (q === 'sp' || q === 'aff' || q === 'cf' || (s.species_status && s.species_status !== 'described'));
  const individual = (c.tags || []).indexOf('individual') !== -1;
  const kind = individual ? '個体' : undescribed ? '未記載' : (TYPE_JP[type] || '');
  const name = EntryMeta.name(c);
  const yearOf = v => (String(v || '').match(/\b(1[6-9]\d{2}|20\d{2})\b/) || [''])[0];
  const absent = s.absent || {};
  const none = '<span class="absent absent--none">記録なし</span>';
  const cell = (k, v) => v ? '<div class="specimen__cell"><span class="specimen__k">' + escAttr(k) + '</span><span class="specimen__v">' + v + '</span></div>' : '';
  const places = v => { const cs = geo.countriesOf(v); return cs.length && cs.length === String(v).split(/\s*,\s*/).length ? cs.map(geo.countryJa).join('、') : escAttr(v || ''); };
  let cells = '';
  if (type === 'species' && !undescribed && !individual) {
    cells += cell('記載者', escAttr(s.author_name || '') || none);
    cells += cell('発表年', yearOf(s.publication_year || o.discovery_year) ? '<span class="year">' + yearOf(s.publication_year || o.discovery_year) + '</span>' : none);
    const tl = s.type_locality, kh = s.known_habitats || o.native_region;
    if (tl && kh && tl === kh) cells += cell('タイプ産地・分布', places(tl));
    else {
      cells += cell('タイプ産地', tl ? escAttr(geo.countryJa(tl)) : (absent.type_locality === 'sine_loc' ? '<span class="absent">原記載に記載なし（sine loc.）</span>' : none));
      cells += cell('分布', kh ? places(kh) : none);
    }
  } else if (undescribed) {
    cells += cell('名前の状態', '未記載種');
    cells += cell('報告されている産地', places(s.origin_region || s.known_habitats || ''));
    cells += cell('近縁とされる種', escAttr(s.closest_species || ''));
  } else {
    const who = s.breeder || s.namer || o.discoverer_or_breeder || '';
    cells += cell(type === 'clone' && !s.breeder && !o.discoverer_or_breeder && s.namer ? '命名者' : '作出者', escAttr(who) || (type === 'seedling' || individual ? '' : (absent.breeder === 'not_applicable' ? '<span class="absent">該当なし（流通ラベル）</span>' : none)));
    cells += cell(type === 'seedling' ? '播種日' : '命名年', escAttr(type === 'seedling' ? String(s.sowing_date || '').replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, '$1.$2.$3') : yearOf(s.naming_year || o.discovery_year)));
    if (c.parent_a_text || c.parent_b_text) cells += cell('交配式', sciHtml((c.parent_a_text || '不明') + ' × ' + (c.parent_b_text || '不明')));
  }
  if (type !== 'seedling') cells += '<div class="specimen__cell specimen__cell--wide specimen__cell--verify"><span class="specimen__k">検証</span><span class="specimen__v">' + (c.verified_at ? '<span class="verified-mark">✓</span> 検証済 <span class="num">' + new Date(c.verified_at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }).replace(/-/g, '.') + '</span>' : '未検証') + '</span></div>';
  const aliases = (c.aliases || []).filter(a => /[A-Za-z]/.test(a) && !/[゠-ヿ]/.test(a)).slice(0, 3);
  const rest = name.startsWith(genus + ' ') ? name.slice(genus.length + 1) : name;
  let text = String(o.body || s.notes || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (text.length > 260) text = text.slice(0, 259) + '…';
  let h = '<article id="static-entry" class="container static-entry">';
  h += '<nav class="breadcrumb" aria-label="パンくずリスト"><a href="' + SITE + '/">トップ</a><span class="breadcrumb__sep">/</span><a href="' + SITE + '/' + genus.toLowerCase() + '/">' + escAttr(genus) + '</a><span class="breadcrumb__sep">/</span><span>' + escAttr(rest) + '</span></nav>';
  h += '<p class="detail-standard">' + escAttr(kind) + '</p>';
  h += '<h1 class="detail-title">' + sciHtml(name) + '</h1>';
  if (aliases.length) h += '<p class="detail-aliases">別名・旧綴り: ' + escAttr(aliases.join(' / ')) + '</p>';
  if (cells) h += '<div class="specimen">' + cells + '</div>';
  h += '<div class="static-entry__actions" aria-hidden="true"></div>';
  if (ctx.photo) h += '<figure class="static-entry__plate"><img src="' + escAttr(ctx.photo) + '" alt="' + escAttr(c.cultivar_name) + '" width="720" decoding="async" fetchpriority="high"></figure>';
  if (text) h += '<h2 class="section-title">由来の記録</h2><div class="record__body"><p>' + sciText(text) + '</p></div>';
  // links a crawler can follow from every entry (BOARD 10-07b T84): people, place, neighbours, the genus list
  const lk = (x, sci) => '<a href="' + escAttr(x.url) + '">' + (sci ? sciHtml(x.name) : escAttr(x.name)) + '</a>';
  const lines = [];
  if (ctx.people && ctx.people.length) lines.push((type === 'species' ? '記載者・採集者: ' : '人物: ') + ctx.people.map(x => lk(x)).join('、'));
  if (ctx.place) lines.push('産地: ' + lk(ctx.place));
  if (ctx.parents && ctx.parents.length) lines.push('交配親: ' + ctx.parents.map(x => lk(x, true)).join(' × '));
  if (ctx.selectedFrom) lines.push('選抜元: ' + lk(ctx.selectedFrom, true));
  if (ctx.children && ctx.children.length) lines.push('この' + (type === 'species' ? '種' : '品種') + 'を親にした記録: ' + ctx.children.map(x => lk(x, true)).join('、'));
  if (ctx.selections && ctx.selections.length) lines.push('選抜された個体: ' + ctx.selections.map(x => lk(x, true)).join('、'));
  if (ctx.namesPage) lines.push('取り違えやすい名前: <a href="' + escAttr(ctx.namesPage.url) + '">' + namesTitle(ctx.namesPage.name) + '</a>');
  if (ctx.prev || ctx.next) lines.push([ctx.prev ? '← ' + lk(ctx.prev, true) : '', ctx.next ? lk(ctx.next, true) + ' →' : ''].filter(Boolean).join(' · '));
  if (ctx.genusList) lines.push(lk(ctx.genusList) + ' →');
  if (lines.length) h += '<nav class="static-entry__links" aria-label="関連">' + lines.map(x => '<p>' + x + '</p>').join('') + '</nav>';
  return h + '</article>';
}

function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function jsonLd(obj) {
  // </script> injection-safe JSON-LD
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

// Build a plain-text description from the origins JSON (highest-trust first)
function originDescription(origins) {
  if (!Array.isArray(origins)) return '';
  const sorted = origins
    .filter(o => o && !o._type)
    .sort((a, b) => (parseInt(b.trust, 10) || 0) - (parseInt(a.trust, 10) || 0));
  for (const o of sorted) {
    let text = '';
    if (typeof o.body === 'string' && o.body.trim()) text = o.body;
    else if (o.structured && typeof o.structured.notes === 'string') text = o.structured.notes;
    text = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (text.length > 20) {
      return text.length > 150 ? text.slice(0, 147) + '...' : text;
    }
  }
  return '';
}

// Apply page-specific meta to the index.html template
function buildStub(template, meta) {
  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, '<title>' + escAttr(meta.title) + '</title>');
  if (meta.noindex) html = html.replace('</head>', '<meta name="robots" content="noindex, follow">\n</head>');
  html = html.replace(/(<meta name="description" content=")[^"]*(">)/, '$1' + escAttr(meta.description) + '$2');
  html = html.replace(/(<meta property="og:title" content=")[^"]*(">)/, '$1' + escAttr(meta.title) + '$2');
  html = html.replace(/(<meta property="og:description" content=")[^"]*(">)/, '$1' + escAttr(meta.description) + '$2');
  html = html.replace(/(<meta property="og:type" content=")[^"]*(">)/, '$1' + (meta.ogType || 'website') + '$2');
  html = html.replace(/(<meta name="twitter:title" content=")[^"]*(">)/, '$1' + escAttr(meta.title) + '$2');
  html = html.replace(/(<meta name="twitter:description" content=")[^"]*(">)/, '$1' + escAttr(meta.description) + '$2');
  if (meta.image) {
    html = html.replace(/(<meta property="og:image" content=")[^"]*(">)/, '$1' + escAttr(meta.image) + '$2');
    html = html.replace(/(<meta name="twitter:image" content=")[^"]*(">)/, '$1' + escAttr(meta.image) + '$2');
  }
  // og:url (not present in the template) — insert after og:site_name
  html = html.replace(/(<meta property="og:site_name"[^>]*>)/, '$1\n  <meta property="og:url" content="' + escAttr(meta.url) + '">');
  // canonical + hreflang all point at this page
  html = html.replace(/(<link rel="canonical" id="canonical-link" href=")[^"]*(">)/, '$1' + escAttr(meta.url) + '$2');
  html = html.replace(/(<link rel="alternate" hreflang="ja" id="hreflang-ja" href=")[^"]*(">)/, '$1' + escAttr(meta.url) + '$2');
  // Page-specific JSON-LD before </head>
  if (meta.jsonLd && meta.jsonLd.length) {
    const blocks = meta.jsonLd.map(o => '  <script type="application/ld+json">\n  ' + jsonLd(o) + '\n  </script>').join('\n');
    html = html.replace('</head>', blocks + '\n</head>');
  }
  return html;
}

// File-system safety: allow only names GitHub Pages can serve as directories
function safeDirName(name) {
  if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) return null;
  return name;
}

async function main() {
  const template = fs.readFileSync(path.join(WIREFRAME, 'index.html'), 'utf8');

  let genera = await fetchJSON('/rest/v1/genera?select=slug,name&is_visible=eq.true&order=display_order');
  if (!Array.isArray(genera)) {
    // is_visible column may not exist yet — retry unfiltered
    genera = await fetchJSON('/rest/v1/genera?select=slug,name&order=display_order');
  }
  const visibleGenusNames = new Set(genera.map(g => g.name));
  const allCultivars = await fetchJSON('/rest/v1/cultivars?select=id,cultivar_name,genus,type,origins,aliases,updated_at,verified_at,parent_a_id,parent_b_id,parent_a_text,parent_b_text,formula_status,species_qualifier,selected_from_id,tags,locality,ai_status&is_private=eq.false&order=genus,cultivar_name');
  const cultivars = allCultivars.filter(c => visibleGenusNames.has(c.genus || 'Anthurium'));
  const images = await fetchJSON('/rest/v1/cultivar_images?select=cultivar_name,storage_path&order=display_order');
  const firstByDate = {};
  for (const img of await fetchJSON('/rest/v1/cultivar_images?select=cultivar_name,storage_path&order=created_at')) {
    if (!firstByDate[img.cultivar_name] && !/^pv:/.test(img.storage_path || '')) firstByDate[img.cultivar_name] = img.storage_path;
  }

  const imageMap = {};
  for (const img of images) {
    if (!imageMap[img.cultivar_name]) imageMap[img.cultivar_name] = img.storage_path;
  }

  const publicCultivars = cultivars.filter(c =>
    c.type !== 'seedling' && !String(c.cultivar_name).includes('[Seedling]'));

  // Generated directories only: clear them so renamed or removed entries leave no stale stub behind
  for (const g of genera) { if (safeDirName(g.slug)) fs.rmSync(path.join(WIREFRAME, g.slug), { recursive: true, force: true }); }
  for (const d of ['people', 'locality', 'tools']) fs.rmSync(path.join(WIREFRAME, d), { recursive: true, force: true });

  const countByGenus = {};
  for (const c of publicCultivars) {
    if ((c.tags || []).includes('individual') || RecordGate.state(c) !== 'ok') continue; // recorded entries only
    const g = c.genus || 'Anthurium';
    countByGenus[g] = (countByGenus[g] || 0) + 1;
  }

  let written = 0, skipped = 0;

  // ---- Static SPA routes (previously HTTP 404 despite being in the sitemap) ----
  const staticRoutes = [
    { dir: 'about', title: 'この図鑑について | Aroid Origins', description: '誰が、いつ、どこで名付けたか — アロイドの由来を出典つきで記録する図鑑「Aroid Origins」の記録の方針・料金・運営情報。' },
    { dir: 'wanted', title: '写真を募集中 — 写真のないアンスリウム | Aroid Origins', description: '由来は記録されているのに、写真がまだない品種の一覧です。自分で撮った写真を 1 枚から載せられます。' },
    // 読みもの (board 12): noindex until the owner's OK
    { dir: 'reading', noindex: true, title: '読みもの — アンスリウムの分類・交配・現地の記事 | Aroid Origins', description: '分類・交配・現地・栽培について、経験のある人が書いた記事の索引。紹介文は編集部、本文は各サイトで。' },
    { dir: 'ig', noindex: true, title: 'Instagram の図版 | Aroid Origins', description: 'Instagram の投稿の「図版」の番号から、その植物の由来のページへ。' },
    { dir: 'guide', title: '使い方ガイド | Aroid Origins', description: '品種の検索・由来の閲覧・投稿・画像アップロードなど、Aroid Originsの使い方を解説します。' },
    { dir: 'terms', title: '利用規約 | Aroid Origins', description: 'Aroid Originsの利用規約。投稿コンテンツの取り扱い、会員（受付準備中）、道具の目録とアフィリエイト、禁止行為について定めています。' },
    { dir: 'privacy', title: 'プライバシーポリシー | Aroid Origins', description: 'Aroid Originsの個人情報・Cookie・アクセス解析（GA4）・外部送信（アフィリエイト、楽天ウェブサービス）・決済情報の取り扱いについて説明します。' },
    { dir: 'contact', title: 'お問い合わせ | Aroid Origins', description: 'Aroid Originsへのお問い合わせ・不具合報告・コンテンツ削除要請の窓口です。' },
    { dir: 'tokushoho', title: '特定商取引法に基づく表記 | Aroid Origins', description: 'Aroid Origins（運営者: 久恒 佑太）の特定商取引法に基づく表記。会員の受付は準備中で、現在販売はありません。受付開始後の販売価格・支払方法・契約期間・解約の条件。' },
    { dir: 'pricing', title: '料金とサービス内容 | Aroid Origins', description: 'Aroid Origins の料金とサービス内容。閲覧は無料、実生の投稿は会員の受付まで20件まで無料。会員（月額500円・年額5,000円、受付準備中）は実生の投稿無制限とAI再調査の優先審査。' },
    { dir: 'glossary', title: '由来の用語集 — sp. / aff. / cf.、記載者、タイプ産地、交配式、クローン | Aroid Origins', description: 'アロイド品種の由来を読むための用語集。学名と記載、sp./aff./cf.、タイプ産地、交配式、F1、オリジナル個体、クローン、TC、流通名、信頼度 Tier の意味を解説します。' },
  ];
  // /ig/ in plain HTML (T157): the same plates as the app draws — recorded entries, photos first, newest first,
  // 「図版 n」 = the entry id
  const igStatic = html => {
    const plates = publicCultivars.filter(c => !(c.tags || []).includes('individual') && RecordGate.state(c) === 'ok' && c.id)
      .map(c => ({ c, p: firstByDate[c.cultivar_name] || '' }))
      .sort((a, b) => (!!b.p - !!a.p) || (b.c.id - a.c.id));
    const li = plates.map(({ c, p }) => {
      const g = c.genus || 'Anthurium';
      const rest = String(c.cultivar_name).startsWith(g + ' ') ? String(c.cultivar_name).slice(g.length + 1) : String(c.cultivar_name);
      const href = SITE + '/' + g.toLowerCase() + '/' + encodeURIComponent(rest) + '/';
      const src = p ? SUPABASE_URL + '/storage/v1/render/image/public/gallery-images/' + p.split('/').map(encodeURIComponent).join('/') + '?width=360&height=720&resize=contain&quality=72' : '';
      return '<li id="p' + c.id + '"><a href="' + escAttr(href) + '"><span class="ig-grid__img">' + (src ? '<img src="' + escAttr(src) + '" alt="' + escAttr(EntryMeta.name(c)) + '" loading="lazy" decoding="async">' : '<span class="ig-grid__name">' + sciHtml(EntryMeta.name(c)) + '</span>') + '</span><span class="ig-grid__no num">図版 ' + c.id + '</span></a></li>';
    }).join('');
    const art = '<article id="static-entry" class="container container--narrow static-entry"><nav class="breadcrumb" aria-label="パンくずリスト"><a href="' + SITE + '/">トップ</a><span class="breadcrumb__sep">/</span><span>Instagram の図版</span></nav>'
      + '<h1 class="section-title">Instagram の図版</h1><p class="people__intro">投稿の「図版」の番号から、その植物の由来のページへ。番号は変わりません。</p><ol class="ig-grid">' + li + '</ol></article>';
    return html.replace('<img src="images/anthurium.png"', '<img loading="lazy" src="images/anthurium.png"').replace(/(<main[^>]*>)/, '$1\n' + art).replace(/<body([^>]*)>/, (m, at) => /class="/.test(at) ? m.replace('class="', 'class="stub-entry-page ') : '<body' + at + ' class="stub-entry-page">');
  };
  for (const r of staticRoutes) {
    const url = SITE + '/' + r.dir + '/';
    const html = buildStub(template, {
      title: r.title,
      description: r.description,
      url: url,
      ogType: 'website',
      noindex: !!r.noindex,
    });
    const dir = path.join(WIREFRAME, r.dir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), r.dir === 'ig' ? igStatic(html) : html, 'utf8');
    written++;
  }

  // recorded entries per genus in the genus-list order (kind, then the name without quotes and sp./aff./cf.)
  const KIND_RANK = { species: 0, hybrid: 1, clone: 2 };
  const listKey = n => String(n).replace(/^\S+\s+/, '').replace(/['"‘’“”]/g, '').replace(/^(sp|aff|cf)\.\s*/i, '').toLowerCase();
  const entryOrder = {};
  for (const c of publicCultivars) {
    if ((c.tags || []).includes('individual') || RecordGate.state(c) !== 'ok') continue;
    (entryOrder[c.genus || 'Anthurium'] = entryOrder[c.genus || 'Anthurium'] || []).push(c);
  }
  for (const k of Object.keys(entryOrder)) entryOrder[k].sort((a, b) => ((KIND_RANK[a.type] || 0) - (KIND_RANK[b.type] || 0)) || listKey(a.cultivar_name).localeCompare(listKey(b.cultivar_name)));

  // ---- Genus pages ----
  for (const g of genera) {
    const slug = safeDirName(g.slug);
    if (!slug) { skipped++; continue; }
    const count = countByGenus[g.name] || 0;
    // Trailing slash: GitHub Pages 301s /slug -> /slug/, so canonical points at the final URL
    const url = SITE + '/' + slug + '/';
    // Crawlable link list to every cultivar page (the SPA removes #static-seo-links on boot)
    const genusLinks = publicCultivars
      .filter(c => (c.genus || 'Anthurium') === g.name)
      .map(c => {
        const rest = String(c.cultivar_name).startsWith(g.name + ' ')
          ? String(c.cultivar_name).slice(g.name.length + 1)
          : String(c.cultivar_name);
        return '<li><a href="' + SITE + '/' + slug + '/' + encodeURIComponent(rest) + '/">' + escAttr(c.cultivar_name) + '</a></li>';
      }).join('');
    const html = buildStub(template, {
      title: (g.name === 'Anthurium' ? 'アンスリウム' : g.name) + 'の原種・品種一覧（' + count + '品種）— 記載者・発表年・原産国 | Aroid Origins',
      description: g.name + 'の収録 ' + count + ' 件。誰が、いつ、どこで名付けたか — 原種・Hybrid・Clone の由来を出典つきで記録する図鑑。',
      url: url,
      ogType: 'website',
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Aroid Origins', 'item': SITE + '/' },
          { '@type': 'ListItem', 'position': 2, 'name': g.name, 'item': url }
        ]
      }]
    });
    // Inject the crawlable cultivar link list right after <main> opens
    const htmlWithLinks = genusLinks
      ? html.replace(/(<main[^>]*>)/, '$1\n<nav id="static-seo-links" aria-label="' + escAttr(g.name) + ' cultivars"><ul>' + genusLinks + '</ul></nav>')
      : html;
    const dir = path.join(WIREFRAME, slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), htmlWithLinks, 'utf8');
    written++;
  }

  // parents ⇄ children and selections, by id or by the exact registered name only (never a partial match)
  const NAMES_PAGES = JSON.parse(fs.readFileSync(path.join(WIREFRAME, 'data', 'names.json'), 'utf8')).pages || [];
  const linkable = new Map();   // id → row, only entries with a page worth following (recorded)
  for (const c of publicCultivars) if (RecordGate.state(c) === 'ok') linkable.set(c.id, c);
  const byExactName = new Map(); for (const c of linkable.values()) byExactName.set(c.cultivar_name, c);
  const parentOf = (id, text) => (id && linkable.get(id)) || (text && byExactName.get(String(text).trim())) || null;
  const relUrl = x => {
    const g2 = x.genus || 'Anthurium';
    const r2 = String(x.cultivar_name).startsWith(g2 + ' ') ? String(x.cultivar_name).slice(g2.length + 1) : String(x.cultivar_name);
    return SITE + '/' + g2.toLowerCase() + '/' + encodeURIComponent(r2) + '/';
  };
  const childrenOf = new Map(), selectionsOf = new Map();
  for (const k of linkable.values()) {
    for (const p of [parentOf(k.parent_a_id, k.parent_a_text), parentOf(k.parent_b_id, k.parent_b_text)]) {
      if (p && p.id !== k.id) { const arr = childrenOf.get(p.id) || []; if (!arr.includes(k)) arr.push(k); childrenOf.set(p.id, arr); }
    }
    const sf = k.selected_from_id && linkable.get(k.selected_from_id);
    if (sf) { const arr = selectionsOf.get(sf.id) || []; arr.push(k); selectionsOf.set(sf.id, arr); }
  }

  // ---- Cultivar pages ----
  // entry stubs: named entries and the public seedlings (a shared seedling page shows a card, BOARD 10-07b T85)
  const seedlingRows = cultivars.filter(c => c.type === 'seedling' || String(c.cultivar_name).includes('[Seedling]'));
  for (const c of publicCultivars.concat(seedlingRows)) {
    const genus = c.genus || 'Anthurium';
    const slug = genus.toLowerCase();
    const shown = String(c.cultivar_name).replace(' [Seedling]', '');
    const rest = shown.startsWith(genus + ' ') ? shown.slice(genus.length + 1) : shown;
    const restDir = safeDirName(rest);
    if (!restDir || !safeDirName(slug)) { skipped++; continue; }

    const url = SITE + '/' + slug + '/' + encodeURIComponent(rest) + '/';
    const desc = RecordGate.state(c) !== 'ok'
      ? c.cultivar_name + ' — 記録なし · 出典募集中 | Aroid Origins'
      : EntryMeta.description(c);
    // Share card rendered by scripts/make-og-cards.js (every public cultivar has one); raw photos are never the og:image
    const img = SITE + '/images/og/' + ogSlug(genus, c.cultivar_name) + '.png';

    const html = buildStub(template, {
      noindex: RecordGate.state(c) !== 'ok',
      title: EntryMeta.title(c),
      description: desc,
      url: url,
      ogType: 'article',
      image: img,
      jsonLd: [{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Aroid Origins', 'item': SITE + '/' },
          { '@type': 'ListItem', 'position': 2, 'name': genus, 'item': SITE + '/' + slug + '/' },
          { '@type': 'ListItem', 'position': 3, 'name': EntryMeta.name(c), 'item': url }
        ]
      }, {
        '@context': 'https://schema.org',
        '@type': 'ItemPage',
        'name': EntryMeta.title(c).replace(/ · Aroid Origins$/, ''),
        'url': url,
        'inLanguage': 'ja',
        'dateModified': c.updated_at || undefined,
        'about': {
          '@type': 'Thing',
          'name': c.cultivar_name,
          'alternateName': (c.aliases && c.aliases.length) ? c.aliases : undefined,
          'description': desc,
          'image': img || undefined
        }
      }]
    });

    // first screen in plain HTML
    const photoPath = imageMap[c.cultivar_name];
    const photo = photoPath ? SUPABASE_URL + '/storage/v1/render/image/public/gallery-images/' + photoPath.split('/').map(encodeURIComponent).join('/') + '?width=720&height=1440&resize=contain&quality=72' : '';
    // people, place (same country rule as the site), neighbours in the genus-list order, the list
    const ctx = { photo, people: [], place: null, prev: null, next: null, genusList: { name: (c.genus || 'Anthurium') + ' の一覧', url: SITE + '/' + (c.genus || 'Anthurium').toLowerCase() + '/' } };
    ctx.people = people.peopleOfRow(c).slice(0, 3).map(pp => ({ name: (AUTHORITY[pp.key] && AUTHORITY[pp.key].name) || pp.key, url: SITE + '/people/' + encodeURIComponent(people.personSlug(pp.key)) + '/' }));
    {
      const st = (((c.origins || []).filter(o => o && !o._type)[0]) || {}).structured || {};
      const cc = c.type === 'species' ? (geo.countryOf(st.type_locality) || geo.countriesOf(st.known_habitats)[0] || '') : '';
      if (cc) ctx.place = { name: geo.countryJa(cc) + 'の原種', url: SITE + '/locality/' + encodeURIComponent(geo.countrySlug(cc)) + '/' };
    }
    {
      const ref = x => ({ name: EntryMeta.name(x), url: relUrl(x) });
      ctx.parents = [parentOf(c.parent_a_id, c.parent_a_text), parentOf(c.parent_b_id, c.parent_b_text)].filter(p => p && p.id !== c.id).map(ref);
      ctx.children = (childrenOf.get(c.id) || []).slice(0, 8).map(ref);
      const sf = c.selected_from_id && linkable.get(c.selected_from_id);
      ctx.selectedFrom = sf ? ref(sf) : null;
      ctx.selections = (selectionsOf.get(c.id) || []).slice(0, 8).map(ref);
      const np = NAMES_PAGES.find(pg => (pg.items || []).some(it => it.entry === c.cultivar_name));
      ctx.namesPage = np ? { name: np.title, url: SITE + '/names/' + np.slug + '/' } : null;
    }
    const order = entryOrder[c.genus || 'Anthurium'] || [];
    const at = order.indexOf(c);
    const entryUrl = x => {
      const g2 = x.genus || 'Anthurium';
      const r2 = String(x.cultivar_name).startsWith(g2 + ' ') ? String(x.cultivar_name).slice(g2.length + 1) : String(x.cultivar_name);
      return SITE + '/' + g2.toLowerCase() + '/' + encodeURIComponent(r2) + '/';
    };
    if (at > 0) ctx.prev = { name: EntryMeta.name(order[at - 1]), url: entryUrl(order[at - 1]) };
    if (at >= 0 && at < order.length - 1) ctx.next = { name: EntryMeta.name(order[at + 1]), url: entryUrl(order[at + 1]) };
    // the entry's photo is asked for first; the front page's plate (hidden here) is not fetched at all (T156)
    const htmlFast = photo
      ? html.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n  <link rel="preload" as="image" href="' + escAttr(photo) + '" fetchpriority="high">').replace('<img src="images/anthurium.png"', '<img loading="lazy" src="images/anthurium.png"')
      : html.replace('<img src="images/anthurium.png"', '<img loading="lazy" src="images/anthurium.png"');
    const htmlWithEntry = RecordGate.state(c) === 'ok' ? htmlFast.replace(/(<main[^>]*>)/, '$1\n' + staticEntryHtml(c, ctx)).replace(/<body([^>]*)>/, (m, at) => /class="/.test(at) ? m.replace('class="', 'class="stub-entry-page ') : '<body' + at + ' class="stub-entry-page">') : htmlFast;

    const dir = path.join(WIREFRAME, slug, restDir);
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), htmlWithEntry, 'utf8');
      written++;
    } catch (e) {
      // Windows refuses names with quotes; CI (Linux) writes them fine
      console.warn('skip ' + c.cultivar_name + ': ' + e.code);
      skipped++;
    }
  }

  // ---- People pages (/people/ and /people/<slug>/) ----
  const ROLE_JP = { author: '記載者', collector: '採集者', breeder: '作出者', namer: '命名者', introducer: '導入者' };
  const personList = people.peopleIndex(cultivars);
  const peopleUrl = SITE + '/people/';
  const peopleLinks = personList.map(p => '<li><a href="' + peopleUrl + encodeURIComponent(p.slug) + '/">' + escAttr(p.key) + '</a></li>').join('');
  let html = buildStub(template, {
    title: '人物索引 — 記載者・採集者・作出者 | Aroid Origins',
    description: 'アロイド品種の原種を記載・採集した植物学者と、交配種・クローンを作出・命名した人物の索引。人物ごとに関連する品種をたどれます。',
    url: peopleUrl,
    ogType: 'website',
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Aroid Origins', 'item': SITE + '/' },
      { '@type': 'ListItem', 'position': 2, 'name': '人物索引', 'item': peopleUrl } ] }]
  });
  html = html.replace(/(<main[^>]*>)/, '$1\n<nav id="static-seo-links" aria-label="people"><ul>' + peopleLinks + '</ul></nav>');
  fs.mkdirSync(path.join(WIREFRAME, 'people'), { recursive: true });
  fs.writeFileSync(path.join(WIREFRAME, 'people', 'index.html'), html, 'utf8');
  written++;
  for (const p of personList) {
    const dir = safeDirName(p.slug);
    if (!dir) { skipped++; continue; }
    const url = peopleUrl + encodeURIComponent(p.slug) + '/';
    const roles = Object.keys(ROLE_JP).filter(r => p.roles[r]).map(r => ROLE_JP[r] + ' ' + p.roles[r] + '種').join('・');
    const names = p.rows.map(r => r.cultivar_name);
    const links = p.rows.map(r => {
      const g = r.genus || 'Anthurium';
      const rest = String(r.cultivar_name).startsWith(g + ' ') ? String(r.cultivar_name).slice(g.length + 1) : String(r.cultivar_name);
      return '<li><a href="' + SITE + '/' + g.toLowerCase() + '/' + encodeURIComponent(rest) + '/">' + escAttr(r.cultivar_name) + '</a></li>';
    }).join('');
    const full = (AUTHORITY[p.key] && AUTHORITY[p.key].name) || p.key;
    let ph = buildStub(template, {
      title: full + ' — 関連する品種 ' + p.rows.length + '件 | Aroid Origins',
      description: (full !== p.key ? full + '（' + p.key + '）' : p.key) + '・' + roles + '。関連するアロイド品種: ' + names.slice(0, 6).join('、') + (names.length > 6 ? ' ほか' : '') + '。記載者・採集者・作出者から品種の由来をたどる索引。',
      url: url,
      ogType: 'profile',
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Aroid Origins', 'item': SITE + '/' },
        { '@type': 'ListItem', 'position': 2, 'name': '人物索引', 'item': peopleUrl },
        { '@type': 'ListItem', 'position': 3, 'name': p.key, 'item': url } ] },
        { '@context': 'https://schema.org', '@type': 'Person', 'name': (AUTHORITY[p.key] && AUTHORITY[p.key].name) || p.key, 'alternateName': (AUTHORITY[p.key] && AUTHORITY[p.key].name && AUTHORITY[p.key].name !== p.key) ? p.key : undefined, 'url': url, 'description': roles }]
    });
    ph = ph.replace(/(<main[^>]*>)/, '$1\n<nav id="static-seo-links" aria-label="' + escAttr(p.key) + '"><ul>' + links + '</ul></nav>');
    fs.mkdirSync(path.join(WIREFRAME, 'people', dir), { recursive: true });
    fs.writeFileSync(path.join(WIREFRAME, 'people', dir, 'index.html'), ph, 'utf8');
    written++;
  }

  // ---- Name-confusion pages (/names/ and /names/<slug>/) from wireframe/data/names.json (T99) ----
  {
    const NAMES = JSON.parse(fs.readFileSync(path.join(WIREFRAME, 'data', 'names.json'), 'utf8')).pages || [];
    fs.rmSync(path.join(WIREFRAME, 'names'), { recursive: true, force: true });
    const entryUrl = n => { const g = n.split(' ')[0]; const r = n.slice(g.length + 1); return SITE + '/' + g.toLowerCase() + '/' + encodeURIComponent(r) + '/'; };
    let ih = buildStub(template, { title: '名前の違い — 似た名前の別の植物 | Aroid Origins', description: NAMES.map(x => x.title).join('、'), url: SITE + '/names/', ogType: 'website' });
    ih = ih.replace(/(<main[^>]*>)/, '$1\n<nav id="static-seo-links" aria-label="名前の違い"><ul>' + NAMES.map(x => '<li><a href="' + SITE + '/names/' + x.slug + '/">' + namesTitle(x.title) + '</a></li>').join('') + '</ul></nav>');
    fs.mkdirSync(path.join(WIREFRAME, 'names'), { recursive: true });
    fs.writeFileSync(path.join(WIREFRAME, 'names', 'index.html'), ih, 'utf8');
    written++;
    for (const pg of NAMES) {
      const url = SITE + '/names/' + pg.slug + '/';
      let ph = buildStub(template, { title: pg.title + ' | Aroid Origins', description: (pg.lead + ' ' + pg.summary).slice(0, 120), url, ogType: 'article',
        jsonLd: [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
          { '@type': 'ListItem', 'position': 1, 'name': 'Aroid Origins', 'item': SITE + '/' },
          { '@type': 'ListItem', 'position': 2, 'name': '名前の違い', 'item': SITE + '/names/' },
          { '@type': 'ListItem', 'position': 3, 'name': pg.title, 'item': url } ] }] });
      const items = pg.items.map(it => '<li><p class="names__name">' + (it.entry ? '<a href="' + entryUrl(it.entry) + '">' + sciHtml(it.entry) + '</a>' : sciHtml(it.name)) + ' — ' + escAttr(it.kind || '') + '</p><p>' + escAttr(it.text) + '</p></li>').join('');
      ph = ph.replace(/(<main[^>]*>)/, '$1\n<article id="static-entry" class="container static-entry"><p class="detail-standard">名前の違い</p><h1 class="detail-title">' + namesTitle(pg.title) + '</h1><p class="static-entry__text">' + escAttr(pg.lead) + '</p><ol>' + items + '</ol><p class="static-entry__text">' + escAttr(pg.summary) + '</p></article>');
      fs.mkdirSync(path.join(WIREFRAME, 'names', pg.slug), { recursive: true });
      fs.writeFileSync(path.join(WIREFRAME, 'names', pg.slug, 'index.html'), ph, 'utf8');
      written++;
    }
  }

  // ---- Glossary terms (/glossary/<id>/): one page per term for 「〜とは」 searches (T100) ----
  {
    const gStart = template.indexOf('<dl class="glossary">', template.indexOf('id="page-glossary"'));
    const gEnd = template.indexOf('</section>', gStart);
    const part = gStart >= 0 ? template.slice(gStart, gEnd) : '';
    const re = /<dt id="(g-[a-z0-9-]+)">([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g;
    let m;
    while ((m = re.exec(part))) {
      const id = m[1], term = m[2].replace(/<[^>]+>/g, '').trim(), def = m[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const url = SITE + '/glossary/' + id + '/';
      let gh = buildStub(template, {
        title: term + 'とは — 由来の用語集 | Aroid Origins',
        description: def.slice(0, 120),
        url: url,
        ogType: 'article',
        jsonLd: [{ '@context': 'https://schema.org', '@type': 'DefinedTerm', 'name': term, 'description': def, 'url': url,
          'inDefinedTermSet': { '@type': 'DefinedTermSet', 'name': '由来の用語集', 'url': SITE + '/glossary/' } }]
      });
      gh = gh.replace(/(<main[^>]*>)/, '$1\n<article id="static-entry" class="container static-entry"><p class="detail-standard">由来の用語集</p><h1 class="detail-title">' + escAttr(term) + '</h1><p class="static-entry__text">' + escAttr(def) + '</p><nav class="static-entry__links"><p><a href="' + SITE + '/glossary/">用語集をすべて見る →</a></p></nav></article>');
      fs.mkdirSync(path.join(WIREFRAME, 'glossary', id), { recursive: true });
      fs.writeFileSync(path.join(WIREFRAME, 'glossary', id, 'index.html'), gh, 'utf8');
      written++;
    }
  }

  // ---- Locality pages (/locality/ and /locality/<slug>/) ----
  const localityUrl = SITE + '/locality/';
  const localities = geo.localityIndex(publicCultivars, c => RecordGate.state(c) === 'ok');
  let lh = buildStub(template, {
    title: '産地索引 — 国ごとのアンスリウム原種 | Aroid Origins',
    description: '原種をタイプ産地と分布の国ごとにまとめた索引。' + localities.map(l => l.ja + ' ' + l.rows.length + '種').join('、') + '。',
    url: localityUrl,
    ogType: 'website',
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Aroid Origins', 'item': SITE + '/' },
      { '@type': 'ListItem', 'position': 2, 'name': '産地索引', 'item': localityUrl } ] }]
  });
  lh = lh.replace(/(<main[^>]*>)/, '$1\n<nav id="static-seo-links" aria-label="localities"><ul>' + localities.map(l => '<li><a href="' + localityUrl + encodeURIComponent(l.slug) + '/">' + escAttr(l.ja) + '</a></li>').join('') + '</ul></nav>');
  fs.mkdirSync(path.join(WIREFRAME, 'locality'), { recursive: true });
  fs.writeFileSync(path.join(WIREFRAME, 'locality', 'index.html'), lh, 'utf8');
  written++;
  for (const l of localities) {
    const dir = safeDirName(l.slug);
    if (!dir) { skipped++; continue; }
    const url = localityUrl + encodeURIComponent(l.slug) + '/';
    const names = l.rows.map(r => EntryMeta.name(r));
    const linkOf = r => {
      const g = r.genus || 'Anthurium';
      const rest = String(r.cultivar_name).startsWith(g + ' ') ? String(r.cultivar_name).slice(g.length + 1) : String(r.cultivar_name);
      return '<li><a href="' + SITE + '/' + g.toLowerCase() + '/' + encodeURIComponent(rest) + '/">' + escAttr(EntryMeta.name(r)) + '</a></li>';
    };
    const links = (l.typeRows.length ? '<li>タイプ産地が' + escAttr(l.ja) + '</li>' + l.typeRows.map(linkOf).join('') : '')
      + (l.rangeRows.length ? '<li>分布に' + escAttr(l.ja) + 'を含む</li>' + l.rangeRows.map(linkOf).join('') : '');
    let ph = buildStub(template, {
      title: l.ja + 'のアンスリウム原種 ' + l.rows.length + '種（タイプ産地 ' + l.typeRows.length + ' · 分布 ' + l.rangeRows.length + '） | Aroid Origins',
      description: l.ja + 'をタイプ産地または分布にもつアンスリウムの原種: ' + names.slice(0, 6).join('、') + (names.length > 6 ? ' ほか' : '') + '。記載者・発表年・産地から由来をたどる索引。',
      url: url,
      ogType: 'website',
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Aroid Origins', 'item': SITE + '/' },
        { '@type': 'ListItem', 'position': 2, 'name': '産地索引', 'item': localityUrl },
        { '@type': 'ListItem', 'position': 3, 'name': l.ja, 'item': url } ] }]
    });
    ph = ph.replace(/(<main[^>]*>)/, '$1\n<nav id="static-seo-links" aria-label="' + escAttr(l.ja) + '"><ul>' + links + '</ul></nav>');
    fs.mkdirSync(path.join(WIREFRAME, 'locality', dir), { recursive: true });
    fs.writeFileSync(path.join(WIREFRAME, 'locality', dir, 'index.html'), ph, 'utf8');
    written++;
  }

  // ---- Tools catalogue (/tools/ and /tools/<slug>/) — noindex until the catalogue opens (BOARD 第5回) ----
  const toolRows = await fetchJSON('/rest/v1/affiliates?select=id,slug,genre,product_name,maker,model,price_band,summary,body,rakuten,yahoo,amazon,is_published&is_published=eq.true&order=sort_order');
  const toolGenres = await fetchJSON('/rest/v1/tool_genres?select=slug,label&order=sort_order');
  const tools = (Array.isArray(toolRows) ? toolRows : []).filter(t => t.slug && t.genre);
  const genreLabel = {};
  for (const g of (Array.isArray(toolGenres) ? toolGenres : [])) genreLabel[g.slug] = g.label;
  const catalogueOpen = ToolGate.catalogueOpen(tools);
  const toolsUrl = SITE + '/tools/';
  const toolLead = '自生地の条件（雲霧林・着生・標高）に近づける道具を部門別に。販売実績（レビュー数・評価）と仕様で選んでいます。育て方は書きません。';
  let th = buildStub(template, {
    title: '道具の目録 — アロイドの自生地環境に近づける道具 | Aroid Origins',
    description: toolLead,
    url: toolsUrl,
    noindex: !catalogueOpen,
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
      { '@type': 'ListItem', 'position': 1, 'name': 'Aroid Origins', 'item': SITE + '/' },
      { '@type': 'ListItem', 'position': 2, 'name': '道具の目録', 'item': toolsUrl } ] },
      { '@context': 'https://schema.org', '@type': 'ItemList', 'name': '道具の目録', 'itemListElement': tools.map((t, i) => ({ '@type': 'ListItem', 'position': i + 1, 'name': t.product_name, 'url': toolsUrl + encodeURIComponent(t.slug) + '/' })) }]
  });
  th = th.replace(/(<main[^>]*>)/, '$1\n<nav id="static-seo-links" aria-label="tools"><ul>' + tools.map(t => '<li><a href="' + toolsUrl + encodeURIComponent(t.slug) + '/">' + escAttr(t.product_name) + '</a></li>').join('') + '</ul></nav>');
  fs.mkdirSync(path.join(WIREFRAME, 'tools'), { recursive: true });
  fs.writeFileSync(path.join(WIREFRAME, 'tools', 'index.html'), th, 'utf8');
  written++;
  for (const t of tools) {
    const dir = safeDirName(t.slug);
    if (!dir) { skipped++; continue; }
    const url = toolsUrl + encodeURIComponent(t.slug) + '/';
    const g = genreLabel[t.genre] || t.genre;
    const desc = t.summary || String(t.body || '').replace(/\s+/g, ' ').slice(0, 110) || (t.product_name + '（' + g + '）。' + toolLead);
    const ph = buildStub(template, {
      title: t.product_name + ' — ' + g + ' · 道具の目録 | Aroid Origins',
      description: desc,
      url: url,
      noindex: !(catalogueOpen && ToolGate.gate(t).pass),
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        { '@type': 'ListItem', 'position': 1, 'name': 'Aroid Origins', 'item': SITE + '/' },
        { '@type': 'ListItem', 'position': 2, 'name': '道具の目録', 'item': toolsUrl },
        { '@type': 'ListItem', 'position': 3, 'name': t.product_name, 'item': url } ] }]
    });
    fs.mkdirSync(path.join(WIREFRAME, 'tools', dir), { recursive: true });
    fs.writeFileSync(path.join(WIREFRAME, 'tools', dir, 'index.html'), ph, 'utf8');
    written++;
  }
  console.log('Tools: ' + tools.length + ' stubs, catalogue ' + (catalogueOpen ? 'open' : 'closed (noindex)'));

  console.log('Generated ' + written + ' static stub pages (' + skipped + ' skipped)');
}

main().catch(err => { console.error(err); process.exit(1); });
