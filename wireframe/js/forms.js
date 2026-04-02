
// Tab switching for genus pages (Species/Clones vs My Seedlings)
document.addEventListener('click', function(e) {
  var tab = e.target.closest('.genus-tab');
  if (!tab) return;
  var tabBar = tab.parentElement;
  var genusContent = tabBar.closest('.genus-content');
  if (!genusContent) return;
  tabBar.querySelectorAll('.genus-tab').forEach(function(t) { t.classList.remove('active'); });
  tab.classList.add('active');
  var view = tab.getAttribute('data-tab');
  genusContent.querySelectorAll('[data-genus-view]').forEach(function(v) {
    v.style.display = v.getAttribute('data-genus-view') === view ? '' : 'none';
  });
  // Reset search, type filter, and re-paginate for the newly active view
  var activeView = getActiveView(genusContent);
  var searchInput = activeView.querySelector('.search-bar__input');
  if (searchInput) searchInput.value = '';
  var filterChips = activeView.querySelectorAll('.filter-chip');
  filterChips.forEach(function(c) { c.classList.remove('active'); });
  var allChip = activeView.querySelector('.filter-chip[data-filter-type="all"]');
  if (allChip) allChip.classList.add('active');
  filterGenusRows(genusContent, '');
  paginateGenus(genusContent, 1);
});

// Hamburger menu
document.getElementById('hamburger').addEventListener('click', function() {
  document.getElementById('mobileNav').classList.toggle('open');
});

// ---- Genus search input listeners (event delegation, debounced for server-side) ----
var _genusSearchTimer = null;
document.addEventListener('input', function(e) {
  if (!e.target.matches('.genus-content .search-bar__input')) return;
  var genusEl = e.target.closest('.genus-content');
  if (!genusEl) return;
  clearTimeout(_genusSearchTimer);
  var slug = genusEl.id.replace('genus-', '');
  var hasData = (_genusItems[slug] || []).length > 0;
  if (hasData) {
    // In-memory: filter instantly
    filterGenusRows(genusEl, e.target.value);
    paginateGenus(genusEl, 1);
  } else {
    // Server-side: debounce 300ms to avoid excessive RPC calls
    _genusSearchTimer = setTimeout(function() {
      paginateGenus(genusEl, 1);
    }, 300);
  }
});

// ---- Top page global search ----
(function() {
  var heroSearch = document.querySelector('.hero .search-bar__input');
  var heroBtn = document.querySelector('.hero .search-bar__btn');
  if (heroSearch) {
    heroSearch.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        globalSearch(this.value);
      }
    });
  }
  if (heroBtn) {
    heroBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (heroSearch) globalSearch(heroSearch.value);
    });
  }
})();

// ---- Genus search button click (event delegation for dynamic content) ----
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.genus-content .search-bar__btn');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  var genusEl = btn.closest('.genus-content');
  var input = genusEl ? genusEl.querySelector('.search-bar__input') : null;
  if (genusEl && input) {
    filterGenusRows(genusEl, input.value);
    paginateGenus(genusEl, 1);
  }
});

// ---- Initialize pagination on load (deferred for dynamic genus content) ----
// Pagination is initialized after genera load via refreshGenusUI()

// Chip toggle (event delegation for dynamic content)
document.addEventListener('click', function(e) {
  var chip = e.target.closest('.chip');
  if (!chip) return;
  var group = chip.closest('.chips');
  if (group) {
    group.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('active'); });
  }
  chip.classList.add('active');
});

// Vote button handler (persists to Supabase)
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.vote-btn');
  if (!btn) return;
  if (!rateLimit('vote', 3000)) { showToast(t('rate_limit_wait'), true); return; }
  var sb = window._supabaseClient;
  if (!sb) return;
  var originIdx = parseInt(btn.getAttribute('data-origin-idx'), 10);
  if (isNaN(originIdx)) return;
  var h1 = document.querySelector('#page-cultivar h1');
  if (!h1) return;
  var cultivarName = h1.textContent;
  var voteType = btn.getAttribute('data-vote') === 'agree' ? 'agree' : 'disagree';

  // Check localStorage to prevent double voting
  var voteKey = 'vote_' + cultivarName + '_' + originIdx + '_' + voteType;
  if (localStorage.getItem(voteKey)) {
    showToast('既に投票済みです', true);
    return;
  }

  btn.disabled = true;
  sb.rpc('cast_origin_vote', {
    p_cultivar_name: cultivarName,
    p_origin_idx: originIdx,
    p_vote_type: voteType
  }).then(function(res) {
    if (res.error) { btn.disabled = false; showToast(t('toast_vote_failed'), true); return; }
    var result = res.data;
    if (!result || !result.success) { btn.disabled = false; showToast(result && result.error ? result.error : t('toast_vote_failed'), true); return; }
    localStorage.setItem(voteKey, '1');
    btn.classList.add(voteType === 'agree' ? 'vote-btn--active' : 'vote-btn--active-down');
    var countEl = btn.querySelector('.vote-btn__badge');
    if (countEl) countEl.textContent = result.new_count;
    // Update in-memory data
    if (cultivarData[cultivarName] && cultivarData[cultivarName].origins && cultivarData[cultivarName].origins[originIdx]) {
      if (!cultivarData[cultivarName].origins[originIdx].votes) cultivarData[cultivarName].origins[originIdx].votes = { agree: 0, disagree: 0 };
      cultivarData[cultivarName].origins[originIdx].votes[voteType] = result.new_count;
    }
    btn.disabled = false;
  }).catch(function() { btn.disabled = false; });
});

// Add origin form toggle
const btnAddOrigin = document.getElementById('btn-add-origin');
const btnCancelOrigin = document.getElementById('btn-cancel-origin');
const addOriginToggle = document.getElementById('add-origin-toggle');
const addOriginForm = document.getElementById('add-origin-form');
if (btnAddOrigin) {
  btnAddOrigin.addEventListener('click', function() {
    addOriginToggle.style.display = 'none';
    addOriginForm.style.display = 'block';
    // Show type-specific fields based on current cultivar type
    var h1 = document.querySelector('#page-cultivar h1');
    var cName = h1 ? h1.textContent : '';
    var cData = cultivarData[cName] || cultivarData[cName + ' [Seedling]'];
    var cType = cData ? (cData._type || 'species') : 'species';
    ['ao-species-fields','ao-clone-fields','ao-hybrid-fields','ao-seedling-fields'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    var showId = 'ao-' + cType + '-fields';
    var showEl = document.getElementById(showId);
    if (showEl) showEl.style.display = '';
  });
}
if (btnCancelOrigin) {
  btnCancelOrigin.addEventListener('click', function() {
    addOriginToggle.style.display = 'block';
    addOriginForm.style.display = 'none';
  });
}

// Formula unknown checkbox toggle
const formulaUnknown = document.getElementById('formula-unknown');
const formulaInputs = document.getElementById('formula-inputs');
if (formulaUnknown && formulaInputs) {
  formulaUnknown.addEventListener('change', function() {
    if (this.checked) {
      formulaInputs.style.opacity = '0.4';
      formulaInputs.style.pointerEvents = 'none';
    } else {
      formulaInputs.style.opacity = '1';
      formulaInputs.style.pointerEvents = 'auto';
    }
  });
}

// ========================================
// i18n TRANSLATION SYSTEM
// ========================================
var translations = {};
var currentLang = localStorage.getItem('plants-story-lang') || (navigator.language && navigator.language.startsWith('ja') ? 'jp' : (navigator.language && navigator.language.startsWith('en') ? 'en' : 'jp'));

// Load translations asynchronously (non-blocking)
var _translationsReady = fetch('i18n/translations.json')
  .then(function(res) { return res.json(); })
  .then(function(data) {
    translations = data;
    // Apply language once translations are loaded
    applyLanguage(currentLang);
  })
  .catch(function() {});

function t(key) {
  var entry = translations[key];
  return entry ? (entry[currentLang] || entry.jp) : key;
}

// Get species badge text based on cultivar name (aff., sp., cf., etc.)
function getSpeciesBadgeText(name) {
  if (!name) return t('badge_species');
  var lower = name.toLowerCase();
  if (/\baff\b\.?/.test(lower)) return 'aff.';
  if (/\bsp\b\.?/.test(lower)) return 'sp.';
  if (/\bcf\b\.?/.test(lower)) return 'cf.';
  return t('badge_species');
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('plants-story-lang', lang);
  document.documentElement.lang = (lang === 'en') ? 'en' : 'ja';

  // Static text elements
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var entry = translations[key];
    if (!entry) return;
    var text = entry[lang] || entry.jp;
    if (entry.html) {
      el.innerHTML = text;
    } else {
      el.textContent = text;
    }
  });

  // Lists (data-i18n-list: newline-separated items as <li>)
  document.querySelectorAll('[data-i18n-list]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-list');
    var entry = translations[key];
    if (!entry) return;
    var text = entry[lang] || entry.jp;
    var items = text.split('\n');
    el.innerHTML = '';
    items.forEach(function(item) {
      var li = document.createElement('li');
      li.textContent = item;
      el.appendChild(li);
    });
  });

  // HTML blocks (data-i18n-html: newline-separated items as <p>)
  document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-html');
    var entry = translations[key];
    if (!entry) return;
    var text = entry[lang] || entry.jp;
    var lines = text.split('\n');
    el.innerHTML = '';
    lines.forEach(function(line) {
      var p = document.createElement('p');
      p.textContent = line;
      el.appendChild(p);
    });
  });

  // Placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-placeholder');
    var entry = translations[key];
    if (entry) el.placeholder = entry[lang] || entry.jp;
  });

  // Update header toggle button
  var langBtn = document.querySelector('.header__lang');
  if (langBtn) langBtn.textContent = (lang === 'en') ? 'JP / EN' : 'EN / JP';

  // Re-render dynamic content
  refreshDynamicText();
}

function refreshDynamicText() {
  // Re-paginate visible genus (updates count text)
  var visibleGenus = document.querySelector('.genus-content[style*="block"]') || document.getElementById('genus-anthurium');
  if (visibleGenus) paginateGenus(visibleGenus);

  // Re-render origins if on cultivar page
  var cultivarPage = document.getElementById('page-cultivar');
  if (cultivarPage && cultivarPage.classList.contains('active')) {
    var h1 = cultivarPage.querySelector('h1');
    if (h1 && cultivarData[h1.textContent]) {
      renderOrigins(h1.textContent);
    }
  }

  // Re-render affiliate banners
  if (typeof renderAffiliateBanner === 'function') {
    renderAffiliateBanner('top-affiliate-grid');
    document.querySelectorAll('.genus-affiliate-grid').forEach(function(grid) {
      renderAffiliateBanner(grid);
    });
    if (cultivarPage && cultivarPage.classList.contains('active')) {
      renderAffiliateBanner('affiliate-links-grid', { showRecommend: true });
    }
  }
}

// (count text is now handled inside paginateGenus directly)

// Wire up language toggle button
document.querySelector('.header__lang').addEventListener('click', function() {
  applyLanguage(currentLang === 'jp' ? 'en' : 'jp');
});

// Language is applied after translations load (see _translationsReady above)

// ========================================
// SORT FUNCTIONALITY (event delegation for dynamic content)
// ========================================
document.addEventListener('click', function(e) {
  var chip = e.target.closest('.genus-content .chips .chip');
  if (!chip || chip.classList.contains('filter-chip')) return;
  var genusEl = chip.closest('.genus-content');
  if (!genusEl) return;
  // Sort is now handled inside paginateGenus based on active chip
  paginateGenus(genusEl, 1);
});

// ========================================
// TYPE FILTER FUNCTIONALITY
// ========================================
document.addEventListener('click', function(e) {
  var chip = e.target.closest('.genus-content .filter-chip');
  if (!chip) return;
  var genusEl = chip.closest('.genus-content');
  if (!genusEl) return;
  // Toggle active state within filter chips group
  var filterChips = chip.closest('.filter-chips');
  if (filterChips) {
    filterChips.querySelectorAll('.filter-chip').forEach(function(c) { c.classList.remove('active'); });
  }
  chip.classList.add('active');
  // Re-apply text search + type filter
  var searchInput = genusEl.querySelector('.search-bar__input');
  var query = searchInput ? searchInput.value : '';
  filterGenusRows(genusEl, query);
  paginateGenus(genusEl, 1);
});

// ========================================
// RECENTLY ADDED CARDS - Fix navigation
// ========================================
document.querySelectorAll('#page-top .grid--3 .card--clickable').forEach(function(card) {
  var nameEl = card.querySelector('.font-bold');
  if (nameEl && !card.closest('.genus-card')) {
    card.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var name = nameEl.textContent.trim();
      if (cultivarData[name]) {
        // Determine badge type from data
        var data = cultivarData[name];
        var fakeRow = document.createElement('div');
        var badgeClass = 'badge--species';
        if (data.formula) badgeClass = 'badge--hybrid';
        fakeRow.innerHTML = '<span class="badge ' + badgeClass + '"></span>';
        updateCultivarDetail(name, fakeRow);
        navigateTo('cultivar', { cultivar: name, _skipUpdate: true }, true);
      }
    });
  }
});

// ========================================
// SEARCH PAGE GENUS FILTER CHIPS
// ========================================
document.addEventListener('click', function(e) {
  var chip = e.target.closest('#search-chips .chip');
  if (!chip) return;
  var genusFilter = chip.getAttribute('data-genus');
  var resultCard = document.getElementById('search-cultivar-list');
  if (!resultCard) return;
  // Update active state
  document.querySelectorAll('#search-chips .chip').forEach(function(c) { c.classList.remove('active'); });
  chip.classList.add('active');
  // Filter rows
  var rows = resultCard.querySelectorAll('.cultivar-row');
  rows.forEach(function(row) {
    if (!genusFilter || genusFilter === 'all') {
      row.style.display = '';
    } else {
      row.style.display = (row.getAttribute('data-genus') === genusFilter) ? '' : 'none';
    }
  });
});

