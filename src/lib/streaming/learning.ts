/**
 * L12 — Learning System
 *
 * Records playback events, aggregates provider performance,
 * and provides learned scoring bonuses to the provider selection algorithm.
 *
 * Flow: Playback events → DB → aggregated provider_performance → Redis cache → scoring bonus
 * Bonus range: -0.2 (terrible) to +0.2 (excellent)
 *
 * UPDATE 2026-09-23: this whole pipeline used to be keyed by provider name
 * ALONE — verified live that the same provider scored identically for two
 * completely unrelated movies, because nothing here was keyed by content
 * type. A provider reliable for movies but bad for TV (a real, already-
 * observed case) got one blended score across everything, so the system
 * had no way to learn that split on its own. Every function here now takes
 * a contentType and keys its cache/DB rows by (provider, contentType).
 *
 * Also fixed the same day: aggregate_provider_performance() (the SQL RPC
 * that turns raw playback_analytics rows into provider_performance) was
 * never called from any application code — provider_performance had
 * likely been sitting empty this whole time, making the DB-backed bonus a
 * silent no-op regardless of the content-type issue. syncPerformanceToRedis()
 * below now calls it before reading.
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

export type LearningContentType = 'movie' | 'tv' | 'anime';

export interface PlaybackEvent {
  /** Null for guest/anonymous playback — still recorded (see migration
   * 011_anon_playback_events.sql) so guest sessions feed the learning
   * system instead of being invisible to it. */
  userId: string | null;
  profileId: string | null;
  mediaId: number;
  provider: string;
  eventType: PlaybackEventType;
  contentType: LearningContentType;
  timestamp: number;
  position?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface ProviderStats {
  provider: string;
  contentType: LearningContentType;
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
      content_type: event.contentType,
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

/** Cache key includes contentType so movie/tv/anime bonuses never blend. */
function bonusCacheKey(provider: string, contentType: LearningContentType): string {
  return `${BONUS_CACHE_PREFIX}${contentType}:${provider}`;
}

/**
 * Get the learned scoring bonus for a specific provider, scoped to one
 * content type. Checks Redis cache first, falls back to DB aggregation.
 * Returns a value between -0.2 and +0.2.
 */
export async function getLearnedProviderBonus(
  provider: string,
  contentType: LearningContentType,
): Promise<number> {
  // Try Redis cache first
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<string>(bonusCacheKey(provider, contentType));
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
      .eq('content_type', contentType)
      .single();

    if (!data) return 0;

    const bonus = computeBonus(data);
    // Cache it
    if (redis) {
      try {
        await redis.set(
          bonusCacheKey(provider, contentType),
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
 * Get all learned provider scores for ONE content type.
 * Returns a Map of provider name → bonus (-0.2 to +0.2). A provider's
 * movie bonus and TV bonus are tracked completely separately — a caller
 * scoring anime candidates only ever sees anime-scoped bonuses.
 */
export async function getAllLearnedScores(contentType: LearningContentType): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  const redis = getRedis();
  const prefix = `${BONUS_CACHE_PREFIX}${contentType}:`;

  // Try Redis batch
  if (redis) {
    try {
      // Use scan to find all bonus keys for this content type only
      let cursor = '0';
      do {
        const result = await redis.scan(cursor, { match: `${prefix}*`, count: 50 });
        cursor = result[0] as string;
        const keys = result[1] as string[];

        if (keys.length > 0) {
          const values = await redis.mget<string[]>(...keys);
          for (let i = 0; i < keys.length; i++) {
            if (values[i]) {
              try {
                const parsed = JSON.parse(values[i]) as { bonus: number; cachedAt: number };
                if (Date.now() - parsed.cachedAt < BONUS_CACHE_TTL * 1000) {
                  const provider = keys[i].replace(prefix, '');
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

  // Negative cache: without the /api/playback/aggregate cron the
  // provider_performance table is often empty, and this ran a full
  // `select(*)` on EVERY embed request (~150-400ms Supabase RTT each time).
  // Skip the DB for 5 min after we see it's empty / unavailable. Scoped per
  // content type — an empty anime bucket shouldn't suppress a movie lookup.
  const EMPTY_MARK = `lumina:learn:empty:${contentType}`;
  if (redis) {
    try {
      if (await redis.get(EMPTY_MARK)) return scores;
    } catch { /* ignore */ }
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('provider_performance')
      .select('provider,total_plays,successful_plays,error_count,avg_buffer_time,avg_watch_duration')
      .eq('content_type', contentType)
      .limit(200);
    if (!data || data.length === 0) {
      if (redis) { try { await redis.set(EMPTY_MARK, '1', { ex: 300 }); } catch {} }
      return scores;
    }

    for (const row of data) {
      const bonus = computeBonus(row);
      scores.set(row.provider as string, bonus);
      // opportunistically warm the per-provider Redis cache so the next
      // call skips the DB even without the cron running
      if (redis) {
        try {
          await redis.set(
            bonusCacheKey(row.provider as string, contentType),
            JSON.stringify({ bonus, cachedAt: Date.now() }) as unknown as string,
            { ex: BONUS_CACHE_TTL },
          );
        } catch { /* non-critical */ }
      }
    }
    return scores;
  } catch {
    if (redis) { try { await redis.set(EMPTY_MARK, '1', { ex: 300 }); } catch {} }
    return scores;
  }
}

/**
 * Sync aggregated provider performance from DB to Redis cache.
 * Called by the /api/playback/aggregate cron endpoint.
 *
 * UPDATE 2026-09-23: this used to ONLY read provider_performance and cache
 * it — it never actually ran the aggregation that fills provider_performance
 * from the raw playback_analytics event log in the first place. Grepped the
 * whole src/ tree: aggregate_provider_performance() (the RPC that does that
 * aggregation, defined in supabase/migrations/006 and updated in 010) was
 * never called from anywhere. So this whole DB-backed bonus had likely been
 * a silent no-op since it was built — provider_performance stayed empty,
 * every getLearnedProviderBonus() call fell through to bonus=0. Now calls
 * the RPC first so there's actually something to sync.
 */
export async function syncPerformanceToRedis(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const redis = getRedis();
  if (!redis) return 0;

  try {
    const supabase = await createClient();

    try {
      await supabase.rpc('aggregate_provider_performance');
    } catch (aggError) {
      // Don't abort the sync over this — stale cached data from a previous
      // successful aggregation is still better than none.
      console.error('[Learning] aggregate_provider_performance RPC failed:', aggError);
    }

    const { data } = await supabase.from('provider_performance').select('*');
    if (!data || data.length === 0) return 0;

    const pipeline = redis.pipeline();
    let synced = 0;

    for (const row of data) {
      const contentType = (row.content_type as LearningContentType) || 'tv';
      const bonus = computeBonus(row);
      pipeline.set(
        bonusCacheKey(row.provider as string, contentType),
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
      contentType: (row.content_type as LearningContentType) || 'tv',
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
  if (totalPlays < 5) return 0; // Not enough data for a meaningful signal

  const safeTotal = Math.max(1, totalPlays); // Defensive: prevent division by zero from corrupted data
  const successRate = ((row.successful_plays as number) || 0) / safeTotal;
  const avgBufferTime = (row.avg_buffer_time as number) || 0;
  const errorRate = ((row.error_count as number) || 0) / safeTotal;

  // Rebalanced: +0.2 reachable with perfect stats (100% success, 0 buffer, 0 errors)
  let bonus = (successRate - 0.5) * 0.4;  // -0.2 to +0.2
  bonus -= Math.min(avgBufferTime / 10000, 1) * 0.05;  // -0.05 for buffering
  bonus -= errorRate * 0.1;  // -0.1 for errors

  return Math.max(-0.2, Math.min(0.2, bonus));
}