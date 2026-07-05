const CACHE_NAME = 'lumina-v4';
const STATIC_ASSETS = ['/logo.svg'];

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

function isNavigation(request) {
  // HTML page requests (Accept: text/html) or same-origin GET with no extension
  const url = new URL(request.url);
  if (request.mode === 'navigate') return true;
  if (url.origin !== self.location.origin) return false;
  const pathname = url.pathname;
  // No file extension = likely a page route
  return !pathname.includes('.') || pathname === '/' || pathname.endsWith('/');
}

// Install — cache only truly static assets (NOT HTML pages)
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

// Safe cache.put — silences NetworkError when response is opaque or storage is full
function safeCachePut(cache, request, response) {
  return cache.put(request, response).catch(() => {});
}

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

  // Navigation requests (HTML pages): NETWORK-FIRST
  // This ensures users always get fresh server-rendered content,
  // not a stale cached version from a previous deploy or error.
  const OFFLINE_FALLBACK = new Response(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head>' +
    '<body style="display:flex;align-items:center;justify-content:center;height:100vh;' +
    'margin:0;background:#07040F;color:#FFF5E8;font-family:serif;flex-direction:column;gap:12px">' +
    '<div style="font-size:2rem;opacity:.4">✦</div>' +
    '<div>You are offline. Please check your connection.</div>' +
    '</body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );

  if (isNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => safeCachePut(cache, request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || OFFLINE_FALLBACK))
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
            caches.open(CACHE_NAME).then((cache) => safeCachePut(cache, request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503, headers: { 'Content-Type': 'application/json' },
        })))
    );
    return;
  }

  // Static assets (_next, images, fonts, etc.): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => safeCachePut(cache, request, clone));
        }
        return response;
      });
    })
  );
});