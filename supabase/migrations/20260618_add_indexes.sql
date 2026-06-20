-- Add missing indexes for common query patterns across core tables.
-- These improve performance for the most frequent API queries.

-- ── watchlist ──────────────────────────────────────────────────────────────
-- Fast lookup by profile for GET, ordered by most recently added
CREATE INDEX IF NOT EXISTS idx_watchlist_profile_added
  ON watchlist(profile_id, added_at DESC);

-- Fast upsert/delete by composite key
CREATE INDEX IF NOT EXISTS idx_watchlist_profile_media
  ON watchlist(profile_id, media_id, media_type);

-- ── watch_progress ─────────────────────────────────────────────────────────
-- Fast upsert by composite key
CREATE INDEX IF NOT EXISTS idx_watch_progress_profile_media
  ON watch_progress(profile_id, media_id, media_type);

-- Fast ordered GET for "continue watching" feature
CREATE INDEX IF NOT EXISTS idx_watch_progress_profile_updated
  ON watch_progress(profile_id, updated_at DESC);

-- ── watch_history ───────────────────────────────────────────────────────────
-- Stats aggregation by media type
CREATE INDEX IF NOT EXISTS idx_watch_history_profile_type
  ON watch_history(profile_id, media_type);

-- ── ratings ─────────────────────────────────────────────────────────────────
-- Leaderboard aggregation: average ratings per show
CREATE INDEX IF NOT EXISTS idx_ratings_media
  ON ratings(media_id, media_type);

-- ── comments ───────────────────────────────────────────────────────────────
-- GET comments for a show, ordered newest first
CREATE INDEX IF NOT EXISTS idx_comments_media_created
  ON comments(media_id, media_type, created_at DESC);

-- ── collection_items ───────────────────────────────────────────────────────
-- Ordered items within a collection
CREATE INDEX IF NOT EXISTS idx_collection_items_order
  ON collection_items(collection_id, order_index);

-- ── follows ────────────────────────────────────────────────────────────────
-- Fast follower/following list lookups
CREATE INDEX IF NOT EXISTS idx_follows_follower
  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following
  ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_pair
  ON follows(follower_id, following_id);

-- ── notifications ──────────────────────────────────────────────────────────
-- Unread notifications, newest first
CREATE INDEX IF NOT EXISTS idx_notifications_profile_unread
  ON notifications(profile_id, is_read, created_at DESC);

-- ── watch_party_rooms ───────────────────────────────────────────────────────
-- Room lookup by short code
CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_party_rooms_code
  ON watch_party_rooms(code);

-- Host verification
CREATE INDEX IF NOT EXISTS idx_watch_party_rooms_host
  ON watch_party_rooms(host_profile_id);

-- ── watch_party_participants ────────────────────────────────────────────────
-- Membership check
CREATE INDEX IF NOT EXISTS idx_wpp_room_profile
  ON watch_party_participants(room_id, profile_id);

-- ── watch_party_messages ───────────────────────────────────────────────────
-- Message polling for a room
CREATE INDEX IF NOT EXISTS idx_wpm_room_created
  ON watch_party_messages(room_id, created_at);

-- ── Fix increment_genre_visit() to handle new rows ─────────────────────────
-- Replace the UPDATE-only function with INSERT ... ON CONFLICT DO UPDATE
CREATE OR REPLACE FUNCTION increment_genre_visit(
  p_user_id UUID,
  p_genre_slug TEXT
) RETURNS INT AS $$
DECLARE
  new_count INT;
BEGIN
  INSERT INTO genre_visits (user_id, genre_slug, visit_count, last_visited)
  VALUES (p_user_id, p_genre_slug, 1, now())
  ON CONFLICT (user_id, genre_slug)
  DO UPDATE SET
    visit_count = genre_visits.visit_count + 1,
    last_visited = now()
  RETURNING visit_count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;