-- ============================================================
-- 006 — Fix live-schema drift (2026-09-10)
-- ============================================================
-- The live database was created from an older schema; several columns and
-- objects defined in 003/005 never landed because `CREATE TABLE IF NOT EXISTS`
-- does not add columns to an existing table. Symptoms found in production:
--   • GET /api/comments        → 500  "column comments.rating does not exist"
--   • GET/POST /api/player/*    → 500  "column watch_progress.position does not exist"
--
-- Safe to run repeatedly: every statement is IF NOT EXISTS / OR REPLACE.
-- Run in the Supabase dashboard → SQL Editor.
-- ============================================================

-- ── comments.rating (1-10, nullable) ────────────────────────
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS rating SMALLINT;
DO $$ BEGIN
  ALTER TABLE public.comments
    ADD CONSTRAINT comments_rating_check CHECK (rating IS NULL OR (rating >= 1 AND rating <= 10));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── ratings.updated_at (RPC upsert sets it; live table lacks it) ──
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
DO $$ BEGIN
  ALTER TABLE public.ratings
    ADD CONSTRAINT ratings_profile_media_uniq UNIQUE (profile_id, media_id, media_type);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;

-- ── watch_progress: resume-position tracking ────────────────
ALTER TABLE public.watch_progress
  ADD COLUMN IF NOT EXISTS position REAL DEFAULT 0;
-- Live table has title NOT NULL; the app's player writes a progress row before
-- it knows the title. Match the intended (nullable) schema.
ALTER TABLE public.watch_progress ALTER COLUMN title DROP NOT NULL;
ALTER TABLE public.watch_progress ALTER COLUMN poster_path DROP NOT NULL;

-- ── watch_history: episode + duration context (read by stats / future
--    "continue watching" heuristic; harmless if unused today) ──────────
ALTER TABLE public.watch_history
  ADD COLUMN IF NOT EXISTS season_number INT;
ALTER TABLE public.watch_history
  ADD COLUMN IF NOT EXISTS episode_number INT;
ALTER TABLE public.watch_history
  ADD COLUMN IF NOT EXISTS duration REAL DEFAULT 0;

-- ── learning-system aggregation RPC (called by the aggregate cron;
--    only 3 RPCs exist live, this one is missing) ──────────────────────
CREATE OR REPLACE FUNCTION public.aggregate_provider_performance()
RETURNS INT AS $$
DECLARE
  updated_count INT := 0;
BEGIN
  INSERT INTO provider_performance (provider, total_plays, successful_plays, avg_buffer_time, error_count, avg_watch_duration, updated_at)
  SELECT
    pa.provider,
    COUNT(*) FILTER (WHERE pa.event_type = 'play') AS total_plays,
    COUNT(*) FILTER (WHERE pa.event_type = 'complete' OR (pa.event_type = 'pause' AND pa.duration > 0 AND pa.position > pa.duration * 0.8)) AS successful_plays,
    COALESCE(AVG((pa.metadata->>'buffer_duration')::DOUBLE PRECISION), 0) AS avg_buffer_time,
    COUNT(*) FILTER (WHERE pa.event_type = 'error') AS error_count,
    COALESCE(AVG(pa.duration), 0) AS avg_watch_duration,
    now()
  FROM (
    SELECT DISTINCT ON (provider, media_id)
      provider, media_id, event_type, timestamp, position, duration, metadata
    FROM playback_analytics
    WHERE timestamp > now() - INTERVAL '7 days'
    ORDER BY provider, media_id, timestamp DESC
  ) pa
  GROUP BY pa.provider
  ON CONFLICT (provider) DO UPDATE SET
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

-- ── rewrite the two "atomic" RPCs as RETURNS void ──
-- The live versions have TWO independent bugs: (1) their RETURNS TABLE OUT
-- columns collide with bare column names in RETURNING / ON CONFLICT →
-- "column reference … is ambiguous"; (2) the OUT types (BIGINT/SMALLINT) don't
-- match the live columns (which are `integer`) → 42804. The callers
-- (src/actions/ratings.ts, src/app/api/collections/[id]/items) only check
-- `error` and ignore the returned row, so drop the result set entirely — that
-- removes every ambiguity and type-match concern at once. `#variable_conflict
-- use_column` is belt-and-braces for the ON CONFLICT target list.
DROP FUNCTION IF EXISTS public.upsert_rating_atomically(UUID, BIGINT, TEXT, SMALLINT);
DROP FUNCTION IF EXISTS public.upsert_rating_atomically(UUID, INT, TEXT, INT);
CREATE OR REPLACE FUNCTION public.upsert_rating_atomically(
  p_profile_id UUID,
  p_media_id INT,
  p_media_type TEXT,
  p_rating INT
) RETURNS void LANGUAGE plpgsql AS $$
#variable_conflict use_column
BEGIN
  INSERT INTO ratings (profile_id, media_id, media_type, rating)
  VALUES (p_profile_id, p_media_id, p_media_type, p_rating)
  ON CONFLICT (profile_id, media_id, media_type) DO UPDATE SET
    rating = EXCLUDED.rating,
    updated_at = now();
END;
$$;

DROP FUNCTION IF EXISTS public.insert_collection_item_atomically(UUID, BIGINT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.insert_collection_item_atomically(UUID, INT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.insert_collection_item_atomically(
  p_collection_id UUID,
  p_media_id INT,
  p_media_type TEXT,
  p_title TEXT DEFAULT '',
  p_poster_path TEXT DEFAULT NULL
) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_next_order INTEGER;
BEGIN
  SELECT COALESCE(MAX(ci.order_index), 0) + 1
  INTO v_next_order
  FROM collection_items ci
  WHERE ci.collection_id = p_collection_id;

  INSERT INTO collection_items (
    collection_id, media_id, media_type, title, poster_path, order_index
  ) VALUES (
    p_collection_id, p_media_id, p_media_type, p_title, p_poster_path, v_next_order
  );
END;
$$;

-- ── tell PostgREST to reload its schema cache ───────────────
NOTIFY pgrst, 'reload schema';
