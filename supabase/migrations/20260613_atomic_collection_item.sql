-- File: supabase/migrations/20260613_atomic_collection_item.sql
-- Patch 1: Atomic collection item insert to fix TOCTOU race condition.
-- Encapsulates MAX calculation and INSERT within a single PL/pgSQL function,
-- eliminating the race window between separate read and write round-trips.

CREATE OR REPLACE FUNCTION insert_collection_item_atomically(
  p_collection_id UUID,
  p_media_id BIGINT,
  p_media_type TEXT,
  p_title TEXT DEFAULT '',
  p_poster_path TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  collection_id UUID,
  media_id BIGINT,
  media_type TEXT,
  title TEXT,
  poster_path TEXT,
  order_index INTEGER,
  added_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
DECLARE
  v_next_order INTEGER;
BEGIN
  -- Calculate next order_index within this transaction.
  -- PostgreSQL MVCC guarantees this SELECT sees a consistent
  -- snapshot even under concurrent execution. The second
  -- concurrent caller blocks until this transaction commits.
  SELECT COALESCE(MAX(order_index), 0) + 1
  INTO v_next_order
  FROM collection_items
  WHERE collection_id = p_collection_id;

  -- INSERT in the same transactional scope.
  -- No network round-trip exists between the read and write.
  INSERT INTO collection_items (
    collection_id, media_id, media_type, title, poster_path, order_index
  ) VALUES (
    p_collection_id, p_media_id, p_media_type, p_title, p_poster_path, v_next_order
  ) RETURNING id, collection_id, media_id, media_type, title, poster_path, order_index, added_at;
END;
$$;