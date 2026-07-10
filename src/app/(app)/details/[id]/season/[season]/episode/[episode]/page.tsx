import { tmdbFetch } from '@/lib/tmdb/server';
import { getAnimeDetail, anilistToMediaItem } from '@/lib/anilist/client';
import DetailsContent from '@/components/pages/DetailsContent';
import EpisodeSeoContent from '@/components/seo/EpisodeSeoContent';
import type { Metadata } from 'next';
import { tmdbToMedia, isAnilistId, toAnilistId, type TMDBShow } from '@/types';
import {
  buildEpisodeMetadata,
  buildShowMetadata,
  stripHtml,
  SITE_URL,
} from '@/lib/seo/metadata';

export const revalidate = 600; // 10 min

interface TMDBSeasonEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  runtime?: number;
  still_path: string | null;
  air_date: string;
  vote_average: number;
  season_number: number;
}

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
  genres?: { id: number; name: string }[];
  release_date?: string;
  first_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  runtime?: number;
}

interface TMDBDetails extends TMDBShowData {
  credits?: { cast: Array<{ id: number; name: string; character: string; profile_path: string | null }> };
  similar?: { results: TMDBShowData[] };
  videos?: { results: Array<{ id: string; key: string; name: string; type: string; site: string }> };
  content_ratings?: { results: Array<{ iso_3166_1: string; rating: string }> };
}

/**
 * generateMetadata for the episode page.
 *
 * Produces unique title, description, canonical, OG, and Twitter tags per episode.
 * Episodes without real API data (placeholders) get noindex to prevent bloat.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; season: string; episode: string }>;
}): Promise<Metadata> {
  const { id, season: seasonStr, episode: episodeStr } = await params;
  const showId = Number(id);
  const season = Number(seasonStr);
  const episode = Number(episodeStr);

  // ── AniList route ──
  if (isAnilistId(showId)) {
    try {
      const anilistId = toAnilistId(showId);
      const data = await getAnimeDetail(anilistId);
      if (data) {
        const title = data.title.english || data.title.romaji || data.title.native || 'Anime';
        const year = data.startDate?.year || undefined;
        const cover = data.coverImage?.extraLarge || data.coverImage?.large;

        // AniList doesn't have per-episode details at the title level in our
        // current query, so episodes without real data are "placeholder"
        const isPlaceholder = true; // Will be false once AniList episode queries are added
        const epList = data.episodes
          ? Array.from({ length: Math.min(data.episodes, season * 25) }, (_, i) => i + 1)
          : [];
        const isRealEpisode = episode <= epList.length;

        return buildEpisodeMetadata({
          showTitle: title,
          showYear: year,
          season,
          episode,
          showId,
          image: cover || undefined,
          mediaType: 'anime',
          isPlaceholder: isPlaceholder || !isRealEpisode,
        });
      }
    } catch { /* fall through */ }
    return {
      title: 'Episode',
      robots: { index: false, follow: true },
    };
  }

  // ── TMDB route ──
  try {
    // Detect media type
    const fallback: TMDBShowData = { id: 0, overview: '', poster_path: null, backdrop_path: null, vote_average: 0, popularity: 0 };
    const [tvRes, movieRes] = await Promise.all([
      tmdbFetch<TMDBShowData>(`/tv/${showId}`).catch(() => fallback),
      tmdbFetch<TMDBShowData>(`/movie/${showId}`).catch(() => fallback),
    ]);
    const rawData = tvRes.id ? tvRes : movieRes.id ? movieRes : null;
    const mediaType: 'tv' | 'movie' = tvRes.id ? 'tv' : 'movie';

    if (!rawData?.id) {
      return {
        title: 'Episode',
        robots: { index: false, follow: true },
      };
    }

    const showTitle = rawData.title || rawData.name || 'Show';
    const year = (rawData.release_date || rawData.first_air_date)?.slice(0, 4) || undefined;
    const backdrop = rawData.backdrop_path;
    const imageUrl = backdrop ? `https://image.tmdb.org/t/p/w1280${backdrop}` : undefined;

    // Fetch season episode data from TMDB
    let episodeData: TMDBSeasonEpisode | null = null;
    let isPlaceholder = true;

    if (mediaType === 'tv') {
      try {
        const seasonData = await tmdbFetch<{ episodes: TMDBSeasonEpisode[] }>(
          `/tv/${showId}/season/${season}`
        ).catch(() => ({ episodes: [] as TMDBSeasonEpisode[] }));

        const ep = seasonData.episodes?.find(
          (e: TMDBSeasonEpisode) => e.episode_number === episode
        );
        if (ep) {
          episodeData = ep;
          isPlaceholder = false;
        }
      } catch {
        // Season fetch failed — treat as placeholder
      }
    }

    return buildEpisodeMetadata({
      showTitle,
      showYear: year,
      season,
      episode,
      episodeTitle: episodeData?.name || undefined,
      episodeDescription: episodeData?.overview || undefined,
      runtime: episodeData?.runtime,
      showId,
      image: imageUrl,
      mediaType,
      isPlaceholder,
    });
  } catch {
    return {
      title: 'Episode',
      robots: { index: false, follow: true },
    };
  }
}

