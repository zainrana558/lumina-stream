'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

interface RealtimeMessage {
  id: string;
  profile_id: string;
  name: string;
  avatar_url: string | null;
  content: string;
  created_at: string;
}

interface RealtimeSync {
  is_playing: boolean;
  playback_time: number;
  season: number;
  episode: number;
}

interface UseWatchPartyRealtimeOptions {
  roomId: string | null;
  profileId: string | null;
  onNewMessage?: (msg: RealtimeMessage) => void;
  onSyncUpdate?: (state: RealtimeSync) => void;
}

interface UseWatchPartyRealtimeReturn {
  connected: boolean;
  sendMessage: (content: string) => Promise<boolean>;
  sendSync: (state: RealtimeSync) => Promise<boolean>;
}

/**
 * Supabase Realtime hook for Watch Party.
 * Replaces polling with WebSocket subscriptions for instant updates.
 *
 * - Messages: listens for INSERT on watch_party_messages
 * - Sync: listens for UPDATE on watch_party_rooms
 *
 * Falls back to polling if Supabase is not configured.
 */
export function useWatchPartyRealtime({
  roomId,
  profileId,
  onNewMessage,
  onSyncUpdate,
}: UseWatchPartyRealtimeOptions): UseWatchPartyRealtimeReturn {
  const [connected, setConnected] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMessageAtRef = useRef<string | null>(null);

  // Cleanup on unmount or room change
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        try { channelRef.current.unsubscribe(); } catch { /* ok */ }
        channelRef.current = null;
      }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (syncPollRef.current) { clearInterval(syncPollRef.current); syncPollRef.current = null; }
      setConnected(false);
    };
  }, [roomId]);

  // Set up Realtime subscription when roomId changes
  useEffect(() => {
    if (!roomId || !SUPABASE_URL || !SUPABASE_ANON_KEY) return;

    // Create Supabase client (lazy)
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    const supabase = supabaseRef.current;

    // Clean up previous channel
    if (channelRef.current) {
      try { channelRef.current.unsubscribe(); } catch { /* ok */ }
    }

    // Stop any fallback polling
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (syncPollRef.current) { clearInterval(syncPollRef.current); syncPollRef.current = null; }

    const channel = supabase
      .channel(`watch-party:${roomId}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'watch_party_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMsg = payload.new as unknown as {
            id: string;
            profile_id: string;
            content: string;
            created_at: string;
          };
          // Fetch profile info for the message sender
          // (Postgres Changes payload doesn't include joined data)
          if (onNewMessage && newMsg) {
            onNewMessage({
              id: newMsg.id,
              profile_id: newMsg.profile_id,
              name: 'Loading...',
              avatar_url: null,
              content: newMsg.content,
              created_at: newMsg.created_at,
            });
            // Fetch the full message with profile data
            supabase
              .from('watch_party_messages')
              .select('id, profile_id, content, created_at, profiles(name, avatar_url)')
              .eq('id', newMsg.id)
              .single()
              .then(({ data }) => {
                if (data) {
                  onNewMessage({
                    id: data.id,
                    profile_id: data.profile_id,
                    name: (data.profiles as Array<{ name: string }> | null)?.[0]?.name || 'Anonymous',
                    avatar_url: (data.profiles as Array<{ avatar_url: string | null }> | null)?.[0]?.avatar_url || null,
                    content: data.content,
                    created_at: data.created_at,
                  });
                }
              });
          }
          lastMessageAtRef.current = newMsg.created_at;
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'watch_party_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const updated = payload.new as unknown as RealtimeSync;
          if (onSyncUpdate && updated) {
            onSyncUpdate({
              is_playing: updated.is_playing,
              playback_time: updated.playback_time,
              season: updated.season,
              episode: updated.episode,
            });
          }
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Start with initial messages fetch via API (to get profile data)
    // Then Realtime handles all subsequent messages
  }, [roomId, onNewMessage, onSyncUpdate]);

  // Fallback polling if Realtime never connects (e.g. RLS or network issue)
  useEffect(() => {
    if (!roomId || connected) return;

    // Message polling fallback (every 3s)
    const pollMessages = async () => {
      try {
        const params = new URLSearchParams({ roomId });
        if (lastMessageAtRef.current) params.set('after', lastMessageAtRef.current);
        const res = await fetch(`/api/watch-party/messages?${params}`);
        const data = await res.json();
        if (data.messages?.length > 0 && onNewMessage) {
          for (const m of data.messages) {
            onNewMessage(m);
          }
          lastMessageAtRef.current = data.messages[data.messages.length - 1].created_at;
        }
      } catch { /* silent */ }
    };

    pollMessages();
    pollRef.current = setInterval(pollMessages, 3000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [roomId, connected, onNewMessage]);

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    if (!profileId || !roomId) return false;
    try {
      const res = await fetch('/api/watch-party/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, room_id: roomId, content: content.trim() }),
      });
      return res.ok;
    } catch { return false; }
  }, [profileId, roomId]);

  const sendSync = useCallback(async (state: RealtimeSync): Promise<boolean> => {
    if (!profileId || !roomId) return false;
    try {
      const res = await fetch('/api/watch-party/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, room_id: roomId, ...state }),
      });
      return res.ok;
    } catch { return false; }
  }, [profileId, roomId]);

  return { connected, sendMessage, sendSync };
}