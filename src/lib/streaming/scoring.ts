/**
 * L12 — Multi-Signal Provider Scoring
 *
 * Scores embed providers using multiple signals:
 *   0.3 * latency + 0.4 * successRate + 0.15 * tierBonus + 0.1 * recencyBonus + 0.05 * clientReportBonus
 *
 * Integrates with L12 Learning System for an additional learned bonus.
 */

import { getHealth } from '@/lib/streaming/health-check';
import { getLearnedProviderBonus } from '@/lib/streaming/learning';
import type { EmbedResult } from '@/lib/streaming/providers';

// ---- Types ----

export interface ProviderScore {
  name: string;
  score: number;
  signals: {
    latency: number;
    successRate: number;
    tierBonus: number;
    recencyBonus: number;
    clientReportBonus: number;
    learnedBonus: number;
  };
}

interface HealthSignal {
  alive: boolean | null;
  consecutiveSuccesses: number;
  clientReported?: boolean;
}

// In-memory signal tracking (per serverless instance)
// NOTE: This is per-instance and NOT shared across serverless invocations.
// In a multi-instance deployment, each cold start gets an empty store.
// The provider-intelligence.ts layer (health-check + speed cache) handles
// cross-instance state via time-based rotation. This store serves as a
// supplemental signal for single-instance or warm-instance scenarios.
const signalStore = new Map<string, HealthSignal>();
const SIGNAL_STORE_MAX = 100;

// Track when signals were last updated (for recency)
const signalUpdatedAt = new Map<string, number>();
const RECENCY_WINDOW_MS = 15 * 60 * 1000; // 15 min

function pruneSignalStore(): void {
  if (signalStore.size <= SIGNAL_STORE_MAX) return;
  const entries = Array.from(signalStore.entries());
  // Keep most recent entries (last half)
  for (const [key] of entries.slice(0, Math.floor(entries.length / 2))) {
    signalStore.delete(key);
  }
}

// ---- Public API ----

/**
 * Score and sort a list of providers.
 * Returns providers ordered by score (highest first).
 */
export async function scoreAndSortProviders(
  providers: EmbedResult[],
): Promise<EmbedResult[]> {
  const scored = await Promise.all(
    providers.map(async (p) => {
      const score = await scoreProvider(p);
      return { provider: p, score };
    }),
  );

  scored.sort((a, b) => b.score.score - a.score.score);
  return scored.map((s) => s.provider);
}

/**
 * Score a single provider using multi-signal scoring.
 */
export async function scoreProvider(provider: EmbedResult): Promise<ProviderScore> {
  const signals = {
    latency: computeLatency(provider.name),
    successRate: computeSuccessRate(provider.name),
    tierBonus: computeTierBonus(provider.tier),
    recencyBonus: computeRecencyBonus(provider.name),
    clientReportBonus: computeClientReportBonus(provider.name),
    learnedBonus: 0,
  };

  // Fetch learned bonus from L12 (async)
  try {
    signals.learnedBonus = await getLearnedProviderBonus(provider.name);
  } catch {
    signals.learnedBonus = 0;
  }

  // Weighted combination (score may exceed 1.0 due to learnedBonus — used for sorting only)
  const score =
    0.30 * signals.latency +
    0.40 * signals.successRate +
    0.15 * signals.tierBonus +
    0.10 * signals.recencyBonus +
    0.05 * signals.clientReportBonus +
    signals.learnedBonus;

  return { name: provider.name, score, signals };
}

// ---- Signal computation ----

function computeLatency(providerName: string): number {
  // Use shared speed data from provider-intelligence when available
  // NOTE: Static import at module level would create circular dependency
  // (scoring.ts ← provider-intelligence.ts ← scoring.ts), so we use
  // a lazy module-level cache instead of require().
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/lib/streaming/provider-intelligence') as { getSpeedScore: (name: string) => number };
    const speed = mod.getSpeedScore(providerName);
    if (speed !== 0.5) return speed; // 0.5 is the default — only use if different
  } catch { /* fallback to health */ }

  // Fallback: health-based continuous proxy
  // Returns continuous values instead of binary 0/1 to avoid
  // large score jumps between "unknown" (0.5) and "alive" (1.0)
  const health = getHealth(providerName);
  if (health === true) return 0.85; // Healthy but not perfect (probes have latency)
  if (health === false) return 0.1;  // Dead but not zero (could recover)
  return 0.5; // Unknown — neutral
}

function computeSuccessRate(providerName: string): number {
  const signal = signalStore.get(providerName);
  if (!signal) return 0.7; // Default: assume mostly working

  // If client reported but no consecutive successes, it's likely a false positive
  const isClientOnly = !!signal.clientReported && signal.consecutiveSuccesses === 0;
  if (isClientOnly) return 0.3;

  if (signal.consecutiveSuccesses >= 5) return 1.0;
  if (signal.consecutiveSuccesses >= 3) return 0.8;
  if (signal.consecutiveSuccesses >= 1) return 0.6;
  return 0.4;
}

function computeTierBonus(tier: number): number {
  if (tier === 1) return 1.0;
  if (tier === 2) return 0.5;
  return 0.25; // Tier 3 and below
}

function computeRecencyBonus(providerName: string): number {
  const updatedAt = signalUpdatedAt.get(providerName);
  if (!updatedAt) return 0.5; // No recent data — neutral (was 0.3, caused score dip)
  const age = Date.now() - updatedAt;
  if (age < 5 * 60 * 1000) return 1.0;       // < 5 min ago
  if (age < 15 * 60 * 1000) return 0.7;      // < 15 min ago
  if (age < RECENCY_WINDOW_MS) return 0.4;   // < 30 min ago
  return 0.2; // Stale data
}

function computeClientReportBonus(providerName: string): number {
  const signal = signalStore.get(providerName);
  if (!signal?.clientReported) return 0.5;
  return 0.8;
}

// ---- Signal update (called by playback events) ----

/**
 * Update provider signal from client feedback.
 * Called when the player reports a provider error or success.
 */
export function updateProviderSignal(
  providerName: string,
  success: boolean,
  clientReported?: boolean,
): void {
  const existing = signalStore.get(providerName) || {
    alive: null,
    consecutiveSuccesses: 0,
  };

  if (success) {
    existing.consecutiveSuccesses = Math.min(10, existing.consecutiveSuccesses + 1);
  } else {
    existing.consecutiveSuccesses = 0;
  }
  if (clientReported !== undefined) {
    existing.clientReported = clientReported;
  }

  signalStore.set(providerName, existing);
  signalUpdatedAt.set(providerName, Date.now());
  pruneSignalStore();
}