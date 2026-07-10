/**
 * Programmatic SEO — Metadata Template Utility
 *
 * Provides reusable, consistent metadata generation for all dynamically-
 * generated pages. Every template produces:
 *   - title       (150-160 char safe)
 *   - description (exactly 150-160 chars with CTA)
 *   - canonical URL
 *   - Open Graph tags (type, url, title, description, images, siteName)
 *   - Twitter Card tags
 *
 * Usage:
 *   import { buildShowMetadata, buildEpisodeMetadata } from '@/lib/seo/metadata';
 *   export async function generateMetadata({ params }) {
 *     return buildShowMetadata({ title, year, type, description, ... });
 *   }
 */

import type { Metadata } from 'next';

// ── Constants ──────────────────────────────────────────────────────────────

import { CANONICAL_BASE, SITE_NAME } from './constants';

/** Re-export for consumers that import SITE_URL from this module */
export const SITE_URL = CANONICAL_BASE;

/** CTA suffixes by media type — appended to meta descriptions */
const CTA_MAP = {
  movie: 'Stream it free on Lumovia.',
  tv: 'Watch all episodes free on Lumovia.',
  anime: 'Watch subbed & dubbed on Lumovia.',
} as const;

type MediaType = keyof typeof CTA_MAP;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Truncate text to exactly maxLength characters, breaking at word boundaries
 * when possible and appending an ellipsis if truncated.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength - 1);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.6 ? truncated.slice(0, lastSpace) : truncated) + '\u2026';
}

/**
 * Strip all HTML tags and decode HTML entities.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Build a description string optimized for search snippets.
 * Format: "[Plot excerpt] [Featuring cast if available] [CTA]"
 * Target: 150-160 characters.
 */
function buildDescription(opts: {
  plot?: string;
  cast?: string[];
  genres?: string[];
  mediaType?: MediaType;
  year?: number | string;
}): string {
  const { plot, cast, genres, mediaType, year } = opts;

  // Start with plot excerpt
  const cleanPlot = plot ? stripHtml(plot) : '';
  const plotExcerpt = truncate(cleanPlot, 100);

  // Build enrichments
  const parts: string[] = [];

  if (year) parts.push(String(year));
  if (genres?.length) parts.push(genres.slice(0, 2).join(', '));

  const enrichment = parts.length ? `(${parts.join(' \u00B7 ')}) ` : '';

  const cta = mediaType
    ? CTA_MAP[mediaType]
    : 'Watch on Lumovia.';

  // Compose: "[enrichment] [plot] [cta]" and truncate to 160
  let desc = enrichment + plotExcerpt + ' ' + cta;
  if (desc.length > 160) {
    // Shrink plot to fit
    const overhead = enrichment.length + cta.length + 2; // 2 for spaces
    const plotBudget = 160 - overhead;
    const shorterPlot = truncate(cleanPlot, plotBudget);
    desc = enrichment + shorterPlot + ' ' + cta;
  }

  return desc;
}

// ── Show / Title Metadata ──────────────────────────────────────────────────

export interface ShowMetadataInput {
  /** Title of the show/movie */
  title: string;
  /** Release year (optional) */
  year?: number | string;
  /** "movie" | "tv" | "anime" */
  mediaType: MediaType;
  /** Show ID (used in canonical URL) */
  id: number;
  /** Plot/overview text */
  description?: string;
  /** Cast member names (up to 3 shown) */
  cast?: string[];
  /** Genre names (up to 3 used) */
  genres?: string[];
  /** Poster/backdrop image URL */
  image?: string | null;
  /** OG image dimensions */
  imageWidth?: number;
  /** OG image dimensions */
  imageHeight?: number;
  /** Whether this page has thin/insufficient content (adds noindex) */
  isThin?: boolean;
}

/**
 * Generate complete Metadata for a show/movie/anime detail page.
 *
 * Title format: "[Title] (Year) - Watch [Type] Online | Lumovia"
 */
export function buildShowMetadata(input: ShowMetadataInput): Metadata {
  const {
    title, year, mediaType, id, description, cast, genres,
    image, imageWidth, imageHeight, isThin,
  } = input;

  const pageUrl = `${SITE_URL}/details/${id}`;
  const yearStr = year ? ` (${year})` : '';

  const typeLabel =
    mediaType === 'anime' ? 'Anime' :
    mediaType === 'tv' ? 'TV Series' :
    'Movie';

  const titleText = `${title}${yearStr} — Watch ${typeLabel} Online Free`;

  const desc = buildDescription({
    plot: description,
    cast,
    genres,
    mediaType,
    year,
  });

  const ogImages = image
    ? [{ url: image, width: imageWidth || 1200, height: imageHeight || 630, alt: `${title} - ${typeLabel}` }]
    : [];

  return {
    title: titleText,
    description: desc,
    alternates: {
      canonical: pageUrl,
      languages: { 'en-US': pageUrl },
    },
    openGraph: {
      type: mediaType === 'movie' ? 'video.movie' : 'video.tv_show',
      url: pageUrl,
      title: `${title} | ${SITE_NAME}`,
      description: desc,
      siteName: SITE_NAME,
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description: desc,
      images: image ? [image] : [],
    },
    ...(isThin ? { robots: { index: false, follow: true } } : {}),
  };
}

