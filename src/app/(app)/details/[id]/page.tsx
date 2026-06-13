import { tmdbFetch } from '@/lib/tmdb/server';
import DetailsContent from '@/components/pages/DetailsContent';
import type { Metadata } from 'next';
import { tmdbToMedia } from '@/types';
import type { TMDBShow } from '@/types';

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

  // Detect media type and fetch data outside of try/catch to avoid JSX in try/catch
  let mediaType: 'tv' | 'movie' | null = null;
  let rawData: TMDBShowData | null = null;
  let fullData: TMDBShowData & TMDBDetails | null = null;

  try {
    // Step 1: Detect media type (try TV first, then Movie) — 2 parallel calls, not 4
    const [tvRes, movieRes] = await Promise.all([
      tmdbFetch<TMDBShowData>(`/tv/${showId}`).catch(() => ({ id: 0, overview: '', poster_path: null, backdrop_path: null, vote_average: 0, popularity: 0 })),
      tmdbFetch<TMDBShowData>(`/movie/${showId}`).catch(() => ({ id: 0, overview: '', poster_path: null, backdrop_path: null, vote_average: 0, popularity: 0 })),
    ]);

    mediaType = tvRes.id ? 'tv' : movieRes.id ? 'movie' : null;
    rawData = mediaType === 'tv' ? tvRes : movieRes;

    if (!rawData?.id) {
      // No data found — return the component with null
    } else {
      // Step 2: Fetch full details only for the matched type — 1 call instead of 2
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

  return (
    <DetailsContent
      showId={showId}
      initialShow={show}
      initialCredits={fullData?.credits?.cast?.slice(0, 8) || []}
      initialSimilar={fullData?.similar?.results?.slice(0, 6).map((r) => tmdbToMedia(r as TMDBShow)) || []}
    />
  );
}

function getJsonLd(data: TMDBShowData & TMDBDetails, mediaType: 'movie' | 'tv') {
  const title = data.title || data.name || 'Show';
  return {
    '@context': 'https://schema.org',
    '@type': mediaType === 'movie' ? 'Movie' : 'TVSeries',
    name: title,
    description: data.overview?.slice(0, 300) || '',
    image: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : undefined,
    datePublished: data.release_date || data.first_air_date || undefined,
  };
}