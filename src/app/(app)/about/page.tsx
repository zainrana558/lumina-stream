import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-stream-omega.vercel.app';
const pageUrl = `${siteUrl}/about`;

export const metadata: Metadata = {
  title: 'About Lumina Stream - Free Streaming Platform',
  description:
    'Lumina Stream is a free streaming platform for movies, TV shows, anime, and cartoons. Learn about our mission, features, and how to discover your next favorite content.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'About Lumina Stream',
    description: 'Learn about Lumina Stream — your free streaming platform for movies, TV shows, anime, and cartoons.',
    siteName: 'Lumina Stream',
  },
};

const FAQ_ITEMS = [
  {
    q: 'What is Lumina Stream?',
    a: 'Lumina Stream is a free streaming catalog that aggregates movie, TV show, anime, and cartoon information from The Movie Database (TMDB) and AniList. It provides a beautifully designed interface to discover, browse, and explore entertainment content.',
  },
  {
    q: 'Is Lumina Stream free to use?',
    a: 'Yes, Lumina Stream is completely free. We do not require any subscription, payment, or account creation to browse and discover content. Our platform is supported by our community of entertainment enthusiasts.',
  },
  {
    q: 'What content is available on Lumina Stream?',
    a: 'Lumina Stream offers a vast catalog including the latest movies, popular TV shows, trending anime series, and classic cartoons. Our library spans all major genres: action, comedy, drama, horror, romance, mystery, sci-fi, fantasy, and more.',
  },
  {
    q: 'How often is the content updated?',
    a: 'Our catalog is updated regularly throughout the day. Trending content refreshes every few minutes, while our full catalog syncs with TMDB and AniList multiple times per hour to ensure you always see the latest releases and ratings.',
  },
  {
    q: 'Does Lumina Stream host video content?',
    a: 'Lumina Stream is a content discovery and catalog platform. We provide detailed information about movies, TV shows, and anime including ratings, cast details, trailers, and recommendations. We help you find where to watch your favorite content.',
  },
  {
    q: 'How does the recommendation system work?',
    a: 'Our recommendation system uses multiple signals including genre preferences, viewing history, rating patterns, and community trends to suggest content you will love. The more you interact with the platform, the better your recommendations become.',
  },
  {
    q: 'Can I create a watchlist?',
    a: 'Yes! Once you create a free account, you can add any movie, TV show, or anime to your personal watchlist. You can also track your viewing progress, rate content, and organize titles into custom collections.',
  },
  {
    q: 'What devices can I use to access Lumina Stream?',
    a: 'Lumina Stream is a responsive web application that works on any device with a modern web browser. Whether you are on a desktop computer, laptop, tablet, or smartphone, you get a fully optimized experience.',
  },
  {
    q: 'How is the content rated?',
    a: 'Ratings on Lumina Stream come from two trusted sources: TMDB (The Movie Database) for movies and TV shows, and AniList for anime. Both platforms aggregate ratings from millions of users worldwide, giving you reliable quality indicators.',
  },
  {
    q: 'How can I contact Lumina Stream?',
    a: 'You can reach out to us through our social media channels or by using the feedback form in the app. We value community input and regularly incorporate user suggestions into our platform improvements.',
  },
];

export default function AboutPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'About', item: pageUrl },
    ],
  };

  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: 'About Lumina Stream',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
    mainEntity: {
      '@type': 'Organization',
      name: 'Lumina Stream',
      url: siteUrl,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }} />

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
          About Lumina Stream
        </h1>
        <p className="f-crimson" style={{
          fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
          color: 'rgba(255,245,232,.7)',
          lineHeight: 1.8,
          marginBottom: 48,
        }}>
          Lumina Stream is a free, beautifully designed streaming catalog that helps you discover movies, TV shows, anime, and cartoons. Powered by TMDB and AniList, we aggregate data from millions of titles to create the ultimate content discovery experience.
        </p>

        {/* Feature Grid */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 20,
        }}>
          What Makes Us Different
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 20,
          marginBottom: 56,
        }}>
          {[
            { title: 'Massive Catalog', desc: 'Thousands of movies, TV shows, anime, and cartoons from multiple sources.' },
            { title: 'Smart Discovery', desc: 'AI-powered recommendations, mood-based browsing, and curated genre portals.' },
            { title: 'Always Updated', desc: 'Real-time trending data, weekly seasonal anime, and daily release calendars.' },
            { title: 'Beautiful Design', desc: 'Cinematic dark theme with immersive genre portals and smooth animations.' },
            { title: 'Free Forever', desc: 'No subscriptions, no hidden fees. Browse and discover content at no cost.' },
            { title: 'Community Driven', desc: 'Ratings from millions of users on TMDB and AniList ensure quality recommendations.' },
          ].map(feature => (
            <div key={feature.title} style={{
              background: 'rgba(255,245,232,.04)',
              border: '1px solid rgba(255,245,232,.08)',
              borderRadius: 12,
              padding: '20px 16px',
            }}>
              <div className="f-cinzel" style={{
                fontSize: '.95rem',
                color: '#FFB347',
                marginBottom: 8,
              }}>{feature.title}</div>
              <p className="f-crimson" style={{
                fontSize: '.82rem',
                color: 'rgba(255,245,232,.55)',
                lineHeight: 1.6,
                margin: 0,
              }}>{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 20,
        }}>
          Explore Lumina Stream
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 56,
        }}>
          {[
            { label: 'Browse All', href: '/browse' },
            { label: 'Movies', href: '/movies' },
            { label: 'TV Shows', href: '/tv-shows' },
            { label: 'Anime', href: '/genre/anime' },
            { label: 'Cartoons', href: '/genre/cartoon' },
            { label: 'Horror', href: '/genre/horror' },
            { label: 'Romance', href: '/genre/romance' },
            { label: 'Mystery', href: '/genre/mystery' },
            { label: 'Fantasy', href: '/genre/fantasy' },
            { label: 'Top Rated', href: '/top-rated' },
            { label: 'New Releases', href: '/new-releases' },
            { label: 'Seasonal Anime', href: '/seasonal' },
            { label: 'Release Calendar', href: '/release-calendar' },
            { label: 'Leaderboard', href: '/leaderboard' },
            { label: 'All Genres', href: '/genres' },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'block',
                padding: '12px 16px',
                background: 'rgba(255,245,232,.04)',
                border: '1px solid rgba(255,245,232,.08)',
                borderRadius: 8,
                color: '#FFB347',
                textDecoration: 'none',
                fontSize: '.88rem',
                transition: 'background .2s, border-color .2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,245,232,.08)';
                e.currentTarget.style.borderColor = 'rgba(255,179,71,.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,245,232,.04)';
                e.currentTarget.style.borderColor = 'rgba(255,245,232,.08)';
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* FAQ Section */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 24,
        }}>
          Frequently Asked Questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {FAQ_ITEMS.map(item => (
            <details
              key={item.q}
              style={{
                background: 'rgba(255,245,232,.03)',
                border: '1px solid rgba(255,245,232,.07)',
                borderRadius: 10,
                padding: '16px 20px',
                cursor: 'pointer',
              }}
            >
              <summary className="f-cinzel" style={{
                fontSize: '.9rem',
                color: '#FFF5E8',
                listStyle: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                {item.q}
                <span style={{ color: 'rgba(255,245,232,.3)', fontSize: '.8rem' }}>+</span>
              </summary>
              <p className="f-crimson" style={{
                fontSize: '.85rem',
                color: 'rgba(255,245,232,.6)',
                lineHeight: 1.7,
                marginTop: 12,
                marginBottom: 0,
              }}>
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}