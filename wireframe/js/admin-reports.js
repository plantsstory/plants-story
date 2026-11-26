/* Admin: reports (誤りを報告 on an entry, 報告 / 削除依頼 on a photo), admin reorganisation 2026-11-26.
   Before, the only answer to a report was 承認(削除), which deleted the whole entry even when the report was a
   small mistake in the text. Now each report shows the entry or photo, the reason and who sent it, and the
   owner chooses: 直した (fixed by hand), 記録ごと削除 / 写真を削除, or 却下.
   Statuses: pending → fixed | approved (deleted) | rejected.
   Uses admin.html globals: sb, toast, escapeHtml, allCultivars, loadPeopleNames, personName, fmtDate,
   imgTag, fillPrivateImages, deleteCultivar, showSection. */
(function () {
  'use strict';
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  var REASON = {
    duplicate: '重複している', wrong_info: '誤った情報', created_by_mistake: '間違えて作成した', spam: 'スパム・不適切な内容',
    irrelevant: '無関係な写真', inappropriate: '不適切な写真', copyright: '著作権侵害の可能性', uploaded_by_mistake: '間違えてアップロードした',
    other: 'その他'
  };
  var STATUS = { pending: '未対応', fixed: '直した', approved: '削除した', rejected: '却下' };
  var tab = 'cultivar';

  // the photo rows and reporter names a list of requests needs
  async function annotate(reqs) {
    var imgIds = reqs.filter(function (r) { return r.target_type === 'image'; }).map(function (r) { return Number(r.target_id); }).filter(function (n) { return n > 0; });
    var imgs = {};
    if (imgIds.length) {
      var q = await sb.from('cultivar_images').select('*').in('id', imgIds);
      ((q && q.data) || []).forEach(function (x) { imgs[x.id] = x; });
    }
    await loadPeopleNames(reqs.map(function (r) { return r.user_id; }).concat(Object.keys(imgs).map(function (k) { return imgs[k].user_id; })));
    reqs.forEach(function (r) {
      if (r.target_type === 'image') r._img = imgs[Number(r.target_id)] || null;
      else r._entry = allCultivars.find(function (c) { return String(c.id) === String(r.target_id); }) || null;
    });
    return reqs;
  }

  window.reportCardHtml = function (r) {
    var pending = r.status === 'pending' || !r.status;
    var reason = REASON[r.reason] || r.reason || '';
    var h = '<div class="item-card' + (pending ? '' : ' done') + '" data-report-id="' + r.id + '"><div style="display:flex;gap:var(--space-md);align-items:flex-start;flex-wrap:wrap;">';
    if (r.target_type === 'image') {
      h += '<div style="width:120px;flex-shrink:0;">' + (r._img ? imgTag(r._img.storage_path) : '<div class="desc-text">写真はもうありません</div>') + '</div>';
    }
    h += '<div style="flex:1;min-width:220px;">';
    var entry = r._entry || (r._img && allCultivars.find(function (c) { return (r._img.cultivar_id && c.id === r._img.cultivar_id) || c.cultivar_name === r._img.cultivar_name; }));
    h += '<div style="font-weight:600;margin-bottom:4px;">' + (r.target_type === 'image' ? '写真 · ' : '記録 · ')
      + (entry ? '<a href="#" data-open-entry="' + entry.id + '">' + esc(entry.cultivar_name) + '</a>' : esc(r.target_name || ('ID ' + r.target_id)) + (r.target_type === 'cultivar' ? ' <span class="text-muted">（記録はもうありません）</span>' : '')) + '</div>';
    h += '<div style="font-size:var(--font-size-sm);">理由: <strong>' + esc(reason) + '</strong></div>';
    if (r.reason_detail) h += '<div style="font-size:var(--font-size-sm);white-space:pre-wrap;margin-top:2px;">「' + esc(r.reason_detail) + '」</div>';
    h += '<div class="item-meta" style="margin-top:4px;">報告: ' + esc(r.user_id ? personName(r.user_id) : '（ログインなし）') + ' · ' + esc(new Date(r.created_at).toLocaleString('ja-JP'))
      + (r._img ? ' · 写真の投稿: ' + esc(personName(r._img.user_id)) + (r._img.credit ? '（' + esc(r._img.credit) + '）' : '') : '') + '</div>';
    if (!pending) h += '<div class="item-meta">' + esc(STATUS[r.status] || r.status) + (r.resolved_at ? ' · ' + esc(fmtDate(r.resolved_at)) : '') + '</div>';
    if (pending) {
      h += '<div class="item-actions">';
      if (r.target_type === 'cultivar') {
        if (r._entry) h += '<button class="btn btn-outline btn-sm" data-open-entry="' + r._entry.id + '">記録を開いて直す</button>';
        h += '<button class="btn btn-primary btn-sm" data-report-act="fixed">直した</button>';
        if (r._entry) h += '<button class="btn btn-danger btn-sm" data-report-act="delete-entry">記録ごと削除</button>';
      } else {
        h += r._img ? '<button class="btn btn-danger btn-sm" data-report-act="delete-photo">写真を削除</button>' : '<button class="btn btn-primary btn-sm" data-report-act="fixed">片付ける</button>';
      }
      h += '<button class="btn btn-outline btn-sm" data-report-act="rejected">却下（問題なし）</button></div>';
    }
    return h + '</div></div></div>';
  };

  var cache = {};
  window.loadDeletionRequests = async function () {
    var open = await sb.from('deletion_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    if (open.error) { toast('報告の取得エラー: ' + open.error.message); return; }
    var done = await sb.from('deletion_requests').select('*').neq('status', 'pending').order('resolved_at', { ascending: false, nullsFirst: false }).limit(40);
    var all = await annotate((open.data || []).concat((done && done.data) || []));
    all.forEach(function (r) { cache[r.id] = r; });
    var pend = all.filter(function (r) { return r.status === 'pending'; });
    var lists = {
      cultivar: pend.filter(function (r) { return r.target_type === 'cultivar'; }),
      image: pend.filter(function (r) { return r.target_type === 'image'; }),
      done: all.filter(function (r) { return r.status !== 'pending'; })
    };
    ['cultivar', 'image', 'done'].forEach(function (k) {
      document.getElementById('dr-' + k + '-list').innerHTML = lists[k].map(window.reportCardHtml).join('');
      document.getElementById('dr-' + k + '-empty').style.display = lists[k].length ? 'none' : '';
    });
    document.getElementById('dr-n-cultivar').textContent = lists.cultivar.length ? '(' + lists.cultivar.length + ')' : '';
    document.getElementById('dr-n-image').textContent = lists.image.length ? '(' + lists.image.length + ')' : '';
    fillPrivateImages(document.getElementById('sec-delete-requests'));
  };

  // the open reports about one entry and its photos (the entry page)
  window.reportsFor = async function (c, photos) {
    var r1 = await sb.from('deletion_requests').select('*').eq('status', 'pending').eq('target_type', 'cultivar').eq('target_id', String(c.id));
    var ids = (photos || []).map(function (p) { return String(p.id); });
    var r2 = ids.length ? await sb.from('deletion_requests').select('*').eq('status', 'pending').eq('target_type', 'image').in('target_id', ids) : { data: [] };
    var list = await annotate(((r1 && r1.data) || []).concat((r2 && r2.data) || []));
    list.forEach(function (r) { cache[r.id] = r; });
    return list;
  };

  document.querySelectorAll('.dr-tab').forEach(function (t) {
    t.addEventListener('click', function () {
      tab = t.getAttribute('data-dr-tab');
      document.querySelectorAll('.dr-tab').forEach(function (x) { x.classList.toggle('active', x === t); });
      ['cultivar', 'image', 'done'].forEach(function (k) { document.getElementById('dr-' + k + '-content').classList.toggle('d-none', k !== tab); });
    });
  });

  async function setStatus(id, status) {
    var u = await sb.from('deletion_requests').update({ status: status, resolved_at: new Date().toISOString() }).eq('id', id).select('id');
    if (u.error) return u.error.message;
    if (!u.data || !u.data.length) return '更新が許可されませんでした';
    return null;
  }

  async function after() {
    var sec = document.getElementById('sec-delete-requests');
    if (sec && !sec.classList.contains('hidden')) await window.loadDeletionRequests();
    var ent = document.getElementById('sec-entry');
    if (ent && !ent.classList.contains('hidden') && window.renderEntry) window.renderEntry();
    if (window.refreshInbox) window.refreshInbox();
  }

  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-report-act]');
    if (!b) return;
    var card = b.closest('[data-report-id]');
    var r = cache[Number(card.getAttribute('data-report-id'))];
    if (!r) return;
    var act = b.getAttribute('data-report-act');
    card.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
    var err = null;
    if (act === 'fixed' || act === 'rejected') {
      err = await setStatus(r.id, act);
      if (!err) toast(act === 'fixed' ? '「直した」にしました' : '却下しました');
    } else if (act === 'delete-entry' && r._entry) {
      var ok = await deleteCultivar(r._entry.id, r._entry.cultivar_name);   // asks first; closes this report too
      if (!ok) { card.querySelectorAll('button').forEach(function (x) { x.disabled = false; }); return; }
    } else if (act === 'delete-photo' && r._img) {
      if (!confirm('この写真を削除しますか？ファイルも消え、取り消せません。')) { card.querySelectorAll('button').forEach(function (x) { x.disabled = false; }); return; }
      var res = await window.deletePhotoFully(r._img);
      if (!res.ok) err = res.error;
      else toast('写真を削除しました' + (res.fileError ? '（ファイルは消せませんでした）' : ''));
    }
    if (err) { toast('できませんでした: ' + err); card.querySelectorAll('button').forEach(function (x) { x.disabled = false; }); return; }
    await after();
  });
})();
