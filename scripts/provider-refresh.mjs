#!/usr/bin/env node

/**
 * Provider Refresh Script for Lumina-Stream
 *
 * Does 3 things:
 *   1. Health-checks all currently configured providers
 *   2. Tests a large list of candidate embed domains
 *   3. Updates providers.ts with the best alive ones, commits & pushes
 *
 * Usage:
 *   node scripts/provider-refresh.mjs
 *
 * Cron (runs daily at 8am Pacific):
 *   The cron job triggers this script automatically.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const PROVIDERS_FILE = resolve(PROJECT_ROOT, 'src/lib/streaming/providers.ts');
const LOG_FILE = resolve(PROJECT_ROOT, 'scripts/provider-refresh.log');

// ---- Config ----
const PING_TIMEOUT = 8000;       // 8 seconds per provider
const TEST_TMDB_MOVIE = 550;     // Fight Club — always exists
const TEST_TMDB_TV = 1396;       // Breaking Bad S1E1
const MIN_ALIVE_FOR_UPDATE = 3;  // Don't update if fewer than this are alive

// ---- Known candidate domains to test ----
// These are all known embed provider domains. We test them all and keep the best.
const CANDIDATE_DOMAINS = [
  // --- VidSrc family ---
  { name: 'VidSrc FYI',     domain: 'vidsrc.fyi',    moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc PM',      domain: 'vidsrc.pm',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc IN',      domain: 'vidsrc.in',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc IO',      domain: 'vidsrc.io',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc CC',      domain: 'vidsrc.cc',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc To',      domain: 'vidsrc.to',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc XYZ',     domain: 'vidsrc.xyz',    moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc IC',      domain: 'vidsrc.ic',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc NET',     domain: 'vidsrc.net',    moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc PRO',     domain: 'vidsrc.pro',    moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc APP',     domain: 'vidsrc.app',    moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc ME',      domain: 'vidsrc.me',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc SR',      domain: 'vidsrc.sr',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc LS',      domain: 'vidsrc.ls',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc ES',      domain: 'vidsrc.es',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc DE',      domain: 'vidsrc.de',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },
  { name: 'VidSrc RU',      domain: 'vidsrc.ru',     moviePath: '/embed/movie',  tvPath: '/embed/tv' },

  // --- Non-VidSrc providers ---
  { name: 'AutoEmbed',      domain: 'autoembed.co',        moviePath: '/movie/tmdb',  tvPath: '/tv/tmdb' },
  { name: 'VidPhantom',     domain: 'vidphantom.com',      moviePath: '/movie',       tvPath: '/tv' },
  { name: 'CodeSpecters',   domain: 'api.codespecters.com',moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'Embed.su',       domain: 'embed.su',            moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'EmbedVip',       domain: 'embedvip.com',        moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'MultiEmbed',     domain: 'multiembed.mov',      moviePath: '/movie',       tvPath: '/tv' },
  { name: 'MoviesAPI',      domain: 'moviesapi.club',      moviePath: '/movie',       tvPath: '/tv' },
  { name: '2Embed',         domain: '2embed.cc',           moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'NontonGo',       domain: 'nontongo.store',      moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'SmashyStream',   domain: 'smashystream.com',    moviePath: '/embed/movie', tvPath: '/embed/tv' },
  // WatchCartoon uses non-standard paths, skip for auto-gen
  { name: 'SuperEmbed',     domain: 'superembed.stream',   moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'Playembed',      domain: 'playembed.top',       moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'VidBinge',       domain: 'vidbinge.dev',        moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'VidPlay',        domain: 'vidplay.site',        moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'VidLink',        domain: 'vidlink.xyz',         moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'MovieFave',      domain: 'moviehax.watch',      moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'StreamRuby',     domain: 'streamruby.com',      moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'CineStream',     domain: 'cinestream.xyz',      moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'AnyEmbed',       domain: 'anyembed.xyz',        moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'EmberTokyo',     domain: 'ember.television',    moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'TVPizza',        domain: 'tvpizza.com',         moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'Series9',        domain: 'series9.io',          moviePath: '/film',        tvPath: '/series' },
  { name: 'VidSrcing',      domain: 'vidsrcing.com',       moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'VidSrcXL',       domain: 'vidsrcxl.to',         moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'VidSrcNerd',     domain: 'vidsrc.nerd',         moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'EmbedStorm',     domain: 'embedstorm.com',      moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'StreamSB',       domain: 'streamsb.net',        moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'VidSrcRest',     domain: 'vidsrc.rest',         moviePath: '/embed/movie', tvPath: '/embed/tv' },
  { name: 'VidSrcic',       domain: 'vidsrcic.com',        moviePath: '/embed/movie', tvPath: '/embed/tv' },
];

// ---- Logging ----
function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  try {
    // Append to log file
    const header = existsSync(LOG_FILE) ? '' : `=== Provider Refresh Log ===\n\n`;
    const existing = existsSync(LOG_FILE) ? readFileSync(LOG_FILE, 'utf-8') : '';
    // Keep only last 500 lines
    const lines = existing.split('\n');
    const trimmed = lines.length > 500 ? lines.slice(-400).join('\n') : existing;
    writeFileSync(LOG_FILE, trimmed + '\n' + line + '\n');
  } catch { /* ignore log write errors */ }
}

