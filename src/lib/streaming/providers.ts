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
  /**
   * This provider's own JS refuses to play at all inside ANY sandboxed
   * iframe (confirmed live — not a guess), regardless of which tokens are
   * granted; the only thing that satisfies it is omitting the sandbox
   * attribute entirely. That removes the containment that normally blocks
   * pop-under ads and full-tab-hijack redirects from these embeds. Kept at
   * low tier (never the default first choice) and gated behind an explicit
   * on-screen warning in IntelligentPlayer before load — see noSandboxWarning.
   */
  noSandbox?: boolean;
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
  /** See StreamProvider.noSandbox */
  noSandbox?: boolean;
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
  // Reserve providers — swapped in when an active one dies. Re-swept
  // 2026-09-14: the previous 6 entries here (VidSrc SU/RU, VSrcEmbed,
  // Vid-Src Top, VidRock, SmashyStream) were ALL confirmed broken via live
  // sandboxed-iframe testing — a dead replacement pool doesn't help when an
  // active provider fails. Replaced with confirmed-working mirror domains of
  // the Tier 1 Vidzy entry (same backend, verified identical playback) —
  // real resilience if vidzy.org specifically gets blocked/seized, rather
  // than swapping one broken provider for another.
  { name: 'VidzyCC',    category: 'all', getMovieUrl: (id) => `https://vidzy.cc/movie/${id}`,        getTvUrl: (id, s, e) => `https://vidzy.cc/serie/${id}/${s}/${e}` },
  // Same backend as VidzyCC/vidzy.org for movies, but its own TV routing —
  // /serie/ 404s here, /tv/ is correct. Verified separately, not assumed.
  { name: 'VidApiQzz',  category: 'all', getMovieUrl: (id) => `https://vidapi.qzz.io/movie/${id}`,   getTvUrl: (id, s, e) => `https://vidapi.qzz.io/tv/${id}/${s}/${e}` },
];

// ---- Active Providers ----
// Full fresh sweep 2026-09-10 — old hardcoded list removed. Each verified to
// return a real player payload (200 + HLS/player markers). Domains in the
// streaming-embed space rotate constantly; the health-check + REPLACEMENT_POOL
// handle churn, but this list should be re-swept every few weeks.

