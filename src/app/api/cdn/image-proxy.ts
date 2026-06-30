/**
 * L14 — CDN Image Service
 *
 * Provides CDN URL helpers for images.
 * Supports Next.js Image Optimization, Cloudflare R2, BunnyCDN, and AniList proxy.
 */

// ---- Configuration ----

const CDN_DOMAIN = process.env.CDN_DOMAIN; // e.g. cdn.lumina-stream.com
const CLOUDFLARE_R2_PUBLIC = process.env.CLOUDFLARE_R2_PUBLIC_URL;
const BUNNY_CDN_HOSTNAME = process.env.BUNNY_CDN_HOSTNAME;

// Whitelisted image domains for proxy
const WHITELISTED_DOMAINS = new Set([
  'image.tmdb.org',
  'img.youtube.com',
  'i.ytimg.com',
  'anilist.co',
  's4.anilist.co',
  'cdn.myanimelist.net',
]);

/**
 * Check if CDN is available for the given URL.
 */
export function shouldUseCdn(originalUrl: string): boolean {
  if (!CDN_DOMAIN) return false;
  try {
    const hostname = new URL(originalUrl).hostname;
    return WHITELISTED_DOMAINS.has(hostname);
  } catch {
    return false;
  }
}

/**
 * Get the CDN-optimized URL for an image.
 * Falls back to the original URL if CDN is not configured.
 */
export function getCdnImageUrl(
  originalUrl: string,
  options?: { width?: number; quality?: number },
): string {
  if (!shouldUseCdn(originalUrl)) return originalUrl;

  const params = new URLSearchParams();
  params.set('url', originalUrl);
  if (options?.width) params.set('width', String(options.width));
  if (options?.quality) params.set('quality', String(options.quality));

  return `/api/cdn/image?${params.toString()}`;
}

/**
 * Get poster URL with CDN optimization.
 */
export function getPosterUrl(posterPath: string | null, size: string = 'w500'): string {
  if (!posterPath) return '/placeholder.svg';
  if (posterPath.startsWith('http')) {
    return shouldUseCdn(posterPath) ? getCdnImageUrl(posterPath, { width: 500 }) : posterPath;
  }
  const original = `https://image.tmdb.org/t/p/${size}${posterPath}`;
  return shouldUseCdn(original) ? getCdnImageUrl(original, { width: 500 }) : original;
}

/**
 * Get backdrop URL with CDN optimization.
 */
export function getBackdropUrl(backdropPath: string | null, size: string = 'w1280'): string {
  if (!backdropPath) return '/placeholder.svg';
  if (backdropPath.startsWith('http')) {
    return shouldUseCdn(backdropPath) ? getCdnImageUrl(backdropPath, { width: 1280 }) : backdropPath;
  }
  const original = `https://image.tmdb.org/t/p/${size}${backdropPath}`;
  return shouldUseCdn(original) ? getCdnImageUrl(original, { width: 1280 }) : original;
}

/**
 * Get thumbnail URL with CDN optimization.
 */
export function getThumbnailUrl(path: string | null): string {
  if (!path) return '/placeholder.svg';
  if (path.startsWith('http')) {
    return shouldUseCdn(path) ? getCdnImageUrl(path, { width: 300, quality: 80 }) : path;
  }
  const original = `https://image.tmdb.org/t/p/w300${path}`;
  return shouldUseCdn(original) ? getCdnImageUrl(original, { width: 300, quality: 80 }) : original;
}