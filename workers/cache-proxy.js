/**
 * Lumovia — Cloudflare Worker Cache Proxy
 *
 * Traffic flow:
 *   Browser → cache-proxy.zainrana553.workers.dev → lumina-stream-omega.vercel.app
 *
 * Responsibilities:
 *   - Proxy all requests to Vercel origin
 *   - Strip Vercel-internal headers (age, x-vercel-cache, x-vercel-id)
 *   - Forward real client IP via x-forwarded-for (needed for rate limiting)
 *   - Retry on Vercel 5xx errors (cold starts and transient errors)
 *   - Cache static assets, ISR pages, AND cacheable API data at the edge
 *   - Cacheable API routes detected by origin's s-maxage header (TMDB data)
 *   - Bypass edge cache for mutating API/auth/admin routes
 *   - Rewrite Vercel origin URLs in Location headers (auth redirects)
 *
 * Deploy:
 *   cd workers && wrangler deploy
 */

const DEFAULT_VERCEL_ORIGIN = 'https://lumina-stream-omega.vercel.app';

// ─── Headers to REMOVE before forwarding request to Vercel ────────────────
const CF_REQUEST_HEADERS_TO_DROP = new Set([
  'cf-ray',
  'cf-ipcountry',
  'cf-connecting-ip',   // we'll re-add as x-forwarded-for below
  'cf-visitor',
  'cf-worker',
  'cdn-loop',
]);

// ─── Response headers to REMOVE before sending to browser ─────────────────
// x-frame-options is deliberately NOT in this list (it used to be — that was
// based on a mix-up: X-Frame-Options only governs whether Lumovia's OWN pages
// can be framed BY another site, not what Lumovia embeds — the video players
// are controlled by CSP's separate frame-src directive, untouched by this).
// Stripping it left Lumovia framable/clickjackable by anyone.
const RESPONSE_HEADERS_TO_DROP = new Set([
  'age',               // Prevents browser treating response as stale cached content
  'x-vercel-cache',    // Vercel internals
  'x-vercel-id',       // Vercel internals
  'x-powered-by',      // Security: hide server tech stack
  'server',            // Security: hide server identity
]);

// Next.js internal Vary values that Cloudflare can't normalize for cache keys.
const NEXTJS_INTERNAL_VARY = new Set([
  'rsc',
  'next-router-state-tree',
  'next-router-prefetch',
  'next-router-segment-prefetch',
]);

// ─── Routes that must NEVER be cached (auth, mutations, admin) ────────────
function isNeverCache(pathname) {
  return (
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/admin/')
  );
}

// ─── Mutating API routes — never cache even if origin says otherwise ──────
// These routes change state (POST/PATCH/DELETE) or return per-user data.
function isMutatingApi(pathname) {
  const mutatingPrefixes = [
    '/api/watchlist',
    '/api/ratings',
    '/api/collections',
    '/api/reminders',
    '/api/stats',
    '/api/user',
    '/api/profile',
    '/api/activity',
    '/api/notifications',
  ];
  return mutatingPrefixes.some(p => pathname.startsWith(p));
}

// ─── Static asset extensions ─────────────────────────────────────────────
const CACHEABLE_EXTENSIONS = new Set([
  '.js', '.css', '.woff', '.woff2', '.ttf', '.otf',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
  '.json', '.xml', '.webmanifest',
]);

function isStaticAsset(pathname) {
  const dot = pathname.lastIndexOf('.');
  if (dot === -1) return false;
  const ext = pathname.slice(dot).toLowerCase();
  // Sitemap XMLs change frequently — don't treat as static assets
  if (ext === '.xml' && pathname.includes('sitemap')) return false;
  return CACHEABLE_EXTENSIONS.has(ext);
}

// ─── Edge cache TTL (seconds) ───────────────────────────────────────────
const EDGE_TTL_STATIC = 86400 * 30;   // 30 days
const EDGE_TTL_PAGE   = 300;           // 5 minutes for ISR pages

