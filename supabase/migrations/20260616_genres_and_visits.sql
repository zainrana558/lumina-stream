-- Genre configuration table (single source of truth for DB-driven genre management)
-- Stores the same data as src/config/genres.ts but allows runtime changes
-- without code deploys. The app falls back to the in-code config if this table
-- is empty or Supabase is unconfigured.

CREATE TABLE IF NOT EXISTS genres (
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

-- Enable RLS
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;

-- Public read (anyone can see genre config)
CREATE POLICY "genres_public_read" ON genres
  FOR SELECT USING (true);

-- Only authenticated users can insert/update (admin use)
CREATE POLICY "genres_authenticated_write" ON genres
  FOR ALL USING (auth.role() = 'authenticated');

-- Genre visit tracking (cross-device, persisted)
CREATE TABLE IF NOT EXISTS genre_visits (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  genre_slug TEXT NOT NULL,
  visit_count INT DEFAULT 1,
  last_visited TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, genre_slug)
);

-- Enable RLS
ALTER TABLE genre_visits ENABLE ROW LEVEL SECURITY;

-- Users can read their own visits
CREATE POLICY "visits_own_read" ON genre_visits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own visits
CREATE POLICY "visits_own_insert" ON genre_visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own visits
CREATE POLICY "visits_own_update" ON genre_visits
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_genre_visits_user ON genre_visits(user_id);
CREATE INDEX IF NOT EXISTS idx_genre_visits_slug ON genre_visits(genre_slug);

-- Atomic visit counter function (avoids race conditions)
CREATE OR REPLACE FUNCTION increment_genre_visit(
  p_user_id UUID,
  p_genre_slug TEXT
) RETURNS INT AS $$
DECLARE
  new_count INT;
BEGIN
  UPDATE genre_visits
  SET visit_count = visit_count + 1,
      last_visited = now()
  WHERE user_id = p_user_id AND genre_slug = p_genre_slug
  RETURNING visit_count INTO new_count;

  RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;