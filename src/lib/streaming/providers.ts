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
  getMovieUrl: (tmdbId: number) => string;
  getTvUrl: (tmdbId: number, season: number, episode: number) => string;
  getAnimeUrl?: (malId: number, episode: number) => string;
}

const REPLACEMENT_POOL: ReplacementEntry[] = [
  // General (TMDB) replacements — verified alive
  // StreamWish — promoted to active TIER 2 (removed from pool)
  // VidSrc TW removed — old domain, replaced by new vidsrc-me.ru/su family
  { name: 'AutoEmbed', category: 'all', getMovieUrl: (id) => `https://autoembed.co/movie/tmdb/${id}`, getTvUrl: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}` },
  // TVPizza — removed for SAMEORIGIN, available via iframe-proxy in active list
  // LordFlix removed — X-Frame-Options: SAMEORIGIN (blocks iframe embed)
  // VidoLol removed — unreachable (fetch failed)
  // MoviesAPI removed — unreachable (fetch failed)
  // VidSrc PM removed — dead
  // MovieBox removed — standalone app, not an embed provider
  { name: 'StreamSilk', category: 'all', getMovieUrl: (id) => `https://streamsilk.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamsilk.com/embed/tv/${id}/${s}/${e}` },
  // Series9 promoted to active TIER 2
  // HDStream — promoted to active TIER 2 (removed from pool)
  // StreamHide promoted to active TIER 2
  // MixDrop promoted to active TIER 2
  // VUpload —
  { name: 'Series9API', category: 'all', getMovieUrl: (id) => `https://api.series9.io/film/${id}`, getTvUrl: (id, s, e) => `https://api.series9.io/series/${id}/${s}/${e}` },
  { name: 'VidSrc FYI', category: 'all', getMovieUrl: (id) => `https://vidsrc.fyi/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.fyi/embed/tv/${id}/${s}/${e}` },
  { name: 'StreamLare', category: 'all', getMovieUrl: (id) => `https://streamlare.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamlare.com/embed/tv/${id}/${s}/${e}` },
  { name: 'PStream', category: 'all', getMovieUrl: (id) => `https://iframe.pstream.org/embed/tmdb-movie-${id}`, getTvUrl: (id, s, e) => `https://iframe.pstream.org/embed/tmdb-tv-${id}/${s}/${e}` },
  // VidPhantom promoted to active TIER 2
  // FileMoon promoted to active TIER 2
  // VidSrc IO removed — old domain, replaced by new vidsrcme.ru/su family
  // VidSrc IN removed — dead
  { name: 'StreamSB', category: 'all', getMovieUrl: (id) => `https://streamsb.net/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://streamsb.net/embed/tv/${id}/${s}/${e}` },
  // SuperEmbed promoted to active TIER 2
  // PerEmbed removed — unreachable (fetch failed)
  // PrimeWire removed — defunct due to legal action
  // FreEmbed removed — confirmed dead (unreachable)
  // VidCore removed — confirmed dead (unreachable)
  { name: 'MoviesAPI', category: 'all', getMovieUrl: (id) => `https://moviesapi.club/movie/${id}`, getTvUrl: (id, s, e) => `https://moviesapi.club/tv/${id}-${s}-${e}` },
  // GoDrive removed — Google Drive embed tool, not a streaming provider
  { name: 'VidoLol', category: 'all', getMovieUrl: (id) => `https://vido.lol/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vido.lol/embed/tv/${id}/${s}/${e}` },
  // 4KHDHub removed — confirmed dead (unreachable)
  // DahmerMovies removed — confirmed dead (unreachable)
  { name: 'LordFlix', category: 'all', getMovieUrl: (id) => `https://lordflix.com/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://lordflix.com/embed/tv/${id}/${s}/${e}` },
  // Videasy promoted to active TIER 2
  // VixSrc removed — confirmed dead (unreachable)
  // NoTorrent removed — decentralized torrent client, not an embed provider
  // VidSrc SU — promoted to active TIER 1 (removed from pool)
  // VidSrc RU — promoted to active TIER 1 (removed from pool)
  { name: 'VidSrc PRO', category: 'all', getMovieUrl: (id) => `https://vidsrc.pro/embed/movie/${id}`, getTvUrl: (id, s, e) => `https://vidsrc.pro/embed/tv/${id}/${s}/${e}` },
  // VidSrc RIP removed — confirmed dead (unreachable)
  // VidSrc VIP removed — unreachable (fetch failed)
  // VidSrc BZ removed — old domain, replaced by new family
  // VidSrc GD removed — old domain, replaced by new family
  // VidSrc DO removed — old domain, replaced by new family
  // VidSrc DEV removed — promoted to active TIER 2
  // VidSrc XYZ removed — unreachable (fetch failed)
  // VidSrc NET removed — unreachable (fetch failed)
  // VidSrc MN removed — unreachable (fetch failed)
  // Anime replacements
  // (VidSrc WIN Anime promoted to active TIER 1 — verified 200, 114ms, no XFO)
  // NetPlay Anime removed — Thai IPTV service, not an embed provider
  // Kwik Anime removed — X-Frame-Options: SAMEORIGIN (blocks iframe embed)
  // FileMoon Anime removed — unreachable (fetch failed)
];

