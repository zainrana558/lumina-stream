import type { Metadata } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import Link from 'next/link';
import { PORTAL_GENRES, BROWSE_ONLY_GENRES, TMDB_GENRE_ID_MAP } from '@/config/genres';

export const revalidate = 86400;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/genres`;

export const metadata: Metadata = {
  title: 'All Genres - Browse by Genre | Lumina Stream',
  description:
    'Explore all genres available on Lumina Stream. Browse movies and TV shows by Action, Comedy, Drama, Horror, Romance, Sci-Fi, Thriller, Mystery, Fantasy, Anime, Cartoons, and more.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'All Genres | Lumina Stream',
    description: 'Browse all genres — Action, Comedy, Drama, Horror, Romance, Sci-Fi, and more.',
    siteName: 'Lumina Stream',
    images: [{ url: `${siteUrl}/og/og-genres.png`, width: 1344, height: 768, alt: 'All Genres on Lumina Stream' }],
  },
  twitter: { card: 'summary_large_image', title: 'All Genres | Lumina Stream', description: 'Browse all genres on Lumina Stream.' },
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

export default function GenresPage() {
  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'All Genres',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumina Stream', url: siteUrl },
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Genres', item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <style>{`
        .genre-portal-link {
          display: block; text-decoration: none; border-radius: 12px;
          padding: 24px 20px; transition: transform .2s, border-color .2s;
        }
        .genre-portal-link:hover { transform: translateY(-2px); }
        .genre-portal-link:hover .portal-border { border-color: var(--tc-60) !important; }
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
          Explore our complete catalog organized by genre. From action blockbusters to indie dramas, horror classics to anime — find exactly what you are in the mood for.
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
          {PORTAL_GENRES.map(g => (
            <Link
              key={g.key}
              href={`/genre/${g.key}`}
              className="genre-portal-link"
              style={{ '--tc-60': `${g.tc}60`, background: g.col } as React.CSSProperties}
            >
              <div className="portal-border" style={{ border: `1px solid ${g.tc}30`, borderRadius: 12, padding: '24px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: '1.3rem' }}>{g.em}</span>
                <span className="f-cinzel-dec" style={{
                  fontSize: '1.1rem',
                  color: '#FFF5E8',
                }}>{g.name}</span>
              </div>
              <p className="f-crimson" style={{
                fontSize: '.8rem',
                color: 'rgba(255,245,232,.6)',
                lineHeight: 1.6,
                margin: 0,
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
                    background: `${g.tc}20`,
                    color: g.tc,
                    border: `1px solid ${g.tc}30`,
                  }}>{sg}</span>
                ))}
              </div>
              </div>
            </Link>
          ))}
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
                {GENRE_DESCRIPTIONS[g.name] || 'Explore the best content in this genre on Lumina Stream.'}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}