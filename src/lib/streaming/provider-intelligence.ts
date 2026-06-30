/**
 * Provider Intelligence Layer
 *
 * Replaces naive content-type → single-provider mapping with an intelligent
 * scoring, health-aware, parallel-probing provider selection system.
 *
 * Architecture:
 *   TMDB / AniList
 *       │
 *       ▼
 *   Content Analyzer (L3 content-intelligence)
 *       │
 *       ▼
 *   Provider Pool Router  ← content-type-specific pools
 *       │
 *       ▼
 *   Provider Scorer       ← multi-signal weighted scoring
 *       │   ├─ availability     (50%)
 *       │   ├─ responseSpeed    (20%)
 *       │   ├─ subtitleSupport  (10%)
 *       │   ├─ quality          (10%)
 *       │   └─ historicalSuccess(10%)
 *       │
 *       ▼
 *   Health Checker         ← background monitor, cached scores
 *       │
 *       ▼
 *   Best Provider Selected (returns ordered chain for client failover)
 *
 * Key design decisions:
 *   1. Background health monitor updates scores every few minutes (not per-request)
 *   2. Per-request parallel probing only for top-N candidates (fast startup)
 *   3. Vyla API acts as a provider aggregator (single source, multiple upstreams)
 *   4. Learned behavior from playback analytics feeds back into scoring
 *   5. Graceful fallback: if intelligence layer fails, returns tier-sorted list
 */

import { getHealth, getDeadProviders } from '@/lib/streaming/health-check';
import { getAllEmbedUrls, getAnimeEmbedUrls, getAllProviders, type EmbedResult, type ProviderTier, type ProviderCategory } from '@/lib/streaming/providers';
import { resolveContentType, type ContentTypeResult } from '@/lib/content/content-intelligence';
import { updateProviderSignal } from '@/lib/streaming/scoring';
import { emitSelectionMetric } from '@/lib/streaming/metrics';

// ── Types ──

export type ContentCategory = 'movie' | 'tv' | 'anime';

export interface ProviderPool {
  name: string;
  category: ContentCategory;
  providers: string[];  // Provider names (matched against active list)
}

export interface ScoredProvider {
  name: string;
  url: string;
  tier: ProviderTier;
  category: ProviderCategory;
  score: number;         // 0–100
  signals: ProviderSignals;
  replaced?: boolean;
}

export interface ProviderSignals {
  availability: number;      // 0–1  (is provider alive?)
  responseSpeed: number;     // 0–1  (latency-based, from health monitor)
  subtitleSupport: number;   // 0–1  (capability flag)
  quality: number;           // 0–1  (max resolution capability)
  historicalSuccess: number; // 0–1  (from learning system + recent success rate)
  learnedBonus: number;      // -0.2 to +0.2 (from L12 learning)
}

export interface IntelligenceChain {
  chain: Array<{
    provider: string;
    url: string;
    score: number;
    tier: number;
    category: string;
  }>;
  total: number;
  selectionTimeMs: number;
  contentCategory: string;
  poolUsed: string;
  signalsUsed: boolean;
}

// ── Provider Pools ──
// Curated pools with recommended providers per content category.
// Providers not in the active list are silently skipped.

const MOVIE_POOL: ProviderPool = {
  name: 'movies',
  category: 'movie',
  providers: [
    'VidSrc CC', 'Embed.su', 'VidSrc.to', 'MultiEmbed',
    'VidSrc.me', 'Nontongo', 'MoviesApi.to', 'VidSrc.vip',
    'VidSrc PM', 'StreamWish', 'AutoEmbed', 'TVPizza',
    'SuperEmbed', 'VidSrc FYI', 'Videasy', 'LordFlix',
    'VidLink', 'AnyEmbed', 'Videasy Player', 'VaPlayer',
    '2Embed', 'VidSrc MOV', 'VidNest', '111Movies', 'VidFast',
    'Vyla API',
  ],
};

const ANIME_POOL: ProviderPool = {
  name: 'anime',
  category: 'anime',
  providers: [
    'VidSrc CC', 'Embed.su', 'VidSrc.to', 'MultiEmbed',
    'VidSrc.me', 'Nontongo', 'MoviesApi.to',
    'VidSrc WIN Anime', 'Kwik Anime', 'FileMoon Anime',
    'VidSrc PM', 'StreamWish', 'AutoEmbed',
    'VidSrc FYI', 'SuperEmbed',
    'VidLink', 'AnyEmbed', 'VaPlayer',
    '2Embed', 'VidSrc MOV', 'VidNest', 'VidFast',
    'Vyla API',
  ],
};

