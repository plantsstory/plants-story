/* Admin: contact messages (BOARD 10-07b T81). Unread first; one tap marks a message handled.
   Uses admin.html globals: sb, toast. */
(function () {
  'use strict';
  var CAT = { general: '一般', copyright: '著作権', deletion: '削除要請', bug: '不具合', shop: '取扱店の掲載' };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function fmt(d) { d = new Date(d); return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  function badge(n) {
    var b = document.getElementById('contact-badge');
    if (!b) return;
    b.textContent = n ? String(n) : '';
    b.classList.toggle('d-none', !n);
  }

  window.loadContactMessages = async function () {
    var root = document.getElementById('contact-root');
    var r = await sb.from('contact_messages').select('id, name, email, category, message, status, notified_at, created_at').order('created_at', { ascending: false }).limit(200);
    if (r.error) { if (root) root.innerHTML = '<p style="color:#a8712e;">読み込みエラー: ' + esc(r.error.message) + '</p>'; return; }
    var rows = (r.data || []).map(function (m) { m.is_resolved = m.status === 'done'; return m; }).sort(function (a, b) { return (a.is_resolved ? 1 : 0) - (b.is_resolved ? 1 : 0); });
    var open = rows.filter(function (m) { return !m.is_resolved; }).length;
    badge(open);
    if (!root) return;
    var html = '<div class="stat-card" style="font-size:var(--font-size-sm);">未対応 ' + open + ' 件 · 全 ' + rows.length + ' 件'
      + '<br><span style="color:var(--color-gray);">届いたときは運営アドレスにも 1 通知らせます（返信はそのメールに返信）。取扱店の申込は区分「取扱店の掲載」。</span></div>';
    if (!rows.length) html += '<p style="color:var(--color-gray);padding:var(--space-lg);text-align:center;">まだお問い合わせはありません</p>';
    rows.forEach(function (m) {
      html += '<div class="stat-card" style="margin-top:var(--space-sm);' + (m.is_resolved ? 'opacity:.6;' : '') + '">'
        + '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;"><strong>' + esc(CAT[m.category] || m.category) + ' — ' + esc(m.name) + '</strong><span style="font-size:var(--font-size-xs);color:var(--color-gray);">' + esc(fmt(m.created_at)) + (m.notified_at ? ' · 通知済み' : '') + '</span></div>'
        + '<div style="font-size:var(--font-size-xs);margin:4px 0;"><a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a></div>'
        + '<div style="white-space:pre-wrap;font-size:var(--font-size-sm);">' + esc(m.message) + '</div>'
        + '<div style="margin-top:8px;"><button class="btn btn-outline btn-sm" data-cm="' + esc(m.id) + '" data-resolved="' + (m.is_resolved ? '1' : '0') + '">' + (m.is_resolved ? '未対応に戻す' : '対応済みにする') + '</button></div></div>';
    });
    root.innerHTML = html;
    root.querySelectorAll('[data-cm]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var u = await sb.from('contact_messages').update({ status: b.getAttribute('data-resolved') === '1' ? 'new' : 'done' }).eq('id', b.getAttribute('data-cm'));
        if (u.error) { toast('更新エラー: ' + u.error.message); return; }
        window.loadContactMessages();
      });
    });
  };
  // the unread count shows on the menu as soon as the admin page opens
  document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { if (window.sb) window.loadContactMessages(); }, 1500); });
})();
