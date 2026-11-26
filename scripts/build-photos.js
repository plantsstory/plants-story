// Resized copies of every public photo, written to wireframe/p/ and served by GitHub Pages.
// Visitors then load photos from Pages (free) instead of Supabase, whose Free plan allows 5 GB of photo traffic a
// month and lists image resizing as not included. Each photo gets SIZES widths as WebP; wireframe/data/photos.js
// tells the app which photos have copies, and window.galleryImg falls back to Supabase for any that don't.
// A copy already on the live site is downloaded from Pages, so a deploy fetches an original from Supabase only for
// a photo that is new since the last build. Never blocks a deploy: on any failure the app keeps using Supabase.
'use strict';
const fs = require('fs');
const path = require('path');
const { getAll } = require('./lib/rest');
const P = require('./lib/photos');

const SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
const LIVE = process.env.LIVE_SITE || 'https://aroidorigins.com';
// GitHub Pages allows a 1 GB site; the rest of the site is ≈30 MB. Past this many bytes of copies, newer photos
// stay on Supabase (and the log says so) rather than risk a failed deploy.
const BUDGET = Number(process.env.PHOTO_BUDGET_BYTES || 600 * 1024 * 1024);
const QUALITY = 72;

// public photos only, oldest first so that a full budget keeps the same photos from one build to the next
function pickPhotos(images, publicNames) {
  const seen = new Set(), out = [];
  for (const im of images) {
    const p = im && im.storage_path;
    if (!p || /^pv:/.test(p) || seen.has(p)) continue;
    if (publicNames && !publicNames.has(im.cultivar_name)) continue;
    seen.add(p); out.push(p);
  }
  return out;
}

async function resizeAll(buf, sharp) {
  const out = {};
  for (const w of P.SIZES) {
    out[w] = await sharp(buf).rotate().resize({ width: w, height: w * 2, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: QUALITY }).toBuffer();
  }
  return out;
}

const encode = p => String(p).split('/').map(encodeURIComponent).join('/');

async function fetchImage(url, doFetch) {
  try {
    const r = await doFetch(url);
    if (!r.ok || !/^image\//.test(r.headers.get('content-type') || '')) return null;
    return Buffer.from(await r.arrayBuffer());
  } catch (e) { return null; }
}

// copies for one photo: from the live site if every size is there, else made from the original
async function copiesFor(storagePath, deps) {
  const hash = P.hashOf(storagePath);
  const live = {};
  for (const w of P.SIZES) {
    const b = await fetchImage(LIVE + '/p/' + P.fileName(hash, w), deps.fetch);
    if (!b) break;
    live[w] = b;
  }
  if (Object.keys(live).length === P.SIZES.length) return { hash, files: live, from: 'live' };
  const orig = await fetchImage(SUPABASE_URL + '/storage/v1/object/public/gallery-images/' + encode(storagePath), deps.fetch);
  if (!orig) return null;
  return { hash, files: await deps.resize(orig), from: 'original' };
}

async function run(paths, deps) {
  const manifest = {}, counts = { live: 0, original: 0, failed: 0, overBudget: 0 };
  let bytes = 0;
  const queue = paths.slice();
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      if (bytes >= BUDGET) { counts.overBudget++; continue; }
      let c = null;
      try { c = await copiesFor(p, deps); } catch (e) { c = null; }
      if (!c) { counts.failed++; continue; }
      const size = Object.values(c.files).reduce((s, b) => s + b.length, 0);
      if (bytes + size > BUDGET) { counts.overBudget++; continue; }
      bytes += size;
      for (const w of P.SIZES) deps.write(P.fileName(c.hash, w), c.files[w]);
      manifest[p] = c.hash;
      counts[c.from]++;
    }
  }
  await Promise.all([1, 2, 3, 4].map(worker));
  // keep the manifest in the photos' own order, so the file only changes when photos do
  const ordered = {};
  for (const p of paths) if (manifest[p]) ordered[p] = manifest[p];
  return { manifest: ordered, counts, bytes };
}

function writeManifest(manifest) {
  fs.mkdirSync(path.dirname(P.MANIFEST_JSON), { recursive: true });
  fs.writeFileSync(P.MANIFEST_JSON, JSON.stringify({ sizes: P.SIZES, photos: manifest }));
  fs.writeFileSync(P.MANIFEST_JS, 'window._localPhotoSizes=' + JSON.stringify(P.SIZES) + ';window._localPhotos=' + JSON.stringify(manifest) + ';\n');
}

async function main() {
  const sharp = require('sharp');
  const cultivars = await getAll('/rest/v1/cultivars?select=cultivar_name&is_private=eq.false&order=id');
  const images = await getAll('/rest/v1/cultivar_images?select=cultivar_name,storage_path&order=id');
  const paths = pickPhotos(images, new Set(cultivars.map(c => c.cultivar_name)));
  fs.rmSync(P.DIR, { recursive: true, force: true });
  fs.mkdirSync(P.DIR, { recursive: true });
  const { manifest, counts, bytes } = await run(paths, {
    fetch,
    resize: buf => resizeAll(buf, sharp),
    write: (name, buf) => fs.writeFileSync(path.join(P.DIR, name), buf)
  });
  writeManifest(manifest);
  console.log('photo copies: ' + Object.keys(manifest).length + ' of ' + paths.length + ' photos (' + counts.live + ' from the live site, '
    + counts.original + ' made from originals, ' + counts.failed + ' failed, ' + counts.overBudget + ' over budget), '
    + Math.round(bytes / 1024 / 1024 * 10) / 10 + ' MB');
  if (counts.overBudget) console.log('::warning::' + counts.overBudget + ' photos are over the Pages budget and stay on Supabase');
}

module.exports = { pickPhotos, run, copiesFor, writeManifest };
if (require.main === module) main().catch(e => {
  try { writeManifest({}); } catch (_) {}
  console.log('photo copies not made (' + e.message + '); the app loads photos from Supabase');
});
