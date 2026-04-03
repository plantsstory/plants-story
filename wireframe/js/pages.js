// ---- Profile page functions ----
(function() {
  // Default avatar SVG
  var defaultAvatarSvg = '<svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="80" height="80" fill="#e8e8e8"/>' +
    '<circle cx="40" cy="30" r="14" fill="#bbb"/>' +
    '<ellipse cx="40" cy="68" rx="24" ry="18" fill="#bbb"/>' +
    '</svg>';

  function renderAvatar(el, url) {
    if (!el) return;
    if (url) {
      el.innerHTML = '<img src="' + escHtml(url) + '" alt="avatar">';
    } else {
      el.innerHTML = defaultAvatarSvg;
    }
  }

  function renderSnsLinks(el, profile) {
    if (!el) return;
    var html = '';
    if (profile.sns_instagram) {
      var igUrl = profile.sns_instagram.indexOf('http') === 0 ? profile.sns_instagram :
        'https://www.instagram.com/' + profile.sns_instagram.replace(/^@/, '');
      html += '<a href="' + escHtml(igUrl) + '" target="_blank" rel="noopener" class="profile-sns__ig" title="Instagram"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg></a>';
    }
    if (profile.sns_twitter) {
      var twUrl = profile.sns_twitter.indexOf('http') === 0 ? profile.sns_twitter :
        'https://x.com/' + profile.sns_twitter.replace(/^@/, '');
      html += '<a href="' + escHtml(twUrl) + '" target="_blank" rel="noopener" class="profile-sns__x" title="X"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>';
    }
    el.innerHTML = html;
  }

  // Store current profile userId for search
  var _currentProfileUserId = null;

  function loadProfilePosts(userId, searchQuery) {
    var sb = window._supabaseClient;
    var grid = document.getElementById('profile-posts-grid');
    var emptyMsg = document.getElementById('profile-posts-empty');
    if (!sb || !grid) return;

    grid.innerHTML = skeletonCards(3);

    var query = sb.from('cultivars')
      .select('id, genus, cultivar_name, type, created_at')
      .eq('user_id', userId)
      .eq('type', 'seedling')
      .order('created_at', { ascending: false });

    if (searchQuery) {
      query = query.ilike('cultivar_name', '%' + searchQuery + '%');
    }

    query.then(function(res) {
      grid.innerHTML = '';
      if (res.error) {
        grid.innerHTML = '<p class="error-text">エラー: ' + escHtml(res.error.message) + '</p>';
        return;
      }
      var rows = res.data || [];
      var countEl = document.getElementById('profile-post-count');
      if (countEl) countEl.textContent = rows.length;
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
        card.innerHTML = '<div class="d-flex justify-between items-center">' +
          '<div><span class="badge badge--seedling badge--type-sm">seedling</span>' +
          '<strong>' + escHtml(displayName) + '</strong></div>' +
          '<span class="text-xs text-muted">' + escHtml(date) + '</span></div>';
        card.addEventListener('click', function() {
          window.navigateToCultivarById(row.id, row.genus, displayName.replace(row.genus + ' ', ''));
        });
        grid.appendChild(card);
      });
    });
  }

  // Search input debounce
  var profileSearchTimer;
  var searchInput = document.getElementById('profile-post-search');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      var q = this.value.trim();
      clearTimeout(profileSearchTimer);
      profileSearchTimer = setTimeout(function() {
        if (_currentProfileUserId) loadProfilePosts(_currentProfileUserId, q);
      }, 300);
    });
  }

  // Load profile view page
  window.loadProfilePage = function(userId) {
    var sb = window._supabaseClient;
    if (!sb) return;
    _currentProfileUserId = userId;

    // Reset search input
    var searchEl = document.getElementById('profile-post-search');
    if (searchEl) searchEl.value = '';

    // Fetch profile
    sb.from('profiles').select('*').eq('id', userId).single()
      .then(function(res) {
        if (res.error || !res.data) {
          document.getElementById('profile-display-name').textContent = '名前未設定';
          document.getElementById('profile-username').textContent = '';
          document.getElementById('profile-bio').textContent = '';
          document.getElementById('profile-sns-links').innerHTML = '';
          renderAvatar(document.getElementById('profile-avatar'), null);
        } else {
          var p = res.data;
          document.getElementById('profile-display-name').textContent = p.display_name || '名前未設定';
          document.getElementById('profile-username').textContent = p.username ? '@' + p.username : '';
          document.getElementById('profile-bio').textContent = p.bio || '';
          renderAvatar(document.getElementById('profile-avatar'), p.avatar_url);
          renderSnsLinks(document.getElementById('profile-sns-links'), p);
          // Store username for share URL
          window._currentProfileUsername = p.username || null;
        }
      });

    // Show edit link only for own profile
    var editLink = document.getElementById('profile-edit-link');
    if (editLink) {
      editLink.style.display = (window._currentUser && window._currentUser.id === userId) ? '' : 'none';
    }

    // Fetch subscription status for the profile
    var subBadge = document.getElementById('profile-sub-badge');
    var subSection = document.getElementById('profile-subscription-section');
    var subContent = document.getElementById('profile-subscription-content');
    var isOwnProfile = window._currentUser && window._currentUser.id === userId;

    // Fetch subscription status via public RPC
    sb.rpc('get_subscription_status', { p_user_id: userId })
      .then(function(subRes) {
        var sub = subRes.data;
        var isActive = sub && sub.active;

        // Badge next to name
        if (subBadge) {
          if (isActive) {
            subBadge.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> Member';
            subBadge.className = 'profile-sub-badge profile-sub-badge--active';
            subBadge.style.display = '';
          } else {
            subBadge.className = 'profile-sub-badge profile-sub-badge--free';
            subBadge.innerHTML = 'Free';
            subBadge.style.display = '';
          }
        }

        // Subscription section below profile card
        if (subSection && subContent) {
          subSection.style.display = '';
          if (isActive) {
            var planLabel = sub.plan === 'granted' ? '無料付与' : (sub.plan === 'seedling_annual' ? '年額プラン' : '月額プラン');
            var html = '<div class="flex-center-sm">';
            html += '<span class="profile-sub-badge profile-sub-badge--active sub-badge-static"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> Member</span>';
            html += '<span class="text-sm font-semibold">' + planLabel + '</span>';
            html += '</div>';
            if (sub.current_period_end && sub.plan !== 'granted') {
              var endDate = new Date(sub.current_period_end);
              var endStr = endDate.getFullYear() + '/' + String(endDate.getMonth() + 1).padStart(2, '0') + '/' + String(endDate.getDate()).padStart(2, '0');
              if (sub.cancel_at_period_end) {
                html += '<div class="text-xs mt-xs text-warning">解約予定 (' + endStr + ' まで)</div>';
              } else {
                html += '<div class="text-xs text-muted mt-xs">次回更新: ' + endStr + '</div>';
              }
            }
            if (isOwnProfile) {
              html += '<div class="mt-sm"><button class="btn btn--secondary btn--sm" onclick="openCustomerPortal()">サブスクリプションを管理</button></div>';
            }
            subContent.innerHTML = html;
          } else {
            // Free user
            var html = '<div class="flex-center-sm">';
            html += '<span class="profile-sub-badge profile-sub-badge--free sub-badge-static">Free</span>';
            html += '<span class="text-sm text-muted">My Seedlings の詳細閲覧・投稿にはサブスクリプションが必要です</span>';
            html += '</div>';
            if (isOwnProfile) {
              html += '<div class="mt-sm"><button class="btn btn--primary btn--sm" onclick="showPaywallModal()">サブスクリプションを開始</button></div>';
            }
            subContent.innerHTML = html;
          }
        }
      }).catch(function() {
        // No subscription record - show as Free
        if (subBadge) {
          subBadge.className = 'profile-sub-badge profile-sub-badge--free';
          subBadge.innerHTML = 'Free';
          subBadge.style.display = '';
        }
        if (subSection && subContent) {
          subSection.style.display = '';
          var html = '<div class="flex-center-sm">';
          html += '<span class="profile-sub-badge profile-sub-badge--free sub-badge-static">Free</span>';
          html += '<span class="text-sm text-muted">My Seedlings の詳細閲覧・投稿にはサブスクリプションが必要です</span>';
          html += '</div>';
          if (isOwnProfile) {
            html += '<div class="mt-sm"><button class="btn btn--primary btn--sm" onclick="showPaywallModal()">サブスクリプションを開始</button></div>';
          }
          subContent.innerHTML = html;
        }
      });

    // Load seedling posts
    loadProfilePosts(userId, '');
  };

  // Load profile edit page
  window.loadProfileEditPage = function() {
    if (!window._currentUser) {
      showToast('ログインが必要です', true);
      navigateTo('top');
      return;
    }
    var sb = window._supabaseClient;
    var userId = window._currentUser.id;

    document.getElementById('edit-email').value = window._currentUser.email || '';

    // Bio character counter
    var bioEl = document.getElementById('edit-bio');
    var bioCountEl = document.getElementById('edit-bio-count');
    if (bioEl && bioCountEl) {
      bioEl.addEventListener('input', function() {
        bioCountEl.textContent = this.value.length;
      });
    }

    sb.from('profiles').select('*').eq('id', userId).single()
      .then(function(res) {
        if (res.data) {
          document.getElementById('edit-display-name').value = res.data.display_name || '';
          document.getElementById('edit-username').value = res.data.username || '';
          document.getElementById('edit-bio').value = res.data.bio || '';
          document.getElementById('edit-sns-instagram').value = res.data.sns_instagram || '';
          document.getElementById('edit-sns-twitter').value = res.data.sns_twitter || '';
          renderAvatar(document.getElementById('edit-avatar-preview'), res.data.avatar_url);
          if (bioCountEl) bioCountEl.textContent = (res.data.bio || '').length;
          // Store current avatar URL for save
          window._editAvatarUrl = res.data.avatar_url || '';
          window._editOriginalUsername = res.data.username || '';
        } else {
          // No profile yet - use Google defaults
          var meta = window._currentUser.user_metadata || {};
          document.getElementById('edit-display-name').value = meta.full_name || '';
          renderAvatar(document.getElementById('edit-avatar-preview'), meta.avatar_url || null);
          window._editAvatarUrl = meta.avatar_url || '';
          window._editOriginalUsername = '';
        }
      });

    // Username availability check with debounce
    var usernameInput = document.getElementById('edit-username');
    var usernameStatus = document.getElementById('edit-username-status');
    var usernameHint = document.getElementById('edit-username-hint');
    var _usernameTimer = null;
    if (usernameInput) {
      usernameInput.addEventListener('input', function() {
        var val = usernameInput.value.trim();
        clearTimeout(_usernameTimer);
        usernameStatus.textContent = '';
        usernameHint.textContent = '設定するとプロフィールURLが短くなります';
        usernameHint.style.color = '';

        if (!val) return;

        _usernameTimer = setTimeout(function() {
          sb.rpc('check_username_available', { p_username: val }).then(function(res) {
            if (res.error) return;
            var d = res.data;
            if (d.available) {
              usernameStatus.textContent = '\u2714';
              usernameStatus.style.color = '#2D6A4F';
              usernameHint.textContent = 'このユーザー名は使用できます';
              usernameHint.style.color = '#2D6A4F';
            } else {
              usernameStatus.textContent = '\u2718';
              usernameStatus.style.color = '#dc3545';
              usernameHint.textContent = d.reason || 'このユーザー名は使用できません';
              usernameHint.style.color = '#dc3545';
            }
          });
        }, 300);
      });
    }

    // Render subscription status
    var subStatusEl = document.getElementById('sub-status-text');
    var subActionsEl = document.getElementById('sub-actions');
    if (subStatusEl && subActionsEl) {
      checkSubscription().then(function() {
        var plan = window._subscriptionPlan || 'free';
        var status = window._subscriptionStatus || 'none';
        var cancelAtEnd = window._subscriptionCancelAtEnd || false;
        var endDate = window._subscriptionEnd ? new Date(window._subscriptionEnd) : null;

        if (window._isSubscribed) {
          var planLabel = plan === 'granted' ? '無料付与' : (plan === 'seedling_annual' ? '年額プラン' : '月額プラン');
          var statusHtml = '<div class="flex-center-sm mb-sm">';
          statusHtml += '<span class="badge badge--seedling font-xs-btn">Active</span>';
          statusHtml += '<span class="font-semibold">' + planLabel + '</span>';
          statusHtml += '</div>';
          if (endDate && plan !== 'granted') {
            var endStr = endDate.getFullYear() + '/' + String(endDate.getMonth() + 1).padStart(2, '0') + '/' + String(endDate.getDate()).padStart(2, '0');
            if (cancelAtEnd) {
              statusHtml += '<div class="text-sm text-warning">解約予定: ' + endStr + ' まで利用可能</div>';
            } else {
              statusHtml += '<div class="text-sm text-muted">次回更新日: ' + endStr + '</div>';
            }
          }
          subStatusEl.innerHTML = statusHtml;
          if (plan !== 'granted') {
            subActionsEl.innerHTML = '<button class="btn btn--secondary btn--sm" id="manage-subscription-btn">サブスクリプションを管理</button>';
            document.getElementById('manage-subscription-btn').addEventListener('click', openCustomerPortal);
          } else {
            subActionsEl.innerHTML = '';
          }
        } else {
          subStatusEl.innerHTML = '<div class="text-sm text-muted">現在のプラン: <strong>Free</strong></div>' +
            '<div class="text-xs text-muted mt-xs">My Seedlings（実生の詳細閲覧・投稿・編集）にはサブスクリプションが必要です。</div>';
          subActionsEl.innerHTML = '<button class="btn btn--primary btn--sm mt-sm" id="start-subscription-btn">サブスクリプションを開始</button>';
          document.getElementById('start-subscription-btn').addEventListener('click', showPaywallModal);
        }
      });
    }
  };

  // Avatar upload button
  var avatarBtn = document.getElementById('edit-avatar-btn');
  var avatarInput = document.getElementById('edit-avatar-input');
  if (avatarBtn && avatarInput) {
    avatarBtn.addEventListener('click', function() {
      avatarInput.click();
    });
    avatarInput.addEventListener('change', function() {
      var file = this.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showToast('画像サイズは5MB以下にしてください', true);
        return;
      }
      var sb = window._supabaseClient;
      if (!sb || !window._currentUser) return;

      avatarBtn.textContent = t('avatar_uploading');
      avatarBtn.disabled = true;

      window.compressImage(file).then(function(compressed) {
        var path = 'avatars/' + window._currentUser.id + '/' + Date.now() + '.jpg';
        return sb.storage.from('gallery-images').upload(path, compressed, {
          contentType: 'image/jpeg',
          upsert: true
        }).then(function(res) {
          if (res.error) throw res.error;
          var publicUrl = sb.storage.from('gallery-images').getPublicUrl(path).data.publicUrl;
          window._editAvatarUrl = publicUrl;
          renderAvatar(document.getElementById('edit-avatar-preview'), publicUrl);
          showToast(t('toast_avatar_uploaded'));
        });
      }).catch(function(err) {
        showToast('アップロードに失敗しました: ' + (err.message || err), true);
      }).finally(function() {
        avatarBtn.textContent = t('avatar_upload_btn');
        avatarBtn.disabled = false;
      });
    });
  }

  // Save profile
  var saveBtn = document.getElementById('edit-profile-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      var sb = window._supabaseClient;
      if (!sb || !window._currentUser) return;

      saveBtn.textContent = '保存中...';
      saveBtn.disabled = true;

      var usernameVal = document.getElementById('edit-username').value.trim() || null;
      sb.rpc('upsert_profile', {
        p_display_name: document.getElementById('edit-display-name').value.trim(),
        p_bio: document.getElementById('edit-bio').value.trim(),
        p_sns_instagram: document.getElementById('edit-sns-instagram').value.trim(),
        p_sns_twitter: document.getElementById('edit-sns-twitter').value.trim(),
        p_avatar_url: window._editAvatarUrl || '',
        p_username: usernameVal
      }).then(function(res) {
        if (res.error) {
          showToast('保存に失敗しました: ' + res.error.message, true);
        } else if (res.data && res.data.success === false) {
          showToast(res.data.error || '保存に失敗しました', true);
        } else {
          showToast(t('toast_profile_saved'));
          // Use @username URL if available
          if (usernameVal) {
            navigateTo('profile', { username: usernameVal });
          } else {
            navigateTo('profile', { userId: window._currentUser.id });
          }
        }
      }).finally(function() {
        saveBtn.textContent = '保存';
        saveBtn.disabled = false;
      });
    });
  }

  // Logout button on edit page
  var logoutEditBtn = document.getElementById('edit-profile-logout');
  if (logoutEditBtn) {
    logoutEditBtn.addEventListener('click', function() {
      var sb = window._supabaseClient;
      if (sb) {
        sb.auth.signOut().then(function() {
          window._currentUser = null;
          if (typeof updateLoginUI === 'function') updateLoginUI();
          navigateTo('top');
          showToast('ログアウトしました');
        });
      }
    });
  }

  // Handle initial route if page loaded on a profile URL
  var initState = parseRoute();
  if (initState.page === 'profile' && initState.userId) {
    window.loadProfilePage(initState.userId);
  } else if (initState.page === 'profile-edit') {
    window.loadProfileEditPage();
  }
})();

