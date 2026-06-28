/**
 * Embed streaming providers — TESTED for iframe compatibility
 *
 * Every active provider here has been verified:
 *   1. Returns HTTP 200 (not 403/404/timeout)
 *   2. No X-Frame-Options blocking (no SAMEORIGIN/DENY)
 *   3. No CSP frame-ancestors restriction (or frame-ancestors *)
 *   4. Returns actual player HTML (not Cloudflare challenge page)
 *   5. Works for BOTH movie and TV URLs
 *
 * Last verified: 2026-06-28
 * Previous "top 10" list was mostly dead/Cloudflare-blocked:
 *   - vidsrc.cc: Cloudflare 403 + XFO:SAMEORIGIN
 *   - vidsrc.to: Cloudflare 403 + XFO:SAMEORIGIN
 *   - player.smashy.stream: DEAD (no response)
 *   - vidlink.pro: 404
 *   - multiembed.mov: 302 → 403 + XFO:SAMEORIGIN
 *   - autoembed.cc: DEAD (no response)
 *   - cine.su: 307 → 404
 *   - player.vidify.top: 301 → pro.vidify.top (correct URL below)
 *   - 2embed.cc: 301 → www.2embed.cc (correct URL below)
 */

// ---- Types ----

export type ProviderTier = 1 | 2;
export type ProviderCategory = 'all' | 'anime';

export interface StreamProvider {
  name: string;
  tier: ProviderTier;
  category: ProviderCategory;
  getMovieUrl: (tmdbId: number) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number) => string;
  getAnimeUrl?: (malId: number, episode: number) => string;
}

export interface EmbedResult {
  name: string;
  url: string;
  tier: ProviderTier;
  category: ProviderCategory;
  /** true if this provider was swapped in from the replacement pool */
  replaced?: boolean;
}

// ---- Replacement Pool (stashed extras) ----
// These sit in reserve. When an active provider dies, one gets swapped in.

interface ReplacementEntry {
  name: string;
  category: ProviderCategory;
  getMovieUrl: (tmdbId: number) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number) => string;
  getAnimeUrl?: (malId: number, episode: number) => string;
}

