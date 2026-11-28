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
    // read through an admin-only function: the table itself is closed to the API roles
    var r = await sb.rpc('admin_contact_messages', { p_limit: 200 });
    if (r.error) { if (root) root.innerHTML = '<p style="color:#a8712e;">読み込みエラー: ' + esc(r.error.message) + '</p>'; return; }
    var rows = (r.data || []).map(function (m) { m.is_resolved = m.status === 'done'; return m; }).sort(function (a, b) { return (a.is_resolved ? 1 : 0) - (b.is_resolved ? 1 : 0); });
    var open = rows.filter(function (m) { return !m.is_resolved; }).length;
    window._contactCache = {};
    rows.forEach(function (m) { window._contactCache[String(m.id)] = m; });
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
        + '<div style="margin-top:8px;"><button class="btn btn-outline btn-sm" data-cm="' + esc(m.id) + '" data-resolved="' + (m.is_resolved ? '1' : '0') + '">' + (m.is_resolved ? '未対応に戻す' : '対応済みにする') + '</button>'
        + (m.category === 'copyright' || m.category === 'deletion' || m.category === 'general'
          ? ' <button class="btn btn-outline btn-sm" data-case-from="contact" data-case-src="' + esc(m.id) + '">受付簿に入れる</button>' : '')
        + '</div></div>';
    });
    root.innerHTML = html;
    root.querySelectorAll('[data-cm]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var u = await sb.rpc('admin_set_contact_status', { p_id: b.getAttribute('data-cm'), p_status: b.getAttribute('data-resolved') === '1' ? 'new' : 'done' });
        if (u.error || !u.data || u.data.success === false) { toast('更新エラー: ' + ((u.error && u.error.message) || (u.data && u.data.error) || '')); return; }
        window.loadContactMessages();
        if (window.refreshInbox) window.refreshInbox();
      });
    });
  };
  // the unread count on the menu comes from refreshInbox (js/admin-inbox.js) after sign-in
})();

/* Member-interest list (BOARD 10-07b T86): the count on the dashboard. Sending is member-launch-notify, which refuses
   until the owner approves (Secrets MEMBER_NOTIFY_ENABLED). */
window.loadMemberInterestCount = async function () {
  var host = document.getElementById('member-interest-count');
  var stat = document.getElementById('stat-member-interest');
  if (!host) return;
  var r = await sb.from('member_interest').select('source, created_at, notified_at');
  if (r.error) { host.textContent = '受付開始のお知らせ名簿: 読み込みエラー'; if (stat) stat.textContent = '-'; return; }
  var rows = r.data || [], by = {};
  if (stat) stat.textContent = String(rows.length);
  rows.forEach(function (x) { by[x.source || 'unknown'] = (by[x.source || 'unknown'] || 0) + 1; });
  host.innerHTML = '<strong>受付開始のお知らせ名簿 ' + rows.length + ' 人</strong>（未送信 ' + rows.filter(function (x) { return !x.notified_at; }).length + '）<br><span style="font-size:var(--font-size-xs);color:var(--color-gray);">'
    + Object.keys(by).map(function (k) { return k + ' ' + by[k]; }).join(' · ')
    + ' — 一斉送信はオーナーの承認後（Secrets MEMBER_NOTIFY_ENABLED）にだけ動きます。</span>';
};