// ========================================
// CONTRIBUTE FORM - Full functionality
// ========================================
(function() {
  var contributeGenus = document.querySelector('#page-contribute .form-select');
  var contributeName = document.getElementById('cultivar-name-input');
  var duplicateAlert = document.getElementById('duplicate-alert');
  var contributeDesc = document.getElementById('sf-notes'); // 補足欄
  var contributeSourceInput = document.querySelector('#page-contribute input[type="url"]');
  var contributeSourceBtn = contributeSourceInput ? contributeSourceInput.parentElement.querySelector('.btn--secondary') : null;
  var contributeSourceList = document.querySelector('#page-contribute .source-list');
  var submitBtn = document.querySelector('#page-contribute .btn--primary.btn--block');
  // Type-specific field containers
  var speciesFields = document.getElementById('species-fields');
  var cloneFields = document.getElementById('clone-fields');
  var hybridFields = document.getElementById('hybrid-fields');
  var seedlingFields = document.getElementById('seedling-fields');
  // Formula inputs per type (clone uses #formula-inputs, hybrid uses #hybrid-formula-inputs, seedling uses #seedling-formula-inputs)
  var formulaSection = document.querySelector('#page-contribute #formula-inputs');
  var formulaParentA, formulaParentB;
  if (formulaSection) {
    var inputs = formulaSection.querySelectorAll('.form-input');
    formulaParentA = inputs[0];
    formulaParentB = inputs[1];
  }
  // Hybrid formula
  var hybridFormulaSection = document.getElementById('hybrid-formula-inputs');
  var hybridFormulaA, hybridFormulaB;
  if (hybridFormulaSection) {
    var hInputs = hybridFormulaSection.querySelectorAll('.form-input');
    hybridFormulaA = hInputs[0];
    hybridFormulaB = hInputs[1];
  }
  // Seedling formula
  var seedlingFormulaSection = document.getElementById('seedling-formula-inputs');
  var seedlingFormulaA, seedlingFormulaB;
  if (seedlingFormulaSection) {
    var sInputs = seedlingFormulaSection.querySelectorAll('.form-input');
    seedlingFormulaA = sInputs[0];
    seedlingFormulaB = sInputs[1];
  }
  // Helper to get active formula inputs based on type
  function getActiveFormula(type) {
    if (type === 'hybrid') return { a: hybridFormulaA, b: hybridFormulaB };
    if (type === 'seedling') return { a: seedlingFormulaA, b: seedlingFormulaB };
    if (type === 'clone') return { a: formulaParentA, b: formulaParentB };
    return { a: null, b: null };
  }

  // Sources management
  var contributeSources = [];

  // ---- Edit mode state ----
  var editMode = false;
  var editCultivarKey = null; // original full name (key in cultivarData)
  var editCultivarId = null;  // DB id for delete
  var verifiedEditKey = null; // edit key verified on detail page
  var contributePageTitle = document.getElementById('contribute-page-title');
  var contributePageDesc = document.getElementById('contribute-page-desc');
  var contributeSubmitBtn = document.getElementById('contribute-submit-btn');

  window.enterEditMode = function(cultivarName, editKeyFromDetail, cultivarIdFromDetail) {
    // Find the cultivar in data - try exact match first, then with [Seedling] suffix
    var data = cultivarData[cultivarName] || cultivarData[cultivarName + ' [Seedling]'];
    var key = cultivarData[cultivarName] ? cultivarName : (cultivarData[cultivarName + ' [Seedling]'] ? cultivarName + ' [Seedling]' : null);
    if (!data || !key) {
      // Fallback: search case-insensitively
      Object.keys(cultivarData).forEach(function(k) {
        if (k.replace(' [Seedling]', '') === cultivarName) {
          data = cultivarData[k];
          key = k;
        }
      });
    }
    if (!data || !key) return;
    // If this is a seedling, ensure key includes [Seedling] suffix (DB stores it that way)
    if (data._type === 'seedling' && key.indexOf('[Seedling]') === -1) {
      var seedlingKey = key + ' [Seedling]';
      if (cultivarData[seedlingKey]) {
        key = seedlingKey;
      } else {
        // Also register under the [Seedling] key for consistency
        cultivarData[seedlingKey] = data;
        key = seedlingKey;
      }
    }

    editMode = true;
    editCultivarKey = key;
    editCultivarId = cultivarIdFromDetail || null;
    verifiedEditKey = editKeyFromDetail || null;

    // Update page title and button
    if (contributePageTitle) contributePageTitle.textContent = t('edit_title');
    if (contributePageDesc) contributePageDesc.textContent = t('edit_desc');
    if (contributeSubmitBtn) contributeSubmitBtn.textContent = t('btn_update');

    // Determine genus and short name
    var genus = '';
    var shortName = '';
    var type = data._type || 'species';
    (window._generaData || []).forEach(function(gObj) {
      if (key.toLowerCase().startsWith(gObj.name.toLowerCase())) {
        genus = gObj.name;
        shortName = key.replace(gObj.name + ' ', '').replace(' [Seedling]', '').replace(/^'|'$/g, '');
      }
    });

    // Pre-fill genus
    if (contributeGenus && genus) {
      contributeGenus.value = genus;
      contributeGenus.dispatchEvent(new Event('change'));
    }

    // Pre-fill name
    if (contributeName) contributeName.value = shortName;

    // Pre-fill type
    var typeRadio = document.querySelector('#page-contribute input[name="cultivar-type"][value="' + type + '"]');
    if (typeRadio) {
      typeRadio.checked = true;
      typeRadio.dispatchEvent(new Event('change'));
    }

    // Pre-fill structured fields from first non-formula origin
    var editStructured = null;
    if (data.origins) {
      for (var i = 0; i < data.origins.length; i++) {
        if (data.origins[i]._type !== 'formula' && data.origins[i].structured) {
          editStructured = data.origins[i].structured;
          break;
        }
      }
    }

    // Pre-fill 補足欄 (shared textarea)
    if (contributeDesc) {
      contributeDesc.value = '';
      if (editStructured && editStructured.notes) {
        contributeDesc.value = editStructured.notes;
      } else if (data.origins) {
        // Fallback: use body from first non-formula origin (legacy data)
        for (var i = 0; i < data.origins.length; i++) {
          if (data.origins[i]._type !== 'formula' && data.origins[i].body) {
            contributeDesc.value = data.origins[i].body;
            break;
          }
        }
      }
    }

    // Pre-fill type-specific structured fields
    if (editStructured) {
      if (type === 'species') {
        var v;
        if (editStructured.species_subcategory) setSubcategory(editStructured.species_subcategory);
        v = document.getElementById('sf-author-name'); if (v) v.value = editStructured.author_name || '';
        v = document.getElementById('sf-publication-year'); if (v) v.value = editStructured.publication_year || '';
        v = document.getElementById('sf-collector'); if (v) v.value = editStructured.collector || '';
        v = document.getElementById('sf-collection-year'); if (v) v.value = editStructured.collection_year || '';
        v = document.getElementById('sf-type-locality'); if (v) v.value = editStructured.type_locality || '';
        v = document.getElementById('sf-known-habitats'); if (v) v.value = editStructured.known_habitats || '';
      } else if (type === 'clone') {
        var v;
        v = document.getElementById('sf-clone-namer'); if (v) v.value = editStructured.namer || '';
        v = document.getElementById('sf-clone-naming-year'); if (v) v.value = editStructured.naming_year || '';
      } else if (type === 'hybrid') {
        var v;
        v = document.getElementById('sf-hybrid-breeder'); if (v) v.value = editStructured.breeder || '';
        v = document.getElementById('sf-hybrid-naming-year'); if (v) v.value = editStructured.naming_year || '';
      } else if (type === 'seedling') {
        var v;
        v = document.getElementById('sf-sowing-date'); if (v) v.value = editStructured.sowing_date || '';
      }
    }

    // Pre-fill formula from structured or legacy data.formula
    var editFormula = (editStructured && editStructured.formula) || data.formula;
    if (editFormula) {
      var f = getActiveFormula(type);
      if (f.a) f.a.value = editFormula.parentA || '';
      if (f.b) f.b.value = editFormula.parentB || '';
    }

    // Pre-fill creator name
    var creatorInput = document.getElementById('creator-name-input');
    if (creatorInput) {
      creatorInput.value = (editStructured && editStructured.breeder) || (data.formula && data.formula.creatorName) || data._creatorName || '';
    }

    // Pre-fill citation links into source list
    if (editStructured && editStructured.citation_links && editStructured.citation_links.length > 0) {
      contributeSources = editStructured.citation_links.map(function(l) { return typeof l === 'string' ? l : l.url; });
      renderContributeSources();
    }

    // Pre-fill parent photos (show existing images in preview with × to remove)
    if (data.formula && type === 'seedling') {
      var _sb = window._supabaseClient;
      ['mother', 'father'].forEach(function(role) {
        var photoPath = role === 'mother' ? data.formula.motherPhoto : data.formula.fatherPhoto;
        var preview = document.getElementById(role + '-preview');
        var uploadArea = document.getElementById(role + '-upload');
        var fileInput = document.getElementById(role + '-photo-input');
        if (photoPath && _sb && preview) {
          var url = _sb.storage.from('gallery-images').getPublicUrl(photoPath).data.publicUrl;
          preview.innerHTML = '<div class="photo-preview">' +
            '<img src="' + url + '" class="photo-preview__img" title="クリックで写真を変更">' +
            '<button class="parent-photo-remove photo-preview__remove">&times;</button>' +
            '</div>';
          if (uploadArea) uploadArea.style.display = 'none';
          // Click image to replace
          preview.querySelector('img').addEventListener('click', function() {
            if (fileInput) fileInput.click();
          });
          // Click × to remove
          preview.querySelector('.parent-photo-remove').addEventListener('click', function(e) {
            e.stopPropagation();
            preview.innerHTML = '';
            if (uploadArea) uploadArea.style.display = '';
            if (role === 'mother') { motherPhotoFile = null; data.formula.motherPhoto = null; }
            else { fatherPhotoFile = null; data.formula.fatherPhoto = null; }
          });
        }
      });
    }

    // Pre-fill sources from first non-formula origin
    contributeSources = [];
    if (data.origins) {
      for (var i = 0; i < data.origins.length; i++) {
        if (data.origins[i]._type !== 'formula' && data.origins[i].sources) {
          data.origins[i].sources.forEach(function(s) {
            if (s.text) contributeSources.push(s.text);
          });
          break;
        }
      }
    }
    renderContributeSources();

    // Pre-load existing gallery images as previews with × to delete
    var editDisplayName = key.replace(' [Seedling]', '');
    var _sbForGallery = window._supabaseClient;
    if (_sbForGallery) {
      _sbForGallery.from('cultivar_images')
        .select('id, storage_path, caption, link_url, display_order')
        .eq('cultivar_name', editDisplayName)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true })
        .then(function(res) {
          if (res.error || !res.data || res.data.length === 0) return;
          var editImages = res.data;

          function renderEditImagePreviews() {
            var previewEl = document.getElementById('contribute-preview');
            if (!previewEl) return;
            previewEl.innerHTML = '';
            editImages.forEach(function(img, idx) {
              var url = _sbForGallery.storage.from('gallery-images').getPublicUrl(img.storage_path).data.publicUrl;
              var item = document.createElement('div');
              item.className = 'upload-preview__item';
              item.setAttribute('data-image-id', img.id);
              item.setAttribute('data-storage-path', img.storage_path);
              item.innerHTML =
                '<div class="upload-preview__img-wrap">' +
                  '<img class="upload-preview__img" src="' + url + '" title="登録済み画像">' +
                  '<button class="upload-preview__remove" data-image-id="' + img.id + '" data-storage-path="' + img.storage_path + '" data-idx="' + idx + '">&times;</button>' +
                '</div>' +
                '<div class="upload-preview__meta">' +
                  '<input type="text" placeholder="補足（日付等）" data-image-id="' + img.id + '" data-field="caption" value="' + (img.caption || '').replace(/"/g, '&quot;') + '">' +
                  '<input type="url" placeholder="リンクURL" data-image-id="' + img.id + '" data-field="link_url" value="' + (img.link_url || '').replace(/"/g, '&quot;') + '">' +
                '</div>';
              previewEl.appendChild(item);
            });
            // Attach × handlers to delete from DB
            previewEl.querySelectorAll('.upload-preview__remove').forEach(function(btn) {
              btn.addEventListener('click', function(e) {
                e.stopPropagation();
                var imageId = this.getAttribute('data-image-id');
                var storagePath = this.getAttribute('data-storage-path');
                var idx = parseInt(this.getAttribute('data-idx'), 10);
                if (!confirm('この画像を削除しますか？')) return;
                _sbForGallery.storage.from('gallery-images').remove([storagePath]).then(function() {
                  return _sbForGallery.from('cultivar_images').delete().eq('id', imageId);
                }).then(function() {
                  editImages.splice(idx, 1);
                  renderEditImagePreviews();
                  showToast(t('toast_image_deleted'));
                }).catch(function(err) {
                  showToast('画像削除エラー: ' + (err.message || err), true);
                });
              });
            });
            // Attach caption/link save handlers (save on blur)
            previewEl.querySelectorAll('.upload-preview__meta input').forEach(function(inp) {
              inp.addEventListener('blur', function() {
                var imageId = this.getAttribute('data-image-id');
                var field = this.getAttribute('data-field');
                var val = this.value.trim();
                var updates = {};
                updates[field] = val || null;
                _sbForGallery.from('cultivar_images').update(updates).eq('id', imageId).then(function(res) {
                  if (res.error) console.warn('Failed to update image ' + field + ':', res.error);
                });
              });
            });
            // Attach unified move buttons (function defined in gallery IIFE, exposed on window)
            if (typeof window.attachUnifiedMoveButtons === 'function') {
              window.attachUnifiedMoveButtons(previewEl);
            }
          }

          renderEditImagePreviews();
        });
    }

    // Hide duplicate alert
    if (duplicateAlert) duplicateAlert.style.display = 'none';

    // Disable genus and name fields (can't change the identity without edit key)
    if (contributeGenus) contributeGenus.disabled = true;
    if (contributeName) contributeName.disabled = true;
    // Disable type radios
    document.querySelectorAll('#page-contribute input[name="cultivar-type"]').forEach(function(r) { r.disabled = true; });

    // Hide edit key card in edit mode (already verified on detail page)
    var editKeyCard = document.getElementById('edit-key-card');
    if (editKeyCard) editKeyCard.style.display = 'none';

    // Unlock genus, name, type fields (key was already verified)
    if (contributeGenus) contributeGenus.disabled = false;
    if (contributeName) contributeName.disabled = false;
    document.querySelectorAll('#page-contribute input[name="cultivar-type"]').forEach(function(r) { r.disabled = false; });

    // Show delete button in edit mode
    var editDeleteBtn = document.getElementById('edit-delete-btn');
    if (editDeleteBtn) editDeleteBtn.style.display = '';
  };

  window.exitEditMode = function() {
    editMode = false;
    editCultivarKey = null;
    editCultivarId = null;

    // Restore page title and button
    if (contributePageTitle) contributePageTitle.textContent = t('contribute_title');
    if (contributePageDesc) contributePageDesc.textContent = t('contribute_desc');
    if (contributeSubmitBtn) contributeSubmitBtn.textContent = t('btn_submit');

    // Re-enable fields
    if (contributeGenus) contributeGenus.disabled = false;
    if (contributeName) contributeName.disabled = false;
    document.querySelectorAll('#page-contribute input[name="cultivar-type"]').forEach(function(r) { r.disabled = false; });

    // Clear edit key and restore card/hints
    verifiedEditKey = null;
    var editKeyCard = document.getElementById('edit-key-card');
    if (editKeyCard) editKeyCard.style.display = window._currentUser ? 'none' : '';
    var editKeyInput = document.getElementById('edit-key-input');
    if (editKeyInput) editKeyInput.value = '';
    var editKeyHint = document.getElementById('edit-key-hint');
    var editKeyHintEdit = document.getElementById('edit-key-hint-edit');
    if (editKeyHint) editKeyHint.style.display = '';
    if (editKeyHintEdit) editKeyHintEdit.style.display = 'none';

    // Reset form
    if (contributeName) contributeName.value = '';
    if (contributeDesc) contributeDesc.value = '';
    if (contributeGenus) contributeGenus.selectedIndex = 0;
    var speciesRadio = document.querySelector('#page-contribute input[name="cultivar-type"][value="species"]');
    if (speciesRadio) { speciesRadio.checked = true; speciesRadio.dispatchEvent(new Event('change')); }
    // Clear all formula inputs
    if (formulaParentA) formulaParentA.value = '';
    if (formulaParentB) formulaParentB.value = '';
    if (hybridFormulaA) hybridFormulaA.value = '';
    if (hybridFormulaB) hybridFormulaB.value = '';
    if (seedlingFormulaA) seedlingFormulaA.value = '';
    if (seedlingFormulaB) seedlingFormulaB.value = '';
    // Clear structured fields
    ['sf-author-name','sf-publication-year','sf-collector','sf-collection-year','sf-type-locality','sf-known-habitats',
     'sf-clone-namer','sf-clone-naming-year','sf-hybrid-breeder','sf-hybrid-naming-year','sf-sowing-date'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    contributeSources = [];
    renderContributeSources();
    if (duplicateAlert) duplicateAlert.style.display = 'none';

    // Reset parent photo previews
    ['mother', 'father'].forEach(function(role) {
      var preview = document.getElementById(role + '-preview');
      var uploadArea = document.getElementById(role + '-upload');
      if (preview) preview.innerHTML = '';
      if (uploadArea) uploadArea.style.display = '';
    });

    // Reset gallery preview
    var contributePreviewEl = document.getElementById('contribute-preview');
    if (contributePreviewEl) contributePreviewEl.innerHTML = '';
    if (typeof window.resetContributeImages === 'function') window.resetContributeImages();

    // Reset creator name
    var creatorInput = document.getElementById('creator-name-input');
    if (creatorInput) creatorInput.value = '';

    // Hide and reset delete button
    var editDeleteBtn = document.getElementById('edit-delete-btn');
    if (editDeleteBtn) {
      editDeleteBtn.style.display = 'none';
      editDeleteBtn.disabled = false;
      editDeleteBtn.textContent = '\uD83D\uDDD1 この品種を削除';
    }
  };

  // Edit-mode delete handler
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('#edit-delete-btn');
    if (!btn || !editMode || !editCultivarKey) return;
    if (!confirm('「' + editCultivarKey + '」を削除しますか？この操作は取り消せません。')) return;

    var sbClient = window._supabaseClient;
    if (!sbClient) { showToast('データベース接続エラー', true); return; }
    if (!verifiedEditKey && !window._currentUser) { showToast('編集キーが未検証です', true); return; }
    if (!editCultivarId) { showToast('品種IDが不明です', true); return; }

    btn.disabled = true;
    btn.textContent = '削除中...';

    var deletePromise;
    if (verifiedEditKey) {
      var keyData = new TextEncoder().encode(verifiedEditKey);
      deletePromise = crypto.subtle.digest('SHA-256', keyData).then(function(buffer) {
        var hashArray = Array.from(new Uint8Array(buffer));
        var inputHash = hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
        return sbClient.rpc('delete_with_edit_key_hash', {
          p_cultivar_id: editCultivarId,
          p_edit_key_hash: inputHash
        });
      });
    } else {
      deletePromise = sbClient.rpc('delete_with_edit_key_hash', {
        p_cultivar_id: editCultivarId
      });
    }
    deletePromise.then(function(res) {
      if (res.error) throw new Error(res.error.message);
      var result = res.data;
      if (result && !result.success) throw new Error(result.error || 'Failed');

      // Remove DOM row
      var rows = document.querySelectorAll('.cultivar-row');
      rows.forEach(function(row) {
        var nameEl = row.querySelector('.cultivar-row__name');
        if (nameEl && nameEl.getAttribute('data-key') === editCultivarKey) row.remove();
      });
      window.exitEditMode();
      navigateTo('top');
      showToast(t('toast_cultivar_deleted'));
    }).catch(function(err) {
      btn.disabled = false;
      btn.textContent = '\uD83D\uDDD1 この品種を削除';
      showToast('削除エラー: ' + err.message, true);
    });
  });

  // Clear example sources on load
  if (contributeSourceList) contributeSourceList.innerHTML = '';

  function renderContributeSources() {
    if (!contributeSourceList) return;
    contributeSourceList.innerHTML = '';
    contributeSources.forEach(function(url, i) {
      var div = document.createElement('div');
      div.className = 'source-list__item';
      div.innerHTML = '<a href="#">' + escHtml(url) + '</a><span class="source-list__remove" data-source-idx="' + i + '">&times;</span>';
      contributeSourceList.appendChild(div);
    });
  }

  // Add source button
  if (contributeSourceBtn) {
    contributeSourceBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (!contributeSourceInput) return;
      var url = contributeSourceInput.value.trim();
      if (!url) return;
      if (!/^https?:\/\/.+/i.test(url)) { showToast(t('toast_url_invalid'), true); return; }
      contributeSources.push(url);
      contributeSourceInput.value = '';
      renderContributeSources();
    });
  }

  // Remove source click
  if (contributeSourceList) {
    contributeSourceList.addEventListener('click', function(e) {
      var removeBtn = e.target.closest('.source-list__remove');
      if (removeBtn) {
        var idx = parseInt(removeBtn.getAttribute('data-source-idx'), 10);
        if (!isNaN(idx)) {
          contributeSources.splice(idx, 1);
          renderContributeSources();
        }
      }
    });
  }

  // Show/hide seedling radio based on genus
  var seedlingRadioLabel = document.querySelector('#page-contribute input[name="cultivar-type"][value="seedling"]');
  if (seedlingRadioLabel) seedlingRadioLabel = seedlingRadioLabel.closest('label');
  function updateSeedlingVisibility() {
    var genus = contributeGenus ? contributeGenus.value.toLowerCase() : '';
    var hasSeedlings = SEEDLING_GENERA.indexOf(genus) !== -1;
    if (seedlingRadioLabel) seedlingRadioLabel.style.display = hasSeedlings ? '' : 'none';
    // If seedling is selected but genus doesn't support it, switch to species
    var checked = document.querySelector('#page-contribute input[name="cultivar-type"]:checked');
    if (checked && checked.value === 'seedling' && !hasSeedlings) {
      var speciesRadio = document.querySelector('#page-contribute input[name="cultivar-type"][value="species"]');
      if (speciesRadio) { speciesRadio.checked = true; speciesRadio.dispatchEvent(new Event('change')); }
    }
  }
  if (contributeGenus) {
    contributeGenus.addEventListener('change', updateSeedlingVisibility);
  }
  updateSeedlingVisibility();

  // Show/hide structured fields based on type
  var originAiHint = document.getElementById('origin-ai-hint');
  function updateAiAutofillVisibility() {
    var aiContainer = document.getElementById('ai-autofill-container');
    if (!aiContainer) return;
    var checkedRadio = document.querySelector('#page-contribute input[name="cultivar-type"]:checked');
    var currentType = checkedRadio ? checkedRadio.value : 'species';
    aiContainer.classList.toggle('d-none', currentType !== 'species');
  }

  function showTypeFields(type) {
    if (speciesFields) speciesFields.classList.toggle('d-none', type !== 'species');
    if (cloneFields) cloneFields.classList.toggle('d-none', type !== 'clone');
    if (hybridFields) hybridFields.classList.toggle('d-none', type !== 'hybrid');
    if (seedlingFields) seedlingFields.classList.toggle('d-none', type !== 'seedling');
    // Show/hide clone image hint
    var cloneImageHint = document.getElementById('clone-image-hint');
    if (cloneImageHint) cloneImageHint.classList.toggle('d-none', type !== 'clone');
    // Re-render image preview to switch between clone select UI and normal text input
    if (typeof renderContributePreview === 'function' && document.getElementById('contribute-preview') && document.getElementById('contribute-preview').children.length > 0) {
      renderContributePreview();
    }
    // Show/hide species subcategory chips and reset to default when switching back
    var subcatContainer = document.getElementById('species-subcategory');
    if (subcatContainer) {
      subcatContainer.classList.toggle('d-none', type !== 'species');
      if (type === 'species') setSubcategory('species');
    }
    if (originAiHint) {
      if (type === 'species') { originAiHint.textContent = 'AIが自動で由来を調査します'; originAiHint.classList.remove('d-none'); }
      else if (type === 'seedling') { originAiHint.classList.add('d-none'); }
      else { originAiHint.textContent = '由来を記入するとAIが内容を検証し、信頼度スコアを算出します'; originAiHint.classList.remove('d-none'); }
    }
    // Show/hide parent photos section for seedlings
    var parentPhotosSection = document.getElementById('parent-photos-section');
    if (parentPhotosSection) parentPhotosSection.style.display = type === 'seedling' ? '' : 'none';
    updateAiAutofillVisibility();
  }
  document.querySelectorAll('#page-contribute input[name="cultivar-type"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
      // Gate seedling type behind subscription
      if (this.value === 'seedling' && !window._isSubscribed) {
        this.checked = false;
        var speciesRadio = document.querySelector('#page-contribute input[name="cultivar-type"][value="species"]');
        if (speciesRadio) { speciesRadio.checked = true; }
        showTypeFields('species');
        if (!window._currentUser) {
          showToast('実生の投稿にはログインとサブスクリプションが必要です', true);
        } else {
          showPaywallModal();
        }
        return;
      }
      showTypeFields(this.value);
    });
  });
  // Initialize: show species fields by default
  var activeType = document.querySelector('#page-contribute input[name="cultivar-type"]:checked');
  showTypeFields(activeType ? activeType.value : 'species');

  // Helper: get selected species subcategory
  function getSelectedSubcategory() {
    var active = document.querySelector('#species-subcategory .chip.active');
    return active ? active.getAttribute('data-subcategory') : 'species';
  }

  // Helper: set species subcategory chip
  function setSubcategory(value) {
    document.querySelectorAll('#species-subcategory .chip').forEach(function(c) {
      c.classList.remove('active');
      if (c.getAttribute('data-subcategory') === value) c.classList.add('active');
    });
  }

  // Type-hint tooltips: mobile tap support & prevent radio toggle
  document.querySelectorAll('.type-hint').forEach(function(hint) {
    hint.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      // Close other open hints
      document.querySelectorAll('.type-hint.active').forEach(function(h) {
        if (h !== hint) h.classList.remove('active');
      });
      hint.classList.toggle('active');
    });
  });
  // Close hints when tapping elsewhere
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.type-hint')) {
      document.querySelectorAll('.type-hint.active').forEach(function(h) { h.classList.remove('active'); });
    }
  });

  // AI auto-fill: show/hide button when name changes
  if (contributeName) {
    contributeName.addEventListener('input', updateAiAutofillVisibility);
  }

  // AI auto-fill click handler
  var aiAutofillBtn = document.getElementById('ai-autofill-btn');
  var aiAutofillStatus = document.getElementById('ai-autofill-status');
  if (aiAutofillBtn) {
    aiAutofillBtn.addEventListener('click', function() {
      var genus = contributeGenus ? contributeGenus.value : '';
      var nameVal = contributeName ? contributeName.value.trim() : '';
      if (!nameVal) { showToast('品種名を入力してください', true); return; }
      if (!genus) { showToast('属を選択してください', true); return; }
      var fullName = genus + ' ' + nameVal;

      aiAutofillBtn.disabled = true;
      aiAutofillBtn.textContent = '調査中...';
      if (aiAutofillStatus) aiAutofillStatus.textContent = 'IPNI/POWOデータベースを検索中...';

      var edgeFnUrl = 'https://jpgbehsrglsiwijglhjo.supabase.co/functions/v1/research-origin';
      // Get auth token (user JWT if logged in, fallback to anon key)
      var tokenPromise;
      try {
        tokenPromise = window._supabaseClient.auth.getSession().then(function(r) {
          return (r.data.session && r.data.session.access_token) ? r.data.session.access_token : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA';
        });
      } catch(e) {
        tokenPromise = Promise.resolve('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZ2JlaHNyZ2xzaXdpamdsaGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMzQwNzAsImV4cCI6MjA4ODkxMDA3MH0.Up-z0b60_81GoLBpzoXZI01mPBSbvUS7t5MbrEWXkXA');
      }
      tokenPromise.then(function(authToken) {
      return fetch(edgeFnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
        body: JSON.stringify({ cultivar_name: fullName, genus: genus, type: 'species', preview: true })
      });
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success && data.structured) {
          var s = data.structured;
          var el;
          el = document.getElementById('sf-author-name');
          if (el && s.author_name && s.author_name !== '不明') el.value = s.author_name;
          el = document.getElementById('sf-publication-year');
          if (el && s.publication_year) el.value = s.publication_year;
          el = document.getElementById('sf-collector');
          if (el && s.collector && s.collector !== '不明') el.value = s.collector;
          el = document.getElementById('sf-collection-year');
          if (el && s.collection_year) el.value = s.collection_year;
          el = document.getElementById('sf-type-locality');
          if (el && s.type_locality && s.type_locality !== '不明') el.value = s.type_locality;
          el = document.getElementById('sf-known-habitats');
          if (el && s.known_habitats) el.value = s.known_habitats;
          // Notes: skip auto-fill for species (user should write manually)
          // Fill citation links
          if (s.citation_links && s.citation_links.length > 0) {
            s.citation_links.forEach(function(link) {
              var url = typeof link === 'string' ? link : link.url;
              if (url && contributeSources.indexOf(url) === -1) contributeSources.push(url);
            });
            renderContributeSources();
          }
          window._aiAutofillUsed = true;
          if (aiAutofillStatus) aiAutofillStatus.textContent = '記入完了 — 内容を確認してください';
        } else {
          if (aiAutofillStatus) aiAutofillStatus.textContent = 'データが見つかりませんでした';
        }
      })
      .catch(function(err) {
        console.error('AI autofill error:', err);
        if (aiAutofillStatus) aiAutofillStatus.textContent = 'エラーが発生しました';
      })
      .finally(function() {
        aiAutofillBtn.disabled = false;
        aiAutofillBtn.textContent = 'AI自動記入';
      });
    });
  }

  // Parent photo upload handlers
  var motherPhotoFile = null, fatherPhotoFile = null;
  ['mother', 'father'].forEach(function(parent) {
    var uploadArea = document.getElementById(parent + '-upload');
    var fileInput = document.getElementById(parent + '-photo-input');
    var preview = document.getElementById(parent + '-preview');
    if (!uploadArea || !fileInput) return;
    uploadArea.addEventListener('click', function() { fileInput.click(); });
    fileInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) { showToast('ファイルサイズは20MB以下にしてください', true); this.value = ''; return; }
      if (parent === 'mother') motherPhotoFile = file; else fatherPhotoFile = file;
      var reader = new FileReader();
      reader.onload = function(e) {
        preview.innerHTML = '<div class="photo-preview">' +
          '<img src="' + e.target.result + '" class="photo-preview__img" title="クリックで画像を変更">' +
          '<button class="parent-photo-remove photo-preview__remove">&times;</button>' +
          '</div>';
        uploadArea.style.display = 'none';
        // Click image to re-select
        preview.querySelector('img').addEventListener('click', function() {
          fileInput.click();
        });
        // Click × to remove
        preview.querySelector('.parent-photo-remove').addEventListener('click', function(ev) {
          ev.stopPropagation();
          preview.innerHTML = '';
          uploadArea.style.display = '';
          if (parent === 'mother') motherPhotoFile = null; else fatherPhotoFile = null;
        });
      };
      reader.readAsDataURL(file);
    });
  });

  // Exact-match duplicate detection only (skip in edit mode)
  if (contributeName && duplicateAlert) {
    contributeName.addEventListener('input', function() {
      if (editMode) { duplicateAlert.style.display = 'none'; return; }
      var inputVal = this.value.trim().toLowerCase();
      if (inputVal.length < 1) { duplicateAlert.style.display = 'none'; return; }
      var genus = contributeGenus ? contributeGenus.value : ((window._generaData && window._generaData[0]) ? window._generaData[0].name : '');
      var currentType = document.querySelector('#page-contribute input[name="cultivar-type"]:checked');
      currentType = currentType ? currentType.value : 'species';
      var exactKey;
      var cleanVal = inputVal.replace(/^'+|'+$/g, '');
      if (currentType === 'species') {
        exactKey = genus.toLowerCase() + ' ' + cleanVal;
      } else if (currentType === 'seedling') {
        exactKey = genus.toLowerCase() + " '" + cleanVal + "' [seedling]";
      } else {
        exactKey = genus.toLowerCase() + " '" + cleanVal + "'";
      }
      var found = null;
      Object.keys(cultivarData).forEach(function(name) {
        if (name.toLowerCase() === exactKey) {
          found = name;
        }
      });
      if (found) {
        duplicateAlert.style.display = 'block';
        var msgEl = duplicateAlert.querySelector('.text-sm.text-muted');
        if (msgEl) msgEl.textContent = '「' + found.replace(' [Seedling]', '') + '」は既に登録済みです。由来を追加する場合は品種ページから行えます。';
      } else {
        duplicateAlert.style.display = 'none';
      }
    });
  }

  // Submit handler
  if (submitBtn) {
    submitBtn.addEventListener('click', function(e) {
      e.preventDefault();
      var genus = contributeGenus ? contributeGenus.value : '';
      var name = contributeName ? contributeName.value.trim() : '';
      var type = document.querySelector('#page-contribute input[name="cultivar-type"]:checked');
      type = type ? type.value : 'species';
      var desc = contributeDesc ? contributeDesc.value.trim() : '';

      // Validation
      if (!genus) { showToast(t('error_genus_required'), true); return; }
      if (!name) { showToast(t('error_name_required'), true); return; }

      // Edit key validation (required for new registration, skip in edit mode or when logged in)
      if (!editMode && !window._currentUser) {
        var editKeyInput = document.getElementById('edit-key-input');
        var editKeyVal = editKeyInput ? editKeyInput.value.trim() : '';
        if (!editKeyVal) {
          showToast('編集キーを記入してください', true);
          return;
        }
        if (!/^[0-9]{4}$/.test(editKeyVal)) {
          showToast('編集キーは4桁の数字で入力してください', true);
          return;
        }
      }

      // Build full name — strip existing quotes to avoid double-quoting
      name = name.replace(/^'+|'+$/g, '');
      var fullName;
      if (type === 'species') {
        fullName = genus + ' ' + name;
      } else if (type === 'seedling') {
        fullName = genus + " '" + name + "' [Seedling]";
      } else {
        fullName = genus + " '" + name + "'";
      }

      // Check duplicate (skip in edit mode unless name changed to a *different* existing one)
      if (!editMode && cultivarData[fullName]) { showToast(t('error_duplicate'), true); return; }
      if (editMode) {
        // Normalize both names for comparison (strip quotes/whitespace differences)
        var normFull = fullName.replace(/'+/g, "'").trim();
        var normKey = (editCultivarKey || '').replace(/'+/g, "'").trim();
        if (normFull !== normKey && cultivarData[fullName]) { showToast(t('error_duplicate'), true); return; }
      }

      // ---- Build structured data from form fields ----
      function buildStructuredFromForm(type) {
        var s = { origin_type: type };
        var f = getActiveFormula(type);
        if (type === 'species') {
          var v;
          s.species_subcategory = getSelectedSubcategory();
          v = document.getElementById('sf-author-name'); if (v) s.author_name = v.value.trim();
          v = document.getElementById('sf-publication-year'); if (v && v.value) s.publication_year = parseInt(v.value, 10) || null;
          v = document.getElementById('sf-collector'); if (v) s.collector = v.value.trim();
          v = document.getElementById('sf-collection-year'); if (v && v.value) s.collection_year = parseInt(v.value, 10) || null;
          v = document.getElementById('sf-type-locality'); if (v) s.type_locality = v.value.trim();
          v = document.getElementById('sf-known-habitats'); if (v) s.known_habitats = v.value.trim();
        } else if (type === 'clone') {
          var v;
          v = document.getElementById('sf-clone-namer'); if (v) s.namer = v.value.trim();
          v = document.getElementById('sf-clone-naming-year'); if (v && v.value) s.naming_year = parseInt(v.value, 10) || null;
          if (f.a && f.b) {
            var pA = f.a.value.trim(), pB = f.b.value.trim();
            if (pA && pB) s.formula = { parentA: pA, parentB: pB };
          }
        } else if (type === 'hybrid') {
          var v;
          v = document.getElementById('sf-hybrid-breeder'); if (v) s.breeder = v.value.trim();
          v = document.getElementById('sf-hybrid-naming-year'); if (v && v.value) s.naming_year = parseInt(v.value, 10) || null;
          if (f.a && f.b) {
            var pA = f.a.value.trim(), pB = f.b.value.trim();
            if (pA && pB) s.formula = { parentA: pA, parentB: pB };
          }
        } else if (type === 'seedling') {
          var v;
          v = document.getElementById('creator-name-input'); if (v) s.breeder = v.value.trim();
          v = document.getElementById('sf-sowing-date'); if (v) s.sowing_date = v.value;
          if (f.a && f.b) {
            var pA = f.a.value.trim(), pB = f.b.value.trim();
            if (pA && pB) s.formula = { parentA: pA, parentB: pB };
          }
        }
        // 補足欄 (shared)
        s.notes = desc;
        // 引用リンク (shared)
        if (contributeSources.length > 0) {
          s.citation_links = contributeSources.map(function(url) { return { url: url }; });
        }
        return s;
      }

      // Generate auto body text from structured fields (for backward compat)
      function generateBodyFromStructured(s) {
        var parts = [];
        if (s.origin_type === 'species') {
          if (s.species_subcategory && s.species_subcategory !== 'species') {
            var subLabels = { sp: 'sp.', ssp: 'ssp.', cf: 'cf.', aff: 'aff.' };
            parts.push('分類: ' + (subLabels[s.species_subcategory] || s.species_subcategory));
          }
          if (s.author_name) parts.push('発表者: ' + s.author_name + (s.publication_year ? ' (' + s.publication_year + ')' : ''));
          if (s.collector) parts.push('発見者: ' + s.collector + (s.collection_year ? ' (' + s.collection_year + ')' : ''));
          if (s.type_locality) parts.push('採取地: ' + s.type_locality);
          if (s.known_habitats) parts.push('生息地: ' + s.known_habitats);
        } else if (s.origin_type === 'clone') {
          if (s.namer) parts.push('名付けた人物: ' + s.namer + (s.naming_year ? ' (' + s.naming_year + ')' : ''));
        } else if (s.origin_type === 'hybrid') {
          if (s.breeder) parts.push('作出者: ' + s.breeder + (s.naming_year ? ' (' + s.naming_year + ')' : ''));
        } else if (s.origin_type === 'seedling') {
          if (s.breeder) parts.push('作出者: ' + s.breeder);
          if (s.sowing_date) parts.push('播種日: ' + s.sowing_date);
        }
        if (s.formula) parts.push('交配式: ' + s.formula.parentA + ' × ' + s.formula.parentB);
        if (s.notes) parts.push(s.notes);
        return parts.join('. ') || '';
      }

      // Hybrid formula validation
      if (type === 'hybrid') {
        var hf = getActiveFormula('hybrid');
        if (!hf.a || !hf.b || !hf.a.value.trim() || !hf.b.value.trim()) {
          showToast('ハイブリッドには交配式が必須です', true);
          return;
        }
      }

      var structured = buildStructuredFromForm(type);

      // ---- EDIT MODE: update existing record ----
      if (editMode && editCultivarKey) {
        var existingData = cultivarData[editCultivarKey];
        if (!existingData) { showToast('品種データが見つかりません', true); return; }

        // Update structured data in first non-formula origin
        var updatedSources = contributeSources.map(function(url) { return { icon: '\u{1F310}', text: url }; });
        var autoBody = generateBodyFromStructured(structured);
        var foundOrigin = false;
        var updatedOrigins = (existingData.origins || []).map(function(o) {
          if (o._type === 'formula') return o;
          if (!foundOrigin) {
            foundOrigin = true;
            var hasUserInput = autoBody || (structured.notes && structured.notes.trim());
            var updatedOrigin = Object.assign({}, o, {
              body: autoBody || o.body,
              structured: structured,
              sources: updatedSources.length > 0 ? updatedSources : o.sources
            });
            // ユーザーが内容を入力した場合、manualとしてマーク（AI再調査時の上書き防止）
            if (hasUserInput) {
              updatedOrigin.source_type = 'manual';
              updatedOrigin.author = { isAI: false, name: 'User', date: new Date().toISOString().slice(0, 10) };
            }
            return updatedOrigin;
          }
          return o;
        });
        // If no non-formula origin existed, add one
        if (!foundOrigin) {
          updatedOrigins.unshift({
            trust: type === 'seedling' ? 50 : 30, trustClass: type === 'seedling' ? 'trust--mid' : 'trust--low',
            body: autoBody,
            structured: structured,
            source_type: 'manual',
            sources: updatedSources,
            author: { isAI: false, name: 'User', date: new Date().toISOString().slice(0, 10) },
            votes: { agree: 0, disagree: 0 }
          });
        }

        // Update formula (backward compat: keep data.formula for buildFormulaHtml)
        var updatedFormula = existingData.formula || null;
        if (structured.formula) {
          updatedFormula = Object.assign({}, updatedFormula || {}, structured.formula);
        }
        // Update creator name for seedlings
        if (type === 'seedling' && structured.breeder) {
          if (!updatedFormula) updatedFormula = {};
          updatedFormula.creatorName = structured.breeder || null;
        }

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';

        var sbClient = window._supabaseClient;
        var editKeyValue = verifiedEditKey || '';
        var nameChanged = fullName !== editCultivarKey;
        var isSeedlingEdit = type === 'seedling';

        // --- Upload parent photos if changed (seedlings) ---
        var editParentPhotoPromise;
        if (isSeedlingEdit && sbClient && (motherPhotoFile || fatherPhotoFile)) {
          var uploadParentPhoto = function(file, role) {
            if (!file) return Promise.resolve(null);
            return window.compressImage(file).then(function(compressed) {
              var path = 'seedling-parents/' + fullName.replace(/[^a-zA-Z0-9]/g, '_') + '/' + role + '_' + Date.now() + '.jpg';
              return sbClient.storage.from('gallery-images').upload(path, compressed, { contentType: 'image/jpeg', upsert: true }).then(function(res) {
                if (res.error) { console.warn('Parent photo upload error:', res.error); return null; }
                return path;
              });
            });
          };
          editParentPhotoPromise = Promise.all([
            uploadParentPhoto(motherPhotoFile, 'mother'),
            uploadParentPhoto(fatherPhotoFile, 'father')
          ]).then(function(paths) {
            if (!updatedFormula) updatedFormula = {};
            if (paths[0]) updatedFormula.motherPhoto = paths[0];
            if (paths[1]) updatedFormula.fatherPhoto = paths[1];
          }).catch(function(err) {
            console.warn('Parent photo upload failed:', err);
            showToast(t('toast_parent_photo_failed'), true);
          });
        } else {
          editParentPhotoPromise = Promise.resolve();
        }

        // --- Upload gallery images if added ---
        var editGalleryFiles = typeof window.getContributeFiles === 'function' ? window.getContributeFiles() : [];
        var editGalleryCaptions = typeof window.getContributeCaptions === 'function' ? window.getContributeCaptions() : [];
        var editGalleryLinkUrls = typeof window.getContributeLinkUrls === 'function' ? window.getContributeLinkUrls() : [];
        var editGalleryName = fullName.replace(' [Seedling]', '');

        editParentPhotoPromise.then(function() {
          // Build DB origins (include formula entry)
          var dbOrigins = updatedOrigins.filter(function(o) { return o._type !== 'formula'; });
          if (updatedFormula) {
            dbOrigins.push({ _type: 'formula', formula: updatedFormula });
          }

          // Update in Supabase
          var updatePromise;

          if (sbClient && (editKeyValue || window._currentUser)) {
            // Edit key or logged-in user: use RPC for full update
            var rpcParams = {
              p_cultivar_name: editCultivarKey,
              p_new_cultivar_name: nameChanged ? fullName : null,
              p_new_genus: nameChanged ? genus : null,
              p_new_type: type,
              p_origins: dbOrigins,
              p_user_id: window._currentUser ? window._currentUser.id : null
            };
            if (editKeyValue) {
              var encoder = new TextEncoder();
              var keyData = encoder.encode(editKeyValue);
              updatePromise = crypto.subtle.digest('SHA-256', keyData).then(function(buffer) {
                var hashArray = Array.from(new Uint8Array(buffer));
                rpcParams.p_edit_key_hash = hashArray.map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
                return sbClient.rpc('update_with_edit_key_hash', rpcParams);
              });
            } else {
              updatePromise = sbClient.rpc('update_with_edit_key_hash', rpcParams);
            }
            updatePromise = updatePromise.then(function(res) {
              if (res.error) throw new Error(res.error.message);
              var result = res.data;
              if (result && !result.success) throw new Error(result.error || 'Update failed');
            });
          } else if (sbClient) {
            // No edit key: update only origins (current behavior)
            if (nameChanged) {
              submitBtn.disabled = false;
              submitBtn.style.opacity = '';
              showToast('品種名を変更するには編集キーが必要です', true);
              return;
            }
            updatePromise = sbClient.from('cultivars')
              .update({ origins: dbOrigins })
              .eq('cultivar_name', editCultivarKey)
              .then(function(res) {
                if (res.error) throw new Error(res.error.message);
              });
          } else {
            updatePromise = Promise.resolve();
          }

          return updatePromise.then(function() {
            // Upload gallery images if any (use same uploadGalleryImage as new registration)
            if (editGalleryFiles.length > 0 && typeof window.uploadGalleryImage === 'function') {
              var existingDbCount = document.querySelectorAll('#contribute-preview .upload-preview__item[data-image-id]').length;
              return Promise.all(editGalleryFiles.map(function(file, fi) {
                return window.uploadGalleryImage(file, editGalleryName, editGalleryCaptions[fi] || '', editGalleryLinkUrls[fi] || '', existingDbCount + fi).catch(function(err) {
                  console.warn('Gallery image upload failed:', file.name, err);
                  return null;
                });
              }));
            }
            return Promise.resolve([]);
          });
        }).then(function() {
          // Update local data
          if (nameChanged) {
            // Move data to new key
            cultivarData[fullName] = existingData;
            delete cultivarData[editCultivarKey];
            existingData._type = type;
            // Update the cultivar row in the genus list
            var oldRow = document.querySelector('.cultivar-row__name[data-key="' + editCultivarKey.replace(/"/g, '\\"') + '"]');
            if (oldRow) {
              oldRow.setAttribute('data-key', fullName);
              var displayName = fullName.replace(' [Seedling]', '');
              oldRow.textContent = displayName;
            }
          }
          existingData.origins = updatedOrigins;
          if (updatedFormula) existingData.formula = updatedFormula;
          // Update derived local fields
          if (updatedFormula && updatedFormula.creatorName) {
            existingData._creatorName = updatedFormula.creatorName;
          } else {
            existingData._creatorName = null;
          }

          // Navigate back to cultivar detail
          var navKey = nameChanged ? fullName : editCultivarKey;
          var fakeRow = document.createElement('div');
          fakeRow.innerHTML = '<span class="badge badge--' + type + '"></span>';
          if (type === 'species') fakeRow.innerHTML = '<span class="badge badge--species"></span>';
          updateCultivarDetail(navKey, fakeRow);
          navigateTo('cultivar', { cultivar: navKey, _skipUpdate: true }, true);

          // Exit edit mode and reset
          window.exitEditMode();
          submitBtn.disabled = false;
          submitBtn.style.opacity = '';
          motherPhotoFile = null; fatherPhotoFile = null;
          showToast(t('toast_updated'));
        }).catch(function(err) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '';
          showToast('更新エラー: ' + (err.message || err), true);
        });
        return; // Don't continue to new registration logic
      }

      // Build data entry with structured fields
      var newEntry = { origins: [] };
      var isSeedling = type === 'seedling';
      newEntry._type = type;
      var autoBody = generateBodyFromStructured(structured);
      // Check if structured has any meaningful content
      var hasStructuredContent = autoBody || structured.notes || (structured.formula && structured.formula.parentA);

      if (hasStructuredContent) {
        // User provided structured origin
        var origin = {
          trust: isSeedling ? 50 : 30, trustClass: isSeedling ? 'trust--mid' : 'trust--low',
          body: autoBody,
          structured: structured,
          source_type: 'manual',
          sources: contributeSources.map(function(url) { return { icon: '\u{1F310}', text: url }; }),
          author: { isAI: false, name: 'User', date: new Date().toISOString().slice(0, 10) },
          votes: { agree: 0, disagree: 0 }
        };
      } else if (!isSeedling && type !== 'species') {
        // AI will fill in later (not for seedlings or species)
        // Species uses the AI auto-fill button before registration
        var origin = {
          trust: 0, trustClass: 'trust--low',
          body: t('ai_pending_origin'),
          structured: structured,
          sources: [],
          author: { isAI: true, name: 'AI (Pending)', date: new Date().toISOString().slice(0, 10) },
          votes: { agree: 0, disagree: 0 }
        };
      } else if (type === 'species') {
        // Species with no structured content: create empty manual origin
        var origin = {
          trust: 30, trustClass: 'trust--low',
          body: '',
          structured: structured,
          source_type: 'manual',
          sources: [],
          author: { isAI: false, name: 'User', date: new Date().toISOString().slice(0, 10) },
          votes: { agree: 0, disagree: 0 }
        };
      } else {
        // Seedling with minimal data
        var origin = hasStructuredContent ? null : {
          trust: 50, trustClass: 'trust--mid',
          body: '',
          structured: structured,
          source_type: 'manual',
          sources: [],
          author: { isAI: false, name: 'User', date: new Date().toISOString().slice(0, 10) },
          votes: { agree: 0, disagree: 0 }
        };
      }

      // Formula for backward compat (keep data.formula for buildFormulaHtml)
      if (structured.formula) {
        newEntry.formula = Object.assign({}, structured.formula);
      }
      // Creator name for seedlings (backward compat)
      if (type === 'seedling' && structured.breeder) {
        if (!newEntry.formula) newEntry.formula = {};
        newEntry.formula.creatorName = structured.breeder;
      }
      if (origin) newEntry.origins.push(origin);

      // Disable submit button to prevent double-click
      if (!rateLimit('contribute', 30000)) { showToast(t('rate_limit_submit'), true); return; }
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';

      // --- Helper: finish submit (add to UI, navigate, reset form) ---
      function finishSubmit() {
        // Store user info for poster name display
        if (window._currentUser) {
          newEntry._userId = window._currentUser.id;
          newEntry._posterName = (window._profileCache && window._profileCache[window._currentUser.id]) || window._currentUser.user_metadata && window._currentUser.user_metadata.full_name || window._currentUser.email || '名前未設定';
          newEntry._type = type;
        }
        cultivarData[fullName] = newEntry;

        // Add to data store and re-render genus page
        var slug = genus.toLowerCase();
        if (!_genusItems[slug]) _genusItems[slug] = [];
        _genusItems[slug].push({ fullName: fullName, entry: newEntry, meta: { genus: genus, type: type, created_at: new Date().toISOString(), user_id: newEntry._userId || null, id: newEntry._id || null } });
        var genusEl = document.getElementById('genus-' + slug);
        if (genusEl) {
          paginateGenus(genusEl, 1);
          // Update genus card count
          var genusCards = document.querySelectorAll('.genus-card');
          genusCards.forEach(function(card) {
            var g = card.getAttribute('data-genus');
            if (g === slug) {
              var countEl = card.querySelector('.genus-card__count');
              if (countEl) {
                var total = (_genusItems[slug] || []).filter(function(it) { return it.meta.type !== 'seedling'; }).length;
                countEl.textContent = total + (currentLang === 'en' ? ' Cultivars' : ' 品種');
              }
            }
          });
        }

        // Navigate to new cultivar detail
        var fakeRow = document.createElement('div');
        fakeRow.innerHTML = '<span class="badge badge--' + type + '"></span>';
        if (type === 'species') fakeRow.innerHTML = '<span class="badge badge--species"></span>';
        updateCultivarDetail(fullName, fakeRow);
        navigateTo('cultivar', { cultivar: fullName, _skipUpdate: true }, true);

        // Reset form
        if (contributeName) contributeName.value = '';
        if (contributeDesc) contributeDesc.value = '';
        if (contributeGenus) contributeGenus.selectedIndex = 0;
        var speciesRadio = document.querySelector('#page-contribute input[name="cultivar-type"][value="species"]');
        if (speciesRadio) { speciesRadio.checked = true; speciesRadio.dispatchEvent(new Event('change')); }
        if (formulaParentA) formulaParentA.value = '';
        if (formulaParentB) formulaParentB.value = '';
        if (hybridFormulaA) hybridFormulaA.value = '';
        if (hybridFormulaB) hybridFormulaB.value = '';
        if (seedlingFormulaA) seedlingFormulaA.value = '';
        if (seedlingFormulaB) seedlingFormulaB.value = '';
        ['sf-author-name','sf-publication-year','sf-collector','sf-collection-year','sf-type-locality','sf-known-habitats',
         'sf-clone-namer','sf-clone-naming-year','sf-hybrid-breeder','sf-hybrid-naming-year','sf-sowing-date'].forEach(function(id) {
          var el = document.getElementById(id); if (el) el.value = '';
        });
        if (contributeSourceInput) contributeSourceInput.value = '';
        contributeSources = [];
        renderContributeSources();
        if (duplicateAlert) duplicateAlert.style.display = 'none';
        window._aiAutofillUsed = false;
        if (typeof window.resetContributeImages === 'function') window.resetContributeImages();
        motherPhotoFile = null; fatherPhotoFile = null;
        ['mother', 'father'].forEach(function(p) {
          var inp = document.getElementById(p + '-photo-input');
          var prev = document.getElementById(p + '-preview');
          var area = document.getElementById(p + '-upload');
          if (inp) inp.value = '';
          if (prev) prev.innerHTML = '';
          if (area) area.style.display = '';
        });
        var parentPhotosSection = document.getElementById('parent-photos-section');
        if (parentPhotosSection) parentPhotosSection.style.display = 'none';
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
        showToast(t('submit_success'));
      }

      function handleSubmitError(msg) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
        showToast(msg, true);
      }

      // --- Upload parent photos first (seedlings), then save to DB ---
      var photoUploadPromise;
      var sbClient = window._supabaseClient;
      if (isSeedling && sbClient && (motherPhotoFile || fatherPhotoFile)) {
        var uploadParentPhoto = function(file, role) {
          if (!file) return Promise.resolve(null);
          return window.compressImage(file).then(function(compressed) {
            var path = 'seedling-parents/' + fullName.replace(/[^a-zA-Z0-9]/g, '_') + '/' + role + '_' + Date.now() + '.jpg';
            return sbClient.storage.from('gallery-images').upload(path, compressed, { contentType: 'image/jpeg', upsert: true }).then(function(res) {
              if (res.error) { console.warn('Parent photo upload error:', res.error); return null; }
              return path;
            });
          });
        };
        photoUploadPromise = Promise.all([
          uploadParentPhoto(motherPhotoFile, 'mother'),
          uploadParentPhoto(fatherPhotoFile, 'father')
        ]).then(function(paths) {
          if (paths[0] || paths[1]) {
            if (!newEntry.formula) newEntry.formula = {};
            if (paths[0]) newEntry.formula.motherPhoto = paths[0];
            if (paths[1]) newEntry.formula.fatherPhoto = paths[1];
          }
        }).catch(function(err) {
          console.warn('Parent photo upload failed:', err);
          showToast(t('toast_parent_photo_failed'), true);
        });
      } else {
        photoUploadPromise = Promise.resolve();
      }

      // Grab gallery files before any async operations
      var galleryFiles = typeof window.getContributeFiles === 'function' ? window.getContributeFiles() : [];
      var galleryCaptions = typeof window.getContributeCaptions === 'function' ? window.getContributeCaptions() : [];
      var galleryLinkUrls = typeof window.getContributeLinkUrls === 'function' ? window.getContributeLinkUrls() : [];
      // Gallery uses display name (without [Seedling]) to match h1 and detail page
      var galleryName = fullName.replace(' [Seedling]', '');

      // Get edit key value for new registration
      var editKeyInput = document.getElementById('edit-key-input');
      var editKeyValue = editKeyInput ? editKeyInput.value.trim() : '';

      // After parent photos are ready, save to DB, upload gallery images, then update UI
      photoUploadPromise.then(function() {
        return addUserCultivar(fullName, newEntry, { genus: genus, type: type }, editKeyValue || null);
      }).then(function() {
        // Upload gallery images after DB record exists
        if (galleryFiles.length > 0 && typeof window.uploadGalleryImage === 'function') {
          return Promise.all(galleryFiles.map(function(file, fi) {
            return window.uploadGalleryImage(file, galleryName, galleryCaptions[fi] || '', galleryLinkUrls[fi] || '', fi).catch(function(err) {
              console.warn('Gallery image upload failed:', file.name, err);
              return null;
            });
          }));
        }
      }).then(function() {
        try {
          finishSubmit();
        } catch (finishErr) {
          console.error('finishSubmit error:', finishErr);
          showToast(t('toast_submit_error'), true);
        }
        if (typeof window.loadCultivarThumbnails === 'function') {
          setTimeout(window.loadCultivarThumbnails, 500);
        }
      }).catch(function(err) {
        console.error('Submit error details:', err);
        handleSubmitError('エラー: ' + (err.message || err));
      });
    });
  }
})();