const TV_POOL: ProviderPool = {
  name: 'tv',
  category: 'tv',
  providers: [
    'VidSrc CC', 'Embed.su', 'VidSrc.to', 'MultiEmbed',
    'VidSrc.me', 'Nontongo', 'MoviesApi.to', 'VidSrc.vip',
    'VidSrc PM', 'StreamWish', 'AutoEmbed', 'TVPizza',
    'SuperEmbed', 'VidSrc FYI', 'Videasy', 'LordFlix',
    'VidLink', 'AnyEmbed', 'Videasy Player', 'VaPlayer',
    '2Embed', 'VidSrc MOV', 'VidNest', '111Movies', 'VidFast',
    'Vyla API',
  ],
};

// ── Provider Capabilities ──
// Static capability hints for scoring. Updated as we learn more.

const PROVIDER_CAPABILITIES: Record<string, {
  subtitleSupport: number;
  quality: number;
  avgSpeed: number;  // 0–1 estimated, updated by health monitor
}> = {
  'VidSrc CC':        { subtitleSupport: 0.9, quality: 0.9, avgSpeed: 0.7 },
  'Embed.su':         { subtitleSupport: 0.7, quality: 0.85, avgSpeed: 0.8 },
  'VidSrc.to':        { subtitleSupport: 0.8, quality: 0.85, avgSpeed: 0.7 },
  'MultiEmbed':       { subtitleSupport: 0.6, quality: 0.8, avgSpeed: 0.6 },
  'VidSrc.me':        { subtitleSupport: 0.5, quality: 0.7, avgSpeed: 0.6 },
  'Nontongo':         { subtitleSupport: 0.4, quality: 0.7, avgSpeed: 0.5 },
  'MoviesApi.to':     { subtitleSupport: 0.3, quality: 0.65, avgSpeed: 0.6 },
  'VidSrc.vip':       { subtitleSupport: 0.5, quality: 0.7, avgSpeed: 0.5 },
  'VidSrc PM':        { subtitleSupport: 0.4, quality: 0.65, avgSpeed: 0.5 },
  'StreamWish':       { subtitleSupport: 0.3, quality: 0.7, avgSpeed: 0.5 },
  'AutoEmbed':        { subtitleSupport: 0.5, quality: 0.7, avgSpeed: 0.5 },
  'TVPizza':          { subtitleSupport: 0.4, quality: 0.65, avgSpeed: 0.4 },
  'SuperEmbed':       { subtitleSupport: 0.6, quality: 0.75, avgSpeed: 0.6 },
  'VidSrc FYI':       { subtitleSupport: 0.5, quality: 0.7, avgSpeed: 0.5 },
  'Videasy':          { subtitleSupport: 0.3, quality: 0.6, avgSpeed: 0.4 },
  'LordFlix':         { subtitleSupport: 0.3, quality: 0.6, avgSpeed: 0.4 },
  'Vyla API':         { subtitleSupport: 0.8, quality: 0.85, avgSpeed: 0.7 },
  'VidSrc WIN Anime': { subtitleSupport: 0.4, quality: 0.7, avgSpeed: 0.5 },
  'Kwik Anime':       { subtitleSupport: 0.3, quality: 0.65, avgSpeed: 0.4 },
  'FileMoon Anime':   { subtitleSupport: 0.3, quality: 0.65, avgSpeed: 0.4 },
  // StreamX-Omega providers
  'VidLink':          { subtitleSupport: 0.7, quality: 0.8, avgSpeed: 0.7 },
  'AnyEmbed':         { subtitleSupport: 0.6, quality: 0.8, avgSpeed: 0.7 },
  'Videasy Player':   { subtitleSupport: 0.5, quality: 0.7, avgSpeed: 0.6 },
  'VaPlayer':         { subtitleSupport: 0.3, quality: 0.7, avgSpeed: 0.5 },
  '2Embed':           { subtitleSupport: 0.5, quality: 0.75, avgSpeed: 0.6 },
  'VidSrc MOV':       { subtitleSupport: 0.5, quality: 0.75, avgSpeed: 0.6 },
  'VidNest':          { subtitleSupport: 0.4, quality: 0.7, avgSpeed: 0.5 },
  '111Movies':        { subtitleSupport: 0.3, quality: 0.65, avgSpeed: 0.5 },
  'VidFast':          { subtitleSupport: 0.4, quality: 0.7, avgSpeed: 0.7 },
};

