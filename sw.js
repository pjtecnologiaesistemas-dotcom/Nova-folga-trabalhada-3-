const CACHE_NAME = 'ft-pj-cache-v1';
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
      return cache.addAll(APP_SHELL);
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

  // Só cuida de requisições GET do mesmo domínio (não intercepta CDNs/Firebase)
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) {
    return;
  }

  // Network-first para o HTML, assim atualizações aparecem sem esperar cache expirar
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

  // Cache-first para o resto (ícones, manifest)
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