// ---- Lazy image loading with Intersection Observer ----
var _lazyObserver = null;
if ('IntersectionObserver' in window) {
  _lazyObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var img = entry.target;
        img.addEventListener('load', function() { img.classList.add('lazy-loaded'); });
        img.addEventListener('error', function() { img.style.display = 'none'; });
        img.src = img.getAttribute('data-src');
        img.removeAttribute('data-src');
        _lazyObserver.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });
}

function observeLazyImages(container) {
  if (!container) return;
  var imgs = container.querySelectorAll('img[data-src]');
  for (var i = 0; i < imgs.length; i++) {
    var img = imgs[i];
    img.setAttribute('loading', 'lazy');
    if (_lazyObserver) {
      _lazyObserver.observe(img);
    } else {
      // Fallback: load immediately if IntersectionObserver not supported
      img.addEventListener('load', function() { this.classList.add('lazy-loaded'); });
      img.addEventListener('error', function() { this.style.display = 'none'; });
      img.src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
    }
  }
}
window.observeLazyImages = observeLazyImages;

// ---- Load cultivar thumbnails from gallery images ----
// Cached thumbnail map: cultivar_name -> storage_path (used by buildRowHtml)
var _thumbMap = {};
window._thumbMap = _thumbMap;

var _thumbMapLoaded = false;
function loadCultivarThumbnails() {
  var sb = window._supabaseClient;
  var baseUrl = window._SUPABASE_URL;
  if (!sb || !baseUrl) return;
  // Skip if already loaded (prevent redundant full-table fetches)
  if (_thumbMapLoaded && Object.keys(_thumbMap).length > 0) {
    (window._generaData || []).forEach(function(gObj) {
      var section = document.getElementById('genus-' + gObj.slug);
      if (section) paginateGenus(section);
    });
    return;
  }
  sb.from('cultivar_images')
    .select('cultivar_name, storage_path')
    .order('created_at', { ascending: true })
    .then(function(res) {
      _thumbMapLoaded = true;
      if (res.error || !res.data) return;
      res.data.forEach(function(img) {
        if (!_thumbMap[img.cultivar_name]) {
          _thumbMap[img.cultivar_name] = img.storage_path;
        }
      });
      // Re-render all genus pages to apply thumbnails
      (window._generaData || []).forEach(function(gObj) {
        var section = document.getElementById('genus-' + gObj.slug);
        if (section) paginateGenus(section);
      });
    });
}
window.loadCultivarThumbnails = loadCultivarThumbnails;

