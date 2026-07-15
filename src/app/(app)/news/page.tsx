import type { Metadata } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';

export const dynamic = 'force-static';
export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/news`;

export const metadata: Metadata = {
  title: 'News & Updates — Lumovia Changelog, New Features & Platform Announcements',
  description:
    'Stay up to date with the latest Lumovia news, feature launches, platform improvements, and community updates. Browse our changelog to see what\'s new in the free streaming catalog for movies, TV shows, anime, and cartoons.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Lumovia News & Updates — Latest Features and Changelog',
    description: 'Discover the newest features, improvements, and announcements from the Lumovia streaming catalog platform.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-genres.png`, width: 1344, height: 768, alt: 'Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Lumovia News & Updates — Latest Features and Changelog',
    description: 'Discover the newest features, improvements, and announcements from the Lumovia streaming catalog platform.',
    images: [`${siteUrl}/og/og-genres.png`],
  },
};

const NEWS_ENTRIES = [
  {
    date: 'June 12, 2026',
    title: 'Year in Review 2025 Now Live',
    category: 'Feature',
    description: 'Users can now access their personalized 2025 Year in Review, featuring total hours tracked, top genres, most-watched month, and a shareable summary card. The feature compiles all viewing activity from the past year into a beautiful visual retrospective.',
  },
  {
    date: 'May 28, 2026',
    title: 'Watch Party Feature Launch',
    category: 'Feature',
    description: 'Introducing Watch Party — a new way to enjoy content together. Create a virtual room, share the link with friends, and explore title details in sync. Currently available for all movies and TV shows in our catalog.',
  },
  {
    date: 'May 10, 2026',
    title: 'AniList Integration Live',
    category: 'Feature',
    description: 'Full AniList integration is now active across the platform. Anime titles now display AniList scores, episode counts, Japanese release dates, studio information, and community reviews alongside existing TMDB data for the most comprehensive anime database experience.',
  },
  {
    date: 'April 22, 2026',
    title: 'Genre Portal Redesign',
    category: 'Improvement',
    description: 'All six genre portal pages — Anime, Cartoon, Horror, Romance, Mystery, and Fantasy — have been completely redesigned with immersive visual themes, curated editorial content, sub-genre tag browsing, and genre-specific color palettes.',
  },
  {
    date: 'April 5, 2026',
    title: 'Leaderboard & Community Stats',
    category: 'Feature',
    description: 'The new Leaderboard page showcases the most active users on Lumovia, ranked by titles tracked, hours logged, and watchlist size. Community-wide statistics give a snapshot of platform activity and trending content.',
  },
  {
    date: 'March 18, 2026',
    title: 'Spring 2026 Anime Season Coverage',
    category: 'Content',
    description: 'Our Seasonal Anime page now covers the Spring 2026 season with full episode guides, weekly airing schedules, and up-to-date AniList scores. New anime are added within hours of their Japanese broadcast premiere.',
  },
  {
    date: 'February 27, 2026',
    title: 'Collections & Custom Lists',
    category: 'Feature',
    description: 'Registered users can now create unlimited custom collections to organize titles. Build lists like "Weekend Binge Picks," "Classic Horror Marathon," or "Best Shonen of All Time" — and share them with the community.',
  },
  {
    date: 'February 3, 2026',
    title: 'Improved Search Algorithm',
    category: 'Improvement',
    description: 'Our search engine has been overhauled with fuzzy matching, typo tolerance, and multi-language support. Search now returns results faster and handles alternate titles, Japanese romaji, and original language names more accurately.',
  },
  {
    date: 'January 15, 2026',
    title: 'Release Calendar Overhaul',
    category: 'Improvement',
    description: 'The Release Calendar now supports filtering by content type (movies, TV shows, anime), region-specific release dates, and a monthly view mode. Upcoming titles are displayed with poster art and countdown timers to their premiere dates.',
  },
  {
    date: 'December 20, 2025',
    title: 'Lumovia Community Forum Launch',
    category: 'Community',
    description: 'We have launched a community discussion space where users can share reviews, recommend titles, discuss episode theories, and connect with fellow entertainment enthusiasts. Join the conversation and help shape the future of Lumovia.',
  },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Feature: '#FFB347',
  Improvement: '#7EC8E3',
  Content: '#A8D5BA',
  Community: '#D4A5FF',
};

