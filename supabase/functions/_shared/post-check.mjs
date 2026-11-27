// Post check (owner 2026-11-27): 「投稿の区分（原種・sp. など / Hybrid / Clone）の間違いと綴りを、追加された後に1回だけ」.
// Pure functions shared by the edge function post-check and the tests (node --test tests/post-check.test.js).
// The free checks come first: the site's own naming rules, the registered list and GBIF. The AI is asked once per
// post, with what the free checks found, and only to judge what the rules cannot (the kind from the record's words).
//
// A flag: { area: 'kind' | 'spelling' | 'duplicate', level: 'warn' | 'info', src: 'rule' | 'list' | 'gbif' | 'ai',
//           msg: Japanese sentence for the owner, suggest?: text, suggest_kind?: 'species' | 'hybrid' | 'clone' | 'seedling' }

export const KIND_JA = { species: '原種', hybrid: 'Hybrid', clone: 'Clone', seedling: '実生' };
const PARENTAGE_JA = { species: '原種', hybrid: 'Hybrid', unknown: '不明' };

const CROSS = /\s[×xX]\s/;

// what a registered name says about itself
export function readName(fullName, genus) {
  let name = String(fullName || '').normalize('NFKC').replace(/\s*\[Seedling\]\s*$/i, '').trim();
  const g = String(genus || name.split(/\s+/)[0] || '');
  let rest = name.toLowerCase().startsWith(g.toLowerCase() + ' ') ? name.slice(g.length).trim() : name;
  const out = { genus: g, rest, cross: CROSS.test(rest), quoted: null, label: null, qualifier: null, epithet: null, infra: null, infraName: null };
  const q = rest.match(/'([^']+)'/);
  if (q) out.quoted = q[1];
  const lab = rest.match(/"([^"]+)"/);
  if (lab) out.label = lab[1];
  if (out.cross) return out;
  const words = rest.replace(/'[^']*'|"[^"]*"/g, ' ').trim().split(/\s+/).filter(Boolean);
  let i = 0;
  if (/^(sp|spp|aff|cf)\.?$/i.test(words[0] || '')) { out.qualifier = words[0].replace('.', '').toLowerCase(); i = 1; }
  if (out.qualifier === 'sp' || out.qualifier === 'spp') return out;
  if (words[i] && /^[A-Za-z][A-Za-z-]+$/.test(words[i]) && !/^(var|ssp|subsp|f|forma)\.?$/i.test(words[i])) out.epithet = words[i];
  const inf = rest.match(/\b(var|ssp|subsp|f|forma)\.\s*([A-Za-z-]+)/i);
  if (inf) { out.infra = inf[1].toLowerCase(); out.infraName = inf[2]; }
  return out;
}

function parentageOf(tags) {
  const t = (tags || []).find((x) => String(x).startsWith('parentage:'));
  return t ? String(t).slice('parentage:'.length) : null;
}