// ---- Favorites (Supabase for logged-in users only) ----
var FAV_KEY = 'plants-story-favorites';

function getFavorites() {
  if (!window._currentUser) return {};
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '{}'); } catch(e) { return {}; }
}

function isFavorite(name) {
  return !!getFavorites()[name];
}

function toggleFavorite(name) {
  if (!window._currentUser) return false;
  var favs = getFavorites();
  var added;
  if (favs[name]) {
    delete favs[name];
    added = false;
  } else {
    favs[name] = Date.now();
    added = true;
  }
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  updateFavBtn(name);
  updateHeaderFavIcon();

  // Sync to Supabase
  var sb = window._supabaseClient;
  var user = window._currentUser;
  if (sb && user) {
    if (added) {
      sb.from('favorites').upsert({ user_id: user.id, cultivar_name: name }, { onConflict: 'user_id,cultivar_name' }).then(function() {});
    } else {
      sb.from('favorites').delete().eq('user_id', user.id).eq('cultivar_name', name).then(function() {});
    }
  }
  return added;
}

// Sync favorites from Supabase on login (server is source of truth)
function syncFavoritesFromServer() {
  var sb = window._supabaseClient;
  var user = window._currentUser;
  if (!sb || !user) return;
  // Clear stale local data immediately so count shows 0 until sync completes
  localStorage.removeItem(FAV_KEY);
  updateHeaderFavIcon();
  sb.from('favorites').select('cultivar_name, created_at').eq('user_id', user.id).then(function(res) {
    if (res.error || !res.data) return;
    // Server is source of truth — replace local with server data
    var serverFavs = {};
    var staleNames = [];
    res.data.forEach(function(row) {
      // If data is fully loaded, skip favorites for deleted cultivars
      if (window._dataFullyLoaded && !cultivarData[row.cultivar_name] && !cultivarData[row.cultivar_name + ' [Seedling]']) {
        staleNames.push(row.cultivar_name);
        return;
      }
      serverFavs[row.cultivar_name] = new Date(row.created_at).getTime();
    });
    localStorage.setItem(FAV_KEY, JSON.stringify(serverFavs));
    updateHeaderFavIcon();
    // Delete stale favorites from server
    if (staleNames.length > 0) {
      sb.from('favorites').delete().eq('user_id', user.id).in('cultivar_name', staleNames).then(function() {});
    }
  });
}
window.syncFavoritesFromServer = syncFavoritesFromServer;

function updateFavBtn(name) {
  var btn = document.getElementById('fav-btn');
  if (!btn) return;
  if (!window._currentUser) {
    btn.innerHTML = '&#x2606; お気に入り追加';
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
    return;
  }
  var fav = isFavorite(name);
  btn.innerHTML = fav ? '&#x2605; お気に入り済み' : '&#x2606; お気に入り追加';
  if (fav) {
    btn.style.background = '#f5c518';
    btn.style.color = '#fff';
    btn.style.borderColor = '#f5c518';
  } else {
    btn.style.background = '';
    btn.style.color = '';
    btn.style.borderColor = '';
  }
}

function updateHeaderFavIcon() {
  var navFav = document.querySelector('.mobile-nav [data-nav="favorites"]');
  if (!navFav) return;
  var count = Object.keys(getFavorites()).length;
  var star = count > 0 ? '&#x2605;' : '&#x2606;';
  navFav.innerHTML = star + ' ' + t('favorites_title') + (count > 0 ? ' (' + count + ')' : '');
}

// Fav button click handler
document.addEventListener('click', function(e) {
  var btn = e.target.closest('#fav-btn');
  if (!btn) return;
  if (!window._currentUser) {
    showToast('お気に入り機能を使うにはログインしてください');
    return;
  }
  var h1 = document.querySelector('#page-cultivar h1');
  if (!h1) return;
  var name = h1.textContent;
  var added = toggleFavorite(name);
  showToast(t(added ? 'favorites_added' : 'favorites_removed'));
});

// ---- Share button ----
// Build clean site URL for sharing
function getShareUrl(cultivarName) {
  var parts = cultivarName.split(' ');
  var genus = parts[0].toLowerCase();
  var rest = parts.slice(1).join(' ');
  return _siteBase + genus + '/' + encodeURIComponent(rest);
}

document.addEventListener('click', function(e) {
  var btn = e.target.closest('#share-btn');
  if (!btn) {
    // Close share menu if clicking elsewhere
    var menu = document.getElementById('share-menu');
    if (menu && !e.target.closest('#share-menu')) menu.classList.add('hidden');
    return;
  }
  var h1 = document.querySelector('#page-cultivar h1');
  if (!h1) return;
  var name = h1.textContent;
  var shareUrl = getShareUrl(name);
  var text = name + ' - Plants Story';

  // Try native share API first (mobile)
  if (navigator.share) {
    navigator.share({ title: text, url: shareUrl }).catch(function() {});
    return;
  }

  // Desktop: show share menu
  var menu = document.getElementById('share-menu');
  if (!menu) return;
  var encodedUrl = encodeURIComponent(shareUrl);
  var encodedText = encodeURIComponent(text);
  menu.innerHTML =
    '<a href="https://twitter.com/intent/tweet?text=' + encodedText + '&url=' + encodedUrl + '&hashtags=PlantsStory' + '" target="_blank" rel="noopener" class="btn btn--sm btn--secondary text-xs">X</a>' +
    '<a href="https://www.facebook.com/sharer/sharer.php?u=' + encodedUrl + '" target="_blank" rel="noopener" class="btn btn--sm btn--secondary text-xs">Facebook</a>' +
    '<a href="https://line.me/R/msg/text/' + encodeURIComponent(text + '\n' + shareUrl) + '" target="_blank" rel="noopener" class="btn btn--sm btn--secondary text-xs">LINE</a>' +
    '<button class="btn btn--sm btn--secondary share-copy-btn text-xs">URLコピー</button>';
  menu.classList.toggle('hidden');

  // Copy URL handler
  menu.querySelector('.share-copy-btn').addEventListener('click', function() {
    navigator.clipboard.writeText(shareUrl).then(function() {
      showToast('URLをコピーしました');
      menu.classList.add('hidden');
    });
  });
});

