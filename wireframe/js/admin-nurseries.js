/* Admin: ナーセリー (owner, 11-25) — nurseries' own sales sites. Only the name, the link, the country and a
   short factual line are kept. Rows start unpublished; the public page says 「近日公開」 until it is opened.
   Uses admin.html globals: sb, toast, showModal, closeModal. */
(function () {
  'use strict';
  var rows = [];
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  window.loadNurseriesAdmin = async function () {
    var root = document.getElementById('nurseries-root');
    if (!root) return;
    var r = await sb.from('nurseries').select('*').order('sort_order').order('name');
    if (r.error) { root.innerHTML = '<p style="color:#a8712e;">読み込みエラー: ' + esc(r.error.message) + '</p>'; return; }
    rows = r.data || [];
    var pub = rows.filter(function (a) { return a.is_published; }).length;
    var html = '<div class="stat-card" style="font-size:var(--font-size-sm);">ナーセリー ' + rows.length + ' 件 · 公開 ' + pub + ' 件'
      + '<br><span style="color:var(--color-gray);">ページは今「近日公開」と出ています（全員）。ここで足した分は「ページを見る」で確かめられます。紹介は 1〜2 行で、扱っている物など事実だけ。</span></div>'
      + '<div class="toolbar" style="margin-top:var(--space-sm);"><button class="btn btn-primary btn-sm" id="nur-add">＋ ナーセリーを追加</button> <a class="btn btn-outline btn-sm" href="/nurseries/?preview=nurseries" target="_blank" rel="noopener">ページを見る</a></div>';
    if (!rows.length) html += '<p style="color:var(--color-gray);padding:var(--space-lg);text-align:center;">まだ登録はありません</p>';
    else {
      html += '<div style="overflow-x:auto;"><table class="data-table" style="min-width:640px;"><thead><tr><th>名前</th><th>国</th><th>紹介</th><th>順</th><th>状態</th><th></th></tr></thead><tbody>';
      rows.forEach(function (a) {
        html += '<tr><td><a href="' + esc(a.url) + '" target="_blank" rel="noopener">' + esc(a.name) + '</a></td><td>' + esc(a.country) + '</td>'
          + '<td style="font-size:var(--font-size-xs);">' + esc(a.note || '') + '</td><td>' + esc(a.sort_order) + '</td><td>' + (a.is_published ? '公開' : '非公開') + '</td>'
          + '<td><button class="btn btn-outline btn-sm" data-nur="' + a.id + '">編集</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    root.innerHTML = html;
    document.getElementById('nur-add').addEventListener('click', function () { form({}); });
    root.querySelectorAll('[data-nur]').forEach(function (b) {
      b.addEventListener('click', function () { form(rows.filter(function (x) { return x.id === +b.getAttribute('data-nur'); })[0]); });
    });
  };

  function form(a) {
    var isEdit = !!a.id;
    var html = '<h3 style="margin-bottom:var(--space-md);">' + (isEdit ? 'ナーセリーを編集' : 'ナーセリーを追加') + '</h3><form id="nurf" style="display:grid;gap:var(--space-sm);">'
      + '<div><label class="adm-label">名前 *</label><input class="form-input" name="name" maxlength="120" value="' + esc(a.name || '') + '" required></div>'
      + '<div><label class="adm-label">販売サイトの URL（https）*</label><input class="form-input" name="url" value="' + esc(a.url || '') + '" required placeholder="https://"></div>'
      + '<div class="adm-grid-2col-var"><div><label class="adm-label">国</label><input class="form-input" name="country" maxlength="40" value="' + esc(a.country || '日本') + '"></div><div><label class="adm-label">並び順（小さいほど上）</label><input class="form-input" type="number" name="sort_order" value="' + esc(a.sort_order || 0) + '"></div></div>'
      + '<div><label class="adm-label">Instagram（任意）</label><input class="form-input" name="instagram" value="' + esc(a.instagram || '') + '" placeholder="https://www.instagram.com/…"></div>'
      + '<div><label class="adm-label">紹介（任意、200 字まで。扱っている物など事実だけ）<span id="nur-len" style="color:var(--color-gray);"></span></label><textarea class="form-input" name="note" rows="3" maxlength="200">' + esc(a.note || '') + '</textarea></div>'
      + '<div><label class="adm-label">状態</label><select class="form-input" name="is_published"><option value="false"' + (a.is_published ? '' : ' selected') + '>非公開</option><option value="true"' + (a.is_published ? ' selected' : '') + '>公開</option></select></div>'
      + '<div style="display:flex;gap:var(--space-sm);justify-content:space-between;">' + (isEdit ? '<button type="button" class="btn btn-danger" id="nur-del">削除</button>' : '<span></span>') + '<span><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button> <button type="submit" class="btn btn-primary">保存</button></span></div></form>';
    showModal(html);
    var f = document.getElementById('nurf');
    var len = function () { document.getElementById('nur-len').textContent = '　' + f.note.value.trim().length + ' 字'; };
    f.note.addEventListener('input', len); len();
    if (isEdit) document.getElementById('nur-del').addEventListener('click', async function () {
      if (!confirm('「' + a.name + '」を削除しますか？（載せるのをやめるだけなら「非公開」でも足ります）')) return;
      var r = await sb.from('nurseries').delete().eq('id', a.id);
      if (r.error) { toast('削除エラー: ' + r.error.message); return; }
      toast('削除しました'); closeModal(); window.loadNurseriesAdmin();
    });
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var row = { name: f.name.value.trim(), url: f.url.value.trim(), country: f.country.value.trim() || '日本',
        instagram: f.instagram.value.trim() || null, note: f.note.value.trim() || null,
        sort_order: parseInt(f.sort_order.value, 10) || 0, is_published: f.is_published.value === 'true', updated_at: new Date().toISOString() };
      if (!/^https:\/\//.test(row.url)) { toast('URL は https:// で始めてください'); return; }
      if (row.instagram && !/^https:\/\//.test(row.instagram)) { toast('Instagram は https:// で始めてください'); return; }
      var r = isEdit ? await sb.from('nurseries').update(row).eq('id', a.id) : await sb.from('nurseries').insert(row);
      if (r.error) { toast('保存エラー: ' + (/duplicate|unique/.test(r.error.message) ? 'この URL はもう登録されています' : r.error.message)); return; }
      toast('保存しました'); closeModal(); window.loadNurseriesAdmin();
    });
  }
})();