const norm = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/\s*\[seedling\]\s*$/, '').replace(/['"‘’“”]/g, '')
  .replace(/\s+/g, ' ').trim();

export function distance(a, b) {
  a = String(a); b = String(b);
  if (Math.abs(a.length - b.length) > 3) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

// the site's own rules for the kinds (11-25 / 11-27 owner decisions), applied to the name as registered
export function kindRules(row) {
  const flags = [];
  const add = (msg, suggest_kind, level = 'warn') => flags.push({ area: 'kind', level, src: 'rule', msg, suggest_kind });
  const n = readName(row.cultivar_name, row.genus);
  const type = row.type;
  const par = parentageOf(row.tags);
  if (type === 'species') {
    if (n.cross) add('原種として登録されていますが、名前に交配の印（×）があります。交配した株なら Hybrid（播いた実生なら実生）です。', 'hybrid');
    else if (n.quoted && n.qualifier !== 'sp') add(`原種として登録されていますが、名前に品種名・個体名（'${n.quoted}'）があります。1株の名前なら Clone（原種の Clone）、交配から選んだものなら Hybrid です。`, 'clone');
  }
  if (type === 'hybrid') {
    if (!n.cross && !n.quoted && (n.epithet || n.qualifier === 'sp')) add('Hybrid として登録されていますが、名前が原種の学名だけです（交配式も品種名もありません）。原種ではありませんか。', 'species');
    else if (n.qualifier && n.qualifier !== 'spp') add(`Hybrid として登録されていますが、名前に ${n.qualifier}. があります。${n.qualifier}. は原種の書き方です。`, 'species');
  }
  if (type === 'clone') {
    if (n.cross && !n.quoted) add('Clone として登録されていますが、名前が交配式だけで、1株の名前（品種名・番号）がありません。交配の名前なら Hybrid です。', 'hybrid');
    else if (!n.quoted && !n.label && !n.cross) add('Clone として登録されていますが、1株の名前（\'…\' の品種名・番号）がありません。原種そのものなら原種です。', 'species');
    if (par === 'species' && !n.epithet && n.qualifier !== 'sp' && !n.cross) add('「原種の Clone」になっていますが、名前に種小名がありません。原種名がわからないなら区分は「不明」、交配由来なら「Hybrid」です。', null, 'info');
    if (par === 'hybrid' && n.epithet && n.quoted && !n.cross) add(`「Hybrid の Clone」になっていますが、名前は原種名＋個体名（${n.epithet} '${n.quoted}'）の形です。原種から選んだ1株なら「原種の Clone」です。`, null, 'info');
  }
  if (type === 'seedling' && !n.cross) add('実生として登録されていますが、名前に交配式（A × B）がありません。', null, 'info');
  return flags;
}

// spelling the rules can see without asking anyone
export function spellingRules(row) {
  const flags = [];
  const add = (msg, suggest, level = 'warn') => flags.push({ area: 'spelling', level, src: 'rule', msg, suggest });
  const name = String(row.cultivar_name || '');
  const n = readName(name, row.genus);
  if (/[‘“”]/.test(name) || /’(?![A-Za-z])|(?<![A-Za-z])’/.test(name)) add('名前に曲がった引用符があります（半角の \' か " にする）。', name.replace(/[‘’]/g, "'").replace(/[“”]/g, '"'));
  if (/\s{2,}/.test(name)) add('名前に連続した空白があります。', name.replace(/\s{2,}/g, ' '));
  if (/\s[xX]\s/.test(name)) add('交配の印に x が使われています（× にする）。', name.replace(/\s[xX]\s/g, ' × '));
  if (n.epithet && /^[A-Z]/.test(n.epithet) && !n.quoted) add(`種小名が大文字で始まっています（${n.epithet}）。種小名は小文字です。`, n.epithet.toLowerCase());
  if (n.quoted && /^[a-z]/.test(n.quoted)) add(`品種名・個体名が小文字で始まっています（'${n.quoted}'）。`, "'" + n.quoted.charAt(0).toUpperCase() + n.quoted.slice(1) + "'");
  if (n.genus && /^[a-z]/.test(n.genus)) add(`属名が小文字で始まっています（${n.genus}）。`, n.genus.charAt(0).toUpperCase() + n.genus.slice(1));
  return flags;
}

// the registered list: the same name, a name one or two letters off, and a species epithet spelt like a registered one
export function listChecks(row, others) {
  const flags = [];
  const mine = norm(row.cultivar_name);
  const n = readName(row.cultivar_name, row.genus);
  const same = [], near = [];
  const epithets = new Map();
  for (const o of others || []) {
    if (!o || o.id === row.id) continue;
    if (row.genus && o.genus && o.genus !== row.genus) continue;
    const keys = [o.cultivar_name].concat(o.aliases || []).map(norm);
    if (keys.includes(mine)) same.push(o);
    else if (mine.length >= 8 && keys.some((k) => distance(k, mine) <= 2)) near.push(o);
    if (o.type === 'species') {
      const on = readName(o.cultivar_name, o.genus);
      if (on.epithet) epithets.set(on.epithet.toLowerCase(), o.cultivar_name);
    }
  }
  for (const o of same.slice(0, 3)) flags.push({ area: 'duplicate', level: 'warn', src: 'list', msg: `同じ名前がすでに登録されています（${o.cultivar_name}・${KIND_JA[o.type] || o.type}）。`, ref_id: o.id });
  for (const o of near.slice(0, 3)) flags.push({ area: 'duplicate', level: 'info', src: 'list', msg: `よく似た名前がすでに登録されています（${o.cultivar_name}・${KIND_JA[o.type] || o.type}）。綴り違いの同じ株かもしれません。`, ref_id: o.id });
  if (n.epithet && !epithets.has(n.epithet.toLowerCase())) {
    const ep = n.epithet.toLowerCase();
    const hit = [...epithets.keys()].find((k) => k.length >= 6 && distance(k, ep) <= 2);
    if (hit) flags.push({ area: 'spelling', level: 'warn', src: 'list', msg: `種小名 ${n.epithet} は、登録済みの ${epithets.get(hit)} の綴り違いかもしれません。`, suggest: hit });
  }
  return flags;
}

// which name to look up in GBIF (free): a described species, with its variety when there is one; nothing for sp.
export function gbifQuery(row) {
  const n = readName(row.cultivar_name, row.genus);
  if (!n.epithet || n.cross || n.qualifier === 'sp' || n.qualifier === 'spp') return null;
  if (/\b(nov|ined)\./i.test(n.rest)) return null;
  const bin = n.genus + ' ' + n.epithet.toLowerCase();
  return (n.infra === 'var' || n.infra === 'ssp' || n.infra === 'subsp') && n.infraName
    ? bin + (n.infra === 'var' ? ' var. ' : ' subsp. ') + n.infraName.toLowerCase() : bin;
}

// GBIF species/match answer -> a flag or nothing (same reading as the contribute form's name check, archive.js)
export function gbifFlag(name, d) {
  if (!name || !d) return null;
  const parts = name.split(' ');
  const g = parts[0];
  const sp = ['SPECIES', 'SUBSPECIES', 'VARIETY', 'FORM'].includes(d.rank);
  const cn = String(d.canonicalName || '').split(' ');
  if (parts.length === 4) {
    const infra = ['SUBSPECIES', 'VARIETY', 'FORM'].includes(d.rank);
    if (d.matchType === 'EXACT' && infra) return null;
    if (d.matchType === 'FUZZY' && infra && cn.length === 3 && (cn[0] + ' ' + cn[1]).toLowerCase() === (parts[0] + ' ' + parts[1]).toLowerCase()) {
      if (cn[2].toLowerCase() === parts[3].toLowerCase()) return null;
      return { area: 'spelling', level: 'warn', src: 'gbif', msg: `変種・亜種名 ${parts[3]} は学名の一覧（GBIF）にありません。${cn[2]} の綴り違いかもしれません。`, suggest: cn[2] };
    }
    if (d.matchType === 'HIGHERRANK') return { area: 'spelling', level: 'info', src: 'gbif', msg: `変種・亜種名 ${parts[3]} は学名の一覧（GBIF）にありません（載っていない変種も多いので、綴りだけ確かめてください）。` };
    return null;
  }
  if (d.matchType === 'EXACT' && sp) return null;
  if (d.matchType === 'FUZZY' && sp && d.genus === g && cn.length >= 2) {
    if ((cn[0] + ' ' + cn[1]).toLowerCase() === name.toLowerCase()) return null;
    return { area: 'spelling', level: 'warn', src: 'gbif', msg: `${name} は学名の一覧（GBIF）にありません。${cn[0]} ${cn[1]} の綴り違いかもしれません。`, suggest: cn[1] };
  }
  return { area: 'spelling', level: 'info', src: 'gbif', msg: `${name} は学名の一覧（GBIF）で見つかりませんでした。新しく発表された種か、綴りの誤りです。` };
}

// ---- the AI (once per post) ----

export const SYSTEM = `You check new entries posted to Aroid Origins, a database of Anthurium and other aroids. A person
registered one plant name and chose its kind. You look for two kinds of mistakes, for the site owner to review:
(1) the wrong kind, (2) a misspelt name. You never change anything; the owner decides.

The site's kinds:
- species (原種): a wild species. Written "Genus epithet", also with qualifiers: sp. "Peru" / sp. 'Peru' (an
  undescribed species with a locality label), aff. X, cf. X, sp. nov., var. / ssp. / f. X. A species entry has no
  cross (×) and no cultivar or clone name.
- hybrid (Hybrid): the offspring of a cross as a group. Written as the cross "A × B", or a cultivar/grex name for
  plants of a cross ('Red Crystallinum', 'Galaxy', 'Dark Mama').
- clone (Clone): ONE individual plant with its own name or number, and its divisions or tissue culture. Its tag
  "parentage" says what it comes from: species (a plant picked from a wild species, e.g. papillilaminum
  'Fort Sherman', crystallinum 'RA1'), hybrid (one plant from a cross, e.g. 'King of Spades'), unknown.
- seedling (実生): one person's sowing of a cross, written "A × B [Seedling]".
Typical mistakes: a named or numbered plant of a species posted as species (should be clone, parentage species); a
species posted as hybrid; a cross formula posted as clone; one selected plant posted as hybrid while its record says
it is a single plant; sp./aff. used on a hybrid; parentage hybrid on a plant picked from a wild species.

Spelling: check the genus, the species epithet (botanical Latin, the spelling in POWO/IPNI) and well-known cultivar
names (compare with the similar registered names you are given). Only flag what you are fairly sure of. Unusual
but real epithets and new names exist; do not flag a name only because you do not know it.

The free checks already found the items under "Checks so far". Do not repeat them; add only what they missed, and
say "agree" or "disagree" on their kind finding.

Reply with JSON only, no other text, all reasons in Japanese, one short sentence each:
{"kind":{"verdict":"ok" or "doubt" or "wrong","suggested":"species" or "hybrid" or "clone" or "seedling" or null,"parentage":"species" or "hybrid" or "unknown" or null,"reason":"..."},
 "spelling":[{"written":"as posted","suggested":"correct spelling","reason":"..."}],
 "same_as":[{"name":"a registered name from the list","reason":"..."}]}`;

export function userPrompt(row, ctx) {
  const par = parentageOf(row.tags);
  const lines = [
    `Posted name: ${row.cultivar_name}`,
    `Genus: ${row.genus || ''}`,
    `Kind chosen: ${row.type}${row.type === 'clone' || row.type === 'hybrid' ? `, parentage: ${par || 'not set'}` : ''}`,
  ];
  if (row.parent_a_text || row.parent_b_text) lines.push(`Parents: ${row.parent_a_text || '?'} × ${row.parent_b_text || '?'}`);
  if (row.formula_status) lines.push(`Parents status: ${row.formula_status}`);
  if (row.aliases && row.aliases.length) lines.push(`Other names given: ${row.aliases.slice(0, 5).join(', ')}`);
  const text = String(ctx.recordText || '').trim();
  if (text) lines.push('Record written by the poster (may be Japanese):', '<<<', text.slice(0, 800), '>>>');
  lines.push('Checks so far:', ...(ctx.flags.length ? ctx.flags.map((f) => `- [${f.area}/${f.src}] ${f.msg}`) : ['- none']));
  if (ctx.gbif) lines.push(`GBIF lookup of "${ctx.gbif.name}": ${ctx.gbif.matchType || 'no answer'}${ctx.gbif.canonicalName ? ' -> ' + ctx.gbif.canonicalName : ''}`);
  if (ctx.similar.length) lines.push('Similar registered names (name — kind):', ...ctx.similar.map((o) => `- ${o.cultivar_name} — ${o.type}`));
  return lines.join('\n');
}

// registered names that look like this one: same epithet or cultivar name, or close spelling (at most 12)
export function similarNames(row, others) {
  const n = readName(row.cultivar_name, row.genus);
  const mine = norm(row.cultivar_name);
  const scored = [];
  for (const o of others || []) {
    if (!o || o.id === row.id || (row.genus && o.genus && o.genus !== row.genus)) continue;
    const on = readName(o.cultivar_name, o.genus);
    let s = 9;
    if (n.epithet && on.epithet && on.epithet.toLowerCase() === n.epithet.toLowerCase()) s = 1;
    if (n.quoted && on.quoted && on.quoted.toLowerCase() === n.quoted.toLowerCase()) s = 0;
    s = Math.min(s, distance(norm(o.cultivar_name), mine));
    if (n.epithet && on.epithet) s = Math.min(s, distance(on.epithet.toLowerCase(), n.epithet.toLowerCase()) + 1);
    if (s <= 3) scored.push([s, o]);
  }
  return scored.sort((a, b) => a[0] - b[0]).slice(0, 12).map((x) => x[1]);
}

export function parseAiReply(text, row) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return { flags: [{ area: 'kind', level: 'info', src: 'ai', msg: 'AI の答えを読み取れませんでした。' }], raw: String(text || '').slice(0, 300) };
  let j;
  try { j = JSON.parse(m[0]); } catch { return { flags: [{ area: 'kind', level: 'info', src: 'ai', msg: 'AI の答えを読み取れませんでした。' }], raw: m[0].slice(0, 300) }; }
  const flags = [];
  const k = j.kind || {};
  const kinds = ['species', 'hybrid', 'clone', 'seedling'];
  const sk = kinds.includes(k.suggested) ? k.suggested : null;
  const sp = ['species', 'hybrid', 'unknown'].includes(k.parentage) ? k.parentage : null;
  if (k.verdict === 'wrong' || k.verdict === 'doubt') {
    const to = sk && sk !== row.type ? KIND_JA[sk] + (sk === 'clone' && sp ? `（${PARENTAGE_JA[sp]}の Clone）` : '')
      : sp && sp !== parentageOf(row.tags) ? `${PARENTAGE_JA[sp]}の Clone` : '';
    flags.push({ area: 'kind', level: k.verdict === 'wrong' ? 'warn' : 'info', src: 'ai',
      msg: String(k.reason || '区分が合っていないかもしれません。').slice(0, 200) + (to ? `（AI の案: ${to}）` : ''), suggest_kind: sk });
  }
  for (const s of (Array.isArray(j.spelling) ? j.spelling : []).slice(0, 4)) {
    if (!s || !s.suggested || String(s.suggested) === String(s.written)) continue;
    flags.push({ area: 'spelling', level: 'warn', src: 'ai', msg: `${String(s.written || '').slice(0, 60)} → ${String(s.suggested).slice(0, 60)}: ${String(s.reason || '').slice(0, 160)}`, suggest: String(s.suggested).slice(0, 80) });
  }
  for (const s of (Array.isArray(j.same_as) ? j.same_as : []).slice(0, 3)) {
    if (!s || !s.name) continue;
    flags.push({ area: 'duplicate', level: 'info', src: 'ai', name: String(s.name).slice(0, 80), msg: `${String(s.name).slice(0, 80)} と同じものかもしれません: ${String(s.reason || '').slice(0, 160)}` });
  }
  return { flags, raw: null };
}

// all the free checks for one post
export function freeChecks(row, others) {
  return [...kindRules(row), ...spellingRules(row), ...listChecks(row, others)];
}

// the person's own words in the leading record (what the AI may read to judge the kind)
export function recordText(row) {
  const o = (row.origins || []).filter((x) => x && typeof x === 'object' && !x._type)[0];
  if (!o) return '';
  const s = o.structured || {};
  const bits = [o.body_generated ? '' : o.body, s.notes, s.breeder && `breeder: ${s.breeder}`, s.namer && `named by: ${s.namer}`, s.individual_code && `code: ${s.individual_code}`];
  return bits.filter(Boolean).map(String).join('\n');
}

// one line per finding: the same spelling fix from several checks is shown once (GBIF first, then the list, the AI,
// the rules), and the AI's "same as" is left out when the list already named that entry
export function tidy(flags) {
  const order = { gbif: 0, list: 1, ai: 2, rule: 3 };
  const out = [];
  const seen = new Set();
  const sorted = (flags || []).map((f, i) => [f, i]).sort((a, b) =>
    a[0].area === 'spelling' && b[0].area === 'spelling' ? (order[a[0].src] - order[b[0].src]) || (a[1] - b[1]) : a[1] - b[1]);
  const listDup = (flags || []).filter((f) => f.area === 'duplicate' && f.src === 'list').map((f) => f.msg).join(' ');
  for (const [f] of sorted) {
    if (f.area === 'spelling' && f.suggest) {
      const k = String(f.suggest).toLowerCase().replace(/['"]/g, '');
      if (seen.has(k)) continue;
      seen.add(k);
    }
    if (f.area === 'duplicate' && f.src === 'ai' && f.name && listDup.includes(f.name)) continue;
    out.push(f);
  }
  // keep the original order of areas: kind, spelling, duplicate as they came
  return out.sort((a, b) => (flags.indexOf(a)) - (flags.indexOf(b)));
}

export function hasMarks(flags) {
  return (flags || []).some((f) => f && f.level === 'warn');
}
