import { fetchGenreMovies } from '@/lib/tmdb';
import { tmdbToMedia } from '@/types';
import type { MediaItem, TMDBShow } from '@/types';
import { GENRE_IDS } from '@/styles/themes';
import ClientBrowse from './ClientBrowse';

export const revalidate = 300;

export default async function BrowsePage() {
  const TMDB = 'https://api.themoviedb.org/3';
  const key = process.env.TMDB_API_KEY || '';

  async function fetchAll() {
    const genres = [28, 16, 35, 18, 27, 878, 10749, 14, 53, 9648];
    const results = await Promise.all(
      genres.map(async (gid) => {
        try {
          const url = new URL(`${TMDB}/discover/movie`);
          url.searchParams.set('api_key', key);
          url.searchParams.set('with_genres', String(gid));
          url.searchParams.set('sort_by', 'popularity.desc');
          url.searchParams.set('page', '1');
          const res = await fetch(url.toString(), { next: { revalidate: 300 } });
          if (!res.ok) return { genreId: gid, items: [] };
          const data = await res.json();
          return { genreId: gid, items: (data.results || []).filter((r: TMDBShow) => r.poster_path).slice(0, 10).map((r: TMDBShow) => tmdbToMedia(r)) };
        } catch { return { genreId: gid, items: [] }; }
      })
    );
    return results;
  }

  const genreResults = await fetchAll();
  const genreNames: Record<number, string> = { 28: 'Action', 16: 'Animation', 35: 'Comedy', 18: 'Drama', 27: 'Horror', 878: 'Sci-Fi', 10749: 'Romance', 14: 'Fantasy', 53: 'Thriller', 9648: 'Mystery' };

  const sections = genreResults.map(r => ({
    title: genreNames[r.genreId] || 'Unknown',
    items: r.items,
    genreId: r.genreId,
  }));

  return <ClientBrowse sections={sections} />;
}
