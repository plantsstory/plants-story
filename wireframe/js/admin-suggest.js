/* Admin: AI suggestions waiting for the owner (2026-10-08, the Opus re-research of the species records).
   Each row is one field of one entry: 空欄を埋める / 産地を詳しく / 記録と食い違い. Nothing changes until 採用;
   採用 writes the value and its sources into the entry's leading record (RPC decide_ai_suggestion), 見送る drops it.
   Admin reorganisation 2026-11-26: the list has its own page (AI の提案) instead of a card at the foot of the
   dashboard, each row links to its entry, and the same rows show on the entry's page.
   Uses admin.html globals: sb, toast, escapeHtml, allCultivars. */
(function () {
  'use strict';
  var FIELD = { type_locality: 'タイプ産地', collector: '採集者', collection_year: '採集年', known_habitats: '分布', author_name: '記載者', publication_year: '発表年' };
  var KIND = { fill: '空欄を埋める', refine: '産地を詳しく', conflict: '記録と食い違い' };
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  function safeUrl(u) { return /^https?:\/\//i.test(String(u || '')) ? String(u) : ''; }

  window.aiSuggestionRowHtml = function (s) {
    var links = (s.sources || []).slice(0, 4).map(function (l) {
      var u = safeUrl(l && l.url);
      return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(String(l.label || u).slice(0, 40)) + '</a>' : '';
    }).filter(Boolean).join(' · ');
    var entry = (window.allCultivars || []).find(function (c) { return c.id === s.cultivar_id; });
    return '<div class="ai-sug" data-id="' + s.id + '" style="border-top:1px solid var(--color-light,#ddd);padding:8px 0;">'
      + '<div>' + (entry ? '<a href="#" data-open-entry="' + entry.id + '"><em>' + esc(s.cultivar_name) + '</em></a>' : '<em>' + esc(s.cultivar_name) + '</em>')
      + ' — <strong>' + esc(FIELD[s.field] || s.field) + '</strong>'
      + ' <span style="font-size:var(--font-size-xs);color:var(--color-gray);">' + esc(KIND[s.kind] || s.kind) + '</span></div>'
      + '<div style="font-size:var(--font-size-sm);margin:2px 0;">今: ' + (s.current_value ? esc(s.current_value) : '<span style="color:var(--color-gray);">（空欄）</span>')
      + '<br>提案: <strong>' + esc(s.suggested_value) + '</strong></div>'
      + '<div style="font-size:var(--font-size-xs);">' + (links || '<span style="color:var(--color-gray);">出典なし（採用しないでください）</span>') + '</div>'
      + '<div style="margin-top:4px;display:flex;gap:8px;">'
      + '<button type="button" class="btn btn-primary btn-sm" data-ai-decide="1">採用</button>'
      + '<button type="button" class="btn btn-outline btn-sm" data-ai-decide="0">見送る</button></div></div>';
  };

  function badge(n) {
    var b = document.getElementById('ais-badge');
    if (!b) return;
    b.textContent = n ? String(n) : '';
    b.classList.toggle('d-none', !n);
  }

  window.loadAiSuggestions = async function () {
    var h = document.getElementById('ai-suggest-root');
    if (!h) return;
    h.innerHTML = '<p class="desc-text">読み込み中...</p>';
    var r = await sb.from('ai_suggestions').select('*').eq('status', 'pending').order('cultivar_name').order('field').limit(300);
    if (r.error) { h.innerHTML = '<p class="desc-text">読み込めませんでした（' + esc(r.error.message) + '）</p>'; return; }
    var rows = r.data || [];
    badge(rows.length);
    if (!rows.length) { h.innerHTML = '<p class="desc-text">確認待ちの提案はありません。</p>'; return; }
    h.innerHTML = '<div class="stat-card"><strong>確認待ち ' + rows.length + ' 件</strong>' + rows.map(window.aiSuggestionRowHtml).join('') + '</div>';
  };

  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-ai-decide]');
    if (!b) return;
    var row = b.closest('.ai-sug');
    var accept = b.getAttribute('data-ai-decide') === '1';
    row.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
    var r = await sb.rpc('decide_ai_suggestion', { p_id: Number(row.getAttribute('data-id')), p_accept: accept });
    if (r.error || !r.data || r.data.success === false) {
      toast('できませんでした: ' + ((r.error && r.error.message) || (r.data && r.data.error) || ''));
      row.querySelectorAll('button').forEach(function (x) { x.disabled = false; });
      return;
    }
    toast(accept ? '採用しました（サイトの静的ページは次のデプロイで更新）' : '見送りました');
    row.remove();
    if (accept && window.loadAllCultivars) window.loadAllCultivars();
    if (window.refreshInbox) window.refreshInbox();
  });
})();

