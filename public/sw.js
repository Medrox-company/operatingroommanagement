const CACHE_NAME = 'or-control-v2';
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

  // API requests - network first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, cloned);
          });
          return response;
        })
        .catch(() => {
          console.log('[SW] API request failed, checking cache:', url.pathname);
          return caches.match(request).then((response) => {
            return response || new Response('Offline - API not available', { status: 503 });
          });
        }),
    );
    return;
  }

  // Kód aplikace (JS/CSS/JSON/manifest) - NETWORK FIRST.
  // Důležité: cache-first by trvale servíroval starý build a změny by se
  // nikdy neprojevily. Síť má proto přednost, cache je jen offline záloha.
  if (
    url.pathname.match(/\.(js|css|json)$/i) ||
    url.pathname === '/manifest.json'
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== 'error') {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || new Response('Offline', { status: 503 }))),
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

  // HTML pages - network first
  event.respondWith(
    fetch(request)
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
          return response || new Response('Offline - page not available', { status: 503 });
        });
      }),
  );
});
