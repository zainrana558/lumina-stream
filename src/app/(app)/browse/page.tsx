import { Suspense } from 'react';
import { tmdbFetch } from '@/lib/tmdb/server';
import BrowseClient from '@/components/pages/BrowseClient';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';

export const revalidate = 300; // 5 min — browse catalog changes slowly

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-stream-omega.vercel.app';
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
      <Suspense>
        <BrowseClient initialShows={shows} />
      </Suspense>
    </>
  );
}