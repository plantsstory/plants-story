// Name and text checks (BOARD 10-07b T103). Runs in CI before the stubs; writes wireframe/data/name-check.json,
// which the admin dashboard lists. It never blocks a deploy: these are things for a person to look at.
// Usage: node scripts/check-names.js [rows.json]
'use strict';
const fs = require('fs');
const path = require('path');
const RecordGate = require('../wireframe/js/record-gate');
const geo = require('./lib/geo');

const SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
// the public anon key, as in generate-static-pages.js (readable data only)
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';
const OUT = path.join(__dirname, '..', 'wireframe', 'data', 'name-check.json');

const norm = s => String(s || '').toLowerCase().replace(/['"‘’“”]/g, '').replace(/^(anthurium|monstera|philodendron)\s+/, '').replace(/^a\.\s*/, '').replace(/\s+/g, ' ').trim();
const top = row => (row.origins || []).filter(o => o && !o._type).sort((a, b) => (parseInt(b.trust, 10) || 0) - (parseInt(a.trust, 10) || 0))[0] || null;

function check(rows) {
  const issues = [];
  const add = (row, level, code, msg) => issues.push({ id: row.id, name: row.cultivar_name, level, code, msg });
  const byNorm = new Map();
  for (const r of rows) byNorm.set(norm(r.cultivar_name.replace(' [Seedling]', '')), r);

  for (const r of rows) {
    const name = String(r.cultivar_name || '');
    // the name itself
    // a curly apostrophe between letters (Burle Marx’s Flame) is part of the name, not a quote
    if (/[‘“”]/.test(name) || /’(?![A-Za-z])|(?<![A-Za-z])’/.test(name)) add(r, 'error', 'curly_quote', '名前に曲がった引用符があります（半角の \' か " にする）');
    if (/\s{2,}/.test(name)) add(r, 'error', 'double_space', '名前に連続した空白があります');
    if (/\s[xX]\s/.test(name)) add(r, 'warn', 'cross_letter', '交配の印に x が使われています（× にする）');
    const quoted = name.match(/'([^']+)'/);
    if (quoted && /^[a-z]/.test(quoted[1])) add(r, 'warn', 'lower_cultivar', '品種名が小文字で始まっています（\'' + quoted[1] + '\'）');

    // parents: a recorded name written as text should carry its id; an id and a text must agree
    for (const side of ['a', 'b']) {
      const text = r['parent_' + side + '_text'], id = r['parent_' + side + '_id'];
      if (text && !id && byNorm.has(norm(text))) add(r, 'warn', 'parent_unlinked', '親「' + text + '」は登録済みの名前と一致しますが ID が空です');
      if (text && id) {
        const p = rows.find(x => x.id === id);
        if (p && norm(p.cultivar_name) !== norm(text)) add(r, 'error', 'parent_mismatch', '親の ID（' + p.cultivar_name + '）と名前（' + text + '）が食い違っています');
      }
    }
    // an alias that is someone else's name
    for (const al of r.aliases || []) {
      const other = byNorm.get(norm(al));
      if (other && other.id !== r.id) add(r, 'warn', 'alias_clash', '別名「' + al + '」が別の品種（' + other.cultivar_name + '）の名前と同じです');
    }

    // the text
    const o = top(r);
    if (!o) continue;
    const body = String(o.body || '');
    const s = o.structured || {};
    if (/(氏|さん|様)(が|は|の|と|、|。|）)/.test(body) || /\b(Mr|Mrs|Ms|Dr)\.\s/.test(body)) add(r, 'warn', 'honorific', '本文に敬称があります');
    if (/\d{4}-\d{2}-\d{2}/.test(body)) add(r, 'warn', 'iso_date', '本文の日付が YYYY-MM-DD です（YYYY.MM.DD にする）');
    for (const sent of body.split(/(?<=。)/)) {
      if (/(とされる|可能性|考えられ|と思われ)/.test(sent) && /'[^']+'/.test(sent) && !/としている|による|によれば/.test(sent))
        add(r, 'warn', 'guess_named', '推量の文に具体的な品種名があります: ' + sent.trim().slice(0, 50));
    }
    // structured facts said differently in the text (species): year and country
    if (r.type === 'species') {
      const y = String(s.publication_year || '').match(/\d{4}/);
      if (y && /\d{4}\s*年/.test(body) && body.indexOf(y[0]) === -1) add(r, 'warn', 'year_mismatch', '本文の年が発表年（' + y[0] + '）と合いません');
      const c = geo.countryOf(s.type_locality);
      if (c && body && geo.countryJa(c) !== c && body.indexOf(geo.countryJa(c)) === -1 && body.indexOf(c) === -1)
        add(r, 'warn', 'country_mismatch', '本文にタイプ産地の国（' + geo.countryJa(c) + '）が出てきません');
    }
  }
  return issues;
}

async function main() {
  let rows;
  if (process.argv[2]) rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  else {
    const r = await fetch(SUPABASE_URL + '/rest/v1/cultivars?select=id,cultivar_name,genus,type,origins,aliases,parent_a_text,parent_b_text,parent_a_id,parent_b_id,formula_status,species_qualifier,selected_from_id,tags,locality,ai_status,updated_at&is_private=eq.false',
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY } });
    rows = await r.json();
  }
  const issues = check(rows);
  const recorded = rows.filter(r => r.type !== 'seedling' && !(r.tags || []).includes('individual') && RecordGate.state(r) === 'ok').map(r => r.cultivar_name).sort();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ checked_at: new Date().toISOString(), rows: rows.length, recorded: recorded.length, recorded_names: recorded, issues }, null, 1));
  console.log('check-names: ' + rows.length + ' rows, ' + recorded.length + ' recorded, ' + issues.filter(i => i.level === 'error').length + ' errors, ' + issues.filter(i => i.level === 'warn').length + ' warnings');
  for (const i of issues.slice(0, 30)) console.log('  [' + i.level + '] ' + i.name + ': ' + i.msg);
}
module.exports = { check };
if (require.main === module) main().catch(e => { console.error(e); process.exit(0); }); // never block a deploy
