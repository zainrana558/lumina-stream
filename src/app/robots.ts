import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = 'https://lumina-stream-omega.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/browse', '/genre/', '/details/', '/person/', '/seasonal', '/leaderboard', '/release-calendar', '/movies', '/tv-shows', '/top-rated', '/new-releases', '/genres', '/about', '/decade/', '/year/'],
        disallow: ['/api/', '/auth/', '/embed/', '/stats', '/watchlist', '/profiles', '/select-profile', '/login', '/signup', '/settings', '/collections', '/activity', '/year-in-review'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
