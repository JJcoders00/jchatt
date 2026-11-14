// Jchatt v2 Sovereign Cache Buster & SW Unregisterer
// This script purges all legacy cached data and unregisters any stale service workers
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.registration.unregister();
    })
  );
});

// Pass-through fetch with zero stale caching
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