// ========================================
// ADD ORIGIN INLINE FORM (Cultivar detail page)
// ========================================
(function() {
  var originForm = document.getElementById('add-origin-form');
  var submitOriginBtn = originForm ? originForm.querySelector('.btn--primary') : null;
  var cancelOriginBtn = document.getElementById('btn-cancel-origin');
  var originSources = [];

  // Source add button in origin form
  var sourceAddBtn = originForm ? originForm.querySelector('.btn--secondary') : null;
  var sourceInput = originForm ? originForm.querySelector('input[type="url"]') : null;

  if (sourceAddBtn && sourceInput) {
    sourceAddBtn.addEventListener('click', function(e) {
      e.preventDefault();
      var url = sourceInput.value.trim();
      if (!url) return;
      if (!/^https?:\/\/.+/i.test(url)) { showToast(t('toast_url_invalid'), true); return; }
      originSources.push(url);
      sourceInput.value = '';
      // Visual feedback - show added sources
      var hint = sourceAddBtn.parentElement.nextElementSibling;
      if (!hint || !hint.classList.contains('origin-source-list')) {
        hint = document.createElement('div');
        hint.className = 'origin-source-list';
        sourceAddBtn.parentElement.after(hint);
      }
      hint.innerHTML = '';
      originSources.forEach(function(u, i) {
        hint.innerHTML += '<div class="text-sm mt-xs">' + escHtml(u) + ' <span class="cursor-pointer text-dark" data-remove-origin-src="' + i + '">&times;</span></div>';
      });
    });
  }

  // Remove source in origin form
  if (originForm) {
    originForm.addEventListener('click', function(e) {
      var rm = e.target.getAttribute('data-remove-origin-src');
      if (rm !== null) {
        originSources.splice(parseInt(rm, 10), 1);
        var list = originForm.querySelector('.origin-source-list');
        if (list) {
          list.innerHTML = '';
          originSources.forEach(function(u, i) {
            list.innerHTML += '<div class="text-sm mt-xs">' + escHtml(u) + ' <span class="cursor-pointer text-dark" data-remove-origin-src="' + i + '">&times;</span></div>';
          });
        }
      }
    });
  }

  // Submit origin
  if (submitOriginBtn) {
    submitOriginBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (!rateLimit('add_origin', 15000)) { showToast(t('rate_limit_wait'), true); return; }
      var desc = originForm.querySelector('.form-textarea');
      var descText = desc ? desc.value.trim() : '';

      // Get current cultivar
      var cultivarPage = document.getElementById('page-cultivar');
      var h1 = cultivarPage ? cultivarPage.querySelector('h1') : null;
      var cultivarName = h1 ? h1.textContent : '';
      var cData = cultivarData[cultivarName] || cultivarData[cultivarName + ' [Seedling]'];
      if (!cultivarName || !cData) return;
      var cType = cData._type || 'species';

      // Build structured data from inline form
      var aoStructured = { origin_type: cType, notes: descText };
      if (cType === 'species') {
        var v;
        v = document.getElementById('ao-author-name'); if (v && v.value.trim()) aoStructured.author_name = v.value.trim();
        v = document.getElementById('ao-publication-year'); if (v && v.value) aoStructured.publication_year = parseInt(v.value, 10) || null;
        v = document.getElementById('ao-collector'); if (v && v.value.trim()) aoStructured.collector = v.value.trim();
        v = document.getElementById('ao-collection-year'); if (v && v.value) aoStructured.collection_year = parseInt(v.value, 10) || null;
        v = document.getElementById('ao-type-locality'); if (v && v.value.trim()) aoStructured.type_locality = v.value.trim();
        v = document.getElementById('ao-known-habitats'); if (v && v.value.trim()) aoStructured.known_habitats = v.value.trim();
      } else if (cType === 'clone') {
        var v;
        v = document.getElementById('ao-clone-namer'); if (v && v.value.trim()) aoStructured.namer = v.value.trim();
        v = document.getElementById('ao-clone-naming-year'); if (v && v.value) aoStructured.naming_year = parseInt(v.value, 10) || null;
        var pA = document.getElementById('ao-clone-parentA'), pB = document.getElementById('ao-clone-parentB');
        if (pA && pB && pA.value.trim() && pB.value.trim()) aoStructured.formula = { parentA: pA.value.trim(), parentB: pB.value.trim() };
      } else if (cType === 'hybrid') {
        var v;
        v = document.getElementById('ao-hybrid-breeder'); if (v && v.value.trim()) aoStructured.breeder = v.value.trim();
        v = document.getElementById('ao-hybrid-naming-year'); if (v && v.value) aoStructured.naming_year = parseInt(v.value, 10) || null;
        var pA = document.getElementById('ao-hybrid-parentA'), pB = document.getElementById('ao-hybrid-parentB');
        if (pA && pB && pA.value.trim() && pB.value.trim()) aoStructured.formula = { parentA: pA.value.trim(), parentB: pB.value.trim() };
      } else if (cType === 'seedling') {
        var v;
        v = document.getElementById('ao-seedling-breeder'); if (v && v.value.trim()) aoStructured.breeder = v.value.trim();
        v = document.getElementById('ao-sowing-date'); if (v && v.value) aoStructured.sowing_date = v.value;
        var pA = document.getElementById('ao-seedling-parentA'), pB = document.getElementById('ao-seedling-parentB');
        if (pA && pB && pA.value.trim() && pB.value.trim()) aoStructured.formula = { parentA: pA.value.trim(), parentB: pB.value.trim() };
      }
      if (originSources.length > 0) {
        aoStructured.citation_links = originSources.map(function(url) { return { url: url }; });
      }

      // Auto-generate body for backward compat
      var bodyParts = [];
      if (aoStructured.author_name) bodyParts.push('発表者: ' + aoStructured.author_name);
      if (aoStructured.collector) bodyParts.push('発見者: ' + aoStructured.collector);
      if (aoStructured.type_locality) bodyParts.push('採取地: ' + aoStructured.type_locality);
      if (aoStructured.breeder || aoStructured.namer) bodyParts.push((aoStructured.breeder || aoStructured.namer));
      if (aoStructured.formula) bodyParts.push(aoStructured.formula.parentA + ' × ' + aoStructured.formula.parentB);
      if (descText) bodyParts.push(descText);
      var autoBody = bodyParts.join('. ');

      // Require at least some content
      if (!autoBody && !descText) { showToast(t('origin_desc_required'), true); return; }

      var pA = aoStructured.formula ? aoStructured.formula.parentA : '';
      var pB = aoStructured.formula ? aoStructured.formula.parentB : '';

      var newOrigin = {
        trust: 25, trustClass: 'trust--low',
        body: autoBody,
        structured: aoStructured,
        source_type: 'manual',
        sources: originSources.map(function(url) { return { icon: '\u{1F310}', text: url }; }),
        author: { isAI: false, name: 'User', date: new Date().toISOString().slice(0, 10) },
        votes: { agree: 0, disagree: 0 }
      };

      cData.origins.push(newOrigin);
      if (pA && pB && !cData.formula) {
        cData.formula = { parentA: pA, parentB: pB };
      }

      renderOrigins(cultivarName);

      // Disable submit to prevent double submission
      if (submitOriginBtn) { submitOriginBtn.disabled = true; submitOriginBtn.style.opacity = '0.5'; }

      // Persist to Supabase via RPC (bypasses RLS UPDATE restriction)
      var _sb = window._supabaseClient;
      if (_sb) {
        var originToSave = JSON.parse(JSON.stringify(newOrigin));
        // Also include formula as a separate origin entry if provided
        var originsToAppend = [originToSave];
        if (pA && pB) {
          originsToAppend.push({ _type: 'formula', formula: { parentA: pA, parentB: pB } });
        }
        // Append each origin via RPC (with IP tracking)
        var savePromises = getUserIp().then(function(userIp) {
          return Promise.all(originsToAppend.map(function(o) {
            return _sb.rpc('append_origin', {
              p_cultivar_name: cultivarName,
              p_origin: o,
              p_ip: userIp
            });
          }));
        });
        savePromises.then(function(results) {
          if (submitOriginBtn) { submitOriginBtn.disabled = false; submitOriginBtn.style.opacity = ''; }
          var failed = results.filter(function(r) { return r.error; });
          if (failed.length > 0) {
            console.error('Failed to save origin to DB:', failed[0].error);
            showToast(t('toast_db_save_failed'), true);
          } else {
            // Trigger AI verification for CLONE/hybrid after origin is saved
            var cData = cultivarData[cultivarName];
            var cType = cData && cData._type;
            if ((cType === 'clone' || cType === 'hybrid') && descText && cData && cData._id) {
              var srcUrls = originSources.slice();
              triggerAIResearch(cData._id, cData._genus || '', cultivarName, cType, [], descText, srcUrls);
              showToast('AI検証を開始しました');
            }
          }
        });
      }

      // Reset form
      if (desc) desc.value = '';
      originSources = [];
      var list = originForm.querySelector('.origin-source-list');
      if (list) list.innerHTML = '';
      // Clear all inline structured fields
      ['ao-author-name','ao-publication-year','ao-collector','ao-collection-year','ao-type-locality','ao-known-habitats',
       'ao-clone-namer','ao-clone-naming-year','ao-clone-parentA','ao-clone-parentB',
       'ao-hybrid-breeder','ao-hybrid-naming-year','ao-hybrid-parentA','ao-hybrid-parentB',
       'ao-seedling-breeder','ao-sowing-date','ao-seedling-parentA','ao-seedling-parentB'].forEach(function(id) {
        var el = document.getElementById(id); if (el) el.value = '';
      });

      // Hide form, show button
      originForm.style.display = 'none';
      var toggle = document.getElementById('add-origin-toggle');
      if (toggle) toggle.style.display = 'block';

      showToast(t('origin_added'));
    });
  }
})();

