/* 帳簿 + 株台帳 (admin only, 2026-10-02).
   Double entry, one debit and one credit per row; a sale with fees is several rows sharing group_id.
   Plants bought for sale are expensed as 仕入高; the year-end stock in 株台帳 is the inventory, so
   売上原価 = 期首棚卸 + 仕入高 − 期末棚卸 and no cost row is posted per sale.
   A plant becomes a mother plant (親木) only when it is actually put to use for propagation;
   the conversion moves its cost out of 仕入高.
   Uses admin.html globals: sb, toast, showModal, closeModal. */
(function () {
  'use strict';

  /* ---------- accounts ---------- */
  var KIND = {
    '現金': 'asset', '普通預金': 'asset', '電子マネー': 'asset', '売掛金': 'asset', '工具器具備品': 'asset', '一括償却資産': 'asset',
    '事業主貸': 'owner_dr',
    '未払金': 'liability', '借入金': 'liability',
    '元入金': 'capital', '事業主借': 'owner_cr',
    '売上高': 'revenue', '雑収入': 'revenue',
    '仕入高': 'cogs',
    '租税公課': 'expense', '荷造運賃': 'expense', '水道光熱費': 'expense', '旅費交通費': 'expense', '通信費': 'expense',
    '広告宣伝費': 'expense', '消耗品費': 'expense', '減価償却費': 'expense', '修繕費': 'expense', '外注工賃': 'expense',
    '地代家賃': 'expense', '支払手数料': 'expense', '新聞図書費': 'expense', '固定資産除却損': 'expense', '雑費': 'expense'
  };
  var ACCOUNTS = Object.keys(KIND);
  var REAL_ASSETS = ['現金', '普通預金', '電子マネー', '売掛金', '工具器具備品', '一括償却資産'];
  var LIABILITIES = ['未払金', '借入金'];
  var EXPENSES = ACCOUNTS.filter(function (a) { return KIND[a] === 'expense'; });
  function debitNatural(a) { var k = KIND[a]; return k === 'asset' || k === 'owner_dr' || k === 'expense' || k === 'cogs'; }

  var PAY_FROM = [
    ['事業主借', '個人のお金・個人のカードで払った'], ['普通預金', '事業用の口座から払った'], ['現金', '現金で払った'],
    ['未払金', '後払い（まだ払っていない）'], ['電子マネー', '電子マネー・楽天キャッシュで払った']
  ];
  var RECV_TO = [
    ['普通預金', '事業用の口座に入った'], ['電子マネー', '楽天キャッシュなど電子マネーで受け取った'],
    ['事業主貸', '個人の口座に入った'], ['現金', '現金で受け取った']
  ];
  var TEMPLATES = [
    { id: 'server', label: 'サーバー代（Supabase）', debit: '通信費', partner: 'Supabase' },
    { id: 'domain', label: 'ドメイン代', debit: '通信費' },
    { id: 'ai', label: 'AI調査の費用（OpenAI）', debit: '通信費', partner: 'OpenAI' },
    { id: 'pots', label: '鉢・用土・資材', debit: '消耗品費' },
    { id: 'packing', label: '梱包材', debit: '荷造運賃' },
    { id: 'shipping', label: '送料（自分で払った分）', debit: '荷造運賃' },
    { id: 'books', label: '書籍・資料', debit: '新聞図書費' },
    { id: 'ads', label: '広告・告知', debit: '広告宣伝費' },
    { id: 'other_exp', label: 'その他の経費', debit: '雑費' },
    { id: 'af_rakuten', label: '楽天アフィリエイト報酬', credit: '売上高', partner: '楽天アフィリエイト', recv: '電子マネー' },
    { id: 'af_moshimo', label: 'もしもアフィリエイト報酬', credit: '売上高', partner: 'もしもアフィリエイト' },
    { id: 'af_yahoo', label: 'Yahoo!アフィリエイト報酬', credit: '売上高', partner: 'バリューコマース' },
    { id: 'listing', label: '取扱店の掲載料（振込）', credit: '売上高' },
    { id: 'capital_in', label: '個人のお金を事業用口座に入れた', debit: '普通預金', credit: '事業主借', fixed: true },
    { id: 'draw', label: '事業用口座から個人のお金に移した', debit: '事業主貸', credit: '普通預金', fixed: true }
  ];
  var STATUS = { stock: '在庫', mother: '親木', sold: '販売済み', dead: '枯死・廃棄' };
  var METHOD = {
    small: '少額（10万円未満）: 使い始めた年に全額を消耗品費',
    small_blue: '少額の特例（青色・30万円未満）: 使い始めた年に全額を減価償却費（年300万円まで）',
    lump3: '一括償却（10万〜20万円未満）: 3年で均等に償却',
    straight: '定額法: 耐用年数で償却（工具器具備品）'
  };

  /* ---------- state ---------- */
  var S = { loaded: false, entries: [], plants: [], channels: [], settings: {}, tab: 'input', year: new Date().getFullYear() };

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function yen(n) { n = Math.round(n || 0); return (n < 0 ? '−' : '') + '¥' + Math.abs(n).toLocaleString('ja-JP'); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function int(v) { var n = parseInt(String(v == null ? '' : v).replace(/[,，¥円\s]/g, ''), 10); return isNaN(n) ? 0 : n; }
  function uuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'g' + Date.now() + Math.random().toString(16).slice(2); }
  function ystart(y) { return y + '-01-01'; }
  function yend(y) { return y + '-12-31'; }
  function chLabel(slug) { var c = S.channels.filter(function (x) { return x.slug === slug; })[0]; return c ? c.label : (slug || ''); }
  function channelOf(slug) { return S.channels.filter(function (x) { return x.slug === slug; })[0] || null; }
  function plantOf(id) { return S.plants.filter(function (p) { return p.id === id; })[0] || null; }
  function opts(list, sel) { return list.map(function (o) { var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join(''); }
  function remember(k, v) { try { localStorage.setItem('ledger_' + k, v); } catch (e) {} }
  function recall(k, d) { try { return localStorage.getItem('ledger_' + k) || d; } catch (e) { return d; } }
  function field(label, html, hint) { return '<div><label class="adm-label">' + esc(label) + '</label>' + html + (hint ? '<div style="font-size:var(--font-size-xs);color:var(--color-gray);margin-top:2px;">' + hint + '</div>' : '') + '</div>'; }
  function input(name, value, attrs) { return '<input class="form-input" name="' + name + '" value="' + esc(value == null ? '' : value) + '" ' + (attrs || '') + '>'; }

  async function fetchAll(table, orderCols) {
    var out = [], from = 0, size = 1000;
    for (;;) {
      var q = sb.from(table).select('*');
      (orderCols || ['id']).forEach(function (c) { q = q.order(c); });
      var r = await q.range(from, from + size - 1);
      if (r.error) throw r.error;
      out = out.concat(r.data || []);
      if (!r.data || r.data.length < size) break;
      from += size;
    }
    return out;
  }
  async function load() {
    var r = await Promise.all([
      fetchAll('ledger_entries', ['entry_date', 'id']), fetchAll('plant_stock', ['id']),
      fetchAll('ledger_channels', ['sort_order']), fetchAll('ledger_settings', ['key'])
    ]);
    S.entries = r[0]; S.plants = r[1]; S.channels = r[2];
    S.settings = {}; r[3].forEach(function (x) { S.settings[x.key] = x.value; });
    S.loaded = true;
  }
  async function insertEntries(rows) {
    if (!rows.length) return [];
    var r = await sb.from('ledger_entries').insert(rows).select();
    if (r.error) throw r.error;
    return r.data;
  }
  function blue() { return S.settings.blue_return !== false; }
  function openedOn() { return S.settings.opened_on || ''; }

  /* ---------- balances ---------- */
  function movement(acc, from, to, channel) {
    var d = 0, c = 0;
    S.entries.forEach(function (e) {
      if ((from && e.entry_date < from) || (to && e.entry_date > to)) return;
      if (channel && e.channel !== channel) return;
      if (e.debit === acc) d += e.amount;
      if (e.credit === acc) c += e.amount;
    });
    return debitNatural(acc) ? d - c : c - d;
  }
  function inStockAt(p, D) {
    if (!p.purchased_on || p.purchased_on > D) return false;
    if (p.mother_on && p.mother_on <= D) return false;   // a mother plant left the stock on that day
    if (p.status === 'stock') return true;
    return !!(p.status_date && p.status_date > D);
  }
  function stockAt(D) {
    var list = S.plants.filter(function (p) { return inStockAt(p, D); });
    return { list: list, value: list.reduce(function (s, p) { return s + (p.cost || 0); }, 0) };
  }
  function pl(y) {
    var from = ystart(y), to = yend(y);
    var sales = movement('売上高', from, to), other = movement('雑収入', from, to);
    var open = stockAt(yend(y - 1)).value, buy = movement('仕入高', from, to), close = stockAt(to).value;
    var cogs = open + buy - close;
    var exp = {}, expTotal = 0;
    EXPENSES.forEach(function (a) { var v = movement(a, from, to); if (v) { exp[a] = v; expTotal += v; } });
    return { sales: sales, other: other, open: open, buy: buy, close: close, cogs: cogs, gross: sales - cogs, exp: exp, expTotal: expTotal, income: sales - cogs + other - expTotal };
  }
  function bs(y) {
    var to = yend(y), prev = yend(y - 1);
    var assets = {}; REAL_ASSETS.forEach(function (a) { assets[a] = movement(a, null, to); });
    var stock = stockAt(to).value;
    var liab = {}; LIABILITIES.forEach(function (a) { liab[a] = movement(a, null, to); });
    var prevNet = REAL_ASSETS.reduce(function (s, a) { return s + movement(a, null, prev); }, 0) + stockAt(prev).value
      - LIABILITIES.reduce(function (s, a) { return s + movement(a, null, prev); }, 0);
    var capital = prevNet + movement('元入金', ystart(y), to);
    var dr = movement('事業主貸', ystart(y), to), cr = movement('事業主借', ystart(y), to);
    var income = pl(y).income;
    var left = REAL_ASSETS.reduce(function (s, a) { return s + assets[a]; }, 0) + stock + dr;
    var right = LIABILITIES.reduce(function (s, a) { return s + liab[a]; }, 0) + capital + cr + income;
    return { assets: assets, stock: stock, liab: liab, capital: capital, dr: dr, cr: cr, income: income, left: left, right: right };
  }

  /* ---------- depreciation of mother plants ---------- */
  function disposedOn(p) { return (p.status === 'sold' || p.status === 'dead') ? p.status_date : null; }
  function depFor(p, y) {
    if (!p.mother_on || !p.cost) return 0;
    var startY = +p.mother_on.slice(0, 4);
    if (y < startY) return 0;
    if (p.asset_method === 'lump3') {
      if (y > startY + 2) return 0;
      var third = Math.floor(p.cost / 3);
      return y === startY + 2 ? p.cost - third * 2 : third;
    }
    if (p.asset_method !== 'straight' || !p.useful_years) return 0;
    var disp = disposedOn(p);
    if (disp && +disp.slice(0, 4) < y) return 0;
    var m0 = y === startY ? +p.mother_on.slice(5, 7) : 1;
    var m1 = disp && +disp.slice(0, 4) === y ? +disp.slice(5, 7) : 12;
    var months = Math.max(0, m1 - m0 + 1);
    var posted = postedDep(p, null, y - 1);
    var annual = p.cost / p.useful_years;
    return Math.max(0, Math.min(Math.round(annual * months / 12), p.cost - 1 - posted));
  }
  function postedDep(p, fromY, toY) {
    return S.entries.filter(function (e) {
      if (e.source !== 'depreciation' || e.plant_id !== p.id) return false;
      var yy = +e.entry_date.slice(0, 4);
      return (fromY == null || yy >= fromY) && (toY == null || yy <= toY);
    }).reduce(function (s, e) { return s + e.amount; }, 0);
  }
  function depPosted(p, y) { return S.entries.some(function (e) { return e.source === 'depreciation' && e.source_ref === 'dep-' + p.id + '-' + y; }); }
  function assetAccount(p) { return p.asset_method === 'lump3' ? '一括償却資産' : '工具器具備品'; }
  async function postDep(p, y, onDate) {
    var amt = depFor(p, y);
    if (!amt || depPosted(p, y)) return 0;
    await insertEntries([{ entry_date: onDate || yend(y), debit: '減価償却費', credit: assetAccount(p), amount: amt, description: '減価償却（親木 ' + p.code + ' ' + p.name + '）', plant_id: p.id, source: 'depreciation', source_ref: 'dep-' + p.id + '-' + y }]);
    return amt;
  }

  /* ---------- rendering shell ---------- */
  var TABS = [['input', '入力'], ['journal', '仕訳帳'], ['ledger', '元帳'], ['monthly', '月別'], ['closing', '決算'], ['settings', '設定']];
  window.loadLedger = async function () {
    var root = document.getElementById('ledger-root');
    if (!root) return;
    root.innerHTML = '<p style="color:var(--color-gray);">読み込み中…</p>';
    try { await load(); } catch (e) { root.innerHTML = '<p style="color:#a8712e;">読み込みエラー: ' + esc(e.message || e) + '</p>'; return; }
    renderLedger();
  };
  window.loadPlants = async function () {
    var root = document.getElementById('plants-root');
    if (!root) return;
    root.innerHTML = '<p style="color:var(--color-gray);">読み込み中…</p>';
    try { await load(); } catch (e) { root.innerHTML = '<p style="color:#a8712e;">読み込みエラー: ' + esc(e.message || e) + '</p>'; return; }
    renderPlants();
  };
  async function refresh() {
    await load();
    if (document.getElementById('ledger-root') && !document.getElementById('sec-ledger').classList.contains('hidden')) renderLedger();
    if (document.getElementById('plants-root') && !document.getElementById('sec-plants').classList.contains('hidden')) renderPlants();
  }

  function yearOptions() {
    var ys = {}; ys[new Date().getFullYear()] = 1;
    S.entries.forEach(function (e) { ys[+e.entry_date.slice(0, 4)] = 1; });
    return Object.keys(ys).map(Number).sort(function (a, b) { return b - a; });
  }
  function summaryCards() {
    var y = new Date().getFullYear(), p = pl(y);
    var recv = S.channels.map(function (c) { return [c, movement('売掛金', null, null, c.slug)]; }).filter(function (x) { return x[1]; });
    return '<div class="stat-grid" style="margin-bottom:var(--space-md);">'
      + '<div class="stat-card"><div class="stat-value">' + yen(p.sales + p.other) + '</div><div class="stat-label">' + y + '年の売上</div></div>'
      + '<div class="stat-card"><div class="stat-value">' + yen(p.cogs + p.expTotal) + '</div><div class="stat-label">売上原価 + 経費</div></div>'
      + '<div class="stat-card"><div class="stat-value">' + yen(p.income) + '</div><div class="stat-label">所得（青色申告特別控除の前）</div></div>'
      + '<div class="stat-card"><div class="stat-value">' + yen(stockAt(today()).value) + '</div><div class="stat-label">いまの在庫（仕入れ値）</div></div>'
      + '</div>'
      + (recv.length ? '<p style="font-size:var(--font-size-sm);margin:0 0 var(--space-md);">販売先・ASP に残っているお金: ' + recv.map(function (x) { return esc(x[0].label) + ' ' + yen(x[1]); }).join(' ／ ') + '</p>' : '');
  }
  function renderLedger() {
    var root = document.getElementById('ledger-root');
    var html = summaryCards() + '<div class="toolbar" style="flex-wrap:wrap;">'
      + TABS.map(function (t) { return '<button type="button" class="btn btn-sm ' + (S.tab === t[0] ? 'btn-primary' : 'btn-outline') + '" data-ltab="' + t[0] + '">' + t[1] + '</button>'; }).join('')
      + '</div><div id="ledger-tab" style="margin-top:var(--space-md);"></div>';
    root.innerHTML = html;
    root.querySelectorAll('[data-ltab]').forEach(function (b) { b.addEventListener('click', function () { S.tab = b.getAttribute('data-ltab'); renderLedger(); }); });
    var el = document.getElementById('ledger-tab');
    ({ input: tabInput, journal: tabJournal, ledger: tabAccount, monthly: tabMonthly, closing: tabClosing, settings: tabSettings })[S.tab](el);
  }

  /* ---------- 入力 ---------- */
  function tabInput(el) {
    var exp = TEMPLATES.filter(function (t) { return t.debit && !t.fixed; });
    var inc = TEMPLATES.filter(function (t) { return t.credit && !t.fixed; });
    var fix = TEMPLATES.filter(function (t) { return t.fixed; });
    function group(title, list) {
      return '<h4 style="margin:var(--space-md) 0 var(--space-xs);font-size:var(--font-size-sm);color:var(--color-gray);">' + title + '</h4><div style="display:flex;flex-wrap:wrap;gap:6px;">'
        + list.map(function (t) { return '<button type="button" class="btn btn-outline btn-sm" data-tpl="' + t.id + '">' + esc(t.label) + '</button>'; }).join('') + '</div>';
    }
    el.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:6px;">'
      + '<button type="button" class="btn btn-primary btn-sm" data-act="purchase">植物を仕入れた</button>'
      + '<button type="button" class="btn btn-primary btn-sm" data-act="sale">植物が売れた</button>'
      + '<button type="button" class="btn btn-primary btn-sm" data-act="payout">販売先から入金された</button>'
      + '</div>'
      + group('経費', exp) + group('売上・入金', inc) + group('お金の移動', fix)
      + '<h4 style="margin:var(--space-md) 0 var(--space-xs);font-size:var(--font-size-sm);color:var(--color-gray);">そのほか</h4><button type="button" class="btn btn-outline btn-sm" data-act="free">自由に仕訳を入力</button>';
    el.querySelectorAll('[data-tpl]').forEach(function (b) { b.addEventListener('click', function () { templateForm(TEMPLATES.filter(function (t) { return t.id === b.getAttribute('data-tpl'); })[0]); }); });
    el.querySelector('[data-act="purchase"]').addEventListener('click', function () { purchaseForm(); });
    el.querySelector('[data-act="sale"]').addEventListener('click', function () { saleForm(null); });
    el.querySelector('[data-act="payout"]').addEventListener('click', function () { payoutForm(); });
    el.querySelector('[data-act="free"]').addEventListener('click', function () { freeForm(null); });
  }

  function receiptField() { return field('領収書・請求書（写真か PDF、任意）', '<input type="file" name="receipt" accept="image/*,application/pdf" class="form-input">', '電子で受け取った請求書は、紙に印刷せずここに保存します（電子帳簿保存法）'); }
  async function uploadFile(file, prefix) {
    if (!file) return null;
    var ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
    var path = prefix + '/' + Date.now() + '-' + Math.random().toString(16).slice(2, 8) + '.' + ext;
    var r = await sb.storage.from('ledger-receipts').upload(path, file, { upsert: false });
    if (r.error) throw r.error;
    return path;
  }
  async function openFile(path) {
    var r = await sb.storage.from('ledger-receipts').createSignedUrl(path, 300);
    if (r.error) { toast('ファイルを開けません: ' + r.error.message); return; }
    window.open(r.data.signedUrl, '_blank', 'noopener');
  }

  function templateForm(t) {
    var isIncome = !!t.credit && !t.debit;
    var counterList = isIncome ? RECV_TO : PAY_FROM;
    var counterDefault = recall((isIncome ? 'recv_' : 'pay_') + t.id, t.recv || counterList[0][0]);
    var html = '<h3 style="margin-bottom:var(--space-md);">' + esc(t.label) + '</h3><form id="lf" style="display:grid;gap:var(--space-sm);">'
      + '<div class="adm-grid-2col-var">' + field('日付', input('date', today(), 'type="date" required')) + field('金額（円）', input('amount', '', 'inputmode="numeric" required')) + '</div>'
      + '<div class="adm-grid-2col-var">' + field('取引先', input('partner', t.partner || '')) + field('摘要', input('description', t.label)) + '</div>'
      + (t.fixed ? '' : field(isIncome ? '受け取り先' : '支払い方法', '<select class="form-input" name="counter">' + opts(counterList, counterDefault) + '</select>'))
      + receiptField()
      + '<div style="display:flex;gap:var(--space-sm);justify-content:flex-end;"><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button><button type="submit" class="btn btn-primary">記帳する</button></div></form>';
    showModal(html);
    document.getElementById('lf').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, amount = int(f.amount.value);
      if (amount <= 0) { toast('金額を入れてください'); return; }
      var counter = f.counter ? f.counter.value : null;
      if (counter) remember((isIncome ? 'recv_' : 'pay_') + t.id, counter);
      try {
        var receipt = await uploadFile(f.receipt.files[0], f.date.value.slice(0, 7));
        var ch = t.id === 'af_rakuten' ? 'rakuten_af' : t.id === 'af_moshimo' ? 'moshimo' : t.id === 'af_yahoo' ? 'yahoo_af' : null;
        await insertEntries([{
          entry_date: f.date.value, amount: amount, description: f.description.value.trim() || t.label, partner: f.partner.value.trim() || null,
          debit: t.fixed ? t.debit : (isIncome ? counter : t.debit), credit: t.fixed ? t.credit : (isIncome ? t.credit : counter),
          channel: ch, source: 'template', receipt_path: receipt
        }]);
        toast('記帳しました'); closeModal(); refresh();
      } catch (err) { toast('保存エラー: ' + (err.message || err)); }
    });
  }

  function freeForm(entry) {
    entry = entry || {};
    var html = '<h3 style="margin-bottom:var(--space-md);">' + (entry.id ? '仕訳を編集' : '自由に仕訳を入力') + '</h3><form id="lf" style="display:grid;gap:var(--space-sm);">'
      + '<div class="adm-grid-2col-var">' + field('日付', input('date', entry.entry_date || today(), 'type="date" required')) + field('金額（円）', input('amount', entry.amount || '', 'inputmode="numeric" required')) + '</div>'
      + '<div class="adm-grid-2col-var">' + field('借方（増えた資産・経費）', '<select class="form-input" name="debit">' + opts(ACCOUNTS, entry.debit || '雑費') + '</select>') + field('貸方（減った資産・売上・借り）', '<select class="form-input" name="credit">' + opts(ACCOUNTS, entry.credit || '事業主借') + '</select>') + '</div>'
      + '<div class="adm-grid-2col-var">' + field('摘要', input('description', entry.description || '', 'required')) + field('取引先', input('partner', entry.partner || '')) + '</div>'
      + field('販売先・ASP（売掛金を使うとき）', '<select class="form-input" name="channel"><option value="">—</option>' + opts(S.channels.map(function (c) { return [c.slug, c.label]; }), entry.channel || '') + '</select>')
      + field('メモ', input('memo', entry.memo || ''))
      + (entry.id ? '' : receiptField())
      + '<div style="display:flex;gap:var(--space-sm);justify-content:flex-end;"><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button><button type="submit" class="btn btn-primary">' + (entry.id ? '更新' : '記帳する') + '</button></div></form>';
    showModal(html);
    document.getElementById('lf').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, amount = int(f.amount.value);
      if (amount <= 0) { toast('金額を入れてください'); return; }
      if (f.debit.value === f.credit.value) { toast('借方と貸方が同じです'); return; }
      var row = { entry_date: f.date.value, amount: amount, debit: f.debit.value, credit: f.credit.value, description: f.description.value.trim(), partner: f.partner.value.trim() || null, channel: f.channel.value || null, memo: f.memo.value.trim() || null };
      try {
        if (entry.id) {
          var r = await sb.from('ledger_entries').update(row).eq('id', entry.id);
          if (r.error) throw r.error;
        } else {
          row.receipt_path = await uploadFile(f.receipt.files[0], f.date.value.slice(0, 7));
          row.source = 'manual';
          await insertEntries([row]);
        }
        toast('保存しました'); closeModal(); refresh();
      } catch (err) { toast('保存エラー: ' + (err.message || err)); }
    });
  }

  /* ---------- plants: purchase / offset / sale / payout / mother / dead ---------- */
  function nextCode(y) {
    var pre = 'P-' + y + '-', max = 0;
    S.plants.forEach(function (p) { if (p.code.indexOf(pre) === 0) max = Math.max(max, int(p.code.slice(pre.length))); });
    return pre + String(max + 1).padStart(3, '0');
  }
  function purchaseForm() {
    var html = '<h3 style="margin-bottom:var(--space-md);">植物を仕入れた</h3><form id="lf" style="display:grid;gap:var(--space-sm);">'
      + '<div class="adm-grid-2col-var">' + field('品種名（種小名を含めて）', input('name', '', 'required placeholder="Anthurium warocqueanum"')) + field('管理番号（ショップの商品コードにも使う）', input('code', nextCode(new Date().getFullYear()), 'required')) + '</div>'
      + '<div class="adm-grid-2col-var">' + field('仕入れた日', input('date', today(), 'type="date" required')) + field('仕入れ値（円）', input('cost', '', 'inputmode="numeric" required')) + '</div>'
      + '<div class="adm-grid-2col-var">' + field('仕入先', input('supplier', '')) + field('支払い方法', '<select class="form-input" name="pay">' + opts(PAY_FROM, recall('pay_plant', '事業主借')) + '</select>') + '</div>'
      + '<label style="font-size:var(--font-size-sm);"><input type="checkbox" name="before"> 開業前から持っていた株（帳簿には開業日' + (openedOn() ? '（' + esc(openedOn()) + '）' : '') + 'の日付で、個人から持ち込んだ扱いで載せます）</label>'
      + field('写真（任意）', '<input type="file" name="photo" accept="image/*" class="form-input">')
      + receiptField()
      + field('メモ', input('notes', ''))
      + '<div style="display:flex;gap:var(--space-sm);justify-content:flex-end;"><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button><button type="submit" class="btn btn-primary">登録して記帳</button></div></form>';
    showModal(html);
    var f = document.getElementById('lf');
    f.date.addEventListener('change', function () { if (/^P-\d{4}-/.test(f.code.value)) f.code.value = nextCode(f.date.value.slice(0, 4)); });
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var cost = int(f.cost.value), before = f.before.checked;
      if (before && !openedOn()) { toast('先に「設定」で開業日を入れてください'); return; }
      if (S.plants.some(function (p) { return p.code === f.code.value.trim(); })) { toast('この管理番号は使われています'); return; }
      var booked = before ? (f.date.value > openedOn() ? f.date.value : openedOn()) : f.date.value;
      var pay = before ? '事業主借' : f.pay.value;
      remember('pay_plant', f.pay.value);
      try {
        var photo = await uploadFile(f.photo.files[0], 'plants');
        var receipt = await uploadFile(f.receipt.files[0], booked.slice(0, 7));
        var r = await sb.from('plant_stock').insert({ code: f.code.value.trim(), name: f.name.value.trim(), supplier: f.supplier.value.trim() || null, purchased_on: booked, acquired_on: f.date.value, cost: cost, status: 'stock', photo_path: photo, notes: f.notes.value.trim() || null }).select().single();
        if (r.error) throw r.error;
        if (cost > 0) await insertEntries([{ entry_date: booked, debit: '仕入高', credit: pay, amount: cost, description: (before ? '開業前からの株を持ち込み ' : '植物の仕入れ ') + r.data.code + ' ' + r.data.name, partner: f.supplier.value.trim() || null, plant_id: r.data.id, source: 'plant', receipt_path: receipt }]);
        toast('登録しました'); closeModal(); refresh();
      } catch (err) { toast('保存エラー: ' + (err.message || err)); }
    });
  }
  function offsetForm(mother) {
    var html = '<h3 style="margin-bottom:var(--space-md);">子株を登録（親木 ' + esc(mother.code) + '）</h3><form id="lf" style="display:grid;gap:var(--space-sm);">'
      + '<p style="font-size:var(--font-size-sm);color:var(--color-gray);margin:0;">子株は仕入れ値 0 円の在庫として載せます。鉢や用土の代金は「鉢・用土・資材」で経費にしてください。</p>'
      + '<div class="adm-grid-2col-var">' + field('品種名', input('name', mother.name, 'required')) + field('管理番号', input('code', nextCode(new Date().getFullYear()), 'required')) + '</div>'
      + '<div class="adm-grid-2col-var">' + field('取った日', input('date', today(), 'type="date" required')) + field('株数', input('count', '1', 'inputmode="numeric"'), '2株以上なら番号を続けて振ります') + '</div>'
      + '<div style="display:flex;gap:var(--space-sm);justify-content:flex-end;"><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button><button type="submit" class="btn btn-primary">登録</button></div></form>';
    showModal(html);
    document.getElementById('lf').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, n = Math.max(1, Math.min(50, int(f.count.value) || 1));
      var m = f.code.value.trim().match(/^(.*?)(\d+)$/);
      var rows = [];
      for (var i = 0; i < n; i++) {
        var code = i === 0 || !m ? f.code.value.trim() + (i && !m ? '-' + i : '') : m[1] + String(int(m[2]) + i).padStart(m[2].length, '0');
        if (S.plants.some(function (p) { return p.code === code; })) { toast('管理番号 ' + code + ' は使われています'); return; }
        rows.push({ code: code, name: f.name.value.trim(), purchased_on: f.date.value, acquired_on: f.date.value, cost: 0, status: 'stock', parent_id: mother.id, notes: '子株（親木 ' + mother.code + '）' });
      }
      var r = await sb.from('plant_stock').insert(rows);
      if (r.error) { toast('保存エラー: ' + r.error.message); return; }
      toast(n + '株を登録しました'); closeModal(); refresh();
    });
  }

  function feeFor(ch, gross) { if (!ch) return 0; return Math.round(gross * Number(ch.fee_rate || 0)) + (ch.fee_fixed || 0); }
  function saleForm(plant, preset) {
    preset = preset || {};
    var stock = S.plants.filter(function (p) { return p.status === 'stock' || p.status === 'mother'; });
    var shopCh = S.channels.filter(function (c) { return ['mercari_shops', 'base', 'stores'].indexOf(c.slug) !== -1 || !/_af$|moshimo|payjp/.test(c.slug); });
    var html = '<h3 style="margin-bottom:var(--space-md);">植物が売れた</h3><form id="lf" style="display:grid;gap:var(--space-sm);">'
      + field('売れた株', '<select class="form-input" name="plant"><option value="">（株台帳にない株）</option>' + opts(stock.map(function (p) { return [String(p.id), p.code + ' ' + p.name + (p.status === 'mother' ? '（親木）' : '')]; }), plant ? String(plant.id) : '') + '</select>')
      + '<div class="adm-grid-2col-var">' + field('販売先', '<select class="form-input" name="channel">' + opts(shopCh.map(function (c) { return [c.slug, c.label]; }), preset.channel || recall('sale_ch', 'mercari_shops')) + '</select>') + field('売れた日（発送・取引完了の日）', input('date', preset.date || today(), 'type="date" required')) + '</div>'
      + '<div class="adm-grid-2col-var">' + field('商品代金（円）', input('price', preset.price || '', 'inputmode="numeric" required')) + field('買い手から受け取った送料（円）', input('ship_in', preset.ship || '0', 'inputmode="numeric"')) + '</div>'
      + '<div class="adm-grid-2col-var">' + field('販売手数料（円・自動計算）', input('fee', '', 'inputmode="numeric"')) + field('販売先が差し引いた送料（円）', input('ship_out', '0', 'inputmode="numeric"'), 'メルカリ便など、売上から引かれた送料') + '</div>'
      + '<div class="adm-grid-2col-var">' + field('注文番号（任意）', input('order', preset.order || '')) + field('買い手（任意・個人名は書かなくてよい）', input('partner', '')) + '</div>'
      + '<p id="sale-note" style="font-size:var(--font-size-xs);color:#a8712e;margin:0;"></p>'
      + '<div style="display:flex;gap:var(--space-sm);justify-content:flex-end;"><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button><button type="submit" class="btn btn-primary">記帳する</button></div></form>';
    showModal(html);
    var f = document.getElementById('lf');
    var feeTouched = false;
    function recalc() {
      if (!feeTouched) f.fee.value = feeFor(channelOf(f.channel.value), int(f.price.value) + int(f.ship_in.value)) || '';
      var p = plantOf(int(f.plant.value));
      document.getElementById('sale-note').textContent = p && p.status === 'mother' ? '親木の売却です。在庫の売上とは税務上の扱いが違う場合があります（帳簿にはメモ付きで売上として載せます。扱いは税務署に確認してください）。' : '';
    }
    f.fee.addEventListener('input', function () { feeTouched = true; });
    ['channel', 'price', 'ship_in', 'plant'].forEach(function (n) { f[n].addEventListener('input', recalc); f[n].addEventListener('change', recalc); });
    recalc();
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var price = int(f.price.value), shipIn = int(f.ship_in.value), fee = int(f.fee.value), shipOut = int(f.ship_out.value);
      if (price <= 0) { toast('商品代金を入れてください'); return; }
      remember('sale_ch', f.channel.value);
      try { await recordSale({ plant: plantOf(int(f.plant.value)), channel: f.channel.value, date: f.date.value, price: price, shipIn: shipIn, fee: fee, shipOut: shipOut, order: f.order.value.trim(), partner: f.partner.value.trim(), source: 'sale' }); toast('記帳しました'); closeModal(); refresh(); }
      catch (err) { toast('保存エラー: ' + (err.message || err)); }
    });
  }
  async function recordSale(o) {
    var g = uuid(), p = o.plant, label = p ? p.code + ' ' + p.name : '株台帳にない株';
    var base = { entry_date: o.date, channel: o.channel, plant_id: p ? p.id : null, group_id: g, source: o.source || 'sale', source_ref: o.order || null };
    var memo = p && p.status === 'mother' ? '親木の売却（扱いは税務署に確認）' : null;
    var rows = [Object.assign({}, base, { debit: '売掛金', credit: '売上高', amount: o.price + o.shipIn, description: '植物の販売 ' + label + (o.shipIn ? '（送料 ' + o.shipIn + '円を含む）' : ''), partner: o.partner || chLabel(o.channel), memo: memo })];
    if (o.fee > 0) rows.push(Object.assign({}, base, { debit: '支払手数料', credit: '売掛金', amount: o.fee, description: chLabel(o.channel) + ' 販売手数料 ' + label, partner: chLabel(o.channel) }));
    if (o.shipOut > 0) rows.push(Object.assign({}, base, { debit: '荷造運賃', credit: '売掛金', amount: o.shipOut, description: chLabel(o.channel) + ' 送料（売上から差し引き） ' + label, partner: chLabel(o.channel) }));
    if (p && p.status === 'mother' && p.asset_method === 'straight') {
      var y = +o.date.slice(0, 4);
      p.status = 'sold'; p.status_date = o.date;
      await postDep(p, y, o.date);
      await load();
      var book = p.cost - postedDep(p, null, null);
      if (book > 0) rows.push(Object.assign({}, base, { debit: '固定資産除却損', credit: '工具器具備品', amount: book, description: '親木の売却に伴う帳簿価額の除去 ' + label, source_ref: null, memo: memo }));
    }
    await insertEntries(rows);
    if (p) {
      var r = await sb.from('plant_stock').update({ status: 'sold', status_date: o.date, sold_on: o.date, sale_price: o.price, channel: o.channel }).eq('id', p.id);
      if (r.error) throw r.error;
    }
  }
  function payoutForm() {
    var withBal = S.channels.map(function (c) { return [c, movement('売掛金', null, null, c.slug)]; });
    var def = (withBal.filter(function (x) { return x[1] > 0; })[0] || withBal[0] || [{}])[0];
    var html = '<h3 style="margin-bottom:var(--space-md);">販売先から入金された</h3><form id="lf" style="display:grid;gap:var(--space-sm);">'
      + field('販売先・ASP', '<select class="form-input" name="channel">' + opts(withBal.map(function (x) { return [x[0].slug, x[0].label + '（残高 ' + yen(x[1]) + '）']; }), def.slug) + '</select>')
      + '<div class="adm-grid-2col-var">' + field('入金日', input('date', today(), 'type="date" required')) + field('振り込まれた金額（円）', input('amount', '', 'inputmode="numeric" required')) + '</div>'
      + '<div class="adm-grid-2col-var">' + field('振込手数料（円）', input('fee', def.payout_fee || 0, 'inputmode="numeric"')) + field('入金先', '<select class="form-input" name="to">' + opts(RECV_TO, recall('payout_to', '普通預金')) + '</select>') + '</div>'
      + '<div style="display:flex;gap:var(--space-sm);justify-content:flex-end;"><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button><button type="submit" class="btn btn-primary">記帳する</button></div></form>';
    showModal(html);
    var f = document.getElementById('lf');
    f.channel.addEventListener('change', function () { var c = channelOf(f.channel.value); f.fee.value = c ? c.payout_fee || 0 : 0; });
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var amount = int(f.amount.value), fee = int(f.fee.value), g = uuid(), lab = chLabel(f.channel.value);
      if (amount <= 0) { toast('金額を入れてください'); return; }
      remember('payout_to', f.to.value);
      var rows = [{ entry_date: f.date.value, debit: f.to.value, credit: '売掛金', amount: amount, description: lab + ' からの入金', partner: lab, channel: f.channel.value, group_id: g, source: 'payout' }];
      if (fee > 0) rows.push({ entry_date: f.date.value, debit: '支払手数料', credit: '売掛金', amount: fee, description: lab + ' 振込手数料', partner: lab, channel: f.channel.value, group_id: g, source: 'payout' });
      try { await insertEntries(rows); toast('記帳しました'); closeModal(); refresh(); } catch (err) { toast('保存エラー: ' + (err.message || err)); }
    });
  }
  function motherForm(p) {
    var c = p.cost || 0, methods = [];
    if (c < 100000) methods = ['small'];
    else if (c < 200000) methods = (blue() ? ['small_blue'] : []).concat(['lump3', 'straight']);
    else if (c < 300000) methods = (blue() ? ['small_blue'] : []).concat(['straight']);
    else methods = ['straight'];
    var yearSmallBlue = S.plants.filter(function (x) { return x.asset_method === 'small_blue' && x.mother_on && x.mother_on.slice(0, 4) === today().slice(0, 4); }).reduce(function (s, x) { return s + x.cost; }, 0);
    var html = '<h3 style="margin-bottom:var(--space-md);">親木にする（' + esc(p.code + ' ' + p.name) + '）</h3><form id="lf" style="display:grid;gap:var(--space-sm);">'
      + '<p style="font-size:var(--font-size-sm);margin:0;">親木にできるのは、株分け・子株取り・交配などに<strong>実際に使い始めた株</strong>だけです。売れ残った株を親木にすることはできません。使い始めた日と用途を記録し、株分けなどの写真を残してください。</p>'
      + '<div class="adm-grid-2col-var">' + field('使い始めた日', input('date', today(), 'type="date" required')) + field('用途（必須）', input('purpose', '', 'required placeholder="子株取り・株分け・交配親 など"')) + '</div>'
      + field('仕入れ値 ' + yen(c) + ' の扱い', '<select class="form-input" name="method">' + opts(methods.map(function (m) { return [m, METHOD[m]]; }), methods[0]) + '</select>', yearSmallBlue ? '今年の少額特例の合計: ' + yen(yearSmallBlue) + '（上限300万円）' : '')
      + '<div id="years-row" style="display:none;">' + field('耐用年数（年）', input('years', '', 'inputmode="numeric"'), '植物の耐用年数の区分ははっきりしない部分があります。税務署で確認した年数を入れてください') + '</div>'
      + '<div style="display:flex;gap:var(--space-sm);justify-content:flex-end;"><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button><button type="submit" class="btn btn-primary">親木にする</button></div></form>';
    showModal(html);
    var f = document.getElementById('lf');
    function sync() { document.getElementById('years-row').style.display = f.method.value === 'straight' ? '' : 'none'; }
    f.method.addEventListener('change', sync); sync();
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var m = f.method.value, years = int(f.years.value);
      if (m === 'straight' && years < 1) { toast('耐用年数を入れてください'); return; }
      if (f.date.value < p.purchased_on) { toast('仕入れた日より前にはできません'); return; }
      var debit = m === 'small' ? '消耗品費' : m === 'small_blue' ? '減価償却費' : m === 'lump3' ? '一括償却資産' : '工具器具備品';
      try {
        if (c > 0) await insertEntries([{ entry_date: f.date.value, debit: debit, credit: '仕入高', amount: c, description: '在庫から親木へ振替 ' + p.code + ' ' + p.name + '（' + f.purpose.value.trim() + '）', plant_id: p.id, source: 'plant', memo: METHOD[m] }]);
        var r = await sb.from('plant_stock').update({ status: 'mother', status_date: f.date.value, mother_on: f.date.value, mother_purpose: f.purpose.value.trim(), asset_method: m, useful_years: m === 'straight' ? years : null }).eq('id', p.id);
        if (r.error) throw r.error;
        toast('親木にしました'); closeModal(); refresh();
      } catch (err) { toast('保存エラー: ' + (err.message || err)); }
    });
  }
  function deadForm(p) {
    var html = '<h3 style="margin-bottom:var(--space-md);">枯れた・廃棄した（' + esc(p.code + ' ' + p.name) + '）</h3><form id="lf" style="display:grid;gap:var(--space-sm);">'
      + '<p style="font-size:var(--font-size-sm);margin:0;">' + (p.status === 'stock' ? '在庫の株は、年末の在庫から外れることで自動的にその年の原価になります。仕訳は作りません。' : p.asset_method === 'straight' ? '残っている帳簿価額を固定資産除却損にします。' : '親木の仕入れ値はすでに経費にしているので、仕訳は作りません。') + '</p>'
      + field('日付', input('date', today(), 'type="date" required'))
      + field('写真（残しておくと安心です）', '<input type="file" name="photo" accept="image/*" class="form-input">')
      + field('メモ', input('notes', ''))
      + '<div style="display:flex;gap:var(--space-sm);justify-content:flex-end;"><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button><button type="submit" class="btn btn-danger">記録する</button></div></form>';
    showModal(html);
    document.getElementById('lf').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target;
      try {
        var photo = await uploadFile(f.photo.files[0], 'plants');
        var notes = [p.notes, '枯死・廃棄 ' + f.date.value + (f.notes.value.trim() ? ': ' + f.notes.value.trim() : '')].filter(Boolean).join(' / ');
        if (p.status === 'mother' && p.asset_method === 'straight') {
          p.status = 'dead'; p.status_date = f.date.value;
          await postDep(p, +f.date.value.slice(0, 4), f.date.value);
          await load();
          var book = p.cost - postedDep(p, null, null);
          if (book > 0) await insertEntries([{ entry_date: f.date.value, debit: '固定資産除却損', credit: '工具器具備品', amount: book, description: '親木の除却 ' + p.code + ' ' + p.name, plant_id: p.id, source: 'plant' }]);
        }
        var upd = { status: 'dead', status_date: f.date.value, notes: notes };
        if (photo) upd.photo_path = photo;
        var r = await sb.from('plant_stock').update(upd).eq('id', p.id);
        if (r.error) throw r.error;
        toast('記録しました'); closeModal(); refresh();
      } catch (err) { toast('保存エラー: ' + (err.message || err)); }
    });
  }
  function editPlantForm(p) {
    var html = '<h3 style="margin-bottom:var(--space-md);">株を編集（' + esc(p.code) + '）</h3><form id="lf" style="display:grid;gap:var(--space-sm);">'
      + '<div class="adm-grid-2col-var">' + field('品種名', input('name', p.name, 'required')) + field('管理番号', input('code', p.code, 'required')) + '</div>'
      + '<div class="adm-grid-2col-var">' + field('仕入先', input('supplier', p.supplier || '')) + field('仕入れ値（円）', input('cost', p.cost, 'inputmode="numeric"' + (p.status === 'stock' ? '' : ' disabled')), p.status === 'stock' ? '仕入れの仕訳も同じ金額に直します' : '在庫でない株の仕入れ値は変えられません') + '</div>'
      + field('写真を差し替える', '<input type="file" name="photo" accept="image/*" class="form-input">')
      + field('メモ', input('notes', p.notes || ''))
      + '<div style="display:flex;gap:var(--space-sm);justify-content:space-between;"><button type="button" class="btn btn-danger" id="plant-del">削除</button><span><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button> <button type="submit" class="btn btn-primary">更新</button></span></div></form>';
    showModal(html);
    var f = document.getElementById('lf');
    document.getElementById('plant-del').addEventListener('click', async function () {
      if (p.status === 'sold') { toast('販売済みの株は削除できません（売上の記録が残るため）'); return; }
      var linked = S.entries.filter(function (e) { return e.plant_id === p.id; });
      if (!confirm(p.code + ' を削除しますか？' + (linked.length ? '\n仕入れなどの仕訳 ' + linked.length + ' 件も削除します。' : ''))) return;
      if (linked.length) { var d = await sb.from('ledger_entries').delete().in('id', linked.map(function (e) { return e.id; })); if (d.error) { toast('削除エラー: ' + d.error.message); return; } }
      var r = await sb.from('plant_stock').delete().eq('id', p.id);
      if (r.error) { toast('削除エラー: ' + r.error.message); return; }
      toast('削除しました'); closeModal(); refresh();
    });
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var upd = { name: f.name.value.trim(), code: f.code.value.trim(), supplier: f.supplier.value.trim() || null, notes: f.notes.value.trim() || null };
      if (S.plants.some(function (x) { return x.code === upd.code && x.id !== p.id; })) { toast('この管理番号は使われています'); return; }
      try {
        var photo = await uploadFile(f.photo.files[0], 'plants');
        if (photo) upd.photo_path = photo;
        if (p.status === 'stock') {
          var cost = int(f.cost.value);
          if (cost !== p.cost) {
            upd.cost = cost;
            var buy = S.entries.filter(function (x) { return x.plant_id === p.id && x.source === 'plant' && x.debit === '仕入高'; })[0];
            if (buy && cost > 0) { var u = await sb.from('ledger_entries').update({ amount: cost }).eq('id', buy.id); if (u.error) throw u.error; }
            else if (buy && cost === 0) { var dd = await sb.from('ledger_entries').delete().eq('id', buy.id); if (dd.error) throw dd.error; }
            else if (!buy && cost > 0) await insertEntries([{ entry_date: p.purchased_on, debit: '仕入高', credit: '事業主借', amount: cost, description: '植物の仕入れ ' + upd.code + ' ' + upd.name, plant_id: p.id, source: 'plant' }]);
          }
        }
        var r = await sb.from('plant_stock').update(upd).eq('id', p.id);
        if (r.error) throw r.error;
        toast('更新しました'); closeModal(); refresh();
      } catch (err) { toast('保存エラー: ' + (err.message || err)); }
    });
  }

  /* ---------- 株台帳 ---------- */
  var plantFilter = recall('plant_filter', 'active'), plantQ = '';
  function renderPlants() {
    var root = document.getElementById('plants-root');
    var y = new Date().getFullYear();
    var inStock = S.plants.filter(function (p) { return p.status === 'stock'; });
    var mothers = S.plants.filter(function (p) { return p.status === 'mother'; });
    var soldY = S.plants.filter(function (p) { return p.status === 'sold' && p.sold_on && p.sold_on.slice(0, 4) === String(y); });
    var list = S.plants.filter(function (p) {
      if (plantFilter === 'active' && !(p.status === 'stock' || p.status === 'mother')) return false;
      if (plantFilter !== 'active' && plantFilter !== 'all' && p.status !== plantFilter) return false;
      if (plantQ && (p.code + ' ' + p.name + ' ' + (p.supplier || '')).toLowerCase().indexOf(plantQ.toLowerCase()) === -1) return false;
      return true;
    }).sort(function (a, b) { return a.code < b.code ? 1 : -1; });
    var html = '<div class="stat-grid" style="margin-bottom:var(--space-md);">'
      + '<div class="stat-card"><div class="stat-value">' + inStock.length + '株</div><div class="stat-label">在庫 ' + yen(inStock.reduce(function (s, p) { return s + p.cost; }, 0)) + '</div></div>'
      + '<div class="stat-card"><div class="stat-value">' + mothers.length + '株</div><div class="stat-label">親木</div></div>'
      + '<div class="stat-card"><div class="stat-value">' + soldY.length + '株</div><div class="stat-label">' + y + '年の販売 ' + yen(soldY.reduce(function (s, p) { return s + (p.sale_price || 0); }, 0)) + '</div></div>'
      + '</div>'
      + '<div class="toolbar" style="flex-wrap:wrap;gap:6px;">'
      + '<button type="button" class="btn btn-primary btn-sm" data-pact="purchase">＋ 仕入れ登録</button>'
      + '<button type="button" class="btn btn-outline btn-sm" data-pact="csv">注文 CSV を取り込む</button>'
      + '<button type="button" class="btn btn-outline btn-sm" data-pact="export">株台帳 CSV</button>'
      + '</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:var(--space-sm) 0;">'
      + [['active', '在庫と親木'], ['stock', '在庫'], ['mother', '親木'], ['sold', '販売済み'], ['dead', '枯死・廃棄'], ['all', 'すべて']].map(function (x) { return '<button type="button" class="btn btn-sm ' + (plantFilter === x[0] ? 'btn-primary' : 'btn-outline') + '" data-pf="' + x[0] + '">' + x[1] + '</button>'; }).join('')
      + '<input class="form-input" id="plant-q" placeholder="番号・品種名・仕入先で探す" value="' + esc(plantQ) + '" style="max-width:240px;">'
      + '</div>';
    if (!list.length) html += '<p style="color:var(--color-gray);padding:var(--space-lg);text-align:center;">該当する株がありません</p>';
    else {
      html += '<div style="overflow-x:auto;"><table class="data-table" style="min-width:760px;"><thead><tr><th>管理番号</th><th>品種名</th><th>仕入れ日</th><th style="text-align:right;">仕入れ値</th><th>状態</th><th>操作</th></tr></thead><tbody>';
      list.forEach(function (p) {
        var st = STATUS[p.status] + (p.status_date ? ' ' + p.status_date : '') + (p.status === 'sold' ? ' · ' + chLabel(p.channel) + ' ' + yen(p.sale_price) : '') + (p.status === 'mother' && p.mother_purpose ? ' · ' + p.mother_purpose : '');
        html += '<tr><td style="font-family:monospace;">' + esc(p.code) + '</td><td>' + esc(p.name) + (p.photo_path ? ' <a href="#" data-photo="' + esc(p.photo_path) + '" style="font-size:var(--font-size-xs);">写真</a>' : '') + '</td>'
          + '<td>' + esc(p.acquired_on && p.acquired_on !== p.purchased_on ? p.acquired_on + '（帳簿 ' + p.purchased_on + '）' : p.purchased_on) + '</td><td style="text-align:right;">' + yen(p.cost) + '</td><td style="font-size:var(--font-size-sm);">' + esc(st) + '</td><td style="white-space:nowrap;">';
        if (p.status === 'stock' || p.status === 'mother') html += '<button class="btn btn-primary btn-sm" data-pop="sale" data-id="' + p.id + '">売れた</button> ';
        if (p.status === 'stock') html += '<button class="btn btn-outline btn-sm" data-pop="mother" data-id="' + p.id + '">親木にする</button> ';
        if (p.status === 'mother') html += '<button class="btn btn-outline btn-sm" data-pop="offset" data-id="' + p.id + '">子株を登録</button> ';
        if (p.status === 'stock' || p.status === 'mother') html += '<button class="btn btn-outline btn-sm" data-pop="dead" data-id="' + p.id + '">枯れた</button> ';
        html += '<button class="btn btn-outline btn-sm" data-pop="edit" data-id="' + p.id + '">編集</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    root.innerHTML = html;
    root.querySelector('[data-pact="purchase"]').addEventListener('click', purchaseForm);
    root.querySelector('[data-pact="csv"]').addEventListener('click', csvImportForm);
    root.querySelector('[data-pact="export"]').addEventListener('click', exportPlants);
    root.querySelectorAll('[data-pf]').forEach(function (b) { b.addEventListener('click', function () { plantFilter = b.getAttribute('data-pf'); remember('plant_filter', plantFilter); renderPlants(); }); });
    var q = document.getElementById('plant-q');
    q.addEventListener('change', function () { plantQ = q.value.trim(); renderPlants(); });
    root.querySelectorAll('[data-photo]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); openFile(a.getAttribute('data-photo')); }); });
    root.querySelectorAll('[data-pop]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = plantOf(int(b.getAttribute('data-id'))), a = b.getAttribute('data-pop');
        if (a === 'sale') saleForm(p); if (a === 'mother') motherForm(p); if (a === 'offset') offsetForm(p); if (a === 'dead') deadForm(p); if (a === 'edit') editPlantForm(p);
      });
    });
  }

  /* ---------- 仕訳帳 ---------- */
  var J = { year: null, month: '', account: '', q: '', min: '', max: '' };
  function tabJournal(el) {
    if (J.year == null) J.year = S.year;
    var years = yearOptions();
    var rows = S.entries.filter(function (e) {
      if (J.year && e.entry_date.slice(0, 4) !== String(J.year)) return false;
      if (J.month && e.entry_date.slice(5, 7) !== J.month) return false;
      if (J.account && e.debit !== J.account && e.credit !== J.account) return false;
      if (J.q && ((e.description || '') + ' ' + (e.partner || '') + ' ' + (e.memo || '')).toLowerCase().indexOf(J.q.toLowerCase()) === -1) return false;
      if (J.min && e.amount < int(J.min)) return false;
      if (J.max && e.amount > int(J.max)) return false;
      return true;
    }).slice().reverse();
    var html = '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-end;margin-bottom:var(--space-sm);">'
      + '<select class="form-input" id="j-year" style="max-width:110px;">' + opts(years.map(function (y) { return [String(y), y + '年']; }), String(J.year)) + '</select>'
      + '<select class="form-input" id="j-month" style="max-width:100px;"><option value="">全月</option>' + opts(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(function (m) { return [m, +m + '月']; }), J.month) + '</select>'
      + '<select class="form-input" id="j-acc" style="max-width:150px;"><option value="">全科目</option>' + opts(ACCOUNTS, J.account) + '</select>'
      + '<input class="form-input" id="j-q" placeholder="摘要・取引先" value="' + esc(J.q) + '" style="max-width:160px;">'
      + '<input class="form-input" id="j-min" placeholder="金額 以上" value="' + esc(J.min) + '" style="max-width:100px;" inputmode="numeric">'
      + '<input class="form-input" id="j-max" placeholder="以下" value="' + esc(J.max) + '" style="max-width:90px;" inputmode="numeric">'
      + '<button type="button" class="btn btn-outline btn-sm" id="j-csv">CSV に書き出す</button>'
      + '</div><p style="font-size:var(--font-size-xs);color:var(--color-gray);margin:0 0 var(--space-sm);">日付・金額・取引先で探せます（電子帳簿保存法の検索要件）。' + rows.length + ' 件</p>';
    if (!rows.length) html += '<p style="color:var(--color-gray);padding:var(--space-lg);text-align:center;">仕訳がありません</p>';
    else {
      html += '<div style="overflow-x:auto;"><table class="data-table" style="min-width:860px;"><thead><tr><th>日付</th><th>借方</th><th>貸方</th><th style="text-align:right;">金額</th><th>摘要</th><th>取引先</th><th>証憑</th><th></th></tr></thead><tbody>';
      rows.forEach(function (e) {
        html += '<tr><td style="white-space:nowrap;">' + esc(e.entry_date) + '</td><td>' + esc(e.debit) + (e.debit === '売掛金' && e.channel ? '<br><span style="font-size:var(--font-size-xs);color:var(--color-gray);">' + esc(chLabel(e.channel)) + '</span>' : '') + '</td>'
          + '<td>' + esc(e.credit) + (e.credit === '売掛金' && e.channel ? '<br><span style="font-size:var(--font-size-xs);color:var(--color-gray);">' + esc(chLabel(e.channel)) + '</span>' : '') + '</td>'
          + '<td style="text-align:right;white-space:nowrap;">' + yen(e.amount) + '</td><td style="font-size:var(--font-size-sm);">' + esc(e.description) + (e.memo ? '<br><span style="font-size:var(--font-size-xs);color:#a8712e;">' + esc(e.memo) + '</span>' : '') + '</td>'
          + '<td style="font-size:var(--font-size-sm);">' + esc(e.partner || '') + '</td>'
          + '<td>' + (e.receipt_path ? '<a href="#" data-rcpt="' + esc(e.receipt_path) + '">開く</a>' : '<label style="font-size:var(--font-size-xs);cursor:pointer;text-decoration:underline;">添付<input type="file" accept="image/*,application/pdf" data-attach="' + e.id + '" style="display:none;"></label>') + '</td>'
          + '<td style="white-space:nowrap;"><button class="btn btn-outline btn-sm" data-jedit="' + e.id + '">編集</button> <button class="btn btn-danger btn-sm" data-jdel="' + e.id + '">削除</button></td></tr>';
      });
      html += '</tbody></table></div>';
    }
    el.innerHTML = html;
    function bind(id, key) { var x = document.getElementById(id); x.addEventListener('change', function () { J[key] = key === 'year' ? +x.value : x.value.trim(); tabJournal(el); }); }
    bind('j-year', 'year'); bind('j-month', 'month'); bind('j-acc', 'account'); bind('j-q', 'q'); bind('j-min', 'min'); bind('j-max', 'max');
    document.getElementById('j-csv').addEventListener('click', function () { exportJournal(rows.slice().reverse(), J.year); });
    el.querySelectorAll('[data-rcpt]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); openFile(a.getAttribute('data-rcpt')); }); });
    el.querySelectorAll('[data-attach]').forEach(function (inp) {
      inp.addEventListener('change', async function () {
        var e = S.entries.filter(function (x) { return x.id === int(inp.getAttribute('data-attach')); })[0];
        try { var path = await uploadFile(inp.files[0], e.entry_date.slice(0, 7)); var r = await sb.from('ledger_entries').update({ receipt_path: path }).eq('id', e.id); if (r.error) throw r.error; toast('添付しました'); refresh(); }
        catch (err) { toast('添付エラー: ' + (err.message || err)); }
      });
    });
    el.querySelectorAll('[data-jedit]').forEach(function (b) { b.addEventListener('click', function () { freeForm(S.entries.filter(function (x) { return x.id === int(b.getAttribute('data-jedit')); })[0]); }); });
    el.querySelectorAll('[data-jdel]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var e = S.entries.filter(function (x) { return x.id === int(b.getAttribute('data-jdel')); })[0];
        var group = e.group_id ? S.entries.filter(function (x) { return x.group_id === e.group_id; }) : [e];
        if (!confirm('この仕訳を削除しますか？' + (group.length > 1 ? '\n同じ取引の仕訳 ' + group.length + ' 件をまとめて削除します。' : '') + (e.plant_id && e.source === 'sale' ? '\n株は「在庫」に戻します。' : ''))) return;
        var r = await sb.from('ledger_entries').delete().in('id', group.map(function (x) { return x.id; }));
        if (r.error) { toast('削除エラー: ' + r.error.message); return; }
        if (e.plant_id && (e.source === 'sale' || e.source === 'csv')) {
          var p = plantOf(e.plant_id);
          await sb.from('plant_stock').update({ status: p && p.mother_on ? 'mother' : 'stock', status_date: p && p.mother_on ? p.mother_on : null, sold_on: null, sale_price: null, channel: null }).eq('id', e.plant_id);
        }
        toast('削除しました'); refresh();
      });
    });
  }

  /* ---------- 元帳 ---------- */
  var L = { account: '普通預金', year: null, channel: '' };
  function tabAccount(el) {
    if (L.year == null) L.year = S.year;
    var from = ystart(L.year), to = yend(L.year);
    var bsAcc = KIND[L.account] === 'asset' || KIND[L.account] === 'liability';
    var open = bsAcc ? movement(L.account, null, yend(L.year - 1), L.channel || null) : 0;
    var rows = S.entries.filter(function (e) { return e.entry_date >= from && e.entry_date <= to && (e.debit === L.account || e.credit === L.account) && (!L.channel || e.channel === L.channel); });
    var bal = open, nat = debitNatural(L.account);
    var html = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:var(--space-sm);">'
      + '<select class="form-input" id="l-acc" style="max-width:170px;">' + opts(ACCOUNTS, L.account) + '</select>'
      + '<select class="form-input" id="l-year" style="max-width:110px;">' + opts(yearOptions().map(function (y) { return [String(y), y + '年']; }), String(L.year)) + '</select>'
      + (L.account === '売掛金' ? '<select class="form-input" id="l-ch" style="max-width:180px;"><option value="">全販売先</option>' + opts(S.channels.map(function (c) { return [c.slug, c.label]; }), L.channel) + '</select>' : '')
      + '</div><div style="overflow-x:auto;"><table class="data-table" style="min-width:680px;"><thead><tr><th>日付</th><th>相手科目</th><th>摘要</th><th style="text-align:right;">借方</th><th style="text-align:right;">貸方</th><th style="text-align:right;">残高</th></tr></thead><tbody>'
      + (bsAcc ? '<tr><td></td><td></td><td>前年からの繰越</td><td></td><td></td><td style="text-align:right;">' + yen(open) + '</td></tr>' : '');
    rows.forEach(function (e) {
      var isD = e.debit === L.account;
      bal += (isD === nat ? 1 : -1) * e.amount;
      html += '<tr><td>' + esc(e.entry_date) + '</td><td>' + esc(isD ? e.credit : e.debit) + '</td><td style="font-size:var(--font-size-sm);">' + esc(e.description) + '</td><td style="text-align:right;">' + (isD ? yen(e.amount) : '') + '</td><td style="text-align:right;">' + (isD ? '' : yen(e.amount)) + '</td><td style="text-align:right;">' + yen(bal) + '</td></tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
    document.getElementById('l-acc').addEventListener('change', function (e) { L.account = e.target.value; L.channel = ''; tabAccount(el); });
    document.getElementById('l-year').addEventListener('change', function (e) { L.year = +e.target.value; tabAccount(el); });
    var lc = document.getElementById('l-ch'); if (lc) lc.addEventListener('change', function (e) { L.channel = e.target.value; tabAccount(el); });
  }

  /* ---------- 月別 ---------- */
  function tabMonthly(el) {
    var y = S.year;
    var html = '<div style="margin-bottom:var(--space-sm);"><select class="form-input" id="m-year" style="max-width:110px;">' + opts(yearOptions().map(function (v) { return [String(v), v + '年']; }), String(y)) + '</select></div>'
      + '<p style="font-size:var(--font-size-xs);color:var(--color-gray);">月別は仕訳の合計です（在庫の増減は年末の決算で反映します）。</p>'
      + '<div style="overflow-x:auto;"><table class="data-table" style="min-width:560px;"><thead><tr><th>月</th><th style="text-align:right;">売上</th><th style="text-align:right;">仕入</th><th style="text-align:right;">経費</th><th style="text-align:right;">差引</th></tr></thead><tbody>';
    var tot = [0, 0, 0];
    for (var m = 1; m <= 12; m++) {
      var mm = String(m).padStart(2, '0'), from = y + '-' + mm + '-01', to = y + '-' + mm + '-31';
      var s = movement('売上高', from, to) + movement('雑収入', from, to), b = movement('仕入高', from, to);
      var x = EXPENSES.reduce(function (acc, a) { return acc + movement(a, from, to); }, 0);
      tot[0] += s; tot[1] += b; tot[2] += x;
      html += '<tr><td>' + m + '月</td><td style="text-align:right;">' + yen(s) + '</td><td style="text-align:right;">' + yen(b) + '</td><td style="text-align:right;">' + yen(x) + '</td><td style="text-align:right;">' + yen(s - b - x) + '</td></tr>';
    }
    html += '<tr style="font-weight:700;"><td>合計</td><td style="text-align:right;">' + yen(tot[0]) + '</td><td style="text-align:right;">' + yen(tot[1]) + '</td><td style="text-align:right;">' + yen(tot[2]) + '</td><td style="text-align:right;">' + yen(tot[0] - tot[1] - tot[2]) + '</td></tr></tbody></table></div>';
    el.innerHTML = html;
    document.getElementById('m-year').addEventListener('change', function (e) { S.year = +e.target.value; tabMonthly(el); });
  }

  /* ---------- 決算 ---------- */
  function tabClosing(el) {
    var y = S.year, p = pl(y), b = bs(y);
    function row(l, v, strong) { return '<tr' + (strong ? ' style="font-weight:700;"' : '') + '><td>' + esc(l) + '</td><td style="text-align:right;">' + yen(v) + '</td></tr>'; }
    var deps = S.plants.filter(function (x) { return x.mother_on && (x.asset_method === 'straight' || x.asset_method === 'lump3'); });
    var html = '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:var(--space-md);"><select class="form-input" id="c-year" style="max-width:110px;">' + opts(yearOptions().map(function (v) { return [String(v), v + '年']; }), String(y)) + '</select>'
      + '<button type="button" class="btn btn-outline btn-sm" id="c-stock">棚卸表 CSV（' + y + '/12/31）</button><button type="button" class="btn btn-outline btn-sm" id="c-journal">仕訳帳 CSV（' + y + '年）</button></div>';
    if (deps.length) {
      html += '<h4 style="margin:0 0 var(--space-xs);">減価償却（親木）</h4><div style="overflow-x:auto;"><table class="data-table" style="min-width:560px;margin-bottom:var(--space-md);"><thead><tr><th>株</th><th>方法</th><th style="text-align:right;">取得価額</th><th style="text-align:right;">' + y + '年の償却</th><th></th></tr></thead><tbody>';
      deps.forEach(function (x) {
        var amt = depFor(x, y), done = depPosted(x, y);
        html += '<tr><td>' + esc(x.code + ' ' + x.name) + '</td><td style="font-size:var(--font-size-xs);">' + esc(x.asset_method === 'lump3' ? '一括償却 3年' : '定額法 ' + x.useful_years + '年') + '</td><td style="text-align:right;">' + yen(x.cost) + '</td><td style="text-align:right;">' + yen(amt) + '</td><td>' + (done ? '記帳済み' : amt ? '<button class="btn btn-primary btn-sm" data-dep="' + x.id + '">記帳する</button>' : '—') + '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '<div style="display:grid;gap:var(--space-lg);grid-template-columns:repeat(auto-fit,minmax(300px,1fr));">';
    html += '<div><h4 style="margin:0 0 var(--space-xs);">損益計算書（' + y + '年）</h4><table class="data-table">'
      + row('売上（収入）金額', p.sales, true)
      + row('期首商品棚卸高', p.open) + row('仕入金額', p.buy) + row('期末商品棚卸高', p.close) + row('差引原価', p.cogs, true)
      + row('差引金額（売上総利益）', p.gross, true)
      + Object.keys(p.exp).map(function (a) { return row(a, p.exp[a]); }).join('') + row('経費 計', p.expTotal, true)
      + (p.other ? row('雑収入', p.other) : '')
      + row('所得金額（青色申告特別控除の前）', p.income, true)
      + '</table><p style="font-size:var(--font-size-xs);color:var(--color-gray);">青色申告特別控除（65万円など）は確定申告書の作成時に差し引きます。数字は国税庁「確定申告書等作成コーナー」の青色申告決算書に書き写してください。</p></div>';
    html += '<div><h4 style="margin:0 0 var(--space-xs);">貸借対照表（' + y + '/12/31）</h4><table class="data-table">'
      + REAL_ASSETS.filter(function (a) { return b.assets[a]; }).map(function (a) { return row(a, b.assets[a]); }).join('')
      + row('商品（期末棚卸）', b.stock) + row('事業主貸', b.dr) + row('資産の部 計', b.left, true)
      + LIABILITIES.filter(function (a) { return b.liab[a]; }).map(function (a) { return row(a, b.liab[a]); }).join('')
      + row('元入金', b.capital) + row('事業主借', b.cr) + row('青色申告特別控除前の所得金額', b.income) + row('負債・資本の部 計', b.right, true)
      + '</table>' + (b.left === b.right ? '<p style="font-size:var(--font-size-xs);color:#2d5016;">左右の合計が一致しています。</p>' : '<p style="font-size:var(--font-size-xs);color:#a8712e;">左右の合計が ' + yen(b.left - b.right) + ' ずれています。仕訳を確認してください。</p>') + '</div>';
    html += '</div>';
    el.innerHTML = html;
    document.getElementById('c-year').addEventListener('change', function (e) { S.year = +e.target.value; tabClosing(el); });
    document.getElementById('c-stock').addEventListener('click', function () { exportStock(y); });
    document.getElementById('c-journal').addEventListener('click', function () { exportJournal(S.entries.filter(function (e) { return e.entry_date.slice(0, 4) === String(y); }), y); });
    el.querySelectorAll('[data-dep]').forEach(function (btn) { btn.addEventListener('click', async function () { try { await postDep(plantOf(int(btn.getAttribute('data-dep'))), y); toast('記帳しました'); refresh(); } catch (err) { toast('保存エラー: ' + (err.message || err)); } }); });
  }

  /* ---------- 設定 ---------- */
  function tabSettings(el) {
    var html = '<form id="ls" style="display:grid;gap:var(--space-sm);max-width:720px;">'
      + '<div class="adm-grid-2col-var">' + field('開業日', input('opened_on', openedOn(), 'type="date"'), '開業届に書いた日。開業前から持っていた株はこの日付で帳簿に載せます') + field('青色申告', '<select class="form-input" name="blue">' + opts([['true', '青色申告（30万円未満の少額特例を使う）'], ['false', '白色申告']], String(blue())) + '</select>') + '</div>'
      + '<h4 style="margin:var(--space-md) 0 0;">販売先・ASP の手数料</h4><p style="font-size:var(--font-size-xs);color:var(--color-gray);margin:0;">各サービスの最新の手数料に合わせてください。販売手数料は「商品代金 + 買い手が払った送料」に対して計算します。</p>'
      + '<div style="overflow-x:auto;"><table class="data-table" style="min-width:640px;"><thead><tr><th>販売先</th><th>手数料率（%）</th><th>1件ごと（円）</th><th>振込手数料（円）</th><th>メモ</th></tr></thead><tbody>'
      + S.channels.map(function (c) {
        return '<tr data-ch="' + esc(c.slug) + '"><td>' + esc(c.label) + '</td><td><input class="form-input" name="rate" value="' + (Number(c.fee_rate) * 100).toFixed(2).replace(/\.?0+$/, '') + '" inputmode="decimal" style="max-width:90px;"></td>'
          + '<td><input class="form-input" name="fixed" value="' + (c.fee_fixed || 0) + '" inputmode="numeric" style="max-width:80px;"></td><td><input class="form-input" name="payout" value="' + (c.payout_fee || 0) + '" inputmode="numeric" style="max-width:80px;"></td>'
          + '<td><input class="form-input" name="note" value="' + esc(c.note || '') + '"></td></tr>';
      }).join('') + '</tbody></table></div>'
      + '<div><button type="submit" class="btn btn-primary">保存</button></div></form>';
    el.innerHTML = html;
    document.getElementById('ls').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target;
      try {
        var r1 = await sb.from('ledger_settings').upsert([{ key: 'opened_on', value: f.opened_on.value || '' }, { key: 'blue_return', value: f.blue.value === 'true' }]);
        if (r1.error) throw r1.error;
        var trs = el.querySelectorAll('tr[data-ch]');
        for (var i = 0; i < trs.length; i++) {
          var tr = trs[i], rate = parseFloat(tr.querySelector('[name=rate]').value);
          var r = await sb.from('ledger_channels').update({ fee_rate: isNaN(rate) ? 0 : rate / 100, fee_fixed: int(tr.querySelector('[name=fixed]').value), payout_fee: int(tr.querySelector('[name=payout]').value), note: tr.querySelector('[name=note]').value.trim() || null }).eq('slug', tr.getAttribute('data-ch'));
          if (r.error) throw r.error;
        }
        toast('保存しました'); refresh();
      } catch (err) { toast('保存エラー: ' + (err.message || err)); }
    });
  }

  /* ---------- CSV ---------- */
  function csvCell(v) { v = v == null ? '' : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function download(name, rows) {
    var text = '\uFEFF' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function exportJournal(rows, y) {
    download('仕訳帳_' + (y || 'all') + '.csv', [['日付', '借方', '貸方', '金額', '摘要', '取引先', '販売先', '管理番号', 'メモ', '証憑']].concat(rows.map(function (e) {
      var p = e.plant_id ? plantOf(e.plant_id) : null;
      return [e.entry_date, e.debit, e.credit, e.amount, e.description, e.partner || '', chLabel(e.channel), p ? p.code : '', e.memo || '', e.receipt_path ? 'あり' : ''];
    })));
  }
  function exportStock(y) {
    var s = stockAt(yend(y));
    download('棚卸表_' + y + '-12-31.csv', [['管理番号', '品種名', '仕入れ日', '仕入れ値']].concat(s.list.map(function (p) { return [p.code, p.name, p.purchased_on, p.cost]; })).concat([['', '合計', '', s.value]]));
  }
  function exportPlants() {
    download('株台帳.csv', [['管理番号', '品種名', '仕入先', '入手日', '帳簿の仕入れ日', '仕入れ値', '状態', '状態の日付', '親木の用途', '償却方法', '販売日', '売値', '販売先', 'メモ']].concat(S.plants.map(function (p) {
      return [p.code, p.name, p.supplier || '', p.acquired_on || '', p.purchased_on, p.cost, STATUS[p.status], p.status_date || '', p.mother_purpose || '', p.asset_method ? METHOD[p.asset_method].split(':')[0] : '', p.sold_on || '', p.sale_price || '', chLabel(p.channel), p.notes || ''];
    })));
  }
  function parseCsv(text) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim(); }); });
  }
  async function readCsvFile(file) {
    var buf = await file.arrayBuffer();
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf).replace(/^\uFEFF/, ''); }
    catch (e) { return new TextDecoder('shift_jis').decode(buf); }
  }
  function normDate(v) {
    var m = String(v || '').match(/(\d{4})[\/\-年.](\d{1,2})[\/\-月.](\d{1,2})/);
    return m ? m[1] + '-' + m[2].padStart(2, '0') + '-' + m[3].padStart(2, '0') : '';
  }
  var MAP_FIELDS = [['order', '注文番号', true], ['date', '注文日・発送日', true], ['sku', '商品コード（管理番号）', false], ['price', '商品代金（小計）', true], ['ship', '送料（買い手が払った分）', false], ['fee', '手数料（列があれば）', false]];
  function csvImportForm() {
    var shops = S.channels.filter(function (c) { return ['base', 'stores', 'mercari_shops'].indexOf(c.slug) !== -1; });
    var html = '<h3 style="margin-bottom:var(--space-md);">注文 CSV を取り込む</h3><div style="display:grid;gap:var(--space-sm);">'
      + '<p style="font-size:var(--font-size-sm);margin:0;">ショップの管理画面で書き出した注文 CSV を読み込みます。各株の管理番号をショップの「商品コード（SKU）」にしておくと、売れた株を自動で「販売済み」にします。同じ注文は2回取り込まれません。</p>'
      + '<div class="adm-grid-2col-var">' + field('販売先', '<select class="form-input" id="ci-ch">' + opts(shops.map(function (c) { return [c.slug, c.label]; }), recall('csv_ch', 'base')) + '</select>') + field('CSV ファイル', '<input type="file" id="ci-file" accept=".csv,text/csv" class="form-input">') + '</div>'
      + '<div id="ci-map"></div><div id="ci-preview"></div></div>';
    showModal(html);
    var parsed = null;
    async function onFile() {
      var file = document.getElementById('ci-file').files[0];
      if (!file) return;
      parsed = parseCsv(await readCsvFile(file));
      if (parsed.length < 2) { toast('CSV に行がありません'); return; }
      renderMap();
    }
    function savedMap(ch) { var m = S.settings['csv_map_' + ch]; return m && typeof m === 'object' ? m : {}; }
    function guess(head, key) {
      var pats = { order: /注文(番号|ID)|order/i, date: /(注文|発送|購入)日|日時|date/i, sku: /商品コード|SKU|品番|型番/i, price: /小計|商品(代金|金額|価格)|単価|price/i, ship: /送料/, fee: /手数料/ };
      for (var i = 0; i < head.length; i++) if (pats[key].test(head[i])) return String(i);
      return '';
    }
    function renderMap() {
      var ch = document.getElementById('ci-ch').value, head = parsed[0], saved = savedMap(ch);
      var colOpts = [['', '（使わない）']].concat(head.map(function (h, i) { return [String(i), (i + 1) + ': ' + h]; }));
      document.getElementById('ci-map').innerHTML = '<h4 style="margin:var(--space-sm) 0 0;">列の対応（次回も同じ対応を使います）</h4><div class="adm-grid-2col-var">'
        + MAP_FIELDS.map(function (m) {
          var v = saved[m[0]] != null && saved[m[0]] !== '' && +saved[m[0]] < head.length ? String(saved[m[0]]) : guess(head, m[0]);
          return field(m[1] + (m[2] ? ' *' : ''), '<select class="form-input" data-map="' + m[0] + '">' + opts(colOpts, v) + '</select>');
        }).join('') + '</div><button type="button" class="btn btn-outline btn-sm" id="ci-go" style="margin-top:var(--space-sm);">この対応で確認する</button>';
      document.getElementById('ci-go').addEventListener('click', preview);
    }
    function mapping() { var m = {}; document.querySelectorAll('[data-map]').forEach(function (s) { m[s.getAttribute('data-map')] = s.value; }); return m; }
    function preview() {
      var m = mapping(), ch = document.getElementById('ci-ch').value, chan = channelOf(ch);
      if (m.order === '' || m.date === '' || m.price === '') { toast('* の列を選んでください'); return; }
      var seen = {}, items = [];
      parsed.slice(1).forEach(function (r) {
        var order = String(r[+m.order] || '').trim(); if (!order) return;
        var sku = m.sku !== '' ? String(r[+m.sku] || '').trim() : '';
        var key = order + '|' + sku;
        if (seen[key]) return; seen[key] = 1;
        var price = int(r[+m.price]), ship = m.ship !== '' ? int(r[+m.ship]) : 0;
        var plant = sku ? S.plants.filter(function (p) { return p.code === sku; })[0] : null;
        var ref = order + (sku ? ':' + sku : '');
        var dup = S.entries.some(function (e) { return e.source === 'csv' && e.source_ref === ref; });
        var fee = m.fee !== '' && String(r[+m.fee] || '').trim() !== '' ? int(r[+m.fee]) : feeFor(chan, price + ship);
        items.push({ order: order, ref: ref, date: normDate(r[+m.date]), sku: sku, price: price, ship: ship, fee: fee, plant: plant, dup: dup });
      });
      var ok = items.filter(function (x) { return !x.dup && x.date && x.price > 0; });
      var html = '<h4 style="margin:var(--space-sm) 0 0;">取り込む内容（' + ok.length + ' 件 / 全 ' + items.length + ' 件）</h4><div style="overflow-x:auto;max-height:320px;"><table class="data-table" style="min-width:640px;"><thead><tr><th>注文</th><th>日付</th><th>株</th><th style="text-align:right;">代金</th><th style="text-align:right;">送料</th><th style="text-align:right;">手数料</th><th></th></tr></thead><tbody>'
        + items.map(function (x) {
          var note = x.dup ? '取り込み済み' : !x.date ? '日付が読めません' : x.price <= 0 ? '金額が0' : !x.plant ? (x.sku ? '台帳に ' + x.sku + ' がありません（売上だけ記帳）' : '株の指定なし（売上だけ記帳）') : x.plant.status === 'sold' ? 'この株はすでに販売済み' : '';
          return '<tr style="' + (x.dup || !x.date || x.price <= 0 ? 'opacity:0.5;' : '') + '"><td>' + esc(x.order) + '</td><td>' + esc(x.date) + '</td><td>' + esc(x.plant ? x.plant.code + ' ' + x.plant.name : x.sku || '—') + '</td><td style="text-align:right;">' + yen(x.price) + '</td><td style="text-align:right;">' + yen(x.ship) + '</td><td style="text-align:right;">' + yen(x.fee) + '</td><td style="font-size:var(--font-size-xs);color:#a8712e;">' + esc(note) + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        + '<div style="display:flex;gap:var(--space-sm);justify-content:flex-end;margin-top:var(--space-sm);"><button type="button" class="btn btn-outline" onclick="closeModal()">キャンセル</button><button type="button" class="btn btn-primary" id="ci-import"' + (ok.length ? '' : ' disabled') + '>' + ok.length + ' 件を記帳する</button></div>';
      document.getElementById('ci-preview').innerHTML = html;
      var btn = document.getElementById('ci-import');
      if (btn) btn.addEventListener('click', async function () {
        btn.disabled = true;
        try {
          await sb.from('ledger_settings').upsert({ key: 'csv_map_' + ch, value: m });
          remember('csv_ch', ch);
          var n = 0;
          for (var i = 0; i < ok.length; i++) {
            var x = ok[i];
            await recordSale({ plant: x.plant && x.plant.status !== 'sold' ? x.plant : null, channel: ch, date: x.date, price: x.price, shipIn: x.ship, fee: x.fee, shipOut: 0, order: x.ref, partner: chLabel(ch), source: 'csv' });
            n++;
            if (x.plant) await load();
          }
          toast(n + ' 件を記帳しました'); closeModal(); refresh();
        } catch (err) { btn.disabled = false; toast('保存エラー: ' + (err.message || err)); }
      });
    }
    document.getElementById('ci-file').addEventListener('change', onFile);
    document.getElementById('ci-ch').addEventListener('change', function () { if (parsed) renderMap(); });
  }

  // exposed for the self-test in the console
  window._ledger = { S: S, pl: pl, bs: bs, stockAt: stockAt, depFor: depFor, movement: movement };
})();
