import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, getImageUrl, type TMDBListResponse, type TMDBPerson } from '@/lib/tmdb/server';
import { personUrl } from '@/lib/slug';

export const revalidate = 3600;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/directors`;

export const metadata: Metadata = {
  title: 'Popular Directors - Top 60 Most Popular Film & TV Directors | Lumovia',
  description:
    'Explore the top 60 most popular film and television directors. Browse their profiles, filmographies, and discover the movies and shows they directed — all free on Lumovia.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Popular Directors | Lumovia',
    description: 'Browse the top 60 most popular film and TV directors. Discover their profiles, best-known titles, and complete filmographies on Lumovia.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-genres.png`, width: 1344, height: 768, alt: 'Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Popular Directors | Lumovia',
    description: 'Browse the top 60 most popular film and TV directors. Discover their profiles, best-known titles, and complete filmographies on Lumovia.',
    images: [`${siteUrl}/og/og-genres.png`],
  },
};

async function getPopularDirectors(): Promise<TMDBPerson[]> {
  const pages = await Promise.all(
    [1, 2, 3, 4, 5, 6, 7, 8].map(p =>
      tmdbFetch<TMDBListResponse<TMDBPerson>>('/person/popular', { page: String(p) }).catch(() => null)
    ),
  );

  const seen = new Set<number>();
  const directors: TMDBPerson[] = [];

  for (const page of pages) {
    if (!page) continue;
    for (const person of page.results) {
      if (!seen.has(person.id) && person.known_for_department === 'Directing') {
        seen.add(person.id);
        directors.push(person);
      }
    }
  }

  return directors
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 60);
}

function getKnownForTitles(person: TMDBPerson): string[] {
  return (person.known_for || [])
    .slice(0, 3)
    .map(item => item.title || item.name || 'Unknown')
    .filter(Boolean);
}