// ---- HTTP Ping ----
async function pingProvider(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT);
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

/**
 * Build a test URL for a candidate domain.
 * Different providers use different URL patterns.
 */
function buildTestUrl(candidate, type = 'movie') {
  const base = `https://${candidate.domain}`;
  if (type === 'movie') {
    // AutoEmbed uses: /movie/tmdb/550
    if (candidate.domain === 'autoembed.co') {
      return `${base}${candidate.moviePath}/${TEST_TMDB_MOVIE}`;
    }
    // VidPhantom: /movie/550
    if (candidate.domain === 'vidphantom.com') {
      return `${base}${candidate.moviePath}/${TEST_TMDB_MOVIE}`;
    }
    // Generic: /embed/movie/550
    return `${base}${candidate.moviePath}/${TEST_TMDB_MOVIE}`;
  } else {
    // AutoEmbed TV: /tv/tmdb/1396-1-1
    if (candidate.domain === 'autoembed.co') {
      return `${base}${candidate.tvPath}/${TEST_TMDB_TV}-1-1`;
    }
    // VidPhantom TV: /tv/1396/1/1
    if (candidate.domain === 'vidphantom.com') {
      return `${base}${candidate.tvPath}/${TEST_TMDB_TV}/1/1`;
    }
    // Generic TV: /embed/tv/1396/1/1
    return `${base}${candidate.tvPath}/${TEST_TMDB_TV}/1/1`;
  }
}

// ---- Test all candidates ----
async function testAllCandidates() {
  log(`Testing ${CANDIDATE_DOMAINS.length} candidate domains...`);
  const results = [];

  // Test in batches of 5 to avoid overwhelming the network
  const BATCH_SIZE = 5;
  for (let i = 0; i < CANDIDATE_DOMAINS.length; i += BATCH_SIZE) {
    const batch = CANDIDATE_DOMAINS.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (c) => {
        const movieUrl = buildTestUrl(c, 'movie');
        const tvUrl = buildTestUrl(c, 'tv');
        const movieAlive = await pingProvider(movieUrl);
        const tvAlive = await pingProvider(tvUrl);
        const alive = movieAlive && tvAlive;
        log(`  ${alive ? '✅' : '❌'} ${c.name} (${c.domain}) — movie:${movieAlive} tv:${tvAlive}`);
        return { ...c, alive, movieAlive, tvAlive };
      })
    );
    results.push(...batchResults);
  }

  const alive = results.filter(r => r.alive);
  log(`\nResults: ${alive.length} alive out of ${results.length} tested`);
  return { all: results, alive };
}