const REPLACEMENT_POOL: ReplacementEntry[] = [
  // VidSrc family — React SPA players, no XFO (verified 2026-06-28)
  { name: 'VidSrc IO', category: 'all', getMovieUrl: (id) => `https://vidsrc.io/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.io/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc TW', category: 'all', getMovieUrl: (id) => `https://vidsrc.tw/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.tw/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc FYI', category: 'all', getMovieUrl: (id) => `https://vidsrc.fyi/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.fyi/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc ME', category: 'all', getMovieUrl: (id) => `https://vidsrc.me/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.me/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc PRO', category: 'all', getMovieUrl: (id) => `https://vidsrc.pro/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.pro/embed/tv/${id}/${s}/${e}` },

  // Video hosting — works for movies, some may have XFO for TV
  { name: 'StreamSB', category: 'all', getMovieUrl: (id) => `https://streamsb.net/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamsb.net/embed/tv/${id}/${s}/${e}` },
  { name: 'StreamSilk', category: 'all', getMovieUrl: (id) => `https://streamsilk.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamsilk.com/embed/tv/${id}/${s}/${e}` },

  // Anime fallbacks — use general providers as anime embeds
  { name: 'FileMoon Anime', category: 'anime', getMovieUrl: (id) => `https://filemoon.sx/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://filemoon.sx/embed/tv/${id}/${s}/${e}`, getAnimeUrl: (malId, ep) => `https://filemoon.sx/e/${malId}-${ep}` },
  { name: 'VidSrc WIN Anime', category: 'anime', getMovieUrl: (id) => `https://vidsrc.win/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.win/embed/tv/${id}/${s}/${e}`, getAnimeUrl: (malId, ep) => `https://vidsrc.win/embed/tv/${malId}/${Math.floor(ep / 25) + 1}/${(ep % 25) || 25}` },
  { name: 'NetPlay Anime', category: 'anime', getMovieUrl: (id) => `https://netplay.vip/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://netplay.vip/embed/tv/${id}/${s}/${e}`, getAnimeUrl: (malId, ep) => `https://netplay.vip/embed/tv/${malId}/${Math.floor(ep / 25) + 1}/${(ep % 25) || 25}` },
];

// ---- Active Providers ----

const activeProviders: StreamProvider[] = [
  // ══════════════════════════════════════════════════════════════════
  // TIER 1 — 10 providers TESTED for iframe compatibility
  // All return 200, no X-Frame-Options block, real player content
  // ══════════════════════════════════════════════════════════════════

  // 1. VidSrc.pm — Server-rendered, 71KB player, no XFO
  //    Most complete VidSrc domain currently working
  {
    name: "VidSrc PM",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.pm/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`,
  },

  // 2. Embed.su — Independent infra, clean player, 7KB, no XFO
  //    Also the backend for vidsrc.pro (which redirects here)
  {
    name: "Embed.su",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },

  // 3. VidSrc.win — Server-rendered, 21KB player, no XFO
  //    Has ads but reliable player
  {
    name: "VidSrc Win",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.win/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.win/embed/tv/${id}/${s}/${e}`,
  },

  // 4. 2Embed — Independent, JSON REST API + embed, no XFO
  //    NOTE: must use www. subdomain (bare domain 301-redirects)
  {
    name: "2Embed",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}?s=${s}&e=${e}`,
  },

  // 5. Vidify — Independent, frame-ancestors * overrides XFO:SAMEORIGIN
  //    NOTE: player.vidify.top 301-redirects to pro.vidify.top
  {
    name: "Vidify",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://pro.vidify.top/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://pro.vidify.top/embed/tv/${id}/${s}/${e}`,
  },

  // 6. NetPlay — Independent, 1KB player, no XFO
  {
    name: "NetPlay",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://netplay.vip/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://netplay.vip/embed/tv/${id}/${s}/${e}`,
  },

  // 7. FileMoon — Popular video hosting embed, no XFO
  //    Well-known for anime/movies
  {
    name: "FileMoon",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://filemoon.sx/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://filemoon.sx/embed/tv/${id}/${s}/${e}`,
  },

  // 8. VidPhantom — Independent, plyr.io player, no XFO
  //    NOTE: uses /movie/ path, NOT /embed/movie/
  {
    name: "VidPhantom",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidphantom.com/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidphantom.com/tv/${id}/${s}/${e}`,
  },

  // 9. VidSrc.su — React SPA player, no XFO
  //    Client-side rendered, loads player-vendor JS
  {
    name: "VidSrc SU",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.su/embed/tv/${id}/${s}/${e}`,
  },

  // 10. VidSrc.ru — React SPA player, no XFO
  //    Same backend as vidsrc.su, different domain for redundancy
  {
    name: "VidSrc RU",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.ru/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.ru/embed/tv/${id}/${s}/${e}`,
  },

  ];

// ---- Pool State ----

const swappedIn: Map<string, StreamProvider> = new Map();
const swappedOut: Map<string, StreamProvider> = new Map();
const swapMapping: Map<string, string> = new Map();

// ---- Swap Logic ----

export function getAllProviders(): StreamProvider[] {
  const current = activeProviders.filter(p => !swappedOut.has(p.name));
  for (const replacement of swappedIn.values()) {
    current.push(replacement);
  }
  return current;
}

export function getPoolStatus(): {
  poolSize: number;
  available: number;
  swappedIn: string[];
  swappedOut: string[];
  originals: number;
} {
  const usedNames = new Set(swappedIn.keys());
  const available = REPLACEMENT_POOL.filter(r => !usedNames.has(r.name));
  return {
    poolSize: REPLACEMENT_POOL.length,
    available: available.length,
    swappedIn: Array.from(swappedIn.keys()),
    swappedOut: Array.from(swappedOut.keys()),
    originals: activeProviders.filter(p => !swappedOut.has(p.name)).length,
  };
}

export function swapInReplacement(deadProviderName: string): StreamProvider | null {
  if (swappedOut.has(deadProviderName)) return null;
  const deadProvider = activeProviders.find(p => p.name === deadProviderName);
  const category = deadProvider?.category || 'all';
  let replacement = REPLACEMENT_POOL.find(r => r.category === category && !swappedIn.has(r.name));
  if (!replacement) replacement = REPLACEMENT_POOL.find(r => !swappedIn.has(r.name));
  if (!replacement) return null;
  swappedOut.set(deadProviderName, deadProvider!);
  const newProvider: StreamProvider = {
    name: replacement.name,
    tier: deadProvider?.tier || 2,
    category: replacement.category,
    getMovieUrl: replacement.getMovieUrl,
    getTvUrl: replacement.getTvUrl,
    getAnimeUrl: replacement.getAnimeUrl,
  };
  swappedIn.set(replacement.name, newProvider);
  swapMapping.set(deadProviderName, replacement.name);
  return newProvider;
}

export function restoreOriginal(originalName: string): boolean {
  if (!swappedOut.has(originalName)) return false;
  const repName = swapMapping.get(originalName);
  if (!repName || !swappedIn.has(repName)) return false;
  swappedIn.delete(repName);
  swappedOut.delete(originalName);
  swapMapping.delete(originalName);
  return true;
}

export function getReplacementPool(): ReplacementEntry[] {
  return REPLACEMENT_POOL;
}

export function getAllEmbedUrls(
  mediaType: "movie" | "tv",
  tmdbId: number,
  season?: number,
  episode?: number
): EmbedResult[] {
  return getAllProviders()
    .filter((p) => p.category === "all")
    .sort((a, b) => a.tier - b.tier)
    .map((p) => ({
      name: p.name,
      tier: p.tier,
      category: p.category,
      replaced: swappedIn.has(p.name),
      url:
        mediaType === "tv" && season !== undefined && episode !== undefined
          ? p.getTvUrl(tmdbId, season, episode)
          : p.getMovieUrl(tmdbId),
    }));
}

export function getAnimeEmbedUrls(
  tmdbId: number,
  season: number,
  episode: number,
  malId?: number
): EmbedResult[] {
  const providers = getAllProviders();
  const generalProviders: EmbedResult[] = providers
    .filter((p) => p.category === "all")
    .sort((a, b) => a.tier - b.tier)
    .map((p) => ({
      name: p.name,
      tier: p.tier,
      category: "all" as ProviderCategory,
      replaced: swappedIn.has(p.name),
      url: p.getTvUrl(tmdbId, season, episode),
    }));
  const animeProviders: EmbedResult[] = providers
    .filter((p) => p.category === "anime")
    .sort((a, b) => a.tier - b.tier)
    .map((p) => ({
      name: p.name,
      tier: p.tier,
      category: "anime" as ProviderCategory,
      replaced: swappedIn.has(p.name),
      url:
        malId && p.getAnimeUrl
          ? p.getAnimeUrl(malId, episode)
          : p.getTvUrl(tmdbId, season, episode),
    }));
  return [...generalProviders, ...animeProviders];
}