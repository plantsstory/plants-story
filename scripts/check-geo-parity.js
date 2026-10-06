// CI check (BOARD 10-07b T80): the static stubs (scripts/lib/geo.js) and the site (wireframe/js/archive.js) pick
// the same country for every species, so a species never sits on one country page in the stub and another in the SPA.
// Reads the public species from the API like the generators (or a JSON file given as the first argument); exits 1 on a difference.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const geo = require('./lib/geo');

const NL = String.fromCharCode(10);
const CR = String.fromCharCode(13);

function archiveCountryOf() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'wireframe', 'js', 'archive.js'), 'utf8').split(CR).join('');
  const pick = (name) => {
    const a = src.indexOf('  var ' + name + ' = ');
    const b = src.indexOf(';' + NL, a);
    if (a < 0 || b < 0) throw new Error('missing ' + name);
    return src.slice(a, b + 2);
  };
  const fnStart = src.indexOf('  function countryOf(text) {');
  const fnEnd = src.indexOf(NL + '  }' + NL, fnStart) + 5;
  if (fnStart < 0) throw new Error('missing countryOf');
  const code = pick('COUNTRIES') + pick('CANON') + pick('REGION_HINTS')
    + 'function clean(v) { v = v == null ? "" : String(v).trim(); return v === "null" ? "" : v; }' + NL
    + src.slice(fnStart, fnEnd) + NL + 'this.countryOf = countryOf;';
  const ctx = {};
  vm.runInNewContext(code, ctx);
  return ctx.countryOf;
}

async function main() {
  let rows;
  if (process.argv[2]) rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  else {
    // the public anon key, as in generate-static-pages.js (readable data only)
    const url = process.env.SUPABASE_URL || 'https://jpgbehsrglsiwijglhjo.supabase.co';
    const key = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';
    const r = await fetch(url + '/rest/v1/cultivars?select=cultivar_name,type,origins&type=eq.species&is_private=eq.false', { headers: { apikey: key, Authorization: 'Bearer ' + key } });
    rows = await r.json();
  }
  const site = archiveCountryOf();
  const diffs = [];
  for (const row of rows) {
    if (row.type !== 'species') continue;
    const s = (((row.origins || []).filter(o => o && !o._type)[0]) || {}).structured || {};
    for (const field of ['type_locality', 'known_habitats']) {
      const a = geo.countryOf(s[field]), b = site(s[field]);
      if (a !== b) diffs.push(row.cultivar_name + ' [' + field + '] stub=' + a + ' site=' + b);
    }
  }
  if (diffs.length) { console.error('country mismatch:' + NL + diffs.join(NL)); process.exit(1); }
  console.log('check-geo-parity: ' + rows.filter(r => r.type === 'species').length + ' species, stub and site agree');
}
main().catch(e => { console.error(e); process.exit(1); });
