import { CANONICAL_BASE } from '@/lib/seo/constants';
import LeaderboardClient from './LeaderboardClient';

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/leaderboard`;

export const metadata = {
  title: 'Community Leaderboard - Top Rated Movies & TV Shows by Viewers',
  description:
    'See the top-rated movies and TV shows as ranked by the Lumovia community. Our leaderboard aggregates viewer ratings to surface the most beloved titles across every genre — from blockbuster movies and acclaimed TV series to trending anime. Ratings are updated in real time, so the rankings shift as more viewers weigh in. Discover what the community loves most and find your next favorite show.',
  alternates: { canonical: pageUrl },
  openGraph: {
    title: 'Community Leaderboard - Top Rated by Viewers | Lumovia',
    description:
      'See the top-rated movies and TV shows as ranked by the Lumovia community. Discover what viewers love most.',
    url: pageUrl,
    siteName: 'Lumovia',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Community Leaderboard | Lumovia',
    description:
      'See the top-rated movies and TV shows as ranked by the Lumovia community.',
  },
};

const collectionJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Community Leaderboard',
  description: metadata.description,
  url: pageUrl,
  isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
    { '@type': 'ListItem', position: 2, name: 'Community Leaderboard', item: pageUrl },
  ],
};

export default function LeaderboardPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <LeaderboardClient />
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '60px 20px 60px' }}>
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: '#FFF5E8', marginBottom: 12, letterSpacing: '.02em' }}>Community Rankings</h1>
        <p className="f-crimson" style={{ fontSize: 'clamp(.9rem,1.3vw,1.05rem)', color: 'rgba(255,245,232,.55)', lineHeight: 1.7, maxWidth: 800 }}>
          The Lumovia Community Leaderboard ranks every movie and TV show by average viewer rating. Unlike algorithmic trending lists that reflect popularity or recency, this board reflects genuine quality as judged by real users. Every rating contributes to the aggregate score you see here, with titles needing multiple ratings before they appear to ensure statistical reliability. The leaderboard covers all content types available on Lumovia — Hollywood movies, international films, TV dramas, anime series, and cartoons — so you can discover highly-rated titles across every genre and medium. Rankings update in real time as new ratings are submitted, meaning a show you love can climb the board with enough community support. Use this page as a quality filter: if you are not sure what to watch next, pick anything from the top ten and you are virtually guaranteed a great experience. You can also click through to any title above to read its full description, view cast and crew details, watch the trailer, and see similar recommendations.
        </p>
      </section>
    </>
  );
}