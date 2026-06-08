/**
 * Custom Next.js image loader that bypasses Vercel Image Optimization.
 *
 * Vercel free tier allows only 1,000 image optimizations/month.
 * Since TMDB already serves optimized images at different sizes (w92, w185, w342, w500, w780, w1280),
 * Vercel's proxy optimization is redundant and would quickly exhaust the free tier budget.
 *
 * This loader preserves Next.js Image component benefits (lazy loading, blur placeholder,
 * responsive sizing via `sizes` prop, `fill` layout) while serving images directly from
 * the source CDN.
 */

const TMDB_CDN = 'image.tmdb.org';
const ANILIST_CDN = 's4.anilist.co';
const YOUTUBE_CDN = 'img.youtube.com';

export default function luminaImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // TMDB images: src already contains the size path (e.g., /t/p/w500/abc.jpg)
  // The Next.js Image component passes the original src, so we just return it.
  // TMDB handles its own optimization and caching.
  if (src.includes(TMDB_CDN)) {
    return src;
  }

  // AniList images: served as-is from their CDN
  if (src.includes(ANILIST_CDN)) {
    return src;
  }

  // YouTube thumbnails: add quality parameter
  if (src.includes(YOUTUBE_CDN)) {
    return src;
  }

  // Local/static images: pass through
  return src;
}
