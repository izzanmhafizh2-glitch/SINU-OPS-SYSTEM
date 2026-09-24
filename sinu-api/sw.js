// ===================== SERVICE WORKER — PT SINu =====================
// Menangani Web Push agar notifikasi tetap masuk ke HP walau aplikasi ditutup.

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

// Terima pesan push dari server (Supabase Edge Function).
self.addEventListener('push', function(event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'PT SINu', body: event.data ? event.data.text() : 'Notifikasi baru' };
  }

  const title = data.title || 'PT SINu';
  const options = {
    body: data.body || 'Ada pembaruan baru.',
    icon: data.icon || 'assets/logo-s.png?v=1000182',
    badge: data.badge || 'assets/logo-s.png?v=1000182',
    tag: data.tag || 'sinu-notif',
    renotify: true,
    data: { url: data.url || '/' },
    vibrate: [120, 60, 120]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Saat notifikasi diklik, buka/aktifkan aplikasi.
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
