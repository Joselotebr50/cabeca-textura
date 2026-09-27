/* ============================================================
   service-worker.js — cache offline + auto-update
   ------------------------------------------------------------
   Estratégia: stale-while-revalidate
   - Serve o cache IMEDIATAMENTE (rápido)
   - Em paralelo, busca a versão nova da rede
   - Se mudou, atualiza o cache pra próxima visita
   Resultado: rápido + nunca fica preso em versão antiga.
   ============================================================ */

const CACHE = 'cabeca-v4';

const ESSENCIAIS = [
  './',
  './index.html',
  './estilo.css',
  './audio.js',
  './jogo.js',
  './manifest.json'
];

/* ---------- INSTALAÇÃO ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(
        ESSENCIAIS.map(url => cache.add(url).catch(() => null))
      )
    ).then(() => self.skipWaiting())
  );
});

/* ---------- ATIVAÇÃO ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---------- FETCH — stale-while-revalidate ---------- */
self.addEventListener('fetch', event => {
  /* 1) Só GET */
  if (event.request.method !== 'GET') return;

  /* 2) Só http/https */
  const url = event.request.url;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      /* dispara o fetch em paralelo, SEMPRE */
      const fetchPromise = fetch(event.request).then(resposta => {
        if (resposta && resposta.status === 200 && resposta.type === 'basic'){
          const copia = resposta.clone();
          caches.open(CACHE).then(cache => {
            cache.put(event.request, copia).catch(() => {});
          });
        }
        return resposta;
      }).catch(() => {
        /* offline + navegação → devolve index */
        if (event.request.mode === 'navigate'){
          return caches.match('./index.html');
        }
        return new Response('', { status: 404 });
      });

      /* Se tem cache, retorna ele JÁ e o fetch continua em background.
         Se não tem, espera o fetch. */
      return cached || fetchPromise;
    })
  );
});