-- Optional public watch-party rooms browser. Rooms are private (code-only
-- join) by default; a host can opt in to make a room discoverable so
-- spontaneous group-watching doesn't strictly require sharing a code first.
ALTER TABLE public.watch_party_rooms
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Existing SELECT policy already requires auth.uid() IS NOT NULL, which
-- covers browsing too (any signed-in user can read any row) — no RLS
-- change needed, just an index for the public-rooms list query.
CREATE INDEX IF NOT EXISTS idx_watch_party_rooms_public
  ON public.watch_party_rooms (is_public, created_at DESC)
  WHERE is_public = true;
