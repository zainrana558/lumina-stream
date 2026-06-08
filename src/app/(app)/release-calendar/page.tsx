import { tmdbFetch } from '@/lib/tmdb/server';
import type { TMDBShow } from '@/types';
import type { Metadata } from 'next';
import ReleaseCalendarClient from './ReleaseCalendarClient';

export const metadata: Metadata = {
  title: 'Release Calendar | Lumina Stream',
  description: 'Discover upcoming movie releases organized by month.',
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
    return (
      <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div style={{ padding: '2.2rem clamp(1rem,5vw,3rem) 0', position: 'relative', zIndex: 3 }}>
          <h1 className="sec" style={{ fontSize: 'clamp(1.3rem,3vw,2rem)', marginBottom: '.5rem' }}>📅 Release Calendar</h1>
          <p style={{ fontFamily: "'Crimson Pro',serif", color: 'rgba(255,245,232,.45)', fontSize: '1rem' }}>Upcoming movie releases</p>
        </div>
        <div style={{ padding: '3rem clamp(1rem,5vw,3rem)', textAlign: 'center', color: 'rgba(255,245,232,.35)', fontFamily: "'Cinzel',serif", fontSize: '.9rem' }}>
          Unable to load upcoming releases. Please try again later.
        </div>
      </div>
    );
  }

  return <ReleaseCalendarClient grouped={grouped} sortedMonths={sortedMonths} />;
}
