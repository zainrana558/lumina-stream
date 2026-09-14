/**
 * Stable per-URL lastmod dates for the catalog sitemaps.
 *
 * Every catalog sitemap (movies.xml, tvshows.xml, etc.) regenerates its
 * whole list from TMDB/AniList once every 24h and previously stamped
 * <lastmod> with that regeneration's timestamp for EVERY url, every time —
 * i.e. every title in the catalog claimed to have "changed" today, daily,
 * forever. Google's own guidance: it uses lastmod as a crawl-priority
 * signal only when the dates are verifiably accurate: if every URL in a
 * sitemap claims to have changed today, Google learns the dates are noise
 * and stops trusting lastmod for the whole site, not just the offending
 * entries.
 *
 * This tracks, per sitemap, the date each item id was FIRST seen — a
 * defensible reading of "last modified" for an aggregator (this is when we
 * started listing it), and it only advances for ids that are genuinely new
 * to the list on a given day.
 */

import { getRedis } from '@/lib/redis';

const LASTMOD_TTL_SECONDS = 180 * 24 * 60 * 60; // 180 days — comfortably longer than any sitemap's own 24h regen cycle

export async function getStableLastmods(
  sitemapName: string,
  currentIds: (string | number)[]
): Promise<Record<string, string>> {
  const today = new Date().toISOString().split('T')[0];
  const ids = currentIds.map(String);
  const fallback = () => Object.fromEntries(ids.map((id) => [id, today]));

  const redis = getRedis();
  if (!redis) return fallback();

  const key = `lumina:sitemap-lastmod:${sitemapName}`;

  try {
    const stored = (await redis.get<Record<string, string>>(key)) || {};
    const next: Record<string, string> = {};
    for (const id of ids) {
      next[id] = stored[id] || today;
    }
    // Fire-and-forget — don't block sitemap generation on the write, and a
    // failed write just means tomorrow's regeneration re-derives from
    // scratch (degrades to the old "today for everything" behavior, not a
    // crash).
    redis.set(key, next, { ex: LASTMOD_TTL_SECONDS }).catch(() => {});
    return next;
  } catch {
    return fallback();
  }
}
