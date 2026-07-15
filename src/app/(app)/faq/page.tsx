import type { Metadata } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import Link from 'next/link';

export const dynamic = 'force-static';
export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/faq`;

export const metadata: Metadata = {
  title: 'FAQ — Frequently Asked Questions About Lumovia | Free Streaming Catalog',
  description:
    'Find answers to common questions about Lumovia: what it is, how it works, account features, supported devices, content sources, DMCA policy, privacy, and more. Everything you need to know about the free streaming catalog for movies, TV shows, anime, and cartoons.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Lumovia FAQ — Frequently Asked Questions',
    description: 'Get answers to the most common questions about Lumovia, including how ratings work, account features, device support, content sources, and legal information.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-genres.png`, width: 1344, height: 768, alt: 'Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Lumovia FAQ — Frequently Asked Questions',
    description: 'Get answers to the most common questions about Lumovia, including how ratings work, account features, device support, content sources, and legal information.',
    images: [`${siteUrl}/og/og-genres.png`],
  },
};

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_CATEGORIES = [
  {
    title: 'General',
    items: [
      {
        q: 'What is Lumovia?',
        a: 'Lumovia is a free streaming catalog that aggregates movie, TV show, anime, and cartoon information from The Movie Database (TMDB) and AniList. It provides a beautifully designed interface to discover, browse, and explore entertainment content without requiring any subscription or payment.',
      },
      {
        q: 'Is Lumovia free to use?',
        a: 'Yes, Lumovia is completely free. We do not require any subscription, payment, or account creation to browse and discover content. All core features — searching, browsing genres, viewing ratings, reading episode guides, and exploring cast filmographies — are available to every visitor at no cost.',
      },
      {
        q: 'What content is available on Lumovia?',
        a: 'Lumovia offers a vast catalog including the latest movies, popular TV shows, trending anime series, and classic cartoons. Our library spans all major genres: action, comedy, drama, horror, romance, mystery, sci-fi, fantasy, and more. Content is sourced from TMDB and AniList, covering thousands of titles across decades of entertainment.',
      },
      {
        q: 'Does Lumovia host video content?',
        a: 'Lumovia is a content discovery and catalog platform. We provide detailed information about movies, TV shows, and anime including ratings, cast details, trailers, and recommendations. We help you find where to watch your favorite content by presenting comprehensive metadata and community-sourced quality indicators.',
      },
    ] as FaqItem[],
  },
  {
    title: 'Account & Features',
    items: [
      {
        q: 'Do I need an account to use Lumovia?',
        a: 'No, you can browse and discover content on Lumovia without creating an account. However, creating a free account unlocks additional features such as personal watchlists, viewing progress tracking, release reminders, custom collections, and personalized viewing statistics.',
      },
      {
        q: 'How do I create and manage a watchlist?',
        a: 'After creating a free account, simply navigate to any title page and click the "Add to Watchlist" button. You can organize titles by status — plan to watch, currently watching, or completed — and track your progress through seasons and episodes. Your watchlist is accessible from the My List page in the navigation menu.',
      },
      {
        q: 'What are collections and how do they work?',
        a: 'Collections are custom lists that you can create to organize titles however you like. For example, you might create "Weekend Binge Picks," "Best Shonen Anime," or "Date Night Movies." You can create unlimited collections, add any title from our catalog, and manage them from the Collections page in your account.',
      },
      {
        q: 'What is the Year in Review feature?',
        a: 'The Year in Review is an annual summary of your viewing activity on Lumovia. It compiles statistics like total titles tracked, hours logged, top genres, most active month, and more into a shareable visual card. It is a fun way to reflect on your entertainment habits each year.',
      },
    ] as FaqItem[],
  },
  {
    title: 'Content & Data',
    items: [
      {
        q: 'How often is the content updated?',
        a: 'Our catalog is updated regularly throughout the day. Trending content refreshes every few minutes, while our full catalog syncs with TMDB and AniList multiple times per hour to ensure you always see the latest releases, ratings, and episode information.',
      },
      {
        q: 'Where does Lumovia get its data from?',
        a: 'Lumovia aggregates data from two primary sources: The Movie Database (TMDB) for movies, TV shows, and general entertainment metadata, and AniList for anime and manga-specific information. Both are community-driven platforms with millions of users contributing data worldwide.',
      },
      {
        q: 'How are ratings calculated on Lumovia?',
        a: 'Ratings on Lumovia come directly from TMDB and AniList. TMDB uses a weighted 1-10 scale from millions of user votes, while AniList uses a 1-100 weighted mean score from the anime community. Lumovia also features a Popularity Index that tracks real-time trending data and user interaction metrics.',
      },
      {
        q: 'How does the recommendation system work?',
        a: 'Our recommendation engine uses multiple signals including genre preferences, viewing history, rating patterns, and community trends to suggest content you will enjoy. The more you interact with the platform — adding titles to your watchlist, marking episodes as watched, or rating content — the more personalized your recommendations become.',
      },
    ] as FaqItem[],
  },
  {
    title: 'Technical & Devices',
    items: [
      {
        q: 'What devices and browsers are supported?',
        a: 'Lumovia is a responsive web application that works on any device with a modern web browser — including desktop computers, laptops, tablets, and smartphones. We recommend using the latest versions of Chrome, Firefox, Safari, or Edge for the best experience. No app download is required.',
      },
      {
        q: 'Is there a Lumovia mobile app?',
        a: 'Lumovia is currently a web-only platform and does not have a dedicated mobile app. However, our website is fully optimized for mobile browsers and provides a native-app-like experience on smartphones and tablets. You can add Lumovia to your home screen for quick access.',
      },
      {
        q: 'How do I enable browser notifications?',
        a: 'If you have an account and want to receive release reminders, you can enable browser notifications through your browser settings or the notification prompt that appears when you set a reminder. Notifications are handled by your browser and can be managed at any time through your browser\'s site settings.',
      },
      {
        q: 'Why is a page loading slowly or showing an error?',
        a: 'Occasional slow loading can be caused by temporary issues with our data providers (TMDB or AniList) or your internet connection. Try refreshing the page or clearing your browser cache. If the issue persists, it may be a temporary server issue that will resolve shortly. You can report persistent problems through our contact page.',
      },
    ] as FaqItem[],
  },
  {
    title: 'Legal & Privacy',
    items: [
      {
        q: 'What is Lumovia\'s DMCA policy?',
        a: 'Lumovia respects intellectual property rights and complies with the Digital Millennium Copyright Act (DMCA). Since Lumovia is a catalog and discovery platform that does not host, upload, or stream video files, DMCA takedown requests related to hosted content do not apply. If you believe any metadata or images on our platform infringe your rights, please contact us with the relevant details. Read our full DMCA policy for more information.',
      },
      {
        q: 'Who owns the content displayed on Lumovia?',
        a: 'Lumovia does not own any of the movies, TV shows, anime, or cartoons listed in our catalog. All content metadata, images, and descriptions are sourced from TMDB and AniList and belong to their respective copyright holders. Lumovia provides a discovery service and directs users to legitimate sources for viewing content.',
      },
      {
        q: 'How does Lumovia handle my privacy?',
        a: 'Lumovia takes user privacy seriously. We collect only the minimum data necessary to provide our services: account information if you choose to register, and anonymous usage analytics. We do not sell personal data to third parties. Our Privacy Policy provides full details about what data we collect, how it is used, and your rights regarding your information.',
      },
      {
        q: 'Can I request removal of my personal data?',
        a: 'Yes. Under applicable data protection regulations, you have the right to request access to, correction of, or deletion of your personal data. If you would like to exercise any of these rights, please contact us through our contact page and we will respond within the timeframes required by applicable law.',
      },
    ] as FaqItem[],
  },
];

