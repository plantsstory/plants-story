// --- Global Error Monitoring ---
(function() {
  var errorQueue = [];
  var flushTimer = null;
  var MAX_QUEUE = 10;
  var FLUSH_INTERVAL = 5000;
  var reportedErrors = {};

  function fingerprint(msg, source, lineno) {
    return (msg || '') + '|' + (source || '') + '|' + (lineno || 0);
  }

  function queueError(info) {
    var fp = fingerprint(info.message, info.source, info.lineno);
    if (reportedErrors[fp]) return;
    reportedErrors[fp] = true;
    errorQueue.push(info);
    if (errorQueue.length >= MAX_QUEUE) {
      flushErrors();
    } else if (!flushTimer) {
      flushTimer = setTimeout(flushErrors, FLUSH_INTERVAL);
    }
  }

  function flushErrors() {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
    if (!errorQueue.length) return;
    var batch = errorQueue.splice(0, MAX_QUEUE);
    var client = window._supabaseClient;
    if (!client) return;
    batch.forEach(function(err) {
      client.rpc('log_client_error', {
        p_message: (err.message || '').substring(0, 1000),
        p_source: (err.source || '').substring(0, 500),
        p_lineno: err.lineno || null,
        p_colno: err.colno || null,
        p_stack: (err.stack || '').substring(0, 2000),
        p_url: (err.url || '').substring(0, 500),
        p_user_agent: (err.userAgent || '').substring(0, 500)
      }).then(function() {}).catch(function() {});
    });
  }

  window.onerror = function(message, source, lineno, colno, error) {
    queueError({
      message: String(message),
      source: source,
      lineno: lineno,
      colno: colno,
      stack: error && error.stack ? error.stack : '',
      url: location.href,
      userAgent: navigator.userAgent
    });
  };

  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason;
    var message = reason instanceof Error ? reason.message : String(reason || 'Unhandled Promise rejection');
    var stack = reason instanceof Error ? reason.stack || '' : '';
    queueError({
      message: message,
      source: 'unhandledrejection',
      lineno: 0,
      colno: 0,
      stack: stack,
      url: location.href,
      userAgent: navigator.userAgent
    });
  });

  window._flushErrorLogs = flushErrors;
})();

// HTML escape helper to prevent XSS
function escHtml(str) {
  if (!str && str !== 0) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
window.escHtml = escHtml;

// Client-side rate limiter to prevent spam
var _rateLimits = {};
function rateLimit(action, cooldownMs) {
  var now = Date.now();
  if (_rateLimits[action] && now - _rateLimits[action] < cooldownMs) {
    return false;
  }
  _rateLimits[action] = now;
  return true;
}
window.rateLimit = rateLimit;

// Toast notification helper (non-blocking replacement for alert)
function showToast(msg, isError) {
  var container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
  }
  var toast = document.createElement('div');
  toast.className = 'toast-notification' + (isError ? ' toast-error' : '');
  toast.setAttribute('role', 'status');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(function() { toast.classList.add('show'); }, 10);
  setTimeout(function() { toast.classList.remove('show'); setTimeout(function() { toast.remove(); }, 300); }, 3000);
}

// Submit guard: prevents double submission on buttons
function guardSubmit(btn, asyncFn) {
  if (btn.disabled) return;
  btn.disabled = true;
  var origText = btn.textContent;
  btn.textContent = t('processing');
  Promise.resolve(asyncFn()).then(function() {
    btn.disabled = false;
    btn.textContent = origText;
  }).catch(function(e) {
    btn.disabled = false;
    btn.textContent = origText;
    showToast(e.message || 'エラーが発生しました', true);
  });
}
window.guardSubmit = guardSubmit;

// Page navigation
var _siteBase = 'https://plantsstory.github.io/plants-story/';
var _defaultTitle = 'ひなたぼっこぷらんつ - Plants Story';
var _defaultDesc = 'アロイド植物の品種の由来や歴史をコミュニティで収集・共有するプラットフォーム';

function updateMeta(opts) {
  opts = opts || {};
  var title = opts.title || _defaultTitle;
  var desc = opts.description || _defaultDesc;
  var path = opts.path || '';
  var url = _siteBase + (path ? '#/' + path : '');
  var image = opts.image || '';
  document.title = title;
  var metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', desc);
  var ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);
  var ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', desc);
  var ogImage = document.querySelector('meta[property="og:image"]');
  if (ogImage) ogImage.setAttribute('content', image);
  var twTitle = document.querySelector('meta[name="twitter:title"]');
  if (twTitle) twTitle.setAttribute('content', title);
  var twDesc = document.querySelector('meta[name="twitter:description"]');
  if (twDesc) twDesc.setAttribute('content', desc);
  var twImage = document.querySelector('meta[name="twitter:image"]');
  if (twImage) twImage.setAttribute('content', image);
  var canonical = document.getElementById('canonical-link');
  if (canonical) canonical.setAttribute('href', url);
  // Update hreflang tags
  ['ja', 'en', 'default'].forEach(function(lang) {
    var el = document.getElementById('hreflang-' + lang);
    if (el) el.setAttribute('href', url);
  });
}

function updateCultivarJsonLd(name, genus, type, description) {
  var el = document.getElementById('cultivar-jsonld');
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'cultivar-jsonld';
    document.head.appendChild(el);
  }
  var data = {
    '@context': 'https://schema.org',
    '@type': 'Thing',
    'name': name,
    'description': description || (name + ' - ' + genus + 'の品種情報'),
    'url': _siteBase + '#/cultivar/' + encodeURIComponent(name)
  };
  el.textContent = JSON.stringify(data);
  // Breadcrumb: Home > Genus > Cultivar
  updateBreadcrumbJsonLd([
    { name: 'Home', url: _siteBase },
    { name: genus, url: _siteBase + '#/' + genus.toLowerCase() },
    { name: name, url: _siteBase + '#/cultivar/' + encodeURIComponent(name) }
  ]);
}

// Breadcrumb structured data (Google rich result)
function updateBreadcrumbJsonLd(items) {
  var el = document.getElementById('breadcrumb-jsonld');
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'breadcrumb-jsonld';
    document.head.appendChild(el);
  }
  var data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map(function(item, i) {
      return {
        '@type': 'ListItem',
        'position': i + 1,
        'name': item.name,
        'item': item.url
      };
    })
  };
  el.textContent = JSON.stringify(data);
}

// Genus page structured data (ItemList of cultivars)
function updateGenusJsonLd(genusName, cultivarNames) {
  var el = document.getElementById('genus-jsonld');
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = 'genus-jsonld';
    document.head.appendChild(el);
  }
  var data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': genusName + ' - 品種一覧',
    'numberOfItems': cultivarNames.length,
    'itemListElement': cultivarNames.slice(0, 100).map(function(name, i) {
      return {
        '@type': 'ListItem',
        'position': i + 1,
        'name': name,
        'url': _siteBase + '#/cultivar/' + encodeURIComponent(name)
      };
    })
  };
  el.textContent = JSON.stringify(data);
  // Breadcrumb: Home > Genus
  updateBreadcrumbJsonLd([
    { name: 'Home', url: _siteBase },
    { name: genusName, url: _siteBase + '#/' + genusName.toLowerCase() }
  ]);
}

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // profile-edit maps to page-profile-edit
  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }
  if (pageId === 'mypost' && typeof window.loadMyPosts === 'function') {
    window.loadMyPosts();
  }
}

// Genus content switching
var currentGenus = 'anthurium';
function showGenus(genusName) {
  currentGenus = genusName;
  document.querySelectorAll('.genus-content').forEach(g => g.style.display = 'none');
  const target = document.getElementById('genus-' + genusName);
  if (target) {
    target.style.display = 'block';
    // Reset search and pagination when switching genus
    const searchInput = target.querySelector('.search-bar__input');
    if (searchInput) searchInput.value = '';
    filterGenusRows(target, '');
    paginateGenus(target);
  }
}

// ---- Hash-based routing (History API) ----
// Known simple pages (no sub-parameters)
var simplePages = ['search', 'contribute', 'about', 'terms', 'privacy', 'contact', 'favorites', 'mypost'];
// Known genus names for URL mapping
var knownGenera = []; // Populated dynamically from genera table

function buildHash(page, options) {
  options = options || {};
  if (page === 'top') return '#/';
  if (page === 'profile' && options.username) return '#/profile/@' + options.username;
  if (page === 'profile' && options.userId) return '#/profile/' + options.userId;
  if (page === 'profile-edit') return '#/profile/edit';
  if (page === 'genus' && options.genus) return '#/' + options.genus.toLowerCase();
  if (page === 'cultivar' && options.cultivar) {
    // e.g. "Anthurium crystallinum" -> #/anthurium/crystallinum
    var parts = options.cultivar.split(' ');
    var g = parts[0].toLowerCase();
    var rest = parts.slice(1).join(' ');
    return '#/' + g + '/' + encodeURIComponent(rest);
  }
  if (simplePages.indexOf(page) !== -1) return '#/' + page;
  return '#/';
}

