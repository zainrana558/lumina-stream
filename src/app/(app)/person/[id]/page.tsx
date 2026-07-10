import { tmdbFetch } from '@/lib/tmdb/server';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import type { Metadata } from 'next';
import PersonPageClient from '@/components/pages/PersonPage';

export const revalidate = 86400; // 24h — person details rarely change

const siteUrl = CANONICAL_BASE;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const personId = Number(id);
  const pageUrl = `${siteUrl}/person/${id}`;
  try {
    const data = await tmdbFetch<{ name: string; biography?: string; profile_path?: string | null; known_for_department?: string }>(`/person/${personId}`).catch(() => ({ name: 'Person', biography: '' as string | undefined, profile_path: null, known_for_department: undefined as string | undefined }));
    const bio = data.biography || '';
    const cleanBio = bio.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s{2,}/g, ' ').trim();
    const profileImg = data.profile_path ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${data.profile_path}` : undefined;
    const dept = data.known_for_department || '';
    const deptLabel = dept.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
    const desc = cleanBio.length > 100
      ? cleanBio.slice(0, 155) + '...'
      : `Explore the complete filmography and biography of ${data.name} on Lumina Stream. ${deptLabel ? `Known for ${deptLabel}.` : ''} View all movies and TV shows featuring ${data.name}, with ratings, trailers, and recommendations.`;
    return {
      title: `${data.name} - Movies, TV Shows & Biography`,
      description: desc,
      alternates: { canonical: pageUrl },
      openGraph: {
        type: 'profile',
        url: pageUrl,
        title: `${data.name} - Movies, TV Shows & Biography | Lumina Stream`,
        description: desc,
        siteName: 'Lumina Stream',
        images: profileImg ? [{ url: profileImg, width: 600, height: 900, alt: `${data.name} on Lumina Stream` }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${data.name} | Lumina Stream`,
        description: desc,
        images: profileImg ? [profileImg] : [],
      },
    };
  } catch {
    return { title: 'Person', alternates: { canonical: pageUrl } };
  }
}

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const personId = Number(id);

  // Fetch data outside try/catch to avoid JSX in try/catch
  type PersonData = {
    id: number; name: string; profile_path: string | null; biography: string;
    birthday: string | null; deathday: string | null; place_of_birth: string | null;
    homepage: string | null; also_known_as: string[]; known_for_department: string;
    combined_credits?: { cast: Array<{ id: number; title?: string; name?: string; poster_path: string | null; backdrop_path: string | null; media_type: 'movie' | 'tv'; character?: string; job?: string; department?: string; episode_count?: number; vote_average?: number; release_date?: string; first_air_date?: string; genre_ids?: number[]; popularity?: number; overview?: string }>; crew: Array<{ id: number; title?: string; name?: string; poster_path: string | null; media_type: 'movie' | 'tv'; job?: string; department?: string; popularity?: number }> };
  };
  let data: PersonData | null = null;
  let notFound = false;

  try {
    data = await tmdbFetch<{
      id: number;
      name: string;
      profile_path: string | null;
      biography: string;
      birthday: string | null;
      deathday: string | null;
      place_of_birth: string | null;
      homepage: string | null;
      also_known_as: string[];
      known_for_department: string;
      combined_credits?: {
        cast: Array<{
          id: number;
          title?: string;
          name?: string;
          poster_path: string | null;
          backdrop_path: string | null;
          media_type: 'movie' | 'tv';
          character?: string;
          job?: string;
          department?: string;
          episode_count?: number;
          vote_average?: number;
          release_date?: string;
          first_air_date?: string;
          genre_ids?: number[];
          popularity?: number;
          overview?: string;
        }>;
        crew: Array<{
          id: number;
          title?: string;
          name?: string;
          poster_path: string | null;
          media_type: 'movie' | 'tv';
          job?: string;
          department?: string;
          popularity?: number;
        }>;
      };
    }>(`/person/${personId}`, { append_to_response: 'combined_credits' });
  } catch {
    notFound = true;
  }

  if (notFound || !data) {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div className="f-cinzel" style={{  fontSize: '1.2rem', color: 'rgba(255,245,232,.4)' }}>Person not found</div>
      </div>
    );
  }

  // Person JSON-LD
  const personJsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: data.name,
    url: `${siteUrl}/person/${personId}`,
    image: data.profile_path ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${data.profile_path}` : undefined,
    jobTitle: data.known_for_department || undefined,
    description: data.biography || undefined,
    birthDate: data.birthday || undefined,
    birthPlace: data.place_of_birth || undefined,
    ...(data.deathday ? { deathDate: data.deathday } : {}),
    ...(data.homepage ? { sameAs: [data.homepage] } : {}),
    ...(data.also_known_as?.length ? { alternateName: data.also_known_as } : {}),
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: data.name, item: `${siteUrl}/person/${personId}` },
    ],
  };

  // Build server-rendered SEO text from fetched data
  const castCredits = data.combined_credits?.cast || [];
  const crewCredits = data.combined_credits?.crew || [];
  const totalCredits = castCredits.length + crewCredits.length;
  const movieCount = [...castCredits, ...crewCredits].filter(c => c.media_type === 'movie').length;
  const tvCount = [...castCredits, ...crewCredits].filter(c => c.media_type === 'tv').length;

  // Get top known-for titles (by popularity) WITH IDs for links
  const knownFor = [...castCredits]
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, 10)
    .map(c => ({ id: c.id, title: c.title || c.name || 'Untitled', mediaType: c.media_type, character: c.character, year: (c.release_date || c.first_air_date)?.slice(0, 4) }));

  const cleanBio = (data.biography || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const birthDate = formatDate(data.birthday);
  const age = data.birthday
    ? `${Math.floor((new Date(data.deathday || new Date().toISOString()).getTime() - new Date(data.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years old`
    : null;

  const deptLabel = data.known_for_department
    ? data.known_for_department.replace(/([A-Z])/g, ' $1').trim().toLowerCase()
    : null;

  // Build FAQ for person (AFTER all variables are defined)
  const personFaq = [
    {
      q: `Who is ${data.name}?`,
      a: `${data.name} is a${deptLabel ? ` ${deptLabel}` : ''} with ${totalCredits} credits on Lumina Stream, spanning ${movieCount} movie${movieCount !== 1 ? 's' : ''} and ${tvCount} TV show${tvCount !== 1 ? 's' : ''}. ${birthDate ? `Born ${birthDate}${data.place_of_birth ? ` in ${data.place_of_birth}` : ''}.` : ''} ${knownFor.length > 0 ? `Best known for ${knownFor.slice(0, 3).map(k => k.title).join(', ')}.` : ''}`,
    },
    {
      q: `What are the best movies and TV shows featuring ${data.name}?`,
      a: `${data.name} has appeared in ${movieCount} movies and ${tvCount} TV shows. Some of their most popular credits include ${knownFor.slice(0, 5).map(k => `${k.title} (${k.year || 'TBD'})`).join(', ')}. Browse the complete filmography below to explore every title.`,
    },
    ...(cleanBio.length > 30 ? [{
      q: `What is ${data.name}'s background?`,
      a: cleanBio.length > 300 ? cleanBio.slice(0, 297) + '...' : cleanBio,
    }] : []),
    {
      q: `Where can I find ${data.name}'s complete filmography?`,
      a: `The complete filmography of ${data.name} is available right here on Lumina Stream. Scroll down to browse all ${totalCredits} credits organized by media type, with links to every movie and TV show page featuring full details, ratings, cast, and trailers.`,
    },
  ];

  const personFaqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: personFaq.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personFaqJsonLd) }} />

      {/* Server-rendered SEO content — visible to Googlebot without JS */}
      <section
        aria-label={`Biography of ${data.name}`}
        style={{
          maxWidth: 1000,
          margin: '0 auto',
          padding: 'clamp(60px,7vw,80px) 20px 0',
        }}
      >
        <h1 className="f-cinzel-dec" style={{
          fontSize: 'clamp(1.8rem,4vw,2.8rem)',
          color: '#FFF5E8',
          marginBottom: 12,
          letterSpacing: '.02em',
        }}>
          {data.name}
        </h1>

        {/* Fact line */}
        <div className="f-crimson" style={{
          fontSize: '.88rem',
          color: 'rgba(255,245,232,.5)',
          lineHeight: 1.7,
          marginBottom: 16,
        }}>
          {[birthDate, data.place_of_birth, age, deptLabel && `Known for ${deptLabel}`].filter(Boolean).join(' \u00B7 ')}
        </div>

        {/* Bio excerpt */}
        {cleanBio && (
          <p className="f-crimson" style={{
            fontSize: 'clamp(.9rem,1.3vw,1.05rem)',
            color: 'rgba(255,245,232,.55)',
            lineHeight: 1.75,
            maxWidth: 800,
            marginBottom: 20,
          }}>
            {cleanBio.length > 600 ? cleanBio.slice(0, 600) + '...' : cleanBio}
          </p>
        )}

        {/* Filmography summary */}
        <p className="f-crimson" style={{
          fontSize: '.88rem',
          color: 'rgba(255,245,232,.45)',
          lineHeight: 1.7,
          maxWidth: 800,
          marginBottom: 12,
        }}>
          {data.name} has {totalCredits} credits on Lumina Stream spanning {movieCount} movie{movieCount !== 1 ? 's' : ''} and {tvCount} TV show{tvCount !== 1 ? 's' : ''}.
          {knownFor.length > 0 && ` Best known for ${knownFor.slice(0, 3).map(k => k.title).join(', ')}${knownFor.length > 3 ? ` and ${knownFor.length - 3} more` : ''}.`}
          {' '}Browse the complete filmography below, filter by cast or crew roles, and sort by popularity or release year. Click any title to view its full details page with cast, ratings, trailers, and similar recommendations.
        </p>

        {/* Known For — with internal links */}
        {knownFor.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div className="f-cinzel" style={{ fontSize: '.82rem', color: '#FFB347', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
              Known For
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {knownFor.slice(0, 8).map(k => (
                <a key={k.id} href={`/details/${k.id}`} style={{
                  display: 'inline-block', padding: '5px 12px', borderRadius: 8,
                  fontSize: '.8rem', color: '#FFF5E8', textDecoration: 'none',
                  background: 'rgba(255,245,232,.04)', border: '1px solid rgba(255,245,232,.08)',
                  transition: 'background .2s, border-color .2s',
                }}>
                  {k.title}{k.year ? ` (${k.year})` : ''}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        {personFaq.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="f-cinzel" style={{ fontSize: '.82rem', color: '#FFB347', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12 }}>
              Frequently Asked Questions
            </div>
            {personFaq.map(item => (
              <details key={item.q} style={{
                background: 'rgba(255,245,232,.03)', border: '1px solid rgba(255,245,232,.07)',
                borderRadius: 10, padding: '12px 16px', marginBottom: 8, cursor: 'pointer',
              }}>
                <summary className="f-cinzel" style={{
                  fontSize: '.85rem', color: '#FFF5E8', listStyle: 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>{item.q}<span style={{ color: 'rgba(255,245,232,.3)', fontSize: '.8rem' }}>+</span></summary>
                <p className="f-crimson" style={{ fontSize: '.8rem', color: 'rgba(255,245,232,.5)', lineHeight: 1.7, marginTop: 8, marginBottom: 0 }}>
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        )}

        {/* Also known as */}
        {data.also_known_as && data.also_known_as.length > 0 && (
          <p className="f-crimson" style={{
            fontSize: '.82rem',
            color: 'rgba(255,245,232,.35)',
            lineHeight: 1.6,
            marginBottom: 8,
          }}>
            Also known as: {data.also_known_as.slice(0, 8).join(', ')}
          </p>
        )}

        {/* Internal navigation links for crawl density */}
        <nav aria-label="Explore more" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}>
          {[
            { label: 'Browse All', href: '/browse' },
            { label: 'Movies', href: '/movies' },
            { label: 'TV Shows', href: '/tv-shows' },
            { label: 'Top Rated', href: '/top-rated' },
            { label: 'New Releases', href: '/new-releases' },
            { label: 'Seasonal Anime', href: '/seasonal' },
            { label: 'Leaderboard', href: '/leaderboard' },
            { label: 'All Genres', href: '/genres' },
            { label: 'Release Calendar', href: '/release-calendar' },
          ].map(link => (
            <a key={link.href} href={link.href} style={{
              display: 'inline-block', padding: '6px 14px', borderRadius: 8,
              fontSize: '.78rem', color: '#FFB347', textDecoration: 'none',
              background: 'rgba(255,245,232,.04)', border: '1px solid rgba(255,245,232,.08)',
            }}>{link.label}</a>
          ))}
        </nav>
      </section>

      <PersonPageClient person={data} />
    </>
  );
}