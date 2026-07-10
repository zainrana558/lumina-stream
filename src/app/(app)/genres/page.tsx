import type { Metadata } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import Link from 'next/link';
import { PORTAL_GENRES, BROWSE_ONLY_GENRES, TMDB_GENRE_ID_MAP, type PortalGenreConfig } from '@/config/genres';

// ISR — revalidation controlled by parent genre pages
export const revalidate = 3600; // 1 hour

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/genres`;

export const metadata: Metadata = {
  title: 'All Genres - Browse Movies, TV Shows, Anime & Cartoons by Genre | Lumovia',
  description:
    'Browse the complete genre catalog on Lumovia. Explore dedicated genre portals for Anime, Cartoon, Horror, Romance, Mystery, and Fantasy, plus 20+ additional genres including Action, Comedy, Drama, Sci-Fi, Thriller, Documentary, Crime, and more. Each genre page features curated titles, genre-specific descriptions, sub-genre filters, and personalized recommendations.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'All Genres — Browse Movies, TV Shows, Anime & Cartoons by Genre | Lumovia',
    description: 'Explore every genre on Lumovia — from Anime and Horror portals to Action, Comedy, Drama, Sci-Fi, and 20+ more genres with curated content.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-genres.png`, width: 1344, height: 768, alt: 'All Genres on Lumovia' }],
  },
  twitter: { card: 'summary_large_image', title: 'All Genres | Lumovia', description: 'Browse all genres on Lumovia.', images: [`${siteUrl}/og/og-genres.png`] },
};

const GENRE_DESCRIPTIONS: Record<string, string> = {
  Action: 'High-octane adrenaline-pumping films and shows with thrilling fights, chases, and explosions.',
  Adventure: 'Epic journeys to unknown lands, treasure hunts, and daring expeditions across the globe.',
  Animation: 'Beautifully crafted animated stories from studios around the world, including anime and cartoons.',
  Comedy: 'Laugh-out-loud movies and TV shows that will brighten your day with humor and wit.',
  Crime: 'Gripping investigations, heists, and criminal underworlds that keep you on the edge of your seat.',
  Documentary: 'Real-world stories, investigative journalism, and factual explorations of our world.',
  Drama: 'Powerful emotional stories with complex characters, relationships, and life-changing moments.',
  Family: 'Wholesome entertainment for viewers of all ages — animated features, live-action adventures, and heartwarming tales.',
  Fantasy: 'Magical worlds, mythical creatures, and legendary quests beyond the boundaries of reality.',
  History: 'Epic historical dramas, biopics, and true stories from the past that shaped our world.',
  Horror: 'Terrifying films and shows that will chill you to the bone — from supernatural hauntings to psychological terror.',
  Music: 'Musicals, concert films, biopics of legendary artists, and stories powered by unforgettable soundtracks.',
  Mystery: 'Mind-bending puzzles, detective stories, and thrilling whodunits that will keep you guessing until the end.',
  Romance: 'Love stories that make your heart flutter — from passionate romances to tender, bittersweet tales.',
  'Sci-Fi': 'Futuristic technology, space exploration, time travel, and mind-expanding scientific possibilities.',
  Thriller: 'Suspenseful edge-of-your-seat entertainment with twists, turns, and non-stop tension.',
  War: 'Powerful war films depicting the bravery, sacrifice, and human cost of armed conflicts.',
  Western: 'Classic frontier tales of outlaws, lawmen, and the untamed American West.',
  Anime: 'Japanese animation spanning every genre — from action-packed shonen to heartwarming slice-of-life stories.',
  Cartoon: 'Fun animated series from Western studios — classics, modern hits, and family-friendly adventures.',
};

