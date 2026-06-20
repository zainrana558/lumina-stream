import { Suspense } from 'react';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';
import BrowseClient from '@/components/pages/BrowseClient';

export const revalidate = 300;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/tv-shows`;

export const metadata: Metadata = {
  title: 'TV Shows - Watch Free TV Series Online | Lumina Stream',
  description:
    'Binge-watch the best TV shows online for free. Discover trending series, popular dramas, hit comedies, and must-see TV on Lumina Stream.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'TV Shows - Watch Free TV Series Online | Lumina Stream',
    description: 'Stream the best TV shows online for free. Drama, comedy, thriller, and more.',
    siteName: 'Lumina Stream',
    images: [{ url: `${siteUrl}/og/og-tv.png`, width: 1344, height: 768, alt: 'Lumina Stream TV Shows' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TV Shows - Watch Free TV Series Online | Lumina Stream',
    description: 'Binge-watch free TV shows on Lumina Stream.',
    images: [`${siteUrl}/og/og-tv.png`],
  },
};

async function getTVData() {
  try {
    const endpoints = [
      { ep: '/trending/tv/week', pages: 3 },
      { ep: '/tv/popular', pages: 3 },
      { ep: '/tv/top_rated', pages: 3 },
      { ep: '/tv/airing_today', pages: 2 },
      { ep: '/tv/on_the_air', pages: 2 },
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
      .map(r => tmdbToMedia({ ...r, media_type: 'tv' } as TMDBShow));
    return unique.slice(0, 100);
  } catch {
    return [];
  }
}

export default async function TVShowsPage() {
  const shows = await getTVData();

  const tvJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'TV Shows',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'TV Shows', item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(tvJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Suspense>
        <BrowseClient initialShows={shows} />
      </Suspense>
    </>
  );
}