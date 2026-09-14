import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

/**
 * GET /api/embed-proxy
 *
 * Server-side proxy for embed providers that need API keys.
 * The actual provider URL is passed as a query param from /api/embed, and
 * this route's response becomes the client's iframe `src` directly.
 *
 * The API key is fetched here server-side and attached ONLY to the outgoing
 * server-to-server request — it is never placed in any URL or header that
 * reaches the browser (a 302 redirect with the key in the Location URL would
 * be visible in devtools/the resolved iframe src, which is what this fixes).
 */

const ALLOWED_HOSTS = new Set([
  'api.codespecters.com',
  'vidsrc.fyi', 'vidsrc.pm', 'vidsrc.in', 'vidsrc.io',
  'autoembed.co', 'vidphantom.com',
]);

const MAX_REDIRECTS = 3;

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'embed');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    // Key is read server-side from env — never accepted from the caller.
    const key = process.env.NEXSTREAM_API_KEY;

    if (!targetUrl || !key) {
      return NextResponse.json({ error: 'Missing url or key configuration' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    if (parsedUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsedUrl.hostname)) {
      return NextResponse.json({ error: 'Invalid target host' }, { status: 400 });
    }

    // Key is attached only to this server-side fetch, never to a URL sent to the client.
    let fetchUrl = new URL(targetUrl);
    fetchUrl.searchParams.set('apikey', key);

    // Fetch manually (no auto-follow) so every redirect hop is re-validated
    // against the same host allowlist before being followed — a compromised
    // or hijacked provider can't use a redirect to point this server-side
    // fetch at an arbitrary/internal target (SSRF via redirect).
    let response: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      response = await fetch(fetchUrl.toString(), { redirect: 'manual' });
      if (response.status < 300 || response.status >= 400) break;

      const location = response.headers.get('location');
      if (!location) break;

      let nextUrl: URL;
      try {
        nextUrl = new URL(location, fetchUrl);
      } catch {
        return NextResponse.json({ error: 'Invalid redirect target' }, { status: 502 });
      }
      if (nextUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(nextUrl.hostname)) {
        return NextResponse.json({ error: 'Redirect target not allowed' }, { status: 502 });
      }
      fetchUrl = nextUrl;
      response = null;
    }
    if (!response) {
      return NextResponse.json({ error: 'Too many redirects' }, { status: 502 });
    }

    // Strip headers that would block iframe embedding, same as iframe-proxy.
    const headers = new Headers();
    for (const [k, v] of response.headers.entries()) {
      const lower = k.toLowerCase();
      if (lower === 'x-frame-options' || lower === 'content-security-policy' || lower === 'content-security-policy-report-only') continue;
      headers.set(k, v);
    }

    return new Response(response.body, { status: response.status, headers });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
