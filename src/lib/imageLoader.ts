/**
 * Custom Next.js image loader that bypasses Vercel Image Optimization.
 *
 * Vercel free tier allows only 1,000 image optimizations/month.
 * Since TMDB already serves optimized images at different sizes (w92, w185, w342, w500, w780, w1280),
 * Vercel's proxy optimization is redundant and would quickly exhaust the free tier budget.
 *
 * This loader preserves Next.js Image component benefits (lazy loading, blur placeholder,
 * responsive sizing via `sizes` prop, `fill` layout) while serving images directly from
 * the source CDN with width-appropriate TMDB size selection.
 */

const TMDB_CDN = 'image.tmdb.org';
const ANILIST_CDN = 's4.anilist.co';
const YOUTUBE_CDN = 'img.youtube.com';

// Map requested widths to the nearest TMDB poster size
const TMDB_POSTER_SIZES = [92, 185, 342, 500, 780] as const;
const TMDB_BACKDROP_SIZES = [300, 780, 1280] as const;

function nearestTmdbSize(requested: number, sizes: readonly number[]): string {
  // Find the smallest TMDB size >= requested width
  for (const s of sizes) {
    if (s >= requested) return `w${s}`;
  }
  // Fallback to largest
  return `w${sizes[sizes.length - 1]}`;
}

export default function luminaImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  // TMDB images: select appropriate size based on requested width
  if (src.includes(TMDB_CDN)) {
    // Detect if it's a backdrop (original aspect ratio ~16:9) or poster (2:3)
    const isBackdrop = src.includes('/t/p/w1280') || src.includes('/t/p/w780') || src.includes('/t/p/w300') || src.includes('/original');
    const sizeSet = isBackdrop ? TMDB_BACKDROP_SIZES : TMDB_POSTER_SIZES;
    const size = nearestTmdbSize(width, sizeSet);

    // Replace the existing size in the URL
    return src.replace(/\/t\/p\/w\d+/, `/t/p/${size}`);
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