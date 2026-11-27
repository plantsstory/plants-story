// Post check (2026-11-27): the free checks that run once on every new post before the AI is asked.
// Run: node --test tests/post-check.test.js
var test = require('node:test');
var assert = require('node:assert/strict');
var mod = import('../supabase/functions/_shared/post-check.mjs');

var LIST = [
  { id: 1, genus: 'Anthurium', type: 'species', cultivar_name: 'Anthurium crystallinum' },
  { id: 2, genus: 'Anthurium', type: 'species', cultivar_name: 'Anthurium papillilaminum' },
  { id: 3, genus: 'Anthurium', type: 'clone', cultivar_name: "Anthurium 'King of Spades'", tags: ['parentage:hybrid'] },
  { id: 4, genus: 'Anthurium', type: 'hybrid', cultivar_name: "Anthurium 'Red Crystallinum'", tags: ['parentage:hybrid'] },
  { id: 5, genus: 'Anthurium', type: 'species', cultivar_name: 'Anthurium warocqueanum' },
  { id: 6, genus: 'Anthurium', type: 'species', cultivar_name: 'Anthurium sp. "Peru"' },
];
function row(name, type, extra) { return Object.assign({ id: 99, genus: 'Anthurium', cultivar_name: name, type: type }, extra || {}); }
function kinds(flags) { return flags.filter(function (f) { return f.area === 'kind'; }).map(function (f) { return f.suggest_kind || null; }); }

test('names that fit their kind get no kind flag', async function () {
  var m = await mod;
  [
    row('Anthurium crystallinum', 'species'), row('Anthurium sp. "Peru"', 'species'), row("Anthurium sp. 'Peru'", 'species'),
    row('Anthurium aff. besseae', 'species'), row('Anthurium ernesti var. ernesti', 'species'),
    row("Anthurium 'Red Crystallinum'", 'hybrid'), row('Anthurium crystallinum × magnificum', 'hybrid'),
    row("Anthurium papillilaminum 'Fort Sherman'", 'clone', { tags: ['parentage:species'] }),
    row("Anthurium 'King of Spades'", 'clone', { tags: ['parentage:hybrid'] }),
    row("Anthurium forgetii × 'Titanium' [Seedling]", 'seedling'),
  ].forEach(function (r) { assert.deepEqual(m.kindRules(r), [], r.cultivar_name); });
});

test('kind mistakes the rules can see', async function () {
  var m = await mod;
  assert.deepEqual(kinds(m.kindRules(row('Anthurium crystallinum × magnificum', 'species'))), ['hybrid']);
  assert.deepEqual(kinds(m.kindRules(row("Anthurium crystallinum 'RA1'", 'species'))), ['clone']);
  assert.deepEqual(kinds(m.kindRules(row('Anthurium crystallinum', 'hybrid'))), ['species']);
  assert.deepEqual(kinds(m.kindRules(row('Anthurium aff. besseae', 'hybrid'))), ['species']);
  assert.deepEqual(kinds(m.kindRules(row('Anthurium crystallinum × magnificum', 'clone'))), ['hybrid']);
  assert.deepEqual(kinds(m.kindRules(row('Anthurium papillilaminum', 'clone'))), ['species']);
  // parentage that does not fit the name: a softer note, no kind change
  var f = m.kindRules(row("Anthurium 'Ace of Spades'", 'clone', { tags: ['parentage:species'] }));
  assert.equal(f.length, 1); assert.equal(f[0].level, 'info');
  f = m.kindRules(row("Anthurium papillilaminum 'Fort Sherman'", 'clone', { tags: ['parentage:hybrid'] }));
  assert.equal(f.length, 1); assert.equal(f[0].level, 'info');
});

