import { NextRequest, NextResponse } from 'next/server';
import { getValidatedEnv } from '@/lib/env';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { searchAnime, anilistToMediaItem } from '@/lib/anilist/client';
import { tmdbToMedia } from '@/types';
import type { TMDBShow, MediaItem } from '@/types';

// ─── Query normalization ─────────────────────────────────────────────────

const ARTICLES = new Set(['the', 'a', 'an', 'la', 'le', 'les', 'el', 'los', 'las', 'der', 'die', 'das', 'il', 'lo', 'la']);

/**
 * Normalize a search query for better matching:
 * - Lowercase
 * - Strip non-alphanumeric except CJK/Japanese/Korean characters
 * - Collapse whitespace
 * - Remove leading articles
 */
function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')   // keep letters, numbers, CJK; strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove leading articles from a query for broader matching.
 * "the walking dead" → "walking dead"
 */
function stripArticles(q: string): string {
  const words = q.split(/\s+/);
  if (words.length > 1 && ARTICLES.has(words[0].toLowerCase())) {
    return words.slice(1).join(' ');
  }
  return q;
}

/**
 * Generate fuzzy variants of a query for AniList fallback.
 * AniList's `search` is fairly exact, so we try alternatives.
 */
function getAnilistFallbacks(q: string): string[] {
  const variants: string[] = [];
  const noSpace = q.replace(/\s+/g, '');
  if (noSpace !== q) variants.push(noSpace);          // "one piece" → "onepiece"

  const stripped = stripArticles(q);
  if (stripped !== q) variants.push(stripped);        // "the boys" → "boys"

  const words = q.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 2) {
    // Try first 2 meaningful words: "attack on titan season 2" → "attack on"
    variants.push(words.slice(0, 2).join(' '));
  }
  if (words.length > 1) {
    // Try longest word only: "kurulus osman" → "kurulus"
    const longest = words.reduce((a, b) => a.length >= b.length ? a : b);
    if (longest.length >= 3) variants.push(longest);
  }

  return variants;
}

/**
 * Compute Levenshtein distance between two strings.
 * Used for "did you mean" ranking.
 */
function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  const dp = Array.from({ length: la + 1 }, (_, i) => {
    const row = new Array(lb + 1) as number[];
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[la][lb];
}

// ─── Main handler ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'search');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many searches. Please slow down.', results: [] },
        { status: 429, headers: rateLimitHeaders(rl) }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const source = searchParams.get('source') || 'all';

    if (!rawQuery || rawQuery.trim().length < 2) {
      return NextResponse.json({ results: [], total_results: 0, total_pages: 0, has_more: false });
    }

    const trimmed = rawQuery.trim();
    const normalized = normalizeQuery(trimmed);

    // Fire TMDB + AniList searches in parallel
    const [tmdbResults, anilistResults] = await Promise.all([
      (source === 'all' || source === 'tmdb')
        ? fetchTmdbSearch(trimmed, page)
        : Promise.resolve({ items: [], totalPages: 0, totalResults: 0 }),

      (source === 'all' || source === 'anilist')
        ? fetchAnilistSearchWithFallback(trimmed, page)
        : Promise.resolve({ items: [], totalPages: 0, totalResults: 0 }),
    ]);

    // Merge results: TMDB first, then AniList (dedup by normalized title)
    const tmdbTitles = new Set(
      tmdbResults.items.map(i => normalizeTitle(i.title))
    );

    const merged: MediaItem[] = [
      ...tmdbResults.items,
      ...anilistResults.items.filter(
        a => !tmdbTitles.has(normalizeTitle(a.title))
      ),
    ];

    const totalPages = Math.max(tmdbResults.totalPages, anilistResults.totalPages);
    const totalResults = tmdbResults.totalResults + anilistResults.totalResults;

    // Build "did you mean" suggestions when page 1 has few/no results
    let suggestions: string[] = [];
    if (page === 1 && merged.length < 3) {
      suggestions = buildSuggestions(normalized, tmdbResults.items, anilistResults.items);
    }

    return NextResponse.json({
      results: merged,
      total_results: totalResults,
      total_pages: totalPages,
      page,
      has_more: page < totalPages && merged.length > 0,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }, {
      headers: {
        ...rateLimitHeaders(rl),
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
        'X-Cache-Category': 'tmdb-search',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message, results: [], total_results: 0, total_pages: 0, has_more: false }, { status: 500 });
  }
}

// ─── TMDB search (already fuzzy natively) ────────────────────────────────

async function fetchTmdbSearch(query: string, page: number) {
  try {
    const env = getValidatedEnv();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const params = new URLSearchParams({ query, page: String(page) });

    if (env.TMDB_BEARER_TOKEN) {
      headers['Authorization'] = `Bearer ${env.TMDB_BEARER_TOKEN}`;
    } else {
      params.set('api_key', env.TMDB_API_KEY!);
    }

    const res = await fetch(
      `https://api.themoviedb.org/3/search/multi?${params}`,
      { headers, next: { revalidate: 60 } }
    );

    if (!res.ok) return { items: [], totalPages: 0, totalResults: 0 };

    const data = await res.json();
    const items = (data.results || [])
      .filter((r: TMDBShow) => r.poster_path && (r.media_type === 'movie' || r.media_type === 'tv'))
      .map((r: TMDBShow) => tmdbToMedia({ ...r, media_type: r.media_type || 'movie' }));

    return {
      items,
      totalPages: data.total_pages || 0,
      totalResults: data.total_results || 0,
    };
  } catch {
    return { items: [], totalPages: 0, totalResults: 0 };
  }
}

// ─── AniList search with fuzzy fallback ──────────────────────────────────

async function fetchAnilistSearchWithFallback(query: string, page: number) {
  // Primary search
  let result = await fetchAnilistSearch(query, page);

  // If page 1 returned 0 results, try fuzzy variants
  if (page === 1 && result.items.length === 0) {
    const fallbacks = getAnilistFallbacks(query);
    for (const variant of fallbacks) {
      result = await fetchAnilistSearch(variant, 1);
      if (result.items.length > 0) break;
    }
  }

  return result;
}

async function fetchAnilistSearch(query: string, page: number) {
  try {
    const data = await searchAnime(query, page, 15);
    const items = data.media.map(m => anilistToMediaItem(m));
    return {
      items,
      totalPages: data.pageInfo?.lastPage || 0,
      totalResults: data.pageInfo?.total || 0,
    };
  } catch {
    return { items: [], totalPages: 0, totalResults: 0 };
  }
}

// ─── "Did you mean" suggestions ─────────────────────────────────────────

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Build up to 3 "did you mean" suggestions from TMDB + AniList results
 * that are closest in spelling to the user's query.
 */
function buildSuggestions(normalizedQ: string, tmdbItems: MediaItem[], anilistItems: MediaItem[]): string[] {
  const allTitles = [
    ...tmdbItems.map(i => i.title),
    ...anilistItems.map(i => i.title),
  ];

  // If we have any results at all, suggest the top match
  if (allTitles.length > 0) {
    // Score by Levenshtein distance, pick closest 3
    const scored = allTitles
      .map(title => ({ title, dist: levenshtein(normalizedQ, normalizeTitle(title)) }))
      .sort((a, b) => a.dist - b.dist);

    return scored
      .slice(0, 3)
      .filter(s => s.dist > 0 && s.dist <= Math.max(normalizedQ.length * 0.6, 3))
      .map(s => s.title);
  }

  // No results at all — return empty (suggestions would need a separate API call)
  return [];
}