/**
 * L12 — Learning System
 *
 * Records playback events, aggregates provider performance,
 * and provides learned scoring bonuses to the provider selection algorithm.
 *
 * Flow: Playback events → DB → aggregated provider_performance → Redis cache → scoring bonus
 * Bonus range: -0.2 (terrible) to +0.2 (excellent)
 */

import { getRedis } from '@/lib/redis';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/server';

// ---- Types ----

export type PlaybackEventType =
  | 'play'
  | 'pause'
  | 'seek'
  | 'buffer_start'
  | 'buffer_end'
  | 'error'
  | 'complete'
  | 'quality_change'
  | 'provider_switch';

export interface PlaybackEvent {
  userId: string;
  profileId: string;
  mediaId: number;
  provider: string;
  eventType: PlaybackEventType;
  timestamp: number;
  position?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface ProviderStats {
  provider: string;
  totalPlays: number;
  successfulPlays: number;
  avgBufferTime: number;
  errorCount: number;
  avgWatchDuration: number;
  score: number; // -1.0 to 1.0 normalized
}

const BONUS_CACHE_PREFIX = 'lumina:learn:bonus:';
const BONUS_CACHE_TTL = 1800; // 30 minutes
const SYNC_CACHE_PREFIX = 'lumina:learn:sync:';

// ---- Event Recording ----

/**
 * Record a playback event to the database.
 * Uses Supabase if configured, otherwise no-ops gracefully.
 */
export async function recordPlaybackEvent(event: PlaybackEvent): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = await createClient();
    await supabase.from('playback_analytics').insert({
      user_id: event.userId,
      profile_id: event.profileId,
      media_id: event.mediaId,
      provider: event.provider,
      event_type: event.eventType,
      timestamp: new Date(event.timestamp).toISOString(),
      position: event.position ?? null,
      duration: event.duration ?? null,
      metadata: event.metadata ?? null,
    });
  } catch (error) {
    console.error('[Learning] Failed to record playback event:', error);
  }
}

// ---- Learned Scoring Bonus ----

/**
 * Get the learned scoring bonus for a specific provider.
 * Checks Redis cache first, falls back to DB aggregation.
 * Returns a value between -0.2 and +0.2.
 */
export async function getLearnedProviderBonus(provider: string): Promise<number> {
  // Try Redis cache first
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<string>(`${BONUS_CACHE_PREFIX}${provider}`);
      if (cached) {
        const parsed = JSON.parse(cached) as { bonus: number; cachedAt: number };
        if (Date.now() - parsed.cachedAt < BONUS_CACHE_TTL * 1000) {
          return parsed.bonus;
        }
      }
    } catch {
      // Fall through to DB
    }
  }

  // Fall back to DB
  if (!isSupabaseConfigured()) return 0;

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('provider_performance')
      .select('*')
      .eq('provider', provider)
      .single();

    if (!data) return 0;

    const bonus = computeBonus(data);
    // Cache it
    if (redis) {
      try {
        await redis.set(
          `${BONUS_CACHE_PREFIX}${provider}`,
          JSON.stringify({ bonus, cachedAt: Date.now() }) as unknown as string,
          { ex: BONUS_CACHE_TTL },
        );
      } catch {
        // Non-critical
      }
    }
    return bonus;
  } catch {
    return 0;
  }
}

/**
 * Get all learned provider scores.
 * Returns a Map of provider name → bonus (-0.2 to +0.2).
 */
export async function getAllLearnedScores(): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  const redis = getRedis();

  // Try Redis batch
  if (redis) {
    try {
      // Use scan to find all bonus keys
      let cursor = '0';
      do {
        const result = await redis.scan(cursor, { match: `${BONUS_CACHE_PREFIX}*`, count: 50 });
        cursor = result[0] as string;
        const keys = result[1] as string[];

        if (keys.length > 0) {
          const values = await redis.mget<string[]>(...keys);
          for (let i = 0; i < keys.length; i++) {
            if (values[i]) {
              try {
                const parsed = JSON.parse(values[i]) as { bonus: number; cachedAt: number };
                if (Date.now() - parsed.cachedAt < BONUS_CACHE_TTL * 1000) {
                  const provider = keys[i].replace(BONUS_CACHE_PREFIX, '');
                  scores.set(provider, parsed.bonus);
                }
              } catch {
                // Skip malformed entries
              }
            }
          }
        }
      } while (cursor !== '0');
    } catch {
      // Fall through to DB
    }
  }

  if (scores.size > 0) return scores;

  // Fall back to DB
  if (!isSupabaseConfigured()) return scores;

  try {
    const supabase = await createClient();
    const { data } = await supabase.from('provider_performance').select('*');
    if (!data) return scores;

    for (const row of data) {
      const bonus = computeBonus(row);
      scores.set(row.provider as string, bonus);
    }
    return scores;
  } catch {
    return scores;
  }
}

/**
 * Sync aggregated provider performance from DB to Redis cache.
 * Called by the /api/playback/aggregate cron endpoint.
 */
export async function syncPerformanceToRedis(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const redis = getRedis();
  if (!redis) return 0;

  try {
    const supabase = await createClient();
    const { data } = await supabase.from('provider_performance').select('*');
    if (!data || data.length === 0) return 0;

    const pipeline = redis.pipeline();
    let synced = 0;

    for (const row of data) {
      const bonus = computeBonus(row);
      pipeline.set(
        `${BONUS_CACHE_PREFIX}${row.provider}`,
        JSON.stringify({ bonus, cachedAt: Date.now() }) as unknown as string,
        { ex: BONUS_CACHE_TTL },
      );
      synced++;
    }

    await pipeline.exec();
    return synced;
  } catch (error) {
    console.error('[Learning] Failed to sync performance to Redis:', error);
    return 0;
  }
}

/**
 * Get detailed provider stats for admin display.
 */
export async function getProviderStats(provider?: string): Promise<ProviderStats[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = await createClient();
    let query = supabase.from('provider_performance').select('*');

    if (provider) {
      query = query.eq('provider', provider);
    }

    query = query.order('total_plays', { ascending: false }).limit(50);
    const { data } = await query;

    if (!data) return [];

    return data.map((row) => ({
      provider: row.provider as string,
      totalPlays: (row.total_plays as number) || 0,
      successfulPlays: (row.successful_plays as number) || 0,
      avgBufferTime: (row.avg_buffer_time as number) || 0,
      errorCount: (row.error_count as number) || 0,
      avgWatchDuration: (row.avg_watch_duration as number) || 0,
      score: computeBonus(row),
    }));
  } catch {
    return [];
  }
}

// ---- Internal helpers ----

function computeBonus(row: Record<string, unknown>): number {
  const totalPlays = (row.total_plays as number) || 0;
  if (totalPlays < 5) return 0;

  const successRate = ((row.successful_plays as number) || 0) / totalPlays;
  const avgBufferTime = (row.avg_buffer_time as number) || 0;
  const errorRate = ((row.error_count as number) || 0) / totalPlays;

  // Rebalanced: symmetric range, positive rewards good providers
  let bonus = (successRate - 0.5) * 0.3;  // -0.15 to +0.15
  bonus -= Math.min(avgBufferTime / 10000, 1) * 0.025;  // -0.025 for buffering
  bonus -= errorRate * 0.05;  // -0.05 for errors

  return Math.max(-0.2, Math.min(0.2, bonus));
}