/* Admin: candidates for the tools catalogue (owner, 2026-11-10). What the automatic research finds is not published
   by itself: it waits here until the owner accepts or refuses it, one product at a time. The same list lets the
   owner go back over what is already published. State lives in tool_reviews (admin only); a row of affiliates
   without a review counts as accepted when published and as a candidate when not.
   Uses admin.html globals: sb, toast, allAffiliates, allToolGenres. */
(function () {
  'use strict';
  var reviews = {}, tab = 'candidate', genre = '';
  var REASONS = ['送料が高い', 'ホームセンターで買える', '品質がわからない', '部門に合わない', '似た商品がすでにある'];
  var FIT = { online: '通販向き（店ではまず見かけない）', either: '店でも通販でも' };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function statusOf(a) { var r = reviews[a.id]; return r ? r.status : (a.is_published !== false ? 'approved' : 'candidate'); }
  function items() { return (typeof allAffiliates !== 'undefined' ? allAffiliates : []); }
  function genres() { return (typeof allToolGenres !== 'undefined' ? allToolGenres : []); }
  function genreLabel(slug) { var g = genres().filter(function (x) { return x.slug === slug; })[0]; return g ? g.label : (slug || ''); }

  function styleOnce() {
    if (document.getElementById('tc-style')) return;
    var st = document.createElement('style'); st.id = 'tc-style';
    st.textContent = '.tc-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.tc-tabs button{min-height:44px;padding:0 14px;border:1px solid #1E2622;background:#FBF9F4;font:inherit;cursor:pointer}'
      + '.tc-tabs button[aria-pressed="true"]{background:#1E2622;color:#FBF9F4}.tc-list{display:grid;gap:12px;margin-top:12px}'
      + '.tc-card{display:grid;grid-template-columns:88px 1fr;gap:12px;padding:12px;border:1px solid #D9D3C5;background:#FBF9F4}.tc-card img{width:88px;height:88px;object-fit:contain;background:#fff;border:1px solid #D9D3C5}'
      + '.tc-name{font-weight:700;margin:0 0 2px}.tc-meta{font-size:13px;color:#5B655F;margin:0 0 2px;line-height:1.5}.tc-price{font-size:15px;margin:4px 0}'
      + '.tc-badge{display:inline-block;padding:1px 8px;border:1px solid #1E2622;font-size:12px;margin-left:6px}.tc-badge--bad{border-color:#A63A3A;color:#A63A3A}'
      + '.tc-note{font-size:13px;margin:6px 0 0;padding:6px 8px;background:#F4F1EA;border-left:2px solid #2F5D4A}.tc-acts{grid-column:1 / -1;display:flex;gap:8px;flex-wrap:wrap;align-items:center}'
      + '.tc-acts button,.tc-acts select,.tc-acts a{min-height:44px;font:inherit}.tc-acts .tc-yes{background:#2F5D4A;color:#fff;border:1px solid #2F5D4A;padding:0 16px;cursor:pointer}'
      + '.tc-acts .tc-no{background:#FBF9F4;color:#A63A3A;border:1px solid #A63A3A;padding:0 16px;cursor:pointer}.tc-acts .tc-back{background:#FBF9F4;border:1px solid #1E2622;padding:0 16px;cursor:pointer}'
      + '.tc-acts select{padding:0 8px;border:1px solid #B9B1A0;background:#fff;max-width:100%}.tc-acts a{display:inline-flex;align-items:center;margin-left:auto}.tc-empty{color:#5B655F;margin:12px 0}';
    document.head.appendChild(st);
  }

  window.renderToolCandidates = async function () {
    var box = document.getElementById('tool-candidates-panel');
    if (!box) return;
    styleOnce();
    var r = await sb.from('tool_reviews').select('*');
    if (r.error) { box.innerHTML = '<div class="stat-card">候補の読み込みエラー: ' + esc(r.error.message) + '</div>'; return; }
    reviews = {};
    (r.data || []).forEach(function (x) { reviews[x.affiliate_id] = x; });
    draw();
  };

  function card(a) {
    var r = reviews[a.id] || {}, st = statusOf(a);
    var store = a.rakuten || a.yahoo || a.amazon || '';
    var post = r.postage_included === true ? '<span class="tc-badge">送料込</span>' : r.postage_included === false ? '<span class="tc-badge tc-badge--bad">送料別</span>' : '';
    var note = (r.store_fit && FIT[r.store_fit] ? FIT[r.store_fit] : '') + (r.ai_note ? (r.store_fit ? '。' : '') + r.ai_note : '');
    var html = '<div class="tc-card" data-tc-id="' + a.id + '">'
      + (a.image || a.image_own ? '<img src="' + esc(a.image_own || a.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span></span>')
      + '<div><p class="tc-name">' + esc(a.product_name || a.name) + '</p>'
      + '<p class="tc-meta">' + esc([genreLabel(a.genre), a.maker, a.spec].filter(Boolean).join(' ／ ')) + '</p>'
      + '<p class="tc-price">' + (a.price ? '¥' + Number(a.price).toLocaleString('ja-JP') : esc(a.price_band || '価格不明')) + post + '</p>'
      + '<p class="tc-meta">' + esc([a.shop_name, a.review_count ? 'レビュー ' + a.review_count + ' 件' : '', a.review_average ? '★' + a.review_average : ''].filter(Boolean).join(' ／ ')) + '</p>'
      + (note ? '<p class="tc-note">AI の見立て: ' + esc(note) + '</p>' : '')
      + (st === 'rejected' && r.reject_reason ? '<p class="tc-meta">拒否の理由: ' + esc(r.reject_reason) + '</p>' : '')
      + '</div><div class="tc-acts">';
    if (st === 'candidate') {
      html += '<button type="button" class="tc-yes" data-tc-act="approved">承諾して公開</button>'
        + '<select data-tc-reason aria-label="拒否の理由"><option value="">理由（任意）</option>' + REASONS.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>'
        + '<button type="button" class="tc-no" data-tc-act="rejected">拒否</button>';
    } else if (st === 'approved') {
      html += '<select data-tc-reason aria-label="外す理由"><option value="">理由（任意）</option>' + REASONS.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>'
        + '<button type="button" class="tc-no" data-tc-act="rejected">目録から外す</button>';
    } else {
      html += '<button type="button" class="tc-back" data-tc-act="candidate">候補に戻す</button>';
    }
    html += (store ? '<a href="' + esc(store) + '" target="_blank" rel="noopener">商品ページを見る</a>' : '') + '</div></div>';
    return html;
  }

  function draw() {
    var box = document.getElementById('tool-candidates-panel');
    if (!box) return;
    var all = items(), n = { candidate: 0, approved: 0, rejected: 0 };
    all.forEach(function (a) { n[statusOf(a)]++; });
    var shown = all.filter(function (a) { return statusOf(a) === tab && (!genre || a.genre === genre); });
    var used = {};
    all.forEach(function (a) { if (statusOf(a) === tab) used[a.genre] = (used[a.genre] || 0) + 1; });
    var tabs = [['candidate', '候補'], ['approved', '公開中'], ['rejected', '拒否した商品']];
    box.innerHTML = '<div class="stat-card"><h3 style="margin:0 0 var(--space-xs);font-size:var(--font-size-md);">商品の精査</h3>'
      + '<p style="font-size:var(--font-size-xs);color:var(--color-gray);margin:0;">自動リサーチで見つけた商品は、ここで承諾するまで公開されません。拒否した商品は、次のリサーチでも候補に出ません。「公開中」から、いま載っている商品を外すこともできます。</p>'
      + '<div class="tc-tabs">' + tabs.map(function (t) { return '<button type="button" data-tc-tab="' + t[0] + '" aria-pressed="' + (tab === t[0]) + '">' + t[1] + ' ' + n[t[0]] + '</button>'; }).join('') + '</div>'
      + '<label style="font-size:var(--font-size-sm);">部門 <select id="tc-genre" style="min-height:44px;"><option value="">すべて</option>'
      + genres().filter(function (g) { return used[g.slug]; }).map(function (g) { return '<option value="' + esc(g.slug) + '"' + (genre === g.slug ? ' selected' : '') + '>' + esc(g.label) + ' ' + used[g.slug] + '</option>'; }).join('') + '</select></label>'
      + (shown.length ? '<div class="tc-list">' + shown.map(card).join('') + '</div>'
        : '<p class="tc-empty">' + (tab === 'candidate' ? '候補はありません。下の「部門と自動リサーチ」で探すと、ここに並びます。' : 'ありません。') + '</p>')
      + '</div>';
    box.querySelectorAll('[data-tc-tab]').forEach(function (b) { b.addEventListener('click', function () { tab = b.getAttribute('data-tc-tab'); genre = ''; draw(); }); });
    var gs = document.getElementById('tc-genre');
    if (gs) gs.addEventListener('change', function () { genre = gs.value; draw(); });
    box.querySelectorAll('[data-tc-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.closest('[data-tc-id]'), sel = c.querySelector('[data-tc-reason]');
        setStatus(+c.getAttribute('data-tc-id'), b.getAttribute('data-tc-act'), sel ? sel.value : '', c);
      });
    });
  }

  async function setStatus(id, status, reason, cardEl) {
    if (cardEl) cardEl.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    var publish = status === 'approved';
    var u = await sb.from('affiliates').update({ is_published: publish }).eq('id', id);
    if (u.error) { toast('更新エラー: ' + u.error.message); draw(); return; }
    var row = { affiliate_id: id, status: status, reviewed_at: new Date().toISOString(), reject_reason: status === 'rejected' ? (reason || null) : null };
    var v = await sb.from('tool_reviews').upsert(row, { onConflict: 'affiliate_id' });
    if (v.error) { toast('記録エラー: ' + v.error.message); }
    reviews[id] = Object.assign({}, reviews[id] || {}, row);
    items().forEach(function (a) { if (a.id === id) a.is_published = publish; });
    toast(status === 'approved' ? '公開しました' : status === 'rejected' ? '拒否しました（非公開）' : '候補に戻しました');
    draw();
    // the list below and the counts per department follow
    if (typeof renderAffiliateList === 'function') { var keep = window.renderToolCandidates; window.renderToolCandidates = null; try { renderAffiliateList(); } catch (e) {} window.renderToolCandidates = keep; }
  }
})();
