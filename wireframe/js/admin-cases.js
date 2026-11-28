/* Admin: 受付簿, 投稿者への照会, 利用停止, 操作記録 and the 回答書 (2026-11-28, Yuta).
   A 受付 is one takedown request, 発信者情報開示請求 or other formal request, with its deadline, the item, the
   poster, the steps taken and the decision. It starts from a 報告 or お問い合わせ card (受付簿に入れる), from
   投稿者を調べる, or by hand. The SQL is supabase/migrations/20261128170000_admin_requests.sql.
   Uses admin.html globals: sb, toast, escapeHtml, showSection, openPosterLookup, allCultivars, allImageRows,
   entryUrl, loadPeopleNames, personName, loadUsers; and from js/admin-poster.js posterResolve, posterRefresh. */
(function () {
  'use strict';
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  var KIND = { takedown: '削除の申出', disclosure: '発信者情報開示請求', authority: '警察・裁判所などから', other: 'その他' };
  var STATUS = { open: '受付', asked: '投稿者に照会中', done: '対応済み', declined: '見送り' };
  var TYPE = { cultivar: '記録', image: '写真', profile: 'プロフィール' };
  var ACTION = {
    case_create: '受付簿に登録', case_update: '受付簿を更新', case_note: 'メモ', case_ask: '投稿者に照会を送った',
    case_reply: '投稿者の返事を記録', case_export: '回答書を書き出した', suspend: '利用を停止', unsuspend: '停止を解いた',
    hold_on: '保全した', hold_off: '保全をやめた', 'delete': '削除した', report_fixed: '報告を「直した」にした',
    report_approved: '報告から削除した', report_rejected: '報告を却下した', report_pending: '報告を未対応に戻した',
    contact_done: 'お問い合わせを対応済みにした', contact_new: 'お問い合わせを未対応に戻した', lookup: '投稿者を調べた'
  };
  var FIELD = { kind: '種類', status: '状態', received_at: '受け付けた日', due_at: '期限', requester: '申出た人', requester_contact: '連絡先',
    summary: '申出の内容', decision: '判断と理由', item_type: '対象', item_id: '対象', item_label: '対象', poster_id: '投稿者', source_type: 'もと', source_id: 'もと' };
  var DAY = 24 * 3600 * 1000;
  var SITE = 'https://aroidorigins.com/';

  function p2(n) { return String(n).padStart(2, '0'); }
  function jstParts(d) { var t = new Date(new Date(d).getTime() + 9 * 3600 * 1000); return t; }
  function jstDate(d) { if (!d) return ''; var t = jstParts(d); return t.getUTCFullYear() + '-' + p2(t.getUTCMonth() + 1) + '-' + p2(t.getUTCDate()); }
  function jstText(d) { if (!d) return ''; var t = jstParts(d); return jstDate(d) + ' ' + p2(t.getUTCHours()) + ':' + p2(t.getUTCMinutes()); }
  function jstLong(d) { if (!d) return ''; var t = jstParts(d); return t.getUTCFullYear() + '年' + (t.getUTCMonth() + 1) + '月' + t.getUTCDate() + '日'; }
  // a date field (JST): the deadline is the end of that day, any other date midday
  function dateIso(v, end) { return v ? v + (end ? 'T23:59:59+09:00' : 'T12:00:00+09:00') : ''; }
  function nextDue(c) {
    var d = [c.due_at, c.status === 'asked' && !c.ask_replied_at ? c.ask_due_at : null].filter(Boolean).map(Date.parse);
    return d.length ? Math.min.apply(null, d) : null;
  }
  function dueChip(ms, closed) {
    if (ms == null || closed) return '';
    var days = Math.ceil((ms - Date.now()) / DAY);
    var cls = days < 0 ? 'case-chip case-chip--late' : days <= 3 ? 'case-chip case-chip--soon' : 'case-chip';
    return '<span class="' + cls + '">' + (days < 0 ? '期限切れ（' + jstDate(ms) + '）' : days === 0 ? '今日まで' : 'あと ' + days + ' 日（' + jstDate(ms) + '）') + '</span>';
  }
  function closed(c) { return c.status === 'done' || c.status === 'declined'; }
  function itemUrl(type, id, label, poster) {
    if (type === 'cultivar') {
      var c = allCultivars.find(function (x) { return String(x.id) === String(id); });
      return c ? SITE + String(entryUrl(c.cultivar_name) || '').replace(/^\/+/, '') : '';
    }
    if (type === 'image') {
      var im = allImageRows.find(function (r) { return String(r.id) === String(id); });
      var ce = im && allCultivars.find(function (x) { return (im.cultivar_id && x.id === im.cultivar_id) || x.cultivar_name === im.cultivar_name; });
      return ce ? SITE + String(entryUrl(ce.cultivar_name) || '').replace(/^\/+/, '') : '';
    }
    if (type === 'profile') return poster && poster.username ? SITE + 'profile/@' + encodeURIComponent(poster.username) : SITE + 'profile/' + id;
    return '';
  }
  function rpcErr(r) { return (r.error && r.error.message) || (r.data && r.data.success === false && r.data.error) || ''; }
  function missingSql(msg) { return /admin_case|admin_suspen|admin_actions|function .* does not exist|Could not find the function/i.test(msg || ''); }
  var NO_SQL = '<p class="desc-text">受付簿の SQL（20261128170000_admin_requests.sql）がまだ入っていないため使えません。</p>';

  // ================= 受付簿 =================
  var current = null;      // the open 受付: { case, poster, hold, events }
  var listFilter = 'open';
  var view = 0;            // the newest draw wins (a list and a 受付 can be asked for at nearly the same time)

  window.loadCases = async function () {
    var root = document.getElementById('cases-root');
    if (!root) return;
    current = null;
    var my = ++view;
    root.innerHTML = '<p class="desc-text">読み込み中…</p>';
    var r = await sb.rpc('admin_cases_list', { p_include_closed: listFilter === 'all' });
    if (my !== view) return;
    if (r.error) { root.innerHTML = missingSql(r.error.message) ? NO_SQL : '<p class="ap-err">読み込みエラー: ' + esc(r.error.message) + '</p>'; return; }
    var rows = r.data || [];
    var open = rows.filter(function (c) { return !closed(c); });
    var h = '<div class="toolbar"><button class="btn btn-primary btn-sm" id="case-new">新しい受付</button>'
      + '<select class="form-input" id="case-filter" style="max-width:160px;"><option value="open"' + (listFilter === 'open' ? ' selected' : '') + '>対応中</option><option value="all"' + (listFilter === 'all' ? ' selected' : '') + '>すべて</option></select></div>';
    h += '<p class="desc-text">対応中 ' + open.length + ' 件。期限の近いものから並んでいます。</p>';
    if (!rows.length) h += '<p class="desc-text" style="text-align:center;padding:var(--space-lg);">受付はまだありません。報告やお問い合わせの「受付簿に入れる」から登録できます。</p>';
    h += rows.map(function (c) {
      return '<div class="item-card case-row' + (closed(c) ? ' done' : '') + '" data-case-open="' + c.id + '">'
        + '<div class="case-row__head"><strong>#' + c.id + ' ' + esc(KIND[c.kind] || c.kind) + '</strong><span class="case-status case-status--' + esc(c.status) + '">' + esc(STATUS[c.status] || c.status) + '</span></div>'
        + '<div>' + esc(c.item_label ? (TYPE[c.item_type] || '') + ' · ' + c.item_label : '（対象はまだ決めていません）') + '</div>'
        + '<div class="item-meta">' + esc((c.requester || '申出た人 不明') + ' · 受付 ' + jstDate(c.received_at))
        + (c.poster_name ? ' · 投稿者 ' + esc(c.poster_name) : '') + (c.poster_suspended ? ' <span class="nav-badge">停止中</span>' : '') + '</div>'
        + '<div>' + dueChip(nextDue(c), closed(c)) + (c.status === 'asked' && !c.ask_replied_at ? ' <span class="item-meta">照会の返事待ち</span>' : '') + '</div>'
        + '</div>';
    }).join('');
    root.innerHTML = h;
    document.getElementById('case-filter').addEventListener('change', function () { listFilter = this.value; window.loadCases(); });
    document.getElementById('case-new').addEventListener('click', async function () {
      var s = await sb.rpc('admin_case_save', { p: { kind: 'takedown', due_at: new Date(Date.now() + 7 * DAY).toISOString() } });
      if (rpcErr(s)) { toast('作れませんでした: ' + rpcErr(s)); return; }
      openCase(s.data.id);
    });
    root.querySelectorAll('[data-case-open]').forEach(function (el) { el.addEventListener('click', function () { openCase(Number(el.getAttribute('data-case-open'))); }); });
  };

  function backToList() { current = null; window.loadCases(); window.scrollTo(0, 0); if (window.refreshInbox) window.refreshInbox(); }

  function opt(map, v) { return Object.keys(map).map(function (k) { return '<option value="' + k + '"' + (k === v ? ' selected' : '') + '>' + esc(map[k]) + '</option>'; }).join(''); }

  async function openCase(id) {
    var root = document.getElementById('cases-root');
    var my = ++view;
    var r = await sb.rpc('admin_case_get', { p_id: id });
    if (my !== view) return;
    if (rpcErr(r)) { toast('開けませんでした: ' + rpcErr(r)); return window.loadCases(); }
    current = r.data;
    var c = current.case, po = current.poster, hold = current.hold;
    if (current.events && window.loadPeopleNames) await loadPeopleNames(current.events.map(function (e) { return e.target_type === 'user' ? e.target_id : null; }).filter(Boolean));
    var url = itemUrl(c.item_type, c.item_id, c.item_label, po);
    var h = '<div class="toolbar"><button class="btn btn-outline btn-sm" id="case-back">‹ 一覧に戻る</button></div>'
      + '<h3 class="ap-h3">#' + c.id + ' ' + esc(KIND[c.kind] || c.kind) + ' ' + dueChip(nextDue(c), closed(c)) + '</h3>';

    // --- the request itself ---
    h += '<form id="case-form" class="stat-card case-card"><div class="case-card__title">申出</div><div class="case-grid">'
      + '<label>種類<select class="form-input" name="kind">' + opt(KIND, c.kind) + '</select></label>'
      + '<label>状態<select class="form-input" name="status">' + opt(STATUS, c.status) + '</select></label>'
      + '<label>受け付けた日<input class="form-input" type="date" name="received_at" value="' + esc(jstDate(c.received_at)) + '"></label>'
      + '<label>期限<input class="form-input" type="date" name="due_at" value="' + esc(jstDate(c.due_at)) + '"></label>'
      + '<label>申出た人<input class="form-input" name="requester" value="' + esc(c.requester || '') + '" placeholder="名前・会社・代理人など"></label>'
      + '<label>連絡先<input class="form-input" name="requester_contact" value="' + esc(c.requester_contact || '') + '" placeholder="メール・住所など"></label>'
      + '</div><label class="case-wide">申出の内容<textarea class="form-input" name="summary" rows="4" placeholder="どの投稿の、どこが、どの権利を侵害しているという申出か">' + esc(c.summary || '') + '</textarea></label>'
      + '<label class="case-wide">判断と理由<textarea class="form-input" name="decision" rows="3" placeholder="例: 写真は申出人が撮ったものと確認できたため削除">' + esc(c.decision || '') + '</textarea></label>'
      + '<div class="ap-actions"><button class="btn btn-primary btn-sm" type="submit">保存</button></div></form>';

    // --- the item and its poster ---
    h += '<div class="stat-card case-card"><div class="case-card__title">対象の投稿と投稿者</div>';
    if (c.item_type) {
      h += '<div><strong>' + esc(TYPE[c.item_type] || '') + '</strong> · ' + esc(c.item_label || c.item_id) + '</div>'
        + (url ? '<div class="item-meta" style="word-break:break-all;">' + esc(url) + '</div>' : '')
        + (hold ? '<p class="ap-held">保全中（' + esc(jstText(hold.held_at)) + '〜）' + (hold.reason ? ' — ' + esc(hold.reason) : '') + '</p>'
                : '<p class="ap-note">まだ保全していません。投稿の記録は 180 日で消えるので、先に保全してください。</p>');
    } else {
      h += '<p class="ap-note">対象の投稿をまだ決めていません。ページや写真のアドレス、ID、名前を入れて「決める」を押してください。</p>';
    }
    h += '<div class="case-find"><input class="form-input" id="case-item-q" placeholder="例: https://aroidorigins.com/anthurium/…"><button class="btn btn-outline btn-sm" id="case-item-set">' + (c.item_type ? '変える' : '決める') + '</button></div>';
    if (po) {
      h += '<div class="case-poster"><div><strong>投稿者</strong> ' + esc(po.display_name || '（表示名なし）') + (po.username ? ' @' + esc(po.username) : '')
        + (po.suspended ? ' <span class="nav-badge">停止中</span>' : '') + '</div><div class="item-meta">' + esc(po.email || '') + '</div></div>';
    } else if (c.item_type) {
      h += '<p class="ap-note">投稿者がわかりません（ログインせずに作られたか、記録が残っていません）。</p>';
    }
    h += '<div class="ap-actions">';
    if (c.item_type) h += '<button class="btn btn-outline btn-sm" data-case-poster="' + esc(c.item_type + ':' + c.item_id) + '">' + (hold ? '投稿者を調べる' : '投稿者を調べて保全する') + '</button>';
    if (po) h += po.suspended ? '<button class="btn btn-outline btn-sm" data-suspend="off" data-user="' + esc(po.id) + '" data-case="' + c.id + '">停止を解く</button>'
                              : '<button class="btn btn-danger btn-sm" data-suspend="on" data-user="' + esc(po.id) + '" data-case="' + c.id + '" data-name="' + esc(po.display_name || po.email || '') + '">利用を停止</button>';
    h += '</div></div>';

    // --- asking the poster ---
    h += '<div class="stat-card case-card"><div class="case-card__title">投稿者への照会</div>';
    if (c.asked_at) {
      h += '<p>' + esc(jstText(c.asked_at)) + ' に送りました。返事の期限 ' + esc(jstDate(c.ask_due_at)) + '</p>';
      h += c.ask_replied_at ? '<p class="ap-held">返事（' + esc(jstText(c.ask_replied_at)) + '）<br>' + esc(c.ask_reply) + '</p>'
        : '<label class="case-wide">投稿者の返事<textarea class="form-input" id="case-reply" rows="3" placeholder="返事の要点（同意する・しない、その理由）"></textarea></label><div class="ap-actions"><button class="btn btn-outline btn-sm" id="case-reply-save">返事を記録</button></div>';
    }
    if (!po || !po.email) {
      h += '<p class="ap-note">投稿者のメールアドレスがわからないため、照会のメールを作れません。</p>';
    } else {
      h += '<p class="ap-note">' + (c.asked_at ? 'もう一度送るときは、' : '') + '下の文面を直してから、メールソフトで送ってください。送ったら「送ったことを記録」を押すと、返事の期限がこの受付に入ります。</p>'
        + '<div class="case-grid"><label>返事の期限<select class="form-input" id="case-ask-days"><option value="7">7 日後</option><option value="14"' + (c.kind === 'disclosure' ? ' selected' : '') + '>14 日後</option></select></label>'
        + '<label>宛先<input class="form-input" id="case-ask-to" value="' + esc(po.email) + '" readonly></label></div>'
        + '<label class="case-wide">件名<input class="form-input" id="case-ask-subject"></label>'
        + '<label class="case-wide">本文<textarea class="form-input" id="case-ask-body" rows="12"></textarea></label>'
        + '<div class="ap-actions"><a class="btn btn-outline btn-sm" id="case-ask-mail" href="#">メールソフトで開く</a><button class="btn btn-outline btn-sm" id="case-ask-copy">文面をコピー</button><button class="btn btn-primary btn-sm" id="case-ask-sent">送ったことを記録</button></div>';
    }
    h += '</div>';

    // --- the response document ---
    h += '<div class="stat-card case-card"><div class="case-card__title">回答書</div>'
      + '<p class="ap-note">この受付の内容と経過を、印刷や PDF にできる形で開きます。誰に渡すかに合わせて、入れる情報を選んでください。</p>'
      + '<label class="case-check"><input type="checkbox" id="case-x-email"> 投稿者のメールアドレスと登録日を入れる</label>'
      + '<label class="case-check"><input type="checkbox" id="case-x-log"> 投稿の記録（日時・IP アドレス・端末）を入れる</label>'
      + '<label class="case-check"><input type="checkbox" id="case-x-ask" checked> 投稿者への照会と返事を入れる</label>'
      + '<div class="ap-actions"><button class="btn btn-primary btn-sm" id="case-export">回答書を開く</button></div></div>';

    // --- notes and history ---
    h += '<div class="stat-card case-card"><div class="case-card__title">メモと経過</div>'
      + '<div class="case-find"><textarea class="form-input" id="case-note" rows="2" placeholder="電話で確認した、など"></textarea><button class="btn btn-outline btn-sm" id="case-note-add">メモを足す</button></div>'
      + eventsHtml(current.events) + '</div>';
    root.innerHTML = h;
    window.scrollTo(0, 0);
    bindCase(url);
  }

  function eventText(e) {
    var d = e.detail || {};
    var t = ACTION[e.action] || e.action;
    if (e.action === 'case_update' && d.changed) {
      var names = [];
      d.changed.forEach(function (k) { var n = FIELD[k] || k; if (names.indexOf(n) < 0) names.push(n); });
      t += '（' + names.join('・') + (d.status ? ' → ' + (STATUS[d.status] || d.status) : '') + '）';
    }
    if (e.action === 'case_ask') t += '（返事の期限 ' + (d.days || '') + ' 日）';
    if ((e.action === 'case_note' || e.action === 'case_reply') && d.body) t += ': ' + d.body;
    if ((e.action === 'suspend' || e.action === 'hold_on') && d.reason) t += ': ' + d.reason;
    if (e.action === 'suspend' && d.until) t += '（' + jstDate(d.until) + ' まで）';
    if (e.action === 'case_export' && d.what) t += '（' + d.what + '）';
    return t;
  }
  function eventsHtml(evs) {
    if (!evs || !evs.length) return '<p class="ap-note">まだ経過はありません。</p>';
    return '<ul class="case-events">' + evs.map(function (e) {
      return '<li><span class="case-events__at">' + esc(jstText(e.at)) + '</span> ' + esc(eventText(e)) + '</li>';
    }).join('') + '</ul>';
  }

  function askText(c, po, url, days) {
    var dueAt = Date.now() + days * DAY;
    var name = (po && (po.display_name || po.username)) || '投稿者';
    var what = (TYPE[c.item_type] || '投稿') + '「' + (c.item_label || '') + '」';
    var lines = [name + ' 様', '', 'Aroid Origins の運営です。'];
    if (c.kind === 'disclosure') {
      lines.push('あなたが投稿した次の内容について、あなたを特定する情報（発信者情報）の開示を求める請求がありました。');
    } else {
      lines.push('あなたが投稿した次の内容について、権利を侵害しているという申出がありました。');
    }
    lines.push('', '投稿: ' + what);
    if (url) lines.push(url);
    if (c.summary) lines.push('申出の内容: ' + c.summary);
    lines.push('');
    if (c.kind === 'disclosure') {
      lines.push('開示に同意されるかどうかを、' + jstLong(dueAt) + 'までにこのメールへの返信でお知らせください。同意されない場合は、その理由もお書きください。お返事は、開示するかどうかの判断に使います。');
    } else {
      lines.push('この投稿の削除に同意されるかどうかを、' + jstLong(dueAt) + 'までにこのメールへの返信でお知らせください。同意されない場合は、その理由もお書きください。');
      lines.push('期限までにお返事がない場合、投稿を削除することがあります。');
    }
    lines.push('', 'Aroid Origins 運営');
    return { subject: c.kind === 'disclosure' ? 'Aroid Origins に投稿された内容についてのご意見の照会' : 'Aroid Origins に投稿された内容についてのご確認', body: lines.join('\n') };
  }

  function bindCase(url) {
    var c = current.case, po = current.poster;
    document.getElementById('case-back').addEventListener('click', backToList);
    document.getElementById('case-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, p = { id: c.id };
      ['kind', 'status', 'requester', 'requester_contact', 'summary', 'decision'].forEach(function (k) { p[k] = f.elements[k].value.trim(); });
      var rv = f.elements.received_at.value, dv = f.elements.due_at.value;
      if (rv !== jstDate(c.received_at)) p.received_at = dateIso(rv, false);
      if (dv !== jstDate(c.due_at)) p.due_at = dateIso(dv, true);
      var s = await sb.rpc('admin_case_save', { p: p });
      if (rpcErr(s)) { toast('保存できませんでした: ' + rpcErr(s)); return; }
      toast('保存しました');
      openCase(c.id);
    });
    document.getElementById('case-item-set').addEventListener('click', async function () {
      var q = document.getElementById('case-item-q').value.trim();
      if (!q) return;
      var t = window.posterResolve ? await window.posterResolve(q) : null;
      var p = { id: c.id, poster_id: '' };
      if (t && t.type) { p.item_type = t.type; p.item_id = String(t.id); p.item_label = t.label || q; }
      else if (t && t.user) { p.item_type = 'profile'; p.item_id = t.user; p.item_label = (window.personName ? personName(t.user) : '') || t.user; }
      else { toast('投稿を見つけられませんでした。アドレスか ID を入れてください'); return; }
      var s = await sb.rpc('admin_case_save', { p: p });
      if (rpcErr(s)) { toast('保存できませんでした: ' + rpcErr(s)); return; }
      openCase(c.id);
    });
    document.querySelectorAll('[data-case-poster]').forEach(function (b) {
      b.addEventListener('click', function () { openPosterLookup(b.getAttribute('data-case-poster')); });
    });
    var bodyEl = document.getElementById('case-ask-body');
    if (bodyEl) {
      var daysEl = document.getElementById('case-ask-days'), subjEl = document.getElementById('case-ask-subject'), mail = document.getElementById('case-ask-mail');
      var fill = function () { var t = askText(c, po, url, Number(daysEl.value)); subjEl.value = t.subject; bodyEl.value = t.body; };
      fill();
      daysEl.addEventListener('change', fill);
      mail.addEventListener('click', function (e) {
        e.preventDefault();
        window.location.href = 'mailto:' + encodeURIComponent(po.email) + '?subject=' + encodeURIComponent(subjEl.value) + '&body=' + encodeURIComponent(bodyEl.value);
      });
      document.getElementById('case-ask-copy').addEventListener('click', function () {
        var txt = '件名: ' + subjEl.value + '\n\n' + bodyEl.value;
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('コピーしました'); }, function () { prompt('コピーしてください', txt); });
      });
      document.getElementById('case-ask-sent').addEventListener('click', async function () {
        if (!confirm(po.email + ' に照会を送ったことを記録します。返事の期限は ' + daysEl.value + ' 日後です。')) return;
        var s = await sb.rpc('admin_case_step', { p_id: c.id, p_step: 'ask', p_body: po.email, p_days: Number(daysEl.value) });
        if (rpcErr(s)) { toast('記録できませんでした: ' + rpcErr(s)); return; }
        toast('照会を送ったことを記録しました');
        openCase(c.id);
      });
    }
    var rs = document.getElementById('case-reply-save');
    if (rs) rs.addEventListener('click', async function () {
      var s = await sb.rpc('admin_case_step', { p_id: c.id, p_step: 'reply', p_body: document.getElementById('case-reply').value });
      if (rpcErr(s)) { toast('記録できませんでした: ' + rpcErr(s)); return; }
      openCase(c.id);
    });
    document.getElementById('case-note-add').addEventListener('click', async function () {
      var s = await sb.rpc('admin_case_step', { p_id: c.id, p_step: 'note', p_body: document.getElementById('case-note').value });
      if (rpcErr(s)) { toast('足せませんでした: ' + rpcErr(s)); return; }
      openCase(c.id);
    });
    document.getElementById('case-export').addEventListener('click', function () { exportCase(url); });
  }

  // ================= 回答書 =================
  async function exportCase(url) {
    var c = current.case, po = current.poster, hold = current.hold;
    var withEmail = document.getElementById('case-x-email').checked;
    var withLog = document.getElementById('case-x-log').checked;
    var withAsk = document.getElementById('case-x-ask').checked;
    var win = window.open('', '_blank');
    if (!win) { toast('新しいタブを開けませんでした。ポップアップを許可してください'); return; }
    win.document.write('<p style="font-family:sans-serif">作っています…</p>');
    var rows = [], account = null;
    if (withLog && c.item_type) {
      var lr = await sb.rpc('admin_post_log', { p_item_type: c.item_type, p_item_id: String(c.item_id), p_limit: 500 });
      rows = (lr.data || []).slice().reverse();
    }
    if (withEmail && po) {
      var ar = await sb.rpc('admin_post_account', { p_user: po.id });
      account = ar.data || null;
    }
    var what = [withEmail ? 'メールアドレス' : '', withLog ? '投稿の記録' : '', withAsk ? '照会' : ''].filter(Boolean).join('・') || '受付の内容だけ';
    sb.rpc('admin_case_step', { p_id: c.id, p_step: 'export', p_body: what });
    var ACT = { create: '投稿', edit: '編集', 'delete': '削除' };
    var dev = window.posterDevice || function (x) { return x || ''; };
    var jstFull = window.posterJst || jstText;
    function row(k, v) { return v ? '<tr><th>' + esc(k) + '</th><td>' + esc(v).replace(/\n/g, '<br>') + '</td></tr>' : ''; }
    var steps = (current.events || []).filter(function (e) { return e.action !== 'lookup' && e.action !== 'case_export' && e.action !== 'case_note'; });
    var html = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>回答書 #' + c.id + '</title>'
      + '<style>body{font-family:"Hiragino Sans","Noto Sans JP",sans-serif;color:#222;max-width:760px;margin:24px auto;padding:0 16px;line-height:1.7;font-size:14px}'
      + 'h1{font-size:20px;margin:0 0 4px}h2{font-size:15px;border-bottom:1px solid #999;margin:24px 0 8px;padding-bottom:2px}'
      + 'table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:4px 8px;text-align:left;vertical-align:top}th{background:#f3f3f3;width:9em;font-weight:600}'
      + '.log th{width:auto}.meta{color:#555;font-size:12px}.mono{font-family:ui-monospace,Menlo,monospace;font-size:12px}'
      + '.bar{margin:16px 0}@media print{.bar{display:none}body{margin:0}}</style></head><body>'
      + '<div class="bar"><button onclick="window.print()">印刷・PDF にする</button></div>'
      + '<h1>' + esc(KIND[c.kind] || '申出') + 'についての回答書</h1>'
      + '<div class="meta">受付番号 ' + c.id + ' ・ 作成日 ' + esc(jstLong(Date.now())) + ' ・ Aroid Origins 運営（https://aroidorigins.com/）</div>'
      + '<h2>申出</h2><table>' + row('種類', KIND[c.kind]) + row('受け付けた日', jstLong(c.received_at)) + row('申出た人', c.requester)
      + row('連絡先', c.requester_contact) + row('申出の内容', c.summary) + '</table>'
      + '<h2>対象の投稿</h2><table>' + row('種類', TYPE[c.item_type]) + row('名称', c.item_label) + row('アドレス', url) + row('ID', c.item_id)
      + row('保全', hold ? jstFull(hold.held_at) + ' から保全（自動では消えません）' : '') + '</table>';
    if (account && !account.missing) {
      html += '<h2>投稿者</h2><table>' + row('メールアドレス', account.email) + row('表示名', account.display_name) + row('登録日', jstFull(account.created_at))
        + row('最後のログイン', jstFull(account.last_sign_in_at)) + '</table>';
    }
    if (withLog) {
      html += '<h2>投稿の記録</h2>' + (rows.length
        ? '<table class="log"><tr><th>日時（日本時間）</th><th>操作</th><th>IP アドレス</th><th>端末</th></tr>' + rows.map(function (r) {
            return '<tr><td class="mono">' + esc(jstFull(r.at)) + '</td><td>' + esc(ACT[r.action] || r.action) + '</td><td class="mono">' + esc(r.ip || '-') + '</td><td>' + esc(dev(r.user_agent)) + '</td></tr>';
          }).join('') + '</table><p class="meta">端末の欄はブラウザの情報からの推定です。元の文字列は運営が保管しています。</p>'
        : '<p>この投稿の記録は残っていません。</p>');
    }
    if (withAsk && c.asked_at) {
      html += '<h2>投稿者への照会</h2><table>' + row('照会した日', jstFull(c.asked_at)) + row('返事の期限', jstLong(c.ask_due_at))
        + row('返事', c.ask_replied_at ? jstFull(c.ask_replied_at) + '\n' + (c.ask_reply || '') : (Date.now() < Date.parse(c.ask_due_at) ? 'まだ返事はありません（期限前）' : '期限までに返事はありませんでした')) + '</table>';
    }
    html += '<h2>判断と対応</h2><table>' + row('状態', STATUS[c.status]) + row('判断と理由', c.decision || '（記入なし）') + '</table>';
    if (steps.length) html += '<h2>対応の経過</h2><table class="log">' + steps.map(function (e) { return '<tr><td class="mono">' + esc(jstText(e.at)) + '</td><td>' + esc(eventText(e)) + '</td></tr>'; }).join('') + '</table>';
    html += '</body></html>';
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  // ================= 受付簿に入れる (from 報告, お問い合わせ, 投稿者を調べる) =================
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-case-from]');
    if (!b) return;
    e.preventDefault();
    var from = b.getAttribute('data-case-from'), src = b.getAttribute('data-case-src');
    var p = { kind: 'takedown' };
    if (from === 'report') {
      var r = window.reportById && window.reportById(src);
      if (!r) return;
      p.source_type = 'report'; p.source_id = String(r.id);
      p.item_type = r.target_type; p.item_id = String(r.target_id); p.item_label = r.target_name || '';
      p.requester = r.user_id && window.personName ? 'サイトの報告（' + personName(r.user_id) + '）' : 'サイトの報告（ログインなし）';
      p.summary = (r.reason ? (window.reportReasonLabel ? reportReasonLabel(r.reason) : r.reason) + (r.reason_detail ? ': ' : '') : '') + (r.reason_detail || '');
      p.received_at = r.created_at;
    } else if (from === 'contact') {
      var m = window._contactCache && window._contactCache[src];
      if (!m) return;
      p.source_type = 'contact'; p.source_id = String(m.id);
      p.requester = m.name; p.requester_contact = m.email; p.summary = m.message; p.received_at = m.created_at;
    } else {
      p.item_type = b.getAttribute('data-item-type'); p.item_id = b.getAttribute('data-item-id'); p.item_label = b.getAttribute('data-item-label');
    }
    p.due_at = new Date(Date.parse(p.received_at || new Date().toISOString()) + 7 * DAY).toISOString();
    b.disabled = true;
    // the same report or message already has a 受付: open that one
    if (p.source_type) {
      var l = await sb.rpc('admin_cases_list', { p_include_closed: true });
      if (l.error) { b.disabled = false; toast(missingSql(l.error.message) ? '受付簿の SQL がまだ入っていません' : '読めませんでした: ' + l.error.message); return; }
      var had = (l.data || []).find(function (x) { return x.source_type === p.source_type && x.source_id === p.source_id; });
      if (had) { b.disabled = false; showSection('cases'); return openCase(had.id); }
    }
    var s = await sb.rpc('admin_case_save', { p: p });
    b.disabled = false;
    if (rpcErr(s)) { toast(missingSql(rpcErr(s)) ? '受付簿の SQL がまだ入っていません' : '登録できませんでした: ' + rpcErr(s)); return; }
    toast('受付簿に入れました');
    showSection('cases');
    openCase(s.data.id);
  });

  // ================= 利用停止 =================
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-suspend]');
    if (!b) return;
    e.preventDefault();
    var on = b.getAttribute('data-suspend') === 'on', uid = b.getAttribute('data-user');
    var caseId = b.getAttribute('data-case') ? Number(b.getAttribute('data-case')) : null;
    var reason = null, until = null;
    if (on) {
      reason = prompt((b.getAttribute('data-name') || 'この人') + ' の利用を停止します。\n停止中は投稿・編集・写真の追加・プロフィールの変更ができません（読むこと、自分の投稿の削除、お問い合わせはできます）。\n\n理由（本人には見えません）', '');
      if (reason === null) return;
      var days = prompt('停止する日数（空欄なら、解くまでずっと）', '');
      if (days === null) return;
      if (String(days).trim()) {
        var n = Number(String(days).trim());
        if (!(n > 0)) { toast('日数は 1 以上の数で入れてください'); return; }
        until = new Date(Date.now() + n * DAY).toISOString();
      }
    } else if (!confirm('停止を解きます。この人はまた投稿できるようになります。')) return;
    b.disabled = true;
    var r = await sb.rpc('admin_suspend', { p_user: uid, p_on: on, p_reason: reason || null, p_until: until, p_case_id: caseId });
    b.disabled = false;
    if (rpcErr(r)) { toast((on ? '停止' : '解除') + 'できませんでした: ' + (missingSql(rpcErr(r)) ? '利用停止の SQL がまだ入っていません' : rpcErr(r))); return; }
    toast(on ? '利用を停止しました' : '停止を解きました');
    if (!document.getElementById('sec-users').classList.contains('hidden') && window.loadUsers) loadUsers();
    if (!document.getElementById('sec-poster').classList.contains('hidden') && window.posterRefresh) window.posterRefresh();
    if (!document.getElementById('sec-suspensions').classList.contains('hidden')) window.loadSuspensions();
    if (current && !document.getElementById('sec-cases').classList.contains('hidden')) openCase(current.case.id);
  });

  window.loadSuspensions = async function () {
    var root = document.getElementById('suspensions-root');
    if (!root) return;
    var r = await sb.rpc('admin_suspensions');
    if (r.error) { root.innerHTML = missingSql(r.error.message) ? NO_SQL : '<p class="ap-err">読み込みエラー: ' + esc(r.error.message) + '</p>'; return; }
    var rows = (r.data || []).filter(function (x) { return x.active; });
    if (!rows.length) { root.innerHTML = '<p class="desc-text" style="text-align:center;padding:var(--space-lg);">停止中のアカウントはありません。ユーザーや投稿者を調べるの「利用を停止」から止められます。</p>'; return; }
    root.innerHTML = rows.map(function (x) {
      return '<div class="item-card"><div><strong>' + esc(x.display_name || '（表示名なし）') + '</strong>' + (x.username ? ' @' + esc(x.username) : '') + '</div>'
        + '<div class="item-meta">' + esc(x.email || '') + '</div>'
        + '<div>' + esc(jstDate(x.since)) + ' 〜 ' + (x.until ? esc(jstDate(x.until)) : '解くまで') + (x.case_id ? ' · 受付 #' + x.case_id : '') + '</div>'
        + (x.reason ? '<div class="item-meta">理由: ' + esc(x.reason) + '</div>' : '')
        + '<div class="item-actions"><button class="btn btn-outline btn-sm" data-user-poster="' + esc(x.user_id) + '">投稿者を調べる</button>'
        + '<button class="btn btn-outline btn-sm" data-suspend="off" data-user="' + esc(x.user_id) + '">停止を解く</button></div></div>';
    }).join('');
    root.querySelectorAll('[data-user-poster]').forEach(function (b) { b.addEventListener('click', function () { openPosterLookup(b.getAttribute('data-user-poster')); }); });
  };

  // ================= 操作記録 =================
  var actFilter = '', actRows = [], actTotal = 0;
  function targetText(a) {
    var d = a.detail || {};
    if (a.target_type === 'case') return '受付 #' + a.target_id;
    if (a.target_type === 'user') return (window.personName ? personName(a.target_id) : '') || a.target_id;
    if (a.target_type === 'cultivar') {
      var c = allCultivars.find(function (x) { return String(x.id) === String(a.target_id); });
      return '記録 · ' + (d.label || (c && c.cultivar_name) || a.target_id);
    }
    if (a.target_type === 'image') return '写真 · ' + (d.label || a.target_id);
    if (a.target_type === 'profile') return 'プロフィール · ' + ((window.personName ? personName(a.target_id) : '') || a.target_id);
    if (a.target_type === 'report') return '報告 · ' + (d.label || '#' + a.target_id);
    if (a.target_type === 'contact') return 'お問い合わせ';
    if (a.target_type === 'search') return '検索「' + a.target_id + '」';
    return a.target_id || '';
  }
  async function loadActions(more) {
    var root = document.getElementById('actions-root');
    if (!root) return;
    if (!more) { actRows = []; root.innerHTML = '<p class="desc-text">読み込み中…</p>'; }
    var r = await sb.rpc('admin_actions_list', { p_action: actFilter || null, p_limit: 100, p_offset: actRows.length });
    if (rpcErr(r)) { root.innerHTML = missingSql(rpcErr(r)) ? NO_SQL : '<p class="ap-err">読み込みエラー: ' + esc(rpcErr(r)) + '</p>'; return; }
    actRows = actRows.concat(r.data.rows || []);
    actTotal = r.data.total || 0;
    if (window.loadPeopleNames) await loadPeopleNames(actRows.map(function (a) { return a.target_type === 'user' || a.target_type === 'profile' ? a.target_id : null; }).filter(Boolean));
    var F = { '': 'すべて', case_: '受付簿', suspend: '利用停止', unsuspend: '停止の解除', hold_: '保全', report_: '報告の処理', contact_: 'お問い合わせ', 'delete': '削除', lookup: '投稿者を調べた' };
    var h = '<div class="toolbar"><select class="form-input" id="act-filter" style="max-width:200px;">' + Object.keys(F).map(function (k) { return '<option value="' + k + '"' + (k === actFilter ? ' selected' : '') + '>' + F[k] + '</option>'; }).join('') + '</select>'
      + '<span class="item-meta">' + actTotal + ' 件</span></div>';
    h += actRows.length ? '<table class="data-table"><thead><tr><th>日時</th><th>操作</th><th>対象</th><th>管理者</th></tr></thead><tbody>' + actRows.map(function (a) {
      return '<tr><td style="font-size:var(--font-size-xs);white-space:nowrap;">' + esc(jstText(a.at)) + '</td><td style="font-size:var(--font-size-sm);">' + esc(eventText(a)) + '</td>'
        + '<td style="font-size:var(--font-size-sm);">' + (a.target_type === 'case' ? '<a href="#" data-act-case="' + esc(a.target_id) + '">' + esc(targetText(a)) + '</a>' : esc(targetText(a))) + '</td>'
        + '<td style="font-size:var(--font-size-xs);word-break:break-all;">' + esc(a.admin_email || '') + '</td></tr>';
    }).join('') + '</tbody></table>' : '<p class="desc-text" style="text-align:center;padding:var(--space-lg);">まだ記録はありません。</p>';
    if (actRows.length < actTotal) h += '<div class="ap-actions"><button class="btn btn-outline btn-sm" id="act-more">もっと見る</button></div>';
    root.innerHTML = h;
    document.getElementById('act-filter').addEventListener('change', function () { actFilter = this.value; loadActions(false); });
    var mb = document.getElementById('act-more');
    if (mb) mb.addEventListener('click', function () { loadActions(true); });
    root.querySelectorAll('[data-act-case]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); showSection('cases'); openCase(Number(a.getAttribute('data-act-case'))); }); });
  }
  window.loadActions = function () { loadActions(false); };
})();
