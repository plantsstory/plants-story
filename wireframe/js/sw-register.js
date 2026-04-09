if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js').catch(function() {});
  });
  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'SW_UPDATED') {
      window.location.reload();
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