// ---- Active Providers ----

const activeProviders: StreamProvider[] = [
  // ══════════════════════════════════════════════════════════════════
  // ANIME TIER 1 — Dedicated anime streaming providers
  // These providers appear first in the dropdown for anime content.
  // Cinezo: AniList-native, sub/dub support, multi-language. Gold standard.
  // VidSrc WIN: TMDB-based anime, fast fallback.
  // ══════════════════════════════════════════════════════════════════

  // Cinezo Anime (Sub) — BEST: AniList-native embed, sub/dub, multi-language
  // Verified 200, ~600ms, no XFO, no CSP block. ?dub=false for sub.
  {
    name: "Cinezo Anime (Sub)",
    tier: 1, category: "anime",
    getMovieUrl: (id) => `https://player.cinezo.live/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.cinezo.live/embed/tv/${id}/${s}/${e}`,
    getAniListUrl: (anilistId, ep) => `https://player.cinezo.live/embed/anime/${anilistId}/${ep}`,
  },

  // Cinezo Anime (Dub) — BEST: Same as above but with English dub.
  // Verified 200, ~280ms, no XFO. ?dub=true for dub.
  {
    name: "Cinezo Anime (Dub)",
    tier: 1, category: "anime",
    getMovieUrl: (id) => `https://player.cinezo.live/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.cinezo.live/embed/tv/${id}/${s}/${e}`,
    getAniListUrl: (anilistId, ep) => `https://player.cinezo.live/embed/anime/${anilistId}/${ep}?dub=true`,
  },

  // VidSrc WIN Anime — Fast TMDB/MAL-based anime embed.
  // Verified 200, ~153ms, no XFO. Fallback for anime without AniList IDs.
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

  // VidSrc CC — Previously removed for SAMEORIGIN, now re-enabled via iframe-proxy
  // Verified working when proxied (server-side fetch bypasses XFO)
  {
    name: "VidSrc CC",
    tier: 1, category: "all", useProxy: true,
    getMovieUrl: (id) => `https://vidsrc.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.cc/embed/tv/${id}/${s}/${e}`,
  },

  // VidSrc.to — Previously removed for SAMEORIGIN, now re-enabled via iframe-proxy
  {
    name: "VidSrc.to",
    tier: 1, category: "all", useProxy: true,
    getMovieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },

  // 1. VidSrc SU — Replacement for blocked VidSrc CC, confirmed working
  {
    name: "VidSrc SU",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.su/embed/tv/${id}/${s}/${e}`,
  },

  // 2. Embed.su — Clean player, minimal ads, fast CDN, non-vidsrc
  {
    name: "Embed.su",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },

  // SmashyStream removed — confirmed dead (unreachable)

  // Vidify removed — music player app, not an embed provider
  // Cine.su removed — brand new domain with very low trust score
  // AutoEmbed removed — confirmed dead (autoembed.cc unreachable)

  // 2. VidSrc RU — Replacement for blocked VidSrc.to, confirmed working
  {
    name: "VidSrc RU",
    tier: 1, category: "all",
    getMovieUrl: (id) => `https://vidsrc.ru/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.ru/embed/tv/${id}/${s}/${e}`,
  },

  // VidSrc Embed RU — REMOVED: redirects to vsembed.ru → 403 SAMEORIGIN (blocks iframe embed)
  // VidSrc Embed SU — REMOVED: redirects to vsembed.ru → 403 SAMEORIGIN (blocks iframe embed)
  // VSrc SU — REMOVED: redirects to vsembed.ru → 403 SAMEORIGIN (blocks iframe embed)

  // VidSrcMe RU — new vidsrcme family
  {
    name: "VidSrcMe RU",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrcme.ru/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrcme.ru/embed/tv/${id}/${s}/${e}`,
  },

  // VidSrcMe SU — .su variant
  {
    name: "VidSrcMe SU",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrcme.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrcme.su/embed/tv/${id}/${s}/${e}`,
  },

  // VidSrc-Me RU — hyphenated variant
  {
    name: "VidSrc-Me RU",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc-me.ru/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc-me.ru/embed/tv/${id}/${s}/${e}`,
  },

  // VidSrc-Me SU — hyphenated .su variant
  {
    name: "VidSrc-Me SU",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc-me.su/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc-me.su/embed/tv/${id}/${s}/${e}`,
  },

  // MultiEmbed — REMOVED: redirects to streamingnow.mov → 403 SAMEORIGIN (blocks iframe embed)

  // ════════════════════════════════════════════
  // TIER 2 — Backup (promoted from pool if TIER 1 dies)
  // ════════════════════════════════════════════
  // VidSrc.me removed — old domain, replaced by new vidsrcme.ru/su family
  // VidSrc.rip removed — confirmed dead (unreachable)
  {
    name: "Nontongo",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://nontongo.win/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://nontongo.win/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: "MoviesApi.to",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://moviesapi.to/movie/${id}`,
    getTvUrl: (id, s, e) => `https://moviesapi.to/tv/${id}-${s}-${e}`,
  },
  // VidSrc.vip — REMOVED: unreachable (fetch failed)
  // Replaced with StreamWish (confirmed 200, no XFO)
  {
    name: "StreamWish",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://streamwish.to/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://streamwish.to/embed/tv/${id}/${s}/${e}`,
  },

  // ══════════════════════════════════════════════════════════════════
  // TIER 2 — StreamX-Omega providers (verified working on production site)
  // ══════════════════════════════════════════════════════════════════

  // VidLink — Used by StreamX-Omega, supports primaryColor param
  {
    name: "VidLink",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidlink.pro/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
  },

  // AnyEmbed — TMDB-native embed, clean player
  {
    name: "AnyEmbed",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://anyembed.xyz/embed/tmdb-movie-${id}`,
    getTvUrl: (id, s, e) => `https://anyembed.xyz/embed/tmdb-tv-${id}-${s}-${e}`,
  },

  // Videasy Player — Different domain from Videasy in replacement pool
  {
    name: "Videasy Player",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://player.videasy.net/movie/${id}`,
    getTvUrl: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}`,
  },

  // VaPlayer — Russian embed provider, reliable
  {
    name: "VaPlayer",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vaplayer.ru/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vaplayer.ru/embed/tv/${id}/${s}/${e}`,
  },

  // 2Embed — Re-enabled, confirmed working on StreamX-Omega
  {
    name: "2Embed",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://www.2embed.cc/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://www.2embed.cc/embed/tv/${id}/${s}/${e}`,
  },

  // VidSrc MOV — Distinct from vidsrc.to, separate infrastructure
  {
    name: "VidSrc MOV",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.mov/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.mov/embed/tv/${id}/${s}/${e}`,
  },

  // VidNest — REMOVED: confirmed 404

  // 111Movies — Numbered domain, TMDB-based
  {
    name: "111Movies",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://www.111movies.net/movie/${id}`,
    getTvUrl: (id, s, e) => `https://www.111movies.net/tv/${id}/${s}/${e}`,
  },

  // VidFast — REMOVED: confirmed 404

  // Vyla API — REMOVED: unreachable (fetch failed)
  // Replaced with HDStream (confirmed 200, no XFO)
  {
    name: "HDStream",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://hdstream.to/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://hdstream.to/embed/tv/${id}/${s}/${e}`,
  },

  // ── NEW: Discovered via deep internet search (2026-07-05) ──

  // FilmU — NEW: clean embed API, 4K support, 820ms
  {
    name: "FilmU",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://embed.filmu.in/movie/${id}`,
    getTvUrl: (id, s, e) => `https://embed.filmu.in/tv/${id}/${s}/${e}`,
  },

  // VidSrc.pm — NEW: independent VidSrc domain, 694ms
  {
    name: "VidSrc.pm",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.pm/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`,
  },

  // VidSrc.dev — RECOVERED: was unreachable, now alive again (700ms)
  {
    name: "VidSrc.dev",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.dev/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.dev/embed/tv/${id}/${s}/${e}`,
  },

  // VidSrc.link — NEW: independent VidSrc domain, 1119ms
  {
    name: "VidSrc.link",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidsrc.link/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidsrc.link/embed/tv/${id}/${s}/${e}`,
  },

  // ── Promoted from replacement pool (verified working 2026-07-05) ──

  // VidPhantom — promoted, 598ms, no XFO
  {
    name: "VidPhantom",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://vidphantom.com/movie/${id}`,
    getTvUrl: (id, s, e) => `https://vidphantom.com/tv/${id}/${s}/${e}`,
  },

  // SuperEmbed — promoted, 693ms, no XFO
  {
    name: "SuperEmbed",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://superembed.stream/?video_id=${id}&tmdb=1`,
    getTvUrl: (id, s, e) => `https://superembed.stream/?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
  },

  // Videasy — promoted, recovered (was unreachable), 701ms
  {
    name: "Videasy",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://videasy.com/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://videasy.com/embed/tv/${id}/${s}/${e}`,
  },

  // StreamHide — promoted, 747ms
  {
    name: "StreamHide",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://streamhide.to/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://streamhide.to/embed/tv/${id}/${s}/${e}`,
  },

  // Series9 — promoted, 768ms
  {
    name: "Series9",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://series9.io/film/${id}`,
    getTvUrl: (id, s, e) => `https://series9.io/series/${id}-${s}-${e}`,
  },

  // StreamSilk — promoted, 794ms
  {
    name: "StreamSilk",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://streamsilk.com/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://streamsilk.com/embed/tv/${id}/${s}/${e}`,
  },

  // FileMoon — promoted, 1282ms
  {
    name: "FileMoon",
    tier: 2, category: "all",
    getMovieUrl: (id) => `https://filemoon.sx/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://filemoon.sx/embed/tv/${id}/${s}/${e}`,
  },

  // ── Re-enabled via iframe-proxy (SAMEORIGIN bypass) ──

  // TVPizza — was SAMEORIGIN-blocked, now works through /api/iframe-proxy
  {
    name: "TVPizza",
    tier: 2, category: "all", useProxy: true,
    getMovieUrl: (id) => `https://tvpizza.com/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://tvpizza.com/embed/tv/${id}/${s}/${e}`,
  },

  // LordFlix — was SAMEORIGIN-blocked, now works through /api/iframe-proxy
  {
    name: "LordFlix",
    tier: 2, category: "all", useProxy: true,
    getMovieUrl: (id) => `https://lordflix.com/embed/movie/${id}`,
    getTvUrl: (id, s, e) => `https://lordflix.com/embed/tv/${id}/${s}/${e}`,
  },

  // MultiEmbed — was redirecting to streamingnow.mov with SAMEORIGIN,
  // now works through /api/iframe-proxy
  {
    name: "MultiEmbed",
    tier: 2, category: "all", useProxy: true,
    getMovieUrl: (id) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
    getTvUrl: (id, s, e) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
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
        proxied: !!p.useProxy,
        url: p.useProxy ? `/api/iframe-proxy?url=${encodeURIComponent(rawUrl)}` : rawUrl,
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
    .map((p) => ({
      name: p.name,
      tier: p.tier,
      category: "all" as ProviderCategory,
      replaced: swappedIn.has(p.name),
      url: effectiveMediaType === 'movie'
        ? p.getMovieUrl(tmdbId)
        : p.getTvUrl(tmdbId, season, episode),
    }));
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
        proxied: !!p.useProxy,
        url: rawUrl ? (p.useProxy ? `/api/iframe-proxy?url=${encodeURIComponent(rawUrl)}` : rawUrl) : '',
      };
    })
    .filter((p) => p.url !== ''); // Remove entries with empty URLs
  return [...animeProviders, ...generalProviders]; // Anime providers FIRST in dropdown
}