test('spelling: the site\'s own writing rules, the registered list, and GBIF answers', async function () {
  var m = await mod;
  var s = m.spellingRules(row('Anthurium Crystallinum', 'species'));
  assert.equal(s[0].suggest, 'crystallinum');
  assert.equal(m.spellingRules(row('Anthurium crystallinum x magnificum', 'hybrid'))[0].suggest, 'Anthurium crystallinum × magnificum');
  assert.equal(m.spellingRules(row("Anthurium 'king of Spades'", 'clone'))[0].suggest, "'King of Spades'");
  // one letter off a registered species
  var l = m.listChecks(row('Anthurium crystalinum', 'species'), LIST);
  assert.ok(l.some(function (x) { return x.area === 'spelling' && x.suggest === 'crystallinum'; }));
  // the same name, and a near one
  assert.equal(m.listChecks(row("Anthurium 'King of Spades'", 'hybrid'), LIST)[0].area, 'duplicate');
  assert.equal(m.listChecks(row("Anthurium 'King of Spade'", 'clone'), LIST)[0].level, 'info');
  assert.deepEqual(m.listChecks(row('Anthurium magnificum', 'species'), LIST), []);
  // GBIF (free) answers read like the contribute form does
  assert.equal(m.gbifQuery(row('Anthurium sp. "Peru"', 'species')), null);
  assert.equal(m.gbifQuery(row("Anthurium 'Red Crystallinum'", 'hybrid')), null);
  assert.equal(m.gbifQuery(row("Anthurium papillilaminum 'Fort Sherman'", 'clone')), 'Anthurium papillilaminum');
  assert.equal(m.gbifQuery(row('Anthurium ernesti var. ernestii', 'species')), 'Anthurium ernesti var. ernestii');
  assert.equal(m.gbifFlag('Anthurium crystallinum', { matchType: 'EXACT', rank: 'SPECIES', canonicalName: 'Anthurium crystallinum', genus: 'Anthurium' }), null);
  assert.equal(m.gbifFlag('Anthurium crystalinum', { matchType: 'FUZZY', rank: 'SPECIES', canonicalName: 'Anthurium crystallinum', genus: 'Anthurium' }).suggest, 'crystallinum');
  assert.equal(m.gbifFlag('Anthurium zorrillae', { matchType: 'HIGHERRANK', rank: 'GENUS', genus: 'Anthurium' }).level, 'info');
  assert.equal(m.gbifFlag('Anthurium ernesti var. ernestii', { matchType: 'FUZZY', rank: 'VARIETY', canonicalName: 'Anthurium ernesti ernesti' }).suggest, 'ernesti');
});

test('the AI reply is read safely; a broken reply is one note, not a retry', async function () {
  var m = await mod;
  var r = row("Anthurium crystallinum 'RA1'", 'species');
  var p = m.parseAiReply('Here: {"kind":{"verdict":"wrong","suggested":"clone","parentage":"species","reason":"番号つきの1株です。"},"spelling":[{"written":"crystalinum","suggested":"crystallinum","reason":"l が1つ足りません。"}],"same_as":[]}', r);
  assert.equal(p.flags.length, 2);
  assert.match(p.flags[0].msg, /原種の Clone/);
  assert.equal(p.flags[1].suggest, 'crystallinum');
  assert.deepEqual(m.parseAiReply('{"kind":{"verdict":"ok"},"spelling":[],"same_as":[]}', r).flags, []);
  var bad = m.parseAiReply('sorry', r);
  assert.equal(bad.flags.length, 1);
  assert.equal(bad.flags[0].level, 'info');
});

test('the prompt carries the free findings and only a few similar names, so one check stays small', async function () {
  var m = await mod;
  var r = row("Anthurium crystallinum 'RA1'", 'species', { origins: [{ body: 'Ree Garden で選抜された1株。', source_type: 'manual', author: { isAI: false } }] });
  var flags = m.freeChecks(r, LIST);
  var p = m.userPrompt(r, { recordText: m.recordText(r), flags: flags, gbif: null, similar: m.similarNames(r, LIST) });
  assert.match(p, /Ree Garden/);
  assert.match(p, /\[kind\/rule\]/);
  assert.ok(m.similarNames(r, LIST).length <= 12);
  // about 4 characters a token: system + prompt well under 2,000 tokens
  assert.ok((m.SYSTEM.length + p.length) / 4 < 2000, String(m.SYSTEM.length + p.length));
});

test('the same fix found by several checks is shown once', async function () {
  var m = await mod;
  var flags = [
    { area: 'spelling', level: 'warn', src: 'list', msg: 'list', suggest: 'warocqueanum' },
    { area: 'spelling', level: 'warn', src: 'gbif', msg: 'gbif', suggest: 'warocqueanum' },
    { area: 'duplicate', level: 'info', src: 'list', msg: 'よく似た名前（Anthurium warocqueanum・原種）' },
    { area: 'duplicate', level: 'info', src: 'ai', name: 'Anthurium warocqueanum', msg: 'ai same' },
    { area: 'kind', level: 'warn', src: 'rule', msg: 'kind' },
  ];
  var t = m.tidy(flags);
  assert.deepEqual(t.map(function (f) { return f.msg; }), ['gbif', 'よく似た名前（Anthurium warocqueanum・原種）', 'kind']);
});
