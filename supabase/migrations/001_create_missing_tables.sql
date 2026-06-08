-- ============================================================
-- LUMINA STREAM - Supabase Database Migration
-- ============================================================
-- Run this SQL in your Supabase Dashboard → SQL Editor
-- This creates/fixes all tables needed for the app's features.
-- ============================================================

-- 1. REMINDERS table (missing from current schema)
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

-- 2. Enable RLS on reminders
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for reminders
CREATE POLICY "Users can read own reminders"
  ON public.reminders FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE account_id = auth.uid()
    )
    OR
    profile_id = (SELECT COALESCE(
      (SELECT current_setting('request.cookie.profile_id', true)),
      NULL
    )::uuid)
  );

CREATE POLICY "Authenticated users can insert reminders"
  ON public.reminders FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE account_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own reminders"
  ON public.reminders FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE account_id = auth.uid()
    )
  );

-- 4. ACTIVITIES table fix (already exists but ensure RLS is correct)
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read activities"
  ON public.activities FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert activities"
  ON public.activities FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE account_id = auth.uid()
    )
  );

-- 5. FOLLOWS table fix (ensure correct RLS)
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read follows"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage follows"
  ON public.follows FOR ALL
  USING (
    follower_id IN (
      SELECT id FROM public.profiles WHERE account_id = auth.uid()
    )
  );

-- 6. NOTIFICATIONS table fix
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE account_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE account_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE account_id = auth.uid()
    )
  );

-- 7. Ensure all core tables have RLS enabled
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 8. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_reminders_profile ON public.reminders(profile_id);
CREATE INDEX IF NOT EXISTS idx_reminders_release ON public.reminders(release_date);
CREATE INDEX IF NOT EXISTS idx_activities_profile ON public.activities(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_history_profile ON public.watch_history(profile_id, watched_at DESC);
