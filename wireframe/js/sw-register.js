if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    // Absolute path so registration works from static stub pages (/genus/name/)
    var swRoot = location.hostname === 'plantsstory.github.io' ? '/plants-story/' : '/';
    navigator.serviceWorker.register(swRoot + 'sw.js').catch(function() {});
  });
  // a first visit has no version to replace: the worker installing now sends SW_UPDATED too, and the page then
  // reloaded at the reader's first tap (or at once in a background tab), loading everything twice (11-26)
  var hadWorker = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'SW_UPDATED') {
      if (!hadWorker) return;
      // Never force-reload a visible tab — it destroys in-progress form input.
      if (document.hidden) {
        window.location.reload();
        return;
      }
      if (document.getElementById('sw-update-banner')) return;
      // someone only reading gets the new version at the next page change, without being asked (board 15 B3);
      // the bar is for a form in progress, and never while a login is coming back
      var busy = function() {
        var a = document.activeElement, pg = document.querySelector('.page.active');
        // a name being chosen for a photo or an individual (＋投稿) is work in progress too: a reload at the
        // page change dropped it, and the photo sheet then never opened (11-24)
        if (window._postIntent || (window._aoHoldReload || 0) > Date.now()) return true;
        return !!document.querySelector('dialog[open]') || (pg && pg.id === 'page-contribute') || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.value);
      };
      var authReturn = /access_token=|[?&]code=|[?&]error=/.test(location.hash + location.search);
      if (!busy() && !authReturn) {
        var armed = true;
        document.addEventListener('ao:page', function() {
          if (!armed || busy()) return;
          armed = false;
          try { if (Date.now() - (+sessionStorage.getItem('sw-auto-reload') || 0) < 60000) return; sessionStorage.setItem('sw-auto-reload', String(Date.now())); } catch (err) {}
          setTimeout(function() { window.location.reload(); }, 0);
        });
        return;
      }
      var banner = document.createElement('div');
      banner.id = 'sw-update-banner';
      banner.setAttribute('role', 'status');
      banner.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;max-width:480px;margin:0 auto;z-index:10000;background:#1E2622;color:#F4F1EA;padding:8px 8px 8px 14px;border-radius:2px;display:flex;gap:12px;align-items:center;justify-content:space-between;font-size:12px;letter-spacing:0.04em;font-family:"IBM Plex Mono",ui-monospace,monospace;white-space:nowrap;';
      banner.innerHTML = '<span>新しいバージョンがあります</span>' +
        '<button type="button" style="background:#F4F1EA;color:#1E2622;border:1px solid #F4F1EA;border-radius:2px;padding:5px 12px;font-weight:600;cursor:pointer;font-family:inherit;">更新</button>' +
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
    document.dispatchEvent(new CustomEvent('ao:installable'));

  });
  // the line at the end of 自分の株 (board 17 T222) asks the same prompt
  window.aoCanInstall = function() { return !!deferredPrompt; };
  window.aoInstall = function() { if (!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt.userChoice.then(function() { deferredPrompt = null; }); };
  // offered once something has been posted (a record, a photo, an entry) — not on a timer
  window.offerInstall = function() {
    try { if (localStorage.getItem(DISMISSED_KEY)) return; } catch (e) { return; }
    if (document.querySelector('.pwa-install-banner')) return;
    showInstallBanner();
  };

  function showInstallBanner() {
    if (!deferredPrompt) return;

    var banner = document.createElement('div');
    banner.className = 'pwa-install-banner';
    banner.innerHTML =
      '<span class="pwa-install-banner__text">ホーム画面に追加すると、アプリのように開けます</span>' +
      '<button class="btn btn--sm btn--primary pwa-install-banner__btn" type="button">追加する</button>' +
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
