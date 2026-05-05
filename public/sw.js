const CACHE_NAME = 'or-control-v1';
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

  // Static assets - cache first with network fallback
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|json|woff|woff2)$/i) ||
    url.pathname === '/manifest.json'
  ) {
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
