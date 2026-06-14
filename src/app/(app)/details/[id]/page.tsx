import { tmdbFetch } from '@/lib/tmdb/server';
import { getAnimeDetail, anilistToMediaItem } from '@/lib/anilist/client';
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

/**
 * Negative IDs are AniList items (namespaced to avoid collisions with TMDB).
 * The real AniList ID is Math.abs(showId).
 */
function isAnilistId(id: number): boolean {
  return id < 0;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const showId = Number(id);

  try {
    if (isAnilistId(showId)) {
      // AniList item
      const media = await getAnimeDetail(Math.abs(showId));
      if (media) {
        const item = anilistToMediaItem(media);
        return {
          title: `${item.title} | Lumina Stream`,
          description: (item.desc || 'Watch anime on Lumina Stream').slice(0, 160),
          openGraph: {
            title: `${item.title} | Lumina Stream`,
            description: (item.desc || 'Watch anime on Lumina Stream').slice(0, 160),
            images: item._anilistCover ? [item._anilistCover] : [],
          },
        };
      }
      return { title: 'Anime | Lumina Stream' };
    }

    // TMDB item
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

  // ─── AniList route (negative IDs) ─────────────────────────────────────────
  if (isAnilistId(showId)) {
    const anilistId = Math.abs(showId);
    let mediaItem: ReturnType<typeof anilistToMediaItem> | null = null;

    try {
      const media = await getAnimeDetail(anilistId);
      if (media) {
        mediaItem = anilistToMediaItem(media);
      }
    } catch {
      // fall through with null
    }

    if (!mediaItem) {
      return <DetailsContent showId={showId} initialShow={null} />;
    }

    return (
      <DetailsContent
        showId={showId}
        initialShow={mediaItem}
      />
    );
  }

  // ─── TMDB route (positive IDs) ────────────────────────────────────────────
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

  return (
    <DetailsContent
      showId={showId}
      initialShow={show}
      initialCredits={fullData?.credits?.cast?.slice(0, 8) || []}
      initialSimilar={fullData?.similar?.results?.slice(0, 6).map((r) => tmdbToMedia(r as TMDBShow)) || []}
    />
  );
}