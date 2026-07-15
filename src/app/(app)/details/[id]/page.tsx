import { cache } from 'react';
import { tmdbFetch } from '@/lib/tmdb/server';
import { getAnimeDetail, anilistToMediaItem } from '@/lib/anilist/client';
import DetailsContent from '@/components/pages/DetailsContent';
import DetailSeoContent from '@/components/seo/DetailSeoContent';
import type { Metadata } from 'next';
import { tmdbToMedia, isAnilistId, toAnilistId, ANILIST_ID_OFFSET } from '@/types';
import type { TMDBShow, MediaItem } from '@/types';
import {
  buildShowMetadata,
  stripHtml,
  isThinContent,
  SITE_URL,
} from '@/lib/seo/metadata';
import { extractIdFromSlug, mediaUrl } from '@/lib/slug';

/**
 * Cached TMDB detail fetch — shared between generateMetadata() and the page component.
 * Without this, Next.js calls BOTH in the same request, doubling the TMDB calls.
 * React.cache() deduplicates identical calls within a single RSC render.
 */
const getCachedTmdbDetails = cache(async (showId: number) => {
  const tryTv = async () => {
    const d = await tmdbFetch<TMDBShowData & TMDBDetails>(`/tv/${showId}`, { append_to_response: 'credits,similar,videos,content_ratings' });
    return d.id ? { data: d, type: 'tv' as const } : null;
  };
  const tryMovie = async () => {
    const d = await tmdbFetch<TMDBShowData & TMDBDetails>(`/movie/${showId}`, { append_to_response: 'credits,similar,videos,content_ratings' });
    return d.id ? { data: d, type: 'movie' as const } : null;
  };

  const [tvResult, movieResult] = await Promise.all([
    tryTv().catch(() => null),
    tryMovie().catch(() => null),
  ]);

  let result: { data: TMDBShowData & TMDBDetails; type: 'tv' | 'movie' } | null = null;
  if (tvResult && movieResult) {
    result = tvResult.data.popularity >= movieResult.data.popularity ? tvResult : movieResult;
  } else {
    result = tvResult || movieResult;
  }
  return result;
});

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
  videos?: { results: Array<{ id: string; key: string; name: string; type: string; site: string }> };
  seasons?: Array<{ season_number: number; name: string; episode_count: number }>;
  content_ratings?: { results: Array<{ iso_3166_1: string; rating: string }> };
  production_companies?: Array<{ name: string }>;
  original_title?: string;
  original_language?: string;
  tagline?: string;
}

