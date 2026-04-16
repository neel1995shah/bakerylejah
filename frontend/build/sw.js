const CACHE_NAME = 'finance-cache-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(error => {
      return caches.match(event.request).then(response => {
        if (response) {
          return response;
        }
        return new Response('Network error occurred', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || 'Finance Alert';
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

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there is an active, focused window
      const isFocused = clientList.some((client) => client.visibilityState === 'visible');
      
      if (isFocused) {
        // App is actively open, let Toast handle it, suppress OS popup
        return;
      }

      return self.registration.showNotification(title, options);
    })
  );
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
