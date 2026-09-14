import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://lumovia-stream-omega.vercel.app').replace(/\/$/, '');

  return {
    rules: [
      // Block backlink/rank-tracking scrapers — they burn crawl budget and
      // API quota but feed zero real traffic, search visibility, or AI
      // citations (they're competitor-research tools, not search/AI
      // crawlers). Kept blocked.
      { userAgent: 'AhrefsBot',       disallow: '/' },
      { userAgent: 'SemrushBot',      disallow: '/' },
      { userAgent: 'MJ12bot',         disallow: '/' },
      { userAgent: 'DotBot',          disallow: '/' },
      { userAgent: 'BLEXBot',         disallow: '/' },
      { userAgent: 'PetalBot',        disallow: '/' },
      { userAgent: 'YandexBot',       disallow: '/' },
      { userAgent: 'DataForSeoBot',   disallow: '/' },
      // Previously GPTBot/ClaudeBot/anthropic-ai/CCBot/Baiduspider/Bytespider
      // were bundled into the scraper blocklist above under the same
      // "burns quota" rationale — but these are the crawlers that actually
      // feed ChatGPT, Claude, other CCBot-trained models, Baidu's
      // search+AI index, and ByteDance's Doubao, i.e. exactly the AI
      // visibility this site wants. Explicitly allowed below (redundant
      // with the "*" allow-all default, but explicit is safer than relying
      // on an unnamed bot falling through to the wildcard rule).
      {
        userAgent: [
          'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
          'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',
          'Google-Extended',
          'PerplexityBot', 'Perplexity-User',
          'CCBot',
          'Baiduspider', 'Bytespider',
        ],
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/embed/',
          '/stats',
          '/watchlist',
          '/profiles',
          '/select-profile',
          '/login',
          '/signup',
          '/settings',
          '/collections',
          '/activity',
          '/year-in-review',
        ],
      },
      {
        userAgent: '*',
        allow: [
          '/',
          '/browse',
          '/blog',
          '/genre/',
          '/details/',
          '/person/',
          '/movie/',
          '/tv/',
          '/anime/',
          '/actor/',
          '/country/',
          '/language/',
          '/studio/',
          '/seasonal',
          '/leaderboard',
          '/release-calendar',
          '/movies',
          '/tv-shows',
          '/top-rated',
          '/new-releases',
          '/genres',
          '/news',
          '/reviews',
          '/about',
          '/decade/',
          '/year/',
          '/privacy',
          '/terms',
          '/dmca',
          '/cookies',
          '/disclaimer',
          '/guide/',
          '/guides',
        ],
        disallow: [
          '/api/',
          '/auth/',
          '/embed/',
          '/stats',
          '/watchlist',
          '/profiles',
          '/select-profile',
          '/login',
          '/signup',
          '/settings',
          '/collections',
          '/activity',
          '/year-in-review',
        ],
        crawlDelay: 10,
      },
    ],
    sitemap: [
      `${siteUrl}/sitemap.xml`,
    ],
  };
}
