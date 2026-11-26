/* Admin: one entry on one page (admin reorganisation 2026-11-26). Everything about a name in one place:
   its facts, the reports and AI suggestions waiting on it, its origins (edit / delete / re-research),
   its photos, its change history with undo, and verification.
   Also the two deletes that must take files with them: a photo (row + file) and a whole entry
   (row + photo rows + photo files + parent photos), each closing the open reports about what it removed.
   Uses admin.html globals: sb, toast, escapeHtml, allCultivars, allImageRows, photosOf, personName, entryUrl,
   gateState, GATE_LABEL, fmtDate, originsTableHtml, editCultivar, deleteCultivar, reresearchCultivar,
   photoCardHtml, imgTag, fillPrivateImages, showSection, loadAllCultivars. */
(function () {
  'use strict';
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }

  // ---------- deletes ----------
  // files by bucket: pv:<path> lives in private-images, everything else in gallery-images
  async function removeFiles(paths) {
    var pub = [], priv = [], errs = [];
    (paths || []).forEach(function (p) { if (!p) return; if (/^pv:/.test(p)) priv.push(p.slice(3)); else pub.push(p); });
    if (pub.length) { var a = await sb.storage.from('gallery-images').remove(pub); if (a.error) errs.push(a.error.message); }
    if (priv.length) { var b = await sb.storage.from('private-images').remove(priv); if (b.error) errs.push(b.error.message); }
    return errs;
  }
  window.removePhotoFiles = removeFiles;

  async function closeReports(type, ids) {
    if (!ids.length) return;
    await sb.from('deletion_requests').update({ status: 'approved', resolved_at: new Date().toISOString() })
      .eq('target_type', type).in('target_id', ids.map(String)).eq('status', 'pending');
  }

  // one photo: the row first (so a failure leaves nothing half gone), then its file
  window.deletePhotoFully = async function (row) {
    var d = await sb.from('cultivar_images').delete().eq('id', row.id).select('id');
    if (d.error) return { ok: false, error: d.error.message };
    if (!d.data || !d.data.length) return { ok: false, error: '削除が許可されませんでした（権限）' };
    var errs = await removeFiles([row.storage_path]);
    await closeReports('image', [row.id]);
    return { ok: true, fileError: errs.join(' / ') || null };
  };

  function parentPhotoPaths(c) {
    var out = [];
    (c.origins || []).forEach(function (o) {
      if (o && o._type === 'formula' && o.formula) {
        if (o.formula.motherPhoto) out.push(o.formula.motherPhoto);
        if (o.formula.fatherPhoto) out.push(o.formula.fatherPhoto);
      }
    });
    return out;
  }

  // a whole entry: read what belongs to it, delete the entry row, then its photo rows and every file
  window.deleteCultivarFully = async function (c) {
    var a = await sb.from('cultivar_images').select('id, storage_path').eq('cultivar_id', c.id);
    var b = await sb.from('cultivar_images').select('id, storage_path').eq('cultivar_name', c.cultivar_name).is('cultivar_id', null);
    if (a.error || b.error) return { ok: false, error: (a.error || b.error).message };
    var seen = {}, rows = (a.data || []).concat(b.data || []).filter(function (r) { if (seen[r.id]) return false; seen[r.id] = true; return true; });
    var del = await sb.from('cultivars').delete().eq('id', c.id).select('id');
    if (del.error) return { ok: false, error: del.error.message };
    if (!del.data || !del.data.length) return { ok: false, error: '削除が許可されませんでした（権限）' };
    var ids = rows.map(function (r) { return r.id; });
    if (ids.length) {
      var di = await sb.from('cultivar_images').delete().in('id', ids);
      if (di.error) return { ok: false, error: '記録は消えましたが写真の行が残りました: ' + di.error.message };
    }
    // a parent photo another entry still shows stays (a formula can be copied to a sibling entry)
    var others = {};
    (window.allCultivars || []).forEach(function (x) { if (x.id !== c.id) parentPhotoPaths(x).forEach(function (p) { others[p] = true; }); });
    var parents = parentPhotoPaths(c).filter(function (p) { return !others[p]; });
    var paths = rows.map(function (r) { return r.storage_path; }).concat(parents).filter(function (p, i, all) { return p && all.indexOf(p) === i; });
    var errs = await removeFiles(paths);
    await closeReports('cultivar', [c.id]);
    await closeReports('image', ids);
    return { ok: true, photos: ids.length, fileErrors: errs.length };
  };

  // ---------- the entry page ----------
  window.openEntry = function (id) {
    window._openEntryId = Number(id);
    showSection('entry', 'cultivars');
    window.renderEntry();
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-open-entry]');
    if (!a) return;
    e.preventDefault();
    window.openEntry(a.getAttribute('data-open-entry'));
  });
  document.getElementById('btn-entry-back').addEventListener('click', function () { showSection('cultivars'); });

  function fact(label, value) { return '<div><b>' + esc(label) + '</b>' + (value || '<span class="text-muted">—</span>') + '</div>'; }

  window.renderEntry = async function () {
    var root = document.getElementById('entry-root');
    var c = allCultivars.find(function (x) { return x.id === window._openEntryId; });
    if (!c) { root.innerHTML = '<p class="desc-text">この記録は見つかりません（削除された可能性があります）。</p>'; return; }
    var st = gateState(c), photos = photosOf(c), kind = window.EntryMeta ? window.EntryMeta.kind(c) : c.type;
    var reCheck = String(c.verification_note || '').indexOf('[要再確認]') === 0;
    var html = '<h2 class="section-title" style="margin-bottom:4px;">' + esc(c.cultivar_name) + '</h2>'
      + '<div class="item-meta" style="margin-bottom:var(--space-md);">#' + c.id + ' · ' + esc(kind) + ' · ' + (c.is_private ? '非公開' : '公開') + ' · ' + esc(GATE_LABEL[st] || st || '') + '</div>'
      + '<div class="item-actions" style="margin-bottom:var(--space-md);">'
      + (c.is_private ? '' : '<a class="btn btn-outline btn-sm" href="' + esc(entryUrl(c.cultivar_name)) + '" target="_blank" rel="noopener">公開ページ ↗</a>')
      + '<button class="btn btn-outline btn-sm" data-entry-act="edit">名前・区分を編集</button>'
      + '<button class="btn btn-outline btn-sm" id="rr-btn-' + c.id + '" data-entry-act="research">AI再調査</button>'
      + ((c.type === 'clone' || c.type === 'hybrid') ? '<button class="btn btn-outline btn-sm" data-entry-act="kr">キーワードリサーチ</button>' : '')
      + '<button class="btn btn-danger btn-sm" data-entry-act="delete">記録ごと削除</button></div>'
      + '<div class="entry-facts stat-card">'
      + fact('属', esc(c.genus)) + fact('区分', esc(kind))
      + fact('投稿者', esc(personName(c.user_id))) + fact('登録日', esc(fmtDate(c.created_at)))
      + fact('最終更新', esc(fmtDate(c.changed_at || c.updated_at))) + fact('AI 調査', esc(c.ai_status || ''))
      + fact('別名', esc((c.aliases || []).join(' / '))) + fact('産地', esc(c.locality || ''))
      + fact('写真', photos.length + ' 枚') + fact('タグ', esc((c.tags || []).join(' · ')))
      + '</div>';
    html += '<div class="entry-block" id="entry-reports"></div>';
    html += '<div class="entry-block" id="entry-suggest"></div>';
    if (c.type !== 'seedling') {
      html += '<div class="entry-block"><h3>検証</h3><div class="stat-card" style="font-size:var(--font-size-sm);">'
        + (c.verified_at ? (reCheck ? '<strong style="color:#a8712e;">要再確認</strong> ' : '✓ 検証済 ') + esc(fmtDate(c.verified_at)) + ' — ' + esc(String(c.verification_note || '').replace(/^\[要再確認\]\s*/, ''))
          : '未検証') + '<div class="item-actions">'
        + (c.verified_at
          ? (reCheck ? '<button class="btn btn-primary btn-sm" data-entry-verify="on">確認し直した</button>' : '') + '<button class="btn btn-outline btn-sm" data-entry-verify="off">検証済を外す</button>'
          : '<input class="form-input" id="entry-verify-note" placeholder="照合した出典（例: IPNI と照合）" style="max-width:320px;font-size:var(--font-size-xs);"> <button class="btn btn-primary btn-sm" data-entry-verify="on">出典を確認して検証済にする</button>')
        + '</div></div></div>';
    }
    html += '<div class="entry-block"><h3>由来</h3>' + originsTableHtml([c]) + '</div>';
    html += '<div class="entry-block"><h3>写真（' + photos.length + '）</h3><div id="entry-photos" class="card-grid-sm"></div></div>';
    var parents = parentPhotoPaths(c);
    if (parents.length) html += '<div class="entry-block"><h3>親株の写真</h3><div class="card-grid-sm">' + parents.map(function (p) { return '<div class="photo-card">' + imgTag(p) + '</div>'; }).join('') + '</div></div>';
    html += '<div class="entry-block"><h3>変更の履歴</h3><div id="entry-history" class="stat-card"></div></div>';
    root.innerHTML = html;

    // photos: the full rows (credit, caption, link)
    var pr = await sb.from('cultivar_images').select('*').in('id', photos.map(function (p) { return p.id; }).concat([-1])).order('display_order').order('created_at');
    var ph = document.getElementById('entry-photos');
    if (ph) { ph.innerHTML = ((pr && pr.data) || []).map(function (img) { return photoCardHtml(img, { noEntry: true }); }).join('') || '<p class="desc-text">写真はありません</p>'; fillPrivateImages(ph); }
    fillPrivateImages(root);

    // reports about this entry or its photos
    var rep = document.getElementById('entry-reports');
    if (rep && window.reportsFor) {
      var list = await window.reportsFor(c, photos);
      rep.innerHTML = list.length ? '<h3>届いている報告（' + list.length + '）</h3><div class="d-grid gap-md">' + list.map(window.reportCardHtml).join('') + '</div>' : '';
    }
    // AI suggestions waiting on this entry
    var sg = document.getElementById('entry-suggest');
    if (sg) {
      var s = await sb.from('ai_suggestions').select('*').eq('cultivar_id', c.id).eq('status', 'pending').order('field');
      var rows = (s && s.data) || [];
      sg.innerHTML = rows.length && window.aiSuggestionRowHtml ? '<h3>AI の提案（' + rows.length + '）</h3><div class="stat-card">' + rows.map(window.aiSuggestionRowHtml).join('') + '</div>' : '';
    }
    if (window.loadOriginHistory) window.loadOriginHistory({ host: document.getElementById('entry-history'), cultivarId: c.id, limit: 30, open: true });
  };

  document.getElementById('entry-root').addEventListener('click', async function (e) {
    var b = e.target.closest('[data-entry-act], [data-entry-verify]');
    if (!b) return;
    var c = allCultivars.find(function (x) { return x.id === window._openEntryId; });
    if (!c) return;
    var act = b.getAttribute('data-entry-act');
    if (act === 'edit') return editCultivar(c.id);
    if (act === 'research') return reresearchCultivar(c.id);
    if (act === 'kr') {
      showSection('keyword-research');
      var sel = document.getElementById('kr-cultivar-select');
      sel.value = String(c.id);
      sel.dispatchEvent(new Event('change'));
      return;
    }
    if (act === 'delete') {
      var done = await deleteCultivar(c.id, c.cultivar_name);
      if (done) showSection('cultivars');
      return;
    }
    var v = b.getAttribute('data-entry-verify');
    if (v) {
      var on = v === 'on';
      var noteEl = document.getElementById('entry-verify-note');
      var note = noteEl ? noteEl.value.trim() : String(c.verification_note || '').replace(/^\[要再確認\]\s*/, '');
      if (on && noteEl && !note) { toast('照合した出典を一言書いてください'); return; }
      b.disabled = true;
      var r = await sb.rpc('set_cultivar_verification', { p_id: c.id, p_verified: on, p_note: note || null });
      if (r.error || (r.data && r.data.success === false)) { toast('エラー: ' + ((r.error && r.error.message) || (r.data && r.data.error))); b.disabled = false; return; }
      toast(on ? '検証済にしました' : '外しました');
      await loadAllCultivars();
      if (window.refreshInbox) window.refreshInbox();
    }
  });
})();
