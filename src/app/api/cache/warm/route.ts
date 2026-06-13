/**
 * POST /api/cache/warm
 *
 * Pre-warms Redis with full genre catalogs (up to 2000 items per genre).
 * Called by Vercel Cron every 6 hours, or manually via POST.
 *
 * Requires header: Authorization: Bearer $CACHE_WARM_SECRET
 * (CACHE_WARM_SECRET env var — set in Vercel dashboard)
 *
 * Redis commands per full warm:
 *   - ~700 per-page GETs (hits existing discover cache)
 *   - ~700 per-page SETs (if expired/cold)
 *   - 7 SET commands for warm lists
 *   Total: ~1400 commands, well within 10k/day free tier
 */

import { NextRequest, NextResponse } from 'next/server';
import { tmdbFetch } from '@/lib/tmdb/server';
import { setCache, getCached, CACHE_TTL } from '@/lib/cache';

// Turbopack aggressively caches type info from imported modules.
// Cast 'warm' to bypass stale CacheCategory type resolution.
const WARM = 'warm' as Parameters<typeof getCached>[0];
import { getPopularAnime } from '@/lib/anilist/client';
import { anilistToMediaItem } from '@/lib/anilist/client';
import { tmdbToMedia } from '@/types';
import type { TMDBShow } from '@/types';
import type { MediaItem } from '@/types';

// ─── Genre configs ──────────────────────────────────────────────────────────

const TMDB_GENRES = [
  {
    slug: 'horror',
    mediaType: 'movie' as const,
    params: { with_genres: '27', sort_by: 'popularity.desc', vote_count_gte: '50' },
  },
  {
    slug: 'fantasy',
    mediaType: 'movie' as const,
    params: { with_genres: '14', sort_by: 'popularity.desc', vote_count_gte: '50' },
  },
  {
    slug: 'romance',
    mediaType: 'movie' as const,
    params: { with_genres: '10749', sort_by: 'popularity.desc', vote_count_gte: '50' },
  },
  {
    slug: 'mystery',
    mediaType: 'movie' as const,
    params: { with_genres: '9648', sort_by: 'popularity.desc', vote_count_gte: '50' },
  },
  {
    slug: 'cartoon',
    mediaType: 'tv' as const,
    params: { with_genres: '16', sort_by: 'popularity.desc', vote_count_gte: '50', with_original_language: 'en' },
    extraParams: { with_keywords: '210755', sort_by: 'popularity.desc', vote_count_gte: '30' },
  },
];

// TMDB caps meaningful results at ~500 pages.
// 100 pages × 20 results = up to 2000 quality items per genre.
const WARM_PAGES = 100;
const BATCH_SIZE = 10; // concurrent TMDB requests per batch

// ─── Helpers ────────────────────────────────────────────────────────────────

const ANIME_PATTERNS = [
  /\b(?:dragon\s*ball|naruto|one\s*piece|bleach|demon\s*slayer|attack\s*on\s*titan|jujutsu|my\s*hero|spy\s*x|chainsaw\s*man|sword\s*art|death\s*note|fullmetal|hunter\s*x|tokyo\s*revenger|tokyo\s*ghoul|mob\s*psycho|one\s*punch|cowboy\s*bebop|evangelion|pokemon|yugioh|digimon|sailor\s*moon|code\s*geass|gundam|jojo|fairy\s*tail|black\s*clover)\b/i,
  /\s(?:sub|dub|uncut)\b/i,
  /\(\d{4}\s*(?:TV|ONA|OVA|Movie)\)/,
];
function isLikelyAnime(title: string): boolean {
  return ANIME_PATTERNS.some(p => p.test(title));
}

function dedupeAndFilter(items: TMDBShow[], mediaType: 'movie' | 'tv'): MediaItem[] {
  const seen = new Set<number>();
  return items
    .filter(r => {
      if (!r.poster_path || seen.has(r.id)) return false;
      if ((r.vote_count ?? 0) < 50 && (r.popularity ?? 0) < 5) return false;
      seen.add(r.id);
      return true;
    })
    .map(r => tmdbToMedia({ ...r, media_type: mediaType }));
}

async function fetchPages(
  mediaType: 'movie' | 'tv',
  params: Record<string, string>,
  totalPages: number,
): Promise<TMDBShow[]> {
  const all: TMDBShow[] = [];

  for (let b = 0; b < Math.ceil(totalPages / BATCH_SIZE); b++) {
    const start = b * BATCH_SIZE + 1;
    const end = Math.min(start + BATCH_SIZE - 1, totalPages);

    const batch = await Promise.all(
      Array.from({ length: end - start + 1 }, (_, i) =>
        tmdbFetch<{ results?: TMDBShow[]; total_pages?: number }>(
          `/discover/${mediaType}`,
          { ...params, page: String(start + i) },
        ).catch(() => ({ results: [] as TMDBShow[], total_pages: 0 }))
      )
    );

    let hitEnd = false;
    for (const page of batch) {
      const results = page.results ?? [];
      all.push(...results);
      // TMDB returns empty results[] on pages beyond total_pages
      if (results.length === 0) { hitEnd = true; break; }
    }
    if (hitEnd) break;
  }

  return all;
}

// ─── Warm individual genre ───────────────────────────────────────────────────

