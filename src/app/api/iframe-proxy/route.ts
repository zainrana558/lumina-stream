import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

/**
 * GET /api/iframe-proxy?url=<encoded_provider_url>
 *
 * Server-side HTML proxy that bypasses X-Frame-Options: SAMEORIGIN.
 *
 * How it works:
 *   1. Validates the target URL host is a known embed provider
 *   2. Fetches the provider HTML server-side (server-to-server, no XFO check)
 *   3. Strips X-Frame-Options and Content-Security-Policy headers
 *   4. Injects <base href="https://provider.com"> so relative URLs resolve
 *      correctly (JS, CSS, images still load from the provider's domain)
 *   5. Returns the modified HTML — browser sees it as same-origin
 *
 * This unlocks providers that were previously blocked by SAMEORIGIN:
 *   - VidSrc CC, VidSrc.to, TVPizza, LordFlix, etc.
 *
 * Security:
 *   - Strict host whitelist (only known embed providers)
 *   - Rate limited
 *   - Only HTML responses are modified (non-HTML sub-resources pass through;
 *     actual video streams go direct from provider JS to their CDN)
 */

const ALLOWED_HOSTS = new Set([
  // VidSrc family
  'vidsrc.cc', 'vidsrc.to', 'vidsrc.rip', 'vidsrc.xyz',
  'vidsrc.in', 'vidsrc.net', 'vidsrc.mn', 'vidsrc.dev',
  'vidsrc.vip', 'vidsrc.pro', 'vidsrc.pm', 'vidsrc.mov',
  'vidsrc.link', 'vidsrc.fyi', 'vidsrc.su', 'vidsrc.ru',
  'vidsrcme.ru', 'vidsrcme.su', 'vidsrc-me.ru', 'vidsrc-me.su',
  'vidsrc.win',
  // MultiEmbed / vsembed family
  'multiembed.mov', 'multiembed.cc', 'vsembed.ru', 'streamingnow.mov',
  // Other embed providers
  'tvpizza.com', 'lordflix.com', 'kwik.si', 'kwik.cx',
  'embed.su', '2embed.cc', 'autoembed.co', 'autoembed.cc',
  'streamsilk.com', 'streamlare.com', 'streamwish.to',
  'streamhide.to', 'streamsb.net', 'nontongo.win',
  'vidphantom.com', 'superembed.stream', 'videasy.com',
  'player.videasy.net', 'filemoon.sx', 'series9.io',
  'api.series9.io', 'moviesapi.club', 'moviesapi.to',
  'vaplayer.ru', 'anyembed.xyz', 'vidlink.pro',
  '111movies.net', 'hdstream.to', 'embed.filmu.in',
  'pstream.org', 'iframe.pstream.org',
  // Anime providers
  'player.cinezo.live',
  // New providers (2026-07-06)
  'vidcore.org', 'www.vidcore.org',
  'player.vidplus.to',
  'player.vidify.top', 'vidify.top',
  'player.smashy.stream', 'smashy.stream', 'embed.smashystream.com',
]);

// NOTE: Intentionally NOT using Edge runtime here.
// The rate limiter's @upstash/ratelimit may have Node.js-specific fallbacks
// that don't bundle cleanly for Edge. Node.js runtime works for all cases.

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'embed' as 'embed');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get('url');
    if (!rawUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(rawUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Only allow https
    if (targetUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only HTTPS URLs allowed' }, { status: 400 });
    }

    // Strict host whitelist
    if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
      return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
    }

    // Fetch from provider (server-to-server — XFO doesn't apply)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let response: Response;
    try {
      response = await fetch(targetUrl.toString(), {
        signal: controller.signal,
        headers: {
          // Mimic a browser request so providers return HTML (not a 403)
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': targetUrl.origin + '/',
        },
        redirect: 'follow',
      });
    } catch {
      clearTimeout(timeout);
      return NextResponse.json({ error: 'Provider unreachable' }, { status: 502 });
    }
    clearTimeout(timeout);

    // Build clean response headers — strip all blocking headers
    const headers = new Headers();
    for (const [key, value] of response.headers.entries()) {
      const lower = key.toLowerCase();
      // Strip headers that would block iframe embedding
      if (
        lower === 'x-frame-options' ||
        lower === 'content-security-policy' ||
        lower === 'content-security-policy-report-only'
      ) {
        continue;
      }
      headers.set(key, value);
    }

    // Remove frame-blocking headers but do NOT set ALLOWALL (non-standard).
    // Let the parent page's CSP frame-src policy control what's allowed.

    const contentType = response.headers.get('content-type') || '';

    // For HTML responses: inject <base> tag to fix relative URLs
    if (contentType.includes('text/html')) {
      const html = await response.text();
      const baseHref = `${targetUrl.protocol}//${targetUrl.host}/`;

      // Inject <base> after <head> or at the very beginning
      let modified: string;
      const headMatch = html.match(/<head[^>]*>/i);
      if (headMatch) {
        modified = html.replace(
          headMatch[0],
          `${headMatch[0]}\n<base href="${baseHref}">`,
        );
      } else {
        // No <head> tag — prepend before first <script> or <link> or at start
        const firstTag = html.match(/<(script|link|meta)/i);
        if (firstTag && firstTag.index) {
          modified =
            html.slice(0, firstTag.index) +
            `<base href="${baseHref}">\n` +
            html.slice(firstTag.index);
        } else {
          modified = `<base href="${baseHref}">\n` + html;
        }
      }

      return new Response(modified, {
        status: response.status,
        headers,
      });
    }

    // Non-HTML (JS, CSS, images, etc.) — pass through as-is
    // Sub-resources with relative URLs resolve via the <base> tag in the
    // parent HTML, so they hit this proxy again with the correct full URL.
    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}