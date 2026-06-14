import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

/**
 * GET /api/embed-proxy
 *
 * Server-side proxy for embed providers that need API keys.
 * The actual provider URL and key are passed as query params from /api/embed (server-to-server).
 * This route is only called by the server internally — never expose keys to the client.
 *
 * Returns a 302 redirect to the actual embed URL with the API key appended.
 */
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
    // This prevents the key appearing in request logs, referrer headers, or URLs.
    const key = process.env.NEXSTREAM_API_KEY;

    if (!targetUrl || !key) {
      return NextResponse.json({ error: 'Missing url or key configuration' }, { status: 400 });
    }

    // Validate the target URL is a known embed provider (prevent open redirect)
    const allowedHosts = [
      'api.codespecters.com',
      'vidsrc.fyi', 'vidsrc.cc', 'vidsrc.xyz', 'vidsrc.to',
      'vidsrc.net', 'vidsrc.pro', 'vidsrc.app', 'vidsrc.ic',
      'www.2embed.online', 'autoembed.co', 'vidphantom.com',
      'embed.su', 'embedvip.com', 'multiembed.mov', 'moviesapi.club',
    ];

    const parsedUrl = new URL(targetUrl);
    if (!allowedHosts.includes(parsedUrl.hostname)) {
      return NextResponse.json({ error: 'Invalid target host' }, { status: 400 });
    }

    // Append API key to the target URL
    const redirectUrl = new URL(targetUrl);
    redirectUrl.searchParams.set('apikey', key);

    return NextResponse.redirect(redirectUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