// TMDB API cache categories — matches Next.js cache.ts CACHE_TTL
// Vercel strips s-maxage from API responses, so we use X-Cache-Category
// header set by the API route to determine edge TTL.
const API_CATEGORY_TTL = {
  // TMDB categories
  trending:     900,         // 15 min
  popular:      1800,        // 30 min
  search:       900,         // 15 min
  'tmdb-search': 1800,       // 30 min — /api/search multi-search
  details:      10800,       // 3 hours
  season:       10800,       // 3 hours
  discover:     1800,        // 30 min
  'tmdb-discover': 1800,     // 30 min — /api/browse discover
  genre:        21600,       // 6 hours
  credits:      10800,       // 3 hours
  videos:       10800,       // 3 hours
  warm:         21600,       // 6 hours
  // AniList categories
  'anilist-trending':  900,  // 15 min — trending anime changes frequently
  'anilist-popular':   1800, // 30 min — popular/top anime
  'anilist-seasonal':  1800, // 30 min — seasonal anime lists
  'anilist-airing':    900,  // 15 min — currently airing changes often
  'anilist-upcoming':  3600, // 1 hour — upcoming season is stable
  'anilist-search':    600,  // 10 min — search results, shorter to stay fresh
  'anilist-all':       1800, // 30 min — full catalog browse pages
};

// ─── Determine edge cache TTL for a request ─────────────────────────────
function getCacheTTL(pathname, status, responseHeaders) {
  if (status < 200 || status >= 300) return 0;
  if (isNeverCache(pathname)) return 0;
  if (isStaticAsset(pathname)) return EDGE_TTL_STATIC;
  if (isMutatingApi(pathname)) return 0;

  // Honor an explicit "don't store" from the origin. The Next middleware marks
  // every auth-gated / per-user response this way (private, no-store). Without
  // this check the worker would cache it under a URL-only key and serve one
  // user's watchlist / settings / post-login redirect to everyone else.
  const cc = (responseHeaders.get('cache-control') || '').toLowerCase();
  const cdncc = (responseHeaders.get('cdn-cache-control') || '').toLowerCase();
  if (/no-store|private/.test(cc) || /no-store|private/.test(cdncc)) return 0;

  // API routes: use X-Cache-Category header from the API route
  // (Vercel strips s-maxage from API responses, so we can't rely on Cache-Control)
  if (pathname.startsWith('/api/')) {
    const category = responseHeaders.get('x-cache-category');
    if (category && API_CATEGORY_TTL[category]) {
      return API_CATEGORY_TTL[category];
    }
    return 0; // Unknown category or no header = don't cache
  }

  return EDGE_TTL_PAGE;
}

const worker = {
  async fetch(request, env, ctx) {
    const VERCEL_ORIGIN = env.VERCEL_ORIGIN || DEFAULT_VERCEL_ORIGIN;
    const VERCEL_HOST   = new URL(VERCEL_ORIGIN).hostname;
    try {
      return await proxyToVercel(request, VERCEL_ORIGIN, VERCEL_HOST, ctx);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Origin unreachable' }),
        { status: 502, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
      );
    }
  },
};

export default worker;

