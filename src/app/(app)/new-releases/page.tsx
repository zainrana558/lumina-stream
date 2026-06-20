import { Suspense } from 'react';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';
import BrowseClient from '@/components/pages/BrowseClient';

export const revalidate = 300;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/new-releases`;

export const metadata: Metadata = {
  title: 'New Releases - Latest Movies & TV Shows',
  description:
    'Stay up to date with the latest movie and TV show releases. Watch brand new films, recently aired episodes, and upcoming content on Lumina Stream.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'New Releases - Latest Movies & TV Shows | Lumina Stream',
    description: 'Watch the latest movies and TV show releases on Lumina Stream.',
    siteName: 'Lumina Stream',
    images: [{ url: `${siteUrl}/og/og-new-releases.png`, width: 1344, height: 768, alt: 'New Releases on Lumina Stream' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'New Releases - Latest Movies & TV Shows | Lumina Stream',
    description: 'Stream the latest releases on Lumina Stream.',
    images: [`${siteUrl}/og/og-new-releases.png`],
  },
};

async function getNewReleasesData() {
  try {
    const endpoints = [
      { ep: '/movie/now_playing', pages: 3 },
      { ep: '/movie/upcoming', pages: 3 },
      { ep: '/tv/airing_today', pages: 2 },
      { ep: '/tv/on_the_air', pages: 3 },
      { ep: '/trending/all/day', pages: 2 },
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
      .sort((a, b) => b.popularity - a.popularity)
      .map(r => tmdbToMedia({ ...r, media_type: (r.media_type || 'movie') as 'movie' | 'tv' } as TMDBShow));
    return unique.slice(0, 100);
  } catch {
    return [];
  }
}

export default async function NewReleasesPage() {
  const shows = await getNewReleasesData();

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'New Releases',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'New Releases', item: pageUrl },
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