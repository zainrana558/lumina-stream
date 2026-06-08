import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://luminaa2-vum6.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/browse', '/genre/', '/details/', '/login', '/signup'],
        disallow: ['/api/', '/auth/', '/embed/', '/stats', '/watchlist', '/profiles', '/select-profile'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
