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
    'Discover the highest-rated movies and TV shows of all time. Handpicked from thousands of critically acclaimed titles rated by millions of viewers on Lumovia.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Top Rated Movies & TV Shows | Lumovia',
    description: 'Explore the highest-rated movies and TV shows of all time.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-top-rated.png`, width: 1344, height: 768, alt: 'Top Rated on Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Top Rated Movies & TV Shows | Lumovia',
    description: 'Discover the highest-rated content on Lumovia.',
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
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
          { '@type': 'Question', name: 'How are the top-rated movies and TV shows ranked?', acceptedAnswer: { '@type': 'Answer', text: 'Titles on the Top Rated page are ranked by audience scores from TMDB. We only include titles with a minimum of 500 user votes to ensure the ratings are reliable and representative of broad audience opinion.' } },
          { '@type': 'Question', name: 'What is the highest-rated movie of all time?', acceptedAnswer: { '@type': 'Answer', text: 'The highest-rated movies on TMDB include classics like The Shawshank Redemption, The Godfather, and The Dark Knight. Browse the Top Rated page to see the current rankings, which are updated automatically as new votes come in.' } },
          { '@type': 'Question', name: 'Does the Top Rated page include both movies and TV shows?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. The Top Rated page combines the highest-rated movies and TV shows from TMDB into a single list sorted by rating. You can use the genre and sort filters to focus on specific types of content.' } },
        ],
      }) }} />
      <Suspense>
        <BrowseClient initialShows={shows} />
      </Suspense>
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px 60px' }}>
        <h2 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8', marginBottom: 12, letterSpacing: '.02em' }}>The Highest-Rated Movies & TV Shows of All Time</h2>
        <p className="f-crimson" style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, maxWidth: 800 }}>
          These are the highest-rated movies and TV shows of all time, ranked by audience scores from millions of viewers on TMDB. Every title on this page has earned exceptional ratings and widespread critical acclaim, making it the perfect starting point when you want to watch something truly great. From cinematic masterpieces like The Shawshank Redemption and The Godfather to modern TV landmarks like Breaking Bad and Chernobyl, this collection represents the very best that film and television have to offer. We pull data from both the top-rated movies and top-rated TV endpoints with a minimum of 500 votes to ensure only well-established, widely appreciated titles appear here. Whether you are a film buff looking to check off every AFI top-100 title or a casual viewer who simply wants a guaranteed good night of entertainment, the Top Rated page is your most reliable filter. Browse by rating, discover hidden classics you may have missed, and find your next all-time favorite.
        </p>
      </section>
    </>
  );
}