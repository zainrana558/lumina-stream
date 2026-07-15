import { Suspense } from 'react';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';
import BrowseClient from '@/components/pages/BrowseClient';

export const revalidate = 300;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/coming-soon`;

export const metadata: Metadata = {
  title: 'Coming Soon - Upcoming Movies & Release Dates',
  description:
    'Browse upcoming movies and their release dates. See what films are hitting theaters and streaming soon, sorted by release date on Lumovia.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Coming Soon - Upcoming Movies & Release Dates | Lumovia',
    description: 'Discover upcoming movie releases and their dates on Lumovia.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-coming-soon.png`, width: 1344, height: 768, alt: 'Coming Soon on Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coming Soon - Upcoming Movies & Release Dates | Lumovia',
    description: 'See upcoming movie releases on Lumovia.',
    images: [`${siteUrl}/og/og-coming-soon.png`],
  },
};

async function getComingSoonData() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const allPromises = Array.from({ length: 5 }, (_, i) =>
      tmdbFetch<TMDBListResponse<TMDBMediaItem>>('/movie/upcoming', { page: String(i + 1) })
        .then(d => d.results || [])
        .catch(() => [] as TMDBMediaItem[])
    );
    const allResults = await Promise.all(allPromises);
    const unique = allResults
      .flat()
      .filter((r: TMDBMediaItem) => {
        if (!r.poster_path || !r.release_date || r.release_date < today) return false;
        return true;
      })
      .sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''))
      .map(r => tmdbToMedia({ ...r, media_type: 'movie' } as TMDBShow));
    return unique.slice(0, 100);
  } catch {
    return [];
  }
}

export default async function ComingSoonPage() {
  const shows = await getComingSoonData();

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Coming Soon',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Coming Soon', item: pageUrl },
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
          { '@type': 'Question', name: 'What does Coming Soon mean on Lumovia?', acceptedAnswer: { '@type': 'Answer', text: 'The Coming Soon page lists movies that have been announced with a confirmed future release date. Only titles with a release date set to today or later are shown, ensuring you see genuinely upcoming films rather than titles already in theaters.' } },
          { '@type': 'Question', name: 'How are the upcoming movies sorted?', acceptedAnswer: { '@type': 'Answer', text: 'All movies on the Coming Soon page are sorted by release date in ascending order, so the films releasing soonest appear first. This makes it easy to plan your viewing schedule and see what is arriving in the near future.' } },
          { '@type': 'Question', name: 'How often is the Coming Soon page updated?', acceptedAnswer: { '@type': 'Answer', text: 'The Coming Soon page revalidates every five minutes, pulling the latest upcoming movie data from TMDB. New titles and updated release dates appear automatically as studios finalize their schedules and TMDB processes the changes.' } },
        ],
      }) }} />
      <Suspense>
        <BrowseClient initialShows={shows} />
      </Suspense>
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8', marginBottom: 12, letterSpacing: '.02em' }}>Your Guide to Upcoming Movie Releases</h1>
        <p className="f-crimson" style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, maxWidth: 800 }}>
          The Coming Soon page is your definitive guide to every movie on the horizon. It pulls five pages of upcoming titles from TMDB and filters them to show only films with confirmed future release dates and available poster art. Each title is sorted by release date in ascending order, so the movies arriving soonest always appear at the top. Whether you are counting down to the next Marvel installment, anticipating an auteur director's latest project, or simply want to browse what Hollywood has lined up for the months ahead, this page keeps you informed. Updated every five minutes, the Coming Soon page automatically refreshes as studios lock in new dates and TMDB ingests the latest scheduling data, ensuring you never miss a premiere.
        </p>
      </section>
    </>
  );
}