// ---- Generate providers.ts content ----
function generateProvidersFile(aliveProviders) {
  const now = new Date().toISOString().split('T')[0];

  // Pick top providers for active (max 7), rest go to replacement pool
  const tier1 = aliveProviders.slice(0, Math.min(5, aliveProviders.length));
  const tier2 = aliveProviders.slice(5, Math.min(7, aliveProviders.length));
  const replacements = aliveProviders.slice(7);

  // Build active providers array — entries have no trailing comma, join handles commas
  const tier1Lines = tier1.map(p => buildProviderEntry(p, 1)).join(',\n  ');
  const tier2Lines = tier2.map(p => buildProviderEntry(p, 2)).join(',\n  ');
  const activeLines = tier2Lines
    ? `${tier1Lines},\n  // ════════════════════════════════════════════\n  // TIER 2 — Backup\n  // ════════════════════════════════════════════\n  ${tier2Lines}`
    : tier1Lines;

  // Build replacement pool (always include some for safety)
  const poolProviders = replacements.length > 0
    ? replacements
    : aliveProviders.slice(Math.max(0, aliveProviders.length - 2)); // fallback: last 2

  const poolLines = poolProviders.map(p => {
    const movieFn = `getMovieUrl: (id) => \`${buildUrlPattern(p, 'movie')}\``;
    const tvFn = `getTvUrl: (id, s, e) => \`${buildUrlPattern(p, 'tv')}\``;
    return `  { name: '${p.name}', category: 'all', ${movieFn}, ${tvFn} }`;
  }).join(',\n');

  // Also add anime fallbacks to pool
  const animePoolLines = tier1.slice(0, 2).map(p => {
    const movieFn = `getMovieUrl: (id) => \`${buildUrlPattern(p, 'movie')}\``;
    const tvFn = `getTvUrl: (id, s, e) => \`${buildUrlPattern(p, 'tv')}\``;
    const animeFn = `getAnimeUrl: (malId, ep) => \`${buildUrlPattern(p, 'anime')}\``;
    return `  { name: '${p.name} Anime', category: 'anime', ${movieFn}, ${tvFn}, ${animeFn} }`;
  }).join(',\n');

  return `/**
 * Embed streaming providers with replacement pool
 *
 * Active providers are the ones currently served to users.
 * Replacement pool is a stash of extra provider URLs kept in reserve.
 * When a provider is detected as dead, it gets swapped with a replacement
 * from the pool. When a dead provider recovers, it goes back into the pool.
 *
 * Total: ${aliveProviders.length} active + ${poolProviders.length + 2} replacements = ${aliveProviders.length + poolProviders.length + 2} providers available
 * Categories: 'all' = movies + TV, 'anime' = anime-focused embeds
 *
 * All providers verified alive as of ${now}.
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
${poolLines},
  // Anime replacements — use general providers as fallback since
  // dedicated anime embeds (gogoanime, zoro, animepahe, etc.) are all dead
${animePoolLines},
];

// ---- Active Providers ----

const activeProviders: StreamProvider[] = [
  // ════════════════════════════════════════════
  // TIER 1 — Primary
  // ════════════════════════════════════════════
  ${activeLines}
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
`;
}

function buildProviderEntry(provider, tier) {
  const movieFn = `getMovieUrl: (id) => \`${buildUrlPattern(provider, 'movie')}\``;
  const tvFn = `getTvUrl: (id, s, e) => \`${buildUrlPattern(provider, 'tv')}\``;
  return `{
    name: "${provider.name}",
    tier: ${tier}, category: "all",
    ${movieFn},
    ${tvFn},
  }`;
}