export default async function DirectorsPage() {
  const directors = await getPopularDirectors();

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Popular Directors',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
    mainEntity: directors.slice(0, 20).map(d => ({
      '@type': 'Person',
      name: d.name,
      url: `${siteUrl}${personUrl(d.id, d.name)}`,
      image: d.profile_path ? `https://image.tmdb.org/t/p/w185${d.profile_path}` : undefined,
      jobTitle: 'Film Director',
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Directors', item: pageUrl },
    ],
  };

  const topNames = directors.slice(0, 12).map(d => d.name).join(', ');
  const topTitles = directors
    .slice(0, 20)
    .flatMap(d => getKnownForTitles(d))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 10)
    .join(', ');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: 'clamp(60px,7vw,80px) 20px 60px',
      }}>
        {/* Hero */}
        <h1 className="f-cinzel-dec" style={{
          fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
          color: '#FFF5E8',
          marginBottom: 12,
          letterSpacing: '.02em',
        }}>
          Popular Directors
        </h1>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.95rem, 1.4vw, 1.1rem)',
          color: 'rgba(255,245,232,.7)',
          lineHeight: 1.8,
          marginBottom: 8,
          maxWidth: 800,
        }}>
          Discover the top 60 most popular film and television directors, ranked by audience engagement and trend data from TMDB. Click any director to explore their complete filmography, biography, and every project they have helmed.
        </p>
        <p className="f-crimson" style={{
          fontSize: '.88rem',
          color: 'rgba(255,245,232,.45)',
          lineHeight: 1.7,
          marginBottom: 40,
          maxWidth: 800,
        }}>
          Our directors directory curates the most sought-after filmmakers working in movies and television today. Popularity rankings are derived from TMDB&apos;s real-time algorithm, which tracks page views, search volume, and recent release buzz across millions of users worldwide. From Oscar-winning auteurs to visionary showrunners, this page showcases the creative minds behind the biggest titles in entertainment.
        </p>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 20,
          marginBottom: 64,
        }}>
          {directors.map(director => {
            const titles = getKnownForTitles(director);
            return (
              <Link
                key={director.id}
                href={personUrl(director.id, director.name)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px 12px 18px',
                  background: 'rgba(255,245,232,.04)',
                  border: '1px solid rgba(255,245,232,.08)',
                  borderRadius: 12,
                  textDecoration: 'none',
                  transition: 'background .2s, border-color .2s',
                }}
              >
                <img
                  src={getImageUrl(director.profile_path, 'w185')}
                  alt={director.name}
                  width={120}
                  height={180}
                  loading="lazy"
                  style={{
                    width: 120,
                    height: 180,
                    objectFit: 'cover',
                    borderRadius: 8,
                    marginBottom: 12,
                    background: 'rgba(255,245,232,.06)',
                  }}
                />
                <div className="f-cinzel" style={{
                  fontSize: '.85rem',
                  color: '#FFF5E8',
                  textAlign: 'center',
                  marginBottom: 4,
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {director.name}
                </div>
                <div className="f-crimson" style={{
                  fontSize: '.72rem',
                  color: '#FFB347',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}>
                  {director.known_for_department}
                </div>
                <div className="f-crimson" style={{
                  fontSize: '.72rem',
                  color: 'rgba(255,245,232,.45)',
                  textAlign: 'center',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {titles.length > 0 ? titles.join(', ') : 'No known titles'}
                </div>
              </Link>
            );
          })}
        </div>

        {/* SEO text section */}
        <section style={{ maxWidth: 800, marginBottom: 48 }}>
          <h2 className="f-cinzel" style={{
            fontSize: 'clamp(1.2rem, 2vw, 1.6rem)',
            color: '#FFF5E8',
            marginBottom: 16,
          }}>
            Explore the World&apos;s Most Popular Directors
          </h2>
          <p className="f-crimson" style={{
            fontSize: '.88rem',
            color: 'rgba(255,245,232,.55)',
            lineHeight: 1.8,
            marginBottom: 12,
          }}>
            Lumovia&apos;s directors directory highlights the {directors.length} most popular filmmakers currently trending in global entertainment. Directors are the creative visionaries behind every movie and TV show — they shape performances, guide the visual style, and craft the narrative rhythm that makes great stories unforgettable. Our rankings use TMDB&apos;s real-time popularity algorithm to surface the directors audiences are most curious about right now.
          </p>
          <p className="f-crimson" style={{
            fontSize: '.88rem',
            color: 'rgba(255,245,232,.55)',
            lineHeight: 1.8,
            marginBottom: 12,
          }}>
            Among the top directors right now are {topNames}. These filmmakers have shaped some of the most iconic movies and television series of recent years, earning both critical acclaim and massive audience appeal. Each director profile on Lumovia includes a complete list of their directing credits, full biographical information, and links to every title they have worked on — making it easy to explore their entire creative output.
          </p>
          <p className="f-crimson" style={{
            fontSize: '.88rem',
            color: 'rgba(255,245,232,.55)',
            lineHeight: 1.8,
            marginBottom: 12,
          }}>
            Notable titles from these directors include {topTitles}. Click on any director card above to visit their dedicated profile page, where you can browse their complete filmography filtered by movies or TV shows, discover similar directors, and explore every project they have been involved in. All content on Lumovia is completely free to browse — no account or subscription required.
          </p>
        </section>

        {/* Internal navigation links */}
        <nav aria-label="Explore more" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'Actors', href: '/actors' },
            { label: 'Movies', href: '/movies' },
            { label: 'TV Shows', href: '/tv-shows' },
            { label: 'Browse All', href: '/browse' },
            { label: 'Top Rated', href: '/top-rated' },
            { label: 'New Releases', href: '/new-releases' },
            { label: 'All Genres', href: '/genres' },
            { label: 'Seasonal Anime', href: '/seasonal' },
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: 'inline-block',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '.78rem',
                color: '#FFB347',
                textDecoration: 'none',
                background: 'rgba(255,245,232,.04)',
                border: '1px solid rgba(255,245,232,.08)',
                transition: 'background .2s, border-color .2s',
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}