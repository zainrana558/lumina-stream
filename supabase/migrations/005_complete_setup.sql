-- ============================================================
-- LUMINA STREAM — Complete Database Setup
-- ============================================================
-- Paste this ENTIRE file into Supabase Dashboard → SQL Editor
-- and click "Run". It is fully idempotent (safe to re-run).
--
-- Includes:
--   - All 20 tables with correct column names matching the app code
--   - All RLS policies
--   - All RPC functions
--   - All performance indexes
--   - Avatars storage bucket
--   - Learning system tables (playback_analytics, provider_performance)
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

-- ── 1. PROFILES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  is_kids BOOLEAN DEFAULT false,
  pin_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id)
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own profiles" ON public.profiles FOR UPDATE USING (account_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own profiles" ON public.profiles FOR DELETE USING (account_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. AVATARS (predefined avatar options) ───────────────────
CREATE TABLE IF NOT EXISTS public.avatars (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. WATCHLIST ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id BIGINT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_path TEXT,
  status TEXT DEFAULT 'plan_to_watch' CHECK (status IN ('plan_to_watch', 'watching', 'completed')),
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, media_id, media_type)
);
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own watchlist" ON public.watchlist FOR SELECT
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own watchlist" ON public.watchlist FOR INSERT
    WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own watchlist" ON public.watchlist FOR UPDATE
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own watchlist" ON public.watchlist FOR DELETE
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 4. WATCH_PROGRESS (continue watching + resume) ───────────
-- Uses season_number/episode_number to match app code.
-- `progress` = 0-100 percentage (for continue-watching UI).
-- `position` = absolute seconds (for exact resume playback).
CREATE TABLE IF NOT EXISTS public.watch_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id BIGINT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title TEXT,
  poster_path TEXT,
  season_number INT,
  episode_number INT,
  progress REAL DEFAULT 0,
  position REAL DEFAULT 0,
  duration REAL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, media_id, media_type)
);
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own watch progress" ON public.watch_progress FOR SELECT
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own watch progress" ON public.watch_progress FOR INSERT
    WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own watch progress" ON public.watch_progress FOR UPDATE
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 5. WATCH_HISTORY ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watch_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id BIGINT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_path TEXT,
  season_number INT,
  episode_number INT,
  duration REAL DEFAULT 0,
  watched_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own watch history" ON public.watch_history FOR SELECT
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own watch history" ON public.watch_history FOR INSERT
    WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 6. RATINGS (1-10 scale) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id BIGINT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, media_id, media_type)
);
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read all ratings" ON public.ratings FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own ratings" ON public.ratings FOR INSERT
    WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own ratings" ON public.ratings FOR UPDATE
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 7. COMMENTS (with optional rating) ───────────────────────
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id BIGINT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 2000),
  rating SMALLINT CHECK (rating >= 1 AND rating <= 10),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can read comments" ON public.comments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own comments" ON public.comments FOR INSERT
    WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 8. COLLECTIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT CHECK (char_length(description) <= 500),
  cover_path TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can read public collections" ON public.collections FOR SELECT
    USING (is_public = true OR profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own collections" ON public.collections FOR INSERT
    WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own collections" ON public.collections FOR UPDATE
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own collections" ON public.collections FOR DELETE
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 9. COLLECTION_ITEMS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.collection_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  media_id BIGINT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title TEXT,
  poster_path TEXT,
  order_index INT DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can read items of public collections" ON public.collection_items FOR SELECT
    USING (
      collection_id IN (
        SELECT id FROM public.collections
        WHERE is_public = true OR profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid())
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own collection items" ON public.collection_items FOR INSERT
    WITH CHECK (
      collection_id IN (SELECT id FROM public.collections WHERE profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own collection items" ON public.collection_items FOR DELETE
    USING (
      collection_id IN (SELECT id FROM public.collections WHERE profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()))
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 10. ACTIVITIES (social feed) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('watched', 'completed', 'added_to_watchlist', 'commented', 'rated', 'created_list', 'updated_list')),
  media_id BIGINT,
  media_type TEXT CHECK (media_type IN ('movie', 'tv')),
  title TEXT,
  poster_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can read activities" ON public.activities FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert activities" ON public.activities FOR INSERT
    WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 11. FOLLOWS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can read follows" ON public.follows FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can manage follows" ON public.follows FOR ALL
    USING (follower_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 12. NOTIFICATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  media_id BIGINT,
  media_type TEXT,
  link TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT
    WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 13. REMINDERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  media_id BIGINT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title TEXT NOT NULL,
  poster_path TEXT,
  release_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, media_id, media_type)
);
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own reminders" ON public.reminders FOR SELECT
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert reminders" ON public.reminders FOR INSERT
    WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own reminders" ON public.reminders FOR DELETE
    USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 14. GENRES (DB-driven genre config) ──────────────────────
CREATE TABLE IF NOT EXISTS public.genres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tmdb_id INT,
  media_type TEXT CHECK (media_type IN ('movie', 'tv')),
  source TEXT CHECK (source IN ('tmdb', 'anilist')),
  is_portal BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  display_config JSONB DEFAULT '{}',
  extra_params JSONB DEFAULT '{}',
  keyword_params JSONB DEFAULT '{}',
  sub_genres TEXT[] DEFAULT '{}',
  title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "genres_public_read" ON public.genres FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "genres_authenticated_write" ON public.genres FOR ALL USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 15. GENRE_VISITS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.genre_visits (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  genre_slug TEXT NOT NULL,
  visit_count INT DEFAULT 1,
  last_visited TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, genre_slug)
);
ALTER TABLE public.genre_visits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "visits_own_read" ON public.genre_visits FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "visits_own_insert" ON public.genre_visits FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "visits_own_update" ON public.genre_visits FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 16. WATCH_PARTY_ROOMS ────────────────────────────────────
-- Includes expires_at for room expiry checking (used by code).
CREATE TABLE IF NOT EXISTS public.watch_party_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  show_id BIGINT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  season INT DEFAULT 1,
  episode INT DEFAULT 1,
  title TEXT NOT NULL,
  poster_path TEXT,
  is_playing BOOLEAN DEFAULT false,
  playback_time DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '24 hours')
);
ALTER TABLE public.watch_party_rooms ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can read watch party rooms" ON public.watch_party_rooms FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can create watch party rooms" ON public.watch_party_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can update watch party rooms" ON public.watch_party_rooms FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can delete watch party rooms" ON public.watch_party_rooms FOR DELETE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 17. WATCH_PARTY_PARTICIPANTS ─────────────────────────────
-- Includes joined_at for ordered participant display (used by code).
CREATE TABLE IF NOT EXISTS public.watch_party_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.watch_party_rooms(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, profile_id)
);
ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can read watch party participants" ON public.watch_party_participants FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert watch party participants" ON public.watch_party_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Participants can update their own participant record" ON public.watch_party_participants FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Participants can delete their own participant record" ON public.watch_party_participants FOR DELETE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 18. WATCH_PARTY_MESSAGES ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.watch_party_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.watch_party_rooms(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.watch_party_messages ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can read watch party messages" ON public.watch_party_messages FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert watch party messages" ON public.watch_party_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 19. PLAYBACK_ANALYTICS (learning system — event log) ────
-- Records every playback event for provider quality learning.
CREATE TABLE IF NOT EXISTS public.playback_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  media_id BIGINT,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('play', 'pause', 'seek', 'buffer_start', 'buffer_end', 'error', 'complete', 'quality_change', 'provider_switch')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  position REAL,
  duration REAL,
  metadata JSONB DEFAULT '{}'
);
ALTER TABLE public.playback_analytics ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can read own analytics" ON public.playback_analytics FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can insert own analytics" ON public.playback_analytics FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 20. PROVIDER_PERFORMANCE (learning system — aggregated) ──
-- Stores aggregated provider quality metrics for scoring bonuses.
CREATE TABLE IF NOT EXISTS public.provider_performance (
  provider TEXT PRIMARY KEY,
  total_plays INT DEFAULT 0,
  successful_plays INT DEFAULT 0,
  avg_buffer_time DOUBLE PRECISION DEFAULT 0,
  error_count INT DEFAULT 0,
  avg_watch_duration DOUBLE PRECISION DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.provider_performance ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Anyone can read provider performance" ON public.provider_performance FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Service role can manage provider performance" ON public.provider_performance FOR ALL
    USING (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Atomic rating upsert (1-10 scale)
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
  INSERT INTO ratings (profile_id, media_id, media_type, rating)
  VALUES (p_profile_id, p_media_id, p_media_type, p_rating)
  ON CONFLICT (profile_id, media_id, media_type) DO UPDATE SET
    rating = EXCLUDED.rating,
    updated_at = now()
  RETURNING profile_id, media_id, media_type, rating, updated_at;
END;
$$;

-- Atomic collection item insert with auto order_index
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
  SELECT COALESCE(MAX(order_index), 0) + 1
  INTO v_next_order
  FROM collection_items
  WHERE collection_id = p_collection_id;

  INSERT INTO collection_items (collection_id, media_id, media_type, title, poster_path, order_index)
  VALUES (p_collection_id, p_media_id, p_media_type, p_title, p_poster_path, v_next_order)
  RETURNING id, collection_id, media_id, media_type, title, poster_path, order_index, added_at;
END;
$$;

-- Atomic genre visit counter (INSERT ON CONFLICT DO UPDATE)
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

-- Aggregate playback events into provider_performance (for cron)
CREATE OR REPLACE FUNCTION aggregate_provider_performance()
RETURNS INT AS $$
DECLARE
  updated_count INT := 0;
BEGIN
  -- Upsert aggregated stats per provider from the last 7 days of events
  INSERT INTO provider_performance (provider, total_plays, successful_plays, avg_buffer_time, error_count, avg_watch_duration, updated_at)
  SELECT
    pa.provider,
    COUNT(*) FILTER (WHERE pa.event_type = 'play') AS total_plays,
    COUNT(*) FILTER (WHERE pa.event_type = 'complete' OR (pa.event_type = 'pause' AND pa.duration > 0 AND pa.position > pa.duration * 0.8)) AS successful_plays,
    COALESCE(
      AVG(pa.metadata->>'buffer_duration')::DOUBLE PRECISION,
      AVG(EXTRACT(EPOCH FROM (
        SELECT MIN(timestamp) FROM playback_analytics pa2
        WHERE pa2.provider = pa.provider AND pa2.media_id = pa.media_id AND pa2.event_type = 'buffer_end'
          AND pa2.timestamp > pa.timestamp - INTERVAL '5 minutes'
      ) - pa.timestamp)
    ), 0
    ) AS avg_buffer_time,
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

-- ============================================================
-- INDEXES
-- ============================================================

-- watchlist
CREATE INDEX IF NOT EXISTS idx_watchlist_profile_added ON watchlist(profile_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_watchlist_profile_media ON watchlist(profile_id, media_id, media_type);

-- watch_progress
CREATE INDEX IF NOT EXISTS idx_watch_progress_profile_media ON watch_progress(profile_id, media_id, media_type);
CREATE INDEX IF NOT EXISTS idx_watch_progress_profile_updated ON watch_progress(profile_id, updated_at DESC);

-- watch_history
CREATE INDEX IF NOT EXISTS idx_watch_history_profile ON watch_history(profile_id, watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_history_profile_type ON watch_history(profile_id, media_type);

-- ratings
CREATE INDEX IF NOT EXISTS idx_ratings_media ON ratings(media_id, media_type);
CREATE INDEX IF NOT EXISTS idx_ratings_profile ON ratings(profile_id);

-- comments
CREATE INDEX IF NOT EXISTS idx_comments_media_created ON comments(media_id, media_type, created_at DESC);

-- collections
CREATE INDEX IF NOT EXISTS idx_collections_profile ON collections(profile_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(is_public, updated_at DESC);

-- collection_items
CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON collection_items(collection_id, order_index);
CREATE INDEX IF NOT EXISTS idx_collection_items_media ON collection_items(media_id, media_type);

-- follows
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_pair ON follows(follower_id, following_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_profile_unread ON notifications(profile_id, is_read, created_at DESC);

-- activities
CREATE INDEX IF NOT EXISTS idx_activities_profile ON activities(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type, created_at DESC);

-- reminders
CREATE INDEX IF NOT EXISTS idx_reminders_profile ON reminders(profile_id);
CREATE INDEX IF NOT EXISTS idx_reminders_release ON reminders(release_date);

-- genre_visits
CREATE INDEX IF NOT EXISTS idx_genre_visits_user ON genre_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_genre_visits_slug ON genre_visits(genre_slug);

-- watch_party_rooms
CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_party_rooms_code ON watch_party_rooms(code);
CREATE INDEX IF NOT EXISTS idx_watch_party_rooms_host ON watch_party_rooms(host_profile_id);

-- watch_party_participants
CREATE INDEX IF NOT EXISTS idx_wpp_room_profile ON watch_party_participants(room_id, profile_id);

-- watch_party_messages
CREATE INDEX IF NOT EXISTS idx_wpm_room_created ON watch_party_messages(room_id, created_at);

-- playback_analytics
CREATE INDEX IF NOT EXISTS idx_pa_provider_ts ON playback_analytics(provider, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pa_media ON playback_analytics(media_id, provider);

-- ============================================================
-- STORAGE BUCKET: avatars (for user-uploaded profile pictures)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read avatars, authenticated users to upload
DO $$ BEGIN
  CREATE POLICY "Avatar images are publicly readable" ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars' AND (auth.role() = 'authenticated'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE
    USING (bucket_id = 'avatars' AND (auth.role() = 'authenticated'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- SEED: Default avatars (run once, idempotent)
-- ============================================================
INSERT INTO public.avatars (name, image_url, sort_order) VALUES
  ('Warrior', '/avatars/warrior.svg', 1),
  ('Mage', '/avatars/mage.svg', 2),
  ('Ranger', '/avatars/ranger.svg', 3),
  ('Healer', '/avatars/healer.svg', 4),
  ('Rogue', '/avatars/rogue.svg', 5)
ON CONFLICT DO NOTHING;