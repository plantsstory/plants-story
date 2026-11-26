/* Admin: 要対応 (the first page after sign-in) and 新しい投稿. Admin reorganisation 2026-11-26.
   One card per kind of thing that waits on the owner, with its count, the first few items and a button to its page;
   the same counts show as badges on the menu. Counts come in after sign-in (RLS hides them before), and again
   whenever a page handles something (each page calls refreshInbox).
   「新しい」 for posts and 収録の依頼 means since the owner last opened that page (kept in this browser).
   Uses admin.html globals: sb, toast, escapeHtml, allCultivars, allImageRows, OWNER_ID, personName, fmtDate,
   loadPeopleNames, photoCardHtml, fillPrivateImages. */
(function () {
  'use strict';
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  var SEEN_KEY = { posts: 'admin_seen_new_posts', genus: 'admin_seen_genus_requests' };
  var WEEK = 7 * 24 * 3600 * 1000;

  function seen(kind) {
    var v = null;
    try { v = localStorage.getItem(SEEN_KEY[kind]); } catch (e) { /* private mode */ }
    var t = v ? Date.parse(v) : NaN;
    return isNaN(t) ? new Date(Date.now() - WEEK) : new Date(t);
  }
  window.markInboxSeen = function (kind) {
    try { localStorage.setItem(SEEN_KEY[kind], new Date().toISOString()); } catch (e) { /* private mode */ }
    if (window.refreshInbox) window.refreshInbox();
  };

  function others(row) { return row.user_id && row.user_id !== OWNER_ID; }

  function setBadge(id, n) {
    var b = document.getElementById(id);
    if (!b) return;
    b.textContent = n ? String(n) : '';
    b.classList.toggle('d-none', !n);
  }

  // one draw at a time; a call that comes in during a draw runs once more after it (the data may have changed)
  var busy = null, again = false;
  window.refreshInbox = function () {
    if (busy) { again = true; return busy; }
    busy = draw().catch(function (e) { toast('まとめを更新できませんでした: ' + (e && e.message || e)); }).then(function () {
      busy = null;
      if (again) { again = false; return window.refreshInbox(); }
    });
    return busy;
  };

  async function draw() {
    var res = await Promise.all([
      sb.from('deletion_requests').select('id, target_type, target_name, reason', { count: 'exact' }).eq('status', 'pending').order('created_at', { ascending: false }).limit(3),
      sb.from('contact_messages').select('id, name, category', { count: 'exact' }).or('status.is.null,status.neq.done').order('created_at', { ascending: false }).limit(3),
      sb.from('ai_suggestions').select('id, cultivar_name, field', { count: 'exact' }).eq('status', 'pending').order('created_at', { ascending: false }).limit(3),
      sb.from('research_requests').select('id, cultivar_name', { count: 'exact' }).in('status', ['pending', 'approved']).order('created_at', { ascending: false }).limit(3),
      sb.rpc('genus_request_summary')
    ]);
    function part(r) { return { n: r.error ? null : (r.count || 0), rows: r.error ? [] : (r.data || []), err: r.error }; }
    var reports = part(res[0]), contact = part(res[1]), ais = part(res[2]), rr = part(res[3]);
    var genusSeen = seen('genus');
    var gRows = res[4].error ? [] : (res[4].data || []);
    var gNew = gRows.filter(function (r) { return new Date(r.last_at) > genusSeen; });
    var genus = { n: res[4].error ? null : gNew.length, rows: gNew.slice(0, 3), err: res[4].error };

    var verifyQ = allCultivars.filter(function (c) { return String(c.verification_note || '').indexOf('[要再確認]') === 0; });
    var postSeen = seen('posts');
    var newEntries = allCultivars.filter(function (c) { return others(c) && new Date(c.created_at) > postSeen; });
    var newPhotos = allImageRows.filter(function (r) { return others(r) && new Date(r.created_at) > postSeen; });

    var REASON = { wrong_info: '誤った情報', duplicate: '重複', spam: 'スパム', irrelevant: '無関係な写真', inappropriate: '不適切な写真', copyright: '著作権', created_by_mistake: '作成ミス', uploaded_by_mistake: '投稿ミス', other: 'その他' };
    var CAT = { general: '一般', copyright: '著作権', deletion: '削除要請', bug: '不具合', shop: '取扱店の掲載' };
    var FIELD = { type_locality: 'タイプ産地', collector: '採集者', collection_year: '採集年', known_habitats: '分布', author_name: '記載者', publication_year: '発表年' };

    var cards = [
      { key: 'delete-requests', badge: 'dr-badge', title: '報告', p: reports, sub: '記録の誤りや写真についての報告',
        items: reports.rows.map(function (r) { return (r.target_type === 'image' ? '写真 · ' : '記録 · ') + (r.target_name || '') + '（' + (REASON[r.reason] || r.reason) + '）'; }) },
      { key: 'contact', badge: 'contact-badge', title: 'お問い合わせ', p: contact, sub: '未対応のお問い合わせ',
        items: contact.rows.map(function (r) { return (CAT[r.category] || r.category) + ' · ' + r.name; }) },
      { key: 'ai-suggest', badge: 'ais-badge', title: 'AI の提案', p: ais, sub: '採用か見送りを待っている値',
        items: ais.rows.map(function (r) { return r.cultivar_name + ' · ' + (FIELD[r.field] || r.field); }) },
      { key: 'research-requests', badge: 'rr-badge', title: '再調査の依頼', p: rr, sub: '利用者からの AI 再調査の依頼',
        items: rr.rows.map(function (r) { return r.cultivar_name; }) },
      { key: 'genus-requests', badge: 'gr-badge', title: '収録の依頼', p: genus, sub: '前に開いてから新しく届いた属・名前の依頼',
        items: genus.rows.map(function (r) { return r.genus + '（' + r.count + ' 件）'; }) },
      { key: 'verify', badge: 'vq-badge', title: '検証のやり直し', p: { n: verifyQ.length, rows: [] }, sub: '検証済のあとで中身が変わった記録',
        items: verifyQ.slice(0, 3).map(function (c) { return c.cultivar_name; }) },
      { key: 'new-posts', badge: 'new-badge', title: '新しい投稿', p: { n: newEntries.length + newPhotos.length, rows: [] },
        sub: '前に開いてから、ほかの人が足した記録 ' + newEntries.length + ' 件・写真 ' + newPhotos.length + ' 枚',
        items: newEntries.slice(0, 2).map(function (c) { return '記録 · ' + c.cultivar_name; }).concat(newPhotos.slice(0, 1).map(function (r) { return '写真 · ' + (r.cultivar_name || ''); })) }
    ];

    var total = 0;
    var html = cards.map(function (c) {
      var n = c.p.n;
      setBadge(c.badge, n || 0);
      if (n) total += n;
      return '<div class="inbox-card' + (n ? ' has-items' : '') + '">'
        + '<div class="inbox-title">' + esc(c.title) + '</div>'
        + '<div class="inbox-count">' + (n == null ? '?' : n) + '</div>'
        + '<div class="item-meta">' + esc(n == null ? '読み込めませんでした' + (c.p.err ? '（' + c.p.err.message + '）' : '') : c.sub) + '</div>'
        + (n && c.items.length ? '<ul>' + c.items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '')
        + '<button class="btn btn-sm ' + (n ? 'btn-primary' : 'btn-outline') + '" data-goto="' + c.key + '">開く</button>'
        + '</div>';
    }).join('');
    var grid = document.getElementById('inbox-grid');
    if (grid) grid.innerHTML = html;
    setBadge('inbox-badge', total);
    var up = document.getElementById('inbox-updated');
    if (up) up.textContent = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) + ' 時点' + (total ? '' : '・待っているものはありません');
  }

  var btn = document.getElementById('btn-refresh-inbox');
  if (btn) btn.addEventListener('click', async function () {
    btn.disabled = true;
    if (window.loadAllCultivars) await window.loadAllCultivars();
    await window.refreshInbox();
    btn.disabled = false;
  });

  // 新しい投稿: what other people added in the chosen range (the owner's own posts left out)
  window.loadNewPosts = async function () {
    var list = document.getElementById('new-posts-list');
    if (!list) return;
    var days = Number(document.getElementById('new-posts-range').value) || 7;
    var since = new Date(Date.now() - days * 24 * 3600 * 1000);
    var prevSeen = seen('posts');
    list.innerHTML = '<p class="desc-text">読み込み中...</p>';
    var entries = allCultivars.filter(function (c) { return others(c) && new Date(c.created_at) > since; });
    var ph = await sb.from('cultivar_images').select('*').not('user_id', 'is', null).neq('user_id', OWNER_ID).gte('created_at', since.toISOString()).order('created_at', { ascending: false }).limit(300);
    if (ph.error) { list.innerHTML = '<p class="desc-text">写真を読めませんでした（' + esc(ph.error.message) + '）</p>'; return; }
    var photos = ph.data || [];
    await loadPeopleNames(photos.map(function (p) { return p.user_id; }));
    function isNew(d) { return new Date(d) > prevSeen ? ' <span class="nav-badge">新</span>' : ''; }
    var html = '<h3 style="font-size:var(--font-size-md);">記録（' + entries.length + '）</h3>';
    html += entries.length ? entries.map(function (c) {
      return '<div class="item-card"><a href="#" data-open-entry="' + c.id + '" style="font-weight:600;">' + esc(c.cultivar_name) + '</a>' + isNew(c.created_at)
        + '<div class="item-meta">' + esc(c.genus) + ' · ' + esc(c.type) + ' · ' + esc(personName(c.user_id)) + ' · ' + esc(fmtDate(c.created_at)) + (c.is_private ? ' · 非公開' : '') + '</div></div>';
    }).join('') : '<p class="desc-text">この期間に足された記録はありません。</p>';
    html += '<h3 style="font-size:var(--font-size-md);" class="mt-lg">写真（' + photos.length + '）</h3>';
    html += photos.length ? '<div class="card-grid-sm">' + photos.map(function (p) { return photoCardHtml(p); }).join('') + '</div>' : '<p class="desc-text">この期間に足された写真はありません。</p>';
    list.innerHTML = html;
    fillPrivateImages(list);
    window.markInboxSeen('posts');
  };
  var range = document.getElementById('new-posts-range');
  if (range) range.addEventListener('change', window.loadNewPosts);
  var rb = document.getElementById('btn-refresh-new-posts');
  if (rb) rb.addEventListener('click', async function () { if (window.loadAllCultivars) await window.loadAllCultivars(); window.loadNewPosts(); });
})();
