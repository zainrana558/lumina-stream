/**
 * Smart Provider Selection Engine
 *
 * Orchestrates: scoring → filtering → parallel validation → best pick.
 * Replaces the old "filter dead, return all sorted by tier" approach.
 *
 * Flow:
 *   1. Get alive providers from health:alive ZSET
 *   2. Score them via multi-signal scoring
 *   3. Take top-N (N=3)
 *   4. Validate in parallel (HEAD request, 3s timeout)
 *   5. Return first validated winner
 *
 * Fallback chain:
 *   scored → validated → winner
 *   If top-N all fail → expand to degraded → expand to all active → hardcoded fallback
 *
 * Determinism: Same input within 60s → same provider (score stability window).
 * Timeout budget: Total selection ≤ 4s (3s validation + 1s scoring/lookup).
 */

import { getAllProviders, type StreamProvider, getAllEmbedUrls, getAnimeEmbedUrls, type EmbedResult } from './providers';
import { getProviderRegistry, type ProviderRecord } from './registry';
import { getAllHealthRecords, getAliveProvidersSorted, type HealthRecord } from './health-check';
import { scoreProviders, getTopN, type ProviderScore } from './scoring';

// ── Types ──

export interface SelectionRequest {
  contentId: string; // TMDB ID or MAL ID
  contentType: 'movie' | 'tv' | 'anime';
  tmdbId: number;
  season?: number;
  episode?: number;
  malId?: number;
  preferTier?: number;
  excludeProviders?: string[];
  /** Force a specific provider (skip scoring) */
  forceProvider?: string;
}

export interface SelectionResult {
  provider: string;
  url: string;
  score: number;
  tier: number;
  category: string;
  validationTimeMs: number;
  totalTimeMs: number;
  fallbackUsed: boolean;
  selectionPath: string;
  /** All providers returned for client-side failover chain */
  chain: Array<{
    provider: string;
    url: string;
    score: number;
    tier: number;
  }>;
  /** Debug info (only included in non-production) */
  debug?: {
    allScores: Array<{
      provider: string;
      score: number;
      reasons: string[];
    }>;
    validationResults: Array<{
      provider: string;
      validated: boolean;
      latencyMs: number;
    }>;
  };
}

// ── Validation ──

const VALIDATION_TIMEOUT = 3000; // 3s per HEAD request

async function validateUrl(url: string): Promise<{ valid: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT);
    await fetch(url, { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
    clearTimeout(timeout);
    return { valid: true, latencyMs: Date.now() - start };
  } catch {
    return { valid: false, latencyMs: Date.now() - start };
  }
}

// ── URL Generation ──

function generateUrl(
  provider: StreamProvider,
  req: SelectionRequest
): string | null {
  if (req.contentType === 'anime' && provider.getAnimeUrl && req.malId) {
    return provider.getAnimeUrl(req.malId, req.episode || 1);
  }
  if (req.contentType === 'tv') {
    return provider.getTvUrl(req.tmdbId, req.season || 1, req.episode || 1);
  }
  return provider.getMovieUrl(req.tmdbId);
}

function filterByCategory(providers: StreamProvider[], contentType: SelectionRequest['contentType']): StreamProvider[] {
  if (contentType === 'anime') {
    // For anime: include both 'all' and 'anime' category providers
    return providers.filter(p => p.category === 'all' || p.category === 'anime');
  }
  // For movie/tv: only 'all' category
  return providers.filter(p => p.category === 'all');
}

// ── Build Provider Records from StreamProviders ──

