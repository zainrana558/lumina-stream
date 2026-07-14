/**
 * Filesystem-based sitemap cache for Vercel serverless functions.
 *
 * Problem: In-memory `let cachedXml` variables are reset on every cold start
 * in Vercel's serverless environment, causing 20-50+ API calls per sitemap request.
 *
 * Solution: Write cached XML to /tmp (ephemeral disk available in Vercel functions).
 * This persists across requests to the same warm instance. Combined with the
 * existing CDN s-maxage headers, this means:
 *   - CDN hit (most requests): 0 API calls
 *   - Warm instance, cache hit: 0 API calls (reads /tmp file)
 *   - Cold start OR cache expired: 1x API calls (then cached for 24h)
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SITEMAP_TTL = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_DIR = join(tmpdir(), 'lumina-sitemaps');

interface CachedSitemap {
  xml: string;
  cachedAt: number;
}

/**
 * Get cached sitemap XML from /tmp if fresh (< 24h old).
 * Returns null on cache miss or read error.
 */
export async function getSitemapCache(name: string): Promise<string | null> {
  try {
    const filePath = join(CACHE_DIR, `${name}.json`);
    const raw = await readFile(filePath, 'utf-8');
    const parsed: CachedSitemap = JSON.parse(raw);

    if (Date.now() - parsed.cachedAt < SITEMAP_TTL) {
      return parsed.xml;
    }
    // Expired — delete stale file
    const { unlink } = await import('node:fs/promises');
    unlink(filePath).catch(() => {});
  } catch {
    // File doesn't exist or parse error — cache miss
  }
  return null;
}

/**
 * Write sitemap XML to /tmp for 24h persistence.
 * Fire-and-forget — failures are non-critical.
 */
export async function setSitemapCache(name: string, xml: string): Promise<void> {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const filePath = join(CACHE_DIR, `${name}.json`);
    const data: CachedSitemap = { xml, cachedAt: Date.now() };
    await writeFile(filePath, JSON.stringify(data), 'utf-8');
  } catch {
    // Write failure — non-critical, in-memory cache still works for this instance
  }
}