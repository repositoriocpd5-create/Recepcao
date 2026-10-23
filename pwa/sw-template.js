/* Service worker do SMEDU Recepção — gerado no build a partir de pwa/sw-template.js. */
const VERSION = '__BUILD_VERSION__';
const CACHE = `smedu-recepcao-${VERSION}`;
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  // Não ativa sozinho: a página pergunta ao usuário antes de aplicar a nova versão.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('smedu-recepcao-') && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Supabase, fontes e demais origens externas sempre vão direto para a rede.
  if (url.origin !== self.location.origin) return;

  // Páginas: rede primeiro (dados e versão sempre atuais); sem conexão, usa o app em cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((page) => page || Response.error())),
    );
    return;
  }

  // Arquivos do build têm hash no nome: cache primeiro.
  if (url.pathname.startsWith('/static/') && /-[A-Za-z0-9_-]{8,}\.(js|css)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)); }
        return response;
      })),
    );
    return;
  }

  // Ícones e imagens: devolve o cache e atualiza em segundo plano.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)); }
        return response;
      }).catch(() => cached || Response.error());
      return cached || network;
    }),
  );
});
