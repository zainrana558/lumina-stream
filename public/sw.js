const CACHE_NAME = 'lumina-v2';
const STATIC_ASSETS = ['/', '/logo.svg'];

// API routes that must NEVER be served from cache (auth/user-specific)
const NO_CACHE_PREFIXES = [
  '/api/watchlist',
  '/api/progress',
  '/api/activity',
  '/api/profiles',
  '/api/active-profile',
  '/api/select-profile',
  '/api/notifications',
  '/api/follows',
  '/api/collections',
  '/api/comments',
  '/api/stats',
  '/api/reminders',
  '/api/leaderboard',
  '/api/watch-party',
  '/api/cache',
  '/auth/',
];

function isNeverCache(url) {
  const pathname = new URL(url).pathname;
  return NO_CACHE_PREFIXES.some(p => pathname.startsWith(p));
}

// Install — cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — remove old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET, same-origin
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Auth-sensitive API routes: strict network-only, never cache
  if (isNeverCache(request.url)) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // Public API routes (TMDB, search, embed-health): network-first, short cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
