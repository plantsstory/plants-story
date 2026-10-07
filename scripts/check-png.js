// Every PNG in the repo must decode (two home-screen icons were found corrupted on 2026-10-08).
// Report only: prints the broken files and exits 1, and the deploy step does not block on it.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { execSync } = require('child_process');
function crc32(b) { let crc = 0xffffffff; for (let n = 0; n < b.length; n++) { let c = (crc ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function check(f) {
  const b = fs.readFileSync(f);
  if (b[0] === 0xff && b[1] === 0xd8) return null;   // a JPEG under a .png name: browsers show it by its content
  if (b.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') return 'bad signature';
  let p = 8; const idat = [];
  while (p + 12 <= b.length) {
    const len = b.readUInt32BE(p), type = b.slice(p + 4, p + 8).toString('latin1');
    if (p + 12 + len > b.length) return 'chunk ' + type + ' runs past the end';
    if (crc32(b.slice(p + 4, p + 8 + len)) !== b.readUInt32BE(p + 8 + len)) return 'crc ' + type;
    if (type === 'IDAT') idat.push(b.slice(p + 8, p + 8 + len));
    p += 12 + len;
    if (type === 'IEND') break;
  }
  try { zlib.inflateSync(Buffer.concat(idat)); } catch (e) { return 'image data: ' + e.message; }
  return null;
}
const files = execSync('git ls-files "*.png"', { encoding: 'utf8' }).split('\n').filter(Boolean);
let bad = 0;
for (const f of files) { const err = check(f); if (err) { bad++; console.log('BROKEN', f, '-', err); } }
console.log(files.length + ' PNG checked, ' + bad + ' broken');
process.exit(bad ? 1 : 0);
