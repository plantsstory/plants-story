/* Admin: shop listings (T33). ¥1,000 a month, first month free, invoiced at month end, paid by bank transfer.
   Uses admin.html globals: sb, toast, showModal, closeModal. */
(function () {
  'use strict';
  var shops = [];
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function lastMonth() { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function endOfNextMonth(dateStr) { var d = new Date(dateStr + 'T00:00:00'); d.setMonth(d.getMonth() + 2, 0); return d.toISOString().slice(0, 10); }
  function state(s) {
    var t = today();
    if (!s.is_active) return '停止';
    if (s.ends_on && s.ends_on < t) return '終了';
    if (s.starts_on > t) return '開始前';
    if (s.free_until && s.free_until >= t) return '無料期間（' + s.free_until + ' まで）';
    return '掲載中（有料）';
  }

  window.loadShops = async function () {
    var root = document.getElementById('shops-root');
    if (!root) return;
    var r = await sb.from('shops').select('*').order('id');
    if (r.error) { root.innerHTML = '<p style="color:#a8712e;">読み込みエラー: ' + esc(r.error.message) + '</p>'; return; }
    shops = r.data || [];
    var active = shops.filter(function (s) { return state(s).indexOf('掲載中') === 0; });
    var html = '<div class="stat-card" style="font-size:var(--font-size-sm);">掲載 ' + shops.filter(function (s) { return s.is_active; }).length + ' 店 · 有料 ' + active.length + ' 店 · 月 ' + (active.length * 1000).toLocaleString('ja-JP') + ' 円'
      + '<br><span style="color:var(--color-gray);">品種ページには属ごとに最大3店（毎日入れ替え）。月末締めで翌月5日までに請求書をメール、月末までに振込。2か月未入金なら停止。</span></div>'
      + '<div class="toolbar" style="margin-top:var(--space-sm);"><button class="btn btn-primary btn-sm" id="shop-add">＋ 取扱店を追加</button></div>';
    if (!shops.length) html += '<p style="color:var(--color-gray);padding:var(--space-lg);text-align:center;">まだ掲載はありません</p>';
    else {
      html += '<div style="overflow-x:auto;"><table class="data-table" style="min-width:720px;"><thead><tr><th>店名</th><th>一言</th><th>状態</th><th>開始</th><th>連絡先</th><th></th></tr></thead><tbody>';
      shops.forEach(function (s) {
        html += '<tr><td><a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + '</a></td><td style="font-size:var(--font-size-xs);">' + esc(s.blurb || '') + '</td><td style="font-size:var(--font-size-xs);">' + esc(state(s)) + '</td><td>' + esc(s.starts_on) + '</td><td style="font-size:var(--font-size-xs);">' + esc(s.contact_email || '') + '</td>'
          + '<td style="white-space:nowrap;"><button class="btn btn-outline btn-sm" data-sh="edit" data-id="' + s.id + '">編集</button> <button class="btn btn-outline btn-sm" data-sh="invoice" data-id="' + s.id + '">請求書</button> <button class="btn btn-outline btn-sm" data-sh="paid" data-id="' + s.id + '">入金を記帳</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    root.innerHTML = html;
    document.getElementById('shop-add').addEventListener('click', function () { form({}); });
    root.querySelectorAll('[data-sh]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = shops.filter(function (x) { return x.id === +b.getAttribute('data-id'); })[0], a = b.getAttribute('data-sh');
        if (a === 'edit') form(s); if (a === 'invoice') invoice(s); if (a === 'paid') paid(s);
      });
    });
  };

  function form(s) {
    var isEdit = !!s.id;
    var html = '<h3 style="margin-bottom:var(--space-md);">' + (isEdit ? '取扱店を編集' : '取扱店を追加') + '</h3><form id="shf" style="display:grid;gap:var(--space-sm);">'
      + '<div class="adm-grid-2col-var"><div><label class="adm-label">店名 *</label><input class="form-input" name="name" value="' + esc(s.name || '') + '" required></div><div><label class="adm-label">URL（https）*</label><input class="form-input" name="url" value="' + esc(s.url || '') + '" required placeholder="https://"></div></div>'
      + '<div><label class="adm-label">一言（40字まで。おすすめ・最安・効果 などは使わない）</label><input class="form-input" name="blurb" maxlength="40" value="' + esc(s.blurb || '') + '"></div>'
      + '<div class="adm-grid-2col-var"><div><label class="adm-label">掲載開始</label><input class="form-input" type="date" name="starts_on" value="' + esc(s.starts_on || today()) + '"></div><div><label class="adm-label">無料期間の終わり（既定: 開始の翌月末）</label><input class="form-input" type="date" name="free_until" value="' + esc(s.free_until || '') + '"></div></div>'
      + '<div class="adm-grid-2col-var"><div><label class="adm-label">掲載終了（解約時）</label><input class="form-input" type="date" name="ends_on" value="' + esc(s.ends_on || '') + '"></div><div><label class="adm-label">状態</label><select class="form-input" name="is_active"><option value="true"' + (s.is_active !== false ? ' selected' : '') + '>有効</option><option value="false"' + (s.is_active === false ? ' selected' : '') + '>停止</option></select></div></div>'
      + '<div class="adm-grid-2col-var"><div><label class="adm-label">連絡先メール（請求書の送り先）</label><input class="form-input" type="email" name="contact_email" value="' + esc(s.contact_email || '') + '"></div><div><label class="adm-label">メモ</label><input class="form-input" name="note" value="' + esc(s.note || '') + '"></div></div>'
      + '<div style="display:flex;gap:var(--space-sm);justify-content:space-between;">' + (isEdit ? '<button type="button" class="btn btn-danger" id="sh-del">削除</button>' : '<span></span>') + '<span><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button> <button type="submit" class="btn btn-primary">保存</button></span></div></form>';
    showModal(html);
    var f = document.getElementById('shf');
    if (isEdit) document.getElementById('sh-del').addEventListener('click', async function () {
      if (!confirm(s.name + ' を削除しますか？（掲載を止めるだけなら「停止」を選んでください）')) return;
      var r = await sb.from('shops').delete().eq('id', s.id);
      if (r.error) { toast('削除エラー: ' + r.error.message); return; }
      toast('削除しました'); closeModal(); window.loadShops();
    });
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var blurb = f.blurb.value.trim();
      if (/おすすめ|オススメ|最安|ランキング|効く|効果|No\.1/.test(blurb)) { toast('一言に使えない言葉があります'); return; }
      var row = { name: f.name.value.trim(), url: f.url.value.trim(), blurb: blurb || null, starts_on: f.starts_on.value || today(),
        free_until: f.free_until.value || endOfNextMonth(f.starts_on.value || today()), ends_on: f.ends_on.value || null,
        is_active: f.is_active.value === 'true', contact_email: f.contact_email.value.trim() || null, note: f.note.value.trim() || null };
      if (!/^https:\/\//.test(row.url)) { toast('URL は https:// で始めてください'); return; }
      var r = isEdit ? await sb.from('shops').update(row).eq('id', s.id) : await sb.from('shops').insert(row);
      if (r.error) { toast('保存エラー: ' + r.error.message); return; }
      toast('保存しました'); closeModal(); window.loadShops();
    });
  }

  function invoice(s) {
    var month = prompt('請求する月（YYYY-MM）', lastMonth());
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return;
    var y = +month.slice(0, 4), m = +month.slice(5, 7);
    var due = new Date(y, m + 1, 0);
    var html = '<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>請求書 ' + esc(s.name) + ' ' + month + '</title>'
      + '<style>body{font-family:"Hiragino Mincho ProN","BIZ UDMincho",serif;max-width:640px;margin:40px auto;color:#1E2622;line-height:1.8}h1{font-size:24px;letter-spacing:.2em;border-bottom:2px solid #1E2622;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{border-bottom:1px solid #ccc;padding:8px 4px;text-align:left}.r{text-align:right}.box{border:1px solid #1E2622;padding:12px;margin-top:16px}.muted{color:#5B625E;font-size:13px}@media print{button{display:none}}</style></head><body>'
      + '<h1>請求書</h1><p>' + esc(s.name) + ' 御中</p><p class="muted">発行日: ' + today().replace(/-/g, '/') + '</p>'
      + '<table><tr><th>品目</th><th>期間</th><th class="r">金額</th></tr><tr><td>Aroid Origins 取扱店の掲載料</td><td>' + y + '年' + m + '月分</td><td class="r">1,000 円</td></tr><tr><th colspan="2">合計（税込）</th><th class="r">1,000 円</th></tr></table>'
      + '<p>お支払い期限: ' + due.getFullYear() + '年' + (due.getMonth() + 1) + '月' + due.getDate() + '日</p>'
      + '<div class="box">お振込先（運営者が記入）<br><br><br><br></div>'
      + '<p class="muted">振込手数料はご負担ください。当方は適格請求書発行事業者ではありません。<br>発行者: Aroid Origins（運営者: 久恒 佑太） plantsstory2026@gmail.com</p>'
      + '<button onclick="window.print()">印刷 / PDF に保存</button></body></html>';
    var w = window.open('', '_blank');
    if (!w) { toast('ポップアップを許可してください'); return; }
    w.document.write(html); w.document.close();
  }

  async function paid(s) {
    var month = prompt(s.name + ' の何月分の入金ですか？（YYYY-MM）', lastMonth());
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return;
    var amount = parseInt(prompt('入金額（円）', String(s.fee || 1000)), 10);
    if (!amount || amount <= 0) return;
    var r = await sb.from('ledger_entries').insert({ entry_date: today(), debit: '普通預金', credit: '売上高', amount: amount, description: '取扱店の掲載料 ' + month + ' 分', partner: s.name, source: 'template', source_ref: 'shop-' + s.id + '-' + month });
    if (r.error) { toast(/duplicate|unique/i.test(r.error.message) ? 'この月の入金はすでに記帳されています' : '記帳エラー: ' + r.error.message); return; }
    toast('帳簿に記帳しました');
  }
})();
