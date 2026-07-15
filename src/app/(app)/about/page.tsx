import type { Metadata } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import Link from 'next/link';

export const dynamic = 'force-static';
export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/about`;

export const metadata: Metadata = {
  title: 'About Lumovia - Free Streaming Platform | Movies, TV Shows, Anime & Cartoons',
  description:
    'Lumovia is a free streaming catalog powered by TMDB and AniList, offering detailed information on thousands of movies, TV shows, anime series, and cartoons. Discover content by genre, year, decade, or popularity with AI-powered recommendations, complete episode guides, cast filmographies, and personalized watchlists. No subscription required.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'About Lumovia — Free Streaming Catalog for Movies, TV Shows, Anime & Cartoons',
    description: 'Discover how Lumovia aggregates data from TMDB and AniList to create the ultimate free content discovery platform with personalized recommendations, episode guides, and more.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-genres.png`, width: 1344, height: 768, alt: 'Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'About Lumovia — Free Streaming Catalog',
    description: 'Discover how Lumovia aggregates data from TMDB and AniList to create the ultimate free content discovery platform.',
    images: [`${siteUrl}/og/og-genres.png`],
  },
};

const FAQ_ITEMS = [
  {
    q: 'What is Lumovia?',
    a: 'Lumovia is a free streaming catalog that aggregates movie, TV show, anime, and cartoon information from The Movie Database (TMDB) and AniList. It provides a beautifully designed interface to discover, browse, and explore entertainment content.',
  },
  {
    q: 'Is Lumovia free to use?',
    a: 'Yes, Lumovia is completely free. We do not require any subscription, payment, or account creation to browse and discover content. Our platform is supported by our community of entertainment enthusiasts.',
  },
  {
    q: 'What content is available on Lumovia?',
    a: 'Lumovia offers a vast catalog including the latest movies, popular TV shows, trending anime series, and classic cartoons. Our library spans all major genres: action, comedy, drama, horror, romance, mystery, sci-fi, fantasy, and more.',
  },
  {
    q: 'How often is the content updated?',
    a: 'Our catalog is updated regularly throughout the day. Trending content refreshes every few minutes, while our full catalog syncs with TMDB and AniList multiple times per hour to ensure you always see the latest releases and ratings.',
  },
  {
    q: 'Does Lumovia host video content?',
    a: 'Lumovia is a content discovery and catalog platform. We provide detailed information about movies, TV shows, and anime including ratings, cast details, trailers, and recommendations. We help you find where to watch your favorite content.',
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
    q: 'What devices can I use to access Lumovia?',
    a: 'Lumovia is a responsive web application that works on any device with a modern web browser. Whether you are on a desktop computer, laptop, tablet, or smartphone, you get a fully optimized experience.',
  },
  {
    q: 'How is the content rated?',
    a: 'Ratings on Lumovia come from two trusted sources: TMDB (The Movie Database) for movies and TV shows, and AniList for anime. Both platforms aggregate ratings from millions of users worldwide, giving you reliable quality indicators.',
  },
  {
    q: 'How can I contact Lumovia?',
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
    name: 'About Lumovia',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
    mainEntity: {
      '@type': 'Organization',
      name: 'Lumovia',
      url: siteUrl,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }} />

      <style>{`
        .about-link {
          display: block; padding: 12px 16px;
          background: rgba(255,245,232,.04);
          border: 1px solid rgba(255,245,232,.08);
          border-radius: 8px; color: #FFB347;
          text-decoration: none; font-size: .88rem;
          transition: background .2s, border-color .2s;
        }
        .about-link:hover { background: rgba(255,245,232,.08); border-color: rgba(255,179,71,.3); }
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
          About Lumovia
        </h1>
        <p className="f-crimson" style={{
          fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
          color: 'rgba(255,245,232,.7)',
          lineHeight: 1.8,
          marginBottom: 20,
        }}>
          Lumovia is a free, beautifully designed streaming catalog that helps you discover movies, TV shows, anime, and cartoons. Powered by TMDB and AniList, we aggregate data from millions of titles to create the ultimate content discovery experience.
        </p>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.92rem, 1.3vw, 1.05rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 20,
        }}>
          Our platform was built with a single mission: make it effortless to find your next favorite movie, binge-worthy TV show, or the latest anime episode — all without paying a cent or creating an account. Unlike subscription-based streaming services that lock content behind paywalls, Lumovia provides a comprehensive, searchable catalog of entertainment that anyone can browse instantly. Whether you are looking for the highest-rated films of all time, trending anime from this season, hidden gems from the 1990s, or a specific episode from a long-running TV series, our platform is designed to get you there in as few clicks as possible.
        </p>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.92rem, 1.3vw, 1.05rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 48,
        }}>
          We combine data from The Movie Database (TMDB), the world&apos;s largest community-driven movie and TV database, with AniList, the premier platform for anime and manga tracking. This dual-source approach means you get the best of both worlds: Hollywood blockbusters, indie films, and popular TV series from TMDB alongside comprehensive anime coverage including seasonal charts, episode counts, and Japanese release information from AniList. Our catalog spans every major genre from action and horror to romance and documentary, covers content from every decade since the 1970s, and includes both English-language and international titles from Japanese, Korean, Spanish, French, and dozens of other film industries around the globe. Every title in our catalog comes with detailed cast and crew information, user ratings from millions of voters, production details, and AI-powered similar title recommendations to help you discover content you never knew existed.
        </p>

        {/* Feature Grid */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 20,
        }}>
          What Makes Lumovia Different
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

        {/* How It Works */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 16,
        }}>
          How Lumovia Works
        </h2>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 16,
        }}>
          Lumovia operates as a content discovery engine rather than a traditional streaming service. When you visit any title on our platform, you will find a comprehensive detail page that includes the full synopsis, cast and crew with links to their complete filmographies, user ratings aggregated from millions of TMDB and AniList users, production company information, season and episode breakdowns for TV series and anime, and AI-generated similar title recommendations. For TV shows and anime, we go even deeper — every individual episode has its own dedicated landing page with a unique synopsis, air date, runtime, individual episode rating, and links to navigate between episodes within the same season. This episode-level indexing means that if you are trying to find a specific moment from a show you watched, you can search for it and land on the exact episode page.
        </p>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 16,
        }}>
          Our genre system is designed for both casual browsers and dedicated genre fans. Six core genres — Anime, Cartoon, Horror, Romance, Mystery, and Fantasy — have dedicated portal pages with custom visual themes, curated content selections, sub-genre tags, and genre-specific editorial descriptions. These portal pages are designed to be immersive experiences that feel unique to each genre. Beyond the portal genres, we support over twenty additional genres through our TMDB-powered browse filters, including Action, Adventure, Comedy, Crime, Documentary, Drama, Family, History, Music, Science Fiction, Thriller, War, and Western. You can also explore our catalog chronologically using our decade pages (1970s through 2020s) and year pages (the current year back twenty years), making it easy to find the best content from any era.
        </p>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 48,
        }}>
          For users who want a more personalized experience, creating a free account unlocks additional features: personal watchlists with status tracking (plan to watch, watching, completed), release reminders that notify you when upcoming titles become available, viewing statistics that track your hours watched, title count, daily streaks, and monthly activity patterns, curated collections where you can organize titles into custom lists like &quot;My Top 10 Shonen&quot; or &quot;Weekend Binge Picks,&quot; and a Year in Review feature that compiles your streaming habits into a shareable annual summary. All of these features are completely optional — the core browsing and discovery experience requires no account whatsoever.
        </p>

        {/* Quick Links */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 20,
        }}>
          Explore Lumovia
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
              className="about-link"
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