// Render favorites page
function renderFavoritesPage() {
  var grid = document.getElementById('favorites-grid');
  if (!grid) return;

  // Require login
  if (!window._currentUser) {
    grid.innerHTML = '<div class="text-center grid-full p-xl">' +
      '<p class="text-muted mb-md">お気に入り機能を使うにはログインしてください</p>' +
      '<button class="btn btn--primary" onclick="document.getElementById(\'btn-login\').click()">Googleでログイン</button>' +
      '</div>';
    return;
  }

  var favs = getFavorites();
  var names = Object.keys(favs).sort(function(a, b) { return favs[b] - favs[a]; });

  if (names.length === 0) {
    grid.innerHTML = '<div class="text-center text-muted grid-full p-xl">' + t('favorites_empty') + '</div>';
    return;
  }

  var sb = window._supabaseClient;
  var baseUrl = window._SUPABASE_URL;

  // Get thumbnails only for favorited cultivar names (not full table)
  var thumbPromise;
  if (sb) {
    var displayNames = names.map(function(n) { return n.replace(' [Seedling]', ''); });
    thumbPromise = sb.from('cultivar_images').select('cultivar_name, storage_path').in('cultivar_name', displayNames).then(function(res) {
      var map = {};
      if (res.data) res.data.forEach(function(img) { if (!map[img.cultivar_name]) map[img.cultivar_name] = img.storage_path; });
      return map;
    });
  } else {
    thumbPromise = Promise.resolve({});
  }

  thumbPromise.then(function(thumbMap) {
    var html = '';
    var rendered = 0;
    names.forEach(function(name) {
      var cData = cultivarData[name] || cultivarData[name + ' [Seedling]'];
      if (!cData) return;
      rendered++;
      var displayName = name.replace(' [Seedling]', '');
      var genus = displayName.split(' ')[0];
      var type = cData._type || 'species';
      var bi = getBadgeInfo(type, name);
      var hasOrigins = cData.origins && cData.origins.length > 0 && cData.origins[0].trust > 0;
      var trustPct = hasOrigins ? cData.origins.reduce(function(max, o) { return Math.max(max, o.trust || 0); }, 0) : 0;
      var trustClass = getTrustClass(trustPct);

      html += '<div class="card card--clickable" data-nav="cultivar" data-key="' + name.replace(/"/g, '&quot;') + '" style="position:relative">';

      // Thumbnail or plant icon
      if (thumbMap[displayName] && baseUrl) {
        var url = baseUrl + '/storage/v1/object/public/gallery-images/' + thumbMap[displayName];
        html += '<div class="card-img-container"><img src="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1 1%22/%3E" data-src="' + url + '" class="card-img-cover" alt=""></div>';
      } else {
        html += '<div class="recent-card__img">';
        html += '<svg viewBox="0 0 80 60" width="60" height="45"><path d="M40 5C25 0 10 8 8 22C6 36 22 50 40 58C58 50 74 36 72 22C70 8 55 0 40 5Z" fill="#2D6A4F" opacity="0.3"/><path d="M40 5V58" stroke="#1B4332" stroke-width="1.5" fill="none" opacity="0.4"/></svg>';
        html += '</div>';
      }

      html += '<div class="p-sm">';
      html += '<div class="font-bold">' + displayName + '</div>';
      html += '<div class="text-sm text-muted">' + genus + ' <span class="badge ' + bi.cls + ' badge--inline">' + bi.txt + '</span></div>';
      if (hasOrigins) {
        html += '<div class="trust mt-sm"><div class="trust__bar"><div class="trust__fill ' + trustClass + '" style="width:' + trustPct + '%"></div></div><span class="trust__label">' + trustPct + '%</span></div>';
      }
      html += '</div>';

      // Remove button
      html += '<button class="fav-remove-btn" data-fav-remove="' + name.replace(/"/g, '&quot;') + '">&#x2605;</button>';

      html += '</div>';
    });
    grid.innerHTML = html || '<div class="text-center text-muted grid-full p-xl">' + t('favorites_empty') + '</div>';
    // Clean up stale favorites not in cultivarData (only after full data load)
    if (rendered < names.length && window._dataFullyLoaded) {
      var cleanFavs = getFavorites();
      var staleNames = [];
      names.forEach(function(name) {
        if (!cultivarData[name] && !cultivarData[name + ' [Seedling]']) {
          delete cleanFavs[name];
          staleNames.push(name);
        }
      });
      if (staleNames.length > 0) {
        localStorage.setItem(FAV_KEY, JSON.stringify(cleanFavs));
        updateHeaderFavIcon();
        // Also delete stale favorites from server to prevent them from coming back
        var sb = window._supabaseClient;
        var user = window._currentUser;
        if (sb && user) {
          sb.from('favorites').delete().eq('user_id', user.id).in('cultivar_name', staleNames).then(function() {});
        }
      }
    }
    observeLazyImages(grid);
  });
}

// Remove from favorites page
document.addEventListener('click', function(e) {
  var btn = e.target.closest('[data-fav-remove]');
  if (!btn) return;
  e.stopPropagation();
  var name = btn.getAttribute('data-fav-remove');
  toggleFavorite(name);
  showToast(t('favorites_removed'));
  renderFavoritesPage();
});

// Initialize header fav icon on load
setTimeout(updateHeaderFavIcon, 500);

// ---- Render origin cards from data ----
// Helper: extract formula from origins array and set on data object
function extractFormula(data) {
  if (!data || !data.origins) return;
  data.origins.forEach(function(o) {
    if (o && o._type === 'formula' && o.formula) data.formula = o.formula;
  });
}

// ---- Shared helpers (used by buildRowHtml, renderOrigins, detail page, etc.) ----
function getBadgeInfo(type, name) {
  var cls = type === 'species' ? 'badge--species' : (type === 'hybrid' ? 'badge--hybrid' : (type === 'seedling' ? 'badge--seedling' : 'badge--clone'));
  var txt = type === 'species' ? getSpeciesBadgeText(name) : (type === 'hybrid' ? 'Hybrid' : (type === 'seedling' ? 'Seedling' : 'Clone'));
  return { cls: cls, txt: txt };
}
window.getBadgeInfo = getBadgeInfo;

function getTrustClass(pct) {
  return pct >= 70 ? 'trust--high' : (pct >= 40 ? 'trust--mid' : 'trust--low');
}

var TIER_COLORS = { S: '#8b5cf6', A: '#3b82f6', B: '#10b981', C: '#f59e0b', D: '#ef4444' };
function renderTierBadge(tier, name, labelJp) {
  var color = TIER_COLORS[tier] || '#6b7280';
  var h = '<div class="origin-card__source-item mb-xs">';
  h += '<span class="tier-badge" style="background:' + color + '">Tier ' + tier + '</span> ';
  h += '<span class="font-semibold">' + name + '</span>';
  if (labelJp) h += ' <span class="text-gray font-xs-btn">(' + labelJp + ')</span>';
  h += '</div>';
  return h;
}

function renderVoteButtons(i, votes) {
  var agreeCount = votes ? votes.agree : 0;
  var disagreeCount = votes ? votes.disagree : 0;
  var h = '<button class="vote-btn" data-origin-idx="' + i + '" data-vote="agree" aria-label="' + t('vote_agree') + ' (' + agreeCount + ')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v12"/><path d="M15 5.88L14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88z"/></svg><span class="vote-btn__badge">' + agreeCount + '</span></button>';
  h += '<button class="vote-btn vote-btn--down" data-origin-idx="' + i + '" data-vote="disagree" aria-label="' + t('vote_disagree') + ' (' + disagreeCount + ')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 14V2"/><path d="M9 18.12L10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88z"/></svg><span class="vote-btn__badge">' + disagreeCount + '</span></button>';
  return h;
}

function renderOrigins(cultivarName) {
  var container = document.getElementById('origins-container');
  if (!container) return;
  var displayName = cultivarName.replace(' [Seedling]', '');
  var _sb = window._supabaseClient;

  // Show loading state
  container.innerHTML = '<div class="p-xl">' + skeletonLines(4) + '</div>';

  if (!_sb) {
    // No Supabase: use local data only
    var localKey = cultivarData[cultivarName] ? cultivarName :
      (cultivarData[cultivarName + ' [Seedling]'] ? cultivarName + ' [Seedling]' : cultivarName);
    renderOriginsInner(localKey, container);
    return;
  }

  // Build query: try name variants
  var query;
  {
    var namesToTry = [displayName];
    if (displayName.indexOf('[Seedling]') === -1) namesToTry.push(displayName + ' [Seedling]');
    if (cultivarName !== displayName && namesToTry.indexOf(cultivarName) === -1) namesToTry.push(cultivarName);
    query = _sb.from('cultivars')
      .select('cultivar_name, origins, ai_status, type, user_id, created_at')
      .in('cultivar_name', namesToTry)
      .limit(1);
  }

  query.then(function(res) {
      var row = res.data && res.data[0];
      if (!row) {
        container.innerHTML = '<div class="text-center text-muted p-xl">この品種の由来情報はまだ登録されていません。</div>';
        return;
      }
      var dbKey = row.cultivar_name;
      // Populate cultivarData from DB
      if (!cultivarData[dbKey]) {
        cultivarData[dbKey] = { origins: row.origins || [], _type: row.type, _userId: row.user_id, _created_at: row.created_at, _id: row.id };
      } else {
        cultivarData[dbKey].origins = row.origins || [];
        if (!cultivarData[dbKey]._type) cultivarData[dbKey]._type = row.type;
        if (!cultivarData[dbKey]._userId) cultivarData[dbKey]._userId = row.user_id;
        if (!cultivarData[dbKey]._id) cultivarData[dbKey]._id = row.id;
      }
      // Extract formula from origins
      extractFormula(cultivarData[dbKey]);
      // Set poster name
      if (row.user_id && window._profileCache && window._profileCache[row.user_id]) {
        cultivarData[dbKey]._posterName = window._profileCache[row.user_id];
      }
      renderOriginsInner(dbKey, container);
    })
    .catch(function(err) {
      console.warn('renderOrigins fetch error:', err);
      // Fallback to local data
      var localKey = cultivarData[cultivarName] ? cultivarName :
        (cultivarData[cultivarName + ' [Seedling]'] ? cultivarName + ' [Seedling]' : cultivarName);
      renderOriginsInner(localKey, container);
    });
}

// Render structured origin fields as HTML
function renderStructuredOrigin(s) {
  var h = '';
  // Show origin type badge matching cultivar list style
  if (s.origin_type) {
    var bi = getBadgeInfo(s.origin_type, '');
    h += '<div class="mb-sm"><span class="badge ' + bi.cls + ' badge--type-sm">' + bi.txt + '</span></div>';
  }
  if (s.origin_type === 'species') {
    // 分類詳細（サブカテゴリ）
    if (s.species_subcategory && s.species_subcategory !== 'species') {
      var subLabels = { sp: 'sp.', ssp: 'ssp.', cf: 'cf.', aff: 'aff.' };
      h += '<div class="structured-field"><span class="structured-field__label">分類</span><span class="structured-field__value" style="font-style:italic;">' + (subLabels[s.species_subcategory] || s.species_subcategory) + '</span></div>';
    }
    // 記載情報
    var hasPublication = s.species_name || s.author_name || s.publication_year;
    if (hasPublication) {
      h += '<div class="structured-section">';
      h += '<div class="structured-section__title">記載情報</div>';
      h += '<div class="structured-fields">';
      if (s.species_name) h += '<div class="structured-field"><span class="structured-field__label">種名</span><span class="structured-field__value">' + s.species_name + '</span></div>';
      if (s.author_name) h += '<div class="structured-field"><span class="structured-field__label">発表者</span><span class="structured-field__value">' + s.author_name + '</span></div>';
      if (s.publication_year) h += '<div class="structured-field"><span class="structured-field__label">発表年</span><span class="structured-field__value">' + s.publication_year + '</span></div>';
      h += '</div></div>';
    }
    // 採取情報
    var hasCollection = s.collector || s.collection_year || s.type_locality;
    if (hasCollection) {
      h += '<div class="structured-section">';
      h += '<div class="structured-section__title">採取情報</div>';
      h += '<div class="structured-fields">';
      if (s.collector) h += '<div class="structured-field"><span class="structured-field__label">発見者</span><span class="structured-field__value">' + s.collector + '</span></div>';
      if (s.collection_year) h += '<div class="structured-field"><span class="structured-field__label">採取年</span><span class="structured-field__value">' + s.collection_year + '</span></div>';
      if (s.type_locality) h += '<div class="structured-field"><span class="structured-field__label">採取地</span><span class="structured-field__value">' + s.type_locality + '</span></div>';
      h += '</div></div>';
    }
    if (s.known_habitats) h += '<div class="structured-section"><div class="structured-section__title">生息地</div><div class="structured-field__value">' + s.known_habitats + '</div></div>';
  } else if (s.origin_type === 'clone') {
    if (s.namer) h += '<div class="structured-field"><span class="structured-field__label">名付けた人物</span><span class="structured-field__value">' + s.namer + '</span></div>';
    if (s.naming_year) h += '<div class="structured-field"><span class="structured-field__label">名付けた年</span><span class="structured-field__value">' + s.naming_year + '</span></div>';
  } else if (s.origin_type === 'hybrid') {
    if (s.breeder) h += '<div class="structured-field"><span class="structured-field__label">作出者</span><span class="structured-field__value">' + s.breeder + '</span></div>';
    if (s.naming_year) h += '<div class="structured-field"><span class="structured-field__label">名付けた年</span><span class="structured-field__value">' + s.naming_year + '</span></div>';
  } else if (s.origin_type === 'seedling') {
    if (s.breeder) h += '<div class="structured-field"><span class="structured-field__label">作出者</span><span class="structured-field__value">' + s.breeder + '</span></div>';
    if (s.sowing_date) h += '<div class="structured-field"><span class="structured-field__label">播種日</span><span class="structured-field__value">' + s.sowing_date + '</span></div>';
  }
  // 補足欄 (all types)
  if (s.notes) h += '<div class="structured-section"><div class="structured-section__title">補足</div><div class="structured-field__value">' + s.notes + '</div></div>';
  // 引用リンク (all types)
  if (s.citation_links && s.citation_links.length > 0) {
    h += '<div class="structured-section"><div class="structured-section__title">引用</div>';
    s.citation_links.forEach(function(link) {
      var url = typeof link === 'string' ? link : link.url;
      var label = (typeof link === 'object' && link.label) ? link.label : url;
      if (url) h += '<div class="structured-citation"><a href="' + url + '" target="_blank" rel="noopener">' + label + '</a></div>';
    });
    h += '</div>';
  }
  return h;
}

function buildFormulaHtml(data, isSeedling, _sb) {
  var noPhoto = '<div class="parent-photo-placeholder">No Photo</div>';

  function parentBlock(role, name, photoPath) {
    var label = role === 'mother' ? 'Mother (母)' : 'Father (父)';
    var h = '<div class="flex-center-md min-w-0">';
    if (isSeedling) {
      if (photoPath && _sb) {
        var url = _sb.storage.from('gallery-images').getPublicUrl(photoPath).data.publicUrl;
        h += '<div class="parent-photo-display flex-shrink-0"><img class="has-photo parent-photo" src="' + url + '" alt="' + label + '"></div>';
      } else {
        h += '<div class="parent-photo-display flex-shrink-0">' + noPhoto + '</div>';
      }
    }
    h += '<div class="min-w-0">';
    h += '<div class="text-xs text-muted mb-xs">' + label + '</div>';
    h += '<span class="formula-parent formula-parent-display">' + (name || '') + '</span>';
    h += '</div></div>';
    return h;
  }

  var fHtml = '<div class="formula-box mb-lg" style="justify-content:center;align-items:center;flex-direction:column;gap:var(--space-md);padding:var(--space-lg)">';
  fHtml += parentBlock('mother', data.formula.parentA, data.formula.motherPhoto);
  fHtml += '<span class="formula-operator">&times;</span>';
  fHtml += parentBlock('father', data.formula.parentB, data.formula.fatherPhoto);
  fHtml += '</div>';
  return fHtml;
}

function renderOriginsInner(cultivarName, container) {
  var data = cultivarData[cultivarName];
  var isSeedling = data && data._type === 'seedling';
  var _sb = window._supabaseClient;
  if (!data || !data.origins || data.origins.length === 0) {
    container.innerHTML = '<div class="text-center text-muted p-xl">' + t('no_origin_data') + '</div>';
    if (data && data.formula) {
      container.innerHTML = buildFormulaHtml(data, isSeedling, _sb) + container.innerHTML;
    }
    return;
  }

  var origins = data.origins.slice().sort(function(a, b) { return b.trust - a.trust; });
  var html = '';
  if (data.formula) {
    html += buildFormulaHtml(data, isSeedling, _sb);
  }

  origins.forEach(function(origin, i) {
    var trustLevel = getTrustClass(origin.trust);
    html += '<div class="origin-card">';
    if (!isSeedling) {
      html += '<div class="origin-card__header">';
      html += '<span class="origin-card__rank">#' + (i + 1) + '</span>';
      html += '<div class="trust trust--lg" style="flex:1;margin-left:var(--space-md);">';
      html += '<div class="trust__bar"><div class="trust__fill ' + trustLevel + '" style="width:' + origin.trust + '%"></div></div>';
      html += '<span class="trust__label">' + origin.trust + '%</span>';
      html += '</div></div>';
    }
    if (origin.structured) {
      html += '<div class="origin-card__body">' + renderStructuredOrigin(origin.structured) + '</div>';
    } else {
      html += '<div class="origin-card__body"><p>' + origin.body + '</p></div>';
    }
    // Verification details
    if (origin.source_type === 'user_verified' && origin.verification) {
      var v = origin.verification;
      var vid = 'verify-detail-' + i;
      html += '<div class="verification-details">';
      html += '<button class="verification-toggle" onclick="document.getElementById(\'' + vid + '\').classList.toggle(\'d-none\');">検証詳細</button>';
      html += '<div id="' + vid + '" class="variation-detail d-none">';
      if (v.summary_jp) html += '<div class="text-sm variation-summary">' + v.summary_jp + '</div>';
      if (v.claims && v.claims.length > 0) {
        v.claims.forEach(function(c) {
          var si = '?', sc = 'claim--unverifiable';
          if (c.status === 'verified') { si = '\u2713'; sc = 'claim--verified'; }
          else if (c.status === 'partially_verified') { si = '~'; sc = 'claim--partial'; }
          else if (c.status === 'contradicted') { si = '\u26A0'; sc = 'claim--contradicted'; }
          html += '<div class="claim ' + sc + '">' + si + ' ' + c.claim;
          if (c.source) html += ' <span class="text-gray text-xs">(' + c.source + ')</span>';
          html += '</div>';
        });
      }
      if (v.warnings && v.warnings.length > 0) {
        v.warnings.forEach(function(w) { html += '<div class="verification-warnings">&#x26A0; ' + w + '</div>'; });
      }
      if (v.found_sources && v.found_sources.length > 0) {
        html += '<div class="text-sm font-bold mt-sm">AIが発見したリンク:</div>';
        v.found_sources.forEach(function(fs) {
          var rc = fs.reliability === 'high' ? '#2D6A4F' : fs.reliability === 'medium' ? '#D4A373' : '#6c757d';
          html += '<div class="found-source"><a href="' + fs.url + '" target="_blank" rel="noopener">' + (fs.label || fs.url) + '</a> <span style="font-size:0.75rem;color:' + rc + ';">(' + fs.reliability + ')</span></div>';
        });
      }
      html += '</div></div>';
    }
    // Sources
    html += '<div class="origin-card__sources">';
    html += '<div class="text-sm font-bold mb-sm">' + t('source_label') + '</div>';
    if (origin.source_tier && origin.source_name) {
      html += renderTierBadge(origin.source_tier, origin.source_name, origin.source_tier_label_jp);
    }
    var srcList = origin.sources || [];
    srcList.forEach(function(src) {
      var icon = src.icon || '&#x1F310;';
      var text = src.text || src.label || src.url || '';
      var href = src.url || '#';
      if (!text) return;
      html += '<div class="origin-card__source-item"><span class="source-link__icon">' + icon + '</span>';
      if (href && href !== '#') {
        html += '<a href="' + href + '" target="_blank" rel="noopener">' + text + '</a>';
      } else {
        html += '<span>' + text + '</span>';
      }
      html += '</div>';
    });
    if (!srcList.length && origin.source_url) {
      html += '<div class="origin-card__source-item"><span class="source-link__icon">&#x1F310;</span>';
      html += '<a href="' + origin.source_url + '" target="_blank" rel="noopener">' + origin.source_url + '</a></div>';
    }
    html += '</div>';
    // Footer
    html += '<div class="origin-card__footer"><div class="origin-card__author">';
    if (origin.source_type === 'ipni_powo') {
      html += '<span class="badge badge--species badge--type-sm">&#x1F4DA; IPNI/Kew</span>';
    } else if (origin.source_type === 'user_verified') {
      html += '<span class="badge badge--clone badge--type-sm">&#x2705; AI検証済</span>';
    } else if (origin.author && origin.author.isAI) {
      html += '<span class="badge badge--hybrid badge--type-sm">&#x1F916; AI</span>';
    } else {
      html += '<span>&#x1F464;</span><span>' + (origin.author ? origin.author.name : 'User') + '</span>';
    }
    html += '<span class="text-gray">' + (origin.author ? origin.author.date : '') + '</span>';
    html += '</div><div class="vote-group">';
    html += renderVoteButtons(i, origin.votes);
    html += '</div></div>';
    html += '</div>';
  });

  container.innerHTML = html;
}

// ---- Update cultivar detail page dynamically ----
function updateCultivarDetail(cultivarName, rowEl) {
  var detailPage = document.getElementById('page-cultivar');
  if (!detailPage) return;

  // Determine genus from the name (dynamic, supports all genera)
  var genusName = '';
  var genusKey = '';
  var _lowerName = cultivarName.toLowerCase();
  (window._generaData || []).forEach(function(g) {
    if (_lowerName.startsWith(g.slug)) {
      genusName = g.name;
      genusKey = g.slug;
    }
  });
  if (!genusName) { genusName = 'Unknown'; genusKey = ''; }

  // Short name for breadcrumb
  var shortName = cultivarName.replace(' [Seedling]', '').replace(genusName + ' ', '').replace(/'/g, '');

  // Get badge info from row, or fallback to cultivarData._type
  var detectedType = 'species';
  var badgeEl = rowEl ? rowEl.querySelector('.badge') : null;
  if (badgeEl) {
    if (badgeEl.classList.contains('badge--hybrid')) detectedType = 'hybrid';
    else if (badgeEl.classList.contains('badge--clone')) detectedType = 'clone';
    else if (badgeEl.classList.contains('badge--seedling')) detectedType = 'seedling';
  } else {
    var _tempData = cultivarData[cultivarName] || cultivarData[cultivarName + ' [Seedling]'];
    if (!_tempData) {
      Object.keys(cultivarData).forEach(function(k) {
        if (!_tempData && k.replace(' [Seedling]', '') === cultivarName) _tempData = cultivarData[k];
      });
    }
    if (_tempData && _tempData._type) detectedType = _tempData._type;
  }
  var bi = getBadgeInfo(detectedType, cultivarName);

  // Update title
  var displayName = cultivarName.replace(' [Seedling]', '');
  var h1 = detailPage.querySelector('h1');
  if (h1) h1.textContent = displayName;

  // Update SEO meta tags
  var typeLabel = { species: '原種', hybrid: 'Hybrid', clone: 'Clone', seedling: 'Seedling' }[detectedType] || '';
  var metaDesc = displayName + ' (' + genusName + ' ' + typeLabel + ') の由来・歴史情報 - ひなたぼっこぷらんつ';
  var ogImageUrl = window._SUPABASE_URL
    ? window._SUPABASE_URL + '/functions/v1/og-image?name=' + encodeURIComponent(displayName) + '&genus=' + encodeURIComponent(genusName) + '&type=' + encodeURIComponent(detectedType)
    : '';
  updateMeta({
    title: displayName + ' - ' + genusName + ' | ' + _defaultTitle,
    description: metaDesc,
    path: 'cultivar/' + encodeURIComponent(displayName),
    image: ogImageUrl
  });
  updateCultivarJsonLd(displayName, genusName, detectedType, metaDesc);

  // Update favorite button
  updateFavBtn(displayName);

  // Update badge
  var detailBadge = detailPage.querySelector('.badge');
  if (detailBadge) {
    detailBadge.className = 'badge ' + bi.cls;
    detailBadge.textContent = bi.txt;
  }

  // Update genus label next to badge
  var genusLabel = detailPage.querySelector('.flex.gap-sm .text-sm.text-muted:not(#detail-created-at)');
  if (genusLabel) genusLabel.textContent = genusName;

  // Update created_at date
  var createdAtEl = document.getElementById('detail-created-at');
  // Try exact key, then seedling variant (with [Seedling] suffix)
  var cData = cultivarData[cultivarName] || cultivarData[cultivarName + ' [Seedling]'];
  if (!cData && cultivarName.indexOf(' [Seedling]') === -1) {
    // Also try matching by display name (without [Seedling])
    Object.keys(cultivarData).forEach(function(k) {
      if (!cData && k.replace(' [Seedling]', '') === cultivarName) cData = cultivarData[k];
    });
  }

  // Store cultivar ID and DB name on the page for edit/delete buttons
  var _cId = (cData && cData._id) ? cData._id : '';
  var _cDbName = '';
  if (cData) {
    // Find the actual DB key (with [Seedling] if applicable)
    Object.keys(cultivarData).forEach(function(k) {
      if (cultivarData[k] === cData) _cDbName = k;
    });
  }
  detailPage.setAttribute('data-cultivar-id', _cId);
  detailPage.setAttribute('data-cultivar-dbname', _cDbName || cultivarName);
  if (createdAtEl && cData && cData._created_at) {
    var d = new Date(cData._created_at);
    createdAtEl.textContent = d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
  } else if (createdAtEl) {
    createdAtEl.textContent = '';
  }

  // Determine if this is a seedling (used by multiple sections below)
  var isSeedlingDetail = cData && cData._type === 'seedling';

  // Seedling paywall gating
  var seedlingDetailAccess = isSeedlingDetail ? canAccessSeedling(cData) : 'full';
  var paywallOverlay = document.getElementById('detail-paywall-overlay');
  if (paywallOverlay) paywallOverlay.remove();

  if (isSeedlingDetail && seedlingDetailAccess === 'locked') {
    // Show limited info with paywall overlay
    var overlay = document.createElement('div');
    overlay.id = 'detail-paywall-overlay';
    overlay.className = 'paywall-overlay';
    overlay.innerHTML = '<div class="paywall-cta">' +
      '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>' +
      '<h3>My Seedlings</h3>' +
      '<p>実生の詳細情報（交配式・画像・作出者情報）の閲覧にはサブスクリプションが必要です。</p>' +
      '<button class="btn btn--primary" onclick="showPaywallModal()">サブスクリプションを見る</button>' +
      '</div>';
    var originsContainer = document.getElementById('origins-container');
    if (originsContainer) originsContainer.parentNode.insertBefore(overlay, originsContainer);
  }

  // Hide detail sections for locked seedlings
  var originsContainer = document.getElementById('origins-container');
  var gallerySection = detailPage.querySelector('.gallery');
  if (isSeedlingDetail && seedlingDetailAccess === 'locked') {
    if (originsContainer) originsContainer.style.display = 'none';
    if (gallerySection) gallerySection.style.display = 'none';
  } else {
    if (originsContainer) originsContainer.style.display = '';
    if (gallerySection) gallerySection.style.display = '';
  }

  // For owner without subscription: show content but hide edit, show delete only
  if (isSeedlingDetail && seedlingDetailAccess === 'owner') {
    var detailEditBtn = document.getElementById('detail-edit-btn');
    if (detailEditBtn) detailEditBtn.style.display = 'none';
  }

  // Hide creator name next to title (shown in origins section instead)
  var creatorNameEl = document.getElementById('detail-creator-name');
  if (creatorNameEl) {
    creatorNameEl.textContent = '';
  }

  // Update poster name with profile link (seedlings only)
  var posterNameEl = document.getElementById('detail-poster-name');
  if (posterNameEl) {
    if (isSeedlingDetail && cData && cData._userId && cData._posterName) {
      posterNameEl.innerHTML = '投稿者: <a href="' + _basePath + 'profile/' + escHtml(cData._userId) + '" class="text-primary no-decoration">' + escHtml(cData._posterName) + '</a>';
    } else {
      posterNameEl.innerHTML = '';
    }
  }

  // Update breadcrumb
  var breadcrumb = detailPage.querySelector('.breadcrumb');
  if (breadcrumb) {
    var genusLink = breadcrumb.querySelector('[data-genus]');
    if (genusLink) {
      genusLink.textContent = genusName;
      genusLink.setAttribute('data-genus', genusKey);
    }
    var lastSpan = breadcrumb.querySelectorAll('span');
    var crumbName = lastSpan[lastSpan.length - 1];
    if (crumbName && !crumbName.classList.contains('breadcrumb__sep')) {
      crumbName.textContent = shortName;
    }
  }

  // Hide "add origin" section and photo button for seedlings, reset form state on page change
  var addOriginSection = document.getElementById('add-origin-section');
  if (addOriginSection) {
    addOriginSection.style.display = isSeedlingDetail ? 'none' : '';
    var addOriginToggle = document.getElementById('add-origin-toggle');
    var addOriginForm = document.getElementById('add-origin-form');
    if (addOriginToggle) addOriginToggle.style.display = 'block';
    if (addOriginForm) addOriginForm.style.display = 'none';
  }
  var addPhotoBtn = document.getElementById('detail-add-photo-btn');
  if (addPhotoBtn) addPhotoBtn.style.display = isSeedlingDetail ? 'none' : '';

  // Disable empty state glass card click for seedlings
  var emptyGlassEl = document.querySelector('.gallery__empty-glass');
  if (emptyGlassEl) {
    if (isSeedlingDetail) {
      emptyGlassEl.style.pointerEvents = 'none';
      emptyGlassEl.style.cursor = 'default';
      var emptyText = emptyGlassEl.querySelector('.gallery__empty-text');
      if (emptyText) emptyText.textContent = '画像はまだありません';
    } else {
      emptyGlassEl.style.pointerEvents = '';
      emptyGlassEl.style.cursor = '';
      var emptyText = emptyGlassEl.querySelector('.gallery__empty-text');
      if (emptyText) emptyText.textContent = '画像を投稿';
    }
  }

  // Show edit button only for logged-in owner
  var editKeySection = document.getElementById('edit-key-section');
  if (editKeySection) {
    if (window._currentUser && cData && cData._userId === window._currentUser.id) {
      editKeySection.style.display = '';
    } else {
      editKeySection.style.display = 'none';
    }
  }

  // Render origins dynamically
  renderOrigins(cultivarName);
}

// ---- Genus search (filter within genus) ----
// Get the active view container within a genus element
function getActiveView(genusEl) {
  var views = genusEl.querySelectorAll('[data-genus-view]');
  for (var i = 0; i < views.length; i++) {
    if (views[i].style.display !== 'none') return views[i];
  }
  return genusEl; // fallback: no views (e.g. Monstera/Philodendron)
}

// ---- Data-driven filtering: filters in-memory, returns matching items ----
function getFilteredItems(genusEl) {
  var scope = getActiveView(genusEl);
  var slug = genusEl.id.replace('genus-', '');
  var items = _genusItems[slug] || [];
  // Determine if seedlings or species-clones view
  var isSeedlingView = scope.getAttribute('data-genus-view') === 'seedlings';
  // Get search query
  var searchInput = scope.querySelector('.search-bar__input');
  var q = (searchInput ? searchInput.value : '').toLowerCase().trim();
  // Get type filter
  var activeFilterChip = scope.querySelector('.filter-chip.active');
  var filterType = activeFilterChip ? activeFilterChip.getAttribute('data-filter-type') : 'all';

  return items.filter(function(item) {
    var isSeedling = item.meta.type === 'seedling';
    if (isSeedlingView && !isSeedling) return false;
    if (!isSeedlingView && isSeedling) return false;
    if (filterType !== 'all' && item.meta.type !== filterType) return false;
    if (q) {
      var nameMatch = item.fullName.toLowerCase().indexOf(q) !== -1;
      var creatorMatch = item.entry._creatorName && item.entry._creatorName.toLowerCase().indexOf(q) !== -1;
      var posterMatch = item.entry._posterName && item.entry._posterName.toLowerCase().indexOf(q) !== -1;
      if (!nameMatch && !creatorMatch && !posterMatch) return false;
    }
    return true;
  });
}

// For backward compatibility — old code calls filterGenusRows then paginateGenus
function filterGenusRows(genusEl, query) {
  // No-op: filtering is now done in paginateGenus via getFilteredItems
}

// ---- Data-driven pagination: renders only current page from memory ----
var ITEMS_PER_PAGE = 10;
var _dataFullyLoaded = false; // true after full Supabase fetch completes
window._dataFullyLoaded = false;

// Convert RPC row to _genusItems format
function rpcRowToItem(row) {
  var origins = (row.origins || []).filter(function(o) { return !o || o._type !== 'formula'; });
  var formula = null;
  (row.origins || []).forEach(function(o) { if (o && o._type === 'formula') formula = o.formula; });
  var entry = { origins: origins, formula: formula, _type: row.type, _created_at: row.created_at || '', _userId: row.user_id || null };
  if (row.id) entry._id = row.id;
  if (formula && formula.creatorName) entry._creatorName = formula.creatorName;
  var meta = { genus: row.genus, type: row.type || 'Hybrid', created_at: row.created_at || '', user_id: row.user_id || null, id: row.id };
  return { fullName: row.cultivar_name, entry: entry, meta: meta };
}

function paginateGenus(genusEl, page) {
  page = page || 1;
  var scope = getActiveView(genusEl);
  var slug = genusEl.id.replace('genus-', '');
  var allItems = _genusItems[slug] || [];

  // If no data loaded yet for this genus, try server-side pagination
  if (allItems.length === 0 && !_dataFullyLoaded && window._supabaseClient) {
    paginateGenusFromServer(genusEl, page);
    return;
  }

  // Use in-memory pagination (data is loaded)
  paginateGenusFromMemory(genusEl, page);
}

// Server-side paginated fetch via RPC
function paginateGenusFromServer(genusEl, page) {
  var scope = getActiveView(genusEl);
  var slug = genusEl.id.replace('genus-', '');
  var genusName = slug.charAt(0).toUpperCase() + slug.slice(1);

  // Determine sort/filter/search from UI
  var sortChips = scope.querySelectorAll('.chip:not(.filter-chip)');
  var sortMode = 'name';
  sortChips.forEach(function(c) {
    if (c.classList.contains('active')) {
      var txt = c.textContent.trim();
      if (txt.indexOf('信頼') !== -1 || txt.indexOf('Trust') !== -1) sortMode = 'trust';
      else if (txt.indexOf('新着') !== -1 || txt.indexOf('Newest') !== -1) sortMode = 'newest';
    }
  });

  var isSeedlingView = scope.getAttribute('data-genus-view') === 'seedlings';
  var activeFilterChip = scope.querySelector('.filter-chip.active');
  var filterType = activeFilterChip ? activeFilterChip.getAttribute('data-filter-type') : 'all';
  var typeFilter = isSeedlingView ? 'seedling' : filterType;

  var searchInput = scope.querySelector('.search-bar__input');
  var searchQuery = (searchInput ? searchInput.value.trim() : '') || null;

  var offset = (page - 1) * ITEMS_PER_PAGE;

  // Show loading state
  var container;
  if (isSeedlingView) {
    container = scope.querySelector('.seedling-list');
  } else {
    container = scope.querySelector('.card.card--no-pad') || scope.querySelector('.card');
  }
  if (container) container.innerHTML = '<div class="p-md">' + skeletonLines(6) + '</div>';

  window._supabaseClient.rpc('get_cultivars_paginated', {
    p_genus: genusName,
    p_type_filter: typeFilter,
    p_sort: sortMode,
    p_search: searchQuery,
    p_limit: ITEMS_PER_PAGE,
    p_offset: offset
  }).then(function(res) {
    if (res.error || !res.data || !res.data.success) {
      if (container) container.innerHTML = '<div class="text-muted empty-state">' + t('no_results') + '</div>';
      return;
    }

    var total = res.data.total || 0;
    var items = (res.data.items || []).map(rpcRowToItem);
    var totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    if (page > totalPages) page = totalPages;

    // Render rows
    if (container) {
      var html = '';
      items.forEach(function(item) {
        html += buildRowHtml(item.fullName, item.entry, item.meta);
      });
      if (items.length === 0) {
        html = '<div class="text-muted empty-state">' + t('no_results') + '</div>';
      }
      container.innerHTML = html;
      observeLazyImages(container);

      // Attach click handlers for locked seedlings
      if (isSeedlingView) {
        container.querySelectorAll('.cultivar-row--locked').forEach(function(row) {
          row.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showPaywallModal();
          });
        });
      }
    }

    // Also populate cultivarData cache for detail page navigation
    items.forEach(function(item) {
      if (!cultivarData[item.fullName]) {
        cultivarData[item.fullName] = item.entry;
      }
    });

    // Render pagination UI
    renderPaginationUI(scope, page, totalPages, total, searchQuery);
  });
}

// In-memory pagination (original logic)
function paginateGenusFromMemory(genusEl, page) {
  var scope = getActiveView(genusEl);
  var slug = genusEl.id.replace('genus-', '');
  var allItems = _genusItems[slug] || [];
  var filtered = getFilteredItems(genusEl);

  // Sort based on active sort chip
  var sortChips = scope.querySelectorAll('.chip:not(.filter-chip)');
  var sortMode = 'name';
  sortChips.forEach(function(c) {
    if (c.classList.contains('active')) {
      var txt = c.textContent.trim();
      if (txt.indexOf('信頼') !== -1 || txt.indexOf('Trust') !== -1) sortMode = 'trust';
      else if (txt.indexOf('新着') !== -1 || txt.indexOf('Newest') !== -1) sortMode = 'newest';
    }
  });
  filtered.sort(function(a, b) {
    if (sortMode === 'trust') {
      var ta = a.entry.origins.length > 0 ? a.entry.origins[0].trust : 0;
      var tb = b.entry.origins.length > 0 ? b.entry.origins[0].trust : 0;
      return tb - ta;
    }
    if (sortMode === 'newest') {
      return (b.entry._created_at || '').localeCompare(a.entry._created_at || '');
    }
    return a.fullName.localeCompare(b.fullName);
  });

  var totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  if (page > totalPages) page = totalPages;

  // Render only current page's rows into the container
  var isSeedlingView = scope.getAttribute('data-genus-view') === 'seedlings';
  var container;
  if (isSeedlingView) {
    container = scope.querySelector('.seedling-list');
  } else {
    container = scope.querySelector('.card.card--no-pad') || scope.querySelector('.card');
  }
  if (container) {
    var start = (page - 1) * ITEMS_PER_PAGE;
    var end = Math.min(start + ITEMS_PER_PAGE, filtered.length);
    var html = '';
    for (var i = start; i < end; i++) {
      html += buildRowHtml(filtered[i].fullName, filtered[i].entry, filtered[i].meta);
    }
    if (filtered.length === 0) {
      html = '<div class="text-muted empty-state">' + t('no_results') + '</div>';
    }
    container.innerHTML = html;
    observeLazyImages(container);

    // Attach click handlers for locked seedlings
    if (isSeedlingView) {
      container.querySelectorAll('.cultivar-row--locked').forEach(function(row) {
        row.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          showPaywallModal();
        });
      });
    }
  }

  // Render pagination UI
  var isSeedling = scope.getAttribute('data-genus-view') === 'seedlings';
  var totalCount = allItems.filter(function(it) { return isSeedling ? it.meta.type === 'seedling' : it.meta.type !== 'seedling'; }).length;
  var searchInput = scope.querySelector('.search-bar__input');
  var searchQuery = searchInput ? searchInput.value.trim() : '';
  renderPaginationUI(scope, page, totalPages, totalCount, searchQuery || null);
}

