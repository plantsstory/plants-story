// Service Worker for Plants Story PWA
var CACHE_VERSION = 'plants-story-v14';
var STATIC_ASSETS = [
  './',
  './index.html',
  './js/app-core.js',
  './js/pages.js',
  './js/forms.js',
  './js/dialogs.js',
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

// Fetch strategy: network-first for everything (cache only as offline fallback)
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external resources (Supabase API, CDNs, etc.) — always network
  if (url.hostname !== self.location.hostname) return;

  // Network-first: try network, fall back to cache for offline support
  event.respondWith(
    fetch(event.request).then(function(response) {
      // Cache the fresh response for offline use
      var clone = response.clone();
      caches.open(CACHE_VERSION).then(function(cache) {
        cache.put(event.request, clone);
      });
      return response;
    }).catch(function() {
      // Offline: serve from cache
      return caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        // For navigation requests, fall back to cached index.html (SPA)
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return cached;
      });
    })
  );
});