// ========================================
// UPDATE paginateGenus to use t()
// Override paginateGenus count text to use t()
var _origPaginate = paginateGenus;
paginateGenus = function(genusEl, page) {
  _origPaginate(genusEl, page);
  var countEl = genusEl.querySelector('.text-muted.mb-lg');
  if (countEl) {
    var slug = genusEl.id.replace('genus-', '');
    var allItems = _genusItems[slug] || [];
    var scope = getActiveView(genusEl);
    var isSeedling = scope.getAttribute('data-genus-view') === 'seedlings';
    var totalCount = allItems.filter(function(it) { return isSeedling ? it.meta.type === 'seedling' : it.meta.type !== 'seedling'; }).length;
    var filtered = getFilteredItems(genusEl);
    var input = scope.querySelector('.search-bar__input');
    if (input && input.value.trim()) {
      countEl.textContent = t('search_hit').replace('{n}', filtered.length).replace('{total}', totalCount);
    } else {
      countEl.textContent = totalCount + ' ' + t('cultivars_registered');
    }
  }
};

// Override globalSearch to use t() — delegates to _origGlobalSearch for full logic
var _origGlobalSearch = globalSearch;
globalSearch = function(query) {
  _origGlobalSearch(query);
  // Apply translated title after original function sets it
  var title = document.getElementById('search-title');
  if (title) title.textContent = t('search_title_tpl').replace('{q}', query);
};

