import { tmdbFetch } from '@/lib/tmdb/server';
import { getAnimeDetail, anilistToMediaItem } from '@/lib/anilist/client';
import DetailsContent from '@/components/pages/DetailsContent';
import type { Metadata } from 'next';
import { tmdbToMedia, isAnilistId, toAnilistId } from '@/types';
import type { TMDBShow, MediaItem } from '@/types';
import {
  buildShowMetadata,
  isThinContent,
  stripHtml,
  SITE_URL,
} from '@/lib/seo/metadata';

interface TMDBShowData {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count?: number;
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
  content_ratings?: { results: Array<{ iso_3166_1: string; rating: string }> };
}

export const revalidate = 600; // 10 min

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const showId = Number(id);

  // ── AniList route ──
  if (isAnilistId(showId)) {
    try {
      const anilistId = toAnilistId(showId);
      const data = await getAnimeDetail(anilistId);
      if (data) {
        const title = data.title.english || data.title.romaji || data.title.native || 'Anime';
        const year = data.startDate?.year || undefined;
        const description = data.description || '';
        const genres = data.genres || [];
        const cover = data.coverImage?.extraLarge || data.coverImage?.large;

        const thin = isThinContent({
          description,
          genres,
          cast: [],
          coverImage: cover,
        });

        return buildShowMetadata({
          title,
          year,
          mediaType: 'anime',
          id: showId,
          description: stripHtml(description),
          genres,
          image: cover || undefined,
          imageWidth: cover ? 1200 : undefined,
          imageHeight: cover ? 630 : undefined,
          isThin: thin,
        });
      }
    } catch { /* fall through */ }
    return {
      title: 'Anime',
      robots: { index: false, follow: true },
    };
  }

  // ── TMDB route ──
  try {
    const fallback: TMDBShowData = { id: 0, overview: '', poster_path: null, backdrop_path: null, vote_average: 0, popularity: 0 };
    const [tvRes, movieRes] = await Promise.all([
      tmdbFetch<TMDBShowData>(`/tv/${showId}`).catch(() => fallback),
      tmdbFetch<TMDBShowData>(`/movie/${showId}`).catch(() => fallback),
    ]);
    const data = tvRes.id ? tvRes : movieRes.id ? movieRes : null;
    const detectedType: 'tv' | 'movie' = tvRes.id ? 'tv' : 'movie';

    if (!data?.id) {
      return {
        title: 'Show',
        robots: { index: false, follow: true },
      };
    }

    const title = data.title || data.name || 'Show';
    const year = (data.release_date || data.first_air_date)?.slice(0, 4) || undefined;
    const genres = data.genres?.map(g => g.name) || [];
    const mediaType = detectedType === 'tv' ? 'tv' : 'movie';
    const backdrop = data.backdrop_path;

    const thin = isThinContent({
      description: data.overview,
      genres,
      cast: [],
      posterPath: data.poster_path,
    });

    return buildShowMetadata({
      title,
      year,
      mediaType,
      id: showId,
      description: data.overview,
      genres,
      image: backdrop ? `https://image.tmdb.org/t/p/original${backdrop}` : undefined,
      imageWidth: 1200,
      imageHeight: 630,
      isThin: thin,
    });
  } catch {
    return {
      title: 'Show',
      robots: { index: false, follow: true },
    };
  }
}

