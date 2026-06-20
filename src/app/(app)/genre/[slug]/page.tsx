import { tmdbFetch } from '@/lib/tmdb/server';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { getPopularAnime, anilistToMediaItem } from '@/lib/anilist/client';
import type { Metadata } from 'next';
import AnimeThemedPage from '@/components/pages/AnimePage';
import CartoonThemedPage from '@/components/pages/CartoonPage';
import HorrorThemedPage from '@/components/pages/HorrorPage';
import RomanceThemedPage from '@/components/pages/RomancePage';
import MysteryThemedPage from '@/components/pages/MysteryPage';
import FantasyThemedPage from '@/components/pages/FantasyPage';
import type { MediaItem, TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import { PORTAL_GENRE_MAP, PORTAL_SLUGS, type PortalGenreConfig } from '@/config/genres';

// ─── Component registry ─────────────────────────────────────────────────────

const COMPONENT_MAP: Record<string, React.ComponentType<{ initialShows: MediaItem[] }>> = {
  anime:   AnimeThemedPage,
  cartoon: CartoonThemedPage,
  horror:  HorrorThemedPage,
  romance: RomanceThemedPage,
  mystery: MysteryThemedPage,
  fantasy: FantasyThemedPage,
};

// ─── SEO metadata ───────────────────────────────────────────────────────────

const siteUrl = CANONICAL_BASE;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const genre = PORTAL_GENRE_MAP[slug];
  if (!genre) return { title: 'Genre Not Found' };
  const pageUrl = `${siteUrl}/genre/${slug}`;
  return {
    title: genre.title,
    description: genre.description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website',
      url: pageUrl,
      title: genre.title,
      description: genre.description,
      siteName: 'Lumina Stream',
      images: [{ url: `${siteUrl}/og/og-genres.png`, width: 1344, height: 768, alt: `${genre.title} on Lumina Stream` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: genre.title,
      description: genre.description,
    },
  };
}

export const revalidate = 600; // 10 min

// ─── Static params for build-time generation ────────────────────────────────

export function generateStaticParams() {
  return PORTAL_SLUGS.map(slug => ({ slug }));
}

// ─── TMDB multi-page fetcher with dedup ─────────────────────────────────────

async function fetchTmdbPages(
  mediaType: string,
  paramsMap: Record<string, string>,
  totalPages: number = 5,
): Promise<TMDBShow[]> {
  const allResults = await Promise.all(
    Array.from({ length: totalPages }, (_, i) =>
      tmdbFetch<{ results?: TMDBShow[] }>(
        `/discover/${mediaType}`,
        { ...paramsMap, page: String(i + 1) },
      ).catch(() => ({ results: [] }))
    )
  );

  const seen = new Set<number>();
  return allResults
    .flatMap(d => d.results || [])
    .filter(r => {
      if (!r.poster_path || seen.has(r.id)) return false;
      if (r.vote_count !== undefined && r.vote_count < 50 && r.popularity < 5) return false;
      seen.add(r.id);
      return true;
    });
}

// ─── Cartoon: filter out Japanese-origin content ────────────────────────────
// Replaces fragile regex title-matching with TMDB origin_country field.

function isJapaneseOrigin(item: TMDBShow): boolean {
  const oc = (item as unknown as Record<string, unknown>).origin_country;
  return Array.isArray(oc) && (oc as string[]).includes('JP');
}

// ─── Page component ─────────────────────────────────────────────────────────

export default async function GenrePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const config = PORTAL_GENRE_MAP[slug];

  if (!config) {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div className="f-cinzel" style={{ fontSize: '1.2rem', color: 'rgba(255,245,232,.4)' }}>Genre not found</div>
      </div>
    );
  }

  const Component = COMPONENT_MAP[slug];
  let shows: MediaItem[] = [];

  if (config.source === 'anilist') {
    // ── Anime: AniList primary, TMDB fallback ──
    try {
      const [page1, page2, page3] = await Promise.all([
        getPopularAnime(1, 20).catch(() => ({ media: [], pageInfo: { hasNextPage: false } })),
        getPopularAnime(2, 20).catch(() => ({ media: [], pageInfo: { hasNextPage: false } })),
        getPopularAnime(3, 20).catch(() => ({ media: [], pageInfo: { hasNextPage: false } })),
      ]);
      const allMedia = [...page1.media, ...page2.media, ...page3.media];
      const seen = new Set<number>();
      shows = allMedia
        .filter(m => m.coverImage?.large && !seen.has(m.id))
        .map(m => { seen.add(m.id); return anilistToMediaItem(m); });
    } catch {
      try {
        const paramsMap: Record<string, string> = {
          with_genres: config.genreId.toString(),
          ...config.extraParams,
        };
        const results = await fetchTmdbPages(config.mediaType, paramsMap, 3);
        shows = results.slice(0, 60).map(r => tmdbToMedia({ ...r, media_type: config.mediaType }));
      } catch {
        shows = [];
      }
    }
  } else if (slug === 'cartoon') {
    // ── Cartoon: dual fetch (genre + keyword), filter by origin_country ──
    try {
      const [englishResults, keywordResults] = await Promise.all([
        fetchTmdbPages(config.mediaType, {
          with_genres: config.genreId.toString(),
          ...config.extraParams,
        }, 5),
        fetchTmdbPages(config.mediaType, {
          with_keywords: '210755',
          sort_by: 'popularity.desc',
          vote_count_gte: '30',
        }, 3).catch(() => []),
      ]);

      const seen = new Set<number>();
      const merged: TMDBShow[] = [];
      for (const item of [...englishResults, ...keywordResults]) {
        if (seen.has(item.id)) continue;
        // Filter out Japanese-origin content (anime) using origin_country
        if (isJapaneseOrigin(item)) continue;
        seen.add(item.id);
        merged.push(item);
      }
      shows = merged.map(r => tmdbToMedia({ ...r, media_type: config.mediaType }));
    } catch {
      shows = [];
    }
  } else {
    // ── All other genres: standard TMDB discover ──
    try {
      const paramsMap: Record<string, string> = {
        with_genres: config.genreId.toString(),
        ...config.extraParams,
      };
      const results = await fetchTmdbPages(config.mediaType, paramsMap, 5);
      shows = results.map(r => tmdbToMedia({ ...r, media_type: config.mediaType }));
    } catch {
      shows = [];
    }
  }

  // Build CollectionPage + BreadcrumbList JSON-LD
  const pageUrl = `${siteUrl}/genre/${slug}`;
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: config.title,
    description: config.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: config.title, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Component initialShows={shows} />
    </>
  );
}