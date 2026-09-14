import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { searchAnime, anilistToMediaItem } from '@/lib/anilist/client';
import { searchMedia } from '@/lib/tmdb/server';
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
  // Individual words as-typed — catches "one word is fine, the other is
  // typo'd" (e.g. "jojo's bizarre adventur" — "jojo's" alone still matches).
  for (const w of words) if (!variants.includes(w)) variants.push(w);

  // Progressively shorter prefixes of the whole (space-collapsed) query.
  // AniList — like TMDB — matches prefixes reliably even when the tail is
  // wrong (confirmed empirically: "Demon Slaye" finds "Demon Slayer" fine),
  // so trimming from the end recovers typos that land late in the string.
  // Kept short (a handful of lengths, not every single one) since this only
  // runs after every other variant has already come up empty.
  const minLen = Math.max(4, Math.ceil(noSpace.length * 0.5));
  for (let len = q.length - 2; len >= minLen; len -= Math.max(1, Math.round((q.length - minLen) / 4))) {
    const prefix = q.slice(0, len).trim();
    if (prefix && !variants.includes(prefix)) variants.push(prefix);
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
      tmdbResults.items.map((i: MediaItem) => normalizeTitle(i.title))
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
      // First try from whatever results we do have
      suggestions = buildSuggestionsFromResults(normalized, tmdbResults.items, anilistResults.items);
      // If still empty (0 results total), ask TMDB directly — it has great fuzzy matching
      if (suggestions.length === 0) {
        suggestions = await fetchTmdbSuggestions(trimmed, normalized);
      }
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
//
// Goes through searchMedia()/tmdbFetch() — the same shared, Redis-cached,
// correctly-authenticated (X-Worker-Key) path every other TMDB call in the
// app uses. This function used to build its own fetch() + headers by hand,
// duplicating (and diverging from) that logic: it never set X-Worker-Key,
// so every request the Cloudflare api-cache Worker received from here was
// rejected with 403 — confirmed live in prod.log. That meant /api/search's
// "shows" tab has been silently returning ZERO TMDB movie/TV results for
// its entire lifetime; only AniList results (mislabeled as generic "shows")
// were ever coming back, e.g. searching "Fight Club" returned only
// anime titles that happen to contain the word "Fight".

async function fetchTmdbSearch(query: string, page: number) {
  try {
    const data = await searchMedia(query, String(page));
    const items = (data.results || [])
      .filter((r) => r.poster_path && (r.media_type === 'movie' || r.media_type === 'tv'))
      .map((r) => tmdbToMedia({ ...(r as unknown as TMDBShow), media_type: r.media_type as 'movie' | 'tv' }));

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

/**
 * Is `title` actually close to what the user typed, not just something the
 * mutated fallback query (a single word, a truncated prefix, ...) happened
 * to match? Compares against both the full title and the title's own
 * same-length prefix — a short/prefix query is expected to be far (in raw
 * edit distance) from a long subtitled title it's still a correct match
 * for (e.g. "demon slaye" vs "demon slayer: kimetsu no yaiba"), so penalize
 * only real divergence, not length difference from a legitimate subtitle.
 */
function isRelevantMatch(queryNormalized: string, title: string): boolean {
  if (!queryNormalized) return false;
  const titleNorm = normalizeTitle(title);
  const prefixDist = levenshtein(queryNormalized, titleNorm.slice(0, queryNormalized.length));
  const fullDist = levenshtein(queryNormalized, titleNorm);
  const dist = Math.min(prefixDist, fullDist);
  return dist <= Math.max(queryNormalized.length * 0.35, 2);
}

async function fetchAnilistSearchWithFallback(query: string, page: number) {
  // Primary search — full cascade (AniList → Kitsu → Jikan → TMDB-anime) since
  // this is the query the user actually typed, worth the extra latency.
  let result = await fetchAnilistSearch(query, page, true);

  // If page 1 returned 0 results, try fuzzy variants. Capped — AniList's
  // public API is already prone to its own rate limits/outages (frequently
  // returns 403 under load), so a 0-result query shouldn't fire an unbounded
  // chain of sequential requests at it. Each variant is AniList-only
  // (cascade off): these are already low-confidence guesses, and cascading
  // all 4 providers through every one of up to 6 variants would compound
  // into several seconds of sequential requests for what's mostly going to
  // be genuine misses anyway.
  if (page === 1 && result.items.length === 0) {
    const fallbacks = getAnilistFallbacks(query).slice(0, 6);
    const queryNormalized = normalizeTitle(query);
    for (const variant of fallbacks) {
      const candidate = await fetchAnilistSearch(variant, 1, false);
      if (candidate.items.length === 0) continue;
      // A short/generic fallback variant (a single common word, a very
      // short prefix) can return real AniList hits that have nothing to do
      // with what the user typed — confirmed live: "Brething Bad" (a typo'd
      // TV show, not anime at all) fell back to the bare word "bad" and
      // returned a page of unrelated anime titles that merely happened to
      // rank for that generic term. Only keep hits that are actually close
      // to the ORIGINAL query, not just to the mutated variant that found
      // them.
      const relevant = candidate.items.filter(i => isRelevantMatch(queryNormalized, i.title));
      if (relevant.length > 0) {
        result = { ...candidate, items: relevant };
        break;
      }
    }
  }

  return result;
}

async function fetchAnilistSearch(query: string, page: number, cascade = true) {
  try {
    const data = await searchAnime(query, page, 15, { cascade });
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
 * Build suggestions from existing result titles (when we have some results but < 3).
 */
function buildSuggestionsFromResults(normalizedQ: string, tmdbItems: MediaItem[], anilistItems: MediaItem[]): string[] {
  const allTitles = [
    ...tmdbItems.map(i => i.title),
    ...anilistItems.map(i => i.title),
  ];

  if (allTitles.length === 0) return [];

  const scored = allTitles
    .map(title => ({ title, dist: levenshtein(normalizedQ, normalizeTitle(title)) }))
    .sort((a, b) => a.dist - b.dist);

  return scored
    .slice(0, 3)
    .filter(s => s.dist > 0 && s.dist <= Math.max(normalizedQ.length * 0.6, 3))
    .map(s => s.title);
}

/**
 * Raw TMDB multi-search — just the titles, no ranking. Shared by the fuzzy
 * fallback below. Goes through the same searchMedia() path as the main
 * search (see the comment on fetchTmdbSearch above) instead of building its
 * own unauthenticated request.
 */
async function fetchTmdbTitles(query: string): Promise<string[]> {
  try {
    const data = await searchMedia(query);
    return (data.results || [])
      .slice(0, 10)
      .map((r) => r.title || r.name || '')
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * When we have 0 results, ask TMDB for fuzzy matches. TMDB's own search is
 * NOT fuzzy in practice — confirmed empirically: "Intersteller" returns zero
 * results even though it's one letter off "Interstellar", while the shared
 * prefix "Interstel" finds it fine, and for multi-word queries a single
 * correctly-spelled word (e.g. "Bad" out of "Brething Bad") surfaces the
 * right title on its own. So instead of trusting TMDB with the literal
 * (possibly misspelled) query, try a handful of derived variants and rank
 * whatever comes back by edit distance to what the user actually typed.
 */
async function fetchTmdbSuggestions(originalQuery: string, normalizedQ: string): Promise<string[]> {
  const candidates = new Map<string, number>(); // title -> best (lowest) distance seen

  const tryQuery = async (q: string) => {
    if (!q || q.length < 3) return;
    const titles = await fetchTmdbTitles(q);
    for (const title of titles) {
      const dist = levenshtein(normalizedQ, normalizeTitle(title));
      const prev = candidates.get(title);
      if (prev === undefined || dist < prev) candidates.set(title, dist);
    }
  };

  // 1. The query as typed — works for typos TMDB's own matching tolerates.
  await tryQuery(originalQuery);

  // 2. Progressively shorter prefixes of the normalized query. TMDB matches
  //    prefixes reliably even when the tail is wrong (typos usually land
  //    mid-to-late in a word), so trimming from the end until something
  //    matches recovers most single-typo cases without guessing the typo's
  //    exact position. Bounded to ~5 tries so a genuinely 0-result query
  //    doesn't add a long chain of sequential round-trips.
  if (candidates.size === 0) {
    const collapsed = normalizedQ.replace(/\s+/g, ' ').trim();
    const minLen = Math.max(4, Math.ceil(collapsed.length * 0.5));
    const lengths: number[] = [];
    for (let len = collapsed.length - 2; len >= minLen && lengths.length < 5; len -= Math.max(1, Math.round((collapsed.length - minLen) / 5))) {
      lengths.push(len);
    }
    for (const len of lengths) {
      await tryQuery(collapsed.slice(0, len).trim());
      if (candidates.size > 0) break; // stop at the first prefix that finds anything
    }
  }

  // 3. Per-word fallback for multi-word queries — handles "one word is
  //    typo'd, the rest are fine" (e.g. "Brething Bad": neither the full
  //    phrase nor a shared prefix helps since the typo is near the front of
  //    the first word, but "Bad" alone finds Breaking Bad directly).
  if (candidates.size === 0) {
    const words = normalizedQ.split(/\s+/).filter(w => w.length >= 3);
    for (const w of words) await tryQuery(w);
  }

  if (candidates.size === 0) return [];

  return Array.from(candidates.entries())
    .sort((a, b) => a[1] - b[1])
    .filter(([, dist]) => dist <= Math.max(normalizedQ.length * 0.7, 2))
    .slice(0, 3)
    .map(([title]) => title);
}