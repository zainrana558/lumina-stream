/**
 * Lumina Stream — Cloudflare Worker Cache Proxy
 *
 * Traffic flow:
 *   Browser → cache-proxy.zainrana553.workers.dev → lumina-stream-omega.vercel.app
 *
 * Responsibilities:
 *   - Proxy all requests to Vercel origin
 *   - Strip X-Frame-Options only (NOT Content-Security-Policy — CSP controls
 *     frame-src for embed players, stripping it removes XSS protection)
 *   - Strip Vercel-internal headers (age, x-vercel-cache, x-vercel-id)
 *   - Forward real client IP via x-forwarded-for (needed for rate limiting)
 *   - Retry on Vercel 5xx errors (cold starts and transient errors)
 *   - Cache public static assets and ISR pages at the edge (via Cache API)
 *   - Bypass edge cache for API/auth/admin routes
 *   - Rewrite Vercel origin URLs in Location headers (auth redirects)
 *
 * Deploy:
 *   cd workers && wrangler deploy
 */

const DEFAULT_VERCEL_ORIGIN = 'https://lumina-stream-omega.vercel.app';

// ─── Headers to REMOVE before forwarding request to Vercel ────────────────
// Cloudflare injects these; Vercel doesn't need them and some cause issues.
const CF_REQUEST_HEADERS_TO_DROP = new Set([
  'cf-ray',
  'cf-ipcountry',
  'cf-connecting-ip',   // we'll re-add as x-forwarded-for below
  'cf-visitor',
  'cf-worker',
  'cdn-loop',
]);

// ─── Response headers to REMOVE before sending to browser ─────────────────
const RESPONSE_HEADERS_TO_DROP = new Set([
  'x-frame-options',   // INTENTIONAL — allows video iframes in detail pages
                       // (CSP frame-src already whitelists specific embed domains)
  'age',               // Prevents browser treating response as stale cached content
  'x-vercel-cache',    // Vercel internals — not useful to clients
  'x-vercel-id',       // Vercel internals
  'x-powered-by',      // Security: hide server tech stack
  'server',            // Security: hide server identity
]);

// Next.js internal Vary values that Cloudflare can't normalize for cache keys.
// Their presence forces cf-cache-status: DYNAMIC on every page response.
const NEXTJS_INTERNAL_VARY = new Set([
  'rsc',
  'next-router-state-tree',
  'next-router-prefetch',
  'next-router-segment-prefetch',
]);

// ─── API & auth routes — never cache at edge ─────────────────────────────
function isNeverCache(pathname) {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/admin/')
  );
}

// ─── Static asset extensions — always cache at edge ─────────────────────
const CACHEABLE_EXTENSIONS = new Set([
  '.js', '.css', '.woff', '.woff2', '.ttf', '.otf',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico',
]);

function isStaticAsset(pathname) {
  const dot = pathname.lastIndexOf('.');
  if (dot === -1) return false;
  const ext = pathname.slice(dot).toLowerCase();
  return CACHEABLE_EXTENSIONS.has(ext);
}

// ─── Edge cache TTL (seconds) ───────────────────────────────────────────
const EDGE_TTL_STATIC = 86400 * 30;   // 30 days for static assets
const EDGE_TTL_PAGE   = 300;           // 5 minutes for ISR pages

// ─── Determine cache TTL for a given pathname ───────────────────────────
function getCacheTTL(pathname, status) {
  if (isNeverCache(pathname)) return 0;
  if (isStaticAsset(pathname)) return EDGE_TTL_STATIC;
  if (status >= 200 && status < 300) return EDGE_TTL_PAGE;
  return 0;
}

export default {
  async fetch(request, env, ctx) {
    const VERCEL_ORIGIN = env.VERCEL_ORIGIN || DEFAULT_VERCEL_ORIGIN;
    const VERCEL_HOST   = new URL(VERCEL_ORIGIN).hostname;
    try {
      return await proxyToVercel(request, VERCEL_ORIGIN, VERCEL_HOST, ctx);
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Origin unreachable' }),
        {
          status: 502,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      );
    }
  },
};

