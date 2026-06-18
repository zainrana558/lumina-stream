import { Suspense } from 'react';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';
import BrowseClient from '@/components/pages/BrowseClient';
import { notFound } from 'next/navigation';

export const revalidate = 86400;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-stream-omega.vercel.app';

const VALID_DECADES = ['2020s', '2010s', '2000s', '1990s', '1980s', '1970s'] as const;
type Decade = (typeof VALID_DECADES)[number];

const DECADE_META: Record<Decade, { startYear: number; endYear: number; title: string; description: string }> = {
  '2020s': {
    startYear: 2020, endYear: 2029,
    title: '2020s Movies & TV Shows',
    description: 'Explore the best movies and TV shows from the 2020s. From pandemic-era streaming hits to blockbuster franchise films and the rise of limited series, discover the defining content of the current decade.',
  },
  '2010s': {
    startYear: 2010, endYear: 2019,
    title: '2010s Movies & TV Shows',
    description: 'Relive the golden age of streaming. The 2010s brought us the Marvel Cinematic Universe at its peak, the prestige TV revolution, groundbreaking animation, and the birth of binge-watching culture.',
  },
  '2000s': {
    startYear: 2000, endYear: 2009,
    title: '2000s Movies & TV Shows',
    description: 'Rediscover the iconic content of the 2000s. From the Lord of the Rings trilogy and early superhero films to the reality TV boom and the dawn of digital streaming.',
  },
  '1990s': {
    startYear: 1990, endYear: 1999,
    title: '1990s Movies & TV Shows',
    description: 'Travel back to the 1990s. Experience the era of Tarantino, the Disney Renaissance, the birth of The Simpsons as a cultural phenomenon, and indie film breakthroughs.',
  },
  '1980s': {
    startYear: 1980, endYear: 1989,
    title: '1980s Movies & TV Shows',
    description: 'Explore the iconic 1980s. From John Hughes teen films and Schwarzenegger action classics to the rise of music videos, neon aesthetics, and the birth of the blockbuster franchise.',
  },
  '1970s': {
    startYear: 1970, endYear: 1979,
    title: '1970s Movies & TV Shows',
    description: 'Discover the New Hollywood era. The 1970s gave us The Godfather, Star Wars, Jaws, and a revolution in filmmaking that changed cinema forever.',
  },
};

export function generateStaticParams() {
  return VALID_DECADES.map(decade => ({ decade }));
}

export async function generateMetadata({ params }: { params: Promise<{ decade: string }> }): Promise<Metadata> {
  const { decade } = await params;
  const meta = DECADE_META[decade as Decade];
  if (!meta) return { title: 'Decade Not Found' };

  const pageUrl = `${siteUrl}/decade/${decade}`;
  return {
    title: `${meta.title} - Watch Free Online | Lumina Stream`,
    description: meta.description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'website', url: pageUrl,
      title: `${meta.title} | Lumina Stream`,
      description: meta.description,
      siteName: 'Lumina Stream',
    },
    twitter: { card: 'summary_large_image', title: `${meta.title} | Lumina Stream`, description: meta.description },
  };
}

async function getDecadeData(decade: Decade) {
  const meta = DECADE_META[decade];
  try {
    const [movies, tv] = await Promise.all([
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/discover/movie', {
        sort_by: 'popularity.desc',
        'primary_release_date.gte': `${meta.startYear}-01-01`,
        'primary_release_date.lte': `${meta.endYear}-12-31`,
        'vote_count.gte': '100',
      }).then(d => d.results || []).catch(() => [] as TMDBMediaItem[]),
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/discover/tv', {
        sort_by: 'popularity.desc',
        'first_air_date.gte': `${meta.startYear}-01-01`,
        'first_air_date.lte': `${meta.endYear}-12-31`,
        'vote_count.gte': '100',
      }).then(d => d.results || []).catch(() => [] as TMDBMediaItem[]),
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/discover/movie', {
        sort_by: 'vote_average.desc',
        'primary_release_date.gte': `${meta.startYear}-01-01`,
        'primary_release_date.lte': `${meta.endYear}-12-31`,
        'vote_count.gte': '500',
      }).then(d => d.results || []).catch(() => [] as TMDBMediaItem[]),
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/discover/tv', {
        sort_by: 'vote_average.desc',
        'first_air_date.gte': `${meta.startYear}-01-01`,
        'first_air_date.lte': `${meta.endYear}-12-31`,
        'vote_count.gte': '500',
      }).then(d => d.results || []).catch(() => [] as TMDBMediaItem[]),
    ]);

    const seen = new Set<number>();
    const unique = [...movies, ...tv, ...movies, ...tv]
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

export default async function DecadePage({ params }: { params: Promise<{ decade: string }> }) {
  const { decade } = await params;
  const meta = DECADE_META[decade as Decade];
  if (!meta) notFound();

  const shows = await getDecadeData(decade as Decade);
  const pageUrl = `${siteUrl}/decade/${decade}`;

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: meta.title,
    description: meta.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: meta.title, item: pageUrl },
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