// Shared pagination UI renderer
function renderPaginationUI(scope, page, totalPages, totalCount, searchQuery) {
  var pagDiv = scope.querySelector('.pagination');
  if (!pagDiv) return;
  pagDiv.innerHTML = '';

  var prev = document.createElement('a');
  prev.className = 'page-link' + (page <= 1 ? ' disabled' : '');
  prev.innerHTML = '&laquo;';
  prev.setAttribute('data-page', Math.max(1, page - 1));
  pagDiv.appendChild(prev);

  for (var p = 1; p <= totalPages; p++) {
    var link = document.createElement('a');
    link.className = 'page-link' + (p === page ? ' active' : '');
    link.textContent = p;
    link.setAttribute('data-page', p);
    pagDiv.appendChild(link);
  }

  var next = document.createElement('a');
  next.className = 'page-link' + (page >= totalPages ? ' disabled' : '');
  next.innerHTML = '&raquo;';
  next.setAttribute('data-page', Math.min(totalPages, page + 1));
  pagDiv.appendChild(next);

  // Update count text
  var countEl = scope.querySelector('.text-muted.mb-lg');
  if (countEl) {
    if (searchQuery) {
      // For server-side, total IS the filtered count; for memory, it's the view total
      countEl.textContent = totalCount + ' 品種が登録されています';
    } else {
      countEl.textContent = totalCount + ' 品種が登録されています';
    }
  }
}

