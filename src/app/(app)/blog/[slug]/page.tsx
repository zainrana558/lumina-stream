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
import { getArticleBySlug, blogArticles } from '@/content/blog-articles';
import type { BlogArticle } from '@/content/blog-articles';

export const revalidate = 3600; // 1 hour

// ═══ Blog post templates for variety ═══
const TEMPLATES = {
  review: (title: string, year: string, overview: string, genres: string, rating: string, type: string) => `
<h1>Is ${title} Worth Watching in ${new Date().getFullYear()}?</h1>
<p>Absolutely. ${title}${year ? ` (${year})` : ''} is a ${type} that delivers on every front. ${overview} Whether you are a dedicated fan of ${genres?.split(',')[0]?.trim() || 'great entertainment'} or simply looking for something new to watch this weekend, ${title} offers an experience that stays with you long after the credits roll.</p>
<h2>What Makes ${title} Special</h2>
<p>With a rating of ${rating}/10 on TMDB, this ${genres?.split(',')[0]?.trim() || type} has earned its place among the best in its genre. Critics and audiences alike have praised its storytelling, performances, and production values. Whether you are a longtime fan or discovering it for the first time, ${title} offers something truly memorable.</p>
<h2>Complete Cast and Crew Information</h2>
<p>Lumovia provides comprehensive cast and crew details for ${title}, including full filmographies for every cast member, character names, and links to other projects they have worked on. You can click on any cast member to explore their entire body of work across movies and TV shows.</p>
<h2>Episode Guides and Season Information</h2>
<p>For TV series like ${title}, Lumovia offers detailed episode guides with air dates, synopses, ratings, and runtime information for every episode across all seasons. Navigate between episodes easily and track your viewing progress.</p>
<h2>Where to Watch ${title} Online Free</h2>
<p>You can explore ${title} right now on Lumovia — no registration, no subscription, no hidden fees. Our platform provides the most comprehensive information about ${title} available online, all completely free.</p>
<p>Lumovia offers thousands of movies and TV shows across all genres: action, comedy, horror, anime, sci-fi, romance, mystery, fantasy, and more. All content is powered by TMDB and AniList, the two largest entertainment databases in the world, ensuring accurate and up-to-date information.</p>
<h2>Why Choose Lumovia?</h2>
<ul>
  <li>100% free — no credit card needed</li>
  <li>Detailed information for thousands of titles</li>
  <li>Works on mobile, tablet, and desktop</li>
  <li>New titles added multiple times per hour</li>
  <li>Comprehensive cast and crew data</li>
  <li>Episode guides for all TV series</li>
</ul>
`,

  listicle: (title: string, year: string, overview: string, genres: string, rating: string, type: string) => `
<h2>${title}${year ? ` (${year})` : ''} — A Must-Watch ${type === 'tv' ? 'TV Series' : 'Movie'}</h2>
<p>Rating: ${rating}/10 on TMDB | Genre: ${genres || type}</p>
<p>${overview}</p>
<p>This ${type === 'tv' ? 'series' : 'film'} is a standout in the ${genres?.split(',')[0]?.trim() || 'entertainment'} category. With its compelling narrative, strong performances, and high production values, ${title} has captured the attention of audiences worldwide and earned a well-deserved ${rating}/10 rating from TMDB users. Whether you are planning a movie night or a weekend binge-watching session, this title deserves a spot on your watchlist.</p>
<h2>Detailed Information on Lumovia</h2>
<p>On Lumovia, you will find everything you need to know about ${title}: a full plot summary, complete cast and crew list with links to their other projects, user ratings and reviews, similar title recommendations, and for TV series, a complete episode guide with individual synopses and air dates. All of this information is available for free, with no account required.</p>
<h2>More Titles Like ${title}</h2>
<p>If you enjoy ${title}, Lumovia makes it easy to discover similar titles. Our detail pages include a "You Might Also Like" section powered by TMDB recommendation algorithms, plus genre-based browsing that helps you find more of what you love. Explore our genre portals for Anime, Horror, Romance, Mystery, Fantasy, and Cartoons — each with custom-themed pages and curated collections.</p>
`,

  guide: (title: string, year: string, overview: string, genres: string, rating: string, type: string) => `
<h2>Why ${title} Is a Must-Watch</h2>
<p>${overview}</p>
<h2>Quick Facts About ${title}</h2>
<ul>
  <li><strong>Type:</strong> ${type === 'tv' ? 'TV Series' : type === 'anime' ? 'Anime' : 'Movie'}</li>
  <li><strong>Genre:</strong> ${genres || 'Various'}</li>
  <li><strong>Rating:</strong> ${rating}/10 on TMDB</li>
  ${year ? `<li><strong>Year:</strong> ${year}</li>` : ''}
</ul>
<h2>Everything You Need to Know About ${title}</h2>
<p>Lumovia provides the most comprehensive information about ${title} available anywhere online. From detailed plot summaries and cast filmographies to episode guides and similar title recommendations, we have everything you need to decide what to watch next. Our data is sourced directly from TMDB and AniList, the world's largest entertainment databases, and updated multiple times per hour to ensure accuracy.</p>
<h2>The Easiest Way to Explore ${title}</h2>
<p>Skip the subscriptions. Skip the sign-ups. Lumovia lets you explore ${title} instantly — free, with rich details including cast information, ratings, trailers, and episode guides. Browse thousands of titles across every genre including Action, Comedy, Drama, Horror, Romance, Sci-Fi, Thriller, Mystery, Fantasy, Anime, and Cartoons.</p>
`,
};

