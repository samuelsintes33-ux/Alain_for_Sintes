const CACHE_NAME = 'almacenpro-v3';
const ASSETS = ['./', './index.html', './manifest.json', './icon.png'];

self.addEventListener('message', (event) => {
  if(event.data && event.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Notificaciones push: llegan aunque la app esté cerrada o el teléfono bloqueado.
self.addEventListener('push', (event) => {
  let data = { title: 'AlmacénPro', body: 'Tienes novedades' };
  try{ if(event.data) data = event.data.json(); }catch(e){}
  event.waitUntil(
    self.registration.showNotification(data.title || 'AlmacénPro', {
      body: data.body || '',
      icon: './icon.png',
      badge: './icon.png',
      tag: data.tag || 'almacenpro',
      vibrate: [250,120,250]
    })
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then((clientsArr) => {
      const existing = clientsArr.find(c => c.url.includes(self.registration.scope));
      if(existing) return existing.focus();
      return self.clients.openWindow('./index.html');
    })
  );
});

// Copia guardada primero: la app abre al instante con lo que ya tienes guardado,
// y en segundo plano se busca la versión más nueva para la PRÓXIMA vez que abras.
// Así no dependes de que internet responda rápido para poder empezar a usarla.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchAndUpdate = fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || fetchAndUpdate;
    })
  );
});
