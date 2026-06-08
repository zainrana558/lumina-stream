import { tmdbFetch } from '@/lib/tmdb/server';
import type { Metadata } from 'next';
import PersonPageClient from '@/components/pages/PersonPage';

export const revalidate = 86400; // 24h — person details rarely change

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const personId = Number(id);
  try {
    const data = await tmdbFetch<{ name: string; biography?: string }>(`/person/${personId}`).catch(() => ({ name: 'Person', biography: '' as string | undefined }));
    const bio = data.biography || '';
    return {
      title: `${data.name} | Lumina Stream`,
      description: bio.slice(0, 160) || `View details and filmography for ${data.name} on Lumina Stream.`,
      openGraph: {
        title: `${data.name} | Lumina Stream`,
        description: bio.slice(0, 160),
      },
    };
  } catch {
    return { title: 'Person | Lumina Stream' };
  }
}

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const personId = Number(id);

  try {
    const data = await tmdbFetch<{
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

    return <PersonPageClient person={data} />;
  } catch {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: '1.2rem', color: 'rgba(255,245,232,.4)' }}>Person not found</div>
      </div>
    );
  }
}
