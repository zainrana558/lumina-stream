/**
 * Clean URL slug utilities for Lumovia.
 *
 * Converts media items and people into SEO-friendly slug-based URLs:
 *   /movie/inception-2010
 *   /tv/breaking-bad-2008
 *   /anime/one-piece-1999
 *   /actor/leonardo-dicaprio
 *
 * The slug contains a numeric ID suffix for client-side resolution
 * without an API call. Format: `title-year-ID` where ID is the TMDB
 * or namespaced AniList ID.
 */

/**
 * Slugify a string: lowercase, replace non-alphanumeric with hyphens, trim.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

/**
 * Build a media slug: `title-year` (no ID — used for URL display).
 */
export function mediaSlug(title: string, year?: number | string | null): string {
  const base = slugify(title);
  if (year) {
    return `${base}-${String(year).slice(0, 4)}`;
  }
  return base;
}

/**
 * Build a media URL path.
 *
 * Uses the media_type to determine the prefix (/movie, /tv, /anime).
 * Includes the numeric ID in the slug for zero-API-call client resolution.
 *
 * Format: `/movie/inception-2010-27205`
 *
 * The ID is extracted client-side by splitting on the last hyphen-separated
 * numeric segment. This avoids needing a slug→ID API endpoint.
 */
export function mediaUrl(
  id: number,
  title: string,
  mediaType?: 'movie' | 'tv' | string | null,
  year?: number | string | null,
  isAnilist?: boolean,
): string {
  const base = mediaSlug(title, year);
  const prefix = isAnilist ? '/anime' : mediaType === 'movie' ? '/movie' : mediaType === 'tv' ? '/tv' : '/movie';
  return `${prefix}/${base}-${id}`;
}

/**
 * Build a person slug: `name-ID`.
 */
export function personSlug(name: string): string {
  return slugify(name);
}

/**
 * Build a person URL path.
 *
 * Format: `/actor/leonardo-dicaprio-287`
 */
export function personUrl(id: number, name: string): string {
  return `/actor/${personSlug(name)}-${id}`;
}

/**
 * Country name → slug mapping.
 */
export const COUNTRY_SLUGS: Record<string, string> = {
  US: 'united-states',
  CA: 'canada',
  MX: 'mexico',
  GB: 'united-kingdom',
  FR: 'france',
  DE: 'germany',
  ES: 'spain',
  IT: 'italy',
  JP: 'japan',
  KR: 'south-korea',
  IN: 'india',
  CN: 'china',
  TH: 'thailand',
  BR: 'brazil',
  AR: 'argentina',
  CO: 'colombia',
};

/** Reverse lookup: slug → ISO country code */
export const SLUG_TO_COUNTRY: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_SLUGS).map(([code, slug]) => [slug, code]),
);

/**
 * Language name → slug mapping.
 */
export const LANGUAGE_SLUGS: Record<string, string> = {
  en: 'english',
  de: 'german',
  nl: 'dutch',
  sv: 'swedish',
  no: 'norwegian',
  da: 'danish',
  fr: 'french',
  es: 'spanish',
  pt: 'portuguese',
  it: 'italian',
  ro: 'romanian',
  ja: 'japanese',
  ko: 'korean',
  zh: 'chinese',
  hi: 'hindi',
  th: 'thai',
  vi: 'vietnamese',
  ar: 'arabic',
  tr: 'turkish',
  ru: 'russian',
  pl: 'polish',
  cs: 'czech',
};

/** Reverse lookup: slug → ISO language code */
export const SLUG_TO_LANGUAGE: Record<string, string> = Object.fromEntries(
  Object.entries(LANGUAGE_SLUGS).map(([iso, slug]) => [slug, iso]),
);

/**
 * Extract the numeric ID from a slug path.
 * Handles: `inception-2010-27205` → 27205, `breaking-bad-1396` → 1396
 *
 * Strategy: find the last hyphen-separated token that is purely numeric.
 * If the slug is just a number, return it directly (legacy /details/123).
 */
export function extractIdFromSlug(slug: string): number | null {
  // Direct numeric slug (legacy)
  if (/^\d+$/.test(slug)) return Number(slug);

  // Find last numeric segment
  const parts = slug.split('-');
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(parts[i]) && Number(parts[i]) > 0) {
      return Number(parts[i]);
    }
  }
  return null;
}

/**
 * Studio name → slug.
 */
export function studioSlug(name: string): string {
  return slugify(name);
}

/**
 * Build a studio URL path.
 * Format: `/studio/warner-bros`
 */
export function studioUrl(name: string): string {
  return `/studio/${studioSlug(name)}`;
}