/**
 * Embed streaming providers with replacement pool
 *
 * Active providers are the ones currently served to users.
 * Replacement pool is a stash of extra provider URLs kept in reserve.
 * When a provider is detected as dead, it gets swapped with a replacement
 * from the pool. When a dead provider recovers, it goes back into the pool.
 *
 * Total: 24 active + 19 replacements = 43 providers available
 * Categories: 'all' = movies + TV, 'anime' = anime-focused embeds
 *
 * All providers verified alive as of 2026-06-27.
 * Auto-refreshed by provider-refresh.mjs script.
 * Anime providers accept MAL (MyAnimeList) IDs from AniList data.
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
  // General (TMDB) replacements — verified alive
  { name: 'VidSrc RU', category: 'all', getMovieUrl: (id) => `https://vidsrc.ru/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.ru/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc ME', category: 'all', getMovieUrl: (id) => `https://vidsrc.me/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.me/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc IO', category: 'all', getMovieUrl: (id) => `https://vidsrc.io/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.io/embed/tv/${id}/${s}/${e}` },
  { name: 'StreamSilk', category: 'all', getMovieUrl: (id) => `https://streamsilk.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamsilk.com/embed/tv/${id}/${s}/${e}` },
  { name: 'Series9', category: 'all', getMovieUrl: (id) => `https://series9.io/film/${id}`, getTvUrl: (id, s, e) => `https://series9.io/series/${id}-${s}-${e}` },
  { name: 'MovieBox', category: 'all', getMovieUrl: (id) => `https://moviebox.pro/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://moviebox.pro/embed/tv/${id}/${s}/${e}` },
  { name: 'HDStream', category: 'all', getMovieUrl: (id) => `https://hdstream.to/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://hdstream.to/embed/tv/${id}/${s}/${e}` },
  { name: 'MixDrop', category: 'all', getMovieUrl: (id) => `https://mixdrop.to/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://mixdrop.to/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc FYI', category: 'all', getMovieUrl: (id) => `https://vidsrc.fyi/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.fyi/embed/tv/${id}/${s}/${e}` },
  { name: 'StreamHide', category: 'all', getMovieUrl: (id) => `https://streamhide.to/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamhide.to/embed/tv/${id}/${s}/${e}` },
  { name: 'Series9API', category: 'all', getMovieUrl: (id) => `https://api.series9.io/film/${id}`, getTvUrl: (id, s, e) => `https://api.series9.io/series/${id}/${s}/${e}` },
  { name: 'StreamSB', category: 'all', getMovieUrl: (id) => `https://streamsb.net/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamsb.net/embed/tv/${id}/${s}/${e}` },
  { name: 'StreamLare', category: 'all', getMovieUrl: (id) => `https://streamlare.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamlare.com/embed/tv/${id}/${s}/${e}` },
  { name: 'Embed.su', category: 'all', getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}` },
  { name: 'VidPhantom', category: 'all', getMovieUrl: (id) => `https://vidphantom.com/movie/${id}`, getTvUrl: (id, s, e) => `https://vidphantom.com/tv/${id}/${s}/${e}` },
  { name: 'VidSrc IN', category: 'all', getMovieUrl: (id) => `https://vidsrc.in/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.in/embed/tv/${id}/${s}/${e}` },
  { name: '2Embed', category: 'all', getMovieUrl: (id) => `https://2embed.cc/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://2embed.cc/embed/tv/${id}/${s}/${e}` },
  // Anime replacements — use general providers as fallback since
  // dedicated anime embeds (gogoanime, zoro, animepahe, etc.) are all dead
  { name: 'VidSrc WIN Anime', category: 'anime', getMovieUrl: (id) => `https://vidsrc.win/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.win/embed/tv/${id}/${s}/${e}`, getAnimeUrl: (malId, ep) => `https://vidsrc.win/embed/tv/${malId}/${Math.floor(ep / 25) + 1}/${(ep % 25) || 25}` },
  { name: 'CodeSpecters2 Anime', category: 'anime', getMovieUrl: (id) => `https://codespecters.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://codespecters.com/embed/tv/${id}/${s}/${e}`, getAnimeUrl: (malId, ep) => `https://codespecters.com/embed/tv/${malId}/${Math.floor(ep / 25) + 1}/${(ep % 25) || 25}` },
];

// ---- Active Providers ----

const activeProviders: StreamProvider[] = [
  // ════════════════════════════════════════════
  // TIER 1 — Primary (sorted by latency)
  // ════════════════════════════════════════════
  {
    name: "VidSrc WIN",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.win/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.win/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "CodeSpecters2",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://codespecters.com/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://codespecters.com/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "TVPizza",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://tvpizza.com/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://tvpizza.com/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidSrc PM",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.pm/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "NetPlay",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://netplay.vip/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://netplay.vip/embed/tv/${id}/${s}/${e}`,
  },
  // ════════════════════════════════════════════
  // TIER 2 — Backup
  // ════════════════════════════════════════════
  {
    name: "AutoEmbed",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://autoembed.co/movie/tmdb/${id}`,
    getTvUrl: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`,
  },
  {
    name: "CodeSpecters",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://api.codespecters.com/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://api.codespecters.com/embed/tv/${id}/${s}/${e}`,
  }
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
