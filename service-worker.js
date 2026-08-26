const CACHE_NAME = 'almacenpro-v5';
// IMPORTANTE para quien edite esta app en el futuro: el navegador solo detecta que "hay una
// actualización" cuando el CONTENIDO de ESTE archivo (service-worker.js) cambia — nunca por
// cambios en index.html. Si se edita index.html sin subir también aquí el número de versión,
// "Buscar actualización" seguirá diciendo (con razón, desde su punto de vista) "ya tienes la
// última versión" en todos los teléfonos, aunque el código nuevo nunca llegue a nadie. Esto
// fue la causa real de que un teléfono llevara varios días con código viejo pese a haber
// "buscado actualización" muchas veces. Regla simple: cada vez que se suba un index.html
// nuevo, subir también este número (v4, v5, v6...).
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
  const targetUrl = new URL('./index.html', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({type:'window', includeUncontrolled:true}).then((clientsArr) => {
      const existing = clientsArr.find(c => c.url.startsWith(self.registration.scope));
      if(existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
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