function generateBlogContent(show: {
  id: number;
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
  <p style="margin:0 0 16px;color:rgba(255,245,232,.7)">Stream ${show.title} and thousands of more titles — completely free.</p>
  <a href="/details/${show.id}" style="display:inline-block;padding:12px 32px;border-radius:50px;background:linear-gradient(175deg,#FFE566,#FFB347,#E07200);color:#05020A;font-weight:700;text-decoration:none;font-size:.9rem">▶ Watch Now</a>
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

  // Check for curated article first
  const curated = getArticleBySlug(slug);
  if (curated) {
    const title = curated.title;
    const description = curated.description;
    const pageUrl = `${CANONICAL_BASE}/blog/${slug}`;
    return {
      title,
      description: description.slice(0, 160),
      alternates: { canonical: pageUrl },
      openGraph: {
        title,
        description: description.slice(0, 160),
        type: 'article',
        url: pageUrl,
        siteName: SITE_NAME,
        publishedTime: curated.date,
        tags: curated.tags,
      },
      twitter: {
        card: 'summary_large_image' as const,
        title,
        description: description.slice(0, 160),
      },
    };
  }

  const show = await fetchShowData(slug);

  if (!show) {
    return { title: 'Blog — Lumovia', robots: { index: false } };
  }

  const title = `Watch ${show.title}${show.year ? ` (${show.year})` : ''} Online Free — No Sign Up`;
  const description = `Stream ${show.title} free on Lumovia. ${show.overview?.slice(0, 120)}... No registration, HD quality. Watch now!`;

  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical: `${CANONICAL_BASE}/blog/${slug}` },
    openGraph: {
      title,
      description: description.slice(0, 160),
      type: 'article',
      url: `${CANONICAL_BASE}/blog/${slug}`,
      siteName: SITE_NAME,
      images: show.poster ? [{ url: `https://image.tmdb.org/t/p/w500${show.poster}`, width: 500, height: 750 }] : [],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description: description.slice(0, 160),
      images: show.poster ? [`https://image.tmdb.org/t/p/w500${show.poster}`] : [],
    },
  };
}

