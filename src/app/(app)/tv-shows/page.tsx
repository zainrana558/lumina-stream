import { Suspense } from 'react';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';
import BrowseClient from '@/components/pages/BrowseClient';

export const dynamic = 'force-static';
export const revalidate = 300;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/tv-shows`;

export const metadata: Metadata = {
  title: 'TV Shows - Watch Free TV Series Online',
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
      <header style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 20px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8', marginBottom: 12, letterSpacing: '.02em' }}>TV Shows</h1>
        <p className="f-crimson" style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, maxWidth: 800 }}>
          Binge-watch the best television series online. Our TV catalog covers everything from prestige dramas and gripping crime thrillers to laugh-out-loud comedies, mind-bending sci-fi, and beloved anime. Discover trending shows currently on the air, classic series that defined their decade, and hidden gems recommended by millions of viewers on TMDB. New episodes and complete seasons are added regularly so you never run out of things to watch. This page aggregates data from multiple TMDB endpoints — currently airing, on the air, popular, trending, and top-rated — to give you a single comprehensive view of the best television available. Whether you want to start a long-running series from the beginning, catch up on a show everyone is talking about, or revisit an old favorite, our TV hub makes it easy. Sort by popularity, rating, or newest arrival and dive straight into the episode guide for any show that catches your eye.
        </p>
      </header>
      <Suspense>
        <BrowseClient initialShows={shows} />
      </Suspense>
    </>
  );
}