// Flatten all FAQ items for JSON-LD
const ALL_FAQS = FAQ_CATEGORIES.flatMap(c => c.items);

export default function FaqPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ALL_FAQS.map(item => ({
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
      { '@type': 'ListItem', position: 2, name: 'FAQ', item: pageUrl },
    ],
  };

  const faqPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Lumovia FAQ',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd) }} />

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
          Frequently Asked Questions
        </h1>
        <p className="f-crimson" style={{
          fontSize: 'clamp(1rem, 1.5vw, 1.15rem)',
          color: 'rgba(255,245,232,.7)',
          lineHeight: 1.8,
          marginBottom: 20,
        }}>
          Find answers to the most common questions about Lumovia. If you do not find what you are looking for, feel free to <Link href="/contact" style={{ color: '#FFB347', textDecoration: 'none' }}>contact us</Link>.
        </p>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.92rem, 1.3vw, 1.05rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 48,
        }}>
          Our FAQ covers everything from basic questions about what Lumovia is and how it works, to detailed information about account features, content sources, device compatibility, ratings, and legal matters. We keep this page updated regularly as new features are added and policies evolve.
        </p>

        {/* FAQ Categories */}
        {FAQ_CATEGORIES.map((category) => (
          <section key={category.title} style={{ marginBottom: 48 }}>
            <h2 className="f-cinzel" style={{
              fontSize: 'clamp(1.1rem, 1.8vw, 1.4rem)',
              color: '#FFB347',
              marginBottom: 20,
              paddingBottom: 8,
              borderBottom: '1px solid rgba(255,179,71,.15)',
            }}>
              {category.title}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {category.items.map(item => (
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
          </section>
        ))}

        {/* Still have questions */}
        <div style={{
          background: 'rgba(255,245,232,.04)',
          border: '1px solid rgba(255,245,232,.08)',
          borderRadius: 12,
          padding: '24px 16px',
          textAlign: 'center',
          marginBottom: 48,
        }}>
          <p className="f-crimson" style={{
            fontSize: '1rem',
            color: 'rgba(255,245,232,.6)',
            lineHeight: 1.7,
            margin: '0 0 12px',
          }}>
            Didn&apos;t find the answer you were looking for?
          </p>
          <Link href="/contact" className="f-cinzel" style={{
            display: 'inline-block',
            color: '#FFB347',
            textDecoration: 'none',
            fontSize: '.95rem',
            padding: '8px 24px',
            border: '1px solid rgba(255,179,71,.3)',
            borderRadius: 8,
            transition: 'background .2s, border-color .2s',
          }}>
            Contact Us
          </Link>
        </div>

        {/* SEO Text */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
          color: '#FFF5E8',
          marginBottom: 16,
        }}>
          About This FAQ
        </h2>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 16,
        }}>
          This FAQ page is designed to provide comprehensive answers to the most frequently asked questions about Lumovia. Whether you are a new visitor wondering what Lumovia is, a registered user looking to understand collections and watchlists, or someone with questions about our data sources and legal policies, you will find the information here.
        </p>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.88rem, 1.2vw, 1rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.8,
          marginBottom: 0,
        }}>
          Lumovia is built on the principle that discovering great entertainment should be free, beautiful, and effortless. Our FAQ is regularly updated to reflect new features, policy changes, and the most common questions from our growing community of movie, TV show, anime, and cartoon enthusiasts. If your question is not covered here, our contact page provides additional ways to reach the Lumovia team.
        </p>
      </div>
    </>
  );
}