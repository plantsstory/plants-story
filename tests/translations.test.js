// Translations of contributors' words (2026-11-27): what the site shows in each language, and the name check
// that marks a draft for the owner. Run: node --test tests/translations.test.js
var test = require('node:test');
var assert = require('node:assert/strict');
var RT = require('../wireframe/js/record-text.js');
var checks = import('../supabase/functions/_shared/translate-check.mjs');

var JA = '2019年にタイのナーセリーで選抜された株。Banta が名付けた。';
var EN = 'Selected in 2019 at a nursery in Thailand and named by John Banta.';
function person(body, extra) { return Object.assign({ body: body, source_type: 'manual', author: { isAI: false } }, extra || {}); }

test('a person\'s Japanese words: Japanese view shows them, English view waits for the approved translation', function () {
  var o = person(JA);
  assert.deepEqual(RT.recordText(o, 'jp'), { text: JA, state: 'ok', original: JA });
  var en = RT.recordText(o, 'en');
  assert.equal(en.state, 'pending');
  assert.equal(en.text, '');
  assert.equal(en.original, JA);
});

test('an approved translation shows only while it is a translation of the words as they are now', function () {
  var o = person(JA, { tr: { en: { text: EN, from: JA } } });
  assert.deepEqual(RT.recordText(o, 'en'), { text: EN, state: 'ok', original: JA });
  var edited = person(JA + '追記。', { tr: { en: { text: EN, from: JA } } });
  assert.equal(RT.recordText(edited, 'en').state, 'pending');
});

test('English words wait for a Japanese translation in the Japanese view', function () {
  var o = person(EN);
  assert.equal(RT.recordText(o, 'en').text, EN);
  assert.equal(RT.recordText(o, 'jp').state, 'pending');
  o.tr = { ja: { text: '2019年にタイのナーセリーで選抜され、John Banta が名付けた。', from: EN } };
  assert.equal(RT.recordText(o, 'jp').state, 'ok');
});

test('「原文のまま」 shows the original marked as such', function () {
  var o = person(JA, { tr: { en: { keep: true, from: JA } } });
  assert.deepEqual(RT.recordText(o, 'en'), { text: JA, state: 'original', original: JA });
});

test('database and AI records stay as before (body_en, else body)', function () {
  var ai = { body: 'AI の文', body_en: 'AI text', source_type: 'ai', author: { isAI: true } };
  assert.equal(RT.recordText(ai, 'en').text, 'AI text');
  assert.equal(RT.recordText(ai, 'jp').text, 'AI の文');
  var db = { body: 'IPNI の記録', source_type: 'ipni_powo' };
  assert.equal(RT.recordText(db, 'en').text, 'IPNI の記録');
});

test('a body generated from Latin fields gets its English from the fields, without AI', function () {
  var o = person('1878 年、Master が記載した。タイプ産地は Colombia', { body_generated: true, structured: { origin_type: 'species', author_name: 'Master', publication_year: 1878, type_locality: 'Colombia' } });
  var en = RT.recordText(o, 'en');
  assert.equal(en.state, 'ok');
  assert.equal(en.text, 'Described by Master in 1878. Type locality: Colombia.');
  var ja = person('分布は コロンビア', { body_generated: true, structured: { origin_type: 'species', known_habitats: 'コロンビア' } });
  assert.equal(RT.recordText(ja, 'en').state, 'pending');
});

test('a numbered plant with no note keeps the site\'s own English', function () {
  var o = person("'RA1' は、Ra が 1 株につけた番号・名前。", { body_en: "'RA1' is the number or name Ra gave to one plant.", structured: { individual_code: 'RA1', notes: '' } });
  assert.equal(RT.recordText(o, 'en').text, "'RA1' is the number or name Ra gave to one plant.");
  var withNote = person("'RA1' は、Ra が 1 株につけた番号・名前。葉が丸い。", { body_en: 'x', structured: { individual_code: 'RA1', notes: '葉が丸い。' } });
  assert.equal(RT.recordText(withNote, 'en').state, 'pending');
});

test('language detection: a Japanese sentence full of Latin names is Japanese; one Japanese alias in English is English', async function () {
  var c = await checks;
  ['1878年にMasterによりBelgian collector Thomas de Warocquéに献名された。', JA, 'タイ産'].forEach(function (s) {
    assert.equal(RT.detectLang(s), 'ja', s);
    assert.equal(c.detectLang(s), 'ja', s);
  });
  [EN, 'Known as クイーン in Japan, bred by NSE Tropicals.', "Anthurium 'Ace of Spades'"].forEach(function (s) {
    assert.equal(RT.detectLang(s), 'en', s);
    assert.equal(c.detectLang(s), 'en', s);
  });
});

test('name check: names that must come through letter for letter', async function () {
  var c = await checks;
  var names = c.requiredNames("1878年にMasterによりThomas de Warocquéに献名。'Ace of Spades' と A. crystallinum の交配。RA1 はタイで。");
  ['Master', 'Thomas', 'Warocqué', "'Ace of Spades'", 'crystallinum', 'RA1', '1878'].forEach(function (n) { assert.ok(names.indexOf(n) !== -1, n); });
  var en = c.requiredNames('The plant was bred by John Banta. It is a cross of Anthurium crystallinum.');
  assert.ok(en.indexOf('The') === -1 && en.indexOf('It') === -1, 'ordinary sentence starts are not names');
  ['John', 'Banta', 'crystallinum'].forEach(function (n) { assert.ok(en.indexOf(n) !== -1, n); });
});

test('name check: a changed spelling, a name in katakana and Japanese left in English are marked', async function () {
  var c = await checks;
  var f = c.checkTranslation('1878年にThomas de Warocquéに献名された。', 'Named in 1878 after Thomas de Warocque.', 'en');
  assert.deepEqual(f, [{ kind: 'name_changed', items: ['Warocqué'] }]);
  f = c.checkTranslation('Bred by John Banta in Florida.', 'ジョン・バンタがフロリダで作出した。', 'ja');
  assert.ok(f.some(function (x) { return x.kind === 'name_changed' && x.items.indexOf('Banta') !== -1; }));
  assert.ok(f.some(function (x) { return x.kind === 'new_katakana' && x.items.indexOf('ジョン・バンタ') !== -1; }));
  f = c.checkTranslation('タイの株。', 'A plant from タイ.', 'en');
  assert.ok(f.some(function (x) { return x.kind === 'japanese_left'; }));
  assert.deepEqual(c.checkTranslation('Bred by John Banta in Florida.', 'Florida で John Banta が作出したハイブリッド。', 'ja'), []);
  // curly quotes count as the same quote
  assert.deepEqual(c.checkTranslation("'Ace of Spades' の実生。", '‘Ace of Spades’ seedling.', 'en'), []);
});

test('the model\'s reply is read even inside a code fence', async function () {
  var c = await checks;
  var p = c.parseReply('```json\n{"source_language":"ja","translation":"Named by Banta.","romanized":[{"from":"バンタ","to":"Banta"}],"unsure_names":[],"note":""}\n```');
  assert.equal(p.translation, 'Named by Banta.');
  assert.deepEqual(p.romanized, [{ from: 'バンタ', to: 'Banta' }]);
  assert.throws(function () { c.parseReply('{"translation":""}'); });
  assert.throws(function () { c.parseReply('sorry'); });
});
