/**
 * Canonical/SEO base URL — the origin Google indexes.
 *
 * IMPORTANT: This must ALWAYS be the Vercel deployment origin, never the
 * Cloudflare Worker proxy.  NEXT_PUBLIC_SITE_URL is reserved for the proxy
 * and must NOT leak into SEO metadata (canonical, OG, sitemaps, robots).
 */
export const CANONICAL_BASE = 'https://lumina-stream-omega.vercel.app';
export const SITE_NAME = 'Lumina Stream';