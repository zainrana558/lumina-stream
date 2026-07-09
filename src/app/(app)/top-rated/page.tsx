import { Suspense } from 'react';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';
import BrowseClient from '@/components/pages/BrowseClient';

export const revalidate = 600;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/top-rated`;

export const metadata: Metadata = {
  title: 'Top Rated Movies & TV Shows - Highest Rated Content',
  description:
    'Discover the highest-rated movies and TV shows of all time. Handpicked from thousands of critically acclaimed titles rated by millions of viewers on Lumina Stream.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Top Rated Movies & TV Shows | Lumina Stream',
    description: 'Explore the highest-rated movies and TV shows of all time.',
    siteName: 'Lumina Stream',
    images: [{ url: `${siteUrl}/og/og-top-rated.png`, width: 1344, height: 768, alt: 'Top Rated on Lumina Stream' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Top Rated Movies & TV Shows | Lumina Stream',
    description: 'Discover the highest-rated content on Lumina Stream.',
    images: [`${siteUrl}/og/og-top-rated.png`],
  },
};

async function getTopRatedData() {
  try {
    const [movies, tv] = await Promise.all([
      Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/movie/top_rated', { page: String(i + 1), 'vote_count.gte': '500' })
            .then(d => d.results || [])
            .catch(() => [] as TMDBMediaItem[])
        )
      ),
      Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/tv/top_rated', { page: String(i + 1), 'vote_count.gte': '500' })
            .then(d => d.results || [])
            .catch(() => [] as TMDBMediaItem[])
        )
      ),
    ]);

    const seen = new Set<number>();
    const all = [...movies.flat(), ...tv.flat()]
      .filter((r: TMDBMediaItem) => {
        if (!r.poster_path || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .sort((a, b) => b.vote_average - a.vote_average)
      .map(r => tmdbToMedia({ ...r, media_type: (r.media_type || 'movie') as 'movie' | 'tv' } as TMDBShow));
    return all.slice(0, 100);
  } catch {
    return [];
  }
}

export default async function TopRatedPage() {
  const shows = await getTopRatedData();

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Top Rated',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Top Rated', item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <header style={{ maxWidth: 1200, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 20px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8', marginBottom: 12, letterSpacing: '.02em' }}>Top Rated</h1>
        <p className="f-crimson" style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, maxWidth: 800 }}>
          These are the highest-rated movies and TV shows of all time, ranked by audience scores from millions of viewers on TMDB. Every title on this page has earned exceptional ratings and widespread critical acclaim, making it the perfect starting point when you want to watch something truly great. From cinematic masterpieces like The Shawshank Redemption and The Godfather to modern TV landmarks like Breaking Bad and Chernobyl, this collection represents the very best that film and television have to offer. We pull data from both the top-rated movies and top-rated TV endpoints with a minimum of 500 votes to ensure only well-established, widely appreciated titles appear here. Whether you are a film buff looking to check off every AFI top-100 title or a casual viewer who simply wants a guaranteed good night of entertainment, the Top Rated page is your most reliable filter. Browse by rating, discover hidden classics you may have missed, and find your next all-time favorite.
        </p>
      </header>
      <Suspense>
        <BrowseClient initialShows={shows} />
      </Suspense>
    </>
  );
}