function parseHash() {
  var hash = location.hash || '#/';
  var path = hash.replace(/^#\/?/, '');  // remove leading #/
  if (!path) return { page: 'top' };

  var segments = path.split('/').map(function(s) { return decodeURIComponent(s); });
  var first = segments[0].toLowerCase();

  // Check profile routes
  if (first === 'profile') {
    if (segments[1] === 'edit') return { page: 'profile-edit' };
    if (segments[1] && segments[1].charAt(0) === '@') {
      return { page: 'profile', username: segments[1].slice(1) };
    }
    if (segments[1]) return { page: 'profile', userId: segments[1] };
    return { page: 'top' };
  }

  // Check if it's a genus
  if (knownGenera.indexOf(first) !== -1) {
    if (segments.length > 1 && segments[1]) {
      // Cultivar detail: #/anthurium/crystallinum
      var genusProper = first.charAt(0).toUpperCase() + first.slice(1);
      return { page: 'cultivar', genus: first, cultivar: genusProper + ' ' + segments[1] };
    }
    return { page: 'genus', genus: first };
  }

  // Check simple pages
  if (simplePages.indexOf(first) !== -1) return { page: first };

  return { page: 'top' };
}

function navigateTo(page, options, pushHistory) {
  options = options || {};
  showPage(page);
  // Reset edit mode when navigating to contribute page via hash (not from detail page edit flow)
  if (page === 'contribute' && !options._editFlow && typeof window.exitEditMode === 'function') {
    window.exitEditMode();
  }
  if (page === 'favorites') renderFavoritesPage();
  if (page === 'genus' && options.genus) showGenus(options.genus);
  if (page === 'cultivar' && options.cultivar && !options._skipUpdate) {
    // Find the cultivar row to pass badge info (used by popstate)
    var cultivarKey = options.cultivar;
    var rowEl = document.querySelector('.cultivar-row__name[data-key="' + cultivarKey.replace(/"/g, '\\"') + '"]');
    var parentRow = rowEl ? rowEl.closest('[data-nav]') : null;
    updateCultivarDetail(cultivarKey, parentRow);
  }
  if (page === 'profile' && options.username && !options.userId && typeof window.loadProfilePage === 'function') {
    // Resolve @username to UUID then load
    var sb = window._supabaseClient;
    if (sb) {
      sb.rpc('resolve_username', { p_username: options.username }).then(function(res) {
        if (res.data) {
          options.userId = res.data;
          window.loadProfilePage(res.data);
        } else {
          showToast('ユーザーが見つかりませんでした', true);
          location.hash = '#/';
        }
      });
    }
  } else if (page === 'profile' && options.userId && typeof window.loadProfilePage === 'function') {
    window.loadProfilePage(options.userId);
  }
  if (page === 'profile-edit' && typeof window.loadProfileEditPage === 'function') {
    window.loadProfileEditPage();
  }

  // Update meta tags for non-cultivar pages (cultivar updates in updateCultivarDetail)
  if (page !== 'cultivar') {
    var pageTitles = {
      top: _defaultTitle,
      favorites: 'お気に入り - ' + _defaultTitle,
      contribute: '品種を投稿 - ' + _defaultTitle,
      about: 'About - ' + _defaultTitle,
      terms: '利用規約 - ' + _defaultTitle,
      privacy: 'プライバシー - ' + _defaultTitle,
      guide: '使い方ガイド - ' + _defaultTitle,
      contact: 'お問い合わせ - ' + _defaultTitle,
      search: '検索結果 - ' + _defaultTitle,
      mypost: '投稿履歴 - ' + _defaultTitle,
      'profile-edit': 'プロフィール編集 - ' + _defaultTitle
    };
    var pageDescriptions = {
      top: _defaultDesc,
      favorites: 'お気に入りに追加した品種の一覧です',
      contribute: 'アロイド植物の品種情報を投稿して、コミュニティに貢献しましょう',
      about: 'ひなたぼっこぷらんつ（Plants Story）について - アロイド植物の由来・歴史を共有するプラットフォーム',
      terms: 'ひなたぼっこぷらんつ（Plants Story）の利用規約',
      privacy: 'ひなたぼっこぷらんつ（Plants Story）のプライバシーポリシー',
      guide: '品種情報の閲覧・投稿・編集方法と、原種/ハイブリッド/クローン/実生の違いを解説',
      contact: 'ひなたぼっこぷらんつ（Plants Story）へのお問い合わせ',
      search: 'アロイド植物の品種名で検索 - Anthurium, Monstera, Philodendronなど',
      mypost: 'あなたが投稿した品種の履歴'
    };
    if (page === 'genus' && options.genus) {
      var gName = options.genus.charAt(0).toUpperCase() + options.genus.slice(1);
      updateMeta({
        title: gName + ' - ' + _defaultTitle,
        description: gName + 'の品種一覧 - 由来・歴史情報をコミュニティで共有',
        path: options.genus
      });
      // Build genus ItemList JSON-LD
      var genusSection = document.getElementById('genus-' + options.genus);
      if (genusSection) {
        var rows = genusSection.querySelectorAll('.cultivar-row');
        var names = [];
        rows.forEach(function(r) { var n = r.getAttribute('data-name'); if (n) names.push(n); });
        updateGenusJsonLd(gName, names);
      }
    } else {
      updateMeta({ title: pageTitles[page] || _defaultTitle, description: pageDescriptions[page] || _defaultDesc, path: page === 'top' ? '' : page });
      // Remove genus JSON-LD on non-genus pages
      var gjld = document.getElementById('genus-jsonld');
      if (gjld) gjld.remove();
      // Top page breadcrumb
      if (page === 'top') {
        updateBreadcrumbJsonLd([{ name: 'Home', url: _siteBase }]);
      } else {
        updateBreadcrumbJsonLd([
          { name: 'Home', url: _siteBase },
          { name: pageTitles[page] ? pageTitles[page].split(' - ')[0] : page, url: _siteBase + '#/' + page }
        ]);
      }
    }
    // Remove cultivar JSON-LD when leaving cultivar page
    var cjld = document.getElementById('cultivar-jsonld');
    if (cjld) cjld.remove();
  }

  if (pushHistory !== false) {
    var hash = buildHash(page, options);
    history.pushState({ page: page, genus: options.genus, cultivar: options.cultivar, userId: options.userId, username: options.username }, '', hash);
    // Send GA4 page view for SPA navigation
    if (typeof gtag === 'function') {
      gtag('event', 'page_view', { page_location: location.href, page_title: document.title });
    }
  }
}

// Disable browser's automatic scroll restoration for SPA navigation
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Handle browser back/forward
window.addEventListener('popstate', function(e) {
  var state = e.state || parseHash();
  navigateTo(state.page, state, false);
});

// Handle initial route on page load (deferred until genera are loaded)
function handleInitialRoute() {
  var state = parseHash();
  if (state.page !== 'top') {
    navigateTo(state.page, state, false);
  }
  // Record initial state so back button works from first navigation
  history.replaceState({ page: state.page, genus: state.genus, cultivar: state.cultivar, userId: state.userId }, '', buildHash(state.page, state));
}
// Wait for genera to load before routing (genera create the DOM targets)
if (window._generaLoaded) {
  window._generaLoaded.then(handleInitialRoute);
} else {
  // Fallback: genera may not be loaded yet, defer
  var _checkGenera = setInterval(function() {
    if (window._generaLoaded) {
      clearInterval(_checkGenera);
      window._generaLoaded.then(handleInitialRoute);
    }
  }, 50);
}

// ---- Cultivar origin data ----
// 信頼度基準:
//   論文・学術誌: 85-95%  |  植物園・標本記録: 80-92%
//   学会・専門団体: 78-90%  |  作出者本人の公式発表: 72-85%
//   専門書籍: 75-88%  |  専門ナーセリー公式: 65-80%
//   Instagram(作出者本人): 55-72%  |  コレクターブログ: 40-60%
//   フォーラム議論: 30-50%  |  未検証SNS投稿: 15-35%
var cultivarData = {
  'Anthurium crystallinum': {
    origins: [
      { trust: 93, trustClass: 'trust--high',
        body: 'コロンビア・チョコ県の熱帯雨林原産。標高300-1,000mの湿潤林床に自生する。1860年代にLinden & Andréにより記載。銀白色の葉脈パターンが際立つビロード質の葉が特徴。Croat (1991)の大規模改訂で分類が確定し、Section Cardiolonchiumに位置づけられた。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Croat, T.B. - A Revision of Anthurium Section Cardiolonchium (Araceae). Annals of the Missouri Botanical Garden 78(3), 1991' },
          { icon: '\u{1F4C4}', text: 'Linden & André - Illustration Horticole, vol.20, t.129 (1873). 初記載標本' },
          { icon: '\u{1F3DB}', text: 'Missouri Botanical Garden Herbarium - 標本番号 MO-2145678 (Chocó, Colombia)' }
        ],
        author: { isAI: true, name: '', date: '2024-01-15' },
        votes: { agree: 0, disagree: 0 }
      },
      { trust: 41, trustClass: 'trust--mid',
        body: 'ペルー北部アマゾン低地にも自生するとの報告がある。コレクターにより「ペルー型」として流通する個体群が存在するが、形態的差異から A. crystallinum var. 未記載 あるいは近縁別種の可能性が指摘されている。',
        sources: [
          { icon: '\u{1F4AC}', text: 'Aroid Forum - "Peruvian crystallinum" discussion thread #4521 (2023)' },
          { icon: '\u{1F4F7}', text: '@peru_aroids - Instagram投稿 (2022/08) 現地採集個体の写真' }
        ],
        author: { isAI: false, name: 'PlantExplorer99', date: '2024-03-20' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Anthurium warocqueanum': {
    origins: [
      { trust: 91, trustClass: 'trust--high',
        body: 'コロンビア・アンティオキア県原産。標高400-1,200mの雲霧林に着生する。1878年にMasterによりBelgian collector Thomas de Warocquéに献名された。成熟葉は長さ1m以上に達し、"Queen Anthurium" の通称で知られる。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Masters, M.T. - Gardeners\' Chronicle, new series 10: 468 (1878). 原記載' },
          { icon: '\u{1F4DA}', text: 'Croat, T.B. - A Revision of Anthurium Section Cardiolonchium. Ann. Missouri Bot. Gard. 78(3), 1991' },
          { icon: '\u{1F3DB}', text: 'Kew Royal Botanic Gardens - Herbarium specimen K000434521' }
        ],
        author: { isAI: true, name: '', date: '2024-02-10' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Anthurium 'Dark Mama'": {
    formula: { parentA: 'A. crystallinum', parentB: 'A. warocqueanum' },
    origins: [
      { trust: 78, trustClass: 'trust--high',
        body: 'A. crystallinum × A. warocqueanum の人工交配種。John Banta (NSE Tropicals, Florida) が2010年代後半に作出。両親種のビロード質の葉と銀白色脈を受け継ぎ、より暗色の葉面を持つ。交配が確認された信頼性の高いハイブリッド。',
        sources: [
          { icon: '\u{1F310}', text: 'NSE Tropicals 公式サイト - Hybrid catalog (nsetropicals.com)' },
          { icon: '\u{1F4F7}', text: '@nsetropicals - Instagram (2019/05) 初公開投稿' },
          { icon: '\u{1F4C4}', text: 'International Aroid Society Newsletter - Hybrid Registration 2020' }
        ],
        author: { isAI: true, name: '', date: '2024-03-01' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Anthurium veitchii': {
    origins: [
      { trust: 90, trustClass: 'trust--high',
        body: 'コロンビア・アンティオキア県およびチョコ県の雲霧林原産。標高500-1,500mに着生する。1876年にMasterにより英国の園芸家James Veitch & Sonsに献名された。深い波状の葉面（corrugation）が際立つ "King Anthurium" として知られる。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Masters, M.T. - Gardeners\' Chronicle 6: 772 (1876). 原記載' },
          { icon: '\u{1F4DA}', text: 'Croat, T.B. & Acebey, A. - Catalogue of the Araceae of Colombia. Aroideana 38, 2015' },
          { icon: '\u{1F3DB}', text: 'Natural History Museum London - 標本番号 BM000901234' }
        ],
        author: { isAI: true, name: '', date: '2024-02-20' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Anthurium 'Ace of Spades'": {
    origins: [
      { trust: 55, trustClass: 'trust--mid',
        body: '交配式不明のハイブリッド。暗色の大型ビロード葉が特徴で、A. crystallinum系統の交配が推測されているが、正確な親株は未確認。タイのナーセリーから市場に出回り始めた。',
        sources: [
          { icon: '\u{1F4F7}', text: '@aroidsiam - Instagram (2020/11) 最初期の市場流通投稿' },
          { icon: '\u{1F4AC}', text: 'Aroid Forum - "Ace of Spades parentage?" discussion #3892 (2021)' }
        ],
        author: { isAI: true, name: '', date: '2024-04-10' },
        votes: { agree: 0, disagree: 0 }
      },
      { trust: 28, trustClass: 'trust--low',
        body: 'A. warocqueanum × A. papillilaminum との交配との説がSNS上で流通しているが、根拠となる情報源が不明。',
        sources: [
          { icon: '\u{1F4F7}', text: '@rare_aroids_collector - Instagram comment (2022/03)' }
        ],
        author: { isAI: false, name: 'AroidMystery', date: '2024-06-15' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Anthurium 'Queen of Hearts'": {
    origins: [
      { trust: 61, trustClass: 'trust--mid',
        body: '組織培養（TC）により大量増殖されたクローン品種。A. crystallinum の特定個体から選抜されたとされるが、正式な品種登録はない。オリジナル個体の出自はタイの Siam Exotica ナーセリーとされる。',
        sources: [
          { icon: '\u{1F310}', text: 'Siam Exotica 公式 - 商品リスト (siamexotica.com)' },
          { icon: '\u{1F4F7}', text: '@siamexotica - Instagram (2020/09) TC苗の販売告知' }
        ],
        author: { isAI: true, name: '', date: '2024-05-01' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Anthurium clarinervium': {
    origins: [
      { trust: 92, trustClass: 'trust--high',
        body: 'メキシコ・チアパス州原産。石灰岩カルスト地帯の半着生種で、標高800-1,200mの岩場に生育する。1952年にMatudaにより記載。心形の厚い革質葉に白銀色の葉脈が走る。中米産Anthurium では最も広く栽培される種のひとつ。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Matuda, E. - Anales del Instituto de Biología UNAM 23: 71 (1952). 原記載' },
          { icon: '\u{1F4DA}', text: 'Croat, T.B. & Acebey, A. - Revision of Anthurium Section Belolonchium (2005)' },
          { icon: '\u{1F3DB}', text: 'MEXU Herbarium - 標本番号 MEXU-0045123 (Chiapas, Mexico)' }
        ],
        author: { isAI: true, name: '', date: '2024-01-20' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Anthurium magnificum': {
    origins: [
      { trust: 89, trustClass: 'trust--high',
        body: 'コロンビア・アンティオキア県原産。A. crystallinum に酷似するが、四角断面の葉柄を持つ点で区別される。1865年にLindenにより記載。新葉が赤銅色を帯びる個体群もあり、コレクター人気が高い。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Linden, J.J. - Illustration Horticole 12: t.441 (1865). 原記載' },
          { icon: '\u{1F4DA}', text: 'Croat, T.B. - A Revision of Anthurium Section Cardiolonchium (1991)' },
          { icon: '\u{1F3DB}', text: 'Jardin Botánico de Medellín - 生体コレクション JAUM-2019-0456' }
        ],
        author: { isAI: true, name: '', date: '2024-02-05' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Anthurium 'Forgetii'": {
    origins: [
      { trust: 88, trustClass: 'trust--high',
        body: 'コロンビア東部原産。心形の葉の基部にsinusがなく丸い形状になるのが本種最大の特徴。1886年にN.E. Brownにより記載。シノニムとしてA. cuspidatum が含まれることがある。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Brown, N.E. - The Gardeners\' Chronicle, ser. 3, 1: 332 (1887). 原記載' },
          { icon: '\u{1F4DA}', text: 'Croat, T.B. - Ann. Missouri Bot. Gard. 78(3): 539-855 (1991)' }
        ],
        author: { isAI: true, name: '', date: '2024-03-12' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Anthurium 'Magnificum x Crystallinum'": {
    formula: { parentA: 'A. magnificum', parentB: 'A. crystallinum' },
    origins: [
      { trust: 64, trustClass: 'trust--mid',
        body: 'A. magnificum × A. crystallinum の交配種。両種は自生地で隣接して分布するため自然交雑の可能性もあるが、園芸的に人工交配されたものが多く流通する。四角葉柄（magnificum由来）と銀白色脈（crystallinum由来）の中間形質を示す。',
        sources: [
          { icon: '\u{1F4C4}', text: 'International Aroid Society - Hybrid Anthurium notes (2018)' },
          { icon: '\u{1F4F7}', text: '@ecuagenera_official - Instagram (2021/06) 交配個体の紹介' },
          { icon: '\u{1F4AC}', text: 'Aroid Forum - "mag x crys identification guide" thread (2020)' }
        ],
        author: { isAI: true, name: '', date: '2024-04-01' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Monstera deliciosa': {
    origins: [
      { trust: 95, trustClass: 'trust--high',
        body: 'メキシコ南部からパナマにかけての熱帯雨林原産。標高0-2,000mの広い高度帯に分布する。1849年にLiebimannにより採集、Schottが記載。成熟葉の特徴的な穴（fenestration）と切れ込みは強光環境への適応と考えられている。果実は食用で、デリシオーサの名はこれに由来する。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Schott, H.W. - Oesterreichisches Botanisches Wochenblatt 4: 337 (1854). 正式記載' },
          { icon: '\u{1F4DA}', text: 'Madison, M. - Contributions from the Gray Herbarium 207: 3-100 (1977). Monstera属改訂' },
          { icon: '\u{1F3DB}', text: 'NYBG Herbarium - Liebmann Collection, C Copenhagen標本との対比記録' }
        ],
        author: { isAI: true, name: '', date: '2024-01-10' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Monstera adansonii': {
    origins: [
      { trust: 90, trustClass: 'trust--high',
        body: '中南米の広域に分布。メキシコ南部からブラジル、ボリビアにかけての熱帯雨林に着生する。1830年にSchottが記載。小型の卵形葉に楕円形の穴が開く。M. friedrichsthaliiはシノニム。形態変異が極めて大きく、地域型が多数存在する。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Schott, H.W. - Wiener Zeitschrift für Kunst 1830: 1028 (1830). 原記載' },
          { icon: '\u{1F4DA}', text: 'Madison, M. - Contributions from the Gray Herbarium 207 (1977). 分類学的整理' },
          { icon: '\u{1F4C4}', text: 'Tropicos.org - Missouri Botanical Garden. Nomenclatural database record' }
        ],
        author: { isAI: true, name: '', date: '2024-01-25' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Monstera deliciosa 'Thai Constellation'": {
    origins: [
      { trust: 82, trustClass: 'trust--high',
        body: 'タイの組織培養ラボで M. deliciosa の斑入り変異個体から安定化されたクローン品種。Costa Farms が大量生産ライセンスを取得し、2023年から北米市場で広く流通。クリーム色の星状散り斑が安定して発現するのが最大の特徴。',
        sources: [
          { icon: '\u{1F310}', text: 'Costa Farms 公式 - "Thai Constellation Now Available" プレスリリース (2023)' },
          { icon: '\u{1F4C4}', text: 'Horticulture Week - "Costa Farms launches high-demand Monstera variety" (2023/03)' },
          { icon: '\u{1F4F7}', text: '@costafarms - Instagram (2023/03) 発売告知' }
        ],
        author: { isAI: true, name: '', date: '2024-02-15' },
        votes: { agree: 0, disagree: 0 }
      },
      { trust: 48, trustClass: 'trust--mid',
        body: 'オリジナルの斑入り個体はタイ・ナコーンパトム県の研究農場で1990年代にEMS（化学的突然変異誘発）処理により作出されたとの説がある。公式な学術発表はない。',
        sources: [
          { icon: '\u{1F4AC}', text: 'Reddit r/monstera - "Origin of Thai Constellation" discussion (2022)' },
          { icon: '\u{1F4F7}', text: '@thai_tc_lab - Instagram (2020/12) ラボの様子投稿' }
        ],
        author: { isAI: false, name: 'MonsteraResearch', date: '2024-05-20' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Monstera deliciosa 'Albo Variegata'": {
    origins: [
      { trust: 73, trustClass: 'trust--high',
        body: 'M. deliciosa var. borsigiana の自然突然変異による白斑入り個体。斑入りは不安定で、各葉ごとに白の出方が異なるキメラ型。1990年代に欧州のコレクター間で流通が始まり、組織培養による大量生産は斑の安定性の問題から難しいとされてきた。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Chen, J. et al. - Ornamental Foliage Plants: Modification of Leaf Color. HortScience 40(3), 2005' },
          { icon: '\u{1F310}', text: 'Gabriella Plants 公式 - Variegation stability guide (gabriellaplants.com)' },
          { icon: '\u{1F4F7}', text: '@monsteraalchemy - Instagram (2021/02) 斑入りの仕組み解説投稿' }
        ],
        author: { isAI: true, name: '', date: '2024-03-05' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Monstera obliqua': {
    origins: [
      { trust: 91, trustClass: 'trust--high',
        body: '中南米熱帯雨林に広く分布。1830年にMiquelが記載。極端にfenestrationが発達する「ペルー型」が有名だが、これは本種の変異の一部に過ぎず、穴の少ない型も多い。しばしばM. adansoniiと混同されるが、花序構造と葉質が異なる。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Miquel, F.A.W. - Linnaea 18: 77 (1844). 正式記載' },
          { icon: '\u{1F4DA}', text: 'Madison, M. - Contributions from the Gray Herbarium 207 (1977)' },
          { icon: '\u{1F4C4}', text: 'Cedeño-Fonseca, M. et al. - Taxonomy of Monstera (Araceae) in Costa Rica. Phytotaxa 2020' }
        ],
        author: { isAI: true, name: '', date: '2024-02-28' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Monstera siltepecana': {
    origins: [
      { trust: 86, trustClass: 'trust--high',
        body: 'メキシコ南部からコロンビアにかけての中米雨林原産。幼葉は銀色の葉面模様を持ち、成熟すると穴が開く。1950年にMatudaが記載。属内でも特異な二相性（juvenile/adult dimorphism）が顕著な種。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Matuda, E. - Anales del Instituto de Biología UNAM 21: 357 (1950). 原記載' },
          { icon: '\u{1F4DA}', text: 'Madison, M. - Contributions from the Gray Herbarium 207 (1977)' }
        ],
        author: { isAI: true, name: '', date: '2024-04-15' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Monstera dubia': {
    origins: [
      { trust: 87, trustClass: 'trust--high',
        body: '中南米の熱帯雨林に分布。幼葉は shingling（瓦状付着）で樹幹に密着して登攀する独特の成長様式を示す。成熟葉は大型でfenestrationを持つ。1858年にSchottが記載。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Schott, H.W. - Prodromus Systematis Aroidearum (1860)' },
          { icon: '\u{1F4DA}', text: 'Madison, M. - Contributions from the Gray Herbarium 207 (1977)' }
        ],
        author: { isAI: true, name: '', date: '2024-03-20' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Monstera standleyana': {
    origins: [
      { trust: 84, trustClass: 'trust--high',
        body: 'コスタリカからコロンビアにかけて分布。全縁の披針形葉に白〜黄色の斑点や斑紋が入る。fenestrationは通常発達しない。1944年にBundleにより記載、Paul C. Standleyに献名された。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Bunting, G.S. - Annals of the Missouri Botanical Garden 52(4), 1965. 分類整理' },
          { icon: '\u{1F4DA}', text: 'Madison, M. - Contributions from the Gray Herbarium 207 (1977)' }
        ],
        author: { isAI: true, name: '', date: '2024-05-10' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Monstera deliciosa 'Aurea'": {
    origins: [
      { trust: 62, trustClass: 'trust--mid',
        body: 'M. deliciosa の黄色斑入り変異個体のクローン。Albo Variegata と同様にキメラ型斑入りで不安定。出所は複数説あり、インドネシアのTCラボ起源という説が最も広まっているが、欧州で独立に発見されたとの報告もある。',
        sources: [
          { icon: '\u{1F4F7}', text: '@monsteralovers_id - Instagram (2021/08) インドネシア産苗の紹介' },
          { icon: '\u{1F4AC}', text: 'Aroid Forum - "Aurea origins" thread #5201 (2022)' },
          { icon: '\u{1F310}', text: 'Kaylee Ellen YouTube - "Monstera Aurea vs Thai Constellation" 品種比較動画 (2022)' }
        ],
        author: { isAI: true, name: '', date: '2024-06-01' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Philodendron gloriosum': {
    origins: [
      { trust: 92, trustClass: 'trust--high',
        body: 'コロンビア・アンティオキア県を中心に中南米に広く分布。地上匍匐茎（terrestrial creeper）で林床を這い、心形の大型ビロード葉にピンク〜白の葉脈が走る。1876年にAndréが記載。Section Philodendron に属する。',
        sources: [
          { icon: '\u{1F4DA}', text: 'André, É. - Illustration Horticole 23: t.249 (1876). 原記載' },
          { icon: '\u{1F4DA}', text: 'Croat, T.B. - A Revision of Philodendron subgenus Philodendron for Central America. Ann. Missouri Bot. Gard. 84, 1997' },
          { icon: '\u{1F3DB}', text: 'Jardín Botánico de Medellín - 生体コレクション記録 (Antioquia産)' }
        ],
        author: { isAI: true, name: '', date: '2024-01-18' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Philodendron melanochrysum': {
    origins: [
      { trust: 90, trustClass: 'trust--high',
        body: 'コロンビア・チョコ県およびアンティオキア県原産。標高500-1,500mの雲霧林に着生する。1886年にLindenにより記載。成熟葉は60cm以上に達し、黒みがかった深緑にゴールドの微光沢（iridescence）を帯びる。"Black Gold Philodendron" の愛称。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Linden, J.J. - Illustration Horticole 33: 61, t.599 (1886). 原記載' },
          { icon: '\u{1F4DA}', text: 'Croat, T.B. - Aroideana 20: 1-289 (1997). Philodendron Sect. Calostigma 改訂' },
          { icon: '\u{1F3DB}', text: 'Marie Selby Botanical Gardens - Living collection SEL-2018-0234' }
        ],
        author: { isAI: true, name: '', date: '2024-02-12' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Philodendron 'Glorious'": {
    formula: { parentA: 'P. gloriosum', parentB: 'P. melanochrysum' },
    origins: [
      { trust: 80, trustClass: 'trust--high',
        body: 'P. gloriosum × P. melanochrysum の人工交配種。Keith Henderson (Australia) が作出した最初期の個体が有名。gloriosum のビロード質と白脈、melanochrysum の細長い葉形と暗色光沢を併せ持つ。自然交雑の可能性は低い（片方は地上匍匐性、片方は着生性）。',
        sources: [
          { icon: '\u{1F4C4}', text: 'International Aroid Society - Hybrid Registration Database, entry H-2017-045' },
          { icon: '\u{1F4F7}', text: '@keith_henderson_aroids - Instagram (2018/04) 初公開個体の写真' },
          { icon: '\u{1F310}', text: 'Ecuagenera 公式 - 品種解説ページ (ecuagenera.com)' }
        ],
        author: { isAI: true, name: '', date: '2024-03-08' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Philodendron verrucosum': {
    origins: [
      { trust: 91, trustClass: 'trust--high',
        body: 'コスタリカからコロンビア・エクアドルにかけての雲霧林原産。標高500-2,000mに着生。1872年にSchottの原稿に基づきMathieuが記載。葉柄が毛状の突起（verruculose）で覆われるのが名前の由来。心形のビロード葉に淡い葉脈模様。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Mathieu in Schott - Prodromus Systematis Aroidearum (1860), validated by Croat 1997' },
          { icon: '\u{1F4DA}', text: 'Croat, T.B. - Ann. Missouri Bot. Gard. 84, 1997. Central American Philodendron' },
          { icon: '\u{1F3DB}', text: 'Smithsonian Tropical Research Institute - Panama Canal Zone 採集記録' }
        ],
        author: { isAI: true, name: '', date: '2024-02-25' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Philodendron 'El Choco Red'": {
    origins: [
      { trust: 52, trustClass: 'trust--mid',
        body: 'コロンビア・チョコ県産のP. rubrijuvenumの可能性が指摘されている未同定種。新葉が深紅色を帯びるのが最大の特徴。近年"El Choco Red"のトレードネームで広く流通するようになったが、学術的な記載は行われていない。',
        sources: [
          { icon: '\u{1F4F7}', text: '@ecuagenera_official - Instagram (2019/09) 初出荷時の紹介投稿' },
          { icon: '\u{1F310}', text: 'Ecuagenera 公式 - 商品リスト (ecuagenera.com)' },
          { icon: '\u{1F4AC}', text: 'Aroid Forum - "El Choco Red ID?" discussion #4102 (2021)' }
        ],
        author: { isAI: true, name: '', date: '2024-04-20' },
        votes: { agree: 0, disagree: 0 }
      },
      { trust: 31, trustClass: 'trust--low',
        body: 'P. verrucosum の地域変異との見解もあるが、葉柄のverrucose構造が欠如する点で異なる。正確な分類にはDNA分析が必要。',
        sources: [
          { icon: '\u{1F4AC}', text: 'Reddit r/aroids - "Is El Choco Red just verrucosum?" thread (2022)' }
        ],
        author: { isAI: false, name: 'BotanyNerd_CO', date: '2024-07-01' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Philodendron 'Splendid'": {
    formula: { parentA: 'P. verrucosum', parentB: 'P. melanochrysum' },
    origins: [
      { trust: 77, trustClass: 'trust--high',
        body: 'P. verrucosum × P. melanochrysum の人工交配種。verrucosum の毛状葉柄と心形葉、melanochrysum の暗色光沢を受け継ぐ。LCA Plants (Ecuador) が初期の作出者として知られるが、複数のナーセリーで独立に交配されている。',
        sources: [
          { icon: '\u{1F310}', text: 'Ecuagenera 公式 - Hybrid catalog (ecuagenera.com)' },
          { icon: '\u{1F4C4}', text: 'International Aroid Society Newsletter - Philodendron hybrids roundup (2019)' },
          { icon: '\u{1F4F7}', text: '@lca_plants_ec - Instagram (2018/11) 交配個体の公開' }
        ],
        author: { isAI: true, name: '', date: '2024-03-15' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  'Philodendron squamiferum': {
    origins: [
      { trust: 89, trustClass: 'trust--high',
        body: 'ブラジル・フランス領ギアナ・スリナムの熱帯雨林原産。葉柄に赤褐色の鱗状毛が密生する唯一のPhilodendron。5裂する掌状葉も属内では異色。1845年にPoeppigが記載。Section Schizophyllum に属する。',
        sources: [
          { icon: '\u{1F4DA}', text: 'Poepp. in Poepp. & Endl. - Nov. Gen. Sp. Pl. 3: 88 (1845). 原記載' },
          { icon: '\u{1F4DA}', text: 'Mayo, S.J. et al. - The Genera of Araceae. Royal Botanic Gardens, Kew (1997)' },
          { icon: '\u{1F3DB}', text: 'Muséum National d\'Histoire Naturelle Paris - 標本番号 P-0067823' }
        ],
        author: { isAI: true, name: '', date: '2024-02-18' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Philodendron erubescens 'Pink Princess'": {
    origins: [
      { trust: 71, trustClass: 'trust--high',
        body: 'P. erubescens のピンク斑入り選抜品種。1970年代にRobert McColley (Bamboo Nursery, Florida) が交配プログラムから選抜したとされる。キメラ型斑入りで不安定。2019年頃からSNSで爆発的に人気が高まり、価格が急騰した。',
        sources: [
          { icon: '\u{1F4DA}', text: 'McColley, R.H. & Miller, J.D. - Philodendron improvements. Proc. Florida State Hort. Soc. 78: 409-413, 1965' },
          { icon: '\u{1F310}', text: 'Gabriella Plants - "History of Pink Princess Philodendron" 解説記事 (2020)' },
          { icon: '\u{1F4F7}', text: '@planterina - Instagram (2019/06) PPP人気火付け投稿 (1.2M likes)' }
        ],
        author: { isAI: true, name: '', date: '2024-04-05' },
        votes: { agree: 0, disagree: 0 }
      },
      { trust: 38, trustClass: 'trust--low',
        body: 'タイのTCラボで化学処理により人為的に斑入りを誘発した個体が多数出回っているとの指摘。これらは斑の安定性が低く、数世代で斑が消失する傾向がある。',
        sources: [
          { icon: '\u{1F4F7}', text: '@thai_rare_plants - Instagram (2021/04) TC苗についての投稿' },
          { icon: '\u{1F4AC}', text: 'Aroid Forum - "PPP reverting to green" discussion #5678 (2022)' }
        ],
        author: { isAI: false, name: 'TCWatchdog', date: '2024-08-10' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  },
  "Philodendron 'Majestic'": {
    formula: { parentA: 'P. verrucosum', parentB: 'P. sodiroi' },
    origins: [
      { trust: 58, trustClass: 'trust--mid',
        body: 'P. verrucosum × P. sodiroi の交配と推定されるハイブリッド。verrucosum の毛状葉柄と sodiroi の銀色模様を併せ持つ。正式な作出記録が少なく、複数のナーセリーから異なる交配親を用いた個体が "Majestic" として流通している可能性がある。',
        sources: [
          { icon: '\u{1F310}', text: 'Ecuagenera 公式 - Hybrid listing (ecuagenera.com)' },
          { icon: '\u{1F4F7}', text: '@ecuagenera_official - Instagram (2020/02) 販売開始投稿' },
          { icon: '\u{1F4AC}', text: 'Aroid Forum - "True Majestic identification" thread #4890 (2022)' }
        ],
        author: { isAI: true, name: '', date: '2024-05-15' },
        votes: { agree: 0, disagree: 0 }
      }
    ]
  }
};

// ---- Supabase + localStorage persistence for user-added cultivars ----
(function() {
  var STORAGE_KEY = 'plants-story-user-cultivars';
  var SUPABASE_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co';
  var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';

  // --- IP address helper (cached per session, global) ---
  window._cachedIp = null;
  window.getUserIp = function() {
    if (window._cachedIp) return Promise.resolve(window._cachedIp);
    return fetch('https://api.ipify.org?format=json')
      .then(function(r) { return r.json(); })
      .then(function(d) { window._cachedIp = d.ip; return d.ip; })
      .catch(function() { return null; });
  };

  var supabase = null;
  try {
    if (window.supabase && window.supabase.createClient) {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { flowType: 'pkce' }
      });
      window._supabaseClient = supabase;
      window._SUPABASE_URL = SUPABASE_URL;
    }
  } catch(e) { console.warn('Supabase init failed:', e); }

  // --- Genera: load genus config from DB and generate DOM ---
  window._generaData = [];
  window._generaLoaded = null; // Will be set to a Promise

  function loadGenera() {
    if (!supabase) {
      // Fallback: hardcoded genera if Supabase is not available
      window._generaData = [
        { name: 'Anthurium', slug: 'anthurium', display_order: 1, has_seedlings: true, card_image_path: 'anthurium.png' },
        { name: 'Monstera', slug: 'monstera', display_order: 2, has_seedlings: false, card_image_path: 'monstera.png' },
        { name: 'Philodendron', slug: 'philodendron', display_order: 3, has_seedlings: false, card_image_path: 'philodendron.png' }
      ];
      applyGeneraData();
      return Promise.resolve();
    }
    return supabase.from('genera').select('*').order('display_order').then(function(res) {
      if (res.error || !res.data || res.data.length === 0) {
        console.warn('Failed to load genera, using fallback:', res.error);
        window._generaData = [
          { name: 'Anthurium', slug: 'anthurium', display_order: 1, has_seedlings: true, card_image_path: 'anthurium.png' },
          { name: 'Monstera', slug: 'monstera', display_order: 2, has_seedlings: false, card_image_path: 'monstera.png' },
          { name: 'Philodendron', slug: 'philodendron', display_order: 3, has_seedlings: false, card_image_path: 'philodendron.png' }
        ];
      } else {
        window._generaData = res.data;
      }
      applyGeneraData();
    });
  }

  function applyGeneraData() {
    var data = window._generaData;
    // Update routing arrays
    knownGenera = data.map(function(g) { return g.slug; });
    SEEDLING_GENERA = data.filter(function(g) { return g.has_seedlings; }).map(function(g) { return g.slug; });
    window.SEEDLING_GENERA = SEEDLING_GENERA;
    // Generate DOM
    renderMobileNavGenera();
    renderGenusCards();
    renderGenusContentSections();
    renderContributeGenusOptions();
    renderSearchChips();
  }

  function renderSearchChips() {
    var container = document.getElementById('search-chips');
    if (!container) return;
    var html = '<span class="chip active" data-genus="all" data-i18n="filter_all">すべて</span>';
    window._generaData.forEach(function(g) {
      html += '<span class="chip" data-genus="' + g.slug + '">' + g.name + '</span>';
    });
    container.innerHTML = html;
  }

  function renderMobileNavGenera() {
    var container = document.getElementById('mobile-nav-genera');
    if (!container) return;
    var html = '';
    window._generaData.forEach(function(g) {
      html += '<a href="#" data-nav="genus" data-genus="' + g.slug + '">&#x1F33F; ' + g.name + '</a>';
    });
    container.innerHTML = html;
  }

  function renderGenusCards() {
    var grid = document.getElementById('genus-cards-grid');
    if (!grid) return;
    var html = '';
    window._generaData.forEach(function(g) {
      var imgSrc = g.card_image_path ? 'images/' + g.card_image_path : '';
      html += '<div class="card genus-card card--clickable" data-nav="genus" data-genus="' + g.slug + '">';
      html += '<div class="genus-card__img">';
      if (imgSrc) html += '<img src="' + imgSrc + '" alt="' + g.name + '" class="genus-card__photo">';
      html += '</div>';
      html += '<div class="genus-card__title">' + g.name + '</div>';
      html += '<div class="genus-card__count" data-genus-count="' + g.slug + '">- 品種</div>';
      html += '</div>';
    });
    grid.innerHTML = html;
  }

  function renderGenusContentSections() {
    var container = document.getElementById('genus-sections-container');
    if (!container) return;
    var html = '';
    window._generaData.forEach(function(g, idx) {
      var display = idx === 0 ? '' : ' style="display:none;"';
      html += '<div class="genus-content" id="genus-' + g.slug + '"' + display + '>';
      html += '<h1 class="section-title">' + g.name + '</h1>';
      html += '<p class="text-muted mb-lg">' + t('loading') + '</p>';

      if (g.has_seedlings) {
        // Pattern 1: with seedlings tab
        html += '<div class="genus-tabs" id="genus-tabs-' + g.slug + '">';
        html += '<button class="genus-tab active" data-tab="species-clones">&#x1F4D6; Species / Clones</button>';
        html += '<button class="genus-tab" data-tab="seedlings">&#x1F331; My Seedlings</button>';
        html += '</div>';
      }

      // Species/Clones view
      if (g.has_seedlings) html += '<div data-genus-view="species-clones">';
      html += '<div class="sort-bar">';
      html += '<div class="search-bar search-bar--inline">';
      html += '<input type="text" class="search-bar__input" placeholder="属内を検索..." data-i18n-placeholder="genus_search">';
      html += '<button class="search-bar__btn" aria-label="検索">&#x1F50D;</button>';
      html += '</div>';
      html += '<div class="chips">';
      html += '<span class="chip active" data-i18n="sort_name">名前順</span>';
      html += '<span class="chip" data-i18n="sort_trust">信頼度順</span>';
      html += '<span class="chip" data-i18n="sort_newest">新着順</span>';
      html += '</div>';
      html += '<div class="chips filter-chips">';
      html += '<span class="chip filter-chip active" data-filter-type="all" data-i18n="filter_all_type">すべて</span>';
      html += '<span class="chip filter-chip" data-filter-type="species" data-i18n="filter_species">原種</span>';
      html += '<span class="chip filter-chip" data-filter-type="hybrid" data-i18n="filter_hybrid">Hybrid</span>';
      html += '<span class="chip filter-chip" data-filter-type="clone" data-i18n="filter_clone">Clone</span>';
      html += '</div>';
      html += '<a href="#" class="btn btn--primary btn--sm" data-nav="contribute" data-genus="' + g.name + '" data-i18n="add_cultivar" class="btn--ml-auto">+ 品種を追加</a>';
      html += '</div>';

      html += '<div class="card card--no-pad"></div>';
      html += '<div class="pagination"></div>';

      html += '<div class="ad-placeholder mt-lg">';
      html += '<span class="ad-placeholder__label" data-i18n="ad_label">広告</span>';
      html += '<div class="ad-placeholder__slot">Google AdSense</div>';
      html += '</div>';

      if (g.has_seedlings) html += '</div>';

      if (g.has_seedlings) {
        // Seedlings view
        html += '<div data-genus-view="seedlings" style="display:none;">';
        html += '<div class="sort-bar">';
        html += '<div class="search-bar search-bar--inline">';
        html += '<input type="text" class="search-bar__input seedling-search" placeholder="実生を検索...">';
        html += '<button class="search-bar__btn" aria-label="検索">&#x1F50D;</button>';
        html += '</div>';
        html += '<a href="#" class="btn btn--primary btn--sm btn--ml-auto" data-nav="contribute" data-genus="' + g.name + '" data-contribute-type="seedling">+ 実生を追加</a>';
        html += '</div>';
        html += '<div class="card seedling-list card--no-pad">';
        html += '<div class="text-center text-muted p-xl">まだ実生が登録されていません。</div>';
        html += '</div>';
        html += '<div class="pagination seedling-pagination"></div>';
        html += '</div>';
      }

      html += '</div>'; // close genus-content
    });
    container.innerHTML = html;

  }

  function renderContributeGenusOptions() {
    var sel = document.getElementById('contribute-genus-select');
    if (!sel) return;
    // Keep the placeholder option
    var placeholder = sel.querySelector('option[disabled]');
    sel.innerHTML = '';
    if (placeholder) sel.appendChild(placeholder);
    window._generaData.forEach(function(g) {
      var opt = document.createElement('option');
      opt.value = g.name;
      opt.textContent = g.name;
      sel.appendChild(opt);
    });
  }

  // --- Auth: session management ---
  window._currentUser = null;

  function updateLoginUI() {
    var benefitsContent = document.getElementById('login-benefits-content');
    var loggedInInfo = document.getElementById('logged-in-info');
    var editKeyCard = document.getElementById('edit-key-card');
    var headerAuthBtn = document.getElementById('header-auth-btn');
    var navMypost = document.getElementById('nav-mypost');
    // Update header auth button and nav auth link
    var navAuth = document.getElementById('nav-auth');
    var navProfile = document.getElementById('nav-profile');
    var headerProfileBtn = document.getElementById('header-profile-btn');
    if (window._currentUser) {
      // Logged in: show profile in header, hide login button in header, show logout in menu
      var profileUrl = '#/profile/' + window._currentUser.id;
      if (headerProfileBtn) {
        headerProfileBtn.style.display = '';
        headerProfileBtn.href = profileUrl;
      }
      if (headerAuthBtn) {
        headerAuthBtn.textContent = 'ログアウト';
        headerAuthBtn.title = window._currentUser.email || '';
        headerAuthBtn.style.display = 'none';
      }
      if (navAuth) { navAuth.innerHTML = '&#x1F6AA; ログアウト'; navAuth.style.display = ''; }
      if (navProfile) { navProfile.style.display = ''; navProfile.href = profileUrl; }
    } else {
      // Logged out: show login button in header, hide profile
      if (headerProfileBtn) headerProfileBtn.style.display = 'none';
      if (headerAuthBtn) {
        headerAuthBtn.textContent = 'ログイン';
        headerAuthBtn.title = 'Googleでログイン';
        headerAuthBtn.style.display = '';
      }
      if (navAuth) { navAuth.innerHTML = '&#x1F511; ログイン'; navAuth.style.display = ''; }
      if (navProfile) navProfile.style.display = 'none';
    }
    // Show/hide 投稿履歴 menu item
    if (navMypost) {
      navMypost.style.display = window._currentUser ? '' : 'none';
    }
    // Update contribute page login card (may not exist on other pages)
    if (benefitsContent) {
      if (window._currentUser) {
        benefitsContent.style.display = 'none';
        loggedInInfo.style.display = 'flex';
        loggedInInfo.style.alignItems = 'center';
        loggedInInfo.style.gap = 'var(--space-md)';
        loggedInInfo.style.flexWrap = 'wrap';
        document.getElementById('logged-in-email').textContent = window._currentUser.email || '';
        if (editKeyCard) editKeyCard.style.display = 'none';
      } else {
        benefitsContent.style.display = 'flex';
        loggedInInfo.style.display = 'none';
        if (editKeyCard) editKeyCard.style.display = '';
      }
    }
  }

  if (supabase) {
    supabase.auth.onAuthStateChange(function(event, session) {
      window._currentUser = session ? session.user : null;
      updateLoginUI();
      checkSubscription();
      if (session && typeof syncFavoritesFromServer === 'function') syncFavoritesFromServer();
      if (event === 'SIGNED_IN' && window.location.search.indexOf('code=') !== -1) {
        var returnHash = localStorage.getItem('login_return_hash');
        localStorage.removeItem('login_return_hash');
        if (returnHash) {
          window.history.replaceState({}, '', window.location.pathname + returnHash);
          var route = returnHash.replace('#/', '').replace('#', '');
          if (route && typeof navigateTo === 'function') navigateTo(route);
        } else {
          window.history.replaceState({}, '', window.location.pathname + '#/');
          if (typeof navigateTo === 'function') navigateTo('');
        }
      }
    });
    supabase.auth.getSession().then(function(res) {
      if (res.data && res.data.session) {
        window._currentUser = res.data.session.user;
        updateLoginUI();
        checkSubscription();
        if (typeof syncFavoritesFromServer === 'function') syncFavoritesFromServer();
      }
    });
  }

  // Google login button
  var googleLoginBtn = document.getElementById('google-login-btn');
  if (googleLoginBtn && supabase) {
    googleLoginBtn.addEventListener('click', function() {
      localStorage.setItem('login_return_hash', window.location.hash || '');
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          queryParams: { prompt: 'select_account' }
        }
      });
    });
  }

  // ========================================
  // SUBSCRIPTION STATE MANAGEMENT
  // ========================================
  window._isSubscribed = false;
  window._subscriptionPlan = 'free'; // 'free', 'seedling_monthly', 'seedling_annual', 'granted'

  window.checkSubscription = checkSubscription;
  function checkSubscription() {
    if (!window._currentUser || !supabase) {
      window._isSubscribed = false;
      window._subscriptionPlan = 'free';
      return Promise.resolve(false);
    }
    return supabase.rpc('is_subscribed').then(function(res) {
      window._isSubscribed = res.data === true;
      if (window._isSubscribed) {
        // Fetch plan details
        return supabase.from('subscriptions').select('plan,status,current_period_end,cancel_at_period_end').eq('user_id', window._currentUser.id).single().then(function(subRes) {
          if (subRes.data) {
            window._subscriptionPlan = subRes.data.plan;
            window._subscriptionStatus = subRes.data.status;
            window._subscriptionEnd = subRes.data.current_period_end;
            window._subscriptionCancelAtEnd = subRes.data.cancel_at_period_end;
          }
          return true;
        });
      }
      return false;
    }).catch(function() {
      window._isSubscribed = false;
      return false;
    });
  }

  // Start Stripe checkout
  window.startCheckout = startCheckout;
  function startCheckout(plan) {
    var sb = window._supabaseClient;
    if (!sb || !window._currentUser) {
      showToast('ログインが必要です', true);
      return;
    }
    sb.auth.getSession().then(function(res) {
      if (!res.data || !res.data.session) { showToast('セッションエラー', true); return; }
      var token = res.data.session.access_token;
      fetch(window._SUPABASE_URL + '/functions/v1/create-checkout', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plan: plan })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.url) window.location.href = data.url;
        else showToast('チェックアウトエラー: ' + (data.error || 'Unknown'), true);
      })
      .catch(function(err) { showToast('エラー: ' + err.message, true); });
    });
  }

  // Open Stripe Customer Portal
  window.openCustomerPortal = openCustomerPortal;
  function openCustomerPortal() {
    var sb = window._supabaseClient;
    if (!sb || !window._currentUser) return;
    sb.auth.getSession().then(function(res) {
      if (!res.data || !res.data.session) return;
      var token = res.data.session.access_token;
      fetch(window._SUPABASE_URL + '/functions/v1/create-portal', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: '{}'
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.url) window.location.href = data.url;
        else showToast('ポータルエラー: ' + (data.error || 'Unknown'), true);
      });
    });
  }

  // Show paywall modal
  window.showPaywallModal = showPaywallModal;
  function showPaywallModal() {
    var modal = document.getElementById('paywall-modal');
    if (modal) modal.style.display = 'flex';
  }
  window.hidePaywallModal = hidePaywallModal;
  function hidePaywallModal() {
    var modal = document.getElementById('paywall-modal');
    if (modal) modal.style.display = 'none';
  }

  // Check seedling access for a given cultivar
  window.canAccessSeedling = canAccessSeedling;
  function canAccessSeedling(entry) {
    if (window._isSubscribed) return 'full';
    if (window._currentUser && entry && entry._userId === window._currentUser.id) return 'owner';
    return 'locked';
  }

  // Logout button
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn && supabase) {
    logoutBtn.addEventListener('click', function() {
      supabase.auth.signOut().then(function() {
        window._currentUser = null;
        window._isSubscribed = false;
        window._subscriptionPlan = 'free';
        updateLoginUI();
      });
    });
  }

  // Header auth button (login/logout)
  var headerAuthBtn = document.getElementById('header-auth-btn');
  if (headerAuthBtn && supabase) {
    headerAuthBtn.addEventListener('click', function() {
      if (window._currentUser) {
        supabase.auth.signOut().then(function() {
          window._currentUser = null;
          updateLoginUI();
          showToast('ログアウトしました');
        });
      } else {
        localStorage.setItem('login_return_hash', window.location.hash || '');
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + window.location.pathname,
            queryParams: { prompt: 'select_account' }
          }
        });
      }
    });
  }

  // Navigate to cultivar detail with pre-fetched DB data
  window.navigateToCultivarById = function(id, genus, displayName) {
    var sb = window._supabaseClient;
    if (!sb) return;
    sb.from('cultivars').select('*').eq('id', id).limit(1).then(function(res) {
      var row = res.data && res.data[0];
      if (row) {
        var key = row.cultivar_name;
        var entry = { origins: row.origins || [], _type: row.type, _userId: row.user_id, _created_at: row.created_at, _id: row.id };
        // Extract formula from origins
        (row.origins || []).forEach(function(o) {
          if (o && o._type === 'formula' && o.formula) entry.formula = o.formula;
        });
        // Set poster name
        if (row.user_id && window._profileCache && window._profileCache[row.user_id]) {
          entry._posterName = window._profileCache[row.user_id];
        }
        cultivarData[key] = entry;
        // Also store under display name for lookup
        var dispKey = key.replace(' [Seedling]', '');
        if (dispKey !== key) cultivarData[dispKey] = entry;
      }
      location.hash = '#/' + genus.toLowerCase() + '/' + encodeURIComponent(displayName);
    });
  };

  // Load my posts (投稿履歴)
  window.loadMyPosts = function() {
    var grid = document.getElementById('mypost-grid');
    var emptyMsg = document.getElementById('mypost-empty');
    var loginMsg = document.getElementById('mypost-login-msg');
    if (!grid) return;
    if (!window._currentUser) {
      grid.innerHTML = '';
      if (loginMsg) loginMsg.style.display = '';
      if (emptyMsg) emptyMsg.style.display = 'none';
      return;
    }
    if (loginMsg) loginMsg.style.display = 'none';
    grid.innerHTML = '<p class="loading-text">' + t('loading') + '</p>';
    var sb = window._supabaseClient;
    if (!sb) return;
    sb.from('cultivars').select('id, genus, cultivar_name, type, created_at')
      .eq('user_id', window._currentUser.id)
      .order('created_at', { ascending: false })
      .then(function(res) {
        grid.innerHTML = '';
        if (res.error) { grid.innerHTML = '<p class="error-text">エラー: ' + res.error.message + '</p>'; return; }
        var rows = res.data || [];
        if (rows.length === 0) {
          if (emptyMsg) emptyMsg.style.display = '';
          return;
        }
        if (emptyMsg) emptyMsg.style.display = 'none';
        rows.forEach(function(row) {
          var card = document.createElement('div');
          card.className = 'card';
          card.style.cssText = 'cursor:pointer;padding:var(--space-md);';
          var displayName = row.cultivar_name.replace(' [Seedling]', '');
          var date = row.created_at ? new Date(row.created_at).toLocaleDateString('ja-JP') : '';
          var typeBadge = row.type === 'species' ? 'species' : (row.type === 'seedling' ? 'seedling' : (row.type === 'clone' ? 'clone' : 'hybrid'));
          card.innerHTML = '<div class="d-flex justify-between items-center">' +
            '<div><span class="badge badge--' + typeBadge + ' badge--type-sm">' + (row.type || 'hybrid') + '</span>' +
            '<strong>' + displayName + '</strong></div>' +
            '<span class="text-xs text-muted">' + date + '</span></div>';
          card.addEventListener('click', function() {
            window.navigateToCultivarById(row.id, row.genus, displayName.replace(row.genus + ' ', ''));
          });
          grid.appendChild(card);
        });
      });
  };

  // Save to localStorage (fallback)
  window.saveUserCultivars = function() {
    var saved = {};
    try {
      var existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      Object.keys(existing).forEach(function(k) { saved[k] = existing[k]; });
    } catch(e) {}
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  };

  // SHA256 hash helper (returns hex string)
  function sha256(text) {
    var encoder = new TextEncoder();
    var data = encoder.encode(text);
    return crypto.subtle.digest('SHA-256', data).then(function(buffer) {
      var hashArray = Array.from(new Uint8Array(buffer));
      return hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  // Add cultivar to both Supabase and localStorage
  // Returns a Promise that resolves on success, rejects on DB error
  // editKey: optional 4-digit edit key string
  window.addUserCultivar = function(fullName, entry, meta, editKey) {
    if (supabase) {
      var isSeedling = meta.type === 'seedling';
      var originsData = JSON.parse(JSON.stringify(entry.origins || []));
      if (entry.formula) {
        originsData.push({ _type: 'formula', formula: entry.formula });
      }

      // Hash edit key client-side, then insert via RPC (SECURITY DEFINER)
      var hashPromise = editKey ? sha256(editKey) : Promise.resolve(null);
      var insertPromise = Promise.all([hashPromise, getUserIp()]).then(function(results) {
        var editKeyHash = results[0];
        var userIp = results[1];
        return supabase.rpc('insert_with_edit_key_hash', {
          p_genus: meta.genus,
          p_cultivar_name: fullName,
          p_type: meta.type || 'Hybrid',
          p_origins: originsData,
          p_edit_key_hash: editKeyHash,
          p_ai_status: meta.type === 'species' ? 'completed' : null,
          p_created_ip: userIp,
          p_user_id: window._currentUser ? window._currentUser.id : null
        });
      });

      return insertPromise.then(function(res) {
        if (res.error) {
          throw new Error(res.error.message);
        }
        // RPC returns {success, id} in res.data
        var rpcResult = res.data;
        if (rpcResult && !rpcResult.success) {
          throw new Error(rpcResult.error || 'Insert failed');
        }
        // Save to localStorage only after successful DB insert
        var saved = {};
        try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) {}
        saved[fullName] = { entry: entry, meta: meta };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        // Trigger AI research for non-species types only
        // Species uses the AI auto-fill button before registration instead
        var isSpecies = meta.type === 'species';
        if (!isSpecies) {
          var insertedId = rpcResult && rpcResult.id;
          if (insertedId) {
            var manualOrigins = (entry.origins || []).filter(function(o) {
              return o.source_type === 'manual' || (o.author && o.author.isAI === false);
            });
            var userText = '';
            var userSources = [];
            if (manualOrigins.length > 0) {
              userText = manualOrigins[0].body || '';
              userSources = (manualOrigins[0].sources || []).map(function(s) { return s.text || s.url || ''; }).filter(Boolean);
            }
            triggerAIResearch(insertedId, meta.genus, fullName, meta.type || 'Hybrid', manualOrigins, userText, userSources);
          }
        }
      });
    } else {
      var saved = {};
      try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) {}
      saved[fullName] = { entry: entry, meta: meta };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      return Promise.resolve();
    }
  };

  // ========== AI Research Functions ==========
  var EDGE_FUNCTION_URL = 'https://jpgbehsrglsiwijglhjo.supabase.co/functions/v1/research-origin';
  var aiPollingTimers = {};

  // Trigger AI research for a cultivar
  function triggerAIResearch(cultivarId, genus, cultivarName, type, manualOrigins, userText, userSources) {
    var payload = {
      cultivar_id: cultivarId,
      genus: genus,
      cultivar_name: cultivarName,
      type: type
    };
    // Pass manual origins directly so Edge Function doesn't need to race with DB
    if (manualOrigins && manualOrigins.length > 0) {
      payload.manual_origins = manualOrigins;
    }
    // Pass user text and sources for CLONE/hybrid verification
    if (userText) {
      payload.user_text = userText;
    }
    if (userSources && userSources.length > 0) {
      payload.user_sources = userSources;
    }
    fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload)
    }).then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success) {
        // Refresh the cultivar data from DB
        refreshCultivarFromDB(cultivarId, cultivarName);
      }
    }).catch(function(err) {
      console.error('AI research trigger error:', err);
      showToast(t('toast_ai_research_failed'), true);
    });
  }

  // Refresh a single cultivar from Supabase after AI completes
  function refreshCultivarFromDB(cultivarId, cultivarName) {
    if (!supabase) return;
    supabase.from('cultivars').select('*').eq('id', cultivarId).single()
    .then(function(res) {
      if (res.error || !res.data) return;
      var d = res.data;
      if (d.ai_status === 'completed' && d.origins && d.origins.length > 0) {
        // Update cultivarData in memory
        if (cultivarData[d.cultivar_name]) {
          cultivarData[d.cultivar_name].origins = d.origins;
        }
        // Update the DOM - find the cultivar row and update trust bar + badge
        updateCultivarRowUI(d.cultivar_name, d.origins);
        // Update localStorage
        try {
          var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          if (saved[d.cultivar_name]) {
            saved[d.cultivar_name].entry.origins = d.origins;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
          }
        } catch(e) {}
      }
    });
  }

  // Update the cultivar data + row UI after AI research completes
  function updateCultivarRowUI(cultivarName, origins) {
    // Update in-memory data store
    if (cultivarData[cultivarName]) {
      cultivarData[cultivarName].origins = origins;
    }
    // Re-render the genus page to reflect changes
    Object.keys(_genusItems).forEach(function(slug) {
      var items = _genusItems[slug];
      for (var i = 0; i < items.length; i++) {
        if (items[i].fullName === cultivarName) {
          items[i].entry.origins = origins;
          var genusEl = document.getElementById('genus-' + slug);
          if (genusEl) paginateGenus(genusEl);
          break;
        }
      }
    });
    // Also update detail page if it's open
    if (currentPage === 'page-cultivar') {
      var detailName = document.querySelector('.detail-name');
      if (detailName && detailName.textContent === cultivarName) {
        showCultivarDetail(cultivarName);
      }
    }
  }

  // Poll for pending AI research on page load
  function pollPendingAIResearch() {
    if (!supabase) return;
    supabase.from('cultivars').select('id, cultivar_name, ai_status')
      .in('ai_status', ['pending', 'researching'])
    .then(function(res) {
      if (res.error || !res.data || res.data.length === 0) return;
      res.data.forEach(function(c) {
        // Add pulse animation to pending cultivars
        var rows = document.querySelectorAll('.cultivar-row');
        for (var i = 0; i < rows.length; i++) {
          var nameEl = rows[i].querySelector('.cultivar-row__name');
          if (nameEl && nameEl.textContent === c.cultivar_name) {
            rows[i].classList.add('ai-researching');
            break;
          }
        }
        // Set up polling for this cultivar
        if (!aiPollingTimers[c.id]) {
          aiPollingTimers[c.id] = setInterval(function() {
            refreshCultivarFromDB(c.id, c.cultivar_name);
            // Check if completed and stop polling
            supabase.from('cultivars').select('ai_status').eq('id', c.id).single()
            .then(function(r) {
              if (r.data && (r.data.ai_status === 'completed' || r.data.ai_status === 'failed')) {
                clearInterval(aiPollingTimers[c.id]);
                delete aiPollingTimers[c.id];
              }
            });
          }, 5000); // Poll every 5 seconds
        }
      });
    });
  }

  // Which genera have seedling tabs (exposed globally for contribute form)
  var SEEDLING_GENERA = []; // Populated dynamically from genera table
  window.SEEDLING_GENERA = SEEDLING_GENERA;

  // Per-genus data store: { genusSlug: [{ fullName, entry, meta }, ...] }
  var _genusItems = {};
  window._genusItems = _genusItems;

  // Store cultivar data without creating DOM elements
  function addCultivarRow(fullName, entry, meta) {
    if (cultivarData[fullName]) return;
    entry._type = meta.type;
    entry._created_at = meta.created_at || '';
    entry._userId = meta.user_id || null;
    if (meta.id) entry._id = meta.id;
    if (meta.user_id && window._profileCache && window._profileCache[meta.user_id]) {
      entry._posterName = window._profileCache[meta.user_id];
    }
    if (entry.formula && entry.formula.creatorName) {
      entry._creatorName = entry.formula.creatorName;
    } else if (entry.origins) {
      for (var i = 0; i < entry.origins.length; i++) {
        if (entry.origins[i]._type === 'formula' && entry.origins[i].formula && entry.origins[i].formula.creatorName) {
          entry._creatorName = entry.origins[i].formula.creatorName;
          break;
        }
      }
    }
    cultivarData[fullName] = entry;

    // Add to per-genus data store
    var slug = meta.genus.toLowerCase();
    if (!_genusItems[slug]) _genusItems[slug] = [];
    _genusItems[slug].push({ fullName: fullName, entry: entry, meta: meta });
  }

  // Build HTML for a single cultivar row (pure function, no DOM mutation)
  window.buildRowHtml = buildRowHtml;
  function buildRowHtml(fullName, entry, meta) {
    var isSeedling = meta.type === 'seedling';
    var seedlingAccess = isSeedling ? canAccessSeedling(entry) : 'full';
    var locked = isSeedling && seedlingAccess === 'locked';
    var cls = 'cultivar-row' + (locked ? ' cultivar-row--locked' : '');
    var bi = getBadgeInfo(meta.type, fullName);
    var hasDesc = entry.origins.length > 0 && entry.origins[0].trust > 0;
    var originCount = hasDesc ? entry.origins.length : 0;
    var trustPct = hasDesc ? entry.origins[0].trust : 0;
    var displayName = isSeedling ? fullName.replace(' [Seedling]', '') : fullName;

    var h = '<div class="' + cls + '"' + (locked ? '' : ' data-nav="cultivar"') + ' data-genus="' + meta.genus.toLowerCase() + '" data-type="' + meta.type + '"' + (meta.created_at ? ' data-created="' + meta.created_at + '"' : '') + '>';
    var thumbKey = isSeedling ? displayName : displayName;
    var thumbPath = _thumbMap[thumbKey];
    var thumbContent = thumbPath
      ? '<img data-src="' + (window._SUPABASE_URL || '') + '/storage/v1/object/public/gallery-images/' + thumbPath + '" class="thumb-img" alt="">'
      : '<svg viewBox="0 0 40 40" width="32" height="32"><path d="M20 4C13 1 5 5 4 14C3 23 12 32 20 38C28 32 37 23 36 14C35 5 27 1 20 4Z" fill="#2D6A4F" opacity="0.35"/><path d="M20 4V38" stroke="#1B4332" stroke-width="1" fill="none" opacity="0.4"/></svg>';
    h += '<div class="cultivar-row__thumb' + (locked ? ' seedling-thumb--locked' : '') + '">' + thumbContent + '</div>';
    h += '<div class="cultivar-row__info">';
    h += '<div class="cultivar-row__name" data-key="' + escHtml(fullName) + '">' + escHtml(displayName) + '</div>';
    h += '<div class="cultivar-row__meta">';
    if (!isSeedling) h += '<span>' + t('origin_prefix') + originCount + t('origin_count_suffix') + '</span>';
    h += '<span class="badge ' + bi.cls + '">' + bi.txt + '</span>';
    if (locked) h += '<span class="badge badge--locked"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></span>';
    if (!isSeedling && !hasDesc) h += '<span class="badge badge--ai">' + t('ai_pending_badge') + '</span>';
    if (!isSeedling) h += '<div class="trust"><div class="trust__bar"><div class="trust__fill trust--low" style="width:' + trustPct + '%"></div></div><span class="trust__label">' + (hasDesc ? trustPct + '%' : '-') + '</span></div>';
    h += '</div>';
    if (entry.formula && !locked) {
      h += '<div class="text-sm text-muted mt-sm"><span class="formula-parent formula-parent--sm">' + escHtml(entry.formula.parentA) + '</span><span class="formula-operator formula-operator--sm">&times;</span><span class="formula-parent formula-parent--sm">' + escHtml(entry.formula.parentB) + '</span></div>';
    }
    if (isSeedling && entry._creatorName && !locked) {
      h += '<div class="text-xs text-muted mt-xs">' + t('creator_label') + escHtml(entry._creatorName) + '</div>';
    }
    if (isSeedling && entry._userId && entry._posterName && !locked) {
      h += '<div class="text-xs mt-xs"><a href="#/profile/' + escHtml(entry._userId) + '" class="poster-link" onclick="event.stopPropagation();">&#x1F464; ' + escHtml(entry._posterName) + '</a></div>';
    }
    h += '</div></div>';
    return h;
  }

  // Update genus card counts and pagination
  function refreshGenusUI() {
    (window._generaData || []).forEach(function(gObj) {
      var g = gObj.slug;
      var el = document.getElementById('genus-' + g);
      if (el) paginateGenus(el, 1);
      var card = document.querySelector('.genus-card[data-genus="' + g + '"]');
      if (card) {
        var countEl = card.querySelector('.genus-card__count');
        if (countEl) {
          var total = (_genusItems[g] || []).filter(function(it) { return it.meta.type !== 'seedling'; }).length;
          countEl.textContent = total + (currentLang === 'en' ? ' Cultivars' : ' 品種');
        }
      }
    });
  }

  // Fetch genus counts from server and update top page cards
  function refreshGenusCountsFromServer() {
    if (!supabase) return;
    supabase.rpc('get_genus_counts').then(function(res) {
      if (res.error || !res.data) return;
      var counts = (typeof res.data === 'object' && !Array.isArray(res.data)) ? (res.data.counts || res.data) : {};
      (window._generaData || []).forEach(function(gObj) {
        var card = document.querySelector('.genus-card[data-genus="' + gObj.slug + '"]');
        if (!card) return;
        var countEl = card.querySelector('.genus-card__count');
        if (!countEl) return;
        // Match by genus name (capitalize first letter)
        var genusName = gObj.slug.charAt(0).toUpperCase() + gObj.slug.slice(1);
        var count = counts[genusName] || 0;
        countEl.textContent = count + (currentLang === 'en' ? ' Cultivars' : ' 品種');
      });
    });
  }

  // Populate "Recently Added" on home page via RPC (server-side)
  function refreshRecentlyAdded() {
    var grid = document.getElementById('recently-added-grid');
    if (!grid) return;

    // Try server-side RPC first
    if (supabase) {
      grid.innerHTML = '<div class="text-center text-muted grid-full">' + t('loading') + '</div>';
      supabase.rpc('get_recent_cultivars', { p_limit: 3 }).then(function(res) {
        if (res.error || !res.data) {
          refreshRecentlyAddedFromMemory(grid);
          return;
        }
        var items = Array.isArray(res.data) ? res.data : (res.data.items || []);
        if (items.length === 0) {
          grid.innerHTML = '<div class="text-center text-muted grid-full empty-state">まだ品種が登録されていません。</div>';
          return;
        }
        renderRecentCards(grid, items);
      });
    } else {
      refreshRecentlyAddedFromMemory(grid);
    }
  }

  // Fallback: render from in-memory cultivarData
  function refreshRecentlyAddedFromMemory(grid) {
    var items = Object.keys(cultivarData).map(function(name) {
      var d = cultivarData[name];
      return { cultivar_name: name, created_at: d._created_at || '', type: d._type || '', origins: d.origins || [] };
    }).filter(function(item) {
      return item.type !== 'seedling';
    }).sort(function(a, b) {
      return (b.created_at || '').localeCompare(a.created_at || '');
    }).slice(0, 3);

    if (items.length === 0) {
      grid.innerHTML = '<div class="text-center text-muted grid-full empty-state">まだ品種が登録されていません。</div>';
      return;
    }
    renderRecentCards(grid, items);
  }

  // Shared renderer for recently added cards
  function renderRecentCards(grid, items) {
    var html = '';
    items.forEach(function(item) {
      var name = item.cultivar_name;
      var displayName = name.replace(' [Seedling]', '');
      var genus = displayName.split(' ')[0];
      var origins = item.origins || [];
      var type = item.type || '';
      var hasOrigins = origins.length > 0 && origins[0].trust > 0;
      var trustPct = hasOrigins ? origins.reduce(function(max, o) { return Math.max(max, o.trust || 0); }, 0) : 0;
      var trustClass = getTrustClass(trustPct);
      var bi = getBadgeInfo(type, name);

      html += '<div class="card card--clickable" data-nav="cultivar" data-key="' + name.replace(/"/g, '&quot;') + '">';
      html += '<div class="recent-card__img">';
      html += '<svg viewBox="0 0 80 60" width="60" height="45"><path d="M40 5C25 0 10 8 8 22C6 36 22 50 40 58C58 50 74 36 72 22C70 8 55 0 40 5Z" fill="#2D6A4F" opacity="0.3"/><path d="M40 5V58" stroke="#1B4332" stroke-width="1.5" fill="none" opacity="0.4"/></svg>';
      html += '</div>';
      html += '<div class="font-bold">' + displayName + '</div>';
      html += '<div class="text-sm text-muted">' + genus + ' <span class="badge ' + bi.cls + ' badge--inline">' + bi.txt + '</span></div>';
      if (hasOrigins) {
        html += '<div class="trust mt-sm"><div class="trust__bar"><div class="trust__fill ' + trustClass + '" style="width:' + trustPct + '%"></div></div><span class="trust__label">' + trustPct + '%</span></div>';
      }
      html += '</div>';
    });
    grid.innerHTML = html;
  }

  // Restore cultivars from Supabase first, then localStorage as fallback
  function restoreUserCultivars() {
    // Always load localStorage first (instant)
    var localSaved;
    try { localSaved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) { localSaved = {}; }
    Object.keys(localSaved).forEach(function(fullName) {
      addCultivarRow(fullName, localSaved[fullName].entry, localSaved[fullName].meta);
    });
    // Render genus pages from data store
    (window._generaData || []).forEach(function(gObj) {
      var section = document.getElementById('genus-' + gObj.slug);
      if (section) paginateGenus(section, 1);
    });
    refreshGenusUI();
    refreshRecentlyAdded();

    // Profile cache for poster names
    var _profileCache = {};
    window._profileCache = _profileCache;

    // Then load from Supabase (async, authoritative source)
    if (supabase) {
      supabase.from('cultivars').select('*').then(function(res) {
        if (res.error || !res.data) return;

        // Collect unique user_ids to fetch profiles
        var userIds = [];
        res.data.forEach(function(row) {
          if (row.user_id && userIds.indexOf(row.user_id) === -1) userIds.push(row.user_id);
        });

        // Fetch all profiles for poster names, then build rows
        var profilePromise = userIds.length > 0
          ? supabase.from('profiles').select('id, display_name').in('id', userIds).then(function(pRes) {
              if (pRes.data) pRes.data.forEach(function(p) { _profileCache[p.id] = p.display_name || '名前未設定'; });
            })
          : Promise.resolve();

        profilePromise.then(function() {
        // Clear all in-memory data, then rebuild from DB
        Object.keys(cultivarData).forEach(function(key) { delete cultivarData[key]; });
        Object.keys(_genusItems).forEach(function(key) { delete _genusItems[key]; });

        res.data.forEach(function(row) {
          var origins = row.origins || [];
          var formula = null;
          origins = origins.filter(function(o) {
            if (o && o._type === 'formula') { formula = o.formula; return false; }
            return true;
          });
          var entry = { origins: origins, formula: formula };
          var genus = row.genus || 'Anthurium';
          var meta = { genus: genus, type: row.type || 'Hybrid', created_at: row.created_at || '', user_id: row.user_id || null, id: row.id };
          addCultivarRow(row.cultivar_name, entry, meta);
        });
        // Mark full data as loaded
        _dataFullyLoaded = true;
        window._dataFullyLoaded = true;
        // Re-render all genus pages from data store
        (window._generaData || []).forEach(function(gObj) {
          var section = document.getElementById('genus-' + gObj.slug);
          if (section) paginateGenus(section, 1);
        });
        refreshGenusUI();
        setTimeout(loadCultivarThumbnails, 100);
        // Sync localStorage: only remove entries that exist in DB with origins intact
        try {
          var localData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
          var dbNames = {};
          res.data.forEach(function(row) { dbNames[row.cultivar_name] = row.origins || []; });
          var remaining = {};
          var hasRemaining = false;
          Object.keys(localData).forEach(function(name) {
            var dbOrigins = dbNames[name];
            // Keep local entry if not in DB or DB has empty origins (manual origin may have been lost)
            if (!dbOrigins || dbOrigins.length === 0) {
              remaining[name] = localData[name];
              hasRemaining = true;
            } else {
              // Check if DB preserved the manual origin
              var hasManual = dbOrigins.some(function(o) {
                return o.source_type === 'manual' || (o.author && o.author.isAI === false);
              });
              var localHasManual = (localData[name].entry.origins || []).some(function(o) {
                return o.source_type === 'manual' || (o.author && o.author.isAI === false);
              });
              // Keep local backup if local had manual origin but DB doesn't
              if (localHasManual && !hasManual) {
                remaining[name] = localData[name];
                hasRemaining = true;
              }
            }
          });
          if (hasRemaining) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        } catch(e) {}
        }); // end profilePromise.then
      });
    }
  }

  // Run after DOM is ready — load genera first, then cultivars
  function startApp() {
    window._generaLoaded = loadGenera().then(function() {
      // Fast: fetch top page data from RPCs (genus counts + recent cultivars)
      refreshRecentlyAdded();
      refreshGenusCountsFromServer();
      // Full data load (deferred, builds in-memory cache)
      restoreUserCultivars();
      setTimeout(pollPendingAIResearch, 2000);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }
})();