// Re-initialize pagination with translated text
document.querySelectorAll('.genus-content').forEach(function(g) {
  paginateGenus(g, 1);
});

// ========================================
// AFFILIATE LINKS
// ========================================
var affiliateProducts = [];

// Load affiliates from Supabase
(async function() {
  try {
    var sbAff = window._supabaseClient;
    if (!sbAff) throw new Error('No supabase client');
    var result = await sbAff.from('affiliates').select('*').eq('is_published', true).order('sort_order');
    if (result.data && result.data.length > 0) {
      affiliateProducts = result.data.map(function(a) {
        // Extract direct image URL from rakuten tracking URL (hbb.afl.rakuten.co.jp)
        var imgUrl = a.image || '';
        if (imgUrl.indexOf('hbb.afl.rakuten.co.jp') > -1) {
          try { var pc = new URL(imgUrl).searchParams.get('pc'); if (pc) imgUrl = pc; } catch(e) {}
        }
        return {
          name: a.name, nameEn: a.name_en || a.name,
          productName: a.product_name, productNameEn: a.product_name_en || a.product_name,
          image: imgUrl, icon: a.icon || '🛒',
          badge: a.badge || '', badgeEn: a.badge_en || '',
          rakuten: a.rakuten || '', amazon: a.amazon || '', yahoo: a.yahoo || ''
        };
      });
    }
  } catch (e) { console.warn('Affiliate load error:', e); }
  // Render after load
  renderAffiliateBanner('top-affiliate-grid');
  document.querySelectorAll('.genus-affiliate-grid').forEach(function(grid) {
    renderAffiliateBanner(grid);
  });
})();