export const revalidate = 600; // 10 min

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: rawSlug } = await params;
  const showId = extractIdFromSlug(rawSlug) || Number(rawSlug);

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
    const result = await getCachedTmdbDetails(showId);

    if (!result?.data?.id) {
      return {
        title: 'Show',
        robots: { index: false, follow: true },
      };
    }

    const data = result.data;
    const mediaType = result.type;
    const title = data.title || data.name || 'Show';
    const year = (data.release_date || data.first_air_date)?.slice(0, 4) || undefined;
    const genres = data.genres?.map(g => g.name) || [];
    const backdrop = data.backdrop_path;
    const cast = data.credits?.cast?.map(c => c.name) || [];

    const thin = isThinContent({
      description: data.overview,
      genres,
      cast,
      posterPath: data.poster_path,
    });

    return buildShowMetadata({
      title,
      year,
      mediaType,
      id: showId,
      description: data.overview,
      genres,
      cast,
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
  const { id: rawSlug } = await params;
  const showId = extractIdFromSlug(rawSlug) || Number(rawSlug);

  // ── AniList route: ID >= ANILIST_ID_OFFSET ──
  if (isAnilistId(showId)) {
    let show: MediaItem | null = null;
    let jsonLd: Record<string, unknown> | null = null;
    let videoJsonLd: Record<string, unknown> | null = null;
    let anilistData: Awaited<ReturnType<typeof getAnimeDetail>> = null;
    try {
      const anilistId = toAnilistId(showId);
      const data = await getAnimeDetail(anilistId);
      anilistData = data;
      if (data) {
        show = anilistToMediaItem(data);
        const title = data.title.english || data.title.romaji || data.title.native || 'Anime';
        const cover = data.coverImage?.extraLarge || data.coverImage?.large;
        const description = (data.description?.replace(/<[^>]*>/g, '') || '').slice(0, 500);
        const studioNames = data.studios?.nodes?.map(s => s.name).filter(Boolean) || [];

        // Build non-spoiler tag list for genres-like enrichment
        const tagNames = (data.tags || [])
          .filter(t => !t.isMediaSpoiler && (t.rank ?? 0) < 30)
          .map(t => t.name);

        // Build similar anime list from AniList recommendations
        const recNodes = (data as unknown as { recommendations?: { nodes: Array<{ mediaRecommendation: { id: number; title: { romaji: string | null; english: string | null; native: string | null }; meanScore: number | null; startDate: { year: number | null } | null } }> } }).recommendations?.nodes || [];
        const similarAnime = recNodes
          .map(n => {
            const rec = n.mediaRecommendation;
            if (!rec) return null;
            return {
              id: rec.id + ANILIST_ID_OFFSET, // Namespace the AniList ID
              title: rec.title.english || rec.title.romaji || rec.title.native || undefined,
              vote_average: rec.meanScore ? rec.meanScore / 10 : undefined,
              release_date: rec.startDate?.year ? `${rec.startDate.year}-01-01` : undefined,
            };
          })
          .filter((s): s is NonNullable<typeof s> => s !== null && s.title !== undefined);

        const releaseDate = data.startDate?.year
          ? `${data.startDate.year}-${String(data.startDate.month || 1).padStart(2, '0')}-${String(data.startDate.day || 1).padStart(2, '0')}`
          : undefined;

        // AniList meanScore is 0-100, convert to 0-10 for TMDB-compatible rating
        const rating10 = data.meanScore ? data.meanScore / 10 : undefined;

        // Build ImageObject for the cover
        const coverImageObject = cover ? {
          '@type': 'ImageObject',
          url: cover,
          width: 1200,
          height: 630,
        } : undefined;

        jsonLd = {
          '@context': 'https://schema.org',
          '@type': data.format === 'TV' || data.format === 'TV_SHORT' ? 'TVSeries' : 'Movie',
          name: title,
          description,
          image: coverImageObject || cover || undefined,
          url: `${SITE_URL}${mediaUrl(showId, show?.title || '', 'tv', data.startDate?.year, true)}`,
          datePublished: releaseDate,
          ...(data.episodes ? { numberOfEpisodes: data.episodes } : {}),
          ...(data.duration ? { duration: `PT${data.duration}M` } : {}),
          ...(rating10 ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: rating10.toFixed(1),
              bestRating: '10',
              ratingCount: data.popularity || undefined,
            },
          } : {}),
          genre: data.genres?.slice(0, 5) || undefined,
          ...(studioNames.length > 0 ? { productionCompany: studioNames.slice(0, 3) } : {}),
        };

        // Build VideoObject with trailer
        const trailerUrl = data.trailer?.site === 'youtube' ? `https://www.youtube.com/watch?v=${data.trailer.id}` : undefined;
        videoJsonLd = cover ? {
          '@context': 'https://schema.org',
          '@type': 'VideoObject',
          name: title,
          description,
          thumbnailUrl: cover,
          uploadDate: releaseDate || new Date().toISOString().split('T')[0],
          contentUrl: `${SITE_URL}${mediaUrl(showId, show?.title || '', 'tv', data.startDate?.year, true)}`,
          embedUrl: `${SITE_URL}${mediaUrl(showId, show?.title || '', 'tv', data.startDate?.year, true)}`,
          ...(trailerUrl ? { embedUrl: trailerUrl } : {}),
          ...(data.duration ? { duration: `PT${data.duration}M` } : {}),
        } : null;

        // Build season list for anime (AniList uses seasons, we show as Season 1)
        const seasonList = data.episodes ? [{ season_number: 1, name: 'Season 1', episode_count: data.episodes }] : undefined;

        return (
          <>
            {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
            {videoJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }} />}
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
                { '@type': 'ListItem', position: 2, name: show?.title || 'Anime', item: `${SITE_URL}${mediaUrl(showId, show?.title || '', 'tv', data.startDate?.year, true)}` },
              ],
            }) }} />
            <DetailsContent showId={showId} initialShow={show} />
            {/* SERVER-RENDERED SEO CONTENT for AniList anime — placed AFTER DetailsContent
                so the hero backdrop (LCP element) renders first, improving LCP */}
            {show && (
              <DetailSeoContent
                title={show.title}
                year={show.yr ? String(show.yr) : undefined}
                overview={stripHtml(show.desc || '')}
                genres={[...data.genres, ...tagNames.slice(0, 3)]}
                genreIds={[]}
                mediaType="anime"
                showId={showId}
                anilistId={anilistId}
                rating={rating10}
                voteCount={data.popularity}
                runtime={data.duration || undefined}
                seasons={1}
                episodes={data.episodes || undefined}
                status={data.status === 'RELEASING' ? 'Returning Series' : data.status === 'FINISHED' ? 'Ended' : data.status === 'NOT_YET_RELEASED' ? 'Planned' : undefined}
                releaseDate={releaseDate}
                cast={[]}
                similar={similarAnime}
                productionCompanies={studioNames}
                seasonList={seasonList}
                originalTitle={data.title.romaji || data.title.native || undefined}
                originalLanguage="ja"
                popularity={data.popularity}
              />
            )}
          </>
        );
      }
    } catch { /* fall through to null */ }
    return (
      <>
        <DetailsContent showId={showId} initialShow={null} />
      </>
    );
  }

  // ── TMDB route: standard ID ──
  let mediaType: 'tv' | 'movie' | null = null;
  let fullData: TMDBShowData & TMDBDetails | null = null;

  try {
    // Reuses the SAME cached result from generateMetadata (React.cache dedup)
    const result = await getCachedTmdbDetails(showId);
    if (result) {
      mediaType = result.type;
      fullData = result.data;
    }
  } catch {
    // fall through to render with null
  }

  const rawData = fullData;

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
  const genreIds = rawData.genres?.map(g => g.id) || [];
  const usRating = fullData?.content_ratings?.results?.find(r => r.iso_3166_1 === 'US')?.rating
    || fullData?.content_ratings?.results?.[0]?.rating;
  const year = (releaseDate)?.slice(0, 4) || undefined;

  // Movie or TVSeries schema depending on media type
  const posterImage = poster ? {
    '@type': 'ImageObject',
    url: poster,
    width: 500,
    height: 750,
  } : undefined;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': mediaType === 'tv' ? 'TVSeries' : 'Movie',
    name: title,
    description,
    image: posterImage || poster,
    url: `${SITE_URL}${mediaUrl(showId, title, mediaType, year)}`,
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
    contentUrl: `${SITE_URL}${mediaUrl(showId, title, mediaType, year)}`,
    embedUrl: `${SITE_URL}${mediaUrl(showId, title, mediaType, year)}`,
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
          { '@type': 'ListItem', position: 2, name: title, item: `${SITE_URL}${mediaUrl(showId, title, mediaType, year)}` },
        ],
      }) }} />
      <DetailsContent
        showId={showId}
        initialShow={show}
        initialCredits={fullData?.credits?.cast?.slice(0, 8) || []}
        initialSimilar={fullData?.similar?.results?.slice(0, 6).map((r) => tmdbToMedia(r as TMDBShow)) || []}
        initialVideos={fullData?.videos?.results?.filter((v) => (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube').map((v) => ({ key: v.key, name: v.name, site: v.site, type: v.type })) || []}
      />
      {/* SERVER-RENDERED SEO CONTENT — placed AFTER DetailsContent so the hero
          backdrop (the LCP element) is rendered first in the DOM */}
      <DetailSeoContent
        title={title}
        year={year}
        overview={rawData.overview || ''}
        tagline={rawData.tagline}
        genres={genreNames}
        genreIds={genreIds}
        mediaType={mediaType}
        showId={showId}
        rating={rawData.vote_average || undefined}
        voteCount={rawData.vote_count}
        runtime={rawData.runtime}
        seasons={rawData.number_of_seasons}
        episodes={rawData.number_of_episodes}
        status={rawData.status}
        contentRating={usRating}
        releaseDate={releaseDate}
        cast={fullData?.credits?.cast?.slice(0, 6) || []}
        similar={(fullData?.similar?.results?.slice(0, 5) || []).map((r) => ({ id: r.id, title: r.title, name: r.name, vote_average: r.vote_average, release_date: r.release_date, first_air_date: r.first_air_date }))}
        productionCompanies={fullData?.production_companies?.map(pc => pc.name)}
        seasonList={fullData?.seasons}
        originalTitle={rawData.original_title}
        originalLanguage={rawData.original_language}
        popularity={rawData.popularity}
      />
    </>
  );
}