async function proxyToVercel(request, VERCEL_ORIGIN, VERCEL_HOST, ctx) {
  const incomingUrl = new URL(request.url);
  const targetUrl   = new URL(request.url);
  const _origin     = new URL(VERCEL_ORIGIN);
  targetUrl.hostname = _origin.hostname;
  // Respect the origin's scheme + port. A bare-IP origin over CF triggers
  // error 1003 ("Direct IP Access Not Allowed"), so use a real hostname
  // (e.g. an sslip.io name) even when the box only speaks HTTP on :80.
  targetUrl.protocol = _origin.protocol;
  targetUrl.port     = _origin.port;

  const pathname = incomingUrl.pathname;

  // ── Build forwarded headers ──────────────────────────────────────────
  const forwardHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!CF_REQUEST_HEADERS_TO_DROP.has(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  }
  forwardHeaders.set('host', VERCEL_HOST);
  // Next.js's built-in Server Actions origin check compares the browser's
  // real `Origin` header against `x-forwarded-host` (falling back to the raw
  // `Host` header when absent). Host here is necessarily the private
  // sslip.io origin name (see the port/protocol comment above), which never
  // matches — every Server Action request was being rejected with "Invalid
  // Server Actions request" (confirmed live in prod.log). Forward the
  // public-facing host the client actually connected to instead.
  forwardHeaders.set('x-forwarded-host', incomingUrl.hostname);

  const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || '127.0.0.1';
  const existingChain = request.headers.get('x-forwarded-for');
  forwardHeaders.set('x-forwarded-for', existingChain ? `${existingChain}, ${clientIp}` : clientIp);
  forwardHeaders.set('x-real-ip', clientIp);

  // ── Check edge cache first (GET only) ───────────────────────────────
  if (request.method === 'GET') {
    try {
      const cache = caches.default;
      const cacheKey = new Request(incomingUrl.toString(), { method: 'GET' });
      const cached = await cache.match(cacheKey);
      if (cached) return new Response(cached.body, { status: cached.status, headers: cached.headers });
    } catch {
      // Cache miss — fall through to origin
    }
  }

  // ── Fetch from Vercel origin ────────────────────────────────────────
  const forwardRequest = buildRequest(targetUrl.toString(), request, forwardHeaders);
  let response = await fetch(forwardRequest);

  // ── Retry on 5xx ────────────────────────────────────────────────────
  // GET/HEAD/OPTIONS only: request.body is a ReadableStream that
  // buildRequest() already consumed building forwardRequest above — handing
  // the same (now-locked) stream to a second Request throws, which the
  // caller's try/catch turns into an opaque 502 "Origin unreachable" that
  // hid the origin's real error. Retrying a POST/PATCH/DELETE automatically
  // is also unsafe in general (could double-submit a non-idempotent
  // mutation), so bodied requests just pass through the origin's real
  // response instead of retrying.
  const isBodyless = ['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase());
  if (isBodyless && response.status >= 500 && response.status <= 504) {
    const retryUrl = new URL(targetUrl.toString());
    retryUrl.searchParams.set('_nocache', String(Date.now()));
    response = await fetch(buildRequest(retryUrl.toString(), request, forwardHeaders));
  }

  // ── Build clean response headers ────────────────────────────────────
  const responseHeaders = new Headers();
  for (const [key, value] of response.headers.entries()) {
    if (!RESPONSE_HEADERS_TO_DROP.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  }

  // ── Strip Next.js internal Vary values ──────────────────────────────
  if (responseHeaders.has('Vary')) {
    const clean = responseHeaders.get('Vary').split(',').map(v => v.trim().toLowerCase()).filter(v => !NEXTJS_INTERNAL_VARY.has(v));
    responseHeaders.set('Vary', clean.length > 0 ? clean.join(', ') : 'Accept-Encoding');
  } else {
    responseHeaders.set('Vary', 'Accept-Encoding');
  }

  // ── Determine cache TTL ─────────────────────────────────────────────
  const ttl = getCacheTTL(pathname, response.status, response.headers);

  // ── Set appropriate Cache-Control headers ────────────────────────────
  if (ttl === 0) {
    responseHeaders.set('Cache-Control', 'no-store, no-cache');
  } else if (isStaticAsset(pathname)) {
    responseHeaders.set('Cache-Control', `public, max-age=${ttl}`);
    responseHeaders.set('CDN-Cache-Control', `public, max-age=${ttl}`);
  } else if (pathname.startsWith('/api/')) {
    // Cacheable API data: keep origin's s-maxage, add edge hint
    responseHeaders.set('CDN-Cache-Control', `public, max-age=${ttl}`);
  } else {
    // HTML pages
    responseHeaders.set('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=600`);
    responseHeaders.set('CDN-Cache-Control', `public, max-age=${ttl}`);
  }

  // ── Handle redirects ────────────────────────────────────────────────
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') || '';
    if (location.startsWith(VERCEL_ORIGIN)) {
      responseHeaders.set('location', location.replace(VERCEL_ORIGIN, `https://${incomingUrl.hostname}`));
    }
    return new Response(null, { status: response.status, headers: responseHeaders });
  }

  // ── Buffer + store in Cache API ─────────────────────────────────────
  // Needed for: HTML pages (chunked from Vercel) + API data (JSON).
  // Static assets already have Content-Length and are cached by CDN-Cache-Control.
  if (ttl > 0 && !isStaticAsset(pathname) && request.method === 'GET') {
    const body = await response.arrayBuffer();

    // NOTE: the Next app emits its own <link rel="canonical"> on every page
    // (driven by NEXT_PUBLIC_SITE_URL). The proxy must NOT inject a second
    // canonical — the origin here is a private box hostname that must never be
    // advertised to search engines, and a duplicate/ conflicting canonical
    // hurts indexing. HTML passes through untouched.

    responseHeaders.set('Content-Length', body.byteLength.toString());
    responseHeaders.delete('Transfer-Encoding');

    const finalResponse = new Response(body, { status: response.status, headers: responseHeaders });

    try {
      const cache = caches.default;
      const cacheKey = new Request(incomingUrl.toString(), { method: 'GET' });
      ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
    } catch {
      // Cache put failure is non-critical
    }

    return finalResponse;
  }

  return new Response(response.body, { status: response.status, headers: responseHeaders });
}

function buildRequest(url, originalRequest, headers) {
  const isBodyless = ['GET', 'HEAD', 'OPTIONS'].includes(originalRequest.method.toUpperCase());
  return new Request(url, {
    method: originalRequest.method,
    headers,
    body: isBodyless ? null : originalRequest.body,
    redirect: 'manual',
  });
}