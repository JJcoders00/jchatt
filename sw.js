// JChatt Sovereign Service Worker
const CACHE_NAME = 'jchatt-v2-cache';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

// Pass-through network requests with live fallback
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// Real-time Push Notification Handler for Web & PWA
self.addEventListener('push', (e) => {
  let data = { title: 'JChatt', body: 'New encrypted message' };
  try {
    if (e.data) data = e.data.json();
  } catch (err) {}

  e.waitUntil(
    self.registration.showNotification(data.title || 'JChatt', {
      body: data.body || '',
      icon: './favicon.svg',
      badge: './favicon.svg',
      vibrate: [200, 100, 200],
      data: data
    })
  );
});

// Message handler from web page to show notifications
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(e.data.title || 'JChatt', {
      body: e.data.body || '',
      icon: './favicon.svg',
      badge: './favicon.svg',
      vibrate: [200, 100, 200]
    });
  }
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
