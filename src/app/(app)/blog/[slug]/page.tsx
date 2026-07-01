/**
 * Blog — SEO Content Generator
 *
 * Dynamically generates SEO-optimized blog/review pages for every movie/TV show.
 * Each page targets long-tail keywords like:
 *   - "watch [title] online free"
 *   - "[title] streaming free no sign up"
 *   - "where to stream [title] 2024"
 *
 * Pages are rendered server-side (SSR) so Google indexes them.
 * Revalidation: 1 hour.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { tmdbFetch, tmdbFetchRaw } from '@/lib/tmdb/server';
import { getAnimeDetail } from '@/lib/anilist/client';
import { CANONICAL_BASE, SITE_NAME } from '@/lib/seo/constants';
import BlogPost from './BlogPost';
import { stripHtml } from '@/lib/seo/metadata';
import { isAnilistId, toAnilistId } from '@/types';

export const revalidate = 3600; // 1 hour

// ═══ Blog post templates for variety ═══
const TEMPLATES = {
  review: (title: string, year: string, overview: string, genres: string, rating: string, type: string) => `
<h2>Is ${title} Worth Watching in ${new Date().getFullYear()}?</h2>
<p>Absolutely. ${title}${year ? ` (${year})` : ''} is a ${type} that delivers on every front. ${overview}</p>
<h2>What Makes ${title} Special</h2>
<p>With a rating of ⭐ ${rating}/10, this ${genres?.split(',')[0] || type} has earned its place among the best in its genre. Whether you're a longtime fan or discovering it for the first time, ${title} offers an experience that stays with you.</p>
<h2>Where to Watch ${title} Online Free</h2>
<p>You can stream ${title} right now on <strong>Lumina Stream</strong> — no registration, no subscription, no hidden fees. Just click and watch.</p>
<p>Lumina Stream offers <strong>270+ movies and TV shows</strong> across all genres: action, comedy, horror, anime, sci-fi, romance, and more. All free, all HD.</p>
<h2>Why Choose Lumina Stream?</h2>
<ul>
  <li>✅ 100% free — no credit card needed</li>
  <li>✅ HD streaming quality</li>
  <li>✅ Works on mobile, tablet, and desktop</li>
  <li>✅ New titles added weekly</li>
  <li>✅ No account required</li>
</ul>
`,

  listicle: (title: string, year: string, overview: string, genres: string, rating: string, type: string) => `
<h2>1. ${title}${year ? ` (${year})` : ''}</h2>
<p>⭐ ${rating}/10 | ${genres || type}</p>
<p>${overview}</p>
<p>This ${type} is a must-watch for fans of ${genres?.split(',')[0] || 'great entertainment'}. Stream it free on Lumina Stream today.</p>
<h2>How to Watch These Movies & Shows Free</h2>
<p>All titles mentioned above are available on <strong>Lumina Stream</strong> — a free streaming platform with 270+ movies, TV shows, anime, and cartoons.</p>
<p>No sign-up. No subscription. Just free entertainment.</p>
`,

  guide: (title: string, year: string, overview: string, genres: string, rating: string, type: string) => `
<h2>Why ${title} Is a Must-Watch</h2>
<p>${overview}</p>
<h2>Quick Facts About ${title}</h2>
<ul>
  <li><strong>Type:</strong> ${type === 'tv' ? 'TV Series' : type === 'anime' ? 'Anime' : 'Movie'}</li>
  <li><strong>Genre:</strong> ${genres || 'Various'}</li>
  <li><strong>Rating:</strong> ⭐ ${rating}/10</li>
  ${year ? `<li><strong>Year:</strong> ${year}</li>` : ''}
</ul>
<h2>The Easiest Way to Stream ${title}</h2>
<p>Skip the subscriptions. Skip the sign-ups. <strong>Lumina Stream</strong> lets you watch ${title} instantly — free, HD, no strings attached.</p>
<p>Browse 270+ titles across every genre. New content added every week.</p>
`,
};

function generateBlogContent(show: {
  title: string;
  year?: string;
  overview: string;
  genres?: string;
  rating: string;
  type: 'movie' | 'tv' | 'anime';
}): string {
  const templates = [TEMPLATES.review, TEMPLATES.listicle, TEMPLATES.guide];
  // Deterministic template pick based on title so same show always gets same template
  const idx = show.title.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % templates.length;
  const template = templates[idx];

  return `<article class="blog-content">
${template(
    show.title,
    show.year || '',
    show.overview || 'A must-watch title available for free streaming.',
    show.genres || 'Entertainment',
    show.rating,
    show.type
  )}
<div class="cta-block" style="margin-top:32px;padding:24px;border-radius:12px;background:linear-gradient(135deg,rgba(255,179,71,.1),rgba(139,120,255,.1));border:1px solid rgba(255,179,71,.2);text-align:center">
  <p style="font-size:1.1rem;font-weight:700;color:#FFB347;margin:0 0 8px">🎬 Ready to Watch?</p>
  <p style="margin:0 0 16px;color:rgba(255,245,232,.7)">Stream ${show.title} and 270+ more titles — completely free.</p>
  <a href="/details/${show.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}" style="display:inline-block;padding:12px 32px;border-radius:50px;background:linear-gradient(175deg,#FFE566,#FFB347,#E07200);color:#05020A;font-weight:700;text-decoration:none;font-size:.9rem">▶ Watch Now</a>
</div>
</article>`;
}

// ═══ Data fetching ═══
async function fetchShowData(slug: string) {
  // Try to match slug to a TMDB ID or title
  const query = slug.replace(/-/g, ' ');

  try {
    // Search TMDB
    const data = await tmdbFetchRaw<{ results: Array<{
      id: number;
      title?: string;
      name?: string;
      overview: string;
      poster_path: string | null;
      backdrop_path: string | null;
      vote_average: number;
      genre_ids?: number[];
      release_date?: string;
      first_air_date?: string;
      media_type?: string;
    }> }>('/search/multi', { query, page: '1' });

    const results = data?.results || [];
    if (results.length === 0) return null;

    const show = results[0];
    const title = show.title || show.name || query;
    const year = (show.release_date || show.first_air_date || '').slice(0, 4);
    const type = show.media_type === 'tv' ? 'tv' : 'movie';

    // Genre names (simplified — full genre map would be in a real implementation)
    const genreMap: Record<number, string> = {
      28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
      80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
      14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
      9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
      53: 'Thriller', 10752: 'War', 37: 'Western',
    };
    const genres = (show.genre_ids || []).map((g: number) => genreMap[g] || '').filter(Boolean).join(', ');

    return {
      id: show.id,
      title,
      year,
      overview: show.overview || '',
      genres,
      rating: show.vote_average?.toFixed(1) || '7.5',
      type: type as 'movie' | 'tv',
      poster: show.poster_path,
      backdrop: show.backdrop_path,
    };
  } catch {
    return null;
  }
}

// ═══ Page ═══
interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const show = await fetchShowData(slug);

  if (!show) {
    return { title: 'Blog — Lumina Stream', robots: { index: false } };
  }

  const title = `Watch ${show.title}${show.year ? ` (${show.year})` : ''} Online Free — No Sign Up`;
  const description = `Stream ${show.title} free on Lumina Stream. ${show.overview?.slice(0, 120)}... No registration, HD quality. Watch now!`;

  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      type: 'article',
      url: `${CANONICAL_BASE}/blog/${slug}`,
      siteName: SITE_NAME,
      images: show.poster ? [{ url: `https://image.tmdb.org/t/p/w500${show.poster}`, width: 500, height: 750 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.slice(0, 160),
    },
  };
}

export default async function BlogSlugPage({ params }: Props) {
  const { slug } = await params;
  const show = await fetchShowData(slug);

  if (!show) notFound();

  const content = generateBlogContent({
    title: show.title,
    year: show.year,
    overview: show.overview,
    genres: show.genres,
    rating: show.rating,
    type: show.type,
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Watch ${show.title} Online Free`,
    description: show.overview?.slice(0, 200),
    image: show.poster ? `https://image.tmdb.org/t/p/w500${show.poster}` : undefined,
    datePublished: new Date().toISOString().split('T')[0],
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: CANONICAL_BASE,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BlogPost show={show} content={content} />
    </>
  );
}