const GENRE_FAQ = [
  {
    q: 'How many genres are available on Lumovia?',
    a: 'Lumovia offers over 25 genres organized into two tiers. Six core genres — Anime, Cartoon, Horror, Romance, Mystery, and Fantasy — have dedicated portal pages with custom visual themes, curated content selections, and sub-genre navigation. An additional 19+ genres including Action, Adventure, Comedy, Crime, Documentary, Drama, Family, History, Music, Science Fiction, Thriller, War, and Western are available through our TMDB-powered browse filters. Every genre page displays curated titles with ratings, descriptions, and direct links to individual title pages.',
  },
  {
    q: 'What is the difference between genre portals and browse genres?',
    a: 'Genre portals are immersive, dedicated pages for our six most popular genres (Anime, Cartoon, Horror, Romance, Mystery, Fantasy). Each portal features a custom color scheme, backdrop imagery, sub-genre tags, genre-specific editorial content, and a curated selection of titles. Browse genres use TMDB-powered filtering to show all titles matching a genre tag. Both approaches provide full access to our catalog — portals offer a more thematic, editorial experience while browse genres offer a comprehensive, filterable list view.',
  },
  {
    q: 'Can I browse multiple genres at once?',
    a: 'Yes. When using the browse page, you can combine genre filters with other criteria like release year, rating threshold, and sort order to find exactly the type of content you are looking for. For example, you can filter for Horror movies from the 2020s sorted by rating, or Comedy TV shows from the 2010s sorted by popularity. Each genre portal also includes sub-genre tags that let you narrow your selection within that genre.',
  },
  {
    q: 'How often are genre pages updated with new content?',
    a: 'Genre portal pages revalidate every hour, meaning new titles appear on genre pages within 60 minutes of being added to TMDB or AniList. Trending and popular content within each genre refreshes even more frequently. Our browse filters always query live data, so you always see the most current results when actively browsing.',
  },
  {
    q: 'Does Lumovia have anime-specific genre browsing?',
    a: 'Yes. Anime has its own dedicated genre portal at /genre/anime with a custom visual theme, curated anime selections, and sub-genre tags like Shonen, Shojo, Seinen, Isekai, and Slice of Life. Additionally, our seasonal anime page at /seasonal tracks currently airing anime by season, and our anime content is powered by AniList for the most comprehensive and up-to-date anime database available.',
  },
];

const ALL_GENRES = [
  ...PORTAL_GENRES.map(g => ({ name: g.name, key: g.key, slug: `/genre/${g.key}`, color: g.tc })),
  ...BROWSE_ONLY_GENRES.map(name => ({
    name,
    key: name.toLowerCase(),
    slug: `/browse?genre=${encodeURIComponent(name)}`,
    color: '#FFB347',
  })),
  ...Object.entries(TMDB_GENRE_ID_MAP)
    .filter(([id, name]) => {
      const numId = Number(id);
      return numId > 10000 && !PORTAL_GENRES.some(g => g.name === name) && !BROWSE_ONLY_GENRES.includes(name as any);
    })
    .map(([, name]) => ({
      name,
      key: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      slug: `/browse?genre=${encodeURIComponent(name)}`,
      color: 'rgba(255,245,232,.5)',
    })),
];

// ─── Fetch a backdrop image for each portal genre ─────────────────────────
//
// AniList-only approach for family-friendly, consistent imagery:
//   1. AniList family-friendly banner (primary for ALL genres)
//   2. Hardcoded fallback URLs from iconic anime titles
//
// All images are anime-style banners from AniList CDN (free, no auth).
// isAdult: false + safe genre filters ensure family-friendly results.

/**
 * Fetch a single family-friendly anime banner from AniList.
 * All genres use AniList as the image source for consistency and family-friendliness.
 * Uses safe genre filters to avoid suggestive/inappropriate imagery.
 */
const FAMILY_FRIENDLY_GENRES = ['Action', 'Adventure', 'Comedy', 'Fantasy', 'Slice of Life', 'Sports', 'Supernatural', 'Romance', 'Drama', 'Mystery', 'Horror', 'Thriller'];

