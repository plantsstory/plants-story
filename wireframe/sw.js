// Service Worker for Aroid Origins PWA
var CACHE_VERSION = 'aroid-origins-v33';
// Must match the ?v= cache buster in index.html — otherwise the precache
// URLs never match real requests and every asset downloads twice.
var ASSET_VERSION = '20260906d';
var OFFLINE_PAGE = './offline.html';
var STATIC_ASSETS = [
  './',
  './index.html',
  OFFLINE_PAGE,
  './js/app-core.js?v=' + ASSET_VERSION,
  './js/pages.js?v=' + ASSET_VERSION,
  './js/forms.js?v=' + ASSET_VERSION,
  './js/archive.js?v=' + ASSET_VERSION,
  './js/dialogs.js?v=' + ASSET_VERSION,
  './js/gtag-init.js?v=' + ASSET_VERSION,
  './js/sw-register.js?v=' + ASSET_VERSION,
  './css/variables.css?v=' + ASSET_VERSION,
  './css/reset.css?v=' + ASSET_VERSION,
  './css/layout.css?v=' + ASSET_VERSION,
  './css/components.css?v=' + ASSET_VERSION,
  './css/pages.css?v=' + ASSET_VERSION,
  './css/utilities.css?v=' + ASSET_VERSION,
  './css/archive.css?v=' + ASSET_VERSION,
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

// Install: cache static assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean old caches and notify clients to reload
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_VERSION; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      // Notify all clients that a new version is active
      return self.clients.matchAll().then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SW_UPDATED' });
        });
      });
    })
  );
});

// Fetch strategy: network-first with SPA navigation support
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external resources (Supabase API, CDNs, etc.) — always network
  if (url.hostname !== self.location.hostname) return;

  // Skip admin.html and static legal pages — always fetch from network, never SPA fallback
  if (url.pathname.indexOf('admin') !== -1) return;
  if (url.pathname.indexOf('/tokushoho') !== -1) return;

  // SPA navigation requests: serve index.html for client-side routing
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(function(response) {
        // If the server returns an HTML page (200 or 404 with SPA fallback),
        // cache the root index.html and return it
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_VERSION).then(function(cache) {
            cache.put(new Request('./index.html'), clone);
          });
          return response;
        }
        // For 404s on navigation, serve cached index.html (SPA routing)
        return caches.match('./index.html').then(function(cached) {
          return cached || response;
        });
      }).catch(function() {
        return caches.match('./index.html').then(function(cached) {
          return cached || caches.match(OFFLINE_PAGE);
        });
      })
    );
    return;
  }

  // Static assets: stale-while-revalidate (instant from cache, update in background)
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      var fetchPromise = fetch(event.request).then(function(response) {
        if (response.ok) {
          var clone = response.clone();
          caches.open(CACHE_VERSION).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});
