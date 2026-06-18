import { tmdbFetch } from '@/lib/tmdb/server';
import { getAnimeDetail, anilistToMediaItem } from '@/lib/anilist/client';
import DetailsContent from '@/components/pages/DetailsContent';
import type { Metadata } from 'next';
import { tmdbToMedia, isAnilistId, toAnilistId } from '@/types';
import type { TMDBShow, MediaItem } from '@/types';
import { buildDetailJsonLd } from '@/lib/jsonld';

interface TMDBShowData {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  media_type?: string;
  popularity: number;
  genre_ids?: number[];
  release_date?: string;
  first_air_date?: string;
  tagline?: string;
  runtime?: number;
  genres?: { id: number; name: string }[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  status?: string;
}

interface TMDBDetails {
  credits?: { cast: Array<{ id: number; name: string; character: string; profile_path: string | null }> };
  similar?: { results: TMDBShowData[] };
  seasons?: Array<{ season_number: number; name: string; episode_count: number }>;
}

export const revalidate = 600; // 10 min

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-stream-omega.vercel.app';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const showId = Number(id);
  const pageUrl = `${siteUrl}/details/${id}`;

  // AniList ID — fetch metadata from AniList
  if (isAnilistId(showId)) {
    try {
      const anilistId = toAnilistId(showId);
      const data = await getAnimeDetail(anilistId);
      if (data) {
        const title = data.title.english || data.title.romaji || data.title.native || 'Anime';
        const description = (data.description?.replace(/<[^>]*>/g, '') || 'Watch on Lumina Stream').slice(0, 160);
        const cover = data.coverImage?.extraLarge || data.coverImage?.large;
        return {
          title: `${title} | Lumina Stream`,
          description,
          alternates: { canonical: pageUrl },
          openGraph: {
            type: 'video.tv_show',
            url: pageUrl,
            title: `${title} | Lumina Stream`,
            description,
            siteName: 'Lumina Stream',
            images: cover ? [{ url: cover, width: 1200, height: 630, alt: title }] : [],
          },
          twitter: {
            card: 'summary_large_image',
            title: `${title} | Lumina Stream`,
            description,
            images: cover ? [cover] : [],
          },
        };
      }
    } catch { /* fall through */ }
    return { title: 'Anime | Lumina Stream', alternates: { canonical: pageUrl } };
  }

  // TMDB ID — detect media type for correct og:type
  let resolvedMediaType: 'movie' | 'tv' | null = null;
  try {
    const [tvRes, movieRes] = await Promise.all([
      tmdbFetch<{ id?: number }>(`/tv/${showId}`).catch(() => ({ id: undefined })),
      tmdbFetch<{ id?: number }>(`/movie/${showId}`).catch(() => ({ id: undefined })),
    ]);
    const data = tvRes.id ? (resolvedMediaType = 'tv', tvRes) : movieRes.id ? (resolvedMediaType = 'movie', movieRes) : null;
    const title = (data as TMDBShowData)?.title || (data as TMDBShowData)?.name || 'Show';
    const description = (data as TMDBShowData)?.overview || 'Watch on Lumina Stream';
    const backdrop = (data as TMDBShowData)?.backdrop_path;
    const ogType = resolvedMediaType === 'movie' ? 'video.movie' : 'video.tv_show';

    return {
      title: `${title} | Lumina Stream`,
      description: description.slice(0, 160),
      alternates: { canonical: pageUrl },
      openGraph: {
        type: ogType,
        url: pageUrl,
        title: `${title} | Lumina Stream`,
        description: description.slice(0, 160),
        siteName: 'Lumina Stream',
        images: backdrop ? [{ url: `https://image.tmdb.org/t/p/original${backdrop}`, width: 1200, height: 630, alt: title }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | Lumina Stream`,
        description: description.slice(0, 160),
        images: backdrop ? [`https://image.tmdb.org/t/p/original${backdrop}`] : [],
      },
    };
  } catch {
    return { title: 'Show | Lumina Stream', alternates: { canonical: pageUrl } };
  }
}

export default async function DetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const showId = Number(id);

  // ── AniList route: ID >= ANILIST_ID_OFFSET ──
  if (isAnilistId(showId)) {
    let show: MediaItem | null = null;
    try {
      const anilistId = toAnilistId(showId);
      const data = await getAnimeDetail(anilistId);
      if (data) show = anilistToMediaItem(data);
    } catch { /* fall through to null */ }
    const pageUrl = `${siteUrl}/details/${showId}`;
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: show.media_type === 'movie' || show.tag === 'Movie' ? 'Movies' : 'TV Shows', item: `${siteUrl}/browse` },
      { '@type': 'ListItem', position: 3, name: show.title, item: pageUrl },
    ],
  };

  return show ? (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              buildDetailJsonLd(show, siteUrl),
            ),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <DetailsContent showId={showId} initialShow={show} />
      </>
    ) : (
      <DetailsContent showId={showId} initialShow={null} />
    );
  }

  // ── TMDB route: standard ID ──
  let mediaType: 'tv' | 'movie' | null = null;
  let rawData: TMDBShowData | null = null;
  let fullData: TMDBShowData & TMDBDetails | null = null;

  try {
    // Step 1: Detect media type (try TV first, then Movie) — 2 parallel calls
    const [tvRes, movieRes] = await Promise.all([
      tmdbFetch<TMDBShowData>(`/tv/${showId}`).catch(() => ({ id: 0, overview: '', poster_path: null, backdrop_path: null, vote_average: 0, popularity: 0 })),
      tmdbFetch<TMDBShowData>(`/movie/${showId}`).catch(() => ({ id: 0, overview: '', poster_path: null, backdrop_path: null, vote_average: 0, popularity: 0 })),
    ]);

    mediaType = tvRes.id ? 'tv' : movieRes.id ? 'movie' : null;
    rawData = mediaType === 'tv' ? tvRes : movieRes;

    if (!rawData?.id) {
      // No data found — return the component with null
    } else {
      // Step 2: Fetch full details only for the matched type
      fullData = await tmdbFetch<TMDBShowData & TMDBDetails>(
        `/${mediaType}/${showId}`,
        { append_to_response: 'credits,similar' }
      ).catch(() => rawData as TMDBShowData & TMDBDetails);
    }
  } catch {
    // fall through to render with null
  }

  if (!rawData?.id || !mediaType) {
    return <DetailsContent showId={showId} initialShow={null} />;
  }

  const show = tmdbToMedia({ ...rawData, media_type: mediaType } as TMDBShow);
  const pageUrl = `${siteUrl}/details/${showId}`;
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: mediaType === 'movie' ? 'Movies' : 'TV Shows', item: `${siteUrl}/browse` },
      { '@type': 'ListItem', position: 3, name: show.title, item: pageUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildDetailJsonLd(show, siteUrl),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <DetailsContent
        showId={showId}
        initialShow={show}
        initialCredits={fullData?.credits?.cast?.slice(0, 8) || []}
        initialSimilar={fullData?.similar?.results?.slice(0, 6).map((r) => tmdbToMedia(r as TMDBShow)) || []}
      />
    </>
  );
}