export default async function BlogSlugPage({ params }: Props) {
  const { slug } = await params;

  // Check for curated article first
  const curated = getArticleBySlug(slug);
  if (curated) {
    return <CuratedArticlePage article={curated} />;
  }

  const show = await fetchShowData(slug);

  if (!show) notFound();

  const content = generateBlogContent({
    id: show.id,
    title: show.title,
    year: show.year,
    overview: show.overview,
    genres: show.genres,
    rating: show.rating,
    type: show.type,
  });

  const today = new Date().toISOString().split('T')[0];
  const pageUrl = `${CANONICAL_BASE}/blog/${slug}`;

  const faqItems = [
    {
      '@type': 'Question',
      name: `Is ${show.title} available to stream for free?`,
      acceptedAnswer: { '@type': 'Answer', text: `Yes, you can discover and explore ${show.title} on Lumovia for free. Our platform provides detailed information about ${show.title} including ratings, cast, trailers, and episode guides.` },
    },
    {
      '@type': 'Question',
      name: `What is ${show.title} about?`,
      acceptedAnswer: { '@type': 'Answer', text: show.overview?.slice(0, 300) || `${show.title} is a ${show.type === 'tv' ? 'TV series' : 'movie'} available to explore on Lumovia.` },
    },
    {
      '@type': 'Question',
      name: `What genre is ${show.title}?`,
      acceptedAnswer: { '@type': 'Answer', text: `${show.title} falls under the ${show.genres || 'entertainment'} genre. Browse more ${show.genres?.split(',')[0]?.trim() || ''} titles on Lumovia's genre pages.` },
    },
  ];

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Watch ${show.title}${show.year ? ` (${show.year})` : ''} Online Free`,
    description: show.overview?.slice(0, 200),
    image: show.poster ? `https://image.tmdb.org/t/p/w500${show.poster}` : undefined,
    datePublished: show.year ? `${show.year}-01-01` : today,
    dateModified: today,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: CANONICAL_BASE,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: CANONICAL_BASE,
      logo: {
        '@type': 'ImageObject',
        url: `${CANONICAL_BASE}/logo.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: CANONICAL_BASE },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${CANONICAL_BASE}/blog` },
      { '@type': 'ListItem', position: 3, name: show.title, item: pageUrl },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <BlogPost show={show} content={content} />
    </>
  );
}

// ═══ Curated Article Page ═══
function CuratedArticlePage({ article }: { article: BlogArticle }) {
  const pageUrl = `${CANONICAL_BASE}/blog/${article.slug}`;

  const showData = {
    id: 0,
    title: article.title,
    year: article.date.slice(0, 4),
    overview: article.description,
    genres: article.category,
    rating: '-',
    type: 'movie' as const,
    poster: null,
    backdrop: null,
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.date,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: CANONICAL_BASE,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: CANONICAL_BASE,
      logo: {
        '@type': 'ImageObject',
        url: `${CANONICAL_BASE}/logo.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
    keywords: article.tags.join(', '),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: CANONICAL_BASE },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${CANONICAL_BASE}/blog` },
      { '@type': 'ListItem', position: 3, name: article.title, item: pageUrl },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is "${article.title}" about?`,
        acceptedAnswer: { '@type': 'Answer', text: article.description },
      },
      {
        '@type': 'Question',
        name: 'Where can I find more articles like this?',
        acceptedAnswer: { '@type': 'Answer', text: 'Browse the Lumovia blog for more curated articles, streaming guides, movie reviews, and recommendations across all genres.' },
      },
    ],
  };

  const curatedContent = `<article class="blog-content">
${article.content}
<div class="cta-block" style="margin-top:32px;padding:24px;border-radius:12px;background:linear-gradient(135deg,rgba(255,179,71,.1),rgba(139,120,255,.1));border:1px solid rgba(255,179,71,.2);text-align:center">
  <p style="font-size:1.1rem;font-weight:700;color:#FFB347;margin:0 0 8px">🎬 Explore More on Lumovia</p>
  <p style="margin:0 0 16px;color:rgba(255,245,232,.7)">Discover thousands of movies, TV shows, and anime — completely free.</p>
  <a href="/browse" style="display:inline-block;padding:12px 32px;border-radius:50px;background:linear-gradient(175deg,#FFE566,#FFB347,#E07200);color:#05020A;font-weight:700;text-decoration:none;font-size:.9rem">▶ Browse Catalog</a>
</div>
</article>`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <BlogPost show={showData} content={curatedContent} />
    </>
  );
}
