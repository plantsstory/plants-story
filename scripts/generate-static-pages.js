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
  html = html.replace(/(<link rel="alternate" hreflang="en" id="hreflang-en" href=")[^"]*(">)/, '$1' + escAttr(meta.url) + '$2');
  html = html.replace(/(<link rel="alternate" hreflang="x-default" id="hreflang-default" href=")[^"]*(">)/, '$1' + escAttr(meta.url) + '$2');
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
  const allCultivars = await fetchJSON('/rest/v1/cultivars?select=cultivar_name,genus,type,origins,updated_at&order=genus,cultivar_name');
  const cultivars = allCultivars.filter(c => visibleGenusNames.has(c.genus || 'Anthurium'));
  const images = await fetchJSON('/rest/v1/cultivar_images?select=cultivar_name,storage_path&order=display_order');

  const imageMap = {};
  for (const img of images) {
    if (!imageMap[img.cultivar_name]) imageMap[img.cultivar_name] = img.storage_path;
  }

  const publicCultivars = cultivars.filter(c =>
    c.type !== 'seedling' && !String(c.cultivar_name).includes('[Seedling]'));

  const countByGenus = {};
  for (const c of publicCultivars) {
    const g = c.genus || 'Anthurium';
    countByGenus[g] = (countByGenus[g] || 0) + 1;
  }

  let written = 0, skipped = 0;

  // ---- Static SPA routes (previously HTTP 404 despite being in the sitemap) ----
  const staticRoutes = [
    { dir: 'about', title: 'Aroid Originsについて | Aroid Origins', description: 'アロイド品種の由来・交配情報を学術データベースとコミュニティで検証するサイト「Aroid Origins」の概要・料金・運営情報。' },
    { dir: 'guide', title: '使い方ガイド | Aroid Origins', description: '品種の検索・由来の閲覧・投稿・画像アップロードなど、Aroid Originsの使い方を解説します。' },
    { dir: 'terms', title: '利用規約 | Aroid Origins', description: 'Aroid Originsの利用規約。投稿コンテンツの取り扱い、サブスクリプション、禁止行為について定めています。' },
    { dir: 'privacy', title: 'プライバシーポリシー | Aroid Origins', description: 'Aroid Originsの個人情報・Cookie・決済情報の取り扱いについて説明します。' },
    { dir: 'contact', title: 'お問い合わせ | Aroid Origins', description: 'Aroid Originsへのお問い合わせ・不具合報告・コンテンツ削除要請の窓口です。' },
  ];
  for (const r of staticRoutes) {
    const url = SITE + '/' + r.dir + '/';
    const html = buildStub(template, {
      title: r.title,
      description: r.description,
      url: url,
      ogType: 'website',
    });
    const dir = path.join(WIREFRAME, r.dir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    written++;
  }

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
      title: g.name + 'の品種一覧（' + count + '品種）| Aroid Origins',
      description: g.name + 'の品種' + count + '件の由来・歴史情報。原種・Hybrid・Cloneの来歴を学術データベースとコミュニティで検証しています。',
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

  // ---- Cultivar pages ----
  for (const c of publicCultivars) {
    const genus = c.genus || 'Anthurium';
    const slug = genus.toLowerCase();
    const rest = String(c.cultivar_name).startsWith(genus + ' ')
      ? String(c.cultivar_name).slice(genus.length + 1)
      : String(c.cultivar_name);
    const restDir = safeDirName(rest);
    if (!restDir || !safeDirName(slug)) { skipped++; continue; }

    const url = SITE + '/' + slug + '/' + encodeURIComponent(rest) + '/';
    const desc = originDescription(c.origins) ||
      (c.cultivar_name + ' の由来・来歴・交配情報。学術データベースとコミュニティ投票で信頼度を検証しています。');
    // Storage paths may contain spaces/quotes — encode each path segment for a valid og:image URL
    const img = imageMap[c.cultivar_name]
      ? SUPABASE_URL + '/storage/v1/object/public/gallery-images/' +
        String(imageMap[c.cultivar_name]).split('/').map(encodeURIComponent).join('/')
      : null;

    const html = buildStub(template, {
      title: c.cultivar_name + 'の由来・歴史 | Aroid Origins',
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
          { '@type': 'ListItem', 'position': 3, 'name': c.cultivar_name, 'item': url }
        ]
      }, {
        '@context': 'https://schema.org',
        '@type': 'ItemPage',
        'name': c.cultivar_name + 'の由来・歴史',
        'url': url,
        'inLanguage': 'ja',
        'dateModified': c.updated_at || undefined,
        'about': {
          '@type': 'Thing',
          'name': c.cultivar_name,
          'description': desc,
          'image': img || undefined
        }
      }]
    });

    const dir = path.join(WIREFRAME, slug, restDir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    written++;
  }

  console.log('Generated ' + written + ' static stub pages (' + skipped + ' skipped)');
}

main().catch(err => { console.error(err); process.exit(1); });
