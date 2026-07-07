import { Suspense } from 'react';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch } from '@/lib/tmdb/server';
import BrowseClient from '@/components/pages/BrowseClient';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';

export const revalidate = 300; // 5 min — browse catalog changes slowly

const siteUrl = CANONICAL_BASE;
const browseUrl = `${siteUrl}/browse`;

export const metadata: Metadata = {
  title: 'Browse - Movies & TV Shows',
  description: 'Browse the full catalog of movies and TV shows. Discover trending, popular, top-rated, and newly released content.',
  alternates: { canonical: browseUrl },
  openGraph: {
    type: 'website',
    url: browseUrl,
    title: 'Browse - Movies & TV Shows | Lumina Stream',
    description: 'Browse the full catalog of movies and TV shows on Lumina Stream.',
    siteName: 'Lumina Stream',
    images: [{ url: `${siteUrl}/og/og-movies.png`, width: 1344, height: 768, alt: 'Browse Movies & TV Shows on Lumina Stream' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Browse - Movies & TV Shows | Lumina Stream',
    description: 'Browse the full catalog of movies and TV shows on Lumina Stream.',
  },
};

// Fetch multiple pages in parallel for richer initial load
async function getBrowseData() {
  try {
    const [trending, popular, tvPopular, topRated, nowPlaying] = await Promise.all([
      tmdbFetch<{ results?: TMDBShow[] }>('/trending/all/week').catch(() => ({ results: [] })),
      tmdbFetch<{ results?: TMDBShow[] }>('/movie/popular').catch(() => ({ results: [] })),
      tmdbFetch<{ results?: TMDBShow[] }>('/tv/popular').catch(() => ({ results: [] })),
      tmdbFetch<{ results?: TMDBShow[] }>('/movie/top_rated').catch(() => ({ results: [] })),
      tmdbFetch<{ results?: TMDBShow[] }>('/movie/now_playing').catch(() => ({ results: [] })),
    ]);

    // Merge and deduplicate by ID
    const allResults = [
      ...(trending.results || []).map(r => ({ ...r, media_type: (r.media_type || 'movie') as 'movie' | 'tv' })),
      ...(popular.results || []).map(r => ({ ...r, media_type: 'movie' as const })),
      ...(tvPopular.results || []).map(r => ({ ...r, media_type: 'tv' as const })),
      ...(topRated.results || []).map(r => ({ ...r, media_type: (r.media_type || 'movie') as 'movie' | 'tv' })),
      ...(nowPlaying.results || []).map(r => ({ ...r, media_type: 'movie' as const })),
    ];

    // Deduplicate by ID, keeping first occurrence (trending priority)
    const seen = new Set<number>();
    const unique = allResults.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    return unique.slice(0, 80).map(r => tmdbToMedia(r));
  } catch {
    return [];
  }
}

export default async function BrowsePage() {
  const shows = await getBrowseData();

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Browse',
    description: metadata.description,
    url: browseUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Browse', item: browseUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <header style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 20px' }}>
        <h2 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8', marginBottom: 12, letterSpacing: '.02em' }}>Browse</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, maxWidth: 800 }}>
          Dive into the full Lumina Stream catalog. Browse combines trending, popular, and top-rated movies and TV shows into a single powerful discovery page. Use the built-in search and genre filters to narrow down results by mood, era, or rating. Our catalog is powered by TMDB and AniList, giving you access to thousands of titles across every genre — from Hollywood blockbusters and acclaimed TV dramas to Japanese anime and Western cartoons — all in one place. This is the most flexible page on the site: start with the pre-loaded results below, then refine with genre tags, sort by newest or highest-rated, or type a title into the search bar. Whether you know exactly what you want or you are just exploring, the Browse page adapts to your preferences and surfaces relevant results instantly. New content is synced from TMDB and AniList every few minutes, ensuring the catalog always feels fresh and up to date.
        </p>
      </header>
      <Suspense>
        <BrowseClient initialShows={shows} />
      </Suspense>
    </>
  );
}