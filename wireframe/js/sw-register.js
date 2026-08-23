if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    // Absolute path so registration works from static stub pages (/genus/name/)
    var swRoot = location.hostname === 'plantsstory.github.io' ? '/plants-story/' : '/';
    navigator.serviceWorker.register(swRoot + 'sw.js').catch(function() {});
  });
  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'SW_UPDATED') {
      // Never force-reload a visible tab — it destroys in-progress form input.
      if (document.hidden) {
        window.location.reload();
        return;
      }
      if (document.getElementById('sw-update-banner')) return;
      var banner = document.createElement('div');
      banner.id = 'sw-update-banner';
      banner.setAttribute('role', 'status');
      banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:10000;background:#283532;color:#fff;padding:10px 16px;border-radius:999px;display:flex;gap:12px;align-items:center;box-shadow:0 4px 14px rgba(0,0,0,0.25);font-size:14px;';
      banner.innerHTML = '<span>新しいバージョンがあります</span>' +
        '<button type="button" style="background:#34786A;color:#fff;border:none;border-radius:999px;padding:6px 14px;font-weight:600;cursor:pointer;">更新</button>' +
        '<button type="button" aria-label="閉じる" style="background:none;border:none;color:#fff;cursor:pointer;font-size:16px;">&times;</button>';
      var btns = banner.querySelectorAll('button');
      btns[0].addEventListener('click', function() { window.location.reload(); });
      btns[1].addEventListener('click', function() { banner.remove(); });
      document.body.appendChild(banner);
    }
  });
}

// PWA install prompt — defer and show after engagement
(function() {
  var deferredPrompt = null;
  var DISMISSED_KEY = 'pwa-install-dismissed';

  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;

    // Don't show if user previously dismissed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    // Show after 30s of engagement
    setTimeout(showInstallBanner, 30000);
  });

  function showInstallBanner() {
    if (!deferredPrompt) return;

    var banner = document.createElement('div');
    banner.className = 'pwa-install-banner';
    banner.innerHTML =
      '<span class="pwa-install-banner__text">ホーム画面に追加してオフラインでも利用可能</span>' +
      '<button class="btn btn--sm btn--primary pwa-install-banner__btn" type="button">インストール</button>' +
      '<button class="pwa-install-banner__close" type="button" aria-label="閉じる">&times;</button>';

    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(function() {
      banner.classList.add('pwa-install-banner--visible');
    });

    banner.querySelector('.pwa-install-banner__btn').addEventListener('click', function() {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function() {
        deferredPrompt = null;
        banner.remove();
      });
    });

    banner.querySelector('.pwa-install-banner__close').addEventListener('click', function() {
      banner.remove();
      localStorage.setItem(DISMISSED_KEY, '1');
      deferredPrompt = null;
    });
  }
}());
