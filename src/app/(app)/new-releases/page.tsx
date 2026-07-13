import { Suspense } from 'react';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, type TMDBListResponse, type TMDBMediaItem } from '@/lib/tmdb/server';
import type { TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import type { Metadata } from 'next';
import BrowseClient from '@/components/pages/BrowseClient';

export const revalidate = 300;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/new-releases`;

export const metadata: Metadata = {
  title: 'New Releases - Latest Movies & TV Shows',
  description:
    'Stay up to date with the latest movie and TV show releases. Watch brand new films, recently aired episodes, and upcoming content on Lumovia.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'New Releases - Latest Movies & TV Shows | Lumovia',
    description: 'Watch the latest movies and TV show releases on Lumovia.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-new-releases.png`, width: 1344, height: 768, alt: 'New Releases on Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'New Releases - Latest Movies & TV Shows | Lumovia',
    description: 'Stream the latest releases on Lumovia.',
    images: [`${siteUrl}/og/og-new-releases.png`],
  },
};

async function getNewReleasesData() {
  try {
    const endpoints = [
      { ep: '/movie/now_playing', pages: 3 },
      { ep: '/movie/upcoming', pages: 3 },
      { ep: '/tv/airing_today', pages: 2 },
      { ep: '/tv/on_the_air', pages: 3 },
      { ep: '/trending/all/day', pages: 2 },
    ];
    const allPromises = endpoints.flatMap(({ ep, pages }) =>
      Array.from({ length: pages }, (_, i) =>
        tmdbFetch<TMDBListResponse<TMDBMediaItem>>(ep, { page: String(i + 1) })
          .then(d => d.results || [])
          .catch(() => [] as TMDBMediaItem[])
      )
    );
    const allResults = await Promise.all(allPromises);
    const seen = new Set<number>();
    const unique = allResults
      .flat()
      .filter((r: TMDBMediaItem) => {
        if (!r.poster_path || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      })
      .sort((a, b) => b.popularity - a.popularity)
      .map(r => tmdbToMedia({ ...r, media_type: (r.media_type || 'movie') as 'movie' | 'tv' } as TMDBShow));
    return unique.slice(0, 100);
  } catch {
    return [];
  }
}

export default async function NewReleasesPage() {
  const shows = await getNewReleasesData();

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'New Releases',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'New Releases', item: pageUrl },
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
          { '@type': 'Question', name: 'What qualifies as a new release on Lumovia?', acceptedAnswer: { '@type': 'Answer', text: 'New releases include movies currently playing in theaters, upcoming theatrical releases, TV shows airing today, series currently on the air, and content trending in the last 24 hours. All data is sourced from TMDB and updated continuously.' } },
          { '@type': 'Question', name: 'How often is the New Releases page updated?', acceptedAnswer: { '@type': 'Answer', text: 'The New Releases page is updated every five minutes by pulling fresh data from five TMDB endpoints. New titles appear automatically as studios add release dates and TMDB users generate activity around new content.' } },
          { '@type': 'Question', name: 'Can I see upcoming movies before they are released?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. The New Releases page includes upcoming movies from TMDB, which list titles with announced release dates. Check back regularly as new dates are finalized and new titles are added to the upcoming slate.' } },
        ],
      }) }} />
      <Suspense>
        <BrowseClient initialShows={shows} />
      </Suspense>
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8', marginBottom: 12, letterSpacing: '.02em' }}>Stay on Top of the Latest Movies & TV Shows</h1>
        <p className="f-crimson" style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, maxWidth: 800 }}>
          Stay on top of the latest movies and TV shows with our New Releases hub. This page aggregates the freshest content currently playing in theaters, airing on television, and trending across the globe. Updated continuously throughout the week, it pulls real-time data from TMDB to bring you the most popular new releases alongside upcoming titles generating buzz. Whether you want to catch a film before it leaves theaters or discover a new series everyone is talking about, this is your one-stop destination. We combine five separate TMDB feeds — now playing movies, upcoming movies, airing today TV, currently on the air TV, and daily trending — into a single ranked list sorted by popularity. The result is a constantly evolving snapshot of what the world is watching right now. New titles are added automatically as they appear on TMDB, so check back often to stay ahead of the curve and be the first to discover the next big hit.
        </p>
      </section>
    </>
  );
}