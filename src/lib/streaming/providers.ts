/**
 * Embed streaming providers with replacement pool
 *
 * Active providers are the ones currently served to users.
 * Replacement pool is a stash of extra provider URLs kept in reserve.
 * When a provider is detected as dead, it gets swapped with a replacement
 * from the pool. When a dead provider recovers, it goes back into the pool.
 *
 * TIER 1 = Top 10 providers chosen for quality, diversity, speed & stability
 *   - Curated from deep web research (Reddit, GitHub, WJunction, Scribd, BHW)
 *   - Only 4 are VidSrc-family; 6 are independent infrastructure
 *   - If VidSrc ecosystem gets taken down, 6 non-vidsrc providers survive
 *
 * TIER 2 = Backup providers from replacement pool
 *
 * Auto-refreshed by provider-refresh.mjs script (daily cron).
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
  { name: 'StreamWish', category: 'all', getMovieUrl: (id) => `https://streamwish.to/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamwish.to/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrcTW', category: 'all', getMovieUrl: (id) => `https://vidsrc.tw/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.tw/embed/tv/${id}/${s}/${e}` },
  { name: 'AutoEmbed', category: 'all', getMovieUrl: (id) => `https://autoembed.co/movie/tmdb/${id}`, getTvUrl: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}` },
  { name: 'TVPizza', category: 'all', getMovieUrl: (id) => `https://tvpizza.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://tvpizza.com/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc PM', category: 'all', getMovieUrl: (id) => `https://vidsrc.pm/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}` },
  { name: 'MovieBox', category: 'all', getMovieUrl: (id) => `https://moviebox.pro/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://moviebox.pro/embed/tv/${id}/${s}/${e}` },
  { name: 'StreamSilk', category: 'all', getMovieUrl: (id) => `https://streamsilk.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamsilk.com/embed/tv/${id}/${s}/${e}` },
  { name: 'Series9', category: 'all', getMovieUrl: (id) => `https://series9.io/film/${id}`, getTvUrl: (id, s, e) => `https://series9.io/series/${id}-${s}-${e}` },
  { name: 'HDStream', category: 'all', getMovieUrl: (id) => `https://hdstream.to/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://hdstream.to/embed/tv/${id}/${s}/${e}` },
  { name: 'StreamHide', category: 'all', getMovieUrl: (id) => `https://streamhide.to/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamhide.to/embed/tv/${id}/${s}/${e}` },
  { name: 'MixDrop', category: 'all', getMovieUrl: (id) => `https://mixdrop.to/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://mixdrop.to/embed/tv/${id}/${s}/${e}` },
  { name: 'VUpload', category: 'all', getMovieUrl: (id) => `https://vupload.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vupload.com/embed/tv/${id}/${s}/${e}` },
  { name: 'Series9API', category: 'all', getMovieUrl: (id) => `https://api.series9.io/film/${id}`, getTvUrl: (id, s, e) => `https://api.series9.io/series/${id}/${s}/${e}` },
  { name: 'VidSrc FYI', category: 'all', getMovieUrl: (id) => `https://vidsrc.fyi/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.fyi/embed/tv/${id}/${s}/${e}` },
  { name: 'StreamLare', category: 'all', getMovieUrl: (id) => `https://streamlare.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamlare.com/embed/tv/${id}/${s}/${e}` },
  { name: 'PStream', category: 'all', getMovieUrl: (id) => `https://iframe.pstream.org/embed/tmdb-movie-${id}`, getTvUrl: (id, s, e) => `https://iframe.pstream.org/embed/tmdb-tv-${id}/${s}/${e}` },
  { name: 'VidPhantom', category: 'all', getMovieUrl: (id) => `https://vidphantom.com/movie/${id}`, getTvUrl: (id, s, e) => `https://vidphantom.com/tv/${id}/${s}/${e}` },
  { name: 'FileMoon', category: 'all', getMovieUrl: (id) => `https://filemoon.sx/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://filemoon.sx/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc IO', category: 'all', getMovieUrl: (id) => `https://vidsrc.io/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.io/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc IN', category: 'all', getMovieUrl: (id) => `https://vidsrc.in/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.in/embed/tv/${id}/${s}/${e}` },
  { name: 'StreamSB', category: 'all', getMovieUrl: (id) => `https://streamsb.net/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamsb.net/embed/tv/${id}/${s}/${e}` },
  { name: 'SuperEmbed', category: 'all', getMovieUrl: (id) => `https://superembed.stream/?video_id=${id}&tmdb=1`, getTvUrl: (id, s, e) => `https://superembed.stream/?video_id=${id}&tmdb=1&s=${s}&e=${e}` },
  { name: 'PerEmbed', category: 'all', getMovieUrl: (id) => `https://perembed.stream/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://perembed.stream/embed/tv/${id}/${s}/${e}` },
  { name: 'PrimeWire', category: 'all', getMovieUrl: (id) => `https://primewire.tf/embed/movie?tmdb=${id}`, getTvUrl: (id, s, e) => `https://primewire.tf/embed/tv?tmdb=${id}&season=${s}&episode=${e}` },
  { name: 'FreEmbed', category: 'all', getMovieUrl: (id) => `https://frembed.cc/api/film.php?id=${id}`, getTvUrl: (id, s, e) => `https://frembed.cc/api/serie.php?id=${id}&sa=${s}&epi=${e}` },
  { name: 'MoviesAPI', category: 'all', getMovieUrl: (id) => `https://moviesapi.club/movie/${id}`, getTvUrl: (id, s, e) => `https://moviesapi.club/tv/${id}-${s}-${e}` },
  { name: 'VidCore', category: 'all', getMovieUrl: (id) => `https://vidcore.cc/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidcore.cc/embed/tv/${id}/${s}/${e}` },
  { name: 'GoDrive', category: 'all', getMovieUrl: (id) => `https://godriveplayer.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://godriveplayer.com/embed/tv/${id}/${s}/${e}` },
  { name: 'VidoLol', category: 'all', getMovieUrl: (id) => `https://vido.lol/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vido.lol/embed/tv/${id}/${s}/${e}` },
  { name: '4KHDHub', category: 'all', getMovieUrl: (id) => `https://4khdhub.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://4khdhub.com/embed/tv/${id}/${s}/${e}` },
  { name: 'DahmerMovies', category: 'all', getMovieUrl: (id) => `https://dahmermovies.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://dahmermovies.com/embed/tv/${id}/${s}/${e}` },
  { name: 'LordFlix', category: 'all', getMovieUrl: (id) => `https://lordflix.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://lordflix.com/embed/tv/${id}/${s}/${e}` },
  { name: 'Videasy', category: 'all', getMovieUrl: (id) => `https://videasy.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://videasy.com/embed/tv/${id}/${s}/${e}` },
  { name: 'VixSrc', category: 'all', getMovieUrl: (id) => `https://vixsrc.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vixsrc.com/embed/tv/${id}/${s}/${e}` },
  { name: 'NoTorrent', category: 'all', getMovieUrl: (id) => `https://notorrent.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://notorrent.com/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc SU', category: 'all', getMovieUrl: (id) => `https://vidsrc.su/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.su/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc RU', category: 'all', getMovieUrl: (id) => `https://vidsrc.ru/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.ru/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc PRO', category: 'all', getMovieUrl: (id) => `https://vidsrc.pro/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.pro/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc RIP', category: 'all', getMovieUrl: (id) => `https://vidsrc.rip/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.rip/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc VIP', category: 'all', getMovieUrl: (id) => `https://vidsrc.vip/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.vip/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc BZ', category: 'all', getMovieUrl: (id) => `https://vidsrc.bz/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.bz/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc DEV', category: 'all', getMovieUrl: (id) => `https://vidsrc.dev/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.dev/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc XYZ', category: 'all', getMovieUrl: (id) => `https://vidsrc.xyz/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.xyz/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc NET', category: 'all', getMovieUrl: (id) => `https://vidsrc.net/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.net/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc GD', category: 'all', getMovieUrl: (id) => `https://vidsrc.gd/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.gd/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc DO', category: 'all', getMovieUrl: (id) => `https://vidsrc.do/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.do/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc MN', category: 'all', getMovieUrl: (id) => `https://vidsrc.mn/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.mn/embed/tv/${id}/${s}/${e}` },
  // Anime replacements
  { name: 'VidSrc WIN Anime', category: 'anime', getMovieUrl: (id) => `https://vidsrc.win/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.win/embed/tv/${id}/${s}/${e}`, getAnimeUrl: (malId, ep) => `https://vidsrc.win/embed/tv/${malId}/${Math.floor(ep / 25) + 1}/${(ep % 25) || 25}` },
  { name: 'NetPlay Anime', category: 'anime', getMovieUrl: (id) => `https://netplay.vip/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://netplay.vip/embed/tv/${id}/${s}/${e}`, getAnimeUrl: (malId, ep) => `https://netplay.vip/embed/tv/${malId}/${Math.floor(ep / 25) + 1}/${(ep % 25) || 25}` },
  { name: 'Kwik Anime', category: 'anime', getMovieUrl: (id) => `https://kwik.cx/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://kwik.cx/embed/tv/${id}/${s}/${e}`, getAnimeUrl: (malId, ep) => `https://kwik.cx/e/${malId}-${ep}` },
  { name: 'FileMoon Anime', category: 'anime', getMovieUrl: (id) => `https://filemoon.cc/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://filemoon.cc/embed/tv/${id}/${s}/${e}`, getAnimeUrl: (malId, ep) => `https://filemoon.cc/e/${malId}-${ep}` },
];

// ---- Active Providers ----

const activeProviders: StreamProvider[] = [
  // ══════════════════════════════════════════════════════════════════
  // TIER 1 — Top 10 (curated for quality, diversity, speed, stability)
  // Only 4 VidSrc-family · 6 independent infrastructure
  // ══════════════════════════════════════════════════════════════════

  // 1. VidSrc.cc — Most referenced overall, v2 API, poster, 1080p
  {
    name: "VidSrc CC",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
  },

  // 2. Embed.su — Clean player, minimal ads, fast CDN, non-vidsrc
  {
    name: "Embed.su",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },

  // 3. SmashyStream — Multi-server (D/SU/F/FMD/J), subtitles, start time
  {
    name: "SmashyStream",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://player.smashy.stream/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.smashy.stream/tv/${id}?s=${s}&e=${e}`,
  },

  // 4. Vidify — Customizable colors, server selection, poster, 1080p
  {
    name: "Vidify",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://player.vidify.top/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.vidify.top/embed/tv/${id}/${s}/${e}`,
  },

  // 5. VidLink.pro — Independent infra, fast, Hacker News mentioned
  {
    name: "VidLink",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidlink.pro/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/embed/tv/${id}/${s}/${e}`,
  },

  // 6. 2Embed — Full JSON REST API + embed, search/trending/similar
  {
    name: "2Embed",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://2embed.cc/embed/${id}`,
    getTvUrl: (id, s, e) => `https://2embed.cc/embedtv/${id}?s=${s}&e=${e}`,
  },

  // 7. Cine.su — Reddit praised "no server lag", unique non-vidsrc infra
  {
    name: "Cine.su",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://cine.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://cine.su/embed/tv/${id}/${s}/${e}`,
  },

  // 8. VidSrc.to — The OG, 5+ years running, custom domain support
  {
    name: "VidSrc.to",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },

  // 9. MultiEmbed — Aggregator pulling multiple upstreams, IMDB+TMDB
  {
    name: "MultiEmbed",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    getTvUrl: (id, s, e) => `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },

  // 10. AutoEmbed — Separate infra, 5 TLD variants for extreme redundancy
  {
    name: "AutoEmbed",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://autoembed.cc/movie/tmdb/${id}`,
    getTvUrl: (id, s, e) => `https://autoembed.cc/tv/tmdb/${id}-${s}-${e}`,
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