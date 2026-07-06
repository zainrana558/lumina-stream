/**
 * Blog Index — Lists all SEO blog posts
 * Each post targets a specific movie/TV show for search traffic.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { tmdbFetchRaw } from '@/lib/tmdb/server';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Free Movie Streaming Guides & Reviews — Lumina Stream Blog',
  description: 'Discover where to watch movies and TV shows online free. Streaming guides, reviews, and recommendations updated weekly.',
  alternates: { canonical: `${CANONICAL_BASE}/blog` },
  openGraph: {
    title: 'Free Movie Streaming Guides — Lumina Stream Blog',
    description: 'Discover where to watch movies and TV shows online free.',
    url: `${CANONICAL_BASE}/blog`,
    siteName: 'Lumina Stream',
  },
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function getPopularShows() {
  try {
    const [movies, tv] = await Promise.all([
      tmdbFetchRaw<{ results: Array<{ id: number; title?: string; name?: string; overview: string; poster_path: string | null; vote_average: number; release_date?: string; first_air_date?: string }> }>('/movie/popular'),
      tmdbFetchRaw<{ results: Array<{ id: number; title?: string; name?: string; overview: string; poster_path: string | null; vote_average: number; release_date?: string; first_air_date?: string }> }>('/tv/popular'),
    ]);
    return [
      ...(movies?.results || []).slice(0, 30).map((m: any) => ({ ...m, type: 'movie' })),
      ...(tv?.results || []).slice(0, 20).map((t: any) => ({ ...t, type: 'tv' })),
    ];
  } catch {
    return [];
  }
}

export default async function BlogIndexPage() {
  const shows = await getPopularShows();

  return (
    <div style={{
      maxWidth: 900,
      margin: '0 auto',
      padding: 'clamp(1rem, 5vw, 2rem)',
      paddingTop: 80,
      paddingBottom: 120,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{
          fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
          color: '#FFF5E8',
          fontWeight: 700,
          marginBottom: 8,
        }}>
          Free Movie & TV Show Streaming Guides
        </h1>
        <p style={{ color: 'rgba(255,245,232,.5)', fontSize: '.9rem', maxWidth: 600, margin: '0 auto' }}>
          Find out where to watch your favorite movies and shows online — 100% free, no sign-up. Updated weekly with the latest titles.
        </p>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: 20,
      }}>
        {shows.map((show: any) => {
          const title = show.title || show.name || 'Movie';
          const slug = slugify(title);
          const year = (show.release_date || show.first_air_date || '').slice(0, 4);
          const poster = show.poster_path
            ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
            : null;

          return (
            <Link
              key={show.id}
              href={`/blog/${slug}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                borderRadius: 12,
                overflow: 'hidden',
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.06)',
                transition: 'transform .2s, border-color .2s',
              }}
            >
              <div style={{
                height: 200,
                background: poster
                  ? `url(${poster}) center/cover`
                  : 'linear-gradient(135deg, #1a1030, #2a1a40)',
              }} />
              <div style={{ padding: 14 }}>
                <div style={{
                  fontSize: '.6rem',
                  color: '#FFB347',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  marginBottom: 4,
                }}>
                  {show.type === 'tv' ? 'TV Series' : 'Movie'} · ⭐ {show.vote_average?.toFixed(1) || 'N/A'}
                </div>
                <h3 style={{
                  fontSize: '.85rem',
                  color: '#FFF5E8',
                  margin: '4px 0',
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}>
                  Watch {title} Online Free{year ? ` (${year})` : ''}
                </h3>
                <p style={{
                  fontSize: '.7rem',
                  color: 'rgba(255,245,232,.35)',
                  margin: '6px 0 0',
                  lineHeight: 1.4,
                }}>
                  {(show.overview || '').slice(0, 100)}
                  {(show.overview || '').length > 100 ? '...' : ''}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