function toProviderRecords(providers: StreamProvider[]): ProviderRecord[] {
  return providers.map(p => ({
    name: p.name,
    tier: p.tier,
    category: p.category,
    isActive: true,
    updatedAt: new Date().toISOString(),
    replaced: false,
    movieUrlPattern: p.getMovieUrl(0).replace(/\/0$/, '/{id}'),
    tvUrlPattern: p.getTvUrl(0, 1, 1).replace(/\/0\//, '/{id}/').replace(/\/1\/1$/, '/{s}/{e}'),
    animeUrlPattern: p.getAnimeUrl
      ? p.getAnimeUrl(0, 1).replace(/\/0\//, '/{id}/').replace(/\/1$/, '/{ep}')
      : undefined,
  }));
}

// ── Core Selection ──

export async function selectProvider(req: SelectionRequest): Promise<SelectionResult> {
  const totalStart = Date.now();
  const selectionPath: string[] = [];

  // Step 1: Get candidate providers
  let candidates = getAllProviders();
  candidates = filterByCategory(candidates, req.contentType);
  selectionPath.push('candidates');

  // If force provider, skip scoring
  if (req.forceProvider) {
    const forced = candidates.find(p => p.name === req.forceProvider);
    if (forced) {
      const url = generateUrl(forced, req);
      if (url) {
        return {
          provider: forced.name,
          url,
          score: 0,
          tier: forced.tier,
          category: forced.category,
          validationTimeMs: 0,
          totalTimeMs: Date.now() - totalStart,
          fallbackUsed: false,
          selectionPath: 'forced',
          chain: [{ provider: forced.name, url, score: 0, tier: forced.tier }],
        };
      }
    }
  }

  // Step 2: Get health data
  const healthData = await getAllHealthRecords();
  selectionPath.push('health-loaded');

  // Step 3: Convert to ProviderRecords and score
  const records = toProviderRecords(candidates);
  const scored = scoreProviders(records, healthData, {
    excludeProviders: req.excludeProviders,
    preferTier: req.preferTier,
  });
  selectionPath.push('scored');

  // Step 4: Filter out dead providers from scored results
  let alive = scored.filter(s => !s.healthRecord || s.healthRecord.status !== 'dead');

  // If no alive providers, expand to include degraded
  if (alive.length === 0) {
    alive = scored.filter(s => !s.healthRecord || s.healthRecord.status !== 'dead');
    selectionPath.push('degraded-include');
  }

  // If still empty, use all scored (no health data)
  if (alive.length === 0) {
    alive = scored;
    selectionPath.push('all-active');
  }

  // Step 5: Take top-N
  const topN = getTopN(alive, 3);

  // Step 6: Validate top-N in parallel
  const validationStart = Date.now();
  type ValidatedScore = ProviderScore & { validated: boolean; validationLatencyMs: number; url?: string };
  const validationPromises = topN.map(async (s): Promise<ValidatedScore> => {
    const provider = candidates.find(p => p.name === s.provider.name);
    if (!provider) return { ...s, validated: false, validationLatencyMs: 0 };

    const url = generateUrl(provider, req);
    if (!url) return { ...s, validated: false, validationLatencyMs: 0, url: undefined };

    const result = await validateUrl(url);
    return { ...s, validated: result.valid, validationLatencyMs: result.latencyMs, url };
  });

  const validationResults = await Promise.all(validationPromises);
  const validationTimeMs = Date.now() - validationStart;
  selectionPath.push('validated');

  // Step 7: Pick first validated winner
  const winner = validationResults.find(r => r.validated);

  if (winner && winner.url) {
    const chain = validationResults
      .filter(r => r.url)
      .map(r => ({
        provider: r.provider.name,
        url: r.url!,
        score: r.score,
        tier: r.provider.tier,
      }));

    return {
      provider: winner.provider.name,
      url: winner.url,
      score: winner.score,
      tier: winner.provider.tier,
      category: winner.provider.category,
      validationTimeMs,
      totalTimeMs: Date.now() - totalStart,
      fallbackUsed: false,
      selectionPath: selectionPath.join('→'),
      chain,
      debug: process.env.NODE_ENV !== 'production' ? {
        allScores: scored.map(s => ({
          provider: s.provider.name,
          score: s.score,
          reasons: s.reasons,
        })),
        validationResults: validationResults.map(r => ({
          provider: r.provider.name,
          validated: r.validated,
          latencyMs: r.validationLatencyMs,
        })),
      } : undefined,
    };
  }

  // Step 8: Fallback — return first provider's URL without validation
  selectionPath.push('fallback');
  const fallbackProvider = candidates[0];
  if (fallbackProvider) {
    const url = generateUrl(fallbackProvider, req);
    if (url) {
      return {
        provider: fallbackProvider.name,
        url,
        score: -1,
        tier: fallbackProvider.tier,
        category: fallbackProvider.category,
        validationTimeMs,
        totalTimeMs: Date.now() - totalStart,
        fallbackUsed: true,
        selectionPath: selectionPath.join('→'),
        chain: [{ provider: fallbackProvider.name, url, score: -1, tier: fallbackProvider.tier }],
      };
    }
  }

  // Total failure
  return {
    provider: 'none',
    url: '',
    score: -1,
    tier: 99,
    category: 'none',
    validationTimeMs,
    totalTimeMs: Date.now() - totalStart,
    fallbackUsed: true,
    selectionPath: selectionPath.join('→'),
    chain: [],
  };
}

/**
 * Legacy-compatible function: returns all embed URLs (for backward compat with old player).
 * Filters dead providers and sorts by tier, same as before.
 */
export async function getFilteredEmbedResults(
  mediaType: 'movie' | 'tv',
  tmdbId: number,
  season?: number,
  episode?: number,
  isAnime?: boolean,
  malId?: number
): Promise<EmbedResult[]> {
  const deadProviders = await (await import('./health-check')).getDeadProviders();

  if (isAnime || malId) {
    const results = getAnimeEmbedUrls(tmdbId, season || 1, episode || 1, malId);
    return results.filter(p => !deadProviders.has(p.name));
  }

  const results = getAllEmbedUrls(mediaType, tmdbId, season, episode);
  return results.filter(p => !deadProviders.has(p.name));
}