// Genre-specific AniList genre override for more relevant backdrops
const GENRE_ANILIST_OVERRIDE: Record<string, string[]> = {
  horror:   ['Horror', 'Supernatural', 'Mystery'],
  romance:  ['Romance', 'Drama', 'Comedy'],
  mystery:  ['Mystery', 'Thriller', 'Supernatural'],
  fantasy:  ['Fantasy', 'Adventure', 'Action'],
  anime:    ['Action', 'Adventure', 'Comedy', 'Fantasy'],
  cartoon:  ['Comedy', 'Adventure', 'Slice of Life'],
};

async function fetchAnilistBanner(g: PortalGenreConfig): Promise<string | null> {
  const genres = GENRE_ANILIST_OVERRIDE[g.key] || FAMILY_FRIENDLY_GENRES;

  const query = `
    query ($genres: [String], $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, genre_in: $genres, sort: POPULARITY_DESC, isAdult: false) {
          bannerImage
          coverImage { extraLarge }
        }
      }
    }
  `;

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { genres, page: 1, perPage: 12 } }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error(`[genre-backdrop] AniList ${res.status} for ${g.key}`);
      return null;
    }

    const json = await res.json();
    const media: Array<{ bannerImage?: string | null; coverImage?: { extraLarge?: string | null } | null }> =
      json?.data?.Page?.media;
    if (!Array.isArray(media) || media.length === 0) {
      console.error(`[genre-backdrop] AniList: no media for ${g.key}`);
      return null;
    }

    // Prefer banner images (wider, more cinematic for card backdrops)
    const withBanner = media.filter(m => m.bannerImage);
    const pool = withBanner.length > 0 ? withBanner : media.filter(m => m.coverImage?.extraLarge);
    if (pool.length === 0) {
      console.error(`[genre-backdrop] AniList: 0 media with images for ${g.key}`);
      return null;
    }

    const pick = pool[Math.floor(Math.random() * pool.length)];
    return pick.bannerImage || pick.coverImage?.extraLarge || null;
  } catch (err) {
    console.error(`[genre-backdrop] AniList fetch error for ${g.key}:`, err);
    return null;
  }
}

/**
 * Hardcoded fallback: family-friendly anime banners from AniList CDN.
 * All verified 200 OK. These are iconic, widely-recognized anime
 * with appropriate cover art for all audiences.
 */
const HARDCODED_BACKDROPS: Record<string, string> = {
  anime:    'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg',       // Attack on Titan
  cartoon:  'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21459-yeVkolGKdGUV.jpg',       // My Hero Academia
  horror:   'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101759-MhlCoeqnODso.jpg',     // The Promised Neverland
  romance:  'https://s4.anilist.co/file/anilistcdn/media/anime/banner/21519-1ayMXgNlmByb.jpg',      // Your Name.
  mystery:  'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1535.jpg',                    // Death Note
  fantasy:  'https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-33MtJGsUSxga.jpg',    // Demon Slayer
};

