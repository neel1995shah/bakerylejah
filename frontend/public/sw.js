const CACHE_NAME = 'gamdom-cache-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(error => {
      return caches.match(event.request);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || 'Gamdom Alert';
  const options = {
    body: payload.body || 'You have a new update',
    icon: payload.icon || '/logo_embedded.svg',
    badge: payload.badge || '/logo_embedded.svg',
    vibrate: payload.vibrate || [200, 100, 200],
    data: {
      url: payload.url || '/',
      ...payload.data
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    })
  );
});
