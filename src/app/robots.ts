import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://lumovia-stream-omega.vercel.app').replace(/\/$/, '');

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
      },
    ],
    sitemap: [
      `${siteUrl}/sitemap.xml`,
    ],
  };
}
