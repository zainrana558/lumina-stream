import { getSeasonalAnime, getTrendingAnime, getUpcomingAnime, anilistToMediaItem } from '@/lib/anilist/client';
import type { MediaItem } from '@/types';
import type { AniListMedia } from '@/lib/anilist/client';
import SeasonalClient from './SeasonalClient';

export const revalidate = 0; // Bust CDN cache — change back to 600 once confirmed working

async function getSeasonalData() {
  try {
    // Fetch 3 pages per category for richer content (60 items each)
    const [seasonalP1, seasonalP2, seasonalP3, trendingP1, trendingP2, upcomingP1, upcomingP2] = await Promise.all([
      getSeasonalAnime(undefined, undefined, 1, 20, 'POPULARITY_DESC').catch(() => ({ media: [] })),
      getSeasonalAnime(undefined, undefined, 2, 20, 'POPULARITY_DESC').catch(() => ({ media: [] })),
      getSeasonalAnime(undefined, undefined, 3, 20, 'POPULARITY_DESC').catch(() => ({ media: [] })),
      getTrendingAnime(1, 20).catch(() => ({ media: [] })),
      getTrendingAnime(2, 20).catch(() => ({ media: [] })),
      getUpcomingAnime(undefined, undefined, 1, 20).catch(() => ({ media: [] })),
      getUpcomingAnime(undefined, undefined, 2, 20).catch(() => ({ media: [] })),
    ]);

    // Deduplicate and convert
    const seenAiring = new Set<number>();
    const airingMedia = [...seasonalP1.media, ...seasonalP2.media, ...seasonalP3.media]
      .filter((m: AniListMedia) => m.coverImage?.large && !seenAiring.has(m.id))
      .map(m => { seenAiring.add(m.id); return m; });
    const airingTodayItems = airingMedia.map((m: AniListMedia) => anilistToMediaItem(m));

    const seenTrending = new Set<number>();
    const trendingMedia = [...trendingP1.media, ...trendingP2.media]
      .filter((m: AniListMedia) => m.coverImage?.large && !seenTrending.has(m.id))
      .map(m => { seenTrending.add(m.id); return m; });
    const trendingItems = trendingMedia.map((m: AniListMedia) => anilistToMediaItem(m));

    const seenUpcoming = new Set<number>();
    const upcomingMedia = [...upcomingP1.media, ...upcomingP2.media]
      .filter((m: AniListMedia) => m.coverImage?.large && !seenUpcoming.has(m.id))
      .map(m => { seenUpcoming.add(m.id); return m; });
    const upcomingItems = upcomingMedia.map((m: AniListMedia) => anilistToMediaItem(m));

    return { airingToday: airingTodayItems, trendingThisWeek: trendingItems, returningSeries: upcomingItems };
  } catch {
    return { airingToday: [], trendingThisWeek: [], returningSeries: [] };
  }
}

export default async function SeasonalPage() {
  const data = await getSeasonalData();
  return <SeasonalClient {...data} />;
}
