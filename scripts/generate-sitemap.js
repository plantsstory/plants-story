// Generate sitemap.xml from Supabase cultivars data
// Usage: node scripts/generate-sitemap.js
const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';

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
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  // Fetch genera
  const genera = await fetchJSON('/rest/v1/genera?select=slug,name&order=display_order');
  // Fetch cultivars (non-seedling only for public sitemap)
  const cultivars = await fetchJSON('/rest/v1/cultivars?select=cultivar_name,genus,updated_at&order=genus,cultivar_name');

  const SITE = 'https://plantsstory.com';
  const today = new Date().toISOString().split('T')[0];

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Static pages
  const staticPages = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/about', changefreq: 'monthly', priority: '0.5' },
    { loc: '/guide', changefreq: 'monthly', priority: '0.5' },
    { loc: '/terms', changefreq: 'monthly', priority: '0.3' },
    { loc: '/privacy', changefreq: 'monthly', priority: '0.3' },
    { loc: '/tokushoho', changefreq: 'monthly', priority: '0.3' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.3' },
  ];
  for (const p of staticPages) {
    xml += `  <url>\n    <loc>${SITE}${p.loc}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  }

  // Genus pages
  for (const g of genera) {
    xml += `  <url>\n    <loc>${SITE}/${g.slug}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  }

  // Cultivar pages
  for (const c of cultivars) {
    // Skip seedlings (they're behind paywall)
    if (c.cultivar_name.includes('[Seedling]')) continue;

    const genus = c.genus || 'Anthurium';
    const genusSlug = genus.toLowerCase();
    const rest = c.cultivar_name.replace(genus + ' ', '');
    const encodedRest = encodeURIComponent(rest);
    const lastmod = c.updated_at ? new Date(c.updated_at).toISOString().split('T')[0] : today;

    xml += `  <url>\n    <loc>${SITE}/${genusSlug}/${encodedRest}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  xml += '</urlset>\n';

  const outPath = path.join(__dirname, '..', 'wireframe', 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  const urlCount = (xml.match(/<url>/g) || []).length;
  console.log(`Generated sitemap.xml with ${urlCount} URLs`);
}

main().catch(err => { console.error(err); process.exit(1); });