// ---- Global search (top page + search page) ----
function globalSearch(query) {
  var q = query.toLowerCase().trim();
  if (!q) return;

  // -- Cultivar search (data-driven from _genusItems) --
  var cultivarResults = [];
  Object.keys(_genusItems).forEach(function(slug) {
    (_genusItems[slug] || []).forEach(function(item) {
      if (item.fullName.toLowerCase().indexOf(q) !== -1) {
        cultivarResults.push(item);
      }
    });
  });

  // Update title
  var title = document.getElementById('search-title');
  if (title) title.textContent = '"' + query + '" の検索結果';

  // Render cultivar results from data (not DOM cloning)
  var cultivarList = document.getElementById('search-cultivar-list');
  if (cultivarList) {
    if (cultivarResults.length === 0) {
      cultivarList.innerHTML = '<div class="text-muted empty-state">' + t('no_results') + '</div>';
    } else {
      var html = '';
      cultivarResults.forEach(function(item) {
        html += buildRowHtml(item.fullName, item.entry, item.meta);
      });
      cultivarList.innerHTML = html;
      observeLazyImages(cultivarList);
    }
  }

  // Update pagination
  var searchPag = document.querySelector('#page-search .pagination');
  if (searchPag) {
    searchPag.innerHTML = '<a class="page-link active">1</a>';
  }

  // -- User search (Supabase RPC) --
  var userSection = document.getElementById('search-user-results');
  var userList = document.getElementById('search-user-list');
  var summary = document.getElementById('search-summary');

  // Show cultivar count immediately
  if (summary) summary.textContent = '品種 ' + cultivarResults.length + '件';

  // Hide user section initially
  if (userSection) userSection.style.display = 'none';

  var sb = window._supabaseClient;
  if (sb) {
    sb.rpc('search_profiles', { p_query: q, p_limit: 10 }).then(function(res) {
      if (res.error) {
        console.error('search_profiles RPC error:', res.error);
        if (userSection) userSection.style.display = 'none';
        return;
      }
      if (!res.data || res.data.length === 0) {
        if (userSection) userSection.style.display = 'none';
        return;
      }
      var users = res.data;
      // Update summary with both counts
      if (summary) summary.textContent = '品種 ' + cultivarResults.length + '件 / ユーザー ' + users.length + '件';

      // Render user results
      var html = '';
      users.forEach(function(u) {
        var profileUrl = u.username ? _basePath + 'profile/@' + escHtml(u.username) : _basePath + 'profile/' + escHtml(u.id);
        var avatarHtml = '';
        if (u.avatar_url) {
          avatarHtml = '<img src="' + escHtml(u.avatar_url) + '" class="avatar-sm" alt="">';
        } else {
          avatarHtml = '<div class="avatar-placeholder-sm">' + (u.display_name ? escHtml(u.display_name.charAt(0).toUpperCase()) : '?') + '</div>';
        }
        html += '<a href="' + profileUrl + '" class="user-list-item">';
        html += avatarHtml;
        html += '<div class="flex-1 min-w-0">';
        html += '<div class="font-semibold">' + escHtml(u.display_name || t('name_not_set')) + '</div>';
        if (u.username) {
          html += '<div class="text-sm text-muted">@' + escHtml(u.username) + '</div>';
        }
        if (u.bio) {
          var bioShort = u.bio.length > 60 ? u.bio.substring(0, 60) + '...' : u.bio;
          html += '<div class="font-xs-btn text-muted" style="margin-top:2px">' + escHtml(bioShort) + '</div>';
        }
        html += '</div>';
        html += '<div class="font-xs-btn text-muted whitespace-nowrap">' + escHtml(u.post_count) + ' 投稿</div>';
        html += '</a>';
      });
      if (userList) userList.innerHTML = html;
      if (userSection) userSection.style.display = '';
    }).catch(function(err) {
      console.error('search_profiles exception:', err);
      if (userSection) userSection.style.display = 'none';
      showToast(t('toast_user_search_failed'), true);
    });
  }

  navigateTo('search', {});
}

