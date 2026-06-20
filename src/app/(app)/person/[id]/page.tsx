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
    const data = await tmdbFetch<{ name: string; biography?: string; profile_path?: string | null }>(`/person/${personId}`).catch(() => ({ name: 'Person', biography: '' as string | undefined, profile_path: null }));
    const bio = data.biography || '';
    const profileImg = data.profile_path ? `https://image.tmdb.org/t/p/w600_and_h900_bestv2${data.profile_path}` : undefined;
    return {
      title: `${data.name}`,
      description: bio.slice(0, 160) || `View details and filmography for ${data.name} on Lumina Stream.`,
      alternates: { canonical: pageUrl },
      openGraph: {
        type: 'profile',
        url: pageUrl,
        title: `${data.name} | Lumina Stream`,
        description: bio.slice(0, 160) || `View details and filmography for ${data.name} on Lumina Stream.`,
        siteName: 'Lumina Stream',
        images: profileImg ? [{ url: profileImg, width: 600, height: 900, alt: data.name }] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${data.name} | Lumina Stream`,
        description: bio.slice(0, 160),
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
  };
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: data.name, item: `${siteUrl}/person/${personId}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <PersonPageClient person={data} />
    </>
  );
}