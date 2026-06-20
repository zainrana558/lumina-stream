import { tmdbFetch } from '@/lib/tmdb/server';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import type { TMDBShow } from '@/types';
import type { Metadata } from 'next';
import ReleaseCalendarClient from './ReleaseCalendarClient';

const siteUrl = CANONICAL_BASE;
const calendarUrl = `${siteUrl}/release-calendar`;

export const metadata: Metadata = {
  title: 'Release Calendar | Lumina Stream',
  description: 'Discover upcoming movie releases organized by month.',
  alternates: { canonical: calendarUrl },
  openGraph: {
    type: 'website',
    url: calendarUrl,
    title: 'Release Calendar | Lumina Stream',
    description: 'Discover upcoming movie releases organized by month.',
    siteName: 'Lumina Stream',
  },
};

export const revalidate = 3600;

interface UpcomingMovie {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  overview: string;
  vote_average: number;
  genre_ids: number[];
  popularity: number;
}

export default async function ReleaseCalendarPage() {
  let grouped: Record<string, UpcomingMovie[]> = {};
  let sortedMonths: string[] = [];
  let error = false;

  try {
    const data = await tmdbFetch<{ results: UpcomingMovie[] }>('/movie/upcoming', { region: 'US' });
    const movies = (data.results || []).filter(m => m.poster_path && m.release_date);

    for (const movie of movies) {
      const date = new Date(movie.release_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(movie);
    }
    sortedMonths = Object.keys(grouped).sort();
  } catch {
    error = true;
  }

  if (error) {
    const errBreadcrumbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Release Calendar', item: calendarUrl },
      ],
    };
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(errBreadcrumbJsonLd) }} />
        <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div style={{ padding: '2.2rem clamp(1rem,5vw,3rem) 0', position: 'relative', zIndex: 3 }}>
          <h1 className="sec" style={{ fontSize: 'clamp(1.3rem,3vw,2rem)', marginBottom: '.5rem' }}>📅 Release Calendar</h1>
          <p className="f-crimson" style={{  color: 'rgba(255,245,232,.45)', fontSize: '1rem' }}>Upcoming movie releases</p>
        </div>
        <div className="f-cinzel" style={{ padding: '3rem clamp(1rem,5vw,3rem)', textAlign: 'center', color: 'rgba(255,245,232,.35)',  fontSize: '.9rem' }}>
          Unable to load upcoming releases. Please try again later.
        </div>
      </div>
      </>
    );
  }

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Release Calendar',
    description: metadata.description,
    url: calendarUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Release Calendar', item: calendarUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <ReleaseCalendarClient grouped={grouped} sortedMonths={sortedMonths} />
    </>
  );
}