function buildUrlPattern(provider, type) {
  const base = `https://${provider.domain}`;
  if (provider.domain === 'autoembed.co') {
    if (type === 'movie') return `${base}/movie/tmdb/\${id}`;
    if (type === 'tv') return `${base}/tv/tmdb/\${id}-\${s}-\${e}`;
    if (type === 'anime') return `${base}/tv/tmdb/\${malId}-\${Math.floor(ep / 25) + 1}-\${(ep % 25) || 25}`;
  }
  if (provider.domain === 'vidphantom.com') {
    if (type === 'movie') return `${base}/movie/\${id}`;
    if (type === 'tv') return `${base}/tv/\${id}/\${s}/\${e}`;
    if (type === 'anime') return `${base}/tv/\${malId}/\${Math.floor(ep / 25) + 1}/\${(ep % 25) || 25}`;
  }
  // Generic vidsrc pattern
  const path = type === 'movie' ? provider.moviePath : provider.tvPath;
  if (type === 'movie') return `${base}${path}/\${id}`;
  if (type === 'tv') return `${base}${path}/\${id}/\${s}/\${e}`;
  if (type === 'anime') return `${base}${path}/\${malId}/\${Math.floor(ep / 25) + 1}/\${(ep % 25) || 25}`;
  return `${base}${path}/\${id}`;
}

// ---- Git commit & push ----
function gitCommitAndPush(aliveCount, deadCount) {
  const date = new Date().toISOString().split('T')[0];
  const message = `chore: auto-refresh providers (${date}) — ${aliveCount} alive, ${deadCount} dead`;

  log(`\nCommitting: ${message}`);

  try {
    execSync(`cd "${PROJECT_ROOT}" && git add src/lib/streaming/providers.ts`, { stdio: 'pipe' });
    execSync(`cd "${PROJECT_ROOT}" && git commit -m "${message}"`, { stdio: 'pipe' });
    execSync(`cd "${PROJECT_ROOT}" && git push origin main`, { stdio: 'pipe' });
    log('✅ Successfully committed and pushed to GitHub');
  } catch (err) {
    log(`⚠️ Git error (maybe no changes or push failed): ${err.message?.slice(0, 200)}`);
  }
}

// ---- Main ----
async function main() {
  log('========== Provider Refresh Start ==========');

  // 1. Test all candidates
  const { all, alive } = await testAllCandidates();
  const dead = all.filter(r => !r.alive);

  if (alive.length < MIN_ALIVE_FOR_UPDATE) {
    log(`⚠️ Only ${alive.length} providers alive (minimum ${MIN_ALIVE_FOR_UPDATE}). Skipping update to avoid breaking the app.`);
    log(`Dead providers will rely on in-app replacement pool.`);
    log('========== Provider Refresh End (skipped) ==========');
    return;
  }

  // 2. Generate new providers.ts
  const newContent = generateProvidersFile(alive);

  // 3. Backup old file
  const backupPath = PROVIDERS_FILE + `.backup.${new Date().toISOString().replace(/[:.]/g, '-')}`;
  try {
    if (existsSync(PROVIDERS_FILE)) {
      writeFileSync(backupPath, readFileSync(PROVIDERS_FILE, 'utf-8'));
      log(`Backup saved: ${backupPath}`);
    }
  } catch (err) {
    log(`⚠️ Backup failed: ${err.message}`);
  }

  // 4. Write new file
  try {
    writeFileSync(PROVIDERS_FILE, newContent, 'utf-8');
    log(`\n✅ Updated providers.ts with ${alive.length} alive providers:`);
    alive.forEach((p, i) => log(`   ${i + 1}. ${p.name} (${p.domain})`));
  } catch (err) {
    log(`❌ Failed to write providers.ts: ${err.message}`);
    return;
  }

  // 5. Commit and push (skip in GitHub Actions — workflow handles it)
  if (!process.env.GITHUB_ACTIONS) {
    gitCommitAndPush(alive.length, dead.length);
  } else {
    log('Running in GitHub Actions — skipping git push (workflow handles it)');
  }

  log('========== Provider Refresh End ==========');
}

main().catch(err => {
  log(`❌ Fatal error: ${err.message}`);
  process.exit(1);
});