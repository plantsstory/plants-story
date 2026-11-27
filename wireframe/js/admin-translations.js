/* Admin: 翻訳の確認 (owner 2026-11-27). The AI drafts a translation of each person's words (Japanese → English,
   English → Japanese); nothing shows on the site until the owner decides here (RPC decide_translation):
     反映する       the text in the box (the draft, or the owner's edit) goes into the record
     原文のまま出す  the other language shows the original words, marked as the original
     やり直す        back to the AI, with an optional note (e.g. the right spelling of a name)
   The marks under a draft come from the name check (translate-check.mjs) and from the AI itself.
   Uses admin.html globals: sb, toast, escapeHtml, allCultivars, SUPABASE_URL, SUPABASE_ANON_KEY. */
(function () {
  'use strict';
  function esc(s) { return escapeHtml(String(s == null ? '' : s)); }
  var DIR = { ja: '日本語 → 英語', en: '英語 → 日本語' };
  var FLAG = {
    name_changed: { label: '原文の名前が訳にそのまま入っていません', tone: 'warn' },
    japanese_left: { label: '英訳に日本語が残っています', tone: 'warn' },
    new_katakana: { label: '原文にないカタカナが訳に出ています（名前ならアルファベットに）', tone: 'warn' },
    romanized: { label: '原文のカタカナをアルファベットにした名前（綴りを確かめてください）', tone: 'warn' },
    unsure_names: { label: 'AI が綴りに自信のない名前（カタカナのまま残しています）', tone: 'warn' },
    note: { label: 'AI のメモ', tone: 'info' },
    empty: { label: '訳が空です', tone: 'warn' }
  };

  function badge(n) {
    var b = document.getElementById('tr-badge');
    if (!b) return;
    b.textContent = n ? String(n) : '';
    b.classList.toggle('d-none', !n);
  }

  function flagsHtml(flags) {
    return (flags || []).map(function (f) {
      var k = FLAG[f.kind] || { label: f.kind, tone: 'info' };
      return '<div class="tr-flag tr-flag--' + k.tone + '">' + (k.tone === 'warn' ? '⚠ ' : '') + esc(k.label)
        + ((f.items || []).length ? '：<strong>' + (f.items || []).map(esc).join('、') + '</strong>' : '') + '</div>';
    }).join('');
  }

  window.translationRowHtml = function (r) {
    var entry = (window.allCultivars || []).find(function (c) { return c.id === r.cultivar_id; });
    var name = entry ? '<a href="#" data-open-entry="' + entry.id + '"><em>' + esc(r.cultivar_name) + '</em></a>' : '<em>' + esc(r.cultivar_name) + '</em>';
    var failed = r.status === 'failed';
    return '<div class="tr-row" data-id="' + r.id + '">'
      + '<div class="tr-head">' + name + ' <span class="tr-dir">' + esc(DIR[r.src_lang] || '') + '</span>'
      + (r.model ? ' <span class="tr-model">' + esc(r.model) + '</span>' : '') + '</div>'
      + '<div class="tr-cols">'
      + '<div><div class="tr-label">原文（投稿のまま）</div><div class="tr-src">' + esc(r.src_text) + '</div></div>'
      + '<div><div class="tr-label">' + (failed ? '下書きを作れませんでした' : 'AI の下書き（直してから反映できます）') + '</div>'
      + (failed ? '<div class="tr-flag tr-flag--warn">' + esc(r.error || '') + '</div>'
                : '<textarea class="tr-text" rows="' + Math.min(14, Math.max(4, Math.ceil(String(r.draft_text || '').length / 60))) + '">' + esc(r.draft_text || '') + '</textarea>')
      + flagsHtml(r.flags) + '</div></div>'
      + '<div class="tr-actions">'
      + (failed ? '' : '<button type="button" class="btn btn-primary btn-sm" data-tr="approve">反映する</button>')
      + '<button type="button" class="btn btn-outline btn-sm" data-tr="redo">やり直す</button>'
      + (failed ? '' : '<button type="button" class="btn btn-outline btn-sm" data-tr="keep">原文のまま出す</button>')
      + '</div></div>';
  };

  window.loadTranslations = async function () {
    var h = document.getElementById('translations-root');
    if (!h) return;
    h.innerHTML = '<p class="desc-text">読み込み中...</p>';
    var res = await Promise.all([
      sb.from('origin_translations').select('*').in('status', ['drafted', 'failed']).order('created_at').limit(200),
      sb.from('origin_translations').select('id', { count: 'exact', head: true }).eq('status', 'queued')
    ]);
    if (res[0].error) { h.innerHTML = '<p class="desc-text">読み込めませんでした（' + esc(res[0].error.message) + '）</p>'; return; }
    var rows = res[0].data || [], queued = res[1].count || 0;
    var drafted = rows.filter(function (r) { return r.status === 'drafted'; }).length;
    badge(drafted);
    var top = '<div class="toolbar"><span class="desc-text">反映待ち ' + drafted + ' 件 · 下書き待ち ' + queued + ' 件</span>'
      + (queued ? ' <button type="button" class="btn btn-outline btn-sm" id="btn-tr-run">今すぐ下書きを作る</button>' : '') + '</div>';
    if (!rows.length) { h.innerHTML = top + '<p class="desc-text">確認待ちの翻訳はありません。</p>'; return; }
    h.innerHTML = top + rows.map(window.translationRowHtml).join('');
  };

  document.addEventListener('click', async function (e) {
    var run = e.target.closest && e.target.closest('#btn-tr-run');
    if (run) {
      run.disabled = true;
      var session = (await sb.auth.getSession()).data.session;
      try {
        var r = await fetch(SUPABASE_URL + '/functions/v1/translate-origin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (session ? session.access_token : SUPABASE_ANON_KEY) }, body: '{}' });
        var d = await r.json().catch(function () { return {}; });
        if (d.skipped === 'TRANSLATE_ENABLED is off') toast('AI の翻訳は止めてあります（TRANSLATE_ENABLED）');
        else if (d.skipped === 'budget') toast('今月の AI の予算に達したため止まっています');
        else if (!r.ok || d.ok === false) toast('下書きを作れませんでした: ' + (d.error || r.status));
        else toast(d.drafted + ' 件の下書きを作りました');
      } catch (er) { toast('下書きを作れませんでした: ' + er.message); }
      window.loadTranslations();
      return;
    }
    var b = e.target.closest && e.target.closest('[data-tr]');
    if (!b) return;
    var row = b.closest('.tr-row');
    var action = b.getAttribute('data-tr');
    var text = null;
    if (action === 'approve') {
      text = (row.querySelector('.tr-text') || {}).value || '';
      if (!text.trim()) { toast('訳が空です'); return; }
    } else if (action === 'redo') {
      text = prompt('AI へのメモ（任意）。例: 「リンデン」は Linden、地名はアルファベットのまま', '');
      if (text === null) return;
    } else if (action === 'keep') {
      if (!confirm('反対の言語の画面にも、この原文をそのまま出します。よろしいですか？')) return;
    }
    row.querySelectorAll('button, textarea').forEach(function (x) { x.disabled = true; });
    var r = await sb.rpc('decide_translation', { p_id: Number(row.getAttribute('data-id')), p_action: action, p_text: text });
    if (r.error || !r.data || r.data.success === false) {
      toast('できませんでした: ' + ((r.error && r.error.message) || (r.data && r.data.error) || ''));
      row.querySelectorAll('button, textarea').forEach(function (x) { x.disabled = false; });
      return;
    }
    toast(action === 'approve' ? '反映しました（サイトの静的ページは次のデプロイで更新）' : action === 'keep' ? '原文のまま出します' : 'やり直しに回しました');
    row.remove();
    if (action !== 'redo' && window.loadAllCultivars) window.loadAllCultivars();
    if (window.refreshInbox) window.refreshInbox();
  });
})();
