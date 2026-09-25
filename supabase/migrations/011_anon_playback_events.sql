-- Allow anonymous (logged-out) playback events into playback_analytics.
--
-- Guests were previously invisible to the L12 learning system entirely —
-- IntelligentPlayer only reported events when isAuthenticated, and even if
-- it hadn't, RLS would have rejected the insert: the existing INSERT policy
-- requires user_id = auth.uid(), which is NULL = NULL (false) for an
-- anonymous request. Add a second policy that accepts a genuinely anonymous
-- row (both user_id and profile_id NULL) instead of loosening the existing
-- authenticated policy.
DO $$ BEGIN
  CREATE POLICY "Anonymous can insert anon analytics" ON public.playback_analytics FOR INSERT
    WITH CHECK (user_id IS NULL AND profile_id IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
