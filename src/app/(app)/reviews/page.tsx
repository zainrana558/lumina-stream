import type { Metadata } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const dynamic = 'force-static';
export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/reviews`;

export const metadata: Metadata = {
  title: 'Ratings & Reviews — How Lumovia Scores Movies, TV Shows & Anime',
  description:
    'Learn how Lumovia ratings work. We aggregate scores from TMDB (millions of user votes) and AniList (anime community) to provide reliable quality indicators. Explore top-rated highlights and understand our popularity ranking system.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Lumovia Ratings & Reviews — TMDB & AniList Score Explanations',
    description: 'Understand how ratings are calculated on Lumovia, powered by TMDB and AniList community scores for movies, TV shows, and anime.',
    siteName: 'Lumovia',
  },
};

const RATING_SOURCES = [
  {
    title: 'TMDB User Ratings',
    icon: '🎬',
    description: 'The Movie Database aggregates ratings from millions of registered users worldwide. Every movie and TV show on Lumovia displays a TMDB score on a 1-10 scale, weighted to reduce outlier manipulation. With over 500 million total votes across the platform, TMDB scores are among the most reliable crowd-sourced quality indicators in the entertainment industry.',
    scale: '1 – 10 scale',
    voters: 'Millions of users',
  },
  {
    title: 'AniList Scores',
    icon: '🎭',
    description: 'AniList is the premier community platform for anime and manga enthusiasts. Unlike traditional review aggregators, AniList scores are calculated using a weighted mean that accounts for user engagement, review recency, and scoring distribution. Anime titles on Lumovia display both the AniList mean score and the user count, giving you a clear picture of community consensus.',
    scale: '1 – 100 scale',
    voters: 'Hundreds of thousands',
  },
  {
    title: 'Popularity Index',
    icon: '🔥',
    description: 'Our proprietary Popularity Index combines real-time trending data, user interaction metrics, and external buzz signals to rank currently popular content. Unlike static ratings, the Popularity Index changes dynamically — a title can surge after a viral moment, a new season announcement, or an award nomination. It powers our "Trending Now" and "Popular This Week" sections.',
    scale: 'Relative ranking',
    voters: 'Algorithm-based',
  },
];

const TOP_RATED = [
  {
    title: 'The Shawshank Redemption',
    rating: '9.3',
    source: 'TMDB',
    quote: 'A masterclass in storytelling. Frank Darabont\'s adaptation of Stephen King\'s novella remains the gold standard for prison dramas, with performances that linger long after the credits roll.',
  },
  {
    title: 'Steins;Gate',
    rating: '92',
    source: 'AniList',
    quote: 'Widely regarded as one of the greatest anime of all time. Its intricate time-travel narrative rewards patient viewers with one of the most satisfying conclusions in the medium.',
  },
  {
    title: 'Breaking Bad',
    rating: '9.5',
    source: 'TMDB',
    quote: 'Vince Gilligan\'s creation redefined television. Walter White\'s transformation from mild-mannered teacher to ruthless kingpin is television at its absolute finest.',
  },
  {
    title: 'Attack on Titan: The Final Season',
    rating: '89',
    source: 'AniList',
    quote: 'A monumental conclusion to one of the most impactful anime series of the modern era. The final season delivers breathtaking action alongside profound moral complexity.',
  },
  {
    title: 'The Dark Knight',
    rating: '9.2',
    source: 'TMDB',
    quote: 'Christopher Nolan elevated the superhero genre to high art. Heath Ledger\'s iconic Joker performance alone makes this a cultural touchstone that defined a generation of filmmaking.',
  },
];

export default function ReviewsPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Ratings & Reviews', item: pageUrl },
    ],
  };

  const reviewsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Lumovia Ratings & Reviews',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd) }} />

      <style>{`
        .review-source-card { transition: background .2s, border-color .2s; }
        .review-source-card:hover { background: rgba(255,245,232,.07); border-color: rgba(255,245,232,.15); }
        .highlight-card { transition: background .2s, border-color .2s; }
        .highlight-card:hover { background: rgba(255,245,232,.07); border-color: rgba(255,179,71,.2); }
      `}</style>
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
        padding: 'clamp(60px,7vw,80px) 20px 60px',
      }}>
        {/* Hero */}
        <h1 className="f-cinzel-dec" style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
          color: '#FFF5E8',
          marginBottom: 16,
          letterSpacing: '.02em',
        }}>
          Ratings &amp; Reviews
        </h1>
        <p className="f-crimson" style={{
          fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
          color: 'rgba(255,245,232,.7)',
          lineHeight: 1.8,
          marginBottom: 20,
        }}>
          Lumovia aggregates ratings from the world&apos;s most trusted entertainment databases to give you reliable quality indicators for every title in our catalog.
        </p>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.92rem, 1.3vw, 1.05rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 48,
        }}>
          Every movie, TV show, and anime on Lumovia comes with a rating sourced from either The Movie Database (TMDB) or AniList — two of the largest community-driven entertainment databases on the internet. These are not paid critic reviews or studio-curated scores; they represent the genuine opinions of millions of real viewers. This page explains how each rating system works, what the numbers mean, and how to interpret them when choosing your next watch.
        </p>

        {/* Rating Sources */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 20,
        }}>
          How Ratings Work
        </h2>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 20,
        }}>
          Lumovia uses two primary rating sources, each optimized for different types of content. Understanding these systems helps you make more informed viewing decisions.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 56 }}>
          {RATING_SOURCES.map((source) => (
            <article
              key={source.title}
              className="review-source-card"
              style={{
                background: 'rgba(255,245,232,.04)',
                border: '1px solid rgba(255,245,232,.08)',
                borderRadius: 12,
                padding: '20px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: '1.3rem' }}>{source.icon}</span>
                <h3 className="f-cinzel" style={{
                  fontSize: '1rem',
                  color: '#FFB347',
                  margin: 0,
                }}>
                  {source.title}
                </h3>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
                <span className="f-crimson" style={{
                  fontSize: '.75rem',
                  color: 'rgba(255,245,232,.4)',
                  background: 'rgba(255,245,232,.04)',
                  padding: '2px 10px',
                  borderRadius: 20,
                }}>
                  Scale: {source.scale}
                </span>
                <span className="f-crimson" style={{
                  fontSize: '.75rem',
                  color: 'rgba(255,245,232,.4)',
                  background: 'rgba(255,245,232,.04)',
                  padding: '2px 10px',
                  borderRadius: 20,
                }}>
                  {source.voters}
                </span>
              </div>
              <p className="f-crimson" style={{
                fontSize: '.85rem',
                color: 'rgba(255,245,232,.55)',
                lineHeight: 1.7,
                margin: 0,
              }}>
                {source.description}
              </p>
            </article>
          ))}
        </div>

        {/* Top Rated Highlights */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 20,
        }}>
          Top Rated Highlights
        </h2>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 20,
        }}>
          Here is a selection of the highest-rated titles across our catalog, representing the consensus of millions of community voters on TMDB and AniList.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 56 }}>
          {TOP_RATED.map((item) => (
            <article
              key={item.title}
              className="highlight-card"
              style={{
                background: 'rgba(255,245,232,.04)',
                border: '1px solid rgba(255,245,232,.08)',
                borderRadius: 12,
                padding: '20px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, flexWrap: 'wrap' }}>
                <span className="f-cinzel" style={{
                  fontSize: '1.6rem',
                  color: '#FFB347',
                  fontWeight: 700,
                  lineHeight: 1,
                }}>
                  {item.rating}
                </span>
                <div>
                  <h3 className="f-cinzel" style={{
                    fontSize: '1rem',
                    color: '#FFF5E8',
                    margin: 0,
                    marginBottom: 2,
                  }}>
                    {item.title}
                  </h3>
                  <span className="f-crimson" style={{
                    fontSize: '.72rem',
                    color: 'rgba(255,245,232,.4)',
                  }}>
                    via {item.source}
                  </span>
                </div>
              </div>
              <p className="f-crimson" style={{
                fontSize: '.85rem',
                color: 'rgba(255,245,232,.55)',
                lineHeight: 1.7,
                margin: 0,
                fontStyle: 'italic',
              }}>
                &ldquo;{item.quote}&rdquo;
              </p>
            </article>
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{
          background: 'rgba(255,179,71,.06)',
          border: '1px solid rgba(255,179,71,.12)',
          borderRadius: 12,
          padding: '20px 16px',
          marginBottom: 56,
        }}>
          <h3 className="f-cinzel" style={{
            fontSize: '.9rem',
            color: '#FFB347',
            marginBottom: 8,
          }}>
            Disclaimer
          </h3>
          <p className="f-crimson" style={{
            fontSize: '.85rem',
            color: 'rgba(255,245,232,.55)',
            lineHeight: 1.7,
            margin: 0,
          }}>
            All ratings and review quotes displayed on Lumovia are sourced from the TMDB and AniList communities. Lumovia does not host original reviews, and the opinions expressed in review quotes belong to the individual users who authored them on those platforms. Ratings are dynamic and may change as new votes are cast. Lumovia is not affiliated with TMDB or AniList and simply displays their publicly available aggregated data.
          </p>
        </div>

        {/* SEO Text */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 16,
        }}>
          Understanding Entertainment Ratings
        </h2>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 16,
        }}>
          Ratings are one of the most important tools for discovering quality content. On Lumovia, every title in our catalog of thousands of movies, TV shows, anime series, and cartoons carries a community-aggregated score that reflects the collective opinion of real viewers. Unlike critic-only reviews, which can sometimes diverge from audience sentiment, crowd-sourced ratings from platforms like TMDB and AniList capture the genuine reactions of the people who actually watch the content.
        </p>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 0,
        }}>
          When browsing Lumovia, you will notice that TMDB scores use a 1-10 scale while AniList scores use a 1-100 scale. Both are equally reliable — the difference is simply a convention of each platform. A TMDB score of 8.5 or above generally indicates exceptional quality, while an AniList score of 80 or above represents similarly high regard within the anime community. Our Top Rated page and genre portals both leverage these scores to surface the best content, and our AI-powered recommendation engine factors them in alongside genre preferences and viewing history to suggest titles you are most likely to enjoy.
        </p>
      </div>
    </>
  );
}