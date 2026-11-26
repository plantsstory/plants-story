// The list file built at deploy plus what changed since gives the same list as reading every entry
// Run: node --test tests/archive-file.test.js
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');

var src = fs.readFileSync(__dirname + '/../wireframe/js/app-core.js', 'utf8');
function extract(name) {
  var start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error(name + ' not found');
  var depth = 0;
  for (var i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++; else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
}
var colsLine = src.match(/var ARCHIVE_COLUMNS = '[^']*';/)[0];
function build(supabase, fetchFn) {
  return new Function('supabase', 'fetch', colsLine + ';' + ['fetchAllRows', 'mergeArchiveRows', 'staleArchiveIds', 'loadArchiveRows'].map(extract).join('\n') +
    '; return { mergeArchiveRows: mergeArchiveRows, staleArchiveIds: staleArchiveIds, loadArchiveRows: loadArchiveRows };')(supabase, fetchFn);
}

// a fake table and a fake supabase-js query builder over it
function fakeDb(rows, opts) {
  opts = opts || {};
  var log = [];
  function query(cols) {
    var q = { cols: cols, ids: null, from: 0, to: 1e9 };
    var api = {
      order: function() { return api; },
      range: function(a, b) { q.from = a; q.to = b; return api; },
      in: function(_, ids) { q.ids = ids; return api; },
      then: function(ok, bad) {
        log.push(q);
        if (opts.noChangedAt && /changed_at/.test(cols)) return Promise.resolve({ data: null, error: { message: 'column cultivars.changed_at does not exist' } }).then(ok, bad);
        var list = rows.filter(function(r) { return !q.ids || q.ids.indexOf(r.id) >= 0; }).slice(q.from, q.to + 1);
        var keys = cols.split(',').map(function(c) { return c.trim(); });
        list = list.map(function(r) { var o = {}; keys.forEach(function(k) { o[k] = r[k]; }); return o; });
        return Promise.resolve({ data: list, error: null }).then(ok, bad);
      }
    };
    return api;
  }
  return { log: log, client: { from: function() { return { select: query }; } } };
}
function row(id, changed, name) { return { id: id, cultivar_name: name || ('N' + id), changed_at: changed, origins: [] }; }
function fileFetch(file) { return function() { return Promise.resolve({ ok: !!file, json: function() { return Promise.resolve(file); } }); }; }

test('staleArchiveIds lists new and changed entries only', function() {
  var f = build(null, null);
  var file = [row(1, 'a'), row(2, 'a'), row(3, 'a')];
  assert.deepEqual(f.staleArchiveIds(file, [{ id: 1, changed_at: 'a' }, { id: 2, changed_at: 'b' }, { id: 4, changed_at: 'a' }]), [2, 4]);
});

test('mergeArchiveRows keeps unchanged, swaps changed, adds new, drops deleted', function() {
  var f = build(null, null);
  var out = f.mergeArchiveRows([row(1, 'a', 'old1'), row(2, 'a', 'old2'), row(3, 'a', 'gone')],
    [{ id: 1, changed_at: 'a' }, { id: 2, changed_at: 'b' }, { id: 4, changed_at: 'a' }],
    [row(2, 'b', 'new2'), row(4, 'a', 'new4')]);
  assert.deepEqual(out.map(function(r) { return r.cultivar_name; }), ['old1', 'new2', 'new4']);
});

test('loadArchiveRows: file + one small manifest + only the changed rows', async function() {
  var live = [row(1, 't1'), row(2, 't9', 'edited'), row(4, 't1', 'added')];
  var db = fakeDb(live);
  var file = { rows: [row(1, 't1'), row(2, 't1', 'before'), row(3, 't1', 'deleted')] };
  var res = await build(db.client, fileFetch(file)).loadArchiveRows();
  assert.equal(res.error, null);
  assert.deepEqual(res.data.map(function(r) { return r.cultivar_name; }), ['N1', 'edited', 'added']);
  var full = db.log.filter(function(q) { return /origins/.test(q.cols); });
  assert.equal(full.length, 1);
  assert.deepEqual(full[0].ids, [2, 4]);
});

test('loadArchiveRows reads the whole list when the file is missing', async function() {
  var db = fakeDb([row(1, 't'), row(2, 't')]);
  var res = await build(db.client, fileFetch(null)).loadArchiveRows();
  assert.equal(res.data.length, 2);
  assert.ok(db.log.every(function(q) { return !/changed_at/.test(q.cols); }));
});

test('loadArchiveRows reads the whole list before the changed_at column exists', async function() {
  var db = fakeDb([row(1, 't'), row(2, 't')], { noChangedAt: true });
  var res = await build(db.client, fileFetch({ rows: [row(1, 't')] })).loadArchiveRows();
  assert.equal(res.error, null);
  assert.equal(res.data.length, 2);
});

test('the build writes the same columns the app reads', function() {
  var cols = require('../scripts/build-cultivars-json').COLUMNS;
  var app = colsLine.match(/'([^']*)'/)[1].split(',').map(function(c) { return c.trim(); }).join(',');
  assert.equal(cols, app);
});
