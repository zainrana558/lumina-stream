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
const signalStore = new Map<string, HealthSignal>();

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

  // Weighted combination
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
  // Health-based latency proxy: alive=1.0, dead/unknown=0.0
  const health = getHealth(providerName);
  if (health === true) return 1.0;
  if (health === false) return 0.0;
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
  const signal = signalStore.get(providerName);
  if (!signal) return 0.5;
  // Higher bonus for recently active providers
  return Math.min(1.0, signal.consecutiveSuccesses * 0.2);
}

function computeClientReportBonus(providerName: string): number {
  const signal = signalStore.get(providerName);
  if (!signal?.clientReported) return 0.5;
  return signal.clientReported ? 0.8 : 0.5;
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
}