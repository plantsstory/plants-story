// Read every row of a Supabase REST query, 1,000 at a time.
// The API returns at most 1,000 rows per request (supabase/config.toml: [api] max_rows = 1000), so a plain
// fetch silently stops at the 1,000th entry or photo. The path must sort on a unique column last (…,id) so
// that pages neither skip nor repeat rows.
'use strict';
const SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';
const PAGE = 1000;

async function getAll(path, opts) {
  opts = opts || {};
  const base = opts.url || SUPABASE_URL, key = opts.key || SUPABASE_ANON_KEY, pageSize = opts.pageSize || PAGE;
  const doFetch = opts.fetch || fetch;
  if (!/[?&]order=[^&]*\bid\b/.test(path)) throw new Error('getAll: ' + path + ' needs an order that ends on id');
  const out = [];
  for (let offset = 0; ; offset += pageSize) {
    const url = base + path + (path.includes('?') ? '&' : '?') + 'limit=' + pageSize + '&offset=' + offset;
    const r = await doFetch(url, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
    if (!r.ok) throw new Error('fetch ' + path + ' (offset ' + offset + ') → ' + r.status);
    const rows = await r.json();
    if (!Array.isArray(rows)) throw new Error('fetch ' + path + ' did not return a list');
    for (const row of rows) out.push(row);
    if (rows.length < pageSize) return out;
  }
}

module.exports = { getAll, PAGE };
