import { Suspense } from 'react';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';
import BrowseClient from '@/components/pages/BrowseClient';
import { notFound } from 'next/navigation';

export const revalidate = 3600;

const siteUrl = CANONICAL_BASE;

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1970;
const MAX_YEAR = CURRENT_YEAR + 1;

export function generateStaticParams() {
  // Pre-generate current year + last 10 years
  const years: number[] = [];
  for (let y = CURRENT_YEAR + 1; y >= CURRENT_YEAR - 10; y--) {
    years.push(y);
  }
  return years.map(year => ({ year: String(year) }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < MIN_YEAR || year > MAX_YEAR) {
    return { title: 'Year Not Found' };
  }

  const pageUrl = `${siteUrl}/year/${year}`;
  const isFuture = year > CURRENT_YEAR;
  const title = isFuture
    ? `Upcoming ${year} Movies & TV Shows`
    : `${year} Movies & TV Shows`;
  const description = isFuture
    ? `Discover upcoming movies and TV shows releasing in ${year}. Get early previews, trailers, and release dates for the most anticipated content of ${year}.`
    : `Explore the best movies and TV shows from ${year}. Browse the highest-rated and most popular releases from ${year}, all available to discover on Lumina Stream.`;

  return {
    title: `${title} - Watch Free Online`,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website', url: pageUrl,
      title: `${title} | Lumina Stream`,
      description,
      siteName: 'Lumina Stream',
    },
    twitter: { card: 'summary_large_image', title: `${title} | Lumina Stream`, description },
  };
}

async function getYearData(year: number) {
  try {
    const [movies, tv, topMovies, topTv] = await Promise.all([
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/discover/movie', {
        sort_by: 'popularity.desc',
        'primary_release_date.gte': `${year}-01-01`,
        'primary_release_date.lte': `${year}-12-31`,
        'vote_count.gte': '30',
      }).then(d => d.results || []).catch(() => [] as TMDBMediaItem[]),
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/discover/tv', {
        sort_by: 'popularity.desc',
        'first_air_date.gte': `${year}-01-01`,
        'first_air_date.lte': `${year}-12-31`,
        'vote_count.gte': '30',
      }).then(d => d.results || []).catch(() => [] as TMDBMediaItem[]),
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/discover/movie', {
        sort_by: 'vote_average.desc',
        'primary_release_date.gte': `${year}-01-01`,
        'primary_release_date.lte': `${year}-12-31`,
        'vote_count.gte': '200',
      }).then(d => d.results || []).catch(() => [] as TMDBMediaItem[]),
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/discover/tv', {
        sort_by: 'vote_average.desc',
        'first_air_date.gte': `${year}-01-01`,
        'first_air_date.lte': `${year}-12-31`,
        'vote_count.gte': '200',
      }).then(d => d.results || []).catch(() => [] as TMDBMediaItem[]),
    ]);

    const seen = new Set<number>();
    const unique = [...movies, ...tv, ...topMovies, ...topTv]
      .filter((r: TMDBMediaItem) => {
        if (!r.poster_path || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .map(r => tmdbToMedia({ ...r, media_type: (r.media_type || 'movie') as 'movie' | 'tv' } as TMDBShow));
    return unique.slice(0, 100);
  } catch {
    return [];
  }
}

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);
  if (isNaN(year) || year < MIN_YEAR || year > MAX_YEAR) notFound();

  const shows = await getYearData(year);
  const pageUrl = `${siteUrl}/year/${year}`;
  const isFuture = year > CURRENT_YEAR;
  const pageTitle = isFuture ? `Upcoming ${year}` : `${year}`;

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${pageTitle} Movies & TV Shows`,
    description: `Browse the best movies and TV shows from ${year}.`,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: `${year}`, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <header style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 20px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8', marginBottom: 12, letterSpacing: '.02em' }}>{isFuture ? `Upcoming ${year}` : `${year}`}</h1>
        <p className="f-crimson" style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, maxWidth: 800 }}>
          {isFuture
            ? `Get a head start on ${year}. This page previews the most anticipated movies and TV shows scheduled for release throughout the year, from blockbuster franchise installments to promising indie films and new series pickups. Check back regularly as release dates are updated.`
            : `Relive the best of ${year}. This page curates the most popular and highest-rated movies and TV shows released in ${year}, pulling data from TMDB to surface both crowd-pleasing hits and critically acclaimed titles that defined the year in entertainment.`
          }
        </p>
      </header>
      <Suspense>
        <BrowseClient initialShows={shows} />
      </Suspense>
    </>
  );
}