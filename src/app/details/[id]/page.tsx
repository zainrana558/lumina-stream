import { notFound } from 'next/navigation';
import { tmdbToMedia } from '@/types';
import type { TMDBShow } from '@/types';
import ClientDetails from './ClientDetails';

export const revalidate = 3600;

async function fetchShow(id: number) {
  const TMDB = 'https://api.themoviedb.org/3';
  const key = process.env.TMDB_API_KEY || '';
  try {
    const res = await fetch(`${TMDB}/movie/${id}?api_key=${key}&append_to_response=credits,similar,videos`, { next: { revalidate: 3600 } });
    if (!res.ok) {
      const tvRes = await fetch(`${TMDB}/tv/${id}?api_key=${key}&append_to_response=credits,similar,videos`, { next: { revalidate: 3600 } });
      if (!tvRes.ok) return null;
      return await tvRes.json();
    }
    return await res.json();
  } catch { return null; }
}

export default async function DetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchShow(parseInt(id));
  if (!data) notFound();

  const item = tmdbToMedia(data);
  const cast = data.credits?.cast?.slice(0, 12) || [];
  const similar = (data.similar?.results || []).filter((r: TMDBShow) => r.poster_path).slice(0, 12).map((r: TMDBShow) => tmdbToMedia(r));
  const videos = data.videos?.results || [];
  const trailer = videos.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');

  return <ClientDetails item={item} cast={cast} similar={similar} trailer={trailer} />;
}