// Render affiliate cards in banner style
function renderAffiliateBanner(containerOrId, options) {
  var container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
  if (!container) return;
  options = options || {};

  var html = '';
  affiliateProducts.forEach(function(product, index) {
    var catName = currentLang === 'en' ? product.nameEn : product.name;
    var prodName = currentLang === 'en' ? (product.productNameEn || product.nameEn) : (product.productName || product.name);
    var badge = currentLang === 'en' ? product.badgeEn : product.badge;
    html += '<div class="affiliate-card">';
    if (options.showRecommend && index === 0) {
      html += '<span class="affiliate-card__recommend">' + (currentLang === 'en' ? 'Pick' : 'おすすめ') + '</span>';
    }
    if (product.image) {
      html += '<a href="' + product.rakuten + '" target="_blank" rel="nofollow sponsored noopener">';
      html += '<img class="affiliate-card__image" src="' + product.image + '" alt="' + prodName + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.parentElement.insertAdjacentHTML(\'afterend\',\'<span class=affiliate-card__icon>' + (product.icon || '🛒') + '</span>\')">';
      html += '</a>';
    } else {
      html += '<span class="affiliate-card__icon">' + product.icon + '</span>';
    }
    html += '<div class="affiliate-card__category">' + catName + '</div>';
    html += '<div class="affiliate-card__name">' + prodName + '</div>';
    if (badge) html += '<span class="affiliate-card__badge">' + badge + '</span>';
    html += '<div class="affiliate-card__shops">';
    html += '<a href="' + product.rakuten + '" class="affiliate-card__shop affiliate-card__shop--rakuten" target="_blank" rel="nofollow sponsored noopener">楽天</a>';
    html += '<a href="' + product.amazon + '" class="affiliate-card__shop affiliate-card__shop--amazon" target="_blank" rel="nofollow sponsored noopener">Amazon</a>';
    html += '<a href="' + product.yahoo + '" class="affiliate-card__shop affiliate-card__shop--yahoo" target="_blank" rel="nofollow sponsored noopener">Yahoo!</a>';
    html += '</div>';
    html += '</div>';
  });
  container.innerHTML = html;
  // Fallback: if images don't load within 5s, show icon instead
  setTimeout(function() {
    container.querySelectorAll('.affiliate-card__image').forEach(function(img) {
      if (!img.naturalWidth) {
        img.style.display = 'none';
        if (!img.parentElement.querySelector('.affiliate-card__icon')) {
          img.parentElement.insertAdjacentHTML('afterend', '<span class="affiliate-card__icon">\uD83D\uDED2</span>');
        }
      }
    });
  }, 5000);
}

// Add affiliate banner containers to all genus pages (data filled by async loader above)
document.querySelectorAll('.genus-content').forEach(function(genusEl) {
  var section = document.createElement('div');
  section.className = 'affiliate-section mt-lg';
  section.innerHTML = '<div class="affiliate-banner">' +
    '<div class="affiliate-banner__title" data-i18n="affiliate_top_title">' + t('affiliate_top_title') + '</div>' +
    '<div class="affiliate-banner__grid genus-affiliate-grid"></div>' +
    '<p class="affiliate-notice" data-i18n="affiliate_notice">' + t('affiliate_notice') + '</p>' +
    '</div>';
  genusEl.appendChild(section);
});

// Hook into updateCultivarDetail
var _origUpdateDetail = updateCultivarDetail;
updateCultivarDetail = function(cultivarName, rowEl) {
  _origUpdateDetail(cultivarName, rowEl);
  renderAffiliateBanner('affiliate-links-grid', { showRecommend: true });
  // Restore gallery images for this cultivar
  if (typeof window.renderGalleryForCultivar === 'function') {
    window.renderGalleryForCultivar(cultivarName);
  }
};

// ========================================
// IMAGE UPLOAD
// ========================================
(function() {
  var MAX_SIZE = 20 * 1024 * 1024; // 20MB
  var ALLOWED_TYPES = ['image/jpeg', 'image/png'];
  var GALLERY_STORAGE_KEY = 'plants-story-gallery-images';
  var VOTE_STORAGE_KEY = 'plants-story-image-votes';
  var BUCKET_NAME = 'gallery-images';

  function getSupabase() { return window._supabaseClient || null; }
  function getSupabaseUrl() { return window._SUPABASE_URL || ''; }

  // Compress image using Canvas API (preserves aspect ratio)
  function compressImage(file, maxLongSide, quality) {
    maxLongSide = maxLongSide || 2048;
    quality = quality || 0.9;
    return new Promise(function(resolve, reject) {
      var img = new Image();
      img.onload = function() {
        var w = img.width;
        var h = img.height;
        // Resize if longer side exceeds maxLongSide
        if (Math.max(w, h) > maxLongSide) {
          if (w > h) {
            h = Math.round(h * maxLongSide / w);
            w = maxLongSide;
          } else {
            w = Math.round(w * maxLongSide / h);
            h = maxLongSide;
          }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        // Prefer WebP for smaller file sizes, fallback to JPEG
        var useWebP = typeof canvas.toBlob === 'function';
        if (useWebP) {
          canvas.toBlob(function(webpBlob) {
            if (webpBlob && webpBlob.type === 'image/webp') {
              resolve(new File([webpBlob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' }));
            } else {
              // Browser doesn't support WebP encoding, fallback to JPEG
              canvas.toBlob(function(jpgBlob) {
                if (!jpgBlob) { reject(new Error('Compression failed')); return; }
                resolve(new File([jpgBlob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
              }, 'image/jpeg', quality);
            }
          }, 'image/webp', quality);
        } else {
          reject(new Error('Compression not supported'));
        }
      };
      img.onerror = function() { reject(new Error('Failed to load image')); };
      img.src = URL.createObjectURL(file);
    });
  }
  window.compressImage = compressImage; // Expose for parent photo uploads

  function validateFile(file) {
    if (ALLOWED_TYPES.indexOf(file.type) === -1) {
      showToast(t('upload_error_type'), true);
      return false;
    }
    if (file.size > MAX_SIZE) {
      showToast(t('upload_error_size'), true);
      return false;
    }
    return true;
  }

  // --- localStorage fallback ---
  function getGalleryStore() {
    try { return JSON.parse(localStorage.getItem(GALLERY_STORAGE_KEY) || '{}'); } catch(e) { return {}; }
  }
  function saveGalleryImageLocal(cultivarName, dataUrl) {
    var store = getGalleryStore();
    if (!store[cultivarName]) store[cultivarName] = [];
    store[cultivarName].push(dataUrl);
    safeLSSet(GALLERY_STORAGE_KEY, JSON.stringify(store));
  }
  function removeGalleryImageLocal(cultivarName, index) {
    var store = getGalleryStore();
    if (store[cultivarName]) {
      store[cultivarName].splice(index, 1);
      if (store[cultivarName].length === 0) delete store[cultivarName];
      safeLSSet(GALLERY_STORAGE_KEY, JSON.stringify(store));
    }
  }
  function getGalleryImagesLocal(cultivarName) {
    var store = getGalleryStore();
    return store[cultivarName] || [];
  }

  // --- Vote tracking (prevent duplicate votes) ---
  function getVotedImages() {
    try { return JSON.parse(localStorage.getItem(VOTE_STORAGE_KEY) || '{}'); } catch(e) { return {}; }
  }
  function markVoted(imageId, voteType) {
    var voted = getVotedImages();
    voted[imageId] = voteType;
    localStorage.setItem(VOTE_STORAGE_KEY, JSON.stringify(voted));
  }
  function getVote(imageId) {
    return getVotedImages()[imageId] || null;
  }

  // --- Supabase Storage helpers ---
  function getPublicUrl(storagePath) {
    return getSupabaseUrl() + '/storage/v1/object/public/' + BUCKET_NAME + '/' + storagePath;
  }

  function uploadToSupabase(file, cultivarName, caption, linkUrl, displayOrder) {
    var sb = getSupabase();
    if (!sb) return Promise.reject('No Supabase');
    var safeName = cultivarName.replace(/[^a-zA-Z0-9_' -]/g, '_');
    return Promise.all([compressImage(file), getUserIp()]).then(function(results) {
      var compressed = results[0];
      var userIp = results[1];
      var ext = 'jpg';
      var path = safeName + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
      return sb.storage.from(BUCKET_NAME).upload(path, compressed, {
        contentType: 'image/jpeg',
        upsert: false
      }).then(function(res) {
        if (res.error) throw res.error;
        var row = {
          cultivar_name: cultivarName,
          storage_path: path
        };
        if (caption) row.caption = caption;
        if (linkUrl) row.link_url = linkUrl;
        if (userIp) row.created_ip = userIp;
        if (typeof displayOrder === 'number') row.display_order = displayOrder;
        return sb.from('cultivar_images').insert(row).select().then(function(dbRes) {
          if (dbRes.error) throw dbRes.error;
          return dbRes.data[0];
        });
      });
    });
  }

  window.uploadGalleryImage = uploadToSupabase;

  function fetchImagesFromSupabase(cultivarName) {
    var sb = getSupabase();
    if (!sb) return Promise.reject('No Supabase');
    return sb.from('cultivar_images')
      .select('*')
      .eq('cultivar_name', cultivarName)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(function(res) {
        if (res.error) throw res.error;
        return res.data || [];
      });
  }

  function deleteImageFromSupabase(imageId, storagePath) {
    var sb = getSupabase();
    if (!sb) return Promise.reject('No Supabase');
    return sb.storage.from(BUCKET_NAME).remove([storagePath]).then(function() {
      return sb.from('cultivar_images').delete().eq('id', imageId);
    });
  }

  function voteImage(imageId, voteType) {
    var sb = getSupabase();
    if (!sb) return Promise.reject('No Supabase');
    var prev = getVote(imageId);
    if (prev === voteType) return Promise.resolve(); // already voted same
    // Build update: increment new vote, decrement old if switching
    return sb.from('cultivar_images').select('real_votes, fake_votes').eq('id', imageId).single().then(function(res) {
      if (res.error) throw res.error;
      var updates = {};
      if (voteType === 'real') updates.real_votes = (res.data.real_votes || 0) + 1;
      if (voteType === 'fake') updates.fake_votes = (res.data.fake_votes || 0) + 1;
      if (prev === 'real') updates.real_votes = Math.max(0, (res.data.real_votes || 0) - 1);
      if (prev === 'fake') updates.fake_votes = Math.max(0, (res.data.fake_votes || 0) - 1);
      return sb.from('cultivar_images').update(updates).eq('id', imageId);
    }).then(function() {
      markVoted(imageId, voteType);
    });
  }

  // --- Create gallery item DOM ---
  function createGalleryItem(src, opts) {
    // opts: { imageId, storagePath, realVotes, fakeVotes, isLocal, localIdx, caption, linkUrl }
    var item = document.createElement('div');
    item.className = 'gallery__item';
    item.setAttribute('data-user-upload', 'true');
    if (opts.imageId) item.setAttribute('data-image-id', opts.imageId);
    if (opts.storagePath) item.setAttribute('data-storage-path', opts.storagePath);
    if (opts.isLocal) item.setAttribute('data-gallery-idx', opts.localIdx);
    var realVotes = opts.realVotes || 0;
    var fakeVotes = opts.fakeVotes || 0;
    var votedAs = opts.imageId ? getVote(opts.imageId) : null;
    var realActive = votedAs === 'real' ? ' vote-btn--active' : '';
    var fakeActive = votedAs === 'fake' ? ' vote-btn--active-down' : '';
    var caption = opts.caption || '';
    var linkUrl = opts.linkUrl || '';
    var hasOverlay = caption || linkUrl;
    var overlayHtml = '';
    if (hasOverlay) {
      overlayHtml = '<div class="gallery__overlay">';
      if (caption) overlayHtml += '<div class="gallery__overlay-caption">' + caption.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
      if (linkUrl) {
        var displayLink = linkUrl.replace(/^https?:\/\//, '').substring(0, 40);
        overlayHtml += '<div class="gallery__overlay-link"><a href="' + linkUrl.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener">🔗 ' + displayLink.replace(/</g, '&lt;') + '</a></div>';
      }
      overlayHtml += '</div>';
    }
    item.innerHTML =
      '<div class="gallery__img"><img src="' + src + '" class="gallery__img-full" loading="lazy">' + overlayHtml + '</div>' +
      '<div class="gallery__actions">' +
        '<div class="vote-group">' +
          '<button class="vote-btn' + realActive + '" data-vote="real"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z"/></svg><span class="vote-btn__badge">' + realVotes + '</span></button>' +
          '<button class="vote-btn vote-btn--down' + fakeActive + '" data-vote="fake"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V2"/><path d="M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z"/></svg><span class="vote-btn__badge">' + fakeVotes + '</span></button>' +
        '</div>' +
        '<a class="gallery__delete">' + t('request_delete') + '</a>' +
      '</div>';
    // Tap to toggle overlay
    if (hasOverlay) {
      var imgDiv = item.querySelector('.gallery__img');
      var overlay = item.querySelector('.gallery__overlay');
      imgDiv.addEventListener('click', function(e) {
        // Don't toggle if clicking on the link itself
        if (e.target.closest('.gallery__overlay-link a')) return;
        overlay.classList.toggle('gallery__overlay--visible');
      });
    }
    return item;
  }

  // --- Render gallery for a specific cultivar ---
  window.renderGalleryForCultivar = function(cultivarName) {
    cultivarName = cultivarName.replace(' [Seedling]', '');
    var galleryUpload = document.getElementById('gallery-upload');
    if (!galleryUpload) return;
    var gallery = galleryUpload.parentNode;

    // Remove all user-uploaded items
    gallery.querySelectorAll('.gallery__item[data-user-upload]').forEach(function(el) {
      el.remove();
    });

    var sb = getSupabase();
    if (sb) {
      // Fetch from Supabase
      fetchImagesFromSupabase(cultivarName).then(function(images) {
        // Check cultivar hasn't changed while loading
        var detailPage = document.getElementById('page-cultivar');
        var h1 = detailPage ? detailPage.querySelector('h1') : null;
        if (!h1 || h1.textContent !== cultivarName) return;

        images.forEach(function(img) {
          var url = getPublicUrl(img.storage_path);
          var item = createGalleryItem(url, {
            imageId: img.id,
            storagePath: img.storage_path,
            realVotes: img.real_votes,
            fakeVotes: img.fake_votes,
            caption: img.caption,
            linkUrl: img.link_url
          });
          gallery.insertBefore(item, galleryUpload);
        });
        galleryCarouselIdx = 0;
        updateGalleryCarousel();
      }).catch(function(err) {
        console.warn('Failed to load gallery from Supabase, falling back to localStorage:', err);
        renderLocalGallery(cultivarName, gallery, galleryUpload);
      });
    } else {
      renderLocalGallery(cultivarName, gallery, galleryUpload);
    }
  };

  function renderLocalGallery(cultivarName, gallery, galleryUpload) {
    var images = getGalleryImagesLocal(cultivarName);
    images.forEach(function(src, i) {
      var item = createGalleryItem(src, { isLocal: true, localIdx: i });
      gallery.insertBefore(item, galleryUpload);
    });
    galleryCarouselIdx = 0;
    updateGalleryCarousel();
  }

  // --- Gallery Carousel ---
  var galleryCarouselIdx = 0;
  function updateGalleryCarousel() {
    var gallery = document.querySelector('#gallery-carousel .gallery');
    if (!gallery) return;
    var items = gallery.querySelectorAll('.gallery__item[data-user-upload]');
    var prevBtn = document.getElementById('gallery-prev');
    var nextBtn = document.getElementById('gallery-next');
    var counter = document.getElementById('gallery-counter');
    var total = items.length;

    if (total <= 1) {
      // Hide arrows and counter for 0-1 images
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (counter) counter.style.display = 'none';
      // Show the single image or placeholder
      items.forEach(function(item) { item.style.display = ''; });
      gallery.querySelectorAll('.gallery__empty').forEach(function(el) {
        el.style.display = total === 0 ? '' : 'none';
      });
      return;
    }

    // Clamp index
    if (galleryCarouselIdx >= total) galleryCarouselIdx = 0;
    if (galleryCarouselIdx < 0) galleryCarouselIdx = total - 1;

    // Hide all, show current
    items.forEach(function(item, i) {
      item.style.display = i === galleryCarouselIdx ? '' : 'none';
    });
    // Hide empty state
    gallery.querySelectorAll('.gallery__empty').forEach(function(el) {
      el.style.display = 'none';
    });

    // Show arrows and counter
    if (prevBtn) prevBtn.style.display = '';
    if (nextBtn) nextBtn.style.display = '';
    if (counter) { counter.style.display = ''; counter.textContent = (galleryCarouselIdx + 1) + ' / ' + total; }
  }

  document.getElementById('gallery-prev').addEventListener('click', function() {
    galleryCarouselIdx--;
    updateGalleryCarousel();
  });
  document.getElementById('gallery-next').addEventListener('click', function() {
    galleryCarouselIdx++;
    updateGalleryCarousel();
  });

  // --- Gallery Upload (cultivar detail page) ---
  var galleryUpload = document.getElementById('gallery-upload');
  var galleryInput = document.getElementById('gallery-file-input');

  // Hide the in-carousel upload area (replaced by external button)
  if (galleryUpload) galleryUpload.style.display = 'none';

  // External "画像追加" button triggers the same file input
  var detailAddPhotoBtn = document.getElementById('detail-add-photo-btn');
  if (detailAddPhotoBtn && galleryInput) {
    detailAddPhotoBtn.addEventListener('click', function() {
      galleryInput.click();
    });
  }

  // Empty state glass card click → trigger file upload (non-seedling only)
  var emptyGlass = document.querySelector('.gallery__empty-glass');
  if (emptyGlass && galleryInput) {
    emptyGlass.addEventListener('click', function() {
      galleryInput.click();
    });
  }

  if (galleryUpload && galleryInput) {
    galleryUpload.addEventListener('click', function(e) {
      if (e.target === galleryInput) return;
      galleryInput.click();
    });

    galleryInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file || !validateFile(file)) { this.value = ''; return; }

      var detailPage = document.getElementById('page-cultivar');
      var h1 = detailPage ? detailPage.querySelector('h1') : null;
      var cultivarName = h1 ? h1.textContent : '';
      if (!cultivarName) return;

      // Prompt for caption and link
      var caption = prompt('画像の補足（日付等）を入力してください（任意）：') || '';
      var linkUrl = prompt('リンクURL（Instagram等）を入力してください（任意）：') || '';

      var sb = getSupabase();
      if (sb) {
        uploadToSupabase(file, cultivarName, caption.trim(), linkUrl.trim()).then(function() {
          renderGalleryForCultivar(cultivarName);
          if (typeof loadCultivarThumbnails === 'function') loadCultivarThumbnails();
        }).catch(function(err) {
          console.warn('Supabase upload failed, saving locally:', err);
          var reader = new FileReader();
          reader.onload = function(e) {
            saveGalleryImageLocal(cultivarName, e.target.result);
            renderGalleryForCultivar(cultivarName);
          };
          reader.readAsDataURL(file);
        });
      } else {
        var reader = new FileReader();
        reader.onload = function(e) {
          saveGalleryImageLocal(cultivarName, e.target.result);
          renderGalleryForCultivar(cultivarName);
        };
        reader.readAsDataURL(file);
      }
      this.value = '';
    });

    // Handle vote and delete clicks
    galleryUpload.parentNode.addEventListener('click', function(e) {
      // --- Vote handling ---
      var voteBtn = e.target.closest('.vote-btn[data-vote]');
      if (voteBtn) {
        if (!rateLimit('image_vote', 3000)) { showToast(t('rate_limit_wait'), true); return; }
        var item = voteBtn.closest('.gallery__item[data-user-upload]');
        if (!item) return;
        var imageId = item.getAttribute('data-image-id');
        if (!imageId) return; // local images can't be voted on
        var voteType = voteBtn.getAttribute('data-vote');
        voteImage(imageId, voteType).then(function() {
          var detailPage = document.getElementById('page-cultivar');
          var h1 = detailPage ? detailPage.querySelector('h1') : null;
          if (h1) renderGalleryForCultivar(h1.textContent);
        }).catch(function(err) {
          console.warn('Vote failed:', err);
          showToast(t('toast_vote_failed'), true);
        });
        return;
      }

      // Delete handling is now in the Deletion Request System IIFE
    });
  }

  // --- Contribute Form Upload ---
  var contributeArea = document.getElementById('contribute-upload-area');
  var contributeInput = document.getElementById('contribute-file-input');
  var contributePreview = document.getElementById('contribute-preview');
  var contributeImages = [];
  var contributeFiles = []; // Store original File objects for upload
  var contributeCaptions = []; // Caption text per image
  var contributeLinkUrls = []; // Link URL per image
  var contributeReplaceIdx = null; // Track which image is being replaced

  if (contributeArea && contributeInput && contributePreview) {
    // Click to upload
    contributeArea.addEventListener('click', function(e) {
      if (e.target === contributeInput) return;
      contributeReplaceIdx = null;
      contributeInput.click();
    });

    // Drag and drop
    contributeArea.addEventListener('dragover', function(e) {
      e.preventDefault();
      this.classList.add('upload-area--dragover');
    });
    contributeArea.addEventListener('dragleave', function() {
      this.classList.remove('upload-area--dragover');
    });
    contributeArea.addEventListener('drop', function(e) {
      e.preventDefault();
      this.classList.remove('upload-area--dragover');
      var files = e.dataTransfer.files;
      for (var i = 0; i < files.length; i++) {
        addContributeImage(files[i]);
      }
    });

    // File input change
    contributeInput.addEventListener('change', function() {
      if (contributeReplaceIdx !== null) {
        // Replace mode: swap the image at replaceIdx
        var file = this.files[0];
        if (file && validateFile(file)) {
          var idx = contributeReplaceIdx;
          contributeFiles[idx] = file;
          var reader = new FileReader();
          reader.onload = function(e) {
            contributeImages[idx] = e.target.result;
            renderContributePreview();
          };
          reader.readAsDataURL(file);
        }
        contributeReplaceIdx = null;
      } else {
        // Add mode
        for (var i = 0; i < this.files.length; i++) {
          addContributeImage(this.files[i]);
        }
      }
      this.value = '';
    });

    function addContributeImage(file) {
      var existingDbCount = contributePreview.querySelectorAll('.upload-preview__item[data-image-id]').length;
      if (contributeImages.length + existingDbCount >= 10) {
        showToast(t('upload_error_max'), true);
        return;
      }
      if (!validateFile(file)) return;

      contributeFiles.push(file);
      contributeCaptions.push('');
      contributeLinkUrls.push('');
      var reader = new FileReader();
      reader.onload = function(e) {
        contributeImages.push(e.target.result);
        renderContributePreview();
      };
      reader.readAsDataURL(file);
    }

    // Unified move buttons: works across both DB images and new images
    // Exposed on window so renderEditImagePreviews (defined earlier) can also call it
    window.attachUnifiedMoveButtons = attachUnifiedMoveButtons;
    function attachUnifiedMoveButtons(container) {
      var allItems = Array.from(container.querySelectorAll('.upload-preview__item'));
      if (allItems.length < 2) return;
      allItems.forEach(function(item, pos) {
        // Remove any existing move div
        var oldMove = item.querySelector('.upload-preview__move');
        if (oldMove) oldMove.remove();
        var moveDiv = document.createElement('div');
        moveDiv.className = 'upload-preview__move';
        if (pos > 0) {
          var leftBtn = document.createElement('button');
          leftBtn.className = 'upload-preview__move-btn';
          leftBtn.setAttribute('data-pos', pos);
          leftBtn.setAttribute('data-dir', 'left');
          leftBtn.title = '左へ移動';
          leftBtn.innerHTML = '&#9664;';
          moveDiv.appendChild(leftBtn);
        }
        if (pos < allItems.length - 1) {
          var rightBtn = document.createElement('button');
          rightBtn.className = 'upload-preview__move-btn';
          rightBtn.setAttribute('data-pos', pos);
          rightBtn.setAttribute('data-dir', 'right');
          rightBtn.title = '右へ移動';
          rightBtn.innerHTML = '&#9654;';
          moveDiv.appendChild(rightBtn);
        }
        var imgWrap = item.querySelector('.upload-preview__img-wrap');
        if (imgWrap) imgWrap.appendChild(moveDiv);
      });
      // Attach click handlers
      container.querySelectorAll('.upload-preview__move-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var pos = parseInt(this.getAttribute('data-pos'), 10);
          var dir = this.getAttribute('data-dir');
          var targetPos = dir === 'left' ? pos - 1 : pos + 1;
          var items = Array.from(container.querySelectorAll('.upload-preview__item'));
          if (targetPos < 0 || targetPos >= items.length) return;
          var itemA = items[pos];
          var itemB = items[targetPos];
          var isDbA = itemA.hasAttribute('data-image-id');
          var isDbB = itemB.hasAttribute('data-image-id');

          // Swap DOM positions
          if (dir === 'left') {
            container.insertBefore(itemA, itemB);
          } else {
            container.insertBefore(itemB, itemA);
          }

          // Sync underlying data
          var sb = window._supabaseClient;

          // Update display_order for ALL DB images to match current DOM order
          if (sb) {
            var allAfterSwap = Array.from(container.querySelectorAll('.upload-preview__item'));
            allAfterSwap.forEach(function(el, i) {
              if (el.hasAttribute('data-image-id')) {
                sb.from('cultivar_images').update({ display_order: i }).eq('id', el.getAttribute('data-image-id'))
                  .then(function(res) { if (res.error) console.warn('display_order update failed:', res.error); });
              }
            });
          }

          // For new images: swap in contribute arrays
          if (!isDbA && !isDbB) {
            var dbCount = container.querySelectorAll('.upload-preview__item[data-image-id]').length;
            var idxA = pos - dbCount;
            var idxB = targetPos - dbCount;
            if (idxA >= 0 && idxB >= 0 && idxA < contributeImages.length && idxB < contributeImages.length) {
              [contributeImages[idxA], contributeImages[idxB]] = [contributeImages[idxB], contributeImages[idxA]];
              [contributeFiles[idxA], contributeFiles[idxB]] = [contributeFiles[idxB], contributeFiles[idxA]];
              [contributeCaptions[idxA], contributeCaptions[idxB]] = [contributeCaptions[idxB], contributeCaptions[idxA]];
              [contributeLinkUrls[idxA], contributeLinkUrls[idxB]] = [contributeLinkUrls[idxB], contributeLinkUrls[idxA]];
            }
          }
          // Re-attach move buttons with updated positions
          attachUnifiedMoveButtons(container);
        });
      });
    }

    function renderContributePreview() {
      // Preserve existing DB images (rendered by renderEditImagePreviews) before clearing
      var existingDbItems = Array.from(contributePreview.querySelectorAll('.upload-preview__item[data-image-id]'));
      contributePreview.innerHTML = '';
      // Re-append existing DB images first
      existingDbItems.forEach(function(el) { contributePreview.appendChild(el); });
      var checkedType = document.querySelector('#page-contribute input[name="cultivar-type"]:checked');
      var isClone = checkedType && checkedType.value === 'clone';
      contributeImages.forEach(function(src, i) {
        var item = document.createElement('div');
        item.className = 'upload-preview__item';
        var captionVal = (contributeCaptions[i] || '').replace(/"/g, '&quot;');
        var captionHtml;
        if (isClone) {
          var selVal = 'Clone';
          var otherVal = '';
          // Parse existing caption: if it matches a preset, select it; otherwise "その他"
          if (captionVal === 'Clone' || captionVal === 'self' || captionVal === 'sib') {
            selVal = captionVal;
          } else if (captionVal) {
            selVal = 'other';
            otherVal = captionVal;
          }
          captionHtml =
            '<div class="clone-caption-group" data-idx="' + i + '">' +
              '<select class="form-input clone-caption-select" data-idx="' + i + '" data-field="caption-select">' +
                '<option value="Clone"' + (selVal === 'Clone' ? ' selected' : '') + '>Clone</option>' +
                '<option value="self"' + (selVal === 'self' ? ' selected' : '') + '>self</option>' +
                '<option value="sib"' + (selVal === 'sib' ? ' selected' : '') + '>sib</option>' +
                '<option value="other"' + (selVal === 'other' ? ' selected' : '') + '>その他</option>' +
              '</select>' +
              '<input type="text" class="form-input clone-caption-other" placeholder="例) F2" data-idx="' + i + '" data-field="caption-other" value="' + otherVal + '" style="' + (selVal === 'other' ? '' : 'display:none;') + '">' +
            '</div>';
        } else {
          captionHtml = '<input type="text" placeholder="補足（日付等）" data-idx="' + i + '" data-field="caption" value="' + captionVal + '">';
        }
        item.innerHTML =
          '<div class="upload-preview__img-wrap">' +
            '<img class="upload-preview__img" src="' + src + '" data-idx="' + i + '" title="クリックで画像を変更">' +
            '<button class="upload-preview__remove" data-idx="' + i + '">&times;</button>' +
          '</div>' +
          '<div class="upload-preview__meta">' +
            captionHtml +
            '<input type="url" placeholder="リンクURL" data-idx="' + i + '" data-field="link" value="' + (contributeLinkUrls[i] || '').replace(/"/g, '&quot;') + '">' +
          '</div>';
        contributePreview.appendChild(item);
      });
      // Attach remove handlers
      contributePreview.querySelectorAll('.upload-preview__remove').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          var idx = parseInt(this.getAttribute('data-idx'), 10);
          contributeImages.splice(idx, 1);
          contributeFiles.splice(idx, 1);
          contributeCaptions.splice(idx, 1);
          contributeLinkUrls.splice(idx, 1);
          renderContributePreview();
        });
      });
      // Attach click-to-replace handlers on preview images
      contributePreview.querySelectorAll('.upload-preview__img').forEach(function(img) {
        img.addEventListener('click', function(e) {
          e.stopPropagation();
          contributeReplaceIdx = parseInt(this.getAttribute('data-idx'), 10);
          contributeInput.click();
        });
      });
      // Attach caption/link input handlers
      contributePreview.querySelectorAll('.upload-preview__meta input').forEach(function(inp) {
        inp.addEventListener('input', function() {
          var idx = parseInt(this.getAttribute('data-idx'), 10);
          var field = this.getAttribute('data-field');
          if (field === 'caption') contributeCaptions[idx] = this.value;
          else if (field === 'caption-other') contributeCaptions[idx] = this.value;
          else if (field === 'link') contributeLinkUrls[idx] = this.value;
        });
      });
      // Attach clone caption select handlers
      contributePreview.querySelectorAll('.clone-caption-select').forEach(function(sel) {
        sel.addEventListener('change', function() {
          var idx = parseInt(this.getAttribute('data-idx'), 10);
          var otherInput = this.parentNode.querySelector('.clone-caption-other');
          if (this.value === 'other') {
            otherInput.style.display = '';
            contributeCaptions[idx] = otherInput.value || '';
          } else {
            otherInput.style.display = 'none';
            contributeCaptions[idx] = this.value;
          }
        });
      });
      // Attach unified move buttons across all images (DB + new)
      attachUnifiedMoveButtons(contributePreview);
    }

    // Expose for form reset
    window.resetContributeImages = function() {
      contributeImages = [];
      contributeFiles = [];
      contributeCaptions = [];
      contributeLinkUrls = [];
      contributePreview.innerHTML = '';
    };
    window.getContributeFiles = function() {
      return contributeFiles.slice();
    };
    window.getContributeCaptions = function() {
      return contributeCaptions.slice();
    };
    window.getContributeLinkUrls = function() {
      return contributeLinkUrls.slice();
    };
  }
})();

// ========================================
// CONTACT FORM - Demo handler
// ========================================
(function() {
  var submitBtn = document.getElementById('contact-submit');
  if (!submitBtn) return;
  submitBtn.addEventListener('click', function(e) {
    e.preventDefault();
    var name = document.getElementById('contact-name').value.trim();
    var email = document.getElementById('contact-email').value.trim();
    var message = document.getElementById('contact-message').value.trim();
    if (!name || !email || !message) {
      showToast(t('contact_error_required'), true);
      return;
    }
    showToast(t('contact_success'));
    document.getElementById('contact-name').value = '';
    document.getElementById('contact-email').value = '';
    document.getElementById('contact-message').value = '';
  });
})();
