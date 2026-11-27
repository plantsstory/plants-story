/* Admin: 投稿の点検 (owner 2026-11-27). Each new entry is checked once, right after it is posted: the kind
   (原種 incl. sp. / Hybrid / Clone / 実生) and the spelling of the name. Free checks first (the site's naming rules, the
   registered list, GBIF), then the AI once. Nothing in the entry is changed; the owner fixes it on the entry page if
   needed and marks the check 確認した (RPC review_post_check). Rows: post_checks (see migration 20261127140000).
   Uses admin.html globals: sb, toast, escapeHtml, allCultivars. */
(function () {
  'use strict';
  var AREA = { kind: '区分', spelling: '綴り', duplicate: '重複' };
  var SRC = { rule: '決まり', list: '登録済み一覧', gbif: 'GBIF', ai: 'AI' };
  var KIND = { species: '原種', hybrid: 'Hybrid', clone: 'Clone', seedling: '実生' };
  var PAR = { species: '原種', hybrid: 'Hybrid', unknown: '不明' };
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  function fmt(d) { return d ? String(new Date(d).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })) : ''; }

  function kindOf(c) {
    if (!c) return '';
    var k = KIND[c.type] || c.type;
    var p = (c.tags || []).filter(function (t) { return String(t).indexOf('parentage:') === 0; })[0];
    return p && (c.type === 'clone' || c.type === 'hybrid') ? k + '（' + (PAR[p.slice(10)] || p.slice(10)) + '）' : k;
  }

  function flagHtml(f) {
    var warn = f.level === 'warn';
    return '<li class="pc-flag' + (warn ? ' pc-flag--warn' : '') + '">'
      + '<span class="pc-area">' + (warn ? '⚠ ' : '') + esc(AREA[f.area] || f.area) + '</span> '
      + esc(f.msg)
      + (f.suggest_kind && f.src !== 'ai' ? ' <span class="pc-sug">→ ' + esc(KIND[f.suggest_kind] || f.suggest_kind) + '</span>' : '')
      + (f.suggest && f.area === 'spelling' ? ' <span class="pc-sug">→ ' + esc(f.suggest) + '</span>' : '')
      + ' <span class="pc-src">' + esc(SRC[f.src] || f.src) + '</span></li>';
  }

  window.postCheckRowHtml = function (p) {
    var c = (window.allCultivars || []).find(function (x) { return x.id === p.cultivar_id; });
    var flags = (p.flags || []).slice().sort(function (a, b) { return (a.level === 'warn' ? 0 : 1) - (b.level === 'warn' ? 0 : 1); });
    var name = c ? '<a href="#" data-open-entry="' + c.id + '"><em>' + esc(c.cultivar_name) + '</em></a>' : '<em>' + esc(p.cultivar_name) + '</em>';
    return '<div class="pc-row' + (p.marked ? ' pc-row--marked' : '') + '" data-id="' + p.id + '">'
      + '<div class="pc-head">' + name + ' <span class="pc-kind">' + esc(kindOf(c)) + '</span></div>'
      + '<div class="item-meta">' + esc(fmt(p.created_at)) + ' の投稿 · '
      + (p.status === 'failed' ? '点検できませんでした' : p.ai_used ? 'AI も点検' : '無料の点検のみ')
      + (p.error ? '（' + esc(p.error) + '）' : '') + '</div>'
      + (flags.length ? '<ul class="pc-flags">' + flags.map(flagHtml).join('') + '</ul>' : '<div class="item-meta">気になる所は見つかりませんでした。</div>')
      + '<div class="pc-actions">'
      + (c ? '<button type="button" class="btn btn-outline btn-sm" data-open-entry="' + c.id + '">記録を開いて直す</button>' : '')
      + '<button type="button" class="btn btn-primary btn-sm" data-pc-review>確認した</button></div></div>';
  };

  function badge(n) {
    var b = document.getElementById('pc-badge');
    if (!b) return;
    b.textContent = n ? String(n) : '';
    b.classList.toggle('d-none', !n);
  }

  window.loadPostChecks = async function () {
    var h = document.getElementById('post-checks-root');
    if (!h) return;
    h.innerHTML = '<p class="desc-text">読み込み中...</p>';
    var r = await sb.from('post_checks').select('*').is('reviewed_at', null).order('created_at', { ascending: false }).limit(300);
    if (r.error) { h.innerHTML = '<p class="desc-text">読み込めませんでした（' + esc(r.error.message) + '）</p>'; return; }
    var rows = r.data || [];
    var waiting = rows.filter(function (p) { return p.status === 'queued' || p.status === 'checking'; });
    var done = rows.filter(function (p) { return p.status === 'checked' || p.status === 'failed'; });
    var marked = done.filter(function (p) { return p.marked || p.status === 'failed'; });
    var clean = done.filter(function (p) { return !(p.marked || p.status === 'failed'); });
    badge(marked.length);
    var html = '';
    if (waiting.length) html += '<p class="desc-text">点検待ち ' + waiting.length + ' 件（投稿の直後に1回だけ点検します）</p>';
    html += '<div class="stat-card"><strong>印のついた投稿 ' + marked.length + ' 件</strong>'
      + (marked.length ? marked.map(window.postCheckRowHtml).join('') : '<p class="desc-text">ありません。</p>') + '</div>';
    if (clean.length) {
      html += '<details class="stat-card mt-md"><summary style="cursor:pointer;">印のない投稿 ' + clean.length + ' 件</summary>'
        + clean.map(window.postCheckRowHtml).join('')
        + '<div class="pc-actions"><button type="button" class="btn btn-outline btn-sm" data-pc-review-clean>印のない投稿をまとめて確認済みにする</button></div></details>';
    }
    h.innerHTML = html;
  };

  async function review(row) {
    var r = await sb.rpc('review_post_check', { p_id: Number(row.getAttribute('data-id')) });
    return !(r.error || !r.data || r.data.success === false);
  }

  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-pc-review], [data-pc-review-clean]');
    if (!b) return;
    b.disabled = true;
    var rows = b.hasAttribute('data-pc-review-clean')
      ? Array.prototype.slice.call(b.closest('details').querySelectorAll('.pc-row'))
      : [b.closest('.pc-row')];
    var ok = 0;
    for (var i = 0; i < rows.length; i++) if (await review(rows[i])) { rows[i].remove(); ok++; }
    if (ok < rows.length) { toast('確認済みにできなかったものがあります'); b.disabled = false; }
    else toast('確認済みにしました');
    window.loadPostChecks();
    if (window.refreshInbox) window.refreshInbox();
  });
})();
