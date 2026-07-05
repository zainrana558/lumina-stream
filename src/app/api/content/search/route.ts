/**
 * L1 — Local Catalog Search API
 *
 * GET /api/content/search?q=...&type=...&page=...
 *
 * Searches local content catalog first, falls back to TMDB + AniList.
 * Rate limit: 30/10s
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { searchMedia } from '@/lib/tmdb/server';
import { searchAnime } from '@/lib/anilist/client';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/server';
import { ANILIST_ID_OFFSET, tmdbToMedia } from '@/types';
import type { MediaItem, TMDBShow } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit(request, 'search');
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Too many requests', results: [] },
        { status: 429, headers: rateLimitHeaders(rl) },
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();
    const type = searchParams.get('type') || 'all';
    const page = searchParams.get('page') || '1';

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters', results: [] }, { status: 400 });
    }

    const allResults: MediaItem[] = [];
    const seenTitles = new Set<string>();

    // 1. Try local catalog via Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = await createClient();
        const { data: localResults } = await supabase
          .from('content')
          .select('*')
          .ilike('title', `%${query}%`)
          .limit(20);

        if (localResults) {
          for (const row of localResults) {
            const title = (row.title as string) || '';
            const normalisedTitle = title.toLowerCase();
            if (!seenTitles.has(normalisedTitle)) {
              seenTitles.add(normalisedTitle);
              allResults.push({
                id: row.id as number,
                title,
                sub: (row.tagline as string) || '',
                genre: ((row.genres as string[]) || []),
                r: (row.rating as number) || 0,
                yr: (row.year as number) || 0,
                eps: 1,
                st: '',
                tag: '',
                cs: 0,
                featured: false,
                progress: 0,
                desc: (row.overview as string) || '',
                cast: [],
                epList: [],
                poster_path: (row.poster_path as string) || null,
                backdrop_path: (row.backdrop_path as string) || null,
                media_type: ((row.content_type as string) === 'movie' ? 'movie' : 'tv') as 'movie' | 'tv',
              });
            }
          }
        }
      } catch {
        // Local catalog unavailable — fall through to external
      }
    }

    // 2. TMDB search
    try {
      const tmdbResults = await searchMedia(query, page);
      if (tmdbResults.results) {
        for (const item of tmdbResults.results) {
          if (type !== 'all') {
            if (type === 'movie' && item.media_type !== 'movie') continue;
            if (type === 'tv' && item.media_type !== 'tv') continue;
            if (type === 'anime' && item.media_type !== 'tv') continue;
          }
          const title = (item.title || item.name || '').toLowerCase();
          if (!seenTitles.has(title)) {
            seenTitles.add(title);
            allResults.push(tmdbToMedia(item as import('@/types').TMDBShow));
          }
        }
      }
    } catch {
      // TMDB unavailable — continue
    }

    // 3. AniList search (for anime)
    if (type === 'all' || type === 'anime') {
      try {
        const anilistPage = await searchAnime(query, 1, 10);
        if (anilistPage?.media) {
          for (const item of anilistPage.media) {
            const title = (item.title.english || item.title.romaji || '').toLowerCase();
            if (!seenTitles.has(title)) {
              seenTitles.add(title);
              const namespacedId = item.id + ANILIST_ID_OFFSET;
              allResults.push({
                id: namespacedId,
                title: item.title.english || item.title.romaji || 'Untitled',
                sub: '',
                genre: item.genres || [],
                r: (item.meanScore || 0) / 10,
                yr: item.startDate?.year || 0,
                eps: item.episodes || 1,
                st: item.status || '',
                tag: 'Anime',
                cs: Math.abs(namespacedId) % 8,
                featured: (item.meanScore || 0) > 75,
                progress: 0,
                desc: (item.description || '').replace(/<[^>]*>/g, ''),
                cast: item.studios?.nodes?.map(s => s.name) || [],
                epList: [],
                poster_path: null,
                backdrop_path: null,
                media_type: 'tv',
                _isAnilist: true,
                _anilistId: item.id,
                _malId: item.idMal ?? undefined,
                _anilistCover: item.coverImage?.extraLarge || item.coverImage?.large || undefined,
                _anilistBanner: item.bannerImage || undefined,
                _anilistUrl: item.siteUrl,
                _anilistTrailer: item.trailer || null,
              });
            }
          }
        }
      } catch {
        // AniList unavailable — continue
      }
    }

    return NextResponse.json(
      { results: allResults.slice(0, 40), total: allResults.length, page: parseInt(page) },
      { headers: rateLimitHeaders(rl) },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg, results: [] }, { status: 500 });
  }
}