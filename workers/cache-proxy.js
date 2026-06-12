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
 *   - Retry once on Vercel 500 errors (cold starts)
 *   - Bypass Cloudflare edge cache for all routes (stale JS/API bugs)
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

// ─── API & auth routes — never cache ──────────────────────────────────────
function isNeverCache(pathname) {
  return (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/admin/')
  );
}

export default {
  async fetch(request, env, ctx) {
    const VERCEL_ORIGIN = env.VERCEL_ORIGIN || DEFAULT_VERCEL_ORIGIN;
    const VERCEL_HOST   = new URL(VERCEL_ORIGIN).hostname;
    try {
      return await proxyToVercel(request, VERCEL_ORIGIN, VERCEL_HOST);
    } catch (err) {
      // If Vercel is unreachable, return a clean error
      return new Response(
        JSON.stringify({ error: 'Origin unreachable', details: String(err) }),
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

async function proxyToVercel(request, VERCEL_ORIGIN, VERCEL_HOST) {
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
  // (not the worker's egress IP which would rate-limit all users together)
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';
  forwardHeaders.set('x-forwarded-for', clientIp);
  forwardHeaders.set('x-real-ip', clientIp);

  // ── First attempt ────────────────────────────────────────────────────
  const forwardRequest = buildRequest(targetUrl.toString(), request, forwardHeaders);
  let response = await fetch(forwardRequest);

  // ── Retry once on 500 (Vercel cold start / transient error) ──────────
  if (response.status === 500) {
    const retryUrl = new URL(targetUrl.toString());
    retryUrl.searchParams.set('_nocache', String(Date.now()));
    const retryRequest = buildRequest(retryUrl.toString(), request, forwardHeaders);
    response = await fetch(retryRequest);
  }

  // ── Build clean response ─────────────────────────────────────────────
  const responseHeaders = new Headers();

  for (const [key, value] of response.headers.entries()) {
    if (!RESPONSE_HEADERS_TO_DROP.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  }

  // Force Cloudflare edge to never cache this response
  responseHeaders.set('x-cf-cache', 'BYPASS');

  // Error responses must never be cached anywhere
  if (response.status >= 500) {
    responseHeaders.set('cache-control', 'no-store');
  }

  // API/auth routes: hard no-store regardless of what Vercel sent
  if (isNeverCache(incomingUrl.pathname)) {
    responseHeaders.set('cache-control', 'no-store, no-cache');
  }

  // ── Rewrite Location headers on redirects ────────────────────────────
  // Next.js auth redirects use the Vercel URL — rewrite to worker domain
  // so the browser stays on the user's domain (no visible Vercel URLs)
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