// Navigation click handler
document.addEventListener('click', function(e) {
  // Pagination clicks
  var pageLink = e.target.closest('.page-link');
  if (pageLink && !pageLink.classList.contains('disabled')) {
    e.preventDefault();
    var pageNum = parseInt(pageLink.getAttribute('data-page'), 10);
    if (!isNaN(pageNum)) {
      var genusEl = pageLink.closest('.genus-content');
      if (genusEl) {
        paginateGenus(genusEl, pageNum);
        genusEl.scrollIntoView({behavior: 'smooth'});
      }
    }
    return;
  }

  var navEl = e.target.closest('[data-nav]');
  if (navEl) {
    e.preventDefault();
    var page = navEl.getAttribute('data-nav');
    var genus = navEl.getAttribute('data-genus');
    var navOptions = {};

    // If clicking a cultivar row, get key and update detail page
    if (page === 'cultivar') {
      var nameEl = navEl.querySelector('.cultivar-row__name');
      var cultivarKey = navEl.getAttribute('data-key') || (nameEl && (nameEl.getAttribute('data-key') || nameEl.textContent));
      if (cultivarKey) {
        // Pass the row element so navigateTo can use badge info;
        // updateCultivarDetail is called inside navigateTo via popstate too
        updateCultivarDetail(cultivarKey, navEl);
        navOptions.cultivar = cultivarKey;
        navOptions._skipUpdate = true;
      }
    }

    if (page === 'genus' && genus) {
      navOptions.genus = genus.toLowerCase();
    }

    if (page === 'profile') {
      var userid = navEl.getAttribute('data-userid');
      if (userid) navOptions.userId = userid;
    }

    // If navigating to contribute in edit mode, set _editFlow to prevent exitEditMode
    var isEditNav = page === 'contribute' && navEl.getAttribute('data-edit') === 'true';
    if (isEditNav) navOptions._editFlow = true;

    navigateTo(page, navOptions);

    // Pre-select genus if coming from genus page, otherwise reset to placeholder
    if (page === 'contribute') {
      if (isEditNav) {
        // Get current cultivar name from the detail page h1
        var detailH1 = document.querySelector('#page-cultivar h1');
        var editCultivarName = detailH1 ? detailH1.textContent : '';
        if (editCultivarName && typeof window.enterEditMode === 'function') {
          window.enterEditMode(editCultivarName);
        }
      } else {
        // Reset to new registration mode
        if (typeof window.exitEditMode === 'function') window.exitEditMode();
        var genusSelect = document.querySelector('#page-contribute .form-select');
        if (genusSelect) {
          if (genus) { genusSelect.value = genus; } else { genusSelect.selectedIndex = 0; }
          genusSelect.dispatchEvent(new Event('change'));
        }
      }
    }
    if (page === 'contribute' && navEl.getAttribute('data-contribute-type') === 'seedling') {
      if (!window._isSubscribed) {
        if (!window._currentUser) {
          showToast('実生の投稿にはログインとサブスクリプションが必要です', true);
        } else {
          showPaywallModal();
        }
      } else {
        var seedlingRadio = document.querySelector('#page-contribute input[name="cultivar-type"][value="seedling"]');
        if (seedlingRadio) { seedlingRadio.checked = true; seedlingRadio.dispatchEvent(new Event('change')); }
      }
    }

    // Close mobile nav
    document.getElementById('mobileNav').classList.remove('open');
  }
});

