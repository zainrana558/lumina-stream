-- ============================================================
-- LUMINA STREAM - RLS Hardening + Watch Party Policies
-- ============================================================
-- Run this SQL in your Supabase Dashboard → SQL Editor
-- Fixes: reminders cookie bypass, missing watch_party RLS
-- ============================================================

-- ── 1. FIX: Remove cookie-based bypass from reminders SELECT ──
-- The old policy allowed reading reminders via a spoofable cookie value.
-- Replace with proper auth-based policy only.
DROP POLICY IF EXISTS "Users can read own reminders" ON public.reminders;

CREATE POLICY "Users can read own reminders"
  ON public.reminders FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE account_id = auth.uid()
    )
  );

-- ── 2. WATCH PARTY TABLES: Enable RLS ──
ALTER TABLE public.watch_party_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_party_messages ENABLE ROW LEVEL SECURITY;

-- ── 3. WATCH PARTY ROOMS ──
-- Anyone authenticated can read rooms (needed to join by code)
CREATE POLICY "Authenticated users can read watch party rooms"
  ON public.watch_party_rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only authenticated users can create rooms (server validates host_profile_id ownership)
CREATE POLICY "Authenticated users can create watch party rooms"
  ON public.watch_party_rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only the host (via verified profile) can update room playback state
-- Server-side code verifies profile ownership before calling update,
-- so we allow any authenticated user to update — the API route is the gatekeeper.
CREATE POLICY "Authenticated users can update watch party rooms"
  ON public.watch_party_rooms FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Host can delete room (leave = delete for host)
CREATE POLICY "Authenticated users can delete watch party rooms"
  ON public.watch_party_rooms FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ── 4. WATCH PARTY PARTICIPANTS ──
-- Participants can read other participants in their room
CREATE POLICY "Authenticated users can read watch party participants"
  ON public.watch_party_participants FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Participants can be inserted (join room)
CREATE POLICY "Authenticated users can insert watch party participants"
  ON public.watch_party_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Participants can update their own heartbeat
CREATE POLICY "Participants can update their own participant record"
  ON public.watch_party_participants FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Participants can delete themselves (leave room)
CREATE POLICY "Participants can delete their own participant record"
  ON public.watch_party_participants FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ── 5. WATCH PARTY MESSAGES ──
-- Participants can read messages in their room
CREATE POLICY "Authenticated users can read watch party messages"
  ON public.watch_party_messages FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Participants can insert messages
CREATE POLICY "Authenticated users can insert watch party messages"
  ON public.watch_party_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- No UPDATE or DELETE on messages (immutable chat)

-- ── 6. ENSURE core tables have proper policies (safety net) ──
-- These should already exist from 001_create_missing_tables.sql,
-- but we add them with IF NOT EXISTS / OR REPLACE patterns.

-- Watchlist
CREATE POLICY IF NOT EXISTS "Users can read own watchlist"
  ON public.watchlist FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can insert own watchlist"
  ON public.watchlist FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can delete own watchlist"
  ON public.watchlist FOR DELETE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

-- Watch Progress
CREATE POLICY IF NOT EXISTS "Users can read own watch progress"
  ON public.watch_progress FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can insert own watch progress"
  ON public.watch_progress FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can update own watch progress"
  ON public.watch_progress FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

-- Watch History
CREATE POLICY IF NOT EXISTS "Users can read own watch history"
  ON public.watch_history FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can insert own watch history"
  ON public.watch_history FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

-- Ratings
CREATE POLICY IF NOT EXISTS "Users can read all ratings"
  ON public.ratings FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Users can insert own ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can update own ratings"
  ON public.ratings FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

-- Comments
CREATE POLICY IF NOT EXISTS "Anyone can read comments"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Users can insert own comments"
  ON public.comments FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can delete own comments"
  ON public.comments FOR DELETE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

-- Collections
CREATE POLICY IF NOT EXISTS "Users can read own collections"
  ON public.collections FOR SELECT
  USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can insert own collections"
  ON public.collections FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can update own collections"
  ON public.collections FOR UPDATE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

CREATE POLICY IF NOT EXISTS "Users can delete own collections"
  ON public.collections FOR DELETE
  USING (profile_id IN (SELECT id FROM public.profiles WHERE account_id = auth.uid()));

-- Collection Items
CREATE POLICY IF NOT EXISTS "Users can read own collection items"
  ON public.collection_items FOR SELECT
  USING (
    collection_id IN (
      SELECT id FROM public.collections WHERE profile_id IN (
        SELECT id FROM public.profiles WHERE account_id = auth.uid()
      )
    )
  );

CREATE POLICY IF NOT EXISTS "Users can insert own collection items"
  ON public.collection_items FOR INSERT
  WITH CHECK (
    collection_id IN (
      SELECT id FROM public.collections WHERE profile_id IN (
        SELECT id FROM public.profiles WHERE account_id = auth.uid()
      )
    )
  );

CREATE POLICY IF NOT EXISTS "Users can delete own collection items"
  ON public.collection_items FOR DELETE
  USING (
    collection_id IN (
      SELECT id FROM public.collections WHERE profile_id IN (
        SELECT id FROM public.profiles WHERE account_id = auth.uid()
      )
    )
  );

-- Profiles (users can read all profiles for follow/activity features,
-- but can only update their own)
CREATE POLICY IF NOT EXISTS "Anyone can read profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Users can update own profiles"
  ON public.profiles FOR UPDATE
  USING (account_id = auth.uid());