// ── Dynamic speed cache (updated by health monitor) ──

const speedCache = new Map<string, number>();
const SPEED_CACHE_TTL = 5 * 60 * 1000; // 5 min

export function updateSpeedCache(name: string, latencyMs: number): void {
  // Convert latency to 0–1 score (lower latency = higher score)
  // <500ms = 1.0, 500ms-2s = 0.5-1.0, >2s = 0.3-0.5, >5s = 0.1
  let score: number;
  if (latencyMs < 500) score = 1.0;
  else if (latencyMs < 2000) score = 1.0 - ((latencyMs - 500) / 1500) * 0.5;
  else if (latencyMs < 5000) score = 0.5 - ((latencyMs - 2000) / 3000) * 0.2;
  else score = Math.max(0.1, 0.3 - ((latencyMs - 5000) / 10000) * 0.2);

  speedCache.set(name, score);
}

function getSpeedScore(name: string): number {
  const cached = speedCache.get(name);
  const caps = PROVIDER_CAPABILITIES[name];
  if (cached) return cached;
  if (caps) return caps.avgSpeed;
  return 0.5; // Unknown — neutral
}

// ── Historical success cache (updated by health monitor & playback events) ──

const historicalCache = new Map<string, { successRate: number; totalPlays: number; updatedAt: number }>();
const HISTORICAL_CACHE_TTL = 15 * 60 * 1000; // 15 min

export function updateHistoricalCache(name: string, success: boolean): void {
  const existing = historicalCache.get(name) || { successRate: 0.7, totalPlays: 0, updatedAt: 0 };
  const age = Date.now() - existing.updatedAt;

  // Reset if stale
  if (age > HISTORICAL_CACHE_TTL) {
    historicalCache.set(name, { successRate: success ? 1.0 : 0.0, totalPlays: 1, updatedAt: Date.now() });
    return;
  }

  // Exponential moving average (alpha = 0.1 for gradual update)
  const alpha = 0.1;
  const newRate = existing.successRate * (1 - alpha) + (success ? 1.0 : 0.0) * alpha;
  historicalCache.set(name, {
    successRate: newRate,
    totalPlays: existing.totalPlays + 1,
    updatedAt: Date.now(),
  });
}

function getHistoricalScore(name: string): number {
  const cached = historicalCache.get(name);
  if (cached && (Date.now() - cached.updatedAt) < HISTORICAL_CACHE_TTL) {
    return cached.successRate;
  }
  return 0.7; // Default: assume mostly working
}

// ── Pool Router ──

function selectPool(contentType: ContentTypeResult): ProviderPool {
  switch (contentType.type) {
    case 'anime':
      return ANIME_POOL;
    case 'movie':
      return MOVIE_POOL;
    default:
      return TV_POOL;
  }
}

// ── Scoring Engine ──

/**
 * Score a single provider using the intelligence formula:
 *   score = availability * 50 + responseSpeed * 20 + subtitleSupport * 10
 *         + quality * 10 + historicalSuccess * 10 + learnedBonus * 100
 *
 * Returns 0–100 range. learnedBonus is -0.2 to +0.2 (mapped to -20 to +20).
 */
