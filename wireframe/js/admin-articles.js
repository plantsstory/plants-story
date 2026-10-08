/* Admin: 読みもの (board 12) — articles by people who know these plants. Only the title, author, link and the
   editors' own introduction are kept; never the article's text or images. Plants are tied by their exact
   registered name only (the form refuses a name the archive does not have).
   Uses admin.html globals: sb, toast, showModal, closeModal. */
(function () {
  'use strict';
  var rows = [], names = null;
  var KINDS = ['解説', '分類', '交配', '現地', '栽培記録', '論文', 'インタビュー'];
  var SITES = ['note', 'ブログ', '店のコラム', '専門誌', '論文', '研究者のサイト', 'その他'];
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  async function loadNames() {
    if (names) return names;
    var r = await sb.from('cultivars').select('cultivar_name').eq('is_private', false).limit(2000);
    names = new Set((r.data || []).map(function (x) { return x.cultivar_name; }));
    return names;
  }

  window.loadArticlesAdmin = async function () {
    var root = document.getElementById('articles-root');
    if (!root) return;
    var r = await sb.from('articles').select('*').order('published_on', { ascending: false, nullsFirst: false });
    if (r.error) { root.innerHTML = '<p style="color:#a8712e;">読み込みエラー: ' + esc(r.error.message) + '</p>'; return; }
    rows = r.data || [];
    var pub = rows.filter(function (a) { return a.is_published; }).length;
    var html = '<div class="stat-card" style="font-size:var(--font-size-sm);">記事 ' + rows.length + ' 件 · 公開 ' + pub + ' 件'
      + '<br><span style="color:var(--color-gray);">載せるのは題名・著者・リンクと、編集部の言葉で書いた紹介文（80〜120字）だけ。本文の引用・画像は載せない。品種は登録名と完全に一致するものだけ。取り下げの依頼があれば「非公開」にする。</span></div>'
      + '<div class="toolbar" style="margin-top:var(--space-sm);"><button class="btn btn-primary btn-sm" id="art-add">＋ 記事を追加</button> <a class="btn btn-outline btn-sm" href="/reading/?preview=reading" target="_blank" rel="noopener">ページを見る</a></div>';
    if (!rows.length) html += '<p style="color:var(--color-gray);padding:var(--space-lg);text-align:center;">まだ記事はありません</p>';
    else {
      html += '<div style="overflow-x:auto;"><table class="data-table" style="min-width:720px;"><thead><tr><th>題名</th><th>著者</th><th>媒体</th><th>年</th><th>品種</th><th>状態</th><th></th></tr></thead><tbody>';
      rows.forEach(function (a) {
        html += '<tr><td><a href="' + esc(a.url) + '" target="_blank" rel="noopener">' + esc(a.title) + '</a></td><td>' + esc(a.author) + '</td><td>' + esc(a.site) + (a.lang === 'en' ? '（英）' : '') + '</td><td>' + esc(a.published_on ? String(a.published_on).slice(0, 4) : '') + '</td>'
          + '<td style="font-size:var(--font-size-xs);">' + esc((a.topics || []).join('、')) + '</td><td>' + (a.is_published ? '公開' : '非公開') + '</td>'
          + '<td><button class="btn btn-outline btn-sm" data-art="' + a.id + '">編集</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    root.innerHTML = html;
    document.getElementById('art-add').addEventListener('click', function () { form({}); });
    root.querySelectorAll('[data-art]').forEach(function (b) {
      b.addEventListener('click', function () { form(rows.filter(function (x) { return x.id === +b.getAttribute('data-art'); })[0]); });
    });
  };

  function opts(list, v) { return list.map(function (x) { return '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join(''); }
  function form(a) {
    var isEdit = !!a.id;
    var html = '<h3 style="margin-bottom:var(--space-md);">' + (isEdit ? '記事を編集' : '記事を追加') + '</h3><form id="artf" style="display:grid;gap:var(--space-sm);">'
      + '<div><label class="adm-label">URL（https）*</label><input class="form-input" name="url" value="' + esc(a.url || '') + '" required placeholder="https://"></div>'
      + '<div><label class="adm-label">題名 *（記事の題名そのまま）</label><input class="form-input" name="title" maxlength="200" value="' + esc(a.title || '') + '" required></div>'
      + '<div class="adm-grid-2col-var"><div><label class="adm-label">著者 *</label><input class="form-input" name="author" maxlength="120" value="' + esc(a.author || '') + '" required></div><div><label class="adm-label">公開日</label><input class="form-input" type="date" name="published_on" value="' + esc(a.published_on || '') + '"></div></div>'
      + '<div class="adm-grid-2col-var"><div><label class="adm-label">媒体</label><select class="form-input" name="site">' + opts(SITES, a.site || 'note') + '</select></div><div><label class="adm-label">種類</label><select class="form-input" name="kind">' + opts(KINDS, a.kind || '解説') + '</select></div></div>'
      + '<div class="adm-grid-2col-var"><div><label class="adm-label">言語</label><select class="form-input" name="lang"><option value="ja"' + (a.lang !== 'en' ? ' selected' : '') + '>日本語</option><option value="en"' + (a.lang === 'en' ? ' selected' : '') + '>英語</option></select></div><div><label class="adm-label">状態</label><select class="form-input" name="is_published"><option value="true"' + (a.is_published !== false ? ' selected' : '') + '>公開</option><option value="false"' + (a.is_published === false ? ' selected' : '') + '>非公開</option></select></div></div>'
      + '<div><label class="adm-label">著者が有識者である根拠（1 行）</label><input class="form-input" name="credential" maxlength="160" value="' + esc(a.credential || '') + '" placeholder="例: 20 年 Anthurium を交配している生産者"></div>'
      + '<div><label class="adm-label">紹介文 *（編集部の言葉で 80〜120 字。本文の引用はしない）<span id="art-len" style="color:var(--color-gray);"></span></label><textarea class="form-input" name="summary" rows="4" required>' + esc(a.summary || '') + '</textarea></div>'
      + '<div><label class="adm-label">関係する品種（登録名をそのまま、読点「、」区切り。例: Anthurium warocqueanum）</label><input class="form-input" name="topics" value="' + esc((a.topics || []).join('、')) + '"></div>'
      + '<div style="display:flex;gap:var(--space-sm);justify-content:space-between;">' + (isEdit ? '<button type="button" class="btn btn-danger" id="art-del">削除</button>' : '<span></span>') + '<span><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button> <button type="submit" class="btn btn-primary">保存</button></span></div></form>';
    showModal(html);
    var f = document.getElementById('artf');
    var len = function () { document.getElementById('art-len').textContent = '　' + f.summary.value.trim().length + ' 字'; };
    f.summary.addEventListener('input', len); len();
    if (isEdit) document.getElementById('art-del').addEventListener('click', async function () {
      if (!confirm('「' + a.title + '」を削除しますか？（取り下げなら「非公開」でも足ります）')) return;
      var r = await sb.from('articles').delete().eq('id', a.id);
      if (r.error) { toast('削除エラー: ' + r.error.message); return; }
      toast('削除しました'); closeModal(); window.loadArticlesAdmin();
    });
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var topics = f.topics.value.split(/[、,\n]/).map(function (x) { return x.trim(); }).filter(Boolean);
      var known = await loadNames();
      var unknown = topics.filter(function (n) { return !known.has(n); });
      if (unknown.length) { toast('登録名と一致しない品種があります: ' + unknown.join('、')); return; }
      var row = { url: f.url.value.trim(), title: f.title.value.trim(), author: f.author.value.trim(), published_on: f.published_on.value || null,
        site: f.site.value, kind: f.kind.value, lang: f.lang.value, is_published: f.is_published.value === 'true',
        credential: f.credential.value.trim() || null, summary: f.summary.value.trim(), topics: topics };
      if (!/^https:\/\//.test(row.url)) { toast('URL は https:// で始めてください'); return; }
      if (row.summary.length < 20) { toast('紹介文が短すぎます'); return; }
      var r = isEdit ? await sb.from('articles').update(row).eq('id', a.id) : await sb.from('articles').insert(row);
      if (r.error) { toast('保存エラー: ' + (/duplicate|unique/.test(r.error.message) ? 'この URL はもう登録されています' : r.error.message)); return; }
      toast('保存しました'); closeModal(); window.loadArticlesAdmin();
    });
  }
})();
