/**
 * Canonical/SEO base URL — the origin Google indexes.
 *
 * Reads from NEXT_PUBLIC_SITE_URL env var so the domain can be updated
 * without a code change. Falls back to the Vercel deployment URL.
 */
export const CANONICAL_BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://lumovia-stream-omega.vercel.app';
export const SITE_NAME = 'Lumovia';
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
