/* Admin: AI suggestions waiting for the owner (2026-10-08, the Opus re-research of the species records).
   Each row is one field of one entry: 空欄を埋める / 産地を詳しく / 記録と食い違い. Nothing changes until 採用;
   採用 writes the value and its sources into the entry's leading record (RPC decide_ai_suggestion), 見送る drops it.
   Uses admin.html globals: sb, toast, escapeHtml. */
(function () {
  'use strict';
  var FIELD = { type_locality: 'タイプ産地', collector: '採集者', collection_year: '採集年', known_habitats: '分布', author_name: '記載者', publication_year: '発表年' };
  var KIND = { fill: '空欄を埋める', refine: '産地を詳しく', conflict: '記録と食い違い' };
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  function host() {
    var dash = document.getElementById('sec-dashboard');
    if (!dash) return null;
    var h = document.getElementById('ai-suggest-card');
    if (!h) { h = document.createElement('div'); h.id = 'ai-suggest-card'; h.className = 'stat-card'; h.style.marginTop = 'var(--space-sm)'; dash.appendChild(h); }
    return h;
  }
  window.loadAiSuggestions = async function () {
    var h = host();
    if (!h) return;
    var r = await sb.from('ai_suggestions').select('*').eq('status', 'pending').order('cultivar_name').order('field').limit(300);
    if (r.error) { h.textContent = 'AI の提案: 読み込めませんでした（' + r.error.message + '）'; return; }
    var rows = r.data || [];
    if (!rows.length) { h.innerHTML = '<strong>AI の提案</strong> — 確認待ちはありません'; return; }
    var html = '<strong>AI の提案</strong> — 確認待ち ' + rows.length + ' 件'
      + ' <span style="font-size:var(--font-size-xs);color:var(--color-gray);">（Claude Opus が出典つきで調べた値。「採用」でその品種の記録に入ります）</span>'
      + '<details open style="margin-top:6px;"><summary style="cursor:pointer;">一覧</summary><div style="margin-top:6px;">';
    rows.forEach(function (s) {
      var links = (s.sources || []).slice(0, 4).map(function (l) { return '<a href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc((l.label || l.url).slice(0, 40)) + '</a>'; }).join(' · ');
      html += '<div class="ai-sug" data-id="' + s.id + '" style="border-top:1px solid var(--color-light,#ddd);padding:8px 0;">'
        + '<div><em>' + esc(s.cultivar_name) + '</em> — <strong>' + esc(FIELD[s.field] || s.field) + '</strong>'
        + ' <span style="font-size:var(--font-size-xs);color:var(--color-gray);">' + esc(KIND[s.kind] || s.kind) + '</span></div>'
        + '<div style="font-size:var(--font-size-sm);margin:2px 0;">今: ' + (s.current_value ? esc(s.current_value) : '<span style="color:var(--color-gray);">（空欄）</span>')
        + '<br>提案: <strong>' + esc(s.suggested_value) + '</strong></div>'
        + '<div style="font-size:var(--font-size-xs);">' + (links || '<span style="color:var(--color-gray);">出典なし（採用しないでください）</span>') + '</div>'
        + '<div style="margin-top:4px;display:flex;gap:8px;">'
        + '<button type="button" class="btn btn-primary btn-sm" data-ai-decide="1">採用</button>'
        + '<button type="button" class="btn btn-secondary btn-sm" data-ai-decide="0">見送る</button></div></div>';
    });
    html += '</div></details>';
    h.innerHTML = html;
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
  });
  document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { if (window.loadAiSuggestions) window.loadAiSuggestions(); }, 1400); });
})();

/* Admin: recent changes to the origin records (board 9, T110). Every change is kept in origin_history;
   「取り消す」 puts the record back as it was before that change (RPC revert_origin_change). */
(function () {
  'use strict';
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  var PROV = { contributor: '人', database: 'DB', ai: 'AI', generated: '自動', editorial: '編集部' };
  function brief(origins) {
    return (origins || []).filter(function (o) { return o && !o._type; }).map(function (o) {
      return (PROV[o.provenance] || '?') + (o.provenance === 'contributor' ? '［鍵］' : '') + ' ' + String(o.body || '').slice(0, 40);
    }).join(' / ');
  }
  window.loadOriginHistory = async function () {
    var dash = document.getElementById('sec-dashboard');
    if (!dash) return;
    var h = document.getElementById('origin-history-card');
    if (!h) { h = document.createElement('div'); h.id = 'origin-history-card'; h.className = 'stat-card'; h.style.marginTop = 'var(--space-sm)'; dash.appendChild(h); }
    var r = await sb.from('origin_history').select('id, cultivar_id, changed_at, changed_by, old_origins, new_origins').order('changed_at', { ascending: false }).limit(20);
    if (r.error) { h.textContent = '由来の変更履歴: 読み込めませんでした（' + r.error.message + '）'; return; }
    var ids = Array.from(new Set((r.data || []).map(function (x) { return x.cultivar_id; })));
    var names = {};
    if (ids.length) { var c = await sb.from('cultivars').select('id, cultivar_name').in('id', ids); (c.data || []).forEach(function (x) { names[x.id] = x.cultivar_name; }); }
    var html = '<strong>由来の変更履歴</strong> <span style="font-size:var(--font-size-xs);color:var(--color-gray);">（新しい順 20 件。［鍵］は人が書いた本文で、本人以外は書き換えられません）</span>'
      + '<details style="margin-top:6px;"><summary style="cursor:pointer;">一覧を開く</summary>';
    (r.data || []).forEach(function (x) {
      html += '<div class="oh-row" data-id="' + x.id + '" style="border-top:1px solid var(--color-light,#ddd);padding:6px 0;font-size:var(--font-size-xs);">'
        + '<div><em>' + esc(names[x.cultivar_id] || ('#' + x.cultivar_id)) + '</em> — ' + esc(String(x.changed_at).slice(0, 16).replace('T', ' ')) + '</div>'
        + '<div style="color:var(--color-gray);">前: ' + esc(brief(x.old_origins)) + '</div>'
        + '<div>後: ' + esc(brief(x.new_origins)) + '</div>'
        + '<button type="button" class="btn btn-secondary btn-sm" data-oh-revert style="margin-top:4px;">この変更を取り消す</button></div>';
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
    window.loadOriginHistory();
  });
  document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { if (window.loadOriginHistory) window.loadOriginHistory(); }, 1600); });
})();
