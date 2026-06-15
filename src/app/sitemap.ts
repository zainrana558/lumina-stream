import type { MetadataRoute } from 'next';
import { PORTAL_SLUGS } from '@/config/genres';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lumina-stream-omega.vercel.app';

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/browse`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/watchlist`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    ...PORTAL_SLUGS.map(slug => ({
      url: `${baseUrl}/genre/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}