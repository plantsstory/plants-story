// The archive's state in one line (latest change to entries and photos). The deploy workflow compares it with the
// one the live site was built from and skips a scheduled rebuild when nothing changed (board 9, T116: share cards
// for new entries within 30 minutes instead of the next 03:00).
// Usage: node scripts/build-stamp.js            → prints the current stamp
//        node scripts/build-stamp.js --write    → also writes wireframe/data/build-stamp.txt
const fs = require('fs');
const path = require('path');
const SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';
async function latest(table, col) {
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?select=' + col + '&order=' + col + '.desc.nullslast&limit=1', {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
  });
  if (!r.ok) throw new Error(table + ' ' + r.status);
  const j = await r.json();
  return (j[0] && j[0][col]) || '';
}
(async () => {
  const [c, i, n] = await Promise.all([
    latest('cultivars', 'updated_at'),
    latest('cultivar_images', 'created_at'),
    fetch(SUPABASE_URL + '/rest/v1/cultivars?select=id', { method: 'HEAD', headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, Prefer: 'count=exact' } })
      .then(r => (r.headers.get('content-range') || '').split('/')[1] || ''),
  ]);
  const stamp = [c, i, n].join('|');
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(__dirname, '..', 'wireframe', 'data', 'build-stamp.txt'), stamp + '\n');
  process.stdout.write(stamp);
})().catch(e => { console.error(e.message); process.exit(1); });
