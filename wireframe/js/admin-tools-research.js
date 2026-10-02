/* Admin: departments of the tools catalogue and automatic research on the Rakuten Ichiba API
   (supabase/functions/tools-research). Uses admin.html globals: sb, toast, showModal, closeModal,
   SUPABASE_URL, SUPABASE_ANON_KEY, allAffiliates, allToolGenres, loadAffiliates. */
(function () {
  'use strict';
  var queries = [];
  var busy = false;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function publishNow() { try { return localStorage.getItem('tools_publish_now') !== 'false'; } catch (e) { return true; } }

  async function call(payload) {
    var s = (await sb.auth.getSession()).data.session;
    var r = await fetch(SUPABASE_URL + '/functions/v1/tools-research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + (s ? s.access_token : SUPABASE_ANON_KEY) },
      body: JSON.stringify(payload)
    });
    var data = await r.json().catch(function () { return { error: 'HTTP ' + r.status }; });
    if (!r.ok || data.error) throw new Error(data.error || ('HTTP ' + r.status));
    return data;
  }
  function log(line) {
    var el = document.getElementById('tr-log');
    if (!el) return;
    el.style.display = '';
    el.innerHTML += '<div>' + line + '</div>';
  }

  window.renderToolsResearch = async function () {
    var box = document.getElementById('tools-research-panel');
    if (!box) return;
    var r = await sb.from('tool_research_queries').select('*').order('id');
    queries = r.data || [];
    var genres = (typeof allToolGenres !== 'undefined' ? allToolGenres : []);
    var items = (typeof allAffiliates !== 'undefined' ? allAffiliates : []);
    var html = '<div class="stat-card"><h3 style="margin:0 0 var(--space-xs);font-size:var(--font-size-md);">部門と自動リサーチ（楽天市場）</h3>'
      + '<p style="font-size:var(--font-size-xs);color:var(--color-gray);margin:0 0 var(--space-sm);">部門ごとの検索語で楽天市場を調べ、レビューが多く評価 4.0 以上の商品から、部門に合う物を AI が選んで名前と説明を整えます。1部門 20〜40 秒です。楽天の商品だけを自動で追加します（Amazon・Yahoo! のリンクは各商品の「編集」から貼れます）。</p>'
      + '<div style="overflow-x:auto;"><table class="data-table" style="min-width:620px;"><thead><tr><th>部門</th><th>公開</th><th>非公開</th><th>検索語</th><th>最終リサーチ</th><th></th></tr></thead><tbody>'
      + genres.map(function (g) {
        var inG = items.filter(function (a) { return a.genre === g.slug; });
        var q = queries.filter(function (x) { return x.genre === g.slug; });
        var last = q.map(function (x) { return x.last_run_at || ''; }).sort().pop();
        return '<tr><td><span style="font-family:monospace;font-size:var(--font-size-xs);color:var(--color-gray);">' + esc(g.code) + '</span> ' + esc(g.label) + '</td>'
          + '<td>' + inG.filter(function (a) { return a.is_published !== false; }).length + '</td><td>' + inG.filter(function (a) { return a.is_published === false; }).length + '</td>'
          + '<td>' + q.filter(function (x) { return x.is_active; }).length + '</td><td style="font-size:var(--font-size-xs);">' + esc(last ? last.slice(0, 10) : '—') + '</td>'
          + '<td style="white-space:nowrap;"><button class="btn btn-primary btn-sm" data-tr-run="' + esc(g.slug) + '"' + (q.some(function (x) { return x.is_active; }) ? '' : ' disabled') + '>リサーチ</button> <button class="btn btn-outline btn-sm" data-tr-q="' + esc(g.slug) + '">検索語</button></td></tr>';
      }).join('') + '</tbody></table></div>'
      + '<div style="display:flex;gap:var(--space-sm);flex-wrap:wrap;align-items:center;margin-top:var(--space-sm);">'
      + '<button class="btn btn-primary btn-sm" id="tr-all">全部門をリサーチ</button>'
      + '<button class="btn btn-outline btn-sm" id="tr-refresh">楽天の価格・在庫を更新</button>'
      + '<label style="font-size:var(--font-size-sm);"><input type="checkbox" id="tr-publish"' + (publishNow() ? ' checked' : '') + '> 見つけた商品をすぐ公開する</label>'
      + '</div><div id="tr-log" style="display:none;margin-top:var(--space-sm);font-size:var(--font-size-xs);max-height:220px;overflow:auto;border-top:1px solid var(--color-light);padding-top:6px;"></div></div>';
    box.innerHTML = html;
    document.getElementById('tr-publish').addEventListener('change', function (e) { try { localStorage.setItem('tools_publish_now', e.target.checked ? 'true' : 'false'); } catch (x) {} });
    box.querySelectorAll('[data-tr-run]').forEach(function (b) { b.addEventListener('click', function () { run([b.getAttribute('data-tr-run')]); }); });
    box.querySelectorAll('[data-tr-q]').forEach(function (b) { b.addEventListener('click', function () { queryEditor(b.getAttribute('data-tr-q')); }); });
    document.getElementById('tr-all').addEventListener('click', function () {
      run(genres.filter(function (g) { return queries.some(function (x) { return x.genre === g.slug && x.is_active; }); }).map(function (g) { return g.slug; }));
    });
    document.getElementById('tr-refresh').addEventListener('click', async function () {
      if (busy) return; busy = true; log('楽天の価格・在庫を確認しています…');
      try { var d = await call({ mode: 'refresh' }); log('更新 ' + d.updated + ' 件、売り切れ・掲載終了で非公開 ' + d.unpublished + ' 件'); }
      catch (e) { log('<span style="color:#a8712e;">エラー: ' + esc(e.message) + '</span>'); }
      busy = false; loadAffiliates();
    });
  };

  async function run(slugs) {
    if (busy) { toast('いま実行中です'); return; }
    busy = true;
    var publish = document.getElementById('tr-publish').checked, total = 0;
    for (var i = 0; i < slugs.length; i++) {
      var g = (allToolGenres || []).filter(function (x) { return x.slug === slugs[i]; })[0];
      log((g ? g.label : slugs[i]) + ' を調べています…');
      try {
        var d = await call({ genre: slugs[i], publish: publish });
        total += d.added || 0;
        log('→ ' + (d.added || 0) + ' 件追加' + (d.note ? '（' + esc(d.note) + '）' : '') + (d.names && d.names.length ? ': ' + d.names.map(esc).join(' / ') : ''));
      } catch (e) {
        log('<span style="color:#a8712e;">→ エラー: ' + esc(e.message) + '</span>');
        if (/RAKUTEN_APP_ID|RAKUTEN_ACCESS_KEY/.test(e.message)) break;
      }
    }
    log('<strong>合計 ' + total + ' 件追加しました</strong>');
    busy = false;
    loadAffiliates();
  }

  function queryEditor(slug) {
    var g = (allToolGenres || []).filter(function (x) { return x.slug === slug; })[0] || { label: slug };
    var q = queries.filter(function (x) { return x.genre === slug; });
    var html = '<h3 style="margin-bottom:var(--space-md);">検索語 — ' + esc(g.label) + '</h3>'
      + '<p style="font-size:var(--font-size-xs);color:var(--color-gray);">「最低レビュー数」に満たない商品と、評価 4.0 未満の商品は候補にしません。「最大件数」は1つの検索語から追加する数です。</p>'
      + '<div style="overflow-x:auto;"><table class="data-table" style="min-width:520px;"><thead><tr><th>検索語</th><th>最低レビュー数</th><th>最大件数</th><th>使う</th><th></th></tr></thead><tbody>'
      + q.map(function (x) {
        return '<tr data-qid="' + x.id + '"><td><input class="form-input" name="keyword" value="' + esc(x.keyword) + '"></td><td><input class="form-input" name="min_reviews" value="' + x.min_reviews + '" inputmode="numeric" style="max-width:80px;"></td>'
          + '<td><input class="form-input" name="max_items" value="' + x.max_items + '" inputmode="numeric" style="max-width:60px;"></td><td><input type="checkbox" name="is_active"' + (x.is_active ? ' checked' : '') + '></td>'
          + '<td><button type="button" class="btn btn-danger btn-sm" data-qdel="' + x.id + '">削除</button></td></tr>';
      }).join('')
      + '<tr data-qid="new"><td><input class="form-input" name="keyword" placeholder="新しい検索語"></td><td><input class="form-input" name="min_reviews" value="20" inputmode="numeric" style="max-width:80px;"></td><td><input class="form-input" name="max_items" value="1" inputmode="numeric" style="max-width:60px;"></td><td><input type="checkbox" name="is_active" checked></td><td></td></tr>'
      + '</tbody></table></div><div style="display:flex;gap:var(--space-sm);justify-content:flex-end;margin-top:var(--space-sm);"><button type="button" class="btn btn-outline" onclick="closeModal()">閉じる</button><button type="button" class="btn btn-primary" id="q-save">保存</button></div>';
    showModal(html);
    document.querySelectorAll('[data-qdel]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var r = await sb.from('tool_research_queries').delete().eq('id', +b.getAttribute('data-qdel'));
        if (r.error) { toast('削除エラー: ' + r.error.message); return; }
        b.closest('tr').remove();
      });
    });
    document.getElementById('q-save').addEventListener('click', async function () {
      var rows = document.querySelectorAll('#modal-content tr[data-qid]');
      for (var i = 0; i < rows.length; i++) {
        var tr = rows[i], id = tr.getAttribute('data-qid');
        var v = { keyword: tr.querySelector('[name=keyword]').value.trim(), min_reviews: parseInt(tr.querySelector('[name=min_reviews]').value, 10) || 0, max_items: Math.max(1, parseInt(tr.querySelector('[name=max_items]').value, 10) || 1), is_active: tr.querySelector('[name=is_active]').checked };
        if (!v.keyword) continue;
        var r = id === 'new' ? await sb.from('tool_research_queries').insert(Object.assign({ genre: slug }, v)) : await sb.from('tool_research_queries').update(v).eq('id', +id);
        if (r.error) { toast('保存エラー: ' + r.error.message); return; }
      }
      toast('保存しました'); closeModal(); window.renderToolsResearch();
    });
  }
})();
