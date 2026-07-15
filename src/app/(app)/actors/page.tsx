import type { Metadata } from 'next';
import Link from 'next/link';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { tmdbFetch, getImageUrl, type TMDBListResponse, type TMDBPerson } from '@/lib/tmdb/server';
import { personUrl } from '@/lib/slug';

export const revalidate = 3600;

const siteUrl = CANONICAL_BASE;
const pageUrl = `${siteUrl}/actors`;

export const metadata: Metadata = {
  title: 'Popular Actors & Actresses - Top 100 Most Popular Performers | Lumovia',
  description:
    'Explore the top 100 most popular actors and actresses in movies and TV shows. Browse their profiles, filmographies, and discover the titles that made them famous — all free on Lumovia.',
  alternates: { canonical: pageUrl },
  openGraph: {
    type: 'website',
    url: pageUrl,
    title: 'Popular Actors & Actresses | Lumovia',
    description: 'Browse the top 100 most popular actors and actresses. Discover their profiles, best-known roles, and complete filmographies on Lumovia.',
    siteName: 'Lumovia',
    images: [{ url: `${siteUrl}/og/og-genres.png`, width: 1344, height: 768, alt: 'Lumovia' }],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Popular Actors & Actresses | Lumovia',
    description: 'Browse the top 100 most popular actors and actresses. Discover their profiles, best-known roles, and complete filmographies on Lumovia.',
    images: [`${siteUrl}/og/og-genres.png`],
  },
};

async function getPopularActors(): Promise<TMDBPerson[]> {
  const pages = await Promise.all(
    [1, 2, 3, 4, 5].map(p =>
      tmdbFetch<TMDBListResponse<TMDBPerson>>('/person/popular', { page: String(p) }).catch(() => null)
    ),
  );

  const seen = new Set<number>();
  const unique: TMDBPerson[] = [];

  for (const page of pages) {
    if (!page) continue;
    for (const person of page.results) {
      if (!seen.has(person.id)) {
        seen.add(person.id);
        unique.push(person);
      }
    }
  }

  return unique
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 100);
}

function getKnownForTitles(person: TMDBPerson): string[] {
  return (person.known_for || [])
    .slice(0, 3)
    .map(item => item.title || item.name || 'Unknown')
    .filter(Boolean);
}

export default async function ActorsPage() {
  const actors = await getPopularActors();

  const collectionJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Popular Actors & Actresses',
    description: metadata.description,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', name: 'Lumovia', url: siteUrl },
    mainEntity: actors.slice(0, 20).map(a => ({
      '@type': 'Person',
      name: a.name,
      url: `${siteUrl}${personUrl(a.id, a.name)}`,
      image: a.profile_path ? `https://image.tmdb.org/t/p/w185${a.profile_path}` : undefined,
    })),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Actors', item: pageUrl },
    ],
  };

  const topNames = actors.slice(0, 12).map(a => a.name).join(', ');
  const topTitles = actors
    .slice(0, 20)
    .flatMap(a => getKnownForTitles(a))
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
          Popular Actors &amp; Actresses
        </h1>
        <p className="f-crimson" style={{
          fontSize: 'clamp(.95rem, 1.4vw, 1.1rem)',
          color: 'rgba(255,245,232,.7)',
          lineHeight: 1.8,
          marginBottom: 8,
          maxWidth: 800,
        }}>
          Discover the top 100 most popular performers in movies and TV shows, ranked by fan engagement and trend data from TMDB. Click any actor to explore their complete filmography, biography, and every title they have worked on.
        </p>
        <p className="f-crimson" style={{
          fontSize: '.88rem',
          color: 'rgba(255,245,232,.45)',
          lineHeight: 1.7,
          marginBottom: 40,
          maxWidth: 800,
        }}>
          This page aggregates real-time popularity data from The Movie Database (TMDB), reflecting which actors and actresses are currently trending with audiences worldwide. Rankings update hourly and take into account page views, search volume, and recent release activity. Whether you are looking for a Hollywood A-lister, a rising star from an indie hit, or a beloved character actor, you will find them here alongside the titles that made them famous.
        </p>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 20,
          marginBottom: 64,
        }}>
          {actors.map(actor => {
            const titles = getKnownForTitles(actor);
            return (
              <Link
                key={actor.id}
                href={personUrl(actor.id, actor.name)}
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
                  src={getImageUrl(actor.profile_path, 'w185')}
                  alt={actor.name}
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
                  {actor.name}
                </div>
                <div className="f-crimson" style={{
                  fontSize: '.72rem',
                  color: '#FFB347',
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                }}>
                  {actor.known_for_department}
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
            Explore the World&apos;s Most Popular Actors
          </h2>
          <p className="f-crimson" style={{
            fontSize: '.88rem',
            color: 'rgba(255,245,232,.55)',
            lineHeight: 1.8,
            marginBottom: 12,
          }}>
            Lumovia&apos;s actors directory features the {actors.length} most popular performers currently trending in the entertainment industry. Our rankings are powered by TMDB&apos;s real-time popularity algorithm, which measures audience interest across page views, search queries, and social engagement. This means the actors you see at the top of this page are the ones generating the most buzz right now — whether from a blockbuster movie premiere, a hit TV show, or viral cultural moments.
          </p>
          <p className="f-crimson" style={{
            fontSize: '.88rem',
            color: 'rgba(255,245,232,.55)',
            lineHeight: 1.8,
            marginBottom: 12,
          }}>
            Among the top performers right now are {topNames}. These actors represent the pinnacle of contemporary screen talent, with filmographies spanning decades and billions of dollars in worldwide box office. Each actor profile on Lumovia includes a detailed biography, full filmography with ratings, character names for every role, and links to every movie and TV show they have appeared in.
          </p>
          <p className="f-crimson" style={{
            fontSize: '.88rem',
            color: 'rgba(255,245,232,.55)',
            lineHeight: 1.8,
            marginBottom: 12,
          }}>
            Some of the most popular titles associated with these actors include {topTitles}. Click on any actor card above to visit their dedicated profile page, where you can browse their complete body of work, filter by movies or TV shows, and discover similar performers you might enjoy. All content on Lumovia is free to browse — no account or subscription required.
          </p>
        </section>

        {/* Internal navigation links */}
        <nav aria-label="Explore more" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'Directors', href: '/directors' },
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