async function fetchGenreBackdrops(): Promise<Record<string, string>> {
  const backdrops: Record<string, string> = {};

  const results = await Promise.allSettled(
    PORTAL_GENRES.map(async (g) => {
      // Strategy 1: AniList family-friendly banner (primary for ALL genres)
      try {
        const url = await fetchAnilistBanner(g);
        if (url) return { key: g.key, url };
      } catch (err) {
        console.error(`[genre-backdrop] AniList failed for ${g.key}:`, err);
      }

      // Strategy 2: Hardcoded family-friendly fallback
      const fallback = HARDCODED_BACKDROPS[g.key];
      if (fallback) {
        if (process.env.NODE_ENV !== 'production') console.warn(`[genre-backdrop] Using hardcoded fallback for ${g.key}`);
        return { key: g.key, url: fallback };
      }

      console.error(`[genre-backdrop] All strategies failed for ${g.key}`);
      return null;
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      backdrops[r.value.key] = r.value.url;
    }
  }

  if (process.env.NODE_ENV !== 'production') console.log(`[genre-backdrop] Fetched ${Object.keys(backdrops).length}/${PORTAL_GENRES.length} backdrops`);
  return backdrops;
}

export default async function GenresPage() {
  const genreBackdrops = await fetchGenreBackdrops();

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'All Genres',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Genres', item: pageUrl },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GENRE_FAQ.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <style>{`
        .genre-portal-card {
          position: relative;
          display: block;
          text-decoration: none;
          border-radius: 14px;
          overflow: hidden;
          height: 220px;
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .genre-portal-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0,0,0,.4);
        }
        .genre-portal-card:hover .portal-card-img {
          transform: scale(1.08);
        }
        .genre-portal-card:hover .portal-card-overlay {
          background: linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.3) 60%, rgba(0,0,0,.15) 100%);
        }
        .portal-card-img {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .5s ease;
          z-index: 0;
        }
        .portal-card-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.25) 55%, rgba(0,0,0,.1) 100%);
          z-index: 1;
          transition: background .3s ease;
        }
        .portal-card-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 24px 20px;
          z-index: 2;
        }
        .genre-list-link {
          display: block; padding: 16px 20px; border-radius: 10px;
          text-decoration: none; transition: background .2s, border-color .2s;
        }
        .genre-list-link:hover { background: rgba(255,245,232,.06) !important; }
      `}</style>

      <div style={{
        maxWidth: 1000,
        margin: '0 auto',
        padding: 'clamp(60px,7vw,80px) 20px 60px',
      }}>
        <h1 className="f-cinzel-dec" style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
          color: '#FFF5E8',
          marginBottom: 12,
          letterSpacing: '.02em',
        }}>
          Browse by Genre
        </h1>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.9rem, 1.3vw, 1.05rem)',
          color: 'rgba(255,245,232,.55)',
          lineHeight: 1.7,
          marginBottom: 40,
        }}>
          Explore our complete catalog organized by genre. From action blockbusters to indie dramas, horror classics to anime — find exactly what you are in the mood for. Our genre portal system gives dedicated pages with custom themes for six core genres — Anime, Cartoon, Horror, Romance, Mystery, and Fantasy — while dozens of additional genres like Action, Comedy, Sci-Fi, Thriller, and Documentary are available through our TMDB-powered browse filters. Every genre page includes a curated collection of titles, genre-specific descriptions, and sub-genre tags to help you narrow your search. Whether you are planning a horror movie marathon, looking for a feel-good romance, or exploring the latest anime hits, the genre index below is your fastest path to great content.
        </p>

        {/* Portal Genres */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.1rem, 1.8vw, 1.4rem)',
          color: '#FFB347',
          marginBottom: 20,
        }}>
          Featured Genre Portals
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 48,
        }}>
          {PORTAL_GENRES.map(g => {
            const backdropUrl = genreBackdrops[g.key] || null;
            return (
              <Link
                key={g.key}
                href={`/genre/${g.key}`}
                className="genre-portal-card"
                style={{
                  border: `1px solid ${g.tc}30`,
                  background: g.col,
                }}
              >
                {/* Backdrop image — uses plain <img> for reliability.
                    These are decorative CDN-served images from TMDB/AniList that
                    are already optimized at multiple sizes. No Next.js optimization
                    needed, and plain <img> avoids potential fill/loader edge cases. */}
                {backdropUrl ? (
                  <img
                    src={backdropUrl}
                    alt=""
                    aria-hidden="true"
                    className="portal-card-img"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                {/* Dark overlay */}
                <div className="portal-card-overlay" />
                {/* Content */}
                <div className="portal-card-content">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: '1.3rem' }}>{g.em}</span>
                    <span className="f-cinzel-dec" style={{
                      fontSize: '1.1rem',
                      color: '#FFF5E8',
                      textShadow: '0 2px 8px rgba(0,0,0,.8)',
                    }}>{g.name}</span>
                  </div>
                  <p className="f-crimson" style={{
                    fontSize: '.8rem',
                    color: 'rgba(255,245,232,.7)',
                    lineHeight: 1.6,
                    margin: 0,
                    textShadow: '0 1px 4px rgba(0,0,0,.6)',
                  }}>
                    {g.description.slice(0, 120)}...
                  </p>
                  <div style={{
                    marginTop: 12,
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}>
                    {g.subGenres.slice(0, 4).map(sg => (
                      <span key={sg} style={{
                        fontSize: '.65rem',
                        padding: '2px 8px',
                        borderRadius: 20,
                        background: `${g.tc}25`,
                        color: g.tc,
                        border: `1px solid ${g.tc}40`,
                        textShadow: 'none',
                      }}>{sg}</span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* All Genres */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.1rem, 1.8vw, 1.4rem)',
          color: '#FFB347',
          marginBottom: 20,
        }}>
          All Genres
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}>
          {ALL_GENRES.map(g => (
            <Link
              key={g.key}
              href={g.slug}
              className="genre-list-link"
              style={{
                background: 'rgba(255,245,232,.03)',
                border: '1px solid rgba(255,245,232,.07)',
              }}
            >
              <div className="f-cinzel" style={{
                fontSize: '.95rem',
                color: g.color,
                marginBottom: 6,
              }}>
                {g.name}
              </div>
              <p className="f-crimson" style={{
                fontSize: '.78rem',
                color: 'rgba(255,245,232,.45)',
                lineHeight: 1.5,
                margin: 0,
              }}>
                {GENRE_DESCRIPTIONS[g.name] || 'Explore the best content in this genre on Lumovia.'}
              </p>
            </Link>
          ))}
        </div>

        {/* Genre FAQ */}
        <h2 className="f-cinzel" style={{
          fontSize: 'clamp(1.1rem, 1.8vw, 1.4rem)',
          color: '#FFF5E8',
          marginTop: 48,
          marginBottom: 20,
        }}>
          Frequently Asked Questions About Genres
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {GENRE_FAQ.map(item => (
            <details
              key={item.q}
              style={{
                background: 'rgba(255,245,232,.03)',
                border: '1px solid rgba(255,245,232,.07)',
                borderRadius: 10,
                padding: '14px 18px',
                cursor: 'pointer',
              }}
            >
              <summary className="f-cinzel" style={{
                fontSize: '.88rem',
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
                fontSize: '.83rem',
                color: 'rgba(255,245,232,.55)',
                lineHeight: 1.7,
                marginTop: 10,
                marginBottom: 0,
              }}>
                {item.a}
              </p>
            </details>
          ))}
        </div>

        {/* Cross-links for SEO */}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255,245,232,.06)' }}>
          <p className="f-crimson" style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.7, marginBottom: 12 }}>
            Explore more ways to discover content on Lumovia: browse our complete <Link href="/browse" style={{ color: '#FFB347', textDecoration: 'none' }}>catalog</Link>, check out the <Link href="/top-rated" style={{ color: '#FFB347', textDecoration: 'none' }}>top-rated titles</Link>, find the <Link href="/new-releases" style={{ color: '#FFB347', textDecoration: 'none' }}>newest releases</Link>, explore content by <Link href="/decade/2020s" style={{ color: '#FFB347', textDecoration: 'none' }}>decade</Link> or <Link href={`/year/${new Date().getFullYear()}`} style={{ color: '#FFB347', textDecoration: 'none' }}>year</Link>, track <Link href="/seasonal" style={{ color: '#FFB347', textDecoration: 'none' }}>seasonal anime</Link>, or plan your next binge with our <Link href="/release-calendar" style={{ color: '#FFB347', textDecoration: 'none' }}>release calendar</Link>.
          </p>
        </div>
      </div>
    </>
  );
}