/**
 * Embed streaming providers with replacement pool
 *
 * Active providers are the ones currently served to users.
 * Replacement pool is a stash of extra provider URLs kept in reserve.
 * When a provider is detected as dead, it gets swapped with a replacement
 * from the pool. When a dead provider recovers, it goes back into the pool.
 *
 * Total: 9 active + 10 replacements = 19 providers available
 * Categories: 'all' = movies + TV, 'anime' = anime-focused embeds
 *
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
  // General (TMDB) replacements
  { name: 'VidSrc IC',     category: 'all',   getMovieUrl: (id) => `https://vidsrc.ic/embed/movie/${id}`,       getTvUrl: (id, s, e) => `https://vidsrc.ic/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc Net',    category: 'all',   getMovieUrl: (id) => `https://vidsrc.net/embed/movie/${id}`,     getTvUrl: (id, s, e) => `https://vidsrc.net/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc Pro',    category: 'all',   getMovieUrl: (id) => `https://vidsrc.pro/embed/movie/${id}`,     getTvUrl: (id, s, e) => `https://vidsrc.pro/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc App',    category: 'all',   getMovieUrl: (id) => `https://vidsrc.app/embed/movie/${id}`,     getTvUrl: (id, s, e) => `https://vidsrc.app/embed/tv/${id}/${s}/${e}` },
  { name: 'EmbedVip',     category: 'all',   getMovieUrl: (id) => `https://embedvip.com/embed/movie/${id}`,    getTvUrl: (id, s, e) => `https://embedvip.com/embed/tv/${id}/${s}/${e}` },
  { name: 'MultiEmbed',   category: 'all',   getMovieUrl: (id) => `https://multiembed.mov/delivery/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://multiembed.mov/delivery/embed/tv/${id}/${s}/${e}` },
  { name: 'MovieE',       category: 'all',   getMovieUrl: (id) => `https://moviesapi.club/movie/${id}`,       getTvUrl: (id, s, e) => `https://moviesapi.club/tv/${id}/${s}/${e}` },
  // Anime replacements
  { name: 'GogoAnime',     category: 'anime', getMovieUrl: (id) => `https://vidsrc.cc/embed/movie/${id}`,       getTvUrl: (id, s, e) => `https://vidsrc.cc/embed/tv/${id}/${s}/${e}`, getAnimeUrl: (malId, ep) => `https://gogoanime.cl/watch/${malId}/${ep}` },
  { name: 'Zoro',          category: 'anime', getMovieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`,     getTvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`, getAnimeUrl: (malId, ep) => `https://zoro.to/watch/${malId}/${ep}` },
  { name: 'AnimePahe',     category: 'anime', getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,       getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`, getAnimeUrl: (malId, ep) => `https://animepahe.ru/watch/${malId}/${ep}` },
];

// ---- Active Providers ----

const activeProviders: StreamProvider[] = [
  // ════════════════════════════════════════════
  // TIER 1 — Primary
  // ════════════════════════════════════════════
  {
    name: "2Embed",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://www.2embed.online/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.online/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "AutoEmbed",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://autoembed.co/movie/tmdb/${id}`,
    getTvUrl: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`,
  },
  {
    name: "VidPhantom",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidphantom.com/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidphantom.com/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidSrc",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.fyi/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.fyi/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "NexStream",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://api.codespecters.com/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://api.codespecters.com/embed/tv/${id}/${s}/${e}`,
  },

  // ════════════════════════════════════════════
  // TIER 2 — Backup
  // ════════════════════════════════════════════
  {
    name: "VidSrc CC",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidSrc XYZ",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "Embed.su",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidSrc To",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },

  // ════════════════════════════════════════════
  // ANIME — MAL ID based
  // ════════════════════════════════════════════
  {
    name: "AnimeKaizoku",
    tier: 2, category: "anime",
    getMovieUrl: (id) => `https://vidsrc.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/embed/tv/${id}/${s}/${e}`,
    getAnimeUrl: (malId, episode) => `https://animekaizoku.com/watch/${malId}/${episode}`,
  },
  {
    name: "AniMixPlay",
    tier: 2, category: "anime",
    getMovieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}`,
    getAnimeUrl: (malId, _episode) => `https://animixplay.to/v1/${malId}`,
  },
  {
    name: "YugenAnime",
    tier: 2, category: "anime",
    getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
    getAnimeUrl: (malId, episode) => `https://yugenanime.tv/watch/${malId}/${episode}`,
  },
];

// ---- Pool State ----
// Tracks which replacements are currently swapped in, and which
// original providers were swapped out (for recovery).

const swappedIn: Map<string, StreamProvider> = new Map();   // replacement name → provider
const swappedOut: Map<string, StreamProvider> = new Map();  // original name → provider
// Tracks which replacement was swapped in for which original
const swapMapping: Map<string, string> = new Map();  // original name → replacement name

// ---- Swap Logic ----

/**
 * Get all currently active providers (original + swapped-in replacements).
 * Dead providers that haven't been swapped yet are still included here —
 * the embed route handles filtering via health-check.
 */
export function getAllProviders(): StreamProvider[] {
  // Start with active providers, skip any that were swapped out
  const current = activeProviders.filter(p => !swappedOut.has(p.name));

  // Add all swapped-in replacements
  for (const replacement of swappedIn.values()) {
    current.push(replacement);
  }

  return current;
}

/**
 * Get the replacement pool status (for /api/embed-health).
 */
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

/**
 * Swap out a dead provider with a replacement from the pool.
 * Returns the replacement provider, or null if pool is empty.
 */
export function swapInReplacement(deadProviderName: string): StreamProvider | null {
  // Don't swap if already swapped out
  if (swappedOut.has(deadProviderName)) return null;

  // Find a replacement from the same category, or any category
  const deadProvider = activeProviders.find(p => p.name === deadProviderName);
  const category = deadProvider?.category || 'all';

  // Try same category first, then any
  let replacement = REPLACEMENT_POOL.find(r => r.category === category && !swappedIn.has(r.name));
  if (!replacement) {
    replacement = REPLACEMENT_POOL.find(r => !swappedIn.has(r.name));
  }
  if (!replacement) return null;

  // Save the original for potential recovery
  swappedOut.set(deadProviderName, deadProvider!);

  // Add replacement as active
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

/**
 * Try to restore a swapped-out provider (if original recovers).
 * Removes the replacement and puts it back in the pool.
 */
export function restoreOriginal(originalName: string): boolean {
  if (!swappedOut.has(originalName)) return false;

  // Find the exact replacement that was swapped in for this original
  const repName = swapMapping.get(originalName);
  if (!repName || !swappedIn.has(repName)) return false;

  // Remove replacement from active pool
  swappedIn.delete(repName);
  // Restore original
  swappedOut.delete(originalName);
  swapMapping.delete(originalName);
  return true;
}

/**
 * Get the full replacement pool (for health-check to test).
 */
export function getReplacementPool(): ReplacementEntry[] {
  return REPLACEMENT_POOL;
}

// ---- Public API ----

/**
 * Get all general embed URLs (TMDB-based, sorted by tier).
 */
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

/**
 * Get anime embed URLs (TMDB-based + MAL ID based, sorted by tier).
 */
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
