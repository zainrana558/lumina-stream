/**
 * Embed streaming providers with replacement pool
 *
 * Active providers are the ones currently served to users.
 * Replacement pool is a stash of extra provider URLs kept in reserve.
 * When a provider is detected as dead, it gets swapped with a replacement
 * from the pool. When a dead provider recovers, it goes back into the pool.
 *
 * TIER 1 = Top providers chosen for quality, diversity, speed & stability
 * TIER 2 = Backup providers
 *
 * Last full test: 2026-07-07 — all active providers verified 200 OK, no frame-block
 */

// ---- Types ----

export type ProviderTier = 1 | 2 | 3;
export type ProviderCategory = 'all' | 'anime';

export interface StreamProvider {
  name: string;
  tier: ProviderTier;
  category: ProviderCategory;
  getMovieUrl: (tmdbId: number) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number) => string;
  getAnimeUrl?: (malId: number, episode: number) => string;
  /** AniList-based anime URL — takes AniList ID + episode number */
  getAniListUrl?: (anilistId: number, episode: number) => string;
  /** If true, route through /api/iframe-proxy to bypass X-Frame-Options: SAMEORIGIN */
  useProxy?: boolean;
}

export interface EmbedResult {
  name: string;
  url: string;
  tier: ProviderTier;
  category: ProviderCategory;
  /** true if this provider was swapped in from the replacement pool */
  replaced?: boolean;
  /** true if this URL goes through the iframe proxy (SAMEORIGIN bypass) */
  proxied?: boolean;
}

// ---- Replacement Pool (stashed extras) ----
// These sit in reserve. When an active provider dies, one gets swapped in.

interface ReplacementEntry {
  name: string;
  category: ProviderCategory;
  useProxy?: boolean;
  getMovieUrl: (tmdbId: number) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number) => string;
  getAnimeUrl?: (malId: number, episode: number) => string;
}

