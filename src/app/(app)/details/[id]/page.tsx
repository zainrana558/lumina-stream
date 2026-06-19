import { tmdbFetch } from '@/lib/tmdb/server';
import { getAnimeDetail, anilistToMediaItem } from '@/lib/anilist/client';
import DetailsContent from '@/components/pages/DetailsContent';
import type { Metadata } from 'next';
import { tmdbToMedia, isAnilistId, toAnilistId } from '@/types';
import type { TMDBShow, MediaItem } from '@/types';

const siteUrl = 'https://lumina-stream-omega.vercel.app';

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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const showId = Number(id);

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
          openGraph: {
            title: `${title} | Lumina Stream`,
            description,
            images: cover ? [cover] : [],
          },
        };
      }
    } catch { /* fall through */ }
    return { title: 'Anime | Lumina Stream' };
  }

  // TMDB ID — existing logic
  try {
    const [tvRes, movieRes] = await Promise.all([
      tmdbFetch<{ id?: number }>(`/tv/${showId}`).catch(() => ({ id: undefined })),
      tmdbFetch<{ id?: number }>(`/movie/${showId}`).catch(() => ({ id: undefined })),
    ]);
    const data = tvRes.id ? tvRes : movieRes.id ? movieRes : null;
    const title = (data as TMDBShowData)?.title || (data as TMDBShowData)?.name || 'Show';
    const description = (data as TMDBShowData)?.overview || 'Watch on Lumina Stream';
    const backdrop = (data as TMDBShowData)?.backdrop_path;

    return {
      title: `${title} | Lumina Stream`,
      description: description.slice(0, 160),
      openGraph: {
        title: `${title} | Lumina Stream`,
        description: description.slice(0, 160),
        images: backdrop ? [`https://image.tmdb.org/t/p/original${backdrop}`] : [],
      },
    };
  } catch {
    return { title: 'Show | Lumina Stream' };
  }
}

export default async function DetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const showId = Number(id);

  // ── AniList route: ID >= ANILIST_ID_OFFSET ──
  if (isAnilistId(showId)) {
    let show: MediaItem | null = null;
    let jsonLd: Record<string, unknown> | null = null;
    try {
      const anilistId = toAnilistId(showId);
      const data = await getAnimeDetail(anilistId);
      if (data) {
        show = anilistToMediaItem(data);
        const title = data.title.english || data.title.romaji || data.title.native || 'Anime';
        const cover = data.coverImage?.extraLarge || data.coverImage?.large;
        const description = (data.description?.replace(/<[^>]*>/g, '') || '').slice(0, 500);
        jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Movie',
          name: title,
          description,
          image: cover || undefined,
          url: `${siteUrl}/details/${showId}`,
          datePublished: data.startDate?.year ? `${data.startDate.year}-${String(data.startDate.month || 1).padStart(2, '0')}-${String(data.startDate.day || 1).padStart(2, '0')}` : undefined,
          aggregateRating: data.averageScore ? {
            '@type': 'AggregateRating',
            ratingValue: (data.averageScore / 10).toFixed(1),
            bestRating: '10',
            ratingCount: data.favourites || undefined,
          } : undefined,
          genre: data.genres?.slice(0, 5) || undefined,
        };
      }
    } catch { /* fall through to null */ }
    return (
      <>
        {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
            { '@type': 'ListItem', position: 2, name: show?.title || 'Anime', item: `${siteUrl}/details/${showId}` },
          ],
        }) }} />
        <DetailsContent showId={showId} initialShow={show} />
      </>
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
  const title = rawData.title || rawData.name || 'Show';
  const description = (rawData.overview || '').slice(0, 500);
  const poster = rawData.poster_path ? `https://image.tmdb.org/t/p/w500${rawData.poster_path}` : undefined;
  const releaseDate = rawData.release_date || rawData.first_air_date || undefined;
  const castNames = fullData?.credits?.cast?.slice(0, 5).map(c => c.name) || [];
  const genreNames = rawData.genres?.map(g => g.name) || [];

  // Movie or TVSeries schema depending on media type
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': mediaType === 'tv' ? 'TVSeries' : 'Movie',
    name: title,
    description,
    image: poster,
    url: `${siteUrl}/details/${showId}`,
    datePublished: releaseDate,
    ...(rawData.runtime ? { duration: `PT${rawData.runtime}M` } : {}),
    ...(rawData.number_of_seasons ? { numberOfSeasons: rawData.number_of_seasons } : {}),
    ...(rawData.number_of_episodes ? { numberOfEpisodes: rawData.number_of_episodes } : {}),
    ...(rawData.vote_average ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rawData.vote_average.toFixed(1),
        bestRating: '10',
        ratingCount: rawData.popularity ? Math.round(rawData.popularity * 10) : undefined,
      },
    } : {}),
    ...(genreNames.length ? { genre: genreNames.slice(0, 5) } : {}),
    ...(castNames.length ? { actor: castNames.map(n => ({ '@type': 'Person', name: n })) } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: title, item: `${siteUrl}/details/${showId}` },
        ],
      }) }} />
      <DetailsContent
        showId={showId}
        initialShow={show}
        initialCredits={fullData?.credits?.cast?.slice(0, 8) || []}
        initialSimilar={fullData?.similar?.results?.slice(0, 6).map((r) => tmdbToMedia(r as TMDBShow)) || []}
      />
    </>
  );
}