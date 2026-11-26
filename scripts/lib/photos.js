// Resized copies of the public photos, made at deploy time and served by GitHub Pages
// (scripts/build-photos.js), so visitors don't use the Supabase Free plan's 5 GB/month.
// The browser reads wireframe/data/photos.js; the build scripts read photos.json.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SIZES = [240, 480, 800, 1200];      // galleryImg(path, w) takes the first size ≥ w; above 1200 → Supabase
const VERSION = 'v1';                     // change to remake every copy (new size or quality)
const ROOT = path.join(__dirname, '..', '..', 'wireframe');
const DIR = path.join(ROOT, 'p');
const MANIFEST_JSON = path.join(ROOT, 'data', 'photos.json');
const MANIFEST_JS = path.join(ROOT, 'data', 'photos.js');

const hashOf = storagePath => crypto.createHash('sha1').update(VERSION + ':' + storagePath).digest('hex').slice(0, 16);
const fileName = (hash, w) => hash + '-' + w + '.webp';
const sizeFor = w => SIZES.find(s => s >= (w || 640)) || null;

function loadManifest() {
  try { return JSON.parse(fs.readFileSync(MANIFEST_JSON, 'utf8')).photos || {}; } catch (e) { return {}; }
}
// '/p/<hash>-<size>.webp' when a copy was made for this photo and size, else ''
function localUrl(manifest, storagePath, w) {
  const h = manifest && manifest[storagePath];
  const s = sizeFor(w);
  return h && s ? '/p/' + fileName(h, s) : '';
}
function localFile(manifest, storagePath, w) {
  const h = manifest && manifest[storagePath];
  const s = sizeFor(w);
  return h && s ? path.join(DIR, fileName(h, s)) : '';
}

module.exports = { SIZES, VERSION, DIR, MANIFEST_JSON, MANIFEST_JS, hashOf, fileName, sizeFor, loadManifest, localUrl, localFile };