// Edit button on cultivar detail page - require login
(function() {
  document.addEventListener('click', function(e) {
    var editBtn = e.target.closest('#detail-edit-btn');
    if (!editBtn) return;
    e.preventDefault();
    var detailH1 = document.querySelector('#page-cultivar h1');
    var cultivarName = detailH1 ? detailH1.textContent : '';
    if (!cultivarName) { showToast('品種が見つかりません', true); return; }
    // Check if this is a seedling (badge says Seedling) - DB stores with [Seedling] suffix
    var detailBadge = document.querySelector('#page-cultivar .badge');
    if (detailBadge && detailBadge.classList.contains('badge--seedling')) {
      cultivarName = cultivarName + ' [Seedling]';
    }

    if (!window._currentUser) {
      showToast('編集するにはログインが必要です', true);
      return;
    }

    var sbClient = window._supabaseClient;
    if (!sbClient) {
      showToast('データベース接続エラー', true);
      return;
    }

    editBtn.disabled = true;
    editBtn.style.opacity = '0.5';

    var storedId = document.getElementById('page-cultivar').getAttribute('data-cultivar-id');
    var query;
    if (storedId) {
      query = sbClient.from('cultivars').select('id, user_id').eq('id', storedId).limit(1);
    } else {
      query = sbClient.from('cultivars').select('id, user_id').eq('cultivar_name', cultivarName).limit(1);
    }
    query.then(function(res) {
      if (res.error) throw new Error(res.error.message);
      if (!res.data || res.data.length === 0) throw new Error('品種が見つかりません');
      var row = res.data[0];

      // Allow if owner (admin check is done server-side in RPC)
      if (row.user_id && window._currentUser.id === row.user_id) {
        return row.id;
      }
      throw new Error('この品種の編集権限がありません');
    }).then(function(cultivarId) {
      editBtn.disabled = false;
      editBtn.style.opacity = '';
      navigateTo('contribute', { _editFlow: true });
      if (typeof window.enterEditMode === 'function') {
        window.enterEditMode(cultivarName, null, cultivarId);
      }
    }).catch(function(err) {
      editBtn.disabled = false;
      editBtn.style.opacity = '';
      showToast(err.message || '検証エラー', true);
    });
  });
})();
