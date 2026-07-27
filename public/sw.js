const CACHE_NAME = 'or-control-v4';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('[SW] Cache addAll error (non-critical):', err);
      });
    }),
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch - network first, fall back to cache for offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external URLs
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Personalizované API odpovědi nikdy neukládáme. Jejich obsah závisí na
  // session a nemocniční cookie; offline kopie by mohla být zastaralá nebo
  // patřit předchozímu uživateli/zařízení.
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Hashované JS/CSS soubory jsou neměnné. Cache-first výrazně urychlí další
  // start a nemůže držet starou verzi, protože nový build má nový název souboru.
  if (
    url.pathname.match(/\.(js|css)$/i)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response && response.status === 200 && response.type !== 'error') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })),
    );
    return;
  }

  // Obrázky a fonty - cache first s network fallbackem (mění se zřídka)
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|gif|woff|woff2)$/i)) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cloned);
          });
          return response;
        });
      }),
    );
    return;
  }

  // Ostatní požadavky (např. RSC datové streamy) necháme obsloužit prohlížeč
  // přímo. HTML fallback se nesmí vrátit místo datového formátu Next.js.
  const acceptsHtml = request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');
  if (!acceptsHtml) return;

  // HTML stránky: síť má přednost, ale při pomalé/neprůchodné nemocniční síti
  // čekáme nejvýše 3 sekundy a poté použijeme poslední uložený shell.
  event.respondWith(
    Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('network-timeout')), 3000)),
    ])
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, cloned);
        });
        return response;
      })
      .catch(() => {
        console.log('[SW] Page request failed, checking cache:', url.pathname);
        return caches.match(request).then((response) => {
          return response || caches.match('/').then((root) => root || new Response('Offline - page not available', { status: 503 }));
        });
      }),
  );
});
