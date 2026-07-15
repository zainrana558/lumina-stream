import { Suspense } from 'react';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';
import BrowseClient from '@/components/pages/BrowseClient';

export const revalidate = 300;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/trending`;

export const metadata: Metadata = {
  title: 'Trending - Most Popular Movies & TV Shows Right Now',
  description:
    'Discover what the world is watching right now. Trending movies and TV shows updated daily and weekly, ranked by popularity on Lumovia.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Trending - Most Popular Movies & TV Shows Right Now | Lumovia',
    description: 'Explore the most popular movies and TV shows trending right now on Lumovia.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-trending.png`, width: 1344, height: 768, alt: 'Trending on Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trending - Most Popular Movies & TV Shows Right Now | Lumovia',
    description: 'See what\'s trending on Lumovia.',
    images: [`${siteUrl}/og/og-trending.png`],
  },
};

async function getTrendingData() {
  try {
    const endpoints = [
      { ep: '/trending/all/day', pages: 3 },
      { ep: '/trending/all/week', pages: 3 },
      { ep: '/trending/movie/week', pages: 2 },
      { ep: '/trending/tv/week', pages: 2 },
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

export default async function TrendingPage() {
  const shows = await getTrendingData();

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Trending',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Trending', item: pageUrl },
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
          { '@type': 'Question', name: 'How does Lumovia determine what is trending?', acceptedAnswer: { '@type': 'Answer', text: 'Lumovia pulls real-time trending data from TMDB across daily and weekly time windows for movies, TV shows, and all media types combined. Items are ranked by popularity score, which reflects global viewer engagement and search activity on TMDB.' } },
          { '@type': 'Question', name: 'How often is the Trending page updated?', acceptedAnswer: { '@type': 'Answer', text: 'The Trending page revalidates every five minutes, fetching the latest data from TMDB. Daily trending lists reflect the last 24 hours of activity, while weekly lists capture the past seven days of global engagement.' } },
          { '@type': 'Question', name: 'What is the difference between daily and weekly trending?', acceptedAnswer: { '@type': 'Answer', text: 'Daily trending shows the most popular movies and TV shows over the last 24 hours, capturing sudden spikes in interest. Weekly trending measures popularity over the past seven days, surfacing titles with sustained global attention. The Trending page combines both for a comprehensive view.' } },
        ],
      }) }} />
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8', marginBottom: 12, letterSpacing: '.02em' }}>Discover What the World Is Watching Right Now</h1>
        <p className="f-crimson" style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, maxWidth: 800 }}>
          The Trending page is your pulse on global entertainment. By aggregating data from four separate TMDB trending endpoints — daily and weekly rankings for all media, movies only, and TV shows only — this page delivers a comprehensive snapshot of what audiences everywhere are engaging with right now. Every item is ranked by popularity score and deduplicated so you never see the same title twice. Whether a blockbuster just dropped its first trailer, a limited series is generating awards buzz, or a sleeper indie film is going viral, you will find it here first. Updated every five minutes with fresh TMDB data, the Trending page ensures you are always in sync with the latest waves of viewer interest across movies and television worldwide.
        </p>
      </section>
      <Suspense>
        <BrowseClient initialShows={shows} />
      </Suspense>
    </>
  );
}