// ── Episode Metadata ───────────────────────────────────────────────────────

export interface EpisodeMetadataInput {
  /** Parent show title */
  showTitle: string;
  /** Show release year */
  showYear?: number | string;
  /** Season number */
  season: number;
  /** Episode number */
  episode: number;
  /** Episode title (from TMDB/AniList) */
  episodeTitle?: string;
  /** Episode overview/plot */
  episodeDescription?: string;
  /** Episode runtime in minutes */
  runtime?: number;
  /** Show ID */
  showId: number;
  /** Show poster/backdrop URL */
  image?: string | null;
  /** Show media type */
  mediaType?: MediaType;
  /** Whether this is a generated/placeholder episode (thin content) */
  isPlaceholder?: boolean;
}

/**
 * Generate complete Metadata for an individual episode page.
 *
 * Title format: "[Show] Season X Episode Y - [Episode Title] | Lumovia"
 * If episode title is unknown: "[Show] Season 1 Episode 3 | Lumovia"
 *
 * Placeholder episodes (no real data from API) get `noindex` to prevent
 * index bloat — this is critical for programmatic SEO at scale.
 */
export function buildEpisodeMetadata(input: EpisodeMetadataInput): Metadata {
  const {
    showTitle, showYear, season, episode, episodeTitle,
    episodeDescription, runtime, showId, image, mediaType, isPlaceholder,
  } = input;

  const pageUrl = `${SITE_URL}/details/${showId}/season/${season}/episode/${episode}`;
  const yearStr = showYear ? ` (${showYear})` : '';

  // Title: compact format to stay under ~60 chars (template appends " | Lumovia")
  // e.g. "Breaking Bad S1E1: Pilot" → 30 chars + " | Lumovia" = 47 chars total
  const epLabel = `S${season}E${episode}`;
  let titleText: string;
  if (episodeTitle) {
    titleText = truncate(`${showTitle} ${epLabel}: ${episodeTitle}`, 50);
  } else {
    titleText = `${showTitle} ${epLabel}`;
  }

  // Description: plot or generated fallback
  let desc: string;
  if (episodeDescription && !isPlaceholder) {
    const cleanPlot = stripHtml(episodeDescription);
    const runtimeStr = runtime ? ` (${runtime} min)` : '';
    desc = truncate(`${showTitle} ${epLabel}: ${cleanPlot}${runtimeStr} Watch now on Lumovia.`, 160);
  } else {
    // Fallback description for episodes without plot data
    const typeLabel = mediaType === 'anime' ? 'anime' : mediaType === 'movie' ? 'movie' : 'series';
    desc = truncate(`Watch ${showTitle} ${epLabel} online free. Stream this ${typeLabel} and more on Lumovia.`, 160);
  }

  const ogImages = image
    ? [{ url: image, width: 1200, height: 630, alt: `${showTitle} ${epLabel}` }]
    : [];

  return {
    title: titleText,
    description: desc,
    alternates: {
      canonical: pageUrl,
      languages: { 'en-US': pageUrl },
    },
    openGraph: {
      type: 'video.episode',
      url: pageUrl,
      title: `${showTitle} ${epLabel}${episodeTitle ? ` - ${episodeTitle}` : ''}`,
      description: desc,
      siteName: SITE_NAME,
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: titleText,
      description: desc,
      images: image ? [image] : [],
    },
    // NOINDEX placeholder/generated episodes to prevent index bloat
    ...(isPlaceholder ? { robots: { index: false, follow: true } } : {}),
  };
}

// ── Thin-Page Guard ────────────────────────────────────────────────────────

/**
 * Determine if a show page has "thin" content — not enough unique text for
 * Google to consider it a quality landing page. Rules:
 *   - No description/overview (< 50 chars)
 *   - No genres
 *   - No cast
 *   - No poster image
 *
 * Pages flagged as thin should get `noindex` to prevent index bloat.
 */
export function isThinContent(opts: {
  description?: string;
  genres?: string[];
  cast?: string[];
  posterPath?: string | null;
  coverImage?: string | null;
}): boolean {
  const hasDesc = (opts.description?.replace(/<[^>]*>/g, '').trim().length || 0) > 50;
  const hasGenres = (opts.genres?.length || 0) > 0;
  const hasCast = (opts.cast?.length || 0) > 0;
  const hasImage = !!(opts.posterPath || opts.coverImage);

  // Thin if missing description AND missing at least 2 of the other 3 signals
  const signals = [hasDesc, hasGenres, hasCast, hasImage].filter(Boolean).length;
  return signals < 2;
}

// ── Re-exports for JSON-LD consumers ────────────────────────────────────────

export { SITE_NAME } from './constants';