// Photos come from the deploy-time copies on Pages when there are, and from Supabase otherwise
// Run: node --test tests/local-photos.test.js
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');
var P = require('../scripts/lib/photos');
var B = require('../scripts/build-photos');

var src = fs.readFileSync(__dirname + '/../wireframe/js/app-core.js', 'utf8');
function extract(name) {
  var start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error(name + ' not found');
  var depth = 0;
  for (var i = src.indexOf('{', start); i < src.length; i++) {
    if (src[i] === '{') depth++; else if (src[i] === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
}
var app = new Function('window', 'var _localPhotoByHash = null, _localPhotoByHashOf = null;' + extract('localPhotoUrl') + extract('localPhotoSource') +
  '; return { localPhotoUrl: localPhotoUrl, localPhotoSource: localPhotoSource };')({});

var photos = { "Anthurium 'King of Spades'/1.jpg": 'aaaaaaaaaaaaaaaa', 'Anthurium carlablackiae/2.jpeg': 'bbbbbbbbbbbbbbbb' };
var sizes = [240, 480, 800, 1200];

test('the app picks the smallest copy at least as wide as asked', function () {
  assert.equal(app.localPhotoUrl('Anthurium carlablackiae/2.jpeg', 120, photos, sizes), '/p/bbbbbbbbbbbbbbbb-240.webp');
  assert.equal(app.localPhotoUrl('Anthurium carlablackiae/2.jpeg', 480, photos, sizes), '/p/bbbbbbbbbbbbbbbb-480.webp');
  assert.equal(app.localPhotoUrl('Anthurium carlablackiae/2.jpeg', 720, photos, sizes), '/p/bbbbbbbbbbbbbbbb-800.webp');
  assert.equal(app.localPhotoUrl('Anthurium carlablackiae/2.jpeg', 1200, photos, sizes), '/p/bbbbbbbbbbbbbbbb-1200.webp');
});

test('a size above every copy, an unknown photo or no manifest leaves it to Supabase', function () {
  assert.equal(app.localPhotoUrl('Anthurium carlablackiae/2.jpeg', 1600, photos, sizes), '');
  assert.equal(app.localPhotoUrl('Anthurium new/3.jpg', 480, photos, sizes), '');
  assert.equal(app.localPhotoUrl('constructor', 480, photos, sizes), '');
  assert.equal(app.localPhotoUrl('Anthurium carlablackiae/2.jpeg', 480, undefined, undefined), '');
});

test('a failed copy is traced back to its photo and size for the Supabase fallback', function () {
  assert.deepEqual(app.localPhotoSource('https://aroidorigins.com/p/aaaaaaaaaaaaaaaa-800.webp', photos), { path: "Anthurium 'King of Spades'/1.jpg", width: 800 });
  assert.equal(app.localPhotoSource('https://aroidorigins.com/p/cccccccccccccccc-800.webp', photos), null);
  assert.equal(app.localPhotoSource('https://x.supabase.co/storage/v1/render/image/public/gallery-images/a.jpg', photos), null);
});

test('the build scripts and the app agree on addresses', function () {
  var m = { 'Anthurium carlablackiae/2.jpeg': 'bbbbbbbbbbbbbbbb' };
  [120, 360, 720, 1080, 1200].forEach(function (w) {
    assert.equal(P.localUrl(m, 'Anthurium carlablackiae/2.jpeg', w), app.localPhotoUrl('Anthurium carlablackiae/2.jpeg', w, m, P.SIZES));
  });
  assert.match(P.hashOf('a/b.jpg'), /^[0-9a-f]{16}$/);
  assert.notEqual(P.hashOf('a/b.jpg'), P.hashOf('a/c.jpg'));
});

test('only public, non-private photos get copies, each once', function () {
  var images = [
    { cultivar_name: 'A', storage_path: 'A/1.jpg' },
    { cultivar_name: 'A', storage_path: 'A/1.jpg' },
    { cultivar_name: 'A', storage_path: 'pv:A/2.jpg' },
    { cultivar_name: 'Hidden', storage_path: 'Hidden/3.jpg' },
    { cultivar_name: 'B', storage_path: '' },
    { cultivar_name: 'B', storage_path: 'B/4.jpg' }
  ];
  assert.deepEqual(B.pickPhotos(images, new Set(['A', 'B'])), ['A/1.jpg', 'B/4.jpg']);
});

function fakeFetch(live) {
  var log = [];
  var f = function (url) {
    log.push(url);
    var hit = live[url] !== undefined ? live[url] : (/\/object\/public\//.test(url) ? 'ORIGINAL' : null);
    return Promise.resolve({ ok: hit !== null, headers: { get: function () { return 'image/webp'; } }, arrayBuffer: function () { return Promise.resolve(Buffer.from(hit || '')); } });
  };
  f.log = log;
  return f;
}

test('a copy already on the live site is reused; a new photo is made from its original', async function () {
  var h = P.hashOf('A/1.jpg'), live = {};
  P.SIZES.forEach(function (w) { live['https://aroidorigins.com/p/' + P.fileName(h, w)] = 'live' + w; });
  var f = fakeFetch(live), written = {}, resized = 0;
  var out = await B.run(['A/1.jpg', 'B/2.jpg'], {
    fetch: f,
    resize: function () { resized++; var o = {}; P.SIZES.forEach(function (w) { o[w] = Buffer.from('made' + w); }); return Promise.resolve(o); },
    write: function (name, buf) { written[name] = String(buf); }
  });
  assert.deepEqual(Object.keys(out.manifest), ['A/1.jpg', 'B/2.jpg']);
  assert.equal(out.counts.live, 1);
  assert.equal(out.counts.original, 1);
  assert.equal(resized, 1);
  assert.equal(written[P.fileName(h, 800)], 'live800');
  assert.equal(written[P.fileName(P.hashOf('B/2.jpg'), 800)], 'made800');
  assert.equal(f.log.filter(function (u) { return /\/object\/public\/gallery-images\/A/.test(u); }).length, 0, 'no Supabase download for a reused photo');
});

test('a photo whose original cannot be read is left to Supabase', async function () {
  var f = function () { return Promise.resolve({ ok: false, headers: { get: function () { return ''; } } }); };
  var out = await B.run(['A/1.jpg'], { fetch: f, resize: function () { throw new Error('not called'); }, write: function () {} });
  assert.deepEqual(out.manifest, {});
  assert.equal(out.counts.failed, 1);
});
