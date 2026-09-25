-- Content-type-aware provider learning
--
-- Migration: 010_content_aware_learning
-- Created: 2026-09-23
--
-- The learning system (playback_analytics -> provider_performance -> Redis
-- bonus cache -> scoring) has always been keyed by provider name ALONE —
-- verified live: the same provider scores identically for two completely
-- unrelated movies, because nothing in the pipeline is keyed by content
-- type. A provider that's reliable for movies but bad for TV (a real,
-- already-observed case — see providers.ts's 2Embed note) gets one blended
-- score across everything it's ever played, so the system has no way to
-- learn that distinction on its own; it takes a manual fix every time.
--
-- Separately, and more fundamentally: aggregate_provider_performance() (the
-- RPC that turns raw playback_analytics rows into provider_performance)
-- is never called by any application code — grepped the entire src/ tree.
-- provider_performance has likely been sitting empty this whole time, which
-- means the DB-backed learned bonus (as opposed to the separate in-memory
-- health-check signal) has been silently a no-op. This migration fixes the
-- schema; src/lib/streaming/learning.ts's syncPerformanceToRedis() now
-- actually calls the RPC before reading, closing that gap too.

-- ── playback_analytics: record content type at event time ──────────────
ALTER TABLE public.playback_analytics
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'tv'
    CHECK (content_type IN ('movie', 'tv', 'anime'));

-- ── provider_performance: one row per (provider, content_type) now ─────
ALTER TABLE public.provider_performance
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'tv'
    CHECK (content_type IN ('movie', 'tv', 'anime'));

DO $$ BEGIN
  ALTER TABLE public.provider_performance DROP CONSTRAINT provider_performance_pkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.provider_performance
    ADD CONSTRAINT provider_performance_pkey PRIMARY KEY (provider, content_type);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── aggregation RPC: group by (provider, content_type) instead of just
--    provider, and actually distinguish the two kept in the same row before ──
CREATE OR REPLACE FUNCTION public.aggregate_provider_performance()
RETURNS INT AS $$
DECLARE
  updated_count INT := 0;
BEGIN
  INSERT INTO provider_performance (provider, content_type, total_plays, successful_plays, avg_buffer_time, error_count, avg_watch_duration, updated_at)
  SELECT
    pa.provider,
    pa.content_type,
    COUNT(*) FILTER (WHERE pa.event_type = 'play') AS total_plays,
    COUNT(*) FILTER (WHERE pa.event_type = 'complete' OR (pa.event_type = 'pause' AND pa.duration > 0 AND pa.position > pa.duration * 0.8)) AS successful_plays,
    COALESCE(AVG((pa.metadata->>'buffer_duration')::DOUBLE PRECISION), 0) AS avg_buffer_time,
    COUNT(*) FILTER (WHERE pa.event_type = 'error') AS error_count,
    COALESCE(AVG(pa.duration), 0) AS avg_watch_duration,
    now()
  FROM (
    SELECT DISTINCT ON (provider, content_type, media_id)
      provider, content_type, media_id, event_type, timestamp, position, duration, metadata
    FROM playback_analytics
    WHERE timestamp > now() - INTERVAL '7 days'
    ORDER BY provider, content_type, media_id, timestamp DESC
  ) pa
  GROUP BY pa.provider, pa.content_type
  ON CONFLICT (provider, content_type) DO UPDATE SET
    total_plays = EXCLUDED.total_plays,
    successful_plays = EXCLUDED.successful_plays,
    avg_buffer_time = EXCLUDED.avg_buffer_time,
    error_count = EXCLUDED.error_count,
    avg_watch_duration = EXCLUDED.avg_watch_duration,
    updated_at = now();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