export default function NewsPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'News & Updates', item: pageUrl },
    ],
  };

  const newsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Lumovia News & Updates',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
  };

  const articlesJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Latest Lumovia News Articles',
    itemListElement: NEWS_ENTRIES.slice(0, 10).map((entry, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'NewsArticle',
        headline: entry.title,
        description: entry.description,
        datePublished: entry.date,
        articleSection: entry.category,
        publisher: {
          '@type': 'Organization',
          name: 'Lumovia',
          url: siteUrl,
        },
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(newsJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articlesJsonLd) }} />

      <style>{`
        .news-card { transition: background .2s, border-color .2s; }
        .news-card:hover { background: rgba(255,245,232,.07); border-color: rgba(255,245,232,.15); }
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
          News &amp; Updates
        </h1>
        <p className="f-crimson" style={{
          fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
          color: 'rgba(255,245,232,.7)',
          lineHeight: 1.8,
          marginBottom: 20,
        }}>
          Stay up to date with everything happening on Lumovia. From major feature launches to subtle improvements, this is your central hub for platform changelogs, content updates, and community announcements.
        </p>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.92rem, 1.3vw, 1.05rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 48,
        }}>
          We ship updates regularly and believe in transparency. Every new feature, bug fix, content expansion, and community initiative is documented here so you always know what is changing on the platform. Whether it is a brand-new genre portal, an improved search algorithm, or expanded anime coverage from AniList, you will find the details below.
        </p>

        {/* News Entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {NEWS_ENTRIES.map((entry) => (
            <article
              key={entry.title}
              className="news-card"
              style={{
                background: 'rgba(255,245,232,.04)',
                border: '1px solid rgba(255,245,232,.08)',
                borderRadius: 12,
                padding: '20px 16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <time className="f-crimson" style={{
                  fontSize: '.78rem',
                  color: 'rgba(255,245,232,.4)',
                }}>
                  {entry.date}
                </time>
                <span style={{
                  fontSize: '.7rem',
                  fontWeight: 600,
                  letterSpacing: '.06em',
                  textTransform: 'uppercase' as const,
                  color: CATEGORY_COLORS[entry.category] || '#FFB347',
                  background: `${CATEGORY_COLORS[entry.category] || '#FFB347'}18`,
                  padding: '3px 10px',
                  borderRadius: 20,
                }}>
                  {entry.category}
                </span>
              </div>
              <h2 className="f-cinzel" style={{
                fontSize: '1.05rem',
                color: '#FFF5E8',
                marginBottom: 8,
              }}>
                {entry.title}
              </h2>
              <p className="f-crimson" style={{
                fontSize: '.85rem',
                color: 'rgba(255,245,232,.55)',
                lineHeight: 1.7,
                margin: 0,
              }}>
                {entry.description}
              </p>
            </article>
          ))}
        </div>

        {/* SEO Text */}
        <div style={{ marginTop: 56 }}>
          <h2 className="f-cinzel" style={{
            fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
            color: '#FFF5E8',
            marginBottom: 16,
          }}>
            About Lumovia Updates
          </h2>
          <p className="f-crimson" style={{
            fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
            color: 'rgba(255,245,232,.55)',
            lineHeight: 1.8,
            marginBottom: 16,
          }}>
            Lumovia is continuously evolving to provide the best free streaming catalog experience on the web. Our development team releases new features, design improvements, and content expansions on a regular cadence. By following this news page, you will always be the first to know about new genre portals, expanded anime coverage via AniList, enhanced recommendation algorithms, and community-driven features like watchlists, collections, and the annual Year in Review.
          </p>
          <p className="f-crimson" style={{
            fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
            color: 'rgba(255,245,232,.55)',
            lineHeight: 1.8,
            marginBottom: 0,
          }}>
            We build Lumovia for entertainment enthusiasts who want a comprehensive, beautiful, and free alternative to paid streaming platforms. Every update is guided by community feedback and a commitment to making content discovery effortless. Bookmark this page or check back regularly to stay informed about the latest developments on the platform.
          </p>
        </div>
      </div>
    </>
  );
}