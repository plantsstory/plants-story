// File name of a cultivar's share card: images/og/<slug>.png
// Mirrors window.ogSlug in wireframe/js/app-core.js and ogSlug in supabase/functions/share/index.ts — keep all three in sync.
'use strict';
function ogSlug(genus, name) {
  let rest = String(name || '').replace(' [Seedling]', '');
  if (genus && rest.toLowerCase().startsWith(String(genus).toLowerCase() + ' ')) rest = rest.slice(genus.length + 1);
  const s = (String(genus || '') + ' ' + rest).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'entry';
}
module.exports = { ogSlug };
