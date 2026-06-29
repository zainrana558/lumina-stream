/**
 * Dynamic Provider Scoring Engine
 *
 * Multi-signal scoring function that replaces raw tier-based selection.
 * Lower score = better provider (like golf).
 *
 * Signals:
 *   score = w1*latency + w2*(1-successRate)*100 + w3*(maxTier-tier)/maxTier*50
 *          + w4*recencyBonus + w5*clientReportPenalty
 *
 * Weights are tunable via env vars (defaults optimized for general use).
 * Every score includes human-readable `reasons[]` for debug logging.
 */

import type { HealthRecord } from './health-check';
import type { ProviderRecord } from './registry';

// ── Types ──

export interface ProviderScore {
  provider: ProviderRecord;
  score: number;
  rank: number;
  signals: {
    latencyScore: number;
    successRateScore: number;
    tierScore: number;
    recencyScore: number;
    clientReportScore: number;
  };
  reasons: string[];
  healthRecord: HealthRecord | null;
}

// ── Weight Configuration (tunable via env vars) ──

interface ScoreWeights {
  latency: number;      // w1: raw latency contribution
  successRate: number;  // w2: failure rate penalty (inverted)
  tier: number;         // w3: tier bonus (lower tier = better)
  recency: number;      // w4: recency of health check
  clientReport: number; // w5: client report confidence penalty
}

function getWeights(): ScoreWeights {
  return {
    latency: parseFloat(process.env.SCORE_W_LATENCY || '0.3'),
    successRate: parseFloat(process.env.SCORE_W_SUCCESS_RATE || '0.4'),
    tier: parseFloat(process.env.SCORE_W_TIER || '0.15'),
    recency: parseFloat(process.env.SCORE_W_RECENCY || '0.1'),
    clientReport: parseFloat(process.env.SCORE_W_CLIENT_REPORT || '0.05'),
  };
}

// ── Signal Functions ──

/**
 * Latency score: raw latency in ms, weighted by w1.
 * Lower is better. Capped at 10000ms to prevent outliers from dominating.
 */
function computeLatencyScore(latencyMs: number, w: number): { score: number; reason: string } {
  const clamped = Math.min(latencyMs, 10000);
  const score = clamped * w;
  return {
    score,
    reason: `latency ${latencyMs}ms × ${w} = ${score.toFixed(1)}`,
  };
}

/**
 * Success rate score: computed from rolling failure/success window.
 * Returns penalty (higher = worse). Range 0-100 * weight.
 */
function computeSuccessRateScore(
  failCount: number,
  consecutiveSuccesses: number,
  w: number
): { score: number; reason: string } {
  const total = failCount + consecutiveSuccesses;
  const failureRate = total > 0 ? failCount / total : 0;
  const score = failureRate * 100 * w;
  return {
    score,
    reason: `failure rate ${(failureRate * 100).toFixed(0)}% (${failCount}f/${consecutiveSuccesses}s) × ${w} = ${score.toFixed(1)}`,
  };
}

/**
 * Tier score: lower tier number = better. Inverted so score is additive.
 * Tier 1 → 0 penalty, Tier 2 → 50*weight, Tier 3 → 100*weight.
 */
function computeTierScore(tier: number, w: number): { score: number; reason: string } {
  const penalty = ((tier - 1) / 2) * 50 * w; // tier 1→0, tier 2→25w, tier 3→50w
  return {
    score: penalty,
    reason: `tier ${tier} → penalty ${penalty.toFixed(1)}`,
  };
}

/**
 * Recency score: how recently was this provider health-checked?
 * More recent = more trustworthy = lower penalty.
 * Checked within 5min → +0, within 15min → +5*w, older → +15*w.
 */
function computeRecencyScore(lastCheck: number, w: number): { score: number; reason: string } {
  const now = Date.now();
  const ageMs = now - lastCheck;
  const ageMin = ageMs / 60000;

  let penalty: number;
  let label: string;
  if (ageMin <= 5) {
    penalty = 0;
    label = '<5min';
  } else if (ageMin <= 15) {
    penalty = 5 * w;
    label = '5-15min';
  } else if (ageMin <= 30) {
    penalty = 10 * w;
    label = '15-30min';
  } else {
    penalty = 15 * w;
    label = '>30min';
  }

  return {
    score: penalty,
    reason: `last checked ${label} ago → penalty ${penalty.toFixed(1)}`,
  };
}

