import { tmdbFetch } from '@/lib/tmdb/server';
import { CANONICAL_BASE, TMDB_IMAGE_BASE } from '@/lib/seo/constants';
import { getFamilyFriendlyAnime, anilistToMediaItem } from '@/lib/anilist/client';
import type { Metadata } from 'next';
import Link from 'next/link';
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

  // Fetch the top result's backdrop for a unique, genre-relevant OG image.
  // Falls back to the generic og-genres.png on any failure.
  let ogImageUrl = `${siteUrl}/og/og-genres.png`;
  let ogImageWidth = 1344;
  let ogImageHeight = 768;
  try {
    if (genre.source === 'anilist') {
      const data = await getFamilyFriendlyAnime(1, 1);
      const banner = data.media?.[0]?.bannerImage;
      if (banner) { ogImageUrl = banner; ogImageWidth = 1200; ogImageHeight = 630; }
    } else {
      const paramsMap: Record<string, string> = { with_genres: String(genre.genreId), ...genre.extraParams };
      const data = await tmdbFetch<{ results?: { backdrop_path?: string }[] }>(`/discover/${genre.mediaType}`, { ...paramsMap, page: '1' });
      const backdrop = data.results?.[0]?.backdrop_path;
      if (backdrop) { ogImageUrl = `${TMDB_IMAGE_BASE}/original${backdrop}`; ogImageWidth = 1200; ogImageHeight = 630; }
    }
  } catch { /* keep fallback */ }

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
      images: [{ url: ogImageUrl, width: ogImageWidth, height: ogImageHeight, alt: `${genre.title} on Lumina Stream` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: genre.title,
      description: genre.description,
      images: [ogImageUrl],
    },
  };
}

export const revalidate = 600; // 10 min ISR

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
    // ── Anime: AniList ONLY (no TMDB fallback — TMDB genre 16 = cartoons) ──
    // Uses family-friendly genre filter to exclude ecchi/suggestive content.
    try {
      const [page1, page2, page3] = await Promise.all([
        getFamilyFriendlyAnime(1, 20).catch(() => ({ media: [], pageInfo: { hasNextPage: false } })),
        getFamilyFriendlyAnime(2, 20).catch(() => ({ media: [], pageInfo: { hasNextPage: false } })),
        getFamilyFriendlyAnime(3, 20).catch(() => ({ media: [], pageInfo: { hasNextPage: false } })),
      ]);
      const allMedia = [...page1.media, ...page2.media, ...page3.media];
      const seen = new Set<number>();
      shows = allMedia
        .filter(m => m.coverImage?.large && !seen.has(m.id))
        .map(m => { seen.add(m.id); return anilistToMediaItem(m); });
    } catch {
      shows = [];
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: `What ${config.title.toLowerCase()} titles can I find here?`, acceptedAnswer: { '@type': 'Answer', text: `This ${config.title.toLowerCase()} page curates the best titles from ${config.source === 'anilist' ? 'AniList' : 'TMDB'}, updated regularly. Use the sub-genre filters and sort options to narrow down results. Our collection includes both popular hits and critically acclaimed ${config.title.toLowerCase()} content.` } },
          { '@type': 'Question', name: `How is the ${config.title.toLowerCase()} collection updated?`, acceptedAnswer: { '@type': 'Answer', text: `The ${config.title.toLowerCase()} catalog is powered by ${config.source === 'anilist' ? 'AniList' : 'TMDB'} and refreshed regularly with new titles. Content is re-curated throughout the day to ensure fresh, relevant results.` } },
          { '@type': 'Question', name: 'Can I filter by sub-genre within this genre?', acceptedAnswer: { '@type': 'Answer', text: `Yes. Each genre page includes sub-genre filter tags that let you narrow results. For example, within horror you can filter for supernatural, psychological, or slasher titles. Click any sub-genre tag to apply the filter.` } },
        ],
      }) }} />
      <Component initialShows={shows} />
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '60px 20px 60px',
      }}>
        <h2 className="f-cinzel-dec" style={{
          fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8',
          marginBottom: 12, letterSpacing: '.02em',
        }}>{config.title}</h2>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.9rem,1.3vw,1.05rem)',
          color: 'rgba(255,245,232,.55)', lineHeight: 1.7,
          maxWidth: 800, marginBottom: 16,
        }}>
          {config.description} Our {config.title.toLowerCase()} collection is powered by {config.source === 'anilist' ? 'AniList' : 'TMDB'} and updated regularly with new titles. Use the genre filters and sort options above to find exactly what you are in the mood for. This curated portal features {shows.length} titles spanning movies, TV shows, and {config.source === 'anilist' ? 'anime series' : 'animated content'}, all organized for easy browsing and discovery.
        </p>
        <nav aria-label="Explore other genres" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 0 }}>
          {[
            { label: 'All Genres', href: '/genres' },
            { label: 'Browse All', href: '/browse' },
            { label: 'Top Rated', href: '/top-rated' },
            { label: 'New Releases', href: '/new-releases' },
            ...PORTAL_SLUGS.filter(s => s !== slug).map(s => ({
              label: PORTAL_GENRE_MAP[s]?.name || s,
              href: `/genre/${s}`,
            })),
          ].map(link => (
            <Link key={link.href + link.label} href={link.href} style={{
              display: 'inline-block', padding: '5px 12px', borderRadius: 8,
              fontSize: '.75rem', color: '#FFB347',
              background: 'rgba(255,179,71,.06)', border: '1px solid rgba(255,179,71,.12)',
              textDecoration: 'none', transition: 'background .2s',
            }}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}