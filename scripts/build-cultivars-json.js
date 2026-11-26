// The archive's list as a file (wireframe/data/cultivars.json), built at deploy and served by GitHub Pages.
// The app reads this file, then asks Supabase only for each entry's id and changed_at and fetches in full just the
// entries that are new or changed since the build, instead of every entry on every visit (about 1–2 MB per visit at
// 1,000 entries). Public entries only: the same rows anyone can read with the public key.
// Without the changed_at column (migration 20261126120000 not applied) it writes nothing, and the app reads the
// whole list from Supabase as before. Never blocks a deploy.
'use strict';
const fs = require('fs');
const path = require('path');
const { getAll } = require('./lib/rest');

// keep in step with ARCHIVE_COLUMNS in wireframe/js/app-core.js
const COLUMNS = 'id,cultivar_name,genus,type,origins,created_at,user_id,species_qualifier,aliases,tags,name_status,locality,verified_at,verification_note,parent_a_text,parent_b_text,parent_a_id,parent_b_id,is_private,ai_status,selected_from_id,updated_at,formula_status';
const OUT = path.join(__dirname, '..', 'wireframe', 'data', 'cultivars.json');

async function main() {
  const rows = await getAll('/rest/v1/cultivars?select=' + COLUMNS + ',changed_at&is_private=eq.false&order=id');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ built_at: new Date().toISOString(), rows }));
  console.log('wrote ' + rows.length + ' entries to wireframe/data/cultivars.json (' + Math.round(fs.statSync(OUT).size / 1024) + ' KB)');
}
module.exports = { COLUMNS };
if (require.main === module) main().catch(e => {
  try { fs.unlinkSync(OUT); } catch (_) {}
  console.log('cultivars.json not written (' + e.message + '); the app reads the list from Supabase');
});