export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string; season: string; episode: string }>;
}) {
  const { id, season: seasonStr, episode: episodeStr } = await params;
  const showId = Number(id);
  const season = Number(seasonStr);
  const episode = Number(episodeStr);

  // ── AniList route ──
  if (isAnilistId(showId)) {
    let show: import('@/types').MediaItem | null = null;
    let jsonLd: Record<string, unknown> | null = null;
    let episodeJsonLd: Record<string, unknown> | null = null;

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
          genre: data.genres?.slice(0, 5) || undefined,
        };

        // Episode-level EpisodeObject schema
        episodeJsonLd = {
          '@context': 'https://schema.org',
          '@type': 'Episode',
          name: `Season ${season} Episode ${episode}`,
          partOfSeason: {
            '@type': 'Season',
            seasonNumber: season,
            name: `Season ${season}`,
          },
          partOfSeries: {
            '@type': data.format === 'TV' || data.format === 'TV_SHORT' ? 'TVSeries' : 'Movie',
            name: title,
            url: `${SITE_URL}/details/${showId}`,
          },
          url: `${SITE_URL}/details/${showId}/season/${season}/episode/${episode}`,
          position: episode,
        };
      }
    } catch { /* fall through to null */ }

    return (
      <>
        {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
        {episodeJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(episodeJsonLd) }} />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: show?.title || 'Anime', item: `${SITE_URL}/details/${showId}` },
            { '@type': 'ListItem', position: 3, name: `Season ${season}`, item: `${SITE_URL}/details/${showId}/season/${season}` },
            { '@type': 'ListItem', position: 4, name: `Episode ${episode}`, item: `${SITE_URL}/details/${showId}/season/${season}/episode/${episode}` },
          ],
        }) }} />
        <DetailsContent showId={showId} initialShow={show} defaultSeason={season} defaultEpisode={episode} />
      </>
    );
  }

  // ── TMDB route ──
  let mediaType: 'tv' | 'movie' | null = null;
  let rawData: TMDBShowData | null = null;
  let fullData: TMDBDetails | null = null;
  let episodeData: TMDBSeasonEpisode | null = null;

  try {
    const fallback: TMDBShowData = { id: 0, overview: '', poster_path: null, backdrop_path: null, vote_average: 0, popularity: 0 };
    const [tvRes, movieRes] = await Promise.all([
      tmdbFetch<TMDBShowData>(`/tv/${showId}`).catch(() => fallback),
      tmdbFetch<TMDBShowData>(`/movie/${showId}`).catch(() => fallback),
    ]);

    mediaType = tvRes.id ? 'tv' : movieRes.id ? 'movie' : null;
    rawData = mediaType === 'tv' ? tvRes : movieRes;

    if (rawData?.id) {
      const fetches: Promise<unknown>[] = [
        tmdbFetch<TMDBDetails>(`/${mediaType}/${showId}`, {
          append_to_response: 'credits,similar,videos,content_ratings',
        }).catch(() => rawData as TMDBDetails),
      ];

      // Fetch episode data for TV shows
      if (mediaType === 'tv') {
        fetches.push(
          tmdbFetch<{ episodes: TMDBSeasonEpisode[] }>(
            `/tv/${showId}/season/${season}`
          ).catch(() => ({ episodes: [] as TMDBSeasonEpisode[] }))
        );
      }

      const [fullRes, seasonRes] = await Promise.all(fetches);
      fullData = fullRes as TMDBDetails;

      if (seasonRes) {
        const ep = (seasonRes as { episodes: TMDBSeasonEpisode[] }).episodes?.find(
          (e: TMDBSeasonEpisode) => e.episode_number === episode
        );
        if (ep) episodeData = ep;
      }
    }
  } catch {
    // fall through
  }

  if (!rawData?.id || !mediaType) {
    return <DetailsContent showId={showId} initialShow={null} defaultSeason={season} defaultEpisode={episode} />;
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

  // Show-level schema
  const showJsonLd: Record<string, unknown> = {
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

  // Episode-level EpisodeObject schema
  const episodeJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Episode',
    name: episodeData?.name || `Season ${season} Episode ${episode}`,
    description: episodeData?.overview || undefined,
    ...(episodeData?.still_path ? {
      image: `https://image.tmdb.org/t/p/w1280${episodeData.still_path}`,
    } : {}),
    partOfSeason: {
      '@type': 'Season',
      seasonNumber: season,
      name: `Season ${season}`,
    },
    partOfSeries: {
      '@type': mediaType === 'tv' ? 'TVSeries' : 'Movie',
      name: title,
      url: `${SITE_URL}/details/${showId}`,
    },
    url: `${SITE_URL}/details/${showId}/season/${season}/episode/${episode}`,
    position: episode,
    ...(episodeData?.runtime ? { duration: `PT${episodeData.runtime}M` } : {}),
    datePublished: episodeData?.air_date || releaseDate,
  };

  // VideoObject for episode pages — enables video rich results
  const videoJsonLd: Record<string, unknown> | null = (episodeData?.still_path || rawData.backdrop_path) ? {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: episodeData?.name || `${title} Season ${season} Episode ${episode}`,
    description: episodeData?.overview || description,
    thumbnailUrl: episodeData?.still_path
      ? `https://image.tmdb.org/t/p/w1280${episodeData.still_path}`
      : rawData.backdrop_path
        ? `https://image.tmdb.org/t/p/w1280${rawData.backdrop_path}`
        : undefined,
    uploadDate: episodeData?.air_date || releaseDate || new Date().toISOString().split('T')[0],
    contentUrl: `${SITE_URL}/details/${showId}/season/${season}/episode/${episode}`,
    embedUrl: `${SITE_URL}/details/${showId}/season/${season}/episode/${episode}`,
    ...(episodeData?.runtime ? { duration: `PT${episodeData.runtime}M` } : {}),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(showJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(episodeJsonLd) }} />
      {videoJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: title, item: `${SITE_URL}/details/${showId}` },
          { '@type': 'ListItem', position: 3, name: `Season ${season}`, item: `${SITE_URL}/details/${showId}/season/${season}` },
          { '@type': 'ListItem', position: 4, name: `Episode ${episode}`, item: `${SITE_URL}/details/${showId}/season/${season}/episode/${episode}` },
        ],
      }) }} />
      {/* SERVER-RENDERED EPISODE SEO CONTENT */}
      <EpisodeSeoContent
        showTitle={title}
        showId={showId}
        season={season}
        episode={episode}
        episodeTitle={episodeData?.name}
        episodeOverview={episodeData?.overview}
        runtime={episodeData?.runtime}
        airDate={episodeData?.air_date}
        rating={episodeData?.vote_average}
        showOverview={rawData?.overview}
        showGenres={genreNames}
        showMediaType={mediaType || undefined}
        totalEpisodes={undefined}
      />
      <DetailsContent
        showId={showId}
        initialShow={show}
        initialCredits={fullData?.credits?.cast?.slice(0, 8) || []}
        initialSimilar={fullData?.similar?.results?.slice(0, 6).map((r) => tmdbToMedia(r as TMDBShow)) || []}
        initialVideos={fullData?.videos?.results?.filter((v) => (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube').map((v) => ({ key: v.key, name: v.name, site: v.site, type: v.type })) || []}
        defaultSeason={season}
        defaultEpisode={episode}
      />
    </>
  );
}