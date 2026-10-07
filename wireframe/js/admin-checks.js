/* Admin: the automatic name and text checks (BOARD 10-07b T103). CI writes data/name-check.json on every deploy;
   the dashboard shows the count and the list. Nothing here changes data. */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  window.loadNameChecks = async function () {
    var dash = document.getElementById('sec-dashboard');
    if (!dash) return;
    var host = document.getElementById('name-check-card');
    if (!host) { host = document.createElement('div'); host.id = 'name-check-card'; host.className = 'stat-card'; host.style.marginTop = 'var(--space-sm)'; dash.appendChild(host); }
    var j;
    try { var r = await fetch('data/name-check.json?t=' + Date.now()); if (!r.ok) throw new Error(r.status); j = await r.json(); }
    catch (e) { host.textContent = 'データ点検: まだ結果がありません（次のデプロイで作られます）'; return; }
    var errs = j.issues.filter(function (i) { return i.level === 'error'; }), warns = j.issues.filter(function (i) { return i.level !== 'error'; });
    var html = '<strong>データ点検</strong> — 収録 ' + j.recorded + ' 件 · 要修正 ' + errs.length + ' · 確認 ' + warns.length
      + ' <span style="font-size:var(--font-size-xs);color:var(--color-gray);">（' + esc(String(j.checked_at).slice(0, 16).replace('T', ' ')) + ' 時点、デプロイごとに更新）</span>';
    if (j.issues.length) {
      html += '<details style="margin-top:6px;"><summary style="cursor:pointer;">一覧を開く</summary><ul style="margin:6px 0 0;padding-left:18px;font-size:var(--font-size-xs);">'
        + j.issues.map(function (i) { return '<li>' + (i.level === 'error' ? '<strong>要修正</strong> ' : '') + esc(i.name) + ' — ' + esc(i.msg) + '</li>'; }).join('') + '</ul></details>';
    }
    host.innerHTML = html;
  };
  document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { if (window.loadNameChecks) window.loadNameChecks(); }, 1200); });
})();
