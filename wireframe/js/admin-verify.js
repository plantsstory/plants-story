/* Admin: verification (T26). 検証済 = the admin opened the sources and the site stands behind the record
   as of today. Not an identification. Uses admin.html globals: sb, toast. */
(function () {
  'use strict';
  var rows = [], tab = 'list', filter = 'unverified';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function top(o) { return ((o || []).filter(function (x) { return x && !x._type; }).sort(function (a, b) { return (b.trust || 0) - (a.trust || 0); }))[0] || null; }
  function sourcesOf(o) {
    if (!o) return [];
    var out = (o.sources || []).filter(function (s) { return s && s.url; }).map(function (s) { return { url: s.url, label: s.label || s.text || s.url }; });
    ((o.structured && o.structured.citation_links) || []).forEach(function (l) { if (l && l.url) out.push({ url: l.url, label: l.label || l.url }); });
    if (o.source_url) out.push({ url: o.source_url, label: o.source_name || o.source_url });
    var seen = {};
    return out.filter(function (s) { if (seen[s.url]) return false; seen[s.url] = 1; return true; });
  }
  function defaultNote(c, o) {
    if (o && o.source_type === 'ipni_powo') return 'IPNI・GBIF（WCVP）の記載者・発表年・出版物と照合';
    var tier = o && o.source_tier;
    return tier ? '出典（Tier ' + tier + '）を確認' : '';
  }

  window.loadVerify = async function () {
    var root = document.getElementById('verify-root');
    if (!root) return;
    root.innerHTML = '<p style="color:var(--color-gray);">読み込み中…</p>';
    var r = await sb.from('cultivars').select('id, cultivar_name, type, origins, verified_at, verification_note, user_id, is_private, tags').eq('is_private', false).order('type').order('cultivar_name');
    if (r.error) { root.innerHTML = '<p style="color:#a8712e;">読み込みエラー: ' + esc(r.error.message) + '</p>'; return; }
    rows = (r.data || []).filter(function (c) { return c.type !== 'seedling'; });
    render();
  };

  function render() {
    var root = document.getElementById('verify-root');
    var queue = rows.filter(function (c) { return String(c.verification_note || '').indexOf('[要再確認]') === 0; });
    var species = rows.filter(function (c) { return c.type === 'species' && !/\b(sp|aff|cf)\./.test(c.cultivar_name); });
    var vSpecies = species.filter(function (c) { return c.verified_at; }).length;
    var html = '<div class="stat-card" style="font-size:var(--font-size-sm);">記載種 ' + species.length + ' 件のうち検証済 <strong>' + vSpecies + '</strong>（告知の条件 M4 は 100%）· 全体 ' + rows.filter(function (c) { return c.verified_at; }).length + ' / ' + rows.length
      + '<br><span style="color:var(--color-gray);">検証済にするのは、出典を開いて記載と照合できた記録だけです。未記載名は A/B の出典が無ければ検証済にしません。</span></div>'
      + '<div class="toolbar" style="flex-wrap:wrap;gap:6px;margin-top:var(--space-sm);">'
      + [['list', '一覧'], ['queue', '再確認キュー（' + queue.length + '）']].map(function (x) { return '<button class="btn btn-sm ' + (tab === x[0] ? 'btn-primary' : 'btn-outline') + '" data-vtab="' + x[0] + '">' + x[1] + '</button>'; }).join('')
      + (tab === 'list' ? ' <span style="margin-left:8px;"></span>' + [['unverified', '未検証'], ['verified', '検証済'], ['all', 'すべて']].map(function (x) { return '<button class="btn btn-sm ' + (filter === x[0] ? 'btn-primary' : 'btn-outline') + '" data-vf="' + x[0] + '">' + x[1] + '</button>'; }).join('') : '')
      + '</div>';
    var list = tab === 'queue' ? queue : rows.filter(function (c) { return filter === 'all' || (filter === 'verified' ? !!c.verified_at : !c.verified_at); });
    if (tab === 'list' && filter === 'unverified') {
      var ipni = list.filter(function (c) { var o = top(c.origins); return o && o.source_type === 'ipni_powo'; });
      if (ipni.length) html += '<div style="margin:var(--space-sm) 0;"><button class="btn btn-outline btn-sm" id="v-bulk">IPNI 照合済みの記載種 ' + ipni.length + ' 件を、出典を確認して検証済にする</button></div>';
    }
    html += '<div style="overflow-x:auto;"><table class="data-table" style="min-width:760px;"><thead><tr><th>品種</th><th>区分</th><th>最上位の記録</th><th>出典</th><th>状態</th><th></th></tr></thead><tbody>';
    list.forEach(function (c) {
      var o = top(c.origins), src = sourcesOf(o);
      html += '<tr data-vid="' + c.id + '"><td>' + esc(c.cultivar_name) + '</td><td>' + esc(c.type) + '</td>'
        + '<td style="font-size:var(--font-size-xs);">' + (o ? esc((o.source_type || '') + (o.source_tier ? ' · Tier ' + o.source_tier : '') + ' · ' + (o.trust || 0) + '%') : '記録なし') + '</td>'
        + '<td style="font-size:var(--font-size-xs);">' + (src.length ? src.slice(0, 3).map(function (s) { return '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(String(s.label).slice(0, 28)) + '</a>'; }).join('<br>') : '<span style="color:#a8712e;">出典URLなし</span>') + '</td>'
        + '<td style="font-size:var(--font-size-xs);">' + (c.verified_at ? '✓ ' + esc(c.verified_at.slice(0, 10)) + '<br>' + esc(c.verification_note || '') : '未検証') + '</td>'
        + '<td style="white-space:nowrap;">' + (c.verified_at
          ? '<button class="btn btn-outline btn-sm" data-vact="off">外す</button>' + (String(c.verification_note || '').indexOf('[要再確認]') === 0 ? ' <button class="btn btn-primary btn-sm" data-vact="on">確認し直した</button>' : '')
          : '<input class="form-input" data-vnote value="' + esc(defaultNote(c, o)) + '" style="max-width:220px;font-size:var(--font-size-xs);"> <button class="btn btn-primary btn-sm" data-vact="on"' + (o ? '' : ' disabled') + '>検証済にする</button>')
        + '</td></tr>';
    });
    html += '</tbody></table></div>';
    root.innerHTML = html;
    root.querySelectorAll('[data-vtab]').forEach(function (b) { b.addEventListener('click', function () { tab = b.getAttribute('data-vtab'); render(); }); });
    root.querySelectorAll('[data-vf]').forEach(function (b) { b.addEventListener('click', function () { filter = b.getAttribute('data-vf'); render(); }); });
    root.querySelectorAll('[data-vact]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var tr = b.closest('tr'), id = +tr.getAttribute('data-vid'), on = b.getAttribute('data-vact') === 'on';
        var c = rows.filter(function (x) { return x.id === id; })[0];
        var noteEl = tr.querySelector('[data-vnote]');
        var note = noteEl ? noteEl.value.trim() : String(c.verification_note || '').replace(/^\[要再確認\]\s*/, '');
        b.disabled = true;
        var r = await sb.rpc('set_cultivar_verification', { p_id: id, p_verified: on, p_note: note || null });
        if (r.error || (r.data && r.data.success === false)) { toast('エラー: ' + ((r.error && r.error.message) || (r.data && r.data.error))); b.disabled = false; return; }
        toast(on ? '検証済にしました' : '外しました');
        window.loadVerify();
      });
    });
    var bulk = document.getElementById('v-bulk');
    if (bulk) bulk.addEventListener('click', async function () {
      var targets = list.filter(function (c) { var o = top(c.origins); return o && o.source_type === 'ipni_powo'; });
      if (!confirm(targets.length + ' 件を検証済にします。各記録の IPNI / POWO のリンクを開き、記載者・発表年・出版物が一致していることを確かめましたか？')) return;
      bulk.disabled = true;
      for (var i = 0; i < targets.length; i++) {
        await sb.rpc('set_cultivar_verification', { p_id: targets[i].id, p_verified: true, p_note: defaultNote(targets[i], top(targets[i].origins)) });
      }
      toast(targets.length + ' 件を検証済にしました');
      window.loadVerify();
    });
  }
})();
