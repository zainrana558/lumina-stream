import { getSeasonalAnime, getTrendingAnime, getUpcomingAnime, anilistToMediaItem } from '@/lib/anilist/client';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import type { MediaItem } from '@/types';
import type { AniListMedia } from '@/lib/anilist/client';
import type { Metadata } from 'next';
import SeasonalClient from './SeasonalClient';

export const dynamic = 'force-static';
export const revalidate = 600;

const siteUrl = CANONICAL_BASE;
const seasonalUrl = `${siteUrl}/seasonal`;

export const metadata: Metadata = {
  title: 'Seasonal Anime - Currently Airing & Trending',
  description: 'Discover this season\'s best anime. Browse currently airing, trending, and upcoming series updated every week with episode counts and ratings.',
  alternates: { canonical: seasonalUrl },
  openGraph: {
    type: 'website',
    url: seasonalUrl,
    title: 'Seasonal Anime | Lumina Stream',
    description: 'Currently airing, trending, and upcoming anime series this season.',
    siteName: 'Lumina Stream',
    images: [{ url: `${siteUrl}/og/og-tv.png`, width: 1344, height: 768, alt: 'Seasonal Anime on Lumina Stream' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seasonal Anime | Lumina Stream',
    description: 'Currently airing, trending, and upcoming anime series this season.',
    images: [`${siteUrl}/og/og-tv.png`],
  },
};

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

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Seasonal Anime',
    description: metadata.description,
    url: seasonalUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Seasonal Anime', item: seasonalUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <header style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 20px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8', marginBottom: 12, letterSpacing: '.02em' }}>Seasonal Anime</h1>
        <p className="f-crimson" style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, maxWidth: 800 }}>
          Track the current anime season with real-time data from AniList. This page covers every series currently airing in Japan and internationally, organized into three categories: currently airing shows with new episodes each week, trending series gaining rapid popularity, and upcoming premieres on the horizon. Powered by AniList, our seasonal tracker updates continuously so you always know what to watch next. Whether you follow simulcasts or prefer to binge completed seasons, this is your anime calendar. We fetch six pages of data across all three categories — airing, trending, and upcoming — and deduplicate by ID so you never see the same title twice. Each entry includes the cover art, title, episode count, average score, and studio information. The seasonal page is one of the most actively updated pages on Lumina Stream, refreshing every ten minutes to capture new episode counts and popularity shifts as they happen on AniList.
        </p>
      </header>
      <SeasonalClient {...data} />
    </>
  );
}