export default async function DetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const showId = Number(id);

  // ── AniList route: ID >= ANILIST_ID_OFFSET ──
  if (isAnilistId(showId)) {
    let show: MediaItem | null = null;
    let jsonLd: Record<string, unknown> | null = null;
    let videoJsonLd: Record<string, unknown> | null = null;
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
          '@type': data.format === 'TV' || data.format === 'TV_SHORT' ? 'TVSeries' : 'Movie',
          name: title,
          description,
          image: cover || undefined,
          url: `${SITE_URL}/details/${showId}`,
          datePublished: data.startDate?.year ? `${data.startDate.year}-${String(data.startDate.month || 1).padStart(2, '0')}-${String(data.startDate.day || 1).padStart(2, '0')}` : undefined,
          ...(data.episodes ? { numberOfEpisodes: data.episodes } : {}),
          aggregateRating: data.meanScore ? {
            '@type': 'AggregateRating',
            ratingValue: (data.meanScore / 10).toFixed(1),
            bestRating: '10',
            ratingCount: data.favourites || undefined,
          } : undefined,
          genre: data.genres?.slice(0, 5) || undefined,
        };
        videoJsonLd = cover ? {
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: title,
          description,
          thumbnailUrl: cover,
          uploadDate: data.startDate?.year ? `${data.startDate.year}-${String(data.startDate.month || 1).padStart(2, '0')}-${String(data.startDate.day || 1).padStart(2, '0')}` : new Date().toISOString().split('T')[0],
          contentUrl: `${SITE_URL}/details/${showId}`,
          embedUrl: `${SITE_URL}/details/${showId}`,
        } : null;
      }
    } catch { /* fall through to null */ }
    return (
      <>
        {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
        {videoJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }} />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: show?.title || 'Anime', item: `${SITE_URL}/details/${showId}` },
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
    const fallback: TMDBShowData = { id: 0, overview: '', poster_path: null, backdrop_path: null, vote_average: 0, popularity: 0 };
    const [tvRes, movieRes] = await Promise.all([
      tmdbFetch<TMDBShowData>(`/tv/${showId}`).catch(() => fallback),
      tmdbFetch<TMDBShowData>(`/movie/${showId}`).catch(() => fallback),
    ]);

    mediaType = tvRes.id ? 'tv' : movieRes.id ? 'movie' : null;
    rawData = mediaType === 'tv' ? tvRes : movieRes;

    if (!rawData?.id) {
      // No data found — return the component with null
    } else {
      // Step 2: Fetch full details only for the matched type
      fullData = await tmdbFetch<TMDBShowData & TMDBDetails>(
        `/${mediaType}/${showId}`,
        { append_to_response: 'credits,similar,content_ratings' }
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
  const usRating = fullData?.content_ratings?.results?.find(r => r.iso_3166_1 === 'US')?.rating
    || fullData?.content_ratings?.results?.[0]?.rating;

  // Movie or TVSeries schema depending on media type
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': mediaType === 'tv' ? 'TVSeries' : 'Movie',
    name: title,
    description,
    image: poster,
    url: `${SITE_URL}/details/${showId}`,
    datePublished: releaseDate,
    ...(rawData.runtime ? { duration: `PT${rawData.runtime}M` } : {}),
    ...(rawData.number_of_seasons ? { numberOfSeasons: rawData.number_of_seasons } : {}),
    ...(rawData.number_of_episodes ? { numberOfEpisodes: rawData.number_of_episodes } : {}),
    ...(usRating ? { contentRating: usRating } : {}),
    ...(rawData.vote_average ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rawData.vote_average.toFixed(1),
        bestRating: '10',
        ratingCount: rawData.vote_count || undefined,
      },
    } : {}),
    ...(genreNames.length ? { genre: genreNames.slice(0, 5) } : {}),
    ...(castNames.length ? { actor: castNames.map(n => ({ '@type': 'Person', name: n })) } : {}),
  };

  // VideoObject schema for video rich results in Google
  const videoJsonLd: Record<string, unknown> | null = rawData.backdrop_path ? {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description,
    thumbnailUrl: `https://image.tmdb.org/t/p/w1280${rawData.backdrop_path}`,
    uploadDate: releaseDate || new Date().toISOString().split('T')[0],
    contentUrl: `${SITE_URL}/details/${showId}`,
    embedUrl: `${SITE_URL}/details/${showId}`,
    ...(rawData.runtime ? { duration: `PT${rawData.runtime}M` } : {}),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {videoJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: title, item: `${SITE_URL}/details/${showId}` },
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