async function proxyToVercel(request, VERCEL_ORIGIN, VERCEL_HOST, ctx) {
  const incomingUrl = new URL(request.url);
  const targetUrl   = new URL(request.url);

  // Repoint to Vercel origin — keep path + query intact
  targetUrl.hostname = VERCEL_HOST;
  targetUrl.protocol = 'https:';

  // ── Build forwarded headers ──────────────────────────────────────────
  const forwardHeaders = new Headers();

  for (const [key, value] of request.headers.entries()) {
    if (!CF_REQUEST_HEADERS_TO_DROP.has(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  }

  // Vercel needs the correct Host header or it 404s
  forwardHeaders.set('host', VERCEL_HOST);

  // Forward real client IP so Next.js rate limiting sees the actual IP
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';
  const existingChain = request.headers.get('x-forwarded-for');
  forwardHeaders.set('x-forwarded-for', existingChain ? `${existingChain}, ${clientIp}` : clientIp);
  forwardHeaders.set('x-real-ip', clientIp);

  // ── Check edge cache first (Cache API works on all CF plans) ────────
  const pathname = incomingUrl.pathname;
  const cacheTTL = getCacheTTL(pathname, 0); // preliminary check

  // Only check cache for GET/HEAD requests on cacheable routes
  if (cacheTTL > 0 && request.method === 'GET') {
    try {
      const cache = caches.default;
      const cacheKey = new Request(incomingUrl.toString(), { method: 'GET' });
      const cached = await cache.match(cacheKey);
      if (cached) {
        return new Response(cached.body, {
          status: cached.status,
          headers: cached.headers,
        });
      }
    } catch {
      // Cache miss or error — fall through to origin fetch
    }
  }

  // ── Fetch from Vercel origin ────────────────────────────────────────
  const forwardRequest = buildRequest(targetUrl.toString(), request, forwardHeaders);
  let response = await fetch(forwardRequest);

  // ── Retry on 5xx (Vercel cold start / transient errors) ─────────────
  if (response.status >= 500 && response.status <= 504) {
    const retryUrl = new URL(targetUrl.toString());
    retryUrl.searchParams.set('_nocache', String(Date.now()));
    const retryRequest = buildRequest(retryUrl.toString(), request, forwardHeaders);
    response = await fetch(retryRequest);
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
    const varyValues = responseHeaders
      .get('Vary')
      .split(',')
      .map(v => v.trim().toLowerCase());
    const clean = varyValues.filter(v => !NEXTJS_INTERNAL_VARY.has(v));
    if (clean.length > 0) {
      responseHeaders.set('Vary', clean.join(', '));
    } else {
      responseHeaders.set('Vary', 'Accept-Encoding');
    }
  } else {
    responseHeaders.set('Vary', 'Accept-Encoding');
  }

  // ── Determine final cache TTL based on actual response status ───────
  const ttl = getCacheTTL(pathname, response.status);

  if (ttl === 0) {
    // Never-cache routes
    responseHeaders.set('Cache-Control', 'no-store, no-cache');
  } else if (isStaticAsset(pathname)) {
    // Static assets: rely on CDN-Cache-Control (already have Content-Length from Vercel)
    responseHeaders.set('Cache-Control', `public, max-age=${ttl}`);
    responseHeaders.set('CDN-Cache-Control', `public, max-age=${ttl}`);
  } else {
    // HTML pages: set browser + edge cache headers
    responseHeaders.set('Cache-Control', `public, s-maxage=${ttl}, stale-while-revalidate=600`);
    responseHeaders.set('CDN-Cache-Control', `public, max-age=${ttl}`);
  }

  // ── Rewrite Location headers on redirects ────────────────────────────
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location') || '';
    if (location.startsWith(VERCEL_ORIGIN)) {
      const rewritten = location.replace(VERCEL_ORIGIN, `https://${incomingUrl.hostname}`);
      responseHeaders.set('location', rewritten);
    }
    return new Response(null, {
      status: response.status,
      headers: responseHeaders,
    });
  }

  // ── Cache API: buffer + store for page responses ────────────────────
  // HTML pages come from Vercel chunked (no Content-Length). We buffer
  // them, set Content-Length, store in Cache API, and return.
  // Static assets already have Content-Length and are cached by
  // CDN-Cache-Control — no need to double-store them.
  if (ttl > 0 && !isStaticAsset(pathname) && response.status >= 200 && response.status < 300) {
    const body = await response.arrayBuffer();
    responseHeaders.set('Content-Length', body.byteLength.toString());
    responseHeaders.delete('Transfer-Encoding');

    const finalResponse = new Response(body, {
      status: response.status,
      headers: responseHeaders,
    });

    // Store in edge cache (non-blocking via waitUntil)
    try {
      const cache = caches.default;
      const cacheKey = new Request(incomingUrl.toString(), { method: 'GET' });
      // Clone before storing because Response body can only be read once
      ctx.waitUntil(cache.put(cacheKey, finalResponse.clone()));
    } catch {
      // Cache put failure is non-critical
    }

    return finalResponse;
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

function buildRequest(url, originalRequest, headers) {
  const isBodyless = ['GET', 'HEAD', 'OPTIONS'].includes(originalRequest.method.toUpperCase());
  return new Request(url, {
    method:   originalRequest.method,
    headers,
    body:     isBodyless ? null : originalRequest.body,
    redirect: 'manual',   // handle redirects ourselves (rewrite Location)
  });
}