/**
 * Client report score: client reports are less reliable than server-side pings
 * (browser can't do HEAD requests cross-origin, timing is noisy).
 * Apply small penalty for client-only reports (no server data).
 */
function computeClientReportScore(
  isClientOnly: boolean,
  w: number
): { score: number; reason: string } {
  if (!isClientOnly) {
    return { score: 0, reason: 'server-verified' };
  }
  return {
    score: 10 * w,
    reason: `client-only report → penalty ${(10 * w).toFixed(1)}`,
  };
}

// ── Main Scoring Function ──

/**
 * Score an array of provider candidates against their health data.
 * Returns sorted array (lowest score = best provider first).
 *
 * @param candidates - Providers to score (already filtered to alive/degraded)
 * @param healthData - Map of provider name → HealthRecord
 * @param options - Optional overrides (exclude providers, prefer tier)
 */
export function scoreProviders(
  candidates: ProviderRecord[],
  healthData: Map<string, HealthRecord>,
  options?: {
    excludeProviders?: string[];
    preferTier?: number;
  }
): ProviderScore[] {
  const weights = getWeights();
  const exclude = new Set(options?.excludeProviders || []);
  const preferTier = options?.preferTier;

  const scored: ProviderScore[] = [];

  for (const provider of candidates) {
    // Skip explicitly excluded providers
    if (exclude.has(provider.name)) continue;

    const health = healthData.get(provider.name) ?? null;
    const reasons: string[] = [];

    // If no health data at all, give a neutral but slightly penalized score
    if (!health) {
      const neutralScore = 50 + (provider.tier - 1) * 25;
      reasons.push('no health data available');
      reasons.push(`tier ${provider.tier} → baseline ${neutralScore}`);
      scored.push({
        provider,
        score: neutralScore,
        rank: 0,
        signals: {
          latencyScore: 0,
          successRateScore: 0,
          tierScore: neutralScore,
          recencyScore: 0,
          clientReportScore: 0,
        },
        reasons,
        healthRecord: null,
      });
      continue;
    }

    // Compute each signal
    const latency = computeLatencyScore(health.latencyMs, weights.latency);
 reasons.push(latency.reason);

    const successRate = computeSuccessRateScore(
      health.failCount,
      health.consecutiveSuccesses,
      weights.successRate
    );
    reasons.push(successRate.reason);

    const tier = computeTierScore(provider.tier, weights.tier);
    reasons.push(tier.reason);

    const recency = computeRecencyScore(health.lastCheck, weights.recency);
    reasons.push(recency.reason);

    const isClientOnly = health.clientReported && health.consecutiveSuccesses === 0;
    const clientReport = computeClientReportScore(isClientOnly, weights.clientReport);
    reasons.push(clientReport.reason);

    // Status penalty: degraded providers get a fixed penalty
    let statusPenalty = 0;
    if (health.status === 'degraded') {
      statusPenalty = 20;
      reasons.push('status degraded → +20 penalty');
    } else if (health.status === 'dead') {
      statusPenalty = 1000; // Effectively excludes dead providers
      reasons.push('STATUS DEAD → +1000 exclusion penalty');
    }

    // Prefer tier bonus: if a specific tier is preferred, penalize others
    let preferTierPenalty = 0;
    if (preferTier && provider.tier !== preferTier) {
      preferTierPenalty = 15;
      reasons.push(`prefer tier ${preferTier}, got ${provider.tier} → +15`);
    }

    const totalScore =
      latency.score +
      successRate.score +
      tier.score +
      recency.score +
      clientReport.score +
      statusPenalty +
      preferTierPenalty;

    scored.push({
      provider,
      score: totalScore,
      rank: 0,
      signals: {
        latencyScore: latency.score,
        successRateScore: successRate.score,
        tierScore: tier.score,
        recencyScore: recency.score,
        clientReportScore: clientReport.score,
      },
      reasons,
      healthRecord: health,
    });
  }

  // Sort by score (ascending = best first)
  scored.sort((a, b) => a.score - b.score);

  // Assign ranks
  for (let i = 0; i < scored.length; i++) {
    scored[i].rank = i + 1;
  }

  return scored;
}

/**
 * Get the top-N scored providers.
 */
export function getTopN(
  scored: ProviderScore[],
  n: number = 3
): ProviderScore[] {
  return scored.slice(0, n);
}
