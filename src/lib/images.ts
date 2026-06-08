/**
 * Centralized image utility for Lumina Stream.
 */

export const TMDB_SIZES = {
  poster: { card: 'w500', thumbnail: 'w185', tiny: 'w92' },
  backdrop: { hero: 'w1280', card: 'w780', thumbnail: 'w300' },
  profile: { large: 'w185', small: 'w92' },
} as const;

export function getTmdbImageUrl(path: string | null | undefined, size: string = 'w500'): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

export function getPosterUrl(path: string | null | undefined, size: string = 'w500'): string | null {
  if (!path) return null;
  return getTmdbImageUrl(path, size);
}

export function getBackdropUrl(path: string | null | undefined, size: string = 'w1280'): string | null {
  if (!path) return null;
  return getTmdbImageUrl(path, size);
}

export function getProfileUrl(path: string | null | undefined, size: string = 'w185'): string | null {
  if (!path) return null;
  return getTmdbImageUrl(path, size);
}

const BLUR_COLORS = [
  '#1a0533', '#0d2137', '#1a3320', '#331a0d',
  '#2d1b5e', '#0d2b33', '#33101a', '#1a2d10',
];

export function getBlurPlaceholder(csIndex: number = 0): string {
  const color = BLUR_COLORS[Math.abs(csIndex) % BLUR_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="15"><rect width="10" height="15" fill="${color}"/></svg>`;
  if (typeof window === 'undefined') {
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
