/**
 * Lumina Stream — Cloudflare API Cache Worker
 *
 * Caches TMDB + AniList API responses at Cloudflare's edge.
 * Vercel calls this worker instead of hitting TMDB/AniList directly.
 *
 * Flow:
 *   Vercel serverless → api-cache.zainrana553.workers.dev → TMDB/AniList
 *                           ↑ Cloudflare Cache API (edge)
 *
 * Auth:
 *   - Vercel sends TMDB Bearer token via X-TMDB-Auth header
 *   - Worker verifies with X-Worker-Key to prevent abuse
 *   - AniList: No auth needed (free public API)
 */

const TMDB_ORIGIN = 'https://api.themoviedb.org/3';

// TTL by endpoint pattern (seconds)
function tmdbTtl(path) {
  if (path.includes('/trending')) return 900;
  if (path.includes('/search/')) return 900;
  if (path.includes('/genre/') && path.includes('/list')) return 21600;
  if (path.includes('/discover/')) return 1800;
  if (path.includes('/season/')) return 10800;
  if (path.includes('/recommendations')) return 3600;
  if (path.includes('/videos')) return 10800;
  if (path.includes('/credits')) return 10800;
  if (/\/(movie|tv)\/\d+$/.test(path)) return 10800;
  return 1800;
}

// AniList TTL by query characteristics
function anilistTtl(query, variables = {}) {
  if (variables.search) return 600;
  if (query.includes('TRENDING_DESC') && !query.includes('POPULARITY_DESC')) return 900;
  if ((variables.sort || '').includes('SCORE_DESC')) return 1800;
  if (variables.status === 'RELEASING') return 900;
  if (variables.status === 'NOT_YET_RELEASED') return 3600;
  if (variables.season) return 1800;
  if (variables.id) return 10800;
  return 1800;
}

// Simple string hash for AniList cache keys
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      ...extra,
    },
  });
}

async function handleTmdb(request, url, ctx) {
  if (request.method !== 'GET') {
    return json({ error: 'Only GET for TMDB' }, 405);
  }

  // Auth from Vercel via header
  const bearer = request.headers.get('x-tmdb-auth');
  const apiKey = request.headers.get('x-tmdb-key');

  // Build target URL
  const tmdbPath = url.pathname.slice('/tmdb/'.length);
  const tmdbUrl = new URL(`https://api.themoviedb.org/3/${tmdbPath}`);
  // Copy query params (except api_key — we send via header)
  for (const [k, v] of url.searchParams) {
    if (k !== 'api_key') tmdbUrl.searchParams.set(k, v);
  }

  // Build TMDB auth headers
  const tmdbHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
  if (bearer) {
    tmdbHeaders['Authorization'] = `Bearer ${bearer}`;
  } else if (apiKey) {
    tmdbUrl.searchParams.set('api_key', apiKey);
  } else {
    return json({ error: 'Missing TMDB auth. Send X-TMDB-Auth or X-TMDB-Key header.' }, 401);
  }

  // Cache key (strip auth, normalize)
  const cacheKeyUrl = tmdbUrl.toString();
  const cacheKey = new Request(cacheKeyUrl, { method: 'GET' });

  // Check edge cache
  const cache = caches.default;
  let cached = null;
  try { cached = await cache.match(cacheKey); } catch { /* miss */ }

  if (cached) {
    const h = new Headers(cached.headers);
    h.set('X-Cache-Status', 'HIT');
    return new Response(cached.body, { status: cached.status, headers: h });
  }

  // Fetch from TMDB
  const res = await fetch(tmdbUrl.toString(), { headers: tmdbHeaders });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return json({ error: `TMDB ${res.status}: ${body.slice(0, 200)}` }, res.status);
  }

  const ttl = tmdbTtl(tmdbPath);
  const body = await res.arrayBuffer();

  const respHeaders = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`,
    'CDN-Cache-Control': `public, max-age=${ttl}`,
    'X-Cache-Status': 'MISS',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': String(body.byteLength),
  });

  const response = new Response(body, { status: 200, headers: respHeaders });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function handleAnilist(request, ctx) {
  if (request.method !== 'POST') {
    return json({ error: 'Only POST for AniList' }, 405);
  }

  let body;
  try { body = await request.json(); } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { query, variables = {} } = body;
  if (!query) return json({ error: 'Missing query' }, 400);

  // Deterministic cache key
  const cacheKeyStr = `anilist:${JSON.stringify({ query, variables })}`;
  const cacheKey = new Request(`https://anilist-cache.local/${hashStr(cacheKeyStr)}`, { method: 'GET' });

  const cache = caches.default;
  let cached = null;
  try { cached = await cache.match(cacheKey); } catch { /* miss */ }

  if (cached) {
    const h = new Headers(cached.headers);
    h.set('X-Cache-Status', 'HIT');
    return new Response(cached.body, { status: cached.status, headers: h });
  }

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return json({ error: `AniList ${res.status}: ${text.slice(0, 200)}` }, res.status);
  }

  const ttl = anilistTtl(query, variables);
  const resBody = await res.arrayBuffer();

  const respHeaders = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': `public, max-age=${ttl}, s-maxage=${ttl}`,
    'CDN-Cache-Control': `public, max-age=${ttl}`,
    'X-Cache-Status': 'MISS',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': String(resBody.byteLength),
  });

  const response = new Response(resBody, { status: 200, headers: respHeaders });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-TMDB-Auth, X-TMDB-Key, X-Worker-Key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (path === '/health') return json({ ok: true, service: 'api-cache', version: 2 });
    if (path.startsWith('/tmdb/')) return handleTmdb(request, url, ctx);
    if (path === '/anilist') return handleAnilist(request, ctx);

    return json({ error: 'Not found. Use /tmdb/... or /anilist' }, 404);
  },
};