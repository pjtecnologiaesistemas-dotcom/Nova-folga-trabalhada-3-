const CACHE_NAME = 'ft-pj-cache-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192-4.png',
  './icon-512-4.png'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      /* cache.addAll() e atomico: se UM arquivo do APP_SHELL nao existir
         (404) ou falhar, a promise inteira rejeita e o Service Worker
         nunca termina de instalar - foi isso que quebrou o "baixar/
         instalar" antes. Agora cacheamos item a item e ignoramos falha
         individual, sem derrubar a instalacao inteira. */
      return Promise.all(
        APP_SHELL.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn('[SW] Falhou ao cachear no app shell:', url, err);
          });
        })
      );
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;

  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) {
    return;
  }

  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
          return res;
        })
        .catch(function () { return caches.match(req).then(function (r) { return r || caches.match('./index.html'); }); })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (res) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, clone); });
        return res;
      });
    })
  );
});
