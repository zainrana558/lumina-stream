import type { MetadataRoute } from 'next';
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { PORTAL_GENRES } from '@/config/genres';

/**
 * Main sitemap — all static and semi-static pages.
 * Dynamic detail pages are in sitemap-details (via generateSitemaps).
 *
 * Uses CANONICAL_BASE (Vercel URL), never NEXT_PUBLIC_SITE_URL (proxy).
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    // ── Core pages ──
    { url: CANONICAL_BASE, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${CANONICAL_BASE}/browse`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${CANONICAL_BASE}/movies`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${CANONICAL_BASE}/tv-shows`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${CANONICAL_BASE}/top-rated`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${CANONICAL_BASE}/new-releases`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${CANONICAL_BASE}/genres`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${CANONICAL_BASE}/seasonal`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${CANONICAL_BASE}/release-calendar`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${CANONICAL_BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },

    // ── Genre portal pages ──
    ...PORTAL_GENRES.map(g => ({
      url: `${CANONICAL_BASE}/genre/${g.key}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),

    // ── Decade pages ──
    ...['2020s', '2010s', '2000s', '1990s', '1980s', '1970s'].map(decade => ({
      url: `${CANONICAL_BASE}/decade/${decade}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),

    // ── Year pages (current + 10 years back + 1 year ahead) ──
    ...Array.from({ length: 12 }, (_, i) => {
      const year = now.getFullYear() + 1 - i;
      return {
        url: `${CANONICAL_BASE}/year/${year}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      };
    }),

    // ── Legal pages ──
    { url: `${CANONICAL_BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${CANONICAL_BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${CANONICAL_BASE}/dmca`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${CANONICAL_BASE}/cookies`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${CANONICAL_BASE}/disclaimer`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}