import { CANONICAL_BASE, SITE_NAME } from '@/lib/seo/constants';
import { NextResponse } from 'next/server';

/**
 * llms.txt — a plain-Markdown map of the site for AI crawlers/agents.
 *
 * Scoped deliberately small: as of research done in 2026, no major AI lab
 * (OpenAI, Anthropic, Google, Meta, Perplexity) has confirmed reading this
 * file in production, and independent analysis found ~97% of llms.txt
 * requests go unanswered by any known crawler — server logs show most AI
 * systems don't check for it at all. It's treated here as cheap hygiene
 * (a clean, honest summary costs nothing and can't hurt), not a strategy —
 * actual AI-citation visibility comes from crawlable content, structured
 * data, and freshness (see robots.txt for the crawler-access side of that).
 */
export async function GET() {
  const body = `# ${SITE_NAME}

> Lumovia is a free streaming catalog and content-discovery platform for movies, TV shows, anime, and cartoons, aggregating data from TMDB and AniList. It does not host or stream video itself — it is a discovery/metadata layer (ratings, cast, trailers, episode guides, recommendations) linking out to third-party players.

## Core sections

- [Browse](${CANONICAL_BASE}/browse): the full catalog with genre, country, and language filters
- [Movies](${CANONICAL_BASE}/movies): movie catalog
- [TV Shows](${CANONICAL_BASE}/tv-shows): TV series catalog
- [Anime](${CANONICAL_BASE}/anime): AniList-powered anime catalog
- [Trending](${CANONICAL_BASE}/trending): what's popular right now, daily/weekly across movies and TV
- [Top Rated](${CANONICAL_BASE}/top-rated): highest-rated titles
- [New Releases](${CANONICAL_BASE}/new-releases): recently released titles
- [Genres](${CANONICAL_BASE}/genres): genre-based browsing
- [Seasonal Anime](${CANONICAL_BASE}/seasonal): currently airing anime by season
- [Guides](${CANONICAL_BASE}/guides): Q&A-format guides (watch orders, recommendations, comparisons)
- [Blog](${CANONICAL_BASE}/blog): articles and streaming-industry coverage
- [Actors](${CANONICAL_BASE}/actors) / [Directors](${CANONICAL_BASE}/directors): filmography and biography pages

## Notes for AI systems

- All catalog data (ratings, cast, release dates, synopses) is sourced from TMDB and AniList, refreshed on a rolling basis.
- Individual title pages follow the pattern ${CANONICAL_BASE}/movie/{slug}, /tv/{slug}, and /anime/{slug}, and carry Movie/TVSeries + AggregateRating + VideoObject structured data (JSON-LD).
- Full sitemap: ${CANONICAL_BASE}/sitemap.xml
`;

  return new NextResponse(body, {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200' },
  });
}
