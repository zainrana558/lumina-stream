import { Suspense } from 'react';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';
import BrowseClient from '@/components/pages/BrowseClient';

export const revalidate = 300;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/movies`;

export const metadata: Metadata = {
  title: 'Movies - Watch Free Movies Online | Lumina Stream',
  description:
    'Browse thousands of free movies online. From blockbusters to hidden gems, stream the latest releases, top-rated films, and classic cinema on Lumina Stream.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Movies - Watch Free Movies Online | Lumina Stream',
    description: 'Browse and stream thousands of free movies. Action, comedy, horror, romance, sci-fi, and more.',
    siteName: 'Lumina Stream',
    images: [{ url: `${siteUrl}/og/og-movies.png`, width: 1344, height: 768, alt: 'Lumina Stream Movies' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Movies - Watch Free Movies Online | Lumina Stream',
    description: 'Stream thousands of free movies on Lumina Stream.',
    images: [`${siteUrl}/og/og-movies.png`],
  },
};

async function getMoviesData() {
  try {
    const endpoints = [
      { ep: '/trending/movie/week', pages: 3 },
      { ep: '/movie/popular', pages: 3 },
      { ep: '/movie/top_rated', pages: 3 },
      { ep: '/movie/now_playing', pages: 2 },
      { ep: '/movie/upcoming', pages: 2 },
    ];
    const allPromises = endpoints.flatMap(({ ep, pages }) =>
      Array.from({ length: pages }, (_, i) =>
        tmdbFetch<TMDBListResponse<TMDBMediaItem>>(ep, { page: String(i + 1) })
          .then(d => d.results || [])
          .catch(() => [] as TMDBMediaItem[])
      )
    );
    const allResults = await Promise.all(allPromises);
    const seen = new Set<number>();
    const unique = allResults
      .flat()
      .filter((r: TMDBMediaItem) => {
        if (!r.poster_path || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .map(r => tmdbToMedia({ ...r, media_type: 'movie' } as TMDBShow));
    return unique.slice(0, 100);
  } catch {
    return [];
  }
}

export default async function MoviesPage() {
  const shows = await getMoviesData();

  const moviesJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Movies',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Movies', item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(moviesJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Suspense>
        <BrowseClient initialShows={shows} />
      </Suspense>
    </>
  );
}