/* Admin: changes to the origin records (board 9, T110). Every change is kept in origin_history;
   「取り消す」 puts the record back as it was before that change (RPC revert_origin_change).
   loadOriginHistory({ host, cultivarId, limit, open }) draws into host: all records (the 由来 tab) or one (the entry page). */
(function () {
  'use strict';
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  var PROV = { contributor: '人', database: 'DB', ai: 'AI', generated: '自動', editorial: '編集部' };
  function brief(origins) {
    return (origins || []).filter(function (o) { return o && !o._type; }).map(function (o) {
      return (PROV[o.provenance] || '?') + (o.provenance === 'contributor' ? '［鍵］' : '') + ' ' + String(o.body || '').slice(0, 40);
    }).join(' / ');
  }
  var last = null;
  window.loadOriginHistory = async function (opts) {
    opts = opts || last;
    if (!opts || !opts.host) return;
    last = opts;
    var h = opts.host, limit = opts.limit || 20;
    var q = sb.from('origin_history').select('id, cultivar_id, changed_at, changed_by, old_origins, new_origins').order('changed_at', { ascending: false }).limit(limit);
    if (opts.cultivarId) q = q.eq('cultivar_id', opts.cultivarId);
    var r = await q;
    if (r.error) { h.textContent = '変更の履歴: 読み込めませんでした（' + r.error.message + '）'; return; }
    var rows = r.data || [];
    if (!rows.length) { h.innerHTML = '<span class="desc-text">変更の記録はまだありません。</span>'; return; }
    var names = {};
    (window.allCultivars || []).forEach(function (c) { names[c.id] = c.cultivar_name; });
    var html = '<span style="font-size:var(--font-size-xs);color:var(--color-gray);">新しい順 ' + rows.length + ' 件。［鍵］は人が書いた本文で、本人以外は書き換えられません。</span>'
      + '<details' + (opts.open ? ' open' : '') + ' style="margin-top:6px;"><summary style="cursor:pointer;">一覧</summary>';
    rows.forEach(function (x) {
      var name = names[x.cultivar_id];
      html += '<div class="oh-row" data-id="' + x.id + '" style="border-top:1px solid var(--color-light,#ddd);padding:6px 0;font-size:var(--font-size-xs);">'
        + '<div>' + (opts.cultivarId ? '' : (name ? '<a href="#" data-open-entry="' + x.cultivar_id + '"><em>' + esc(name) + '</em></a> — ' : '<em>#' + esc(x.cultivar_id) + '</em> — '))
        + esc(String(x.changed_at).slice(0, 16).replace('T', ' ')) + '</div>'
        + '<div style="color:var(--color-gray);">前: ' + esc(brief(x.old_origins)) + '</div>'
        + '<div>後: ' + esc(brief(x.new_origins)) + '</div>'
        + '<button type="button" class="btn btn-outline btn-sm" data-oh-revert style="margin-top:4px;">この変更を取り消す</button></div>';
    });
    h.innerHTML = html + '</details>';
  };
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-oh-revert]');
    if (!b) return;
    var row = b.closest('.oh-row');
    if (!confirm('この変更の前の状態に戻します。よろしいですか？')) return;
    b.disabled = true;
    var r = await sb.rpc('revert_origin_change', { p_history_id: Number(row.getAttribute('data-id')) });
    if (r.error || !r.data || r.data.success === false) { toast('戻せませんでした: ' + ((r.error && r.error.message) || (r.data && r.data.error) || '')); b.disabled = false; return; }
    toast('元に戻しました');
    if (window.loadAllCultivars) await window.loadAllCultivars();
    if (!document.getElementById('sec-entry').classList.contains('hidden') && window.renderEntry) return;   // renderEntry redraws the history
    window.loadOriginHistory();
  });
})();
