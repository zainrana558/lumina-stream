import { tmdbFetch } from '@/lib/tmdb/server';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import type { TMDBShow } from '@/types';
import type { Metadata } from 'next';
import ReleaseCalendarClient from './ReleaseCalendarClient';

const siteUrl = CANONICAL_BASE;
const calendarUrl = `${siteUrl}/release-calendar`;

export const metadata: Metadata = {
  title: 'Release Calendar - Upcoming Movie Releases by Month',
  description:
    'Plan your movie nights with the Lumovia release calendar. Browse upcoming theatrical and streaming premieres organized by month, with posters, release dates, and ratings for every film. Covers the next several months of scheduled releases from all major studios, updated automatically as new dates are announced.',
  alternates: { canonical: calendarUrl },
  openGraph: {
    type: 'website',
    url: calendarUrl,
    title: 'Release Calendar - Upcoming Movie Releases | Lumovia',
    description:
      'Plan your movie nights with the Lumovia release calendar. Browse upcoming theatrical and streaming premieres organized by month.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-new-releases.png`, width: 1344, height: 768, alt: 'Release Calendar on Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Release Calendar - Upcoming Movie Releases | Lumovia',
    description:
      'Browse upcoming movie releases organized by month on Lumovia.',
    images: [`${siteUrl}/og/og-new-releases.png`],
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
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'What is the Lumovia Release Calendar?', acceptedAnswer: { '@type': 'Answer', text: 'The Release Calendar organizes all upcoming movie releases by month, pulling real-time premiere dates from TMDB. It covers the next several months of scheduled theatrical and streaming premieres, with new dates added automatically as studios announce them.' } },
          { '@type': 'Question', name: 'How far in advance are release dates listed?', acceptedAnswer: { '@type': 'Answer', text: 'The Release Calendar shows upcoming movies as far out as TMDB has data, typically covering several months of future releases. Each entry includes the title, poster, release date, and rating to help you plan your watchlist.' } },
          { '@type': 'Question', name: 'Are release dates accurate?', acceptedAnswer: { '@type': 'Answer', text: 'Release dates come directly from TMDB, which aggregates studio announcements and theater listings. Dates may shift as studios adjust schedules, but the calendar updates automatically to reflect the latest information available.' } },
        ],
      }) }} />
      <ReleaseCalendarClient grouped={grouped} sortedMonths={sortedMonths} />
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px 60px' }}>
        <h2 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8', marginBottom: 12, letterSpacing: '.02em' }}>Plan Your Movie Nights</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, maxWidth: 800 }}>
          Plan your watchlist with our monthly release calendar. This page organizes all upcoming movie releases by month, pulling real-time premiere dates from TMDB. Browse upcoming blockbusters, indie releases, and limited-edition screenings so you never miss a new film. Each entry includes the movie title, poster, release date, and rating, making it easy to decide what to watch in theaters or stream online when it becomes available. The calendar covers the next several months of scheduled theatrical and streaming premieres, with new dates added automatically as studios announce them. Whether you are a casual moviegoer looking for weekend plans or a dedicated cinephile tracking every release, this page gives you a clear timeline of what is coming and when. Click on any movie above to see its full details page with cast, crew, trailers, and related titles.
        </p>
      </section>
    </>
  );
}
