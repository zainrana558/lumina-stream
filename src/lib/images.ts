/**
 * Centralized image utility for Lumina Stream.
 *
 * All image URLs should be constructed through these helpers
 * to ensure consistent sizing, format, and cache behavior.
 * Supports TMDB, AniList, and YouTube image sources.
 */

// ── TMDB image sizes for different use cases ──────────────────────
export const TMDB_SIZES = {
  poster: { card: 'w500', thumbnail: 'w185', tiny: 'w92' },
  backdrop: { hero: 'w1280', card: 'w780', thumbnail: 'w300' },
  profile: { large: 'w185', small: 'w92' },
  still: { large: 'w300', small: 'w185' },
} as const;

// ── TMDB image URL builder ──────────────────────────────────────
export function getTmdbImageUrl(
  path: string | null | undefined,
  size: string = 'w500',
): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// ── Poster URL from a MediaItem (handles both TMDB and AniList) ─
export function getPosterUrl(
  item: { poster_path?: string | null } & { _anilistCover?: string },
  size: string = 'w500',
): string | null {
  const anilistCover = (item as Record<string, unknown>)._anilistCover as string | undefined;
  if (anilistCover) return anilistCover;
  if (item.poster_path) return getTmdbImageUrl(item.poster_path, size);
  return null;
}

// ── Backdrop URL ────────────────────────────────────────────────
export function getBackdropUrl(
  path: string | null | undefined,
  size: string = 'w1280',
): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// ── Profile / avatar URL ────────────────────────────────────────
export function getProfileUrl(
  path: string | null | undefined,
  size: string = 'w185',
): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// ── YouTube thumbnail URL ────────────────────────────────────────
export function getYoutubeThumbnail(
  videoKey: string,
  quality: 'default' | 'mqdefault' | 'hqdefault' | 'maxresdefault' = 'mqdefault',
): string {
  return `https://img.youtube.com/vi/${videoKey}/${quality}.jpg`;
}

// ── Blur placeholder (tiny SVG → base64, ~200 bytes) ───────────
// Uses a dark color derived from the theme index for smooth loading
const BLUR_COLORS = [
  '#1a0533', '#0d2137', '#1a3320', '#331a0d',
  '#2d1b5e', '#0d2b33', '#33101a', '#1a2d10',
];

export function getBlurPlaceholder(csIndex: number = 0): string {
  const color = BLUR_COLORS[Math.abs(csIndex) % BLUR_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="15"><rect width="10" height="15" fill="${color}"/></svg>`;
  // btoa works in both browser and Node.js; Buffer is Node-only
  if (typeof window === 'undefined') {
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
