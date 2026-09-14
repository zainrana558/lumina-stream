-- ============================================================
-- Enable Supabase Realtime on tables that were previously polled via REST
-- (NotificationBell 60s poll, WatchPartyPanel 3s/5s polls). RLS already uses
-- auth.uid()-based predicates (notifications) or permissive authenticated-only
-- predicates (watch_party_*), both compatible with Realtime's postgres_changes
-- as-is — no RLS changes needed here, just adding the tables to the publication.
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.watch_party_participants;
