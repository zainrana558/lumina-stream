/**
 * L14 — Image Proxy API
 *
 * GET /api/cdn/image?url=...&width=...&quality=...
 *
 * Proxies and optionally resizes images from whitelisted domains.
 * Uses sharp for resizing when width is specified.
 * Max response size: 5MB
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

const WHITELISTED_DOMAINS = new Set([
  'image.tmdb.org',
  'img.youtube.com',
  'i.ytimg.com',
  'anilist.co',
  's4.anilist.co',
  'cdn.myanimelist.net',
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const CACHE_TTL = 86400; // 24 hours

function getCacheKey(url: string, width?: number, quality?: number): string {
  return `lumina:cdn:img:${url}:${width || 0}:${quality || 0}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const width = searchParams.get('width') ? parseInt(searchParams.get('width')!) : undefined;
    const quality = searchParams.get('quality') ? parseInt(searchParams.get('quality')!) : undefined;

    if (!url) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    // Validate domain whitelist
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (!WHITELISTED_DOMAINS.has(parsedUrl.hostname)) {
      return NextResponse.json({ error: 'Domain not whitelisted' }, { status: 403 });
    }

    // Check Redis cache
    const redis = getRedis();
    if (redis) {
      try {
        const cacheKey = getCacheKey(url, width, quality);
        const dataStr = await redis.get<string>(cacheKey);
        if (dataStr) {
          const cached = JSON.parse(dataStr) as { buffer: string; contentType: string };
          const buffer = Buffer.from(cached.buffer, 'base64');
          return new NextResponse(new Uint8Array(buffer), {
            headers: {
              'Content-Type': cached.contentType,
              'Cache-Control': `public, max-age=${CACHE_TTL}`,
              'X-Cache': 'HIT',
            },
          });
        }
      } catch {
        // Fall through to fetch
      }
    }

    // Fetch the image
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (!response.ok) {
      return NextResponse.json({ error: `Upstream returned ${response.status}` }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const contentLength = parseInt(response.headers.get('content-length') || '0');

    if (contentLength > MAX_SIZE) {
      return NextResponse.json({ error: 'Image too large (max 5MB)' }, { status: 413 });
    }

    let imageBuffer: Buffer = Buffer.from(await response.arrayBuffer());

    // Resize with sharp if width is specified and sharp is available
    if (width && width > 0 && width < 2000) {
      try {
        // Dynamic import to avoid bundling sharp when not needed
        const sharp = (await import('sharp')).default;
        imageBuffer = Buffer.from(await sharp(imageBuffer)
          .resize({ width, withoutEnlargement: true })
          .jpeg({ quality: quality || 80 })
          .toBuffer());
      } catch {
        // sharp not available — return original
      }
    }

    // Cache the result
    if (redis && imageBuffer.length < MAX_SIZE) {
      try {
        const cacheKey = getCacheKey(url, width, quality);
        await redis.set(
          cacheKey,
          JSON.stringify({
            buffer: imageBuffer.toString('base64'),
            contentType,
          }) as unknown as string,
          { ex: CACHE_TTL },
        );
      } catch {
        // Non-critical
      }
    }

    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(imageBuffer.length),
        'Cache-Control': `public, max-age=${CACHE_TTL}`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}