const activeProviders: StreamProvider[] = [
  // ══════════════════════════════════════════════════════════════════
  // ANIME TIER 1 — dedicated anime embeds (shown first for anime content)
  // ══════════════════════════════════════════════════════════════════
  {
    name: "Cinezo Anime (Sub)",
    tier: 1, category: "anime",
    getMovieUrl: (id) => `https://player.cinezo.live/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.cinezo.live/embed/tv/${id}/${s}/${e}`,
    getAniListUrl: (anilistId, ep) => `https://player.cinezo.live/embed/anime/${anilistId}/${ep}`,
  },
  {
    name: "Cinezo Anime (Dub)",
    tier: 1, category: "anime",
    getMovieUrl: (id) => `https://player.cinezo.live/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.cinezo.live/embed/tv/${id}/${s}/${e}`,
    getAniListUrl: (anilistId, ep) => `https://player.cinezo.live/embed/anime/${anilistId}/${ep}?dub=true`,
  },
  {
    name: "VidSrc CC Anime",
    tier: 1, category: "anime",
    getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
    getAnimeUrl: (malId, ep) => `https://vidsrc.cc/v2/embed/anime/${malId}/${ep}/sub`,
  },
  {
    name: "2Embed Anime",
    tier: 2, category: "anime",
    getMovieUrl: (id) => `https://www.2embed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embed/tv/${id}/${s}/${e}`,
    getAnimeUrl: (malId) => `https://www.2embed.cc/embed/anime/${malId}`,
  },

  // ══════════════════════════════════════════════════════════════════
  // GENERAL TIER 1 — movies + TV
  // Re-swept 2026-09-14. VidLux is the one confirmed working end-to-end
  // through the REAL production app (real origin, real CSP, real
  // IntelligentPlayer sandbox) — verified with an actual screenshot of it
  // playing real content. Everything else here was live-tested with a
  // sandboxed iframe matching the exact production sandbox attribute
  // (allow-scripts allow-same-origin allow-forms allow-presentation, no
  // popups/top-nav). Most of the wider vidsrc-alternative ecosystem has
  // adopted client-side JS that detects ANY iframe sandbox attribute
  // (regardless of which tokens are granted — confirmed by testing with
  // allow-popups/allow-top-navigation added too, no change) and refuses to
  // play, showing "please disable sandbox" instead of video.
  //
  // 111Movies is deliberately NOT here despite passing an isolated
  // file://-origin sandbox test: it failed when actually played through the
  // real app (real https origin) — its backend (vidlove.cc) showed "This
  // site broke the player" and refused to embed. A file:// parent origin
  // isn't a fully faithful stand-in for the real embedding context; the
  // ones below were all re-verified through a real HTTPS-origin test page
  // (served from the live app's own domain, not file://) after that lesson.
  {
    name: "VidLux",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidlux.xyz/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidlux.xyz/embed/tv/${id}/${s}/${e}`,
  },
  {
    // vidzy.org / vidzy.cc / vidapi.qzz.io are the same backend (confirmed —
    // identical frame-for-frame playback across all three) under different
    // domains; vidzy.cc kept in the replacement pool below as a same-service
    // mirror in case this specific domain gets blocked/seized.
    name: "Vidzy",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidzy.org/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidzy.org/serie/${id}/${s}/${e}`,
  },

  // ══════════════════════════════════════════════════════════════════
  // GENERAL TIER 2 — currently sandbox-blocked as of the 2026-09-14 sweep
  // (each confirmed via screenshot: explicit "disable sandbox" rejection,
  // not a network/reachability failure) or, for 111Movies, confirmed
  // broken specifically in the real app's origin context. Kept as
  // lower-priority fallbacks rather than deleted — this whole ecosystem's
  // domains and behavior churn constantly, and the health-check/swap
  // system in registry.ts already demotes/replaces providers that fail
  // live checks. Re-sweep periodically.
  // ══════════════════════════════════════════════════════════════════
  {
    name: "111Movies",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://111movies.com/movie/${id}`,
    getTvUrl: (id, s, e) => `https://111movies.com/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidCore",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidcore.org/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidcore.org/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidFast",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidfast.vc/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidfast.vc/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidLink",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidSrc CC",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "Videasy",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://player.videasy.to/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.videasy.to/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidSrc IO",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.io/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.io/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "VidSrc PM",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.pm/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "2Embed",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://www.2embed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "MoviesAPI",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://moviesapi.to/movie/${id}`,
    getTvUrl: (id, s, e) => `https://moviesapi.to/tv/${id}-${s}-${e}`,
  },

  // ══════════════════════════════════════════════════════════════════
  // GENERAL/ANIME TIER 3 — noSandbox required. Same "own JS refuses to
  // play inside ANY sandboxed iframe" pattern as the rejections above,
  // confirmed via direct A/B testing (adding allow-popups/allow-top-nav
  // tokens didn't help; only fully omitting the sandbox attribute does).
  // Gated behind the noSandbox flag + on-screen warning in
  // IntelligentPlayer, kept at the lowest tier so it's never the
  // default pick. VidNest is unique in this registry: one backend
  // serves movie + TV + anime (via AniList ID) in a single service, so
  // it's listed twice — once as a general entry and once as an
  // anime-category entry (VidNest Anime) — matching the existing
  // 2Embed / 2Embed Anime split pattern so it surfaces correctly in
  // both the general and anime dropdown groupings.
  // ══════════════════════════════════════════════════════════════════
  {
    name: "VidNest",
    tier: 3, category: "all",
    getMovieUrl: (id) => `https://vidnest.fun/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidnest.fun/tv/${id}/${s}/${e}`,
    noSandbox: true,
  },
  {
    name: "VidNest Anime",
    tier: 3, category: "anime",
    getMovieUrl: (id) => `https://vidnest.fun/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidnest.fun/tv/${id}/${s}/${e}`,
    getAniListUrl: (anilistId, ep) => `https://vidnest.fun/anime/${anilistId}/${ep}/sub`,
    noSandbox: true,
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
        noSandbox: p.noSandbox,
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
        noSandbox: p.noSandbox,
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
        noSandbox: p.noSandbox,
        url: rawUrl || '',
      };
    })
    .filter((p) => p.url !== ''); // Remove entries with empty URLs
  return [...animeProviders, ...generalProviders]; // Anime providers FIRST in dropdown
}