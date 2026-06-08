import { tmdbFetch } from '@/lib/tmdb/server';
import BrowseClient from '@/components/pages/BrowseClient';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';

export const revalidate = 300; // 5 min — browse catalog changes slowly

export const metadata: Metadata = {
  title: 'Browse - Movies & TV Shows',
  description: 'Browse the full catalog of movies and TV shows. Discover trending, popular, top-rated, and newly released content.',
  openGraph: {
    title: 'Browse - Movies & TV Shows | Lumina Stream',
    description: 'Browse the full catalog of movies and TV shows on Lumina Stream.',
  },
};

// Fetch multiple pages in parallel for richer initial load
async function getBrowseData() {
  try {
    const [trending, popular, tvPopular, topRated, nowPlaying] = await Promise.all([
      tmdbFetch<{ results?: TMDBShow[] }>('/trending/all/week').catch(() => ({ results: [] })),
      tmdbFetch<{ results?: TMDBShow[] }>('/movie/popular').catch(() => ({ results: [] })),
      tmdbFetch<{ results?: TMDBShow[] }>('/tv/popular').catch(() => ({ results: [] })),
      tmdbFetch<{ results?: TMDBShow[] }>('/movie/top_rated').catch(() => ({ results: [] })),
      tmdbFetch<{ results?: TMDBShow[] }>('/movie/now_playing').catch(() => ({ results: [] })),
    ]);

    // Merge and deduplicate by ID
    const allResults = [
      ...(trending.results || []).map(r => ({ ...r, media_type: (r.media_type || 'movie') as 'movie' | 'tv' })),
      ...(popular.results || []).map(r => ({ ...r, media_type: 'movie' as const })),
      ...(tvPopular.results || []).map(r => ({ ...r, media_type: 'tv' as const })),
      ...(topRated.results || []).map(r => ({ ...r, media_type: (r.media_type || 'movie') as 'movie' | 'tv' })),
      ...(nowPlaying.results || []).map(r => ({ ...r, media_type: 'movie' as const })),
    ];

    // Deduplicate by ID, keeping first occurrence (trending priority)
    const seen = new Set<number>();
    const unique = allResults.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    return unique.slice(0, 80).map(r => tmdbToMedia(r));
  } catch {
    return [];
  }
}

export default async function BrowsePage() {
  const shows = await getBrowseData();
  return <BrowseClient initialShows={shows} />;
}
