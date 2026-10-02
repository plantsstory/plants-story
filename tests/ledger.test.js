// Accounting checks for the admin ledger (wireframe/js/admin-ledger.js): the statements must balance
// and the stock count must follow the plant ledger, across two years.
const test = require('node:test');
const assert = require('node:assert');

global.window = global;
require('../wireframe/js/admin-ledger.js');
const L = window._ledger;

function e(date, debit, credit, amount, extra) { return Object.assign({ id: Math.random(), entry_date: date, debit, credit, amount, description: '' }, extra || {}); }
function plant(id, code, purchased_on, cost, extra) { return Object.assign({ id, code, name: 'Anthurium test', purchased_on, cost, status: 'stock', status_date: null }, extra || {}); }

function scenario() {
  L.S.plants = [
    plant(1, 'P-2026-001', '2026-10-05', 30000, { status: 'sold', status_date: '2026-11-10', sold_on: '2026-11-10' }),
    plant(2, 'P-2026-002', '2026-10-10', 150000, { status: 'mother', status_date: '2026-12-01', mother_on: '2026-12-01', asset_method: 'lump3' }),
    plant(3, 'P-2026-003', '2026-10-12', 20000, { status: 'dead', status_date: '2026-11-01' }),
    plant(4, 'P-2026-004', '2026-12-20', 10000, { status: 'sold', status_date: '2027-03-01', sold_on: '2027-03-01' }),
    plant(5, 'P-2026-005', '2026-07-01', 400000, { status: 'mother', status_date: '2026-07-01', mother_on: '2026-07-01', asset_method: 'straight', useful_years: 10 })
  ];
  L.S.entries = [
    e('2026-10-01', '普通預金', '事業主借', 50000),
    e('2026-10-05', '仕入高', '事業主借', 30000, { plant_id: 1 }),
    e('2026-10-10', '仕入高', '普通預金', 150000, { plant_id: 2 }),
    e('2026-10-12', '仕入高', '事業主借', 20000, { plant_id: 3 }),
    e('2026-11-10', '売掛金', '売上高', 51000, { channel: 'base' }),
    e('2026-11-10', '支払手数料', '売掛金', 3406, { channel: 'base' }),
    e('2026-12-01', '普通預金', '売掛金', 47344, { channel: 'base' }),
    e('2026-12-01', '支払手数料', '売掛金', 250, { channel: 'base' }),
    e('2026-12-05', '通信費', '事業主借', 3000),
    e('2026-12-01', '一括償却資産', '仕入高', 150000, { plant_id: 2 }),
    e('2026-12-31', '減価償却費', '一括償却資産', 50000, { plant_id: 2, source: 'depreciation', source_ref: 'dep-2-2026' }),
    e('2026-12-20', '仕入高', '事業主借', 10000, { plant_id: 4 }),
    // plant 5: bought and put to use as a mother plant on the same day (straight line, 10 years)
    e('2026-07-01', '仕入高', '事業主借', 400000, { plant_id: 5 }),
    e('2026-07-01', '工具器具備品', '仕入高', 400000, { plant_id: 5 }),
    e('2026-12-31', '減価償却費', '工具器具備品', 20000, { plant_id: 5, source: 'depreciation', source_ref: 'dep-5-2026' }),
    // 2027: plant 4 sold on Mercari Shops
    e('2027-03-01', '売掛金', '売上高', 20000, { channel: 'mercari_shops' }),
    e('2027-03-01', '支払手数料', '売掛金', 2000, { channel: 'mercari_shops' })
  ];
}

test('year-end stock follows the plant ledger', () => {
  scenario();
  const s = L.stockAt('2026-12-31');
  assert.deepStrictEqual(s.list.map(p => p.id), [4]);   // sold, mother and dead plants are out; plant 4 is in until 2027
  assert.strictEqual(s.value, 10000);
  assert.strictEqual(L.stockAt('2027-12-31').value, 0);
});

test('2026 profit and loss', () => {
  scenario();
  const p = L.pl(2026);
  assert.strictEqual(p.sales, 51000);
  assert.strictEqual(p.open, 0);
  assert.strictEqual(p.buy, 60000);        // 30k + 150k + 20k + 10k + 400k − 150k − 400k moved to the mother plants
  assert.strictEqual(p.close, 10000);
  assert.strictEqual(p.cogs, 50000);       // the sold plant and the dead plant
  assert.strictEqual(p.expTotal, 3656 + 3000 + 70000);
  assert.strictEqual(p.income, 51000 - 50000 - 76656);
});

test('balance sheet balances in both years and the capital rolls forward', () => {
  scenario();
  const b26 = L.bs(2026);
  assert.strictEqual(b26.left, b26.right);
  assert.strictEqual(b26.capital, 0);
  const b27 = L.bs(2027);
  assert.strictEqual(b27.left, b27.right);
  assert.strictEqual(b27.capital, b26.capital + b26.income + b26.cr - b26.dr);
  const p27 = L.pl(2027);
  assert.strictEqual(p27.open, 10000);
  assert.strictEqual(p27.cogs, 10000);
});

test('depreciation: lump sum over three years, straight line by month', () => {
  scenario();
  const lump = L.S.plants[1], straight = L.S.plants[4];
  assert.deepStrictEqual([2026, 2027, 2028, 2029].map(y => L.depFor(lump, y)), [50000, 50000, 50000, 0]);
  assert.strictEqual(L.depFor(straight, 2026), 20000);   // 400,000 / 10 × 6/12
  assert.strictEqual(L.depFor(straight, 2027), 40000);
});

test('shop balance (売掛金) per channel', () => {
  scenario();
  assert.strictEqual(L.movement('売掛金', null, null, 'base'), 0);
  assert.strictEqual(L.movement('売掛金', null, null, 'mercari_shops'), 18000);
});