function scoreProviderIntelligent(
  provider: EmbedResult,
  learnedBonus: number = 0,
): ScoredProvider {
  const caps = PROVIDER_CAPABILITIES[provider.name];

  // Signal 1: Availability (50 pts) — from health checker
  const health = getHealth(provider.name);
  const availability: number = health === true ? 1.0
    : health === false ? 0.0
    : 0.5; // Unknown — neutral

  // Signal 2: Response Speed (20 pts) — from dynamic speed cache
  const responseSpeed = getSpeedScore(provider.name);

  // Signal 3: Subtitle Support (10 pts) — from capabilities
  const subtitleSupport = caps?.subtitleSupport ?? 0.5;

  // Signal 4: Quality (10 pts) — from capabilities
  const quality = caps?.quality ?? 0.6;

  // Signal 5: Historical Success (10 pts) — from learning + health signals
  const historicalSuccess = getHistoricalScore(provider.name);

  // Combine: 0–100 scale
  const rawScore =
    availability * 50 +
    responseSpeed * 20 +
    subtitleSupport * 10 +
    quality * 10 +
    historicalSuccess * 10;

  // Add learned bonus (-20 to +20 points)
  const finalScore = Math.max(0, Math.min(100, rawScore + (learnedBonus * 100)));

  return {
    name: provider.name,
    url: provider.url,
    tier: provider.tier,
    category: provider.category,
    score: Math.round(finalScore * 10) / 10,
    signals: {
      availability,
      responseSpeed,
      subtitleSupport,
      quality,
      historicalSuccess,
      learnedBonus,
    },
    replaced: provider.replaced,
  };
}

// ── Parallel Probing ──

const PROBE_TIMEOUT = 3000; // 3 seconds per probe
const MAX_PARALLEL_PROBES = 5; // Only probe top candidates

interface ProbeResult {
  name: string;
  alive: boolean;
  latencyMs: number;
}

async function probeProvider(url: string, name: string): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT);
    await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
    clearTimeout(timeout);
    const latency = Date.now() - start;
    updateSpeedCache(name, latency);
    updateHistoricalCache(name, true);
    return { name, alive: true, latencyMs: latency };
  } catch {
    const latency = Date.now() - start;
    updateHistoricalCache(name, false);
    return { name, alive: false, latencyMs: latency };
  }
}

/**
 * Probe top-N providers in parallel to get real-time health data.
 * Updates speed and historical caches with results.
 * Returns set of providers confirmed alive.
 */
async function parallelProbe(
  candidates: EmbedResult[],
  count: number = MAX_PARALLEL_PROBES,
): Promise<Set<string>> {
  const toProbe = candidates.slice(0, count);
  const results = await Promise.all(
    toProbe.map(p => probeProvider(p.url, p.name)),
  );

  const alive = new Set<string>();
  for (const r of results) {
    if (r.alive) alive.add(r.name);
  }
  return alive;
}

// ── Main Intelligence Function ──

/**
 * Select the best providers using the Provider Intelligence Layer.
 *
 * Flow:
 *   1. Content Analyzer → determine pool (movie/anime/tv)
 *   2. Get candidates from pool ∩ active providers
 *   3. Score each candidate using multi-signal formula
 *   4. Sort by score (highest first)
 *   5. Return ordered chain for client-side failover
 *
 * @param options - Content identification parameters
 * @returns IntelligenceChain with scored, ordered provider chain
 */
