-- File: supabase/migrations/20260613_atomic_rating.sql
-- Patch 1: Atomic rating upsert function.
-- Wraps PostgreSQL native INSERT ... ON CONFLICT (inherently atomic) in a
-- PL/pgSQL function for:
--   1. Consistent caller interface with other atomic RPCs.
--   2. Future extensibility (e.g., audit logging, triggers).
--   3. Single-point RLS policy application.

CREATE OR REPLACE FUNCTION upsert_rating_atomically(
  p_profile_id UUID,
  p_media_id BIGINT,
  p_media_type TEXT,
  p_rating SMALLINT
) RETURNS TABLE (
  profile_id UUID,
  media_id BIGINT,
  media_type TEXT,
  rating SMALLINT,
  updated_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
  -- PostgreSQL native UPSERT (INSERT ... ON CONFLICT) is
  -- inherently atomic. This function wraps it for a
  -- consistent interface with other atomic RPCs.
  INSERT INTO ratings (
    profile_id, media_id, media_type, rating
  ) VALUES (
    p_profile_id, p_media_id, p_media_type, p_rating
  ) ON CONFLICT (profile_id, media_id, media_type) DO UPDATE SET
    rating = EXCLUDED.rating,
    updated_at = now()
  RETURNING profile_id, media_id, media_type, rating, updated_at;
END;
$$;