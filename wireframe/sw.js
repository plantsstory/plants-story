// Service Worker for Plants Story PWA
var CACHE_VERSION = 'plants-story-v35';
var OFFLINE_PAGE = './offline.html';
var STATIC_ASSETS = [
  './',
  './index.html',
  OFFLINE_PAGE,
  './js/app-core.js',
  './js/pages.js',
  './js/forms.js',
  './js/dialogs.js',
  './js/gtag-init.js',
  './js/sw-register.js',
  './css/variables.css',
  './css/reset.css',
  './css/layout.css',
  './css/components.css',
  './css/pages.css',
  './css/utilities.css',
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

  // Skip admin.html — always fetch from network, never SPA fallback
  if (url.pathname.indexOf('admin') !== -1) return;

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