async function warmGenre(
  slug: string,
  mediaType: 'movie' | 'tv',
  params: Record<string, string>,
  extraParams?: Record<string, string>,
): Promise<{ slug: string; count: number; cached: boolean }> {
  // Check if still fresh (skip if warm cache hit within 1h of expiry)
  const existing = await getCached<MediaItem[]>(WARM, `genre:${slug}`);
  if (existing && existing.length > 0) {
    return { slug, count: existing.length, cached: true };
  }

  const raw = await fetchPages(mediaType, params, WARM_PAGES);

  let items: MediaItem[];
  if (slug === 'cartoon' && extraParams) {
    const keywordRaw = await fetchPages(mediaType, extraParams, 30);
    const merged = [...raw, ...keywordRaw];
    const filtered = merged.filter(r => {
      const t = (r as TMDBShow).name || (r as TMDBShow).title || '';
      return !isLikelyAnime(t);
    });
    items = dedupeAndFilter(filtered as TMDBShow[], mediaType);
  } else {
    items = dedupeAndFilter(raw, mediaType);
  }

  await setCache(WARM, `genre:${slug}`, items);
  return { slug, count: items.length, cached: false };
}

async function warmAnime(): Promise<{ slug: string; count: number; cached: boolean }> {
  const existing = await getCached<MediaItem[]>(WARM, 'genre:anime');
  if (existing && existing.length > 0) {
    return { slug: 'anime', count: existing.length, cached: true };
  }

  // Fetch 15 pages × 20 = 300 anime items from AniList
  const pages = await Promise.all(
    Array.from({ length: 15 }, (_, i) =>
      getPopularAnime(i + 1, 20).catch(() => ({ media: [] }))
    )
  );

  const seen = new Set<number>();
  const items: MediaItem[] = pages
    .flatMap(p => p.media)
    .filter(m => {
      if (!m.coverImage?.large || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    })
    .map(m => anilistToMediaItem(m));

  await setCache(WARM, 'genre:anime', items);
  return { slug: 'anime', count: items.length, cached: false };
}

async function warmBrowse(): Promise<{ slug: string; count: number; cached: boolean }> {
  const existing = await getCached<MediaItem[]>(WARM, 'browse:trending');
  if (existing && existing.length > 0) {
    return { slug: 'browse', count: existing.length, cached: true };
  }

  // Fetch 30 pages of trending + 20 pages popular movies + 20 pages popular TV
  const [trendingPages, moviePages, tvPages] = await Promise.all([
    Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        tmdbFetch<{ results?: TMDBShow[] }>('/trending/all/week', { page: String(i + 1) })
          .catch(() => ({ results: [] as TMDBShow[] }))
      )
    ),
    fetchPages('movie', { sort_by: 'popularity.desc', vote_count_gte: '100' }, 20),
    fetchPages('tv',    { sort_by: 'popularity.desc', vote_count_gte: '50'  }, 20),
  ]);

  const trendingRaw = trendingPages.flatMap(p => (p.results ?? []) as TMDBShow[]);
  const all = [
    ...trendingRaw.map(r => ({ ...r, media_type: (r.media_type || 'movie') as 'movie' | 'tv' })),
    ...moviePages.map(r => ({ ...r, media_type: 'movie' as const })),
    ...tvPages.map(r => ({    ...r, media_type: 'tv' as const })),
  ];

  const seen = new Set<number>();
  const items = all
    .filter(r => {
      if (!r.poster_path || seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .map(r => tmdbToMedia(r));

  await setCache(WARM, 'browse:trending', items);
  return { slug: 'browse', count: items.length, cached: false };
}

// ─── Route handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Verify secret (skip check in dev)
  const secret = process.env.CACHE_WARM_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const startTime = Date.now();

  try {
    // Parse optional ?slug= to warm a single genre only
    const { searchParams } = new URL(request.url);
    const targetSlug = searchParams.get('slug');

    const genresToWarm = targetSlug
      ? TMDB_GENRES.filter(g => g.slug === targetSlug)
      : TMDB_GENRES;

    // Run all genre warms in parallel
    const tmdbResults = await Promise.all(
      genresToWarm.map(g => warmGenre(g.slug, g.mediaType, g.params, g.extraParams))
    );

    const animeResult  = !targetSlug || targetSlug === 'anime'  ? await warmAnime()  : null;
    const browseResult = !targetSlug || targetSlug === 'browse' ? await warmBrowse() : null;

    const results = [
      ...tmdbResults,
      ...(animeResult  ? [animeResult]  : []),
      ...(browseResult ? [browseResult] : []),
    ];

    const totalItems = results.reduce((sum, r) => sum + r.count, 0);
    const elapsed = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      elapsed_ms: elapsed,
      total_items: totalItems,
      ttl_seconds: CACHE_TTL['warm' as keyof typeof CACHE_TTL],
      results,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// GET: quick status check — returns current warm cache sizes
export async function GET(request: NextRequest) {
  const secret = process.env.CACHE_WARM_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const slugs = [...TMDB_GENRES.map(g => g.slug), 'anime'];
  const status = await Promise.all(
    slugs.map(async slug => {
      const data = await getCached<MediaItem[]>(WARM, `genre:${slug}`);
      return { slug, count: data?.length ?? 0, warmed: (data?.length ?? 0) > 0 };
    })
  );

  const browse = await getCached<MediaItem[]>(WARM, 'browse:trending');
  status.push({ slug: 'browse', count: browse?.length ?? 0, warmed: (browse?.length ?? 0) > 0 });

  return NextResponse.json({ status });
}
