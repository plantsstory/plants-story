// The build reads every entry and photo, not only the first 1,000 (the API's max_rows)
// Run: node --test tests/rest-paging.test.js
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');
var { getAll } = require('../scripts/lib/rest');

function fakeApi(total, maxRows) {
  var calls = [];
  var rows = Array.from({ length: total }, function(_, i) { return { id: i + 1 }; });
  function fetchFn(url) {
    calls.push(url);
    var u = new URL(url);
    var limit = Math.min(parseInt(u.searchParams.get('limit'), 10), maxRows);
    var offset = parseInt(u.searchParams.get('offset'), 10);
    var page = rows.slice(offset, offset + limit);
    return Promise.resolve({ ok: true, status: 200, json: function() { return Promise.resolve(page); } });
  }
  return { fetch: fetchFn, calls: calls };
}

test('getAll reads past 1,000 rows', async function() {
  var api = fakeApi(2345, 1000);
  var rows = await getAll('/rest/v1/cultivars?select=id&order=id', { fetch: api.fetch });
  assert.equal(rows.length, 2345);
  assert.equal(new Set(rows.map(function(r) { return r.id; })).size, 2345);
  assert.equal(api.calls.length, 3);
});

test('getAll stops after one request when everything fits', async function() {
  var api = fakeApi(40, 1000);
  var rows = await getAll('/rest/v1/cultivars?select=id&order=id', { fetch: api.fetch });
  assert.equal(rows.length, 40);
  assert.equal(api.calls.length, 1);
});

test('getAll reads exactly 1,000 rows with one empty request after', async function() {
  var api = fakeApi(1000, 1000);
  var rows = await getAll('/rest/v1/cultivars?select=id&order=id', { fetch: api.fetch });
  assert.equal(rows.length, 1000);
  assert.equal(api.calls.length, 2);
});

test('getAll refuses an order that does not end on a unique column', async function() {
  await assert.rejects(getAll('/rest/v1/cultivars?select=id&order=genus', { fetch: fakeApi(1, 1000).fetch }));
});

test('getAll fails loudly on an API error', async function() {
  var bad = function() { return Promise.resolve({ ok: false, status: 500, json: function() { return Promise.resolve({}); } }); };
  await assert.rejects(getAll('/rest/v1/cultivars?select=id&order=id', { fetch: bad }));
});

test('no build script reads cultivars or photos without paging', function() {
  var dir = __dirname + '/../scripts/';
  fs.readdirSync(dir).filter(function(f) { return /\.js$/.test(f); }).forEach(function(f) {
    var src = fs.readFileSync(dir + f, 'utf8');
    var bare = src.match(/(?:fetchJSON|getJSON|fetch)\([^)]*\/rest\/v1\/(?:cultivars|cultivar_images)\?select=(?!id&order=id\.desc)[^)]*\)/g) || [];
    bare = bare.filter(function(m) { return !/limit=1\b|method: 'HEAD'|Prefer/.test(m); });
    assert.deepEqual(bare, [], f + ' reads a whole table without paging');
  });
});

// the browser's copy of the same loop (app-core.js fetchAllRows), run against a fake supabase query
test('fetchAllRows in the app reads past 1,000 rows', async function() {
  var src = fs.readFileSync(__dirname + '/../wireframe/js/app-core.js', 'utf8');
  var start = src.indexOf('function fetchAllRows(');
  var depth = 0, end = start;
  for (var i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++; else if (src[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  var fetchAllRows = new Function(src.slice(start, end) + '; return fetchAllRows;')();
  var total = 2500, ranges = [];
  function makeQuery() {
    return { range: function(from, to) {
      ranges.push([from, to]);
      var data = [];
      for (var k = from; k <= Math.min(to, from + 999, total - 1); k++) data.push({ id: k + 1 });
      return Promise.resolve({ data: data, error: null });
    } };
  }
  var res = await fetchAllRows(makeQuery);
  assert.equal(res.error, null);
  assert.equal(res.data.length, 2500);
  assert.deepEqual(ranges, [[0, 999], [1000, 1999], [2000, 2999]]);
  var failing = function() { return { range: function() { return Promise.resolve({ data: null, error: { message: 'x' } }); } }; };
  var bad = await fetchAllRows(failing);
  assert.equal(bad.data, null);
});
