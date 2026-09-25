/* ============================================================
   service-worker.js — cache offline para o PWA
   ============================================================ */

const CACHE = 'cabeca-v3';

const ESSENCIAIS = [
  './',
  './index.html',
  './estilo.css',
  './audio.js',
  './jogo.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(
        ESSENCIAIS.map(url => cache.add(url).catch(() => null))
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(resposta => {
        if (resposta && resposta.status === 200 && resposta.type === 'basic'){
          const copia = resposta.clone();
          caches.open(CACHE).then(cache => {
            cache.put(event.request, copia).catch(() => {});
          });
        }
        return resposta;
      }).catch(() => {
        if (event.request.mode === 'navigate'){
          return caches.match('./index.html');
        }
        return new Response('', { status: 404 });
      });
    })
  );
});