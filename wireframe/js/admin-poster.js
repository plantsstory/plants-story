/* Admin: 投稿者を調べる (2026-11-28). For a takedown request or a 発信者情報開示請求: paste the address of a page or a
   photo, an ID, a sign-in address or a name, and see who posted it — the account, and every post / edit / delete
   with its time, IP address and browser (from post_log, kept 180 days). 保全 keeps an item's record (and a copy of
   it, its photo files included) out of the 180-day erase; 保全して削除 does that and then takes the item down.
   Nothing here is shown on the site: the log is read through admin-only functions.
   Uses admin.html globals: sb, toast, escapeHtml, allCultivars, allImageRows, entryUrl, imgTag, fillPrivateImages,
   deleteCultivar (asks first), deletePhotoFully, loadAllCultivars. */
(function () {
  'use strict';
  var TYPE = { cultivar: '記録（品種・由来）', image: '写真', profile: 'プロフィール' };
  var ACT = { create: '投稿', edit: '編集', delete: '削除' };
  // field names in the words of the site (anything else is shown as it is stored)
  var FIELD = { cultivar_name: '名前', origins: '由来', type: '区分', genus: '属', is_private: '非公開', caption: '写真の説明', credit: '撮影者',
    link_url: 'リンク', taken_on: '撮影日', specimen_kind: '写っている株', display_order: '写真の順番', storage_path: '写真のファイル',
    display_name: '表示名', username: 'ユーザー名', bio: '自己紹介', avatar_url: 'アイコン', sns_instagram: 'Instagram', sns_twitter: 'X', tags: 'タグ', aliases: '別名' };
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  // the time in Japan, to the second (a provider matches an IP address to a subscriber by the exact time)
  function jst(d) {
    if (!d) return '';
    var t = new Date(new Date(d).getTime() + 9 * 3600 * 1000);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return t.getUTCFullYear() + '-' + p(t.getUTCMonth() + 1) + '-' + p(t.getUTCDate()) + ' ' + p(t.getUTCHours()) + ':' + p(t.getUTCMinutes()) + ':' + p(t.getUTCSeconds()) + ' JST';
  }
  function device(ua) {
    ua = String(ua || '');
    if (!ua) return '';
    var os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : '';
    var br = /Instagram/.test(ua) ? 'Instagram' : /Barcelona/.test(ua) ? 'Threads' : /Line\//.test(ua) ? 'LINE' : /EdgA?\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
    return [os, br].filter(Boolean).join(' · ') || ua.slice(0, 40);
  }
  function siteUrl(path) { return 'https://aroidorigins.com/' + String(path || '').replace(/^\/+/, ''); }

  // ---------- what the pasted text points at ----------
  // returns { type, id, label, row } for an item, { user } for an account, or { text } to search the log by name
  async function resolve(q) {
    q = String(q || '').trim();
    if (!q) return null;
    var pre = q.match(/^(cultivar|image|profile):(.+)$/);
    if (pre) {
      if (pre[1] === 'profile') return { user: pre[2].toLowerCase() };
      var row = pre[1] === 'image' ? allImageRows.find(function (r) { return r.id === pre[2]; }) : allCultivars.find(function (c) { return String(c.id) === pre[2]; });
      return { type: pre[1], id: pre[2], label: row ? row.cultivar_name : '', row: row };
    }
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(q)) return { text: q, email: true };
    if (/^\d+$/.test(q)) {
      var byId = allCultivars.find(function (c) { return String(c.id) === q; });
      return { type: 'cultivar', id: q, label: byId ? byId.cultivar_name : '', row: byId };
    }
    if (UUID.test(q)) {
      var im = allImageRows.find(function (r) { return r.id === q; });
      if (im) return { type: 'image', id: q, label: im.cultivar_name, row: im };
      return { user: q.toLowerCase() };
    }
    var path = q;
    try { if (/^https?:\/\//i.test(q)) path = new URL(q).pathname; } catch (e) { /* not a full address */ }
    path = path.replace(/^\/+/, '');
    // a photo file: …/gallery-images/<path> or …/private-images/<path>
    var m = path.match(/(?:gallery-images|private-images)\/(.+)$/);
    if (m) {
      var sp = decodeURIComponent(m[1].split('?')[0]);
      var pv = /private-images\//.test(path);
      var hit = allImageRows.find(function (r) { return r.storage_path === sp || r.storage_path === 'pv:' + sp; });
      if (hit) return { type: 'image', id: hit.id, label: hit.cultivar_name, row: hit };
      return { text: (pv ? 'pv:' : '') + sp };   // gone: its rows in the log still name the path
    }
    // a profile: profile/<id> or profile/@<username>
    m = path.match(/^profile\/@([^\/?#]+)/);
    if (m) {
      var u = await sb.from('profiles').select('id').eq('username', decodeURIComponent(m[1])).maybeSingle();
      if (u.data) return { user: u.data.id };
      return { text: decodeURIComponent(m[1]) };
    }
    m = path.match(/^profile\/([0-9a-f-]{36})/i);
    if (m) return { user: m[1].toLowerCase() };
    // an entry page: <genus>/<segment>
    m = path.match(/^([a-z]+)\/([^\/?#]+)/i);
    if (m) {
      var want = (m[1] + '/' + m[2]).toLowerCase();
      var c = allCultivars.find(function (x) {
        var p = String(entryUrl(x.cultivar_name) || '').toLowerCase();
        return p === want || p === (m[1] + '/' + encodeURIComponent(decodeURIComponent(m[2]))).toLowerCase();
      });
      if (c) return { type: 'cultivar', id: String(c.id), label: c.cultivar_name, row: c };
      // not in the records (deleted): search the log by the words of the address
      return { text: decodeURIComponent(m[2]).replace(/-/g, ' ') };
    }
    var byName = allCultivars.find(function (x) { return x.cultivar_name === q; });
    if (byName) return { type: 'cultivar', id: String(byName.id), label: byName.cultivar_name, row: byName };
    return { text: q };
  }

  // ---------- pieces ----------
  // what a deleted post said, from the copy kept with its delete row
  function snapshotHtml(snap) {
    if (!snap || typeof snap !== 'object') return '';
    var parts = [];
    Object.keys(FIELD).forEach(function (k) {
      var v = snap[k];
      if (v == null || v === '' || k === 'display_order' || k === 'is_private') return;
      if (k === 'origins') {
        v = (Array.isArray(v) ? v : []).map(function (o) { return o && o.body ? String(o.body) : ''; }).filter(Boolean).join(' / ');
        if (!v) return;
        if (v.length > 300) v = v.slice(0, 300) + '…';
      } else if (typeof v === 'object') v = JSON.stringify(v);
      parts.push('<dt>' + esc(FIELD[k]) + '</dt><dd>' + esc(v) + '</dd>');
    });
    return parts.length ? '<div class="ap-sub">削除したときの内容</div><dl class="ap-dl">' + parts.join('') + '</dl>' : '';
  }

  function logHtml(rows, showItem) {
    if (!rows.length) return '<p class="ap-empty">記録はまだありません。投稿の記録は 2026-11-28 から残しています。それより前の投稿は、投稿者のアカウントと日時だけがわかります（IP はありません）。</p>';
    var h = '<div class="ap-log">';
    rows.forEach(function (r) {
      h += '<div class="ap-row"><div class="ap-row__head"><strong>' + esc(ACT[r.action] || r.action) + '</strong>'
        + '<span>' + esc(jst(r.at)) + '</span></div>';
      if (showItem) h += '<div class="ap-row__item"><a href="#" data-ap-open="' + esc(r.item_type + ':' + r.item_id) + '">' + esc(TYPE[r.item_type] || r.item_type) + ' · ' + esc(r.item_label || r.item_id) + '</a></div>';
      h += '<dl class="ap-dl">'
        + '<dt>アカウント</dt><dd>' + esc(r.actor_email || '（不明）') + (r.actor_id && r.owner_id && r.actor_id !== r.owner_id ? ' <span class="ap-note">（投稿者とは別の人。管理者の操作など）</span>' : '') + '</dd>'
        + '<dt>IP アドレス</dt><dd class="ap-mono">' + esc(r.ip || '（記録なし）') + '</dd>'
        + '<dt>端末</dt><dd title="' + esc(r.user_agent || '') + '">' + esc(device(r.user_agent) || '（記録なし）') + '</dd>'
        + (r.changed && r.changed.length ? '<dt>変えた項目</dt><dd>' + esc(r.changed.map(function (k) { return FIELD[k] || k; }).join('、')) + '</dd>' : '')
        + '</dl>' + (r.action === 'delete' ? snapshotHtml(r.snapshot) : '') + '</div>';
    });
    return h + '</div>';
  }

  function accountHtml(a) {
    if (!a) return '';
    if (a.missing) return '<div class="stat-card ap-card"><strong>投稿者</strong><p class="ap-note">このアカウントはもうありません（退会・削除）。下の記録にあるメールアドレスが投稿時のものです。</p><div class="ap-mono">' + esc(a.id) + '</div></div>';
    var h = '<div class="stat-card ap-card"><div class="ap-card__title">投稿者</div><dl class="ap-dl">'
      + '<dt>メール</dt><dd>' + esc(a.email || '') + '</dd>'
      + '<dt>表示名</dt><dd>' + esc(a.display_name || '（なし）') + (a.username ? ' @' + esc(a.username) : '') + '</dd>'
      + '<dt>登録</dt><dd>' + esc(jst(a.created_at)) + (a.provider ? '（' + esc(a.provider) + '）' : '') + '</dd>'
      + '<dt>最後のログイン</dt><dd>' + esc(jst(a.last_sign_in_at)) + '</dd>'
      + '<dt>投稿の数</dt><dd>記録 ' + esc(a.entries) + ' · 写真 ' + esc(a.photos) + '</dd>'
      + '<dt>ID</dt><dd class="ap-mono">' + esc(a.id) + '</dd></dl>';
    var ss = a.sessions || [];
    if (ss.length) {
      h += '<div class="ap-sub">ログイン中の端末（ログアウトすると消えます）</div>';
      ss.forEach(function (s) { h += '<div class="ap-sess"><span class="ap-mono">' + esc(s.ip || '') + '</span> · ' + esc(device(s.user_agent)) + ' · ' + esc(jst(s.updated_at || s.created_at)) + '</div>'; });
    }
    h += '<div class="ap-actions"><button class="btn btn-outline btn-sm" data-ap-user="' + esc(a.id) + '">この人の投稿の記録をすべて見る</button></div>';
    return h + '</div>';
  }

  function holdHtml(item, hold) {
    var h = '<div class="stat-card ap-card"><div class="ap-card__title">' + esc(TYPE[item.type] || '') + '</div>'
      + '<div class="ap-item-name">' + esc(item.label || item.id) + '</div>';
    if (item.type === 'cultivar' && item.row) h += '<div><a href="' + esc(siteUrl(entryUrl(item.row.cultivar_name))) + '" target="_blank" rel="noopener">サイトで開く</a></div>';
    if (item.type === 'image' && item.row) h += '<div class="ap-thumb">' + imgTag(item.row.storage_path) + '</div>';
    if (!item.row) h += '<p class="ap-note">この投稿はもうサイトにありません（削除済み）。下の記録に、削除したときの内容の写しがあります。</p>';
    h += hold
      ? '<p class="ap-held">保全中（' + esc(jst(hold.held_at)) + '〜）' + (hold.reason ? ' — ' + esc(hold.reason) : '') + '<br>自動では消えません。' + (hold.evidence_files && hold.evidence_files.length ? '写真の控え ' + hold.evidence_files.length + ' 枚あり。' : '') + '</p>'
      : '<p class="ap-note">投稿の記録は 180 日で自動で消えます。依頼が来たら、まず「保全する」を押してください。</p>';
    h += '<div class="ap-actions">';
    if (!hold) h += '<button class="btn btn-primary btn-sm" data-ap-hold="on">保全する</button>';
    else h += '<button class="btn btn-outline btn-sm" data-ap-hold="off">保全をやめる</button>';
    if (item.row && item.type !== 'profile') h += '<button class="btn btn-danger btn-sm" data-ap-takedown="1">保全して削除</button>';
    h += '<button class="btn btn-outline btn-sm" data-ap-copy="1">記録を文字で写す</button></div>';
    return h + '</div>';
  }

  // plain text of what was found, to paste into a reply to a provider or a lawyer
  function asText(item, account, rows) {
    var out = [];
    if (item) out.push('対象: ' + (TYPE[item.type] || '') + ' ' + (item.label || '') + ' (ID ' + item.id + ')');
    if (account && !account.missing) out.push('投稿者: ' + (account.email || '') + ' / 表示名 ' + (account.display_name || '') + ' / 登録 ' + jst(account.created_at));
    rows.forEach(function (r) {
      out.push(jst(r.at) + '  ' + (ACT[r.action] || r.action) + '  ' + (r.actor_email || '') + '  IP ' + (r.ip || '-') + '  ' + (r.user_agent || ''));
    });
    return out.join('\n');
  }

  // photo files of an item, copied to private-images/<admin id>/evidence/ (kept with the hold; nobody else can read them)
  async function copyEvidence(paths) {
    var s = await sb.auth.getSession();
    var me = s.data && s.data.session && s.data.session.user && s.data.session.user.id;
    if (!me) return { files: [], errors: ['ログインを確認できません'] };
    var files = [], errors = [];
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i]; if (!p) continue;
      var pv = /^pv:/.test(p), src = pv ? p.slice(3) : p;
      var dl = await sb.storage.from(pv ? 'private-images' : 'gallery-images').download(src);
      if (dl.error) { errors.push(src + ': ' + dl.error.message); continue; }
      var to = me + '/evidence/' + Date.now() + '_' + src.split('/').pop();
      var up = await sb.storage.from('private-images').upload(to, dl.data, { contentType: dl.data.type || 'image/jpeg', upsert: false });
      if (up.error) { errors.push(src + ': ' + up.error.message); continue; }
      files.push('pv:' + to);
    }
    return { files: files, errors: errors };
  }
  function photoPathsOf(item) {
    if (item.type === 'image' && item.row) return [item.row.storage_path];
    if (item.type === 'cultivar' && item.row) {
      var c = item.row, out = allImageRows.filter(function (r) { return r.cultivar_id === c.id || (!r.cultivar_id && r.cultivar_name === c.cultivar_name); }).map(function (r) { return r.storage_path; });
      (c.origins || []).forEach(function (o) { if (o && o.formula) { if (o.formula.motherPhoto) out.push(o.formula.motherPhoto); if (o.formula.fatherPhoto) out.push(o.formula.fatherPhoto); } });
      return out;
    }
    return [];
  }

  async function hold(item, on) {
    var reason = null, files = null;
    if (on) {
      reason = prompt('保全する理由（例: ○○からの削除依頼 2026-12-01）', '');
      if (reason === null) return false;
      var paths = photoPathsOf(item);
      if (paths.length) {
        var cp = await copyEvidence(paths);
        files = cp.files;
        if (cp.errors.length) toast('写真の控えを作れなかったものがあります: ' + cp.errors.join(' / '));
      }
    }
    var r = await sb.rpc('admin_post_hold', { p_item_type: item.type, p_item_id: String(item.id), p_on: on, p_reason: reason, p_evidence_files: files });
    if (r.error || !r.data || r.data.success === false) { toast('保全できませんでした: ' + ((r.error && r.error.message) || (r.data && r.data.error) || '')); return false; }
    toast(on ? '保全しました。この投稿の記録は自動では消えません' : '保全をやめました');
    return true;
  }

  // ---------- the page ----------
  var last = null;   // { item, account, rows }

  async function show(q) {
    var out = document.getElementById('ap-result');
    out.innerHTML = '<p class="ap-note">調べています…</p>';
    var t = await resolve(q);
    if (!t) { out.innerHTML = ''; return; }
    var rows = [], account = null, item = null, holdRow = null, r;
    if (t.user) {
      r = await sb.rpc('admin_post_log', { p_user: t.user, p_limit: 500 });
      if (r.error) { out.innerHTML = '<p class="ap-err">読み込みエラー: ' + esc(r.error.message) + '</p>'; return; }
      rows = r.data || [];
      var a = await sb.rpc('admin_post_account', { p_user: t.user });
      account = a.data || null;
      // not an account after all: a photo that is gone (its id is also a uuid)
      if (!rows.length && account && account.missing) { show('image:' + t.user); return; }
    } else if (t.type) {
      item = t;
      r = await sb.rpc('admin_post_log', { p_item_type: t.type, p_item_id: String(t.id), p_limit: 500 });
      if (r.error) { out.innerHTML = '<p class="ap-err">読み込みエラー: ' + esc(r.error.message) + '</p>'; return; }
      rows = r.data || [];
      if (!t.label && rows.length) t.label = rows[0].item_label;
      var owner = (t.row && t.row.user_id) || (rows.find(function (x) { return x.owner_id; }) || {}).owner_id;
      if (owner) { var a2 = await sb.rpc('admin_post_account', { p_user: owner }); account = a2.data || null; }
    } else {
      r = await sb.rpc('admin_post_log', { p_text: t.text, p_limit: 500 });
      if (r.error) { out.innerHTML = '<p class="ap-err">読み込みエラー: ' + esc(r.error.message) + '</p>'; return; }
      rows = r.data || [];
      var mine = t.email && rows.find(function (x) { return x.actor_id && String(x.actor_email || '').toLowerCase() === t.text.toLowerCase(); });
      if (mine) { var a3 = await sb.rpc('admin_post_account', { p_user: mine.actor_id }); account = a3.data || null; }
    }
    var hs = await sb.rpc('admin_post_holds');
    var holds = hs.data || [];
    if (item) holdRow = holds.find(function (h) { return h.item_type === item.type && h.item_id === String(item.id); }) || null;
    last = { item: item, account: account, rows: rows };

    var h = '';
    if (item) h += holdHtml(item, holdRow);
    if (account) h += accountHtml(account);
    if (!item && !account) h += '<div class="stat-card ap-card"><div class="ap-card__title">' + (t.email ? 'このメールアドレスの記録' : '「' + esc(t.text) + '」を含む記録') + '</div><p class="ap-note">' + (t.email ? 'このメールアドレスのアカウントが行った投稿・編集・削除です。' : '名前やファイルの場所にこの言葉を含むものです（削除済みの投稿もここで探せます）。') + '</p>'
      + '<div class="ap-actions"><button class="btn btn-outline btn-sm" data-ap-copy="1">記録を文字で写す</button></div></div>';
    h += '<h3 class="ap-h3">投稿・編集・削除の記録 ' + rows.length + ' 件</h3>' + (!item && rows.length ? '<p class="ap-note">投稿の名前を押すと、その投稿だけの記録と「保全する」が出ます（削除済みの投稿も保全できます）。</p>' : '') + logHtml(rows, !item);
    out.innerHTML = h;
    fillPrivateImages(out);

    out.querySelectorAll('[data-ap-open]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); var v = a.getAttribute('data-ap-open'); document.getElementById('ap-q').value = v; show(v); window.scrollTo(0, 0); }); });
    out.querySelectorAll('[data-ap-user]').forEach(function (b) { b.addEventListener('click', function () { document.getElementById('ap-q').value = b.getAttribute('data-ap-user'); show(b.getAttribute('data-ap-user')); }); });
    out.querySelectorAll('[data-ap-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var txt = asText(last.item, last.account, last.rows);
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('コピーしました'); }, function () { prompt('コピーしてください', txt); });
      });
    });
    out.querySelectorAll('[data-ap-hold]').forEach(function (b) {
      b.addEventListener('click', async function () {
        b.disabled = true;
        if (await hold(item, b.getAttribute('data-ap-hold') === 'on')) { show(q); loadHolds(); } else b.disabled = false;
      });
    });
    out.querySelectorAll('[data-ap-takedown]').forEach(function (b) {
      b.addEventListener('click', async function () {
        if (!holdRow) {
          if (!confirm('先に保全してから削除します。よろしいですか？\n（記録と内容の写し' + (photoPathsOf(item).length ? '・写真の控え' : '') + 'は残り、サイトからは消えます）')) return;
          if (!(await hold(item, true))) return;
        }
        var ok;
        if (item.type === 'cultivar') ok = await deleteCultivar(item.row.id, item.row.cultivar_name);   // asks once more
        else {
          if (!confirm('この写真をサイトから削除しますか？')) return;
          var res = await deletePhotoFully(item.row);
          ok = res.ok; if (!ok) toast('削除エラー: ' + res.error);
          await loadAllCultivars();
        }
        if (ok) { toast('保全して削除しました'); show(item.type + ':' + item.id); loadHolds(); }
      });
    });
  }

  async function loadHolds() {
    var host = document.getElementById('ap-holds');
    if (!host) return;
    var r = await sb.rpc('admin_post_holds');
    if (r.error) { host.innerHTML = '<p class="ap-err">保全中の一覧を読めませんでした: ' + esc(r.error.message) + '</p>'; return; }
    var rows = r.data || [];
    if (!rows.length) { host.innerHTML = '<p class="ap-note">保全中の投稿はありません。</p>'; return; }
    host.innerHTML = rows.map(function (x) {
      var name = (x.snapshot && (x.snapshot.cultivar_name || x.snapshot.display_name)) || x.item_id;
      return '<div class="ap-row"><div class="ap-row__head"><a href="#" data-ap-open="' + esc(x.item_type + ':' + x.item_id) + '">' + esc(TYPE[x.item_type] || x.item_type) + ' · ' + esc(name) + '</a><span>' + esc(jst(x.held_at)) + '〜</span></div>'
        + (x.reason ? '<div class="ap-note">' + esc(x.reason) + '</div>' : '') + '</div>';
    }).join('');
    host.querySelectorAll('[data-ap-open]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); document.getElementById('ap-q').value = a.getAttribute('data-ap-open'); show(a.getAttribute('data-ap-open')); window.scrollTo(0, 0); });
    });
  }

  window.loadPosterLookup = function () {
    var root = document.getElementById('poster-root');
    if (!root || root.getAttribute('data-ready')) { loadHolds(); return; }
    root.setAttribute('data-ready', '1');
    root.innerHTML = '<div class="stat-card ap-card"><p class="ap-lead">削除依頼や発信者情報開示請求が来たときに、投稿した人を調べます。ページや写真のアドレス、ID、メールアドレス、名前のどれかを貼ってください。</p>'
      + '<form id="ap-form" class="ap-form"><input id="ap-q" type="text" inputmode="url" autocomplete="off" placeholder="例: https://aroidorigins.com/anthurium/ace-of-spades/"><button class="btn btn-primary" type="submit">調べる</button></form>'
      + '<p class="ap-note">記録（アカウント・日時・IP・端末）は管理者だけが見られ、180 日で自動で消えます。保全した投稿の記録は消えません。サイトには表示されません。</p></div>'
      + '<div id="ap-result"></div><h3 class="ap-h3">保全中</h3><div id="ap-holds"></div>';
    document.getElementById('ap-form').addEventListener('submit', function (e) { e.preventDefault(); show(document.getElementById('ap-q').value); });
    loadHolds();
  };
})();
