// Every entry's address, decided once for the static pages and the sitemap (site check 11-26, item 8).
// The address is EntryMeta.segment of the name after the genus (ace-of-spades). A name whose address does not
// change (a plain species, wendlingeri) is placed first; when two names would share an address, the later one
// keeps its old address (the encoded name), so no page is written over another.
const EntryMeta = require('../../wireframe/js/entry-meta');

const fullNameOf = (name, genus) => {
  const n = String(name).replace(' [Seedling]', '');
  const g = genus || n.split(' ')[0] || 'Anthurium';
  return n.startsWith(g + ' ') ? n : g + ' ' + n;
};
const restOf = full => full.slice(full.split(' ')[0].length + 1);

// rows -> Map(full name -> URL segment)
function assign(rows, warn) {
  const addr = new Map(), taken = new Set();
  const fulls = [...new Set(rows.map(c => fullNameOf(c.cultivar_name, c.genus || 'Anthurium')))];
  const same = f => EntryMeta.segment(restOf(f)) === encodeURIComponent(restOf(f));
  fulls.sort((a, b) => same(b) - same(a));
  for (const f of fulls) {
    const dirOf = seg => f.split(' ')[0].toLowerCase() + '/' + decodeURIComponent(seg);
    let seg = EntryMeta.segment(restOf(f));
    if (taken.has(dirOf(seg))) {
      if (warn) warn('address taken twice, ' + f + ' keeps its old address');
      seg = encodeURIComponent(restOf(f));
      if (taken.has(dirOf(seg))) { if (warn) warn('no free address for ' + f); continue; }
    }
    taken.add(dirOf(seg));
    addr.set(f, seg);
  }
  return addr;
}

module.exports = { assign, fullNameOf, restOf };
