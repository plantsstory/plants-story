// Entry addresses (site check 11-26, item 8)
const test = require('node:test');
const assert = require('node:assert');
const E = require('../wireframe/js/entry-meta.js');

test('names become plain lower-case words joined by hyphens', () => {
  assert.strictEqual(E.path("Anthurium 'Ace of Spades'"), 'anthurium/ace-of-spades');
  assert.strictEqual(E.path('Anthurium aff. besseae'), 'anthurium/aff-besseae');
  assert.strictEqual(E.path('Anthurium sp. "Peru"'), 'anthurium/sp-peru');
  assert.strictEqual(E.path("Anthurium 'Mystique A88'"), 'anthurium/mystique-a88');
  assert.strictEqual(E.path("Anthurium papillilaminum 'Ree Garden' [Seedling]"), 'anthurium/papillilaminum-ree-garden');
});

test('a plain species keeps its address', () => {
  for (const n of ['wendlingeri', 'crystallinum', 'warocqueanum']) assert.strictEqual(E.path('Anthurium ' + n), 'anthurium/' + n);
});

test('a name outside plain Latin keeps the old form', () => {
  assert.strictEqual(E.slug('× hybrid'), null);
  assert.strictEqual(E.path('Anthurium ひなた'), E.legacyPath('Anthurium ひなた'));
  assert.strictEqual(E.path('Anthurium André'), 'anthurium/andre');
});

test('the old form is what the site used before', () => {
  assert.strictEqual(E.legacyPath("Anthurium 'Ace of Spades'"), "anthurium/'Ace%20of%20Spades'");
  assert.strictEqual(E.legacyPath('Anthurium sp. "Peru"'), 'anthurium/sp.%20%22Peru%22');
});
