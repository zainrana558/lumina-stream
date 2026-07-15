import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = 'https://lumovia-stream-omega.vercel.app';

  return {
    rules: [
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
          '/about',
          '/decade/',
          '/year/',
          '/privacy',
          '/terms',
          '/dmca',
          '/cookies',
          '/disclaimer',
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
      },
    ],
    sitemap: [
      `${siteUrl}/sitemap.xml`,
    ],
  };
}