export async function selectWithIntelligence(options: {
  tmdbId?: number;
  malId?: number;
  mediaType?: 'movie' | 'tv';
  season?: number;
  episode?: number;
  isAnime?: boolean;
  genres?: string[];
  genreIds?: number[];
  /** If true, skip parallel probing (use cached scores only) */
  fastMode?: boolean;
}): Promise<IntelligenceChain> {
  const startTime = Date.now();

  // Step 1: Content Analysis
  const contentType = resolveContentType({
    id: options.tmdbId || undefined,
    mediaType: options.mediaType,
    isAnime: options.isAnime || undefined,
    malId: options.malId,
    genres: options.genres,
    genreIds: options.genreIds,
  });

  // Step 2: Pool Selection
  const pool = selectPool(contentType);

  // Step 3: Get all embed URLs and filter by pool
  const useAnimePool = contentType.type === 'anime' || !!options.malId;
  const tmdbId = options.tmdbId || 0;
  const season = options.season || 1;
  const episode = options.episode || 1;

  let allProviders: EmbedResult[];
  if (useAnimePool) {
    allProviders = getAnimeEmbedUrls(tmdbId, season, episode, options.malId);
  } else {
    const type = contentType.type === 'movie' ? 'movie' : 'tv';
    allProviders = getAllEmbedUrls(type, tmdbId, season, episode);
  }

  // Filter to only pool members (preserves order from pool priority)
  const poolSet = new Set(pool.providers);
  let candidates = allProviders.filter(p => poolSet.has(p.name));

  // If no pool members found in active list, fall back to all providers
  if (candidates.length === 0) {
    candidates = allProviders;
  }

  // Filter out known-dead providers (from health checker)
  try {
    const dead = await getDeadProviders();
    if (dead.size > 0) {
      candidates = candidates.filter(p => !dead.has(p.name));
    }
  } catch {
    // Health check failed — proceed with all candidates
  }

  // Step 4: Get learned bonuses (async, non-blocking)
  let learnedBonuses = new Map<string, number>();
  try {
    const { getAllLearnedScores } = await import('@/lib/streaming/learning');
    learnedBonuses = await getAllLearnedScores();
  } catch {
    // Learning system unavailable — no bonus
  }

  // Step 5: Score all candidates
  let scored = candidates.map(p => {
    const bonus = learnedBonuses.get(p.name) ?? 0;
    return scoreProviderIntelligent(p, bonus);
  });

  // Step 6: Parallel probe top candidates (unless fast mode or too few)
  let signalsUsed = false;
  if (!options.fastMode && scored.length > 1) {
    try {
      const probeCount = Math.min(MAX_PARALLEL_PROBES, scored.length);
      const aliveFromProbe = await parallelProbe(candidates, probeCount);
      signalsUsed = true;

      // Re-score with updated caches (probes updated speed + historical)
      const probedSet = new Set(aliveFromProbe);  // providers confirmed alive
      const deadSet = candidates.slice(0, probeCount).filter(p => !aliveFromProbe.has(p.name)).map(p => p.name);
      const knownDead = new Set(deadSet);

      scored = candidates.map(p => {
        const bonus = learnedBonuses.get(p.name) ?? 0;
        const result = scoreProviderIntelligent(p, bonus);

        // Only penalize providers that were actually probed AND confirmed dead
        // (don't penalize providers that weren't probed at all)
        if (knownDead.has(p.name)) {
          result.signals.availability = 0;
          result.score = Math.round((result.signals.subtitleSupport * 10 + result.signals.responseSpeed * 20 + result.signals.quality * 10 + result.signals.historicalSuccess * 10) * 10) / 10;
        }

        return result;
      });
    } catch {
      // Probing failed — use cached scores only
    }
  }

  // Step 7: Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);

  // Step 8: Build chain for client
  const chain = scored.map(s => ({
    provider: s.name,
    url: s.url,
    score: s.score,
    tier: s.tier,
    category: s.category,
  }));

  // Emit selection metrics (fire-and-forget)
  if (chain.length > 0) {
    emitSelectionMetric({
      provider: chain[0].provider,
      latencyMs: Date.now() - startTime,
      score: chain[0].score,
      fallbackUsed: chain[0].tier >= 2,
      selectionPath: `intelligence:${pool.name}`,
      timestamp: Date.now(),
    }).catch(() => {});
  }

  return {
    chain,
    total: chain.length,
    selectionTimeMs: Date.now() - startTime,
    contentCategory: contentType.type,
    poolUsed: pool.name,
    signalsUsed,
  };
}

// ── Feedback Integration ──

/**
 * Record a provider playback result for learning.
 * Called by the client when a provider succeeds or fails.
 */
export function recordProviderResult(providerName: string, success: boolean): void {
  updateHistoricalCache(providerName, success);
  updateProviderSignal(providerName, success, true);
}

/**
 * Get the provider pools configuration (for admin/debug).
 */
export function getProviderPools(): ProviderPool[] {
  return [MOVIE_POOL, ANIME_POOL, TV_POOL];
}

/**
 * Get detailed scoring breakdown for a provider (for admin/debug).
 */
export function getProviderScoringDetail(name: string): ScoredProvider | null {
  const caps = PROVIDER_CAPABILITIES[name];
  const health = getHealth(name);

  return {
    name,
    url: '',
    tier: 1,
    category: 'all',
    score: 0,
    signals: {
      availability: health === true ? 1.0 : health === false ? 0.0 : 0.5,
      responseSpeed: getSpeedScore(name),
      subtitleSupport: caps?.subtitleSupport ?? 0.5,
      quality: caps?.quality ?? 0.6,
      historicalSuccess: getHistoricalScore(name),
      learnedBonus: 0,
    },
  };
}