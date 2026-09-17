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
 * Last full test: 2026-09-16 — real production-app sweep (see GENERAL TIER 1
 * comment below for methodology), not just a 200-OK reachability check.
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
  // Re-swept 2026-09-16 through the REAL production app (real origin, real
  // CSP, actual provider <select> in DetailsContent, screenshotted at
  // t=5/10/15/20s — not a synthetic file:// or about:blank test, which the
  // 111Movies lesson below already showed gives false results for
  // origin-sensitive providers).
  //
  // UPDATE 2026-09-17: re-swept all four live, real Attack on Titan episode,
  // real sandboxed iframe matching IntelligentPlayer.tsx exactly. All four
  // are now confirmed DEAD and excluded from provider-intelligence.ts's
  // ANIME_POOL (they must be in BOTH this file and that pool to ever be
  // selected — removing from the pool is enough, these StreamProvider
  // entries are kept here as inert history/re-check candidates, same
  // policy as VidFast/VidSrc CC below):
  //   - 2Embed Anime: previously the one confirmed working; now shows its
  //     own explicit "Sandbox not allowed — Remove sandbox from the iframe
  //     to play" rejection. That claim above is no longer true.
  //   - Cinezo Anime (Sub) — the DEFAULT auto-picked anime provider before
  //     this fix — and Cinezo Anime (Dub): genuinely blank iframe, zero
  //     content, confirmed on THREE separate sweeps over three different
  //     days (09-14, 09-16, 09-17). Past the point of "transient outage";
  //     treated as dead until a future check finds otherwise.
  //   - VidSrc CC Anime: confirmed structurally dead via a direct real-origin
  //     sandboxed-iframe test — 403 + "X-Frame-Options: sameorigin", the
  //     same non-sandbox-related block as VidFast/VidSrc CC below.
  // Only Vidy Anime and VidNest Anime (tier 3, noSandbox) render correctly
  // right now — see those entries further down.
  {
    name: "2Embed Anime",
    tier: 1, category: "anime",
    getMovieUrl: (id) => `https://www.2embed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embed/tv/${id}/${s}/${e}`,
    getAnimeUrl: (malId) => `https://www.2embed.cc/embed/anime/${malId}`,
  },
  {
    name: "Cinezo Anime (Sub)",
    tier: 2, category: "anime",
    getMovieUrl: (id) => `https://player.cinezo.live/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.cinezo.live/embed/tv/${id}/${s}/${e}`,
    getAniListUrl: (anilistId, ep) => `https://player.cinezo.live/embed/anime/${anilistId}/${ep}`,
  },
  {
    name: "Cinezo Anime (Dub)",
    tier: 2, category: "anime",
    getMovieUrl: (id) => `https://player.cinezo.live/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.cinezo.live/embed/tv/${id}/${s}/${e}`,
    getAniListUrl: (anilistId, ep) => `https://player.cinezo.live/embed/anime/${anilistId}/${ep}?dub=true`,
  },
  {
    name: "VidSrc CC Anime",
    tier: 2, category: "anime",
    getMovieUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}`,
    getAnimeUrl: (malId, ep) => `https://vidsrc.cc/v2/embed/anime/${malId}/${ep}/sub`,
  },

  // ══════════════════════════════════════════════════════════════════
  // GENERAL TIER 1 — movies + TV
  // Re-swept 2026-09-16 through the REAL production app end to end: real
  // origin, real CSP, the actual provider <select> in DetailsContent,
  // cycled option by option with a 5-8s settle + screenshot each (not the
  // synthetic file:///about:blank sandbox test the 2026-09-14 sweep used,
  // which the 111Movies case below already showed gives false results for
  // origin-sensitive providers — several entries that sweep marked dead
  // turned out to render fine here).
  //
  // VidCore is the new default: 98% live score, confirmed actually
  // playing (real progress timestamp advancing). VidLux — the previous
  // default — is demoted, not removed: it mounts a player shell
  // ("CONNECTING SPIDER") but never gets past 0:00/0:00 even after 30s,
  // with "[Encryption] Decrypt failed" in its own console. That's a
  // same-provider transient/decrypt-scheme issue, not a sandbox rejection,
  // so it's kept as a fallback rather than deleted.
  {
    name: "VidCore",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidcore.org/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidcore.org/embed/tv/${id}/${s}/${e}`,
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
  // GENERAL TIER 2 — confirmed working (real player UI, poster + play
  // button) in the same 2026-09-16 real-app sweep, just not the default
  // pick. VidLux demoted here from tier 1 — see note above.
  //
  // UPDATE 2026-09-17 (2Embed): re-swept with a real movie AND a real TV
  // episode. Movie is fine ("Inception (2010)", correct). TV is NOT — it
  // loaded a completely unrelated title, "Butchered (2003)", instead of
  // the requested show. Excluded from provider-intelligence.ts's TV_POOL
  // specifically (still included for movies, where it's confirmed correct)
  // rather than removed outright.
  // ══════════════════════════════════════════════════════════════════
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
  {
    name: "VidLux",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidlux.xyz/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidlux.xyz/embed/tv/${id}/${s}/${e}`,
  },

  // ══════════════════════════════════════════════════════════════════
  // GENERAL TIER 3 — noSandbox required. Same "own JS refuses to play
  // inside ANY sandboxed iframe" pattern for all of these, each individually
  // confirmed by direct A/B test on 2026-09-16 (identical iframe, only the
  // sandbox attribute removed) — with sandbox: explicit rejection text
  // ("Please Disable Sandbox" / "Playback blocked" / etc). Without it: a
  // real player, poster + play button, screenshotted. This is a deliberate,
  // scoped trade-off — pop-under ads and full-tab-hijack redirects are no
  // longer contained for these specific sources — accepted here because the
  // sandboxed pool alone was too thin. Gated behind the noSandbox flag +
  // on-screen warning in IntelligentPlayer, kept at the lowest tier so
  // sandboxed providers are always tried first.
  //
  // NOT added despite being tested the same way: VidFast, VidSrc CC, and
  // VidSrc CC Anime reject with X-Frame-Options: sameorigin, a server-side
  // header check that has nothing to do with the sandbox attribute —
  // confirmed still blocked with sandbox fully removed. Cinezo Anime
  // (Sub/Dub) reject with neither an error nor a rejection message, just a
  // permanently blank frame, with or without sandbox — a real outage or a
  // different bug, not a sandbox issue. noSandbox would add the ad/redirect
  // risk for these with zero playback benefit, so none of the four got it.
  {
    name: "VidLink",
    tier: 3, category: "all",
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
    noSandbox: true,
  },
  {
    name: "VidSrc IO",
    tier: 3, category: "all",
    getMovieUrl: (id) => `https://vidsrc.io/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.io/embed/tv/${id}/${s}/${e}`,
    noSandbox: true,
  },
  {
    name: "Videasy",
    tier: 3, category: "all",
    getMovieUrl: (id) => `https://player.videasy.to/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.videasy.to/tv/${id}/${s}/${e}`,
    noSandbox: true,
  },
  {
    // Confirmed via a real loading spinner replacing the explicit "Playback
    // blocked" rejection once sandbox was removed — didn't finish loading
    // inside this sweep's wait window, so treat as likely-good rather than
    // fully confirmed; re-check if it doesn't pan out live.
    name: "VidSrc PM",
    tier: 3, category: "all",
    getMovieUrl: (id) => `https://vidsrc.pm/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`,
    noSandbox: true,
  },
  {
    name: "111Movies",
    tier: 3, category: "all",
    getMovieUrl: (id) => `https://111movies.com/movie/${id}`,
    getTvUrl: (id, s, e) => `https://111movies.com/tv/${id}/${s}/${e}`,
    noSandbox: true,
  },
  // New find, 2026-09-16: multi-quality (480p-4K), multi-server, real
  // subtitle/audio UI — confirmed via real screenshot for movie, TV, AND
  // anime (same backend serves all three, like VidNest). Sandboxed shows
  // "Iframe Sandbox Detected" and refuses to play; fully working the moment
  // sandbox is removed.
  {
    name: "Vidy",
    tier: 3, category: "all",
    getMovieUrl: (id) => `https://vidy.st/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidy.st/tv/${id}/${s}/${e}`,
    noSandbox: true,
  },
  {
    name: "Vidy Anime",
    tier: 3, category: "anime",
    getMovieUrl: (id) => `https://vidy.st/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidy.st/tv/${id}/${s}/${e}`,
    getAniListUrl: (anilistId, ep) => `https://vidy.st/anime/${anilistId}/${ep}`,
    noSandbox: true,
  },
  // VidNest (and Vidy above) each have one backend serving movie + TV +
  // anime (via AniList ID) in a single service, so both are listed twice —
  // once as a general entry and once as an anime-category entry — matching
  // the 2Embed / 2Embed Anime split so they surface correctly in both
  // dropdown groupings.
  // UPDATE 2026-09-17: re-swept with a real movie AND TV episode — the
  // iframe does mount and a video genuinely plays (timestamp advances,
  // matches the real runtime), but the visible content is unrelated stock
  // footage both times (b&w aerial rooftops for the movie, a canyon/rock
  // landscape for the TV episode), not the requested title. Reads as a
  // generic buffering/loading loop rather than confirmed playback of the
  // right thing. Excluded from provider-intelligence.ts's GENERAL_PROVIDERS
  // (movie + TV) for that reason. VidNest Anime below is unaffected — it
  // tested correctly (Kodansha splash + advancing timer on the right
  // episode) and is a separate pool entry.
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