const REPLACEMENT_POOL: ReplacementEntry[] = [
  // All verified alive 2026-07-07 (200 OK, no X-Frame-Options, no CSP frame-ancestors block)
  { name: 'PStream', category: 'all', getMovieUrl: (id) => `https://iframe.pstream.org/embed/tmdb-movie-${id}`, getTvUrl: (id, s, e) => `https://iframe.pstream.org/embed/tmdb-tv-${id}/${s}/${e}` },
  { name: 'StreamLare', category: 'all', getMovieUrl: (id) => `https://streamlare.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamlare.com/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc PRO', category: 'all', getMovieUrl: (id) => `https://vidsrc.pro/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.pro/embed/tv/${id}/${s}-${e}` },
  // New additions verified 2026-07-07
  { name: 'VidBinge', category: 'all', getMovieUrl: (id) => `https://vidbinge.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidbinge.com/embed/tv/${id}/${s}/${e}` },
  { name: 'VidSrc IN', category: 'all', getMovieUrl: (id) => `https://vidsrc.in/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.in/embed/tv/${id}/${s}/${e}` },
  { name: 'SmashyStream', category: 'all', getMovieUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`, getTvUrl: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}` },
  // AutoEmbed — promoted to active TIER 2 (2026-07-07)
  // StreamSilk — promoted to active TIER 2 (2026-07-07)
  // Series9API — promoted to active TIER 2 (2026-07-07)
  // VidSrc FYI — promoted to active TIER 2 (2026-07-07)
  // StreamSB — REMOVED: redirects to parked domain ww1.streamsb.net (2026-07-07)
  // MoviesAPI — REMOVED: fetch failed (2026-07-07)
  // VidoLol — REMOVED: fetch failed (2026-07-07)
  // LordFlix — REMOVED: 404 + SAMEORIGIN (2026-07-07)
];

// ---- Active Providers ----

const activeProviders: StreamProvider[] = [
  // ══════════════════════════════════════════════════════════════════
  // ANIME TIER 1 — Dedicated anime streaming providers
  // These providers appear first in the dropdown for anime content.
  // Cinezo: AniList-native, sub/dub support, multi-language. Gold standard.
  // VidSrc WIN: TMDB-based anime, fast fallback.
  // ══════════════════════════════════════════════════════════════════

  // Cinezo Anime (Sub) — 729ms, 200 OK, no XFO. AniList-native embed, sub/dub, multi-language
  {
    name: "Cinezo Anime (Sub)",
    tier: 1, category: "anime",
    getMovieUrl: (id) => `https://player.cinezo.live/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.cinezo.live/embed/tv/${id}/${s}/${e}`,
    getAniListUrl: (anilistId, ep) => `https://player.cinezo.live/embed/anime/${anilistId}/${ep}`,
  },

  // Cinezo Anime (Dub) — 649ms, 200 OK, no XFO. Same as above but with English dub
  {
    name: "Cinezo Anime (Dub)",
    tier: 1, category: "anime",
    getMovieUrl: (id) => `https://player.cinezo.live/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.cinezo.live/embed/tv/${id}/${s}/${e}`,
    getAniListUrl: (anilistId, ep) => `https://player.cinezo.live/embed/anime/${anilistId}/${ep}?dub=true`,
  },

  // VidPlus Anime (Sub/Dub) — REMOVED: 403 + X-Frame-Options: SAMEORIGIN (2026-07-07)

  // VidSrc WIN Anime — 186ms (FASTEST anime), 200 OK, no XFO. TMDB/MAL-based
  {
    name: "VidSrc WIN Anime",
    tier: 1, category: "anime",
    getMovieUrl: (id) => `https://vidsrc.win/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.win/embed/tv/${id}/${s}/${e}`,
    getAnimeUrl: (malId, ep) => {
      const s = Math.floor((ep - 1) / 25) + 1;
      const e = ((ep - 1) % 25) + 1;
      return `https://vidsrc.win/embed/tv/${malId}/${s}/${e}`;
    },
  },

  // ══════════════════════════════════════════════════════════════════
  // TIER 1 — Top general providers (curated for quality, diversity, speed, stability)
  // All general providers also serve anime content via TMDB IDs.
  // ══════════════════════════════════════════════════════════════════

  // 1. VidSrc SU — 544ms, 200 OK, no XFO
  {
    name: "VidSrc SU",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.su/embed/tv/${id}/${s}/${e}`,
  },

  // 2. VidSrc RU — 541ms, 200 OK, no XFO
  {
    name: "VidSrc RU",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.ru/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.ru/embed/tv/${id}/${s}/${e}`,
  },

  // 3. VidSrc IO — 889ms, 200 OK, no XFO, ACAO: *
  {
    name: "VidSrc IO",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.io/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.io/embed/tv/${id}/${s}/${e}`,
  },

  // 4. VidCore — 3095ms (slow but reliable), 14+ servers, auto-fallback, subtitles
  {
    name: "VidCore",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidcore.org/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidcore.org/embed/tv/${id}/${s}/${e}`,
  },

  // VidPlus — REMOVED: 403 + X-Frame-Options: SAMEORIGIN (2026-07-07)
  // VidSrc Embed RU/SU — REMOVED: redirects to vsembed.ru → 403 SAMEORIGIN
  // VSrc SU — REMOVED: redirects to vsembed.ru → 403 SAMEORIGIN

  // ══════════════════════════════════════════
  // TIER 2 — Backup providers
  // ══════════════════════════════════════════

  // VidSrcMe RU — 517ms, 200 OK
  {
    name: "VidSrcMe RU",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrcme.ru/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrcme.ru/embed/tv/${id}/${s}/${e}`,
  },

  // VidSrcMe SU — 774ms, 200 OK
  {
    name: "VidSrcMe SU",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrcme.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrcme.su/embed/tv/${id}/${s}/${e}`,
  },

  // VidSrc-Me RU — 793ms, 200 OK
  {
    name: "VidSrc-Me RU",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc-me.ru/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc-me.ru/embed/tv/${id}/${s}/${e}`,
  },

  // VidSrc-Me SU — 805ms, 200 OK
  {
    name: "VidSrc-Me SU",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc-me.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc-me.su/embed/tv/${id}/${s}/${e}`,
  },

  // Promoted from pool (2026-07-07) — all verified 200 OK, no frame-block

  // AutoEmbed — 621ms, TMDB-native embed
  {
    name: "AutoEmbed",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://autoembed.co/movie/tmdb/${id}`,
    getTvUrl: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`,
  },

  // StreamSilk — 758ms, clean embed
  {
    name: "StreamSilk",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://streamsilk.com/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://streamsilk.com/embed/tv/${id}/${s}/${e}`,
  },

  // Series9API — 977ms, API-based
  {
    name: "Series9API",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://api.series9.io/film/${id}`,
    getTvUrl: (id, s, e) => `https://api.series9.io/series/${id}/${s}/${e}`,
  },

  // VidSrc FYI — 954ms, independent VidSrc domain
  {
    name: "VidSrc FYI",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.fyi/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.fyi/embed/tv/${id}/${s}-${e}`,
  },

  // Existing verified TIER 2

  // AnyEmbed — 75ms (FASTEST), TMDB-native embed
  {
    name: "AnyEmbed",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://anyembed.xyz/embed/tmdb-movie-${id}`,
    getTvUrl: (id, s, e) => `https://anyembed.xyz/embed/tmdb-tv-${id}-${s}-${e}`,
  },

  // VaPlayer — 420ms, Russian embed provider
  {
    name: "VaPlayer",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vaplayer.ru/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vaplayer.ru/embed/tv/${id}/${s}/${e}`,
  },

  // Nontongo — 558ms, 200 OK
  {
    name: "Nontongo",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://nontongo.win/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://nontongo.win/embed/tv/${id}/${s}/${e}`,
  },

  // VidLink — 563ms, 200 OK
  {
    name: "VidLink",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },

  // VidSrc.pm — 671ms, independent VidSrc domain
  {
    name: "VidSrc.pm",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.pm/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`,
  },

  // VidSrc MOV — 712ms, 200 OK, separate infrastructure
  {
    name: "VidSrc MOV",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.mov/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.mov/embed/tv/${id}/${s}/${e}`,
  },

  // FilmU — 849ms, clean embed API, 4K support
  {
    name: "FilmU",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://embed.filmu.in/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.filmu.in/tv/${id}/${s}/${e}`,
  },

  // FileMoon — 801ms, 200 OK
  {
    name: "FileMoon",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://filemoon.sx/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://filemoon.sx/embed/tv/${id}/${s}/${e}`,
  },

  // 2Embed — 1247ms, 200 OK
  {
    name: "2Embed",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://www.2embed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embed/tv/${id}/${s}/${e}`,
  },

  // ── REMOVED providers (dead/frame-blocked as of 2026-07-07) ──
  // VidPlus — 403 + X-Frame-Options: SAMEORIGIN
  // VidPlus Anime (Sub/Dub) — same domain, same 403
  // SmashyStream — DNS/connection failure (fetch failed)
  // Vidify — TIMEOUT (8s+)
  // SuperEmbed — 403 + SAMEORIGIN after redirect to streamingnow.mov
  // VidSrc CC — 403 Forbidden
  // VidSrc.to — SAMEORIGIN
  // Embed.su — domain for sale
  // VidSrc Embed RU/SU — redirects to vsembed.ru → 403
  // VSrc SU — redirects to vsembed.ru → 403
  // MoviesApi.to — 404
  // VidSrc.vip — unreachable
  // StreamWish — 403
  // VidNest — 404
  // 111Movies — 404
  // VidFast — 404
  // HDStream — unreachable
  // Videasy — domain for sale
  // VidPhantom — 404
  // StreamHide — unreachable
  // Series9 — unreachable
  // VidSrc.dev — domain for sale
  // VidSrc.link — 415 + SAMEORIGIN
  // TVPizza — SAMEORIGIN (proxy can't fix CORS)
  // LordFlix — 404 + SAMEORIGIN
  // MultiEmbed — 403 after redirect
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
  if (!deadProvider) return null;
  swappedOut.set(deadProviderName, deadProvider);
  const newProvider: StreamProvider = {
    name: replacement.name,
    tier: deadProvider.tier || 2,
    category: replacement.category,
    getMovieUrl: replacement.getMovieUrl,
    getTvUrl: replacement.getTvUrl,
    getAnimeUrl: replacement.getAnimeUrl,
    useProxy: replacement.useProxy,
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
    .map((p) => {
      const rawUrl =
        mediaType === "tv" && season !== undefined && episode !== undefined
          ? p.getTvUrl(tmdbId, season, episode)
          : p.getMovieUrl(tmdbId);
      return {
        name: p.name,
        tier: p.tier,
        category: p.category,
        replaced: swappedIn.has(p.name),
        url: rawUrl,
      };
    });
}

export function getAnimeEmbedUrls(
  tmdbId: number,
  season: number,
  episode: number,
  malId?: number,
  mediaType?: 'movie' | 'tv',
  anilistId?: number,
): EmbedResult[] {
  // Default to 'tv' when mediaType not provided (backward compatible)
  const effectiveMediaType = mediaType || 'tv';
  const providers = getAllProviders();
  const generalProviders: EmbedResult[] = providers
    .filter((p) => p.category === "all")
    .sort((a, b) => a.tier - b.tier)
    // Skip general providers when tmdbId is 0 (AniList-only) — they'd produce /tv/0/1/1
    .filter((p) => !!tmdbId)
    .map((p) => {
      const rawUrl = effectiveMediaType === 'movie'
        ? p.getMovieUrl(tmdbId)
        : p.getTvUrl(tmdbId, season, episode);
      return {
        name: p.name,
        tier: p.tier,
        category: "all" as ProviderCategory,
        replaced: swappedIn.has(p.name),
        url: rawUrl,
      };
    });
  const animeProviders: EmbedResult[] = providers
    .filter((p) => p.category === "anime")
    .sort((a, b) => a.tier - b.tier)
    .map((p) => {
      // Anime-specific URL: prefer AniList > MAL ID > TMDB fallback
      let rawUrl: string;
      if (anilistId && (p as StreamProvider).getAniListUrl) {
        rawUrl = (p as StreamProvider).getAniListUrl!(anilistId, episode);
      } else if (malId && p.getAnimeUrl) {
        rawUrl = p.getAnimeUrl(malId, episode);
      } else if (mediaType === 'movie') {
        rawUrl = tmdbId ? p.getMovieUrl(tmdbId) : '';
      } else {
        rawUrl = tmdbId ? p.getTvUrl(tmdbId, season, episode) : '';
      }
      return {
        name: p.name,
        tier: p.tier,
        category: "anime" as ProviderCategory,
        replaced: swappedIn.has(p.name),
        url: rawUrl || '',
      };
    })
    .filter((p) => p.url !== ''); // Remove entries with empty URLs
  return [...animeProviders, ...generalProviders]; // Anime providers FIRST in dropdown
}