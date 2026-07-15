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
  title: 'Free Movie Streaming Guides & Reviews — Lumovia Blog',
  description: 'Discover where to watch movies and TV shows online free. Streaming guides, reviews, and recommendations updated weekly.',
  alternates: { canonical: `${CANONICAL_BASE}/blog` },
  openGraph: {
    type: 'website',
    title: 'Free Movie Streaming Guides — Lumovia Blog',
    description: 'Discover where to watch movies and TV shows online free.',
    url: `${CANONICAL_BASE}/blog`,
    siteName: 'Lumovia',
    images: [{ url: `${CANONICAL_BASE}/og/og-genres.png`, width: 1344, height: 768, alt: 'Lumovia Blog' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Free Movie Streaming Guides — Lumovia Blog',
    description: 'Discover where to watch movies and TV shows online free. Streaming guides, reviews, and recommendations.',
    images: [`${CANONICAL_BASE}/og/og-genres.png`],
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
        <p style={{ color: 'rgba(255,245,232,.5)', fontSize: '.9rem', maxWidth: 700, margin: '0 auto', lineHeight: 1.7 }}>
          Your ultimate guide to discovering what to watch next. Each guide provides detailed information about movies and TV shows including plot summaries, cast and crew details, ratings from millions of users on TMDB and AniList, episode guides for TV series, and curated recommendations. Whether you are looking for the latest blockbusters, trending anime, classic horror films, or hidden gem dramas, our blog covers it all. Updated multiple times per hour with the freshest content from The Movie Database and AniList.
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

        {/* Explore More — internal links for crawl density */}
        <div style={{ marginTop: 56, borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 40 }}>
          <h2 style={{ fontSize: 'clamp(1rem, 1.5vw, 1.2rem)', color: '#FFF5E8', marginBottom: 20, fontWeight: 600 }}>
            Explore Lumovia
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {[
              { label: 'Browse All', href: '/browse' },
              { label: 'Movies', href: '/movies' },
              { label: 'TV Shows', href: '/tv-shows' },
              { label: 'Anime', href: '/genre/anime' },
              { label: 'Horror', href: '/genre/horror' },
              { label: 'Romance', href: '/genre/romance' },
              { label: 'Top Rated', href: '/top-rated' },
              { label: 'New Releases', href: '/new-releases' },
              { label: 'All Genres', href: '/genres' },
              { label: 'About', href: '/about' },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  display: 'inline-block', padding: '6px 14px', borderRadius: 8,
                  fontSize: '.8rem', color: '#FFB347', textDecoration: 'none',
                  background: 'rgba(255,245,232,.04)', border: '1px solid rgba(255,245,232,.08)',
                  transition: 'background .2s, border-color .2s',
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is Lumovia?',
            acceptedAnswer: { '@type': 'Answer', text: 'Lumovia is a free streaming catalog that lets you discover and explore movies, TV shows, anime, and cartoons. We aggregate data from TMDB and AniList to provide detailed information including ratings, cast, trailers, and episode guides for thousands of titles.' },
          },
          {
            '@type': 'Question',
            name: 'Is Lumovia really free?',
            acceptedAnswer: { '@type': 'Answer', text: 'Yes, Lumovia is completely free to use. No subscription, no credit card, no sign-up required to browse and discover content. Our platform is supported by our community of entertainment enthusiasts.' },
          },
          {
            '@type': 'Question',
            name: 'How often is the content updated?',
            acceptedAnswer: { '@type': 'Answer', text: 'Our catalog is updated multiple times per hour. Trending content refreshes every few minutes, and new releases are added as soon as they become available on TMDB and AniList.' },
          },
        ],
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: CANONICAL_BASE },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${CANONICAL_BASE}/blog` },
        ],
      }) }} />
    </div>
  );
}
