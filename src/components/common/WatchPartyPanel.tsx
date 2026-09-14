'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Circle, Clapperboard, Copy, PartyPopper, RefreshCw, Star } from 'lucide-react';
import { CS } from '@/styles/themes';
import { createClient, ensureRealtimeAuth } from '@/lib/supabase/client';

interface Participant {
  profile_id: string;
  name: string;
  avatar_url: string | null;
  joined_at: string;
  is_host: boolean;
}

interface ChatMessage {
  id: string;
  profile_id: string;
  name: string;
  avatar_url: string | null;
  content: string;
  created_at: string;
}

interface RoomData {
  id: string;
  code: string;
  host_profile_id: string;
  show_id: number;
  media_type: string;
  season: number;
  episode: number;
  is_playing: boolean;
  playback_time: number;
  title: string;
  poster_path: string | null;
}

interface WatchPartyPanelProps {
  showId: number;
  showTitle: string;
  posterPath: string | null;
  mediaType: string;
  season: number;
  episode: number;
  /** Non-host participants receive the host's playback state here. */
  onPlaybackSync?: (state: { isPlaying: boolean; currentTime: number; season: number; episode: number }) => void;
  profileId: string | null;
  profileName: string | null;
}

export default function WatchPartyPanel({
  showId,
  showTitle,
  posterPath,
  mediaType,
  season,
  episode,
  onPlaybackSync,
  profileId,
  profileName,
}: WatchPartyPanelProps) {
  const [view, setView] = useState<'lobby' | 'room'>('lobby');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const [room, setRoom] = useState<RoomData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [resyncing, setResyncing] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // You control playback iff you're the room's host.
  const isHostControl = !!room && !!profileId && room.host_profile_id === profileId;

  const s = CS[Math.abs(showId) % 8];

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // New chat messages via Supabase Realtime — replaces a 3s poll that hit
  // Redis rate-limiting + Supabase + the Cloudflare Worker on every tick for
  // every participant (see the caching audit: ~1,919 req/hr/participant was
  // enough to exhaust Cloudflare's entire free daily quota in ~1 hour at
  // ~52 concurrent participants).
  useEffect(() => {
    if (view !== 'room' || !room) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      await ensureRealtimeAuth(supabase);
      if (cancelled) return;
      channel = supabase
        .channel(`watch-party-messages:${room.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'watch_party_messages', filter: `room_id=eq.${room.id}` },
          (payload) => {
            const row = payload.new as { id: string; profile_id: string; content: string; created_at: string };
            setMessages(prev => {
              if (prev.some(m => m.id === row.id)) return prev;
              const sender = participants.find(p => p.profile_id === row.profile_id);
              const newMsg: ChatMessage = {
                id: row.id,
                profile_id: row.profile_id,
                name: sender?.name || 'Anonymous',
                avatar_url: sender?.avatar_url || null,
                content: row.content,
                created_at: row.created_at,
              };
              // Drop the optimistic local echo of our own just-sent message.
              const withoutOptimistic = prev.filter(m => !(m.id.startsWith('local-') && m.profile_id === row.profile_id && m.content === row.content));
              return [...withoutOptimistic, newMsg];
            });
          },
        )
        .subscribe();
    })();

    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [view, room?.id, participants]);

  // Pull the host's current playback state and push it to the player. Used
  // for the initial sync on join and on demand via the "Resync" button.
  const pullHostSync = useCallback(async () => {
    if (!room || isHostControl) return;
    try {
      const res = await fetch(`/api/watch-party/sync?roomId=${room.id}`);
      const data = await res.json();
      if (onPlaybackSync && !data.error) {
        onPlaybackSync({
          isPlaying: data.is_playing,
          currentTime: data.playback_time,
          season: data.season,
          episode: data.episode,
        });
      }
    } catch { /* silent */ }
  }, [room?.id, isHostControl, onPlaybackSync]);

  // Initial sync on join, then live playback updates via Supabase Realtime —
  // replaces a 5s poll (non-host participants only) with the same cost
  // profile as the message poll above.
  useEffect(() => {
    if (view !== 'room' || !room || isHostControl) return;
    pullHostSync();
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      await ensureRealtimeAuth(supabase);
      if (cancelled) return;
      channel = supabase
        .channel(`watch-party-sync:${room.id}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'watch_party_rooms', filter: `id=eq.${room.id}` },
          (payload) => {
            const row = payload.new as { is_playing: boolean; playback_time: number; season: number; episode: number };
            onPlaybackSync?.({
              isPlaying: row.is_playing,
              currentTime: row.playback_time,
              season: row.season,
              episode: row.episode,
            });
          },
        )
        .subscribe();
    })();

    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [view, room?.id, isHostControl, pullHostSync, onPlaybackSync]);

  const handleCreate = async () => {
    if (!profileId) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/watch-party/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          show_id: showId,
          media_type: mediaType,
          season,
          episode,
          title: showTitle,
          poster_path: posterPath,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create room'); return; }
      // Now fetch full room data
      await fetchRoomData(data.code);
    } catch { setError('Network error'); }
    setCreating(false);
  };

  const handleJoin = async () => {
    if (!profileId || !joinCode.trim()) return;
    setJoining(true);
    setError('');
    try {
      const res = await fetch('/api/watch-party/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to join room'); return; }
      await fetchRoomData(data.code);
      setJoinCode('');
    } catch { setError('Network error'); }
    setJoining(false);
  };

  const fetchRoomData = async (code: string) => {
    try {
      const res = await fetch(`/api/watch-party/rooms?code=${code}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Room not found'); return; }
      setRoom(data.room);
      setParticipants(data.participants || []);
      setMessages(data.messages || []);
      setView('room');
    } catch { setError('Network error'); }
  };

  const handleLeave = async () => {
    if (!profileId || !room) return;
    try {
      await fetch('/api/watch-party/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, room_id: room.id }),
      });
    } catch { /* silent */ }
    setRoom(null);
    setParticipants([]);
    setMessages([]);
    setView('lobby');
  };

  const handleSendMessage = async () => {
    if (!profileId || !room || !chatInput.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/watch-party/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, room_id: room.id, content: chatInput.trim() }),
      });
      if (res.ok) {
        // Optimistically add message
        const newMsg: ChatMessage = {
          id: 'local-' + Date.now(),
          profile_id: profileId,
          name: profileName || 'You',
          avatar_url: null,
          content: chatInput.trim(),
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, newMsg]);
        setChatInput('');
      }
    } catch { /* silent */ }
    setSending(false);
  };

  const handleCopyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSyncPlayback = useCallback(async (state: { isPlaying: boolean; currentTime: number; season?: number; episode?: number }) => {
    if (!profileId || !room || !isHostControl) return;
    try {
      await fetch('/api/watch-party/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          room_id: room.id,
          is_playing: state.isPlaying,
          playback_time: state.currentTime,
          season: state.season ?? season,
          episode: state.episode ?? episode,
        }),
      });
    } catch { /* silent */ }
  }, [profileId, room?.id, isHostControl, season, episode]);

  // Expose sync function via ref-like callback
  useEffect(() => {
    if (view === 'room' && isHostControl && room) {
      // Store handleSyncPlayback on window for DetailsContent to call
      (window as unknown as Record<string, unknown>).__luminaSyncPlayback = handleSyncPlayback;
    }
    return () => {
      delete (window as unknown as Record<string, unknown>).__luminaSyncPlayback;
    };
  }, [view, isHostControl, room?.id, handleSyncPlayback]);

  // ─── LOBBY VIEW ───
  if (view === 'lobby') {
    return (
      <div className="wp-panel">
        {/* Lobby header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '.5rem' }}><Clapperboard size={32} /></div>
          <h3 className="wp-heading">Watch Party</h3>
          <p className="f-crimson" style={{  fontSize: '.88rem', color: 'rgba(255,245,232,.5)', lineHeight: 1.6, marginTop: '.5rem' }}>
            Watch together in real-time. One person hosts, everyone syncs.
          </p>
        </div>

        {!profileId ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p className="f-cinzel" style={{  fontSize: '.82rem', color: 'rgba(255,245,232,.4)' }}>
              Sign in to create or join a watch party
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Create room */}
            <button
              className="btn-p"
              onClick={handleCreate}
              disabled={creating}
              style={{ width: '100%', padding: '14px', fontSize: '.82rem' }}
            >
              {creating ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Creating...
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <PartyPopper size={16} />
                  Create a Watch Party
                </span>
              )}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
              <span className="f-cinzel" style={{  fontSize: '.58rem', color: 'rgba(255,245,232,.25)', letterSpacing: '.12em' }}>OR JOIN WITH CODE</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
            </div>

            {/* Join room */}
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <input
                className="inp wp-code-input f-mono"
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))}
                placeholder="ABCDEF"
                style={{
                  flex: 1, textAlign: 'center', fontSize: '1.2rem',
                   letterSpacing: '.3em',
                  textTransform: 'uppercase',
                }}
              />
              <button
                className="btn-g"
                onClick={handleJoin}
                disabled={joinCode.length !== 6 || joining}
                style={{ padding: '12px 20px', fontSize: '.76rem' }}
              >
                {joining ? '...' : 'Join'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="f-crimson" style={{
            marginTop: '1rem', padding: '10px 14px', borderRadius: 10,
            background: 'rgba(255,74,74,.08)', border: '1px solid rgba(255,74,74,.2)',
            color: '#FF4A4A',  fontSize: '.85rem',
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* How it works */}
        <div style={{
          marginTop: '1.5rem', padding: '1rem 1.2rem', borderRadius: 12,
          background: 'var(--s1)', border: '1px solid rgba(255,255,255,.04)',
        }}>
          <div className="f-cinzel" style={{  fontSize: '.62rem', color: 'rgba(255,245,232,.35)', letterSpacing: '.12em', marginBottom: '.75rem' }}>HOW IT WORKS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[
              ['1', 'Create a room to become the host'],
              ['2', 'Share the 6-character code with friends'],
              ['3', 'Host controls play/pause and episode selection'],
              ['4', 'Chat in real-time while watching together'],
            ].map(([num, text]) => (
              <div key={num} style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start' }}>
                <span className="f-cinzel" style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: `${s.acc}18`, color: s.acc,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                   fontSize: '.6rem', fontWeight: 700,
                }}>{num}</span>
                <span className="f-crimson" style={{  fontSize: '.82rem', color: 'rgba(255,245,232,.55)', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── ROOM VIEW ───
  return (
    <div className="wp-panel">
      {/* Room header with code + leave */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1rem', paddingBottom: '1rem',
        borderBottom: '1px solid rgba(255,255,255,.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{ display: 'flex' }}><Clapperboard size={19} /></div>
          <div>
            <div className="f-cinzel" style={{  fontSize: '.72rem', color: 'rgba(255,245,232,.45)', letterSpacing: '.06em' }}>
              WATCHING
            </div>
            <div className="f-crimson" style={{  fontSize: '.95rem', color: '#FFF5E8', fontWeight: 600 }}>
              {room?.title || showTitle}
            </div>
            <div className="f-mono" style={{  fontSize: '.6rem', color: 'rgba(255,245,232,.3)', marginTop: 2 }}>
              S{room?.season || season} E{room?.episode || episode}
              {isHostControl && (
                <span style={{ color: s.acc, marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                  <Circle size={7} fill="currentColor" /> HOST
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          {/* Room code badge */}
          <button
            onClick={handleCopyCode}
            className="wp-code-badge f-mono"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              borderRadius: 8, border: `1px solid ${s.acc}40`,
              background: `${s.acc}12`, color: s.acc,
               fontSize: '.72rem',
              fontWeight: 700, letterSpacing: '.15em', cursor: 'pointer',
              transition: 'all .2s',
            }}
            title="Click to copy code"
          >
            {room?.code || '------'}
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          {/* Guests can force an immediate catch-up to the host's position */}
          {!isHostControl && (
            <button className="f-cinzel"
              onClick={async () => { setResyncing(true); await pullHostSync(); setTimeout(() => setResyncing(false), 600); }}
              disabled={resyncing}
              style={{
                padding: '6px 12px', borderRadius: 8, border: `1px solid ${s.acc}30`,
                background: `${s.acc}10`, color: s.acc,
                fontSize: '.62rem', fontWeight: 600,
                cursor: resyncing ? 'default' : 'pointer', letterSpacing: '.04em', transition: 'all .2s',
              }}
              title="Jump to the host's current position"
            >
              {resyncing ? 'Syncing…' : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><RefreshCw size={11} /> Resync</span>}
            </button>
          )}
          <button className="f-cinzel"
            onClick={handleLeave}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,74,74,.2)',
              background: 'rgba(255,74,74,.08)', color: '#FF4A4A',
               fontSize: '.62rem', fontWeight: 600,
              cursor: 'pointer', letterSpacing: '.04em', transition: 'all .2s',
            }}
          >
            Leave
          </button>
        </div>
      </div>

      {/* Participants */}
      <div style={{
        display: 'flex', gap: '.4rem', marginBottom: '1rem', flexWrap: 'wrap',
      }}>
        <span className="f-cinzel" style={{  fontSize: '.58rem', color: 'rgba(255,245,232,.3)', letterSpacing: '.08em', alignSelf: 'center' }}>
          PARTICIPANTS ({participants.length})
        </span>
        {participants.map((p) => (
          <div key={p.profile_id} className="wp-participant" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
            borderRadius: 20, background: p.is_host ? `${s.acc}15` : 'var(--s1)',
            border: `1px solid ${p.is_host ? s.acc + '40' : 'rgba(255,255,255,.06)'}`,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              background: p.is_host ? s.acc : '#1E1838',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '.5rem', fontWeight: 700,
              color: p.is_host ? '#05020A' : '#FFF5E8',
            }}>
              {(p.name || 'A').charAt(0).toUpperCase()}
            </div>
            <span className="f-cinzel" style={{
               fontSize: '.58rem',
              color: p.is_host ? s.acc : 'rgba(255,245,232,.6)',
              fontWeight: p.is_host ? 700 : 400, letterSpacing: '.04em',
            }}>
              {p.name}{p.is_host ? <Star size={9} fill="currentColor" style={{ marginLeft: 3, verticalAlign: -1 }} /> : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Chat area */}
      <div style={{
        height: 280, overflowY: 'auto', borderRadius: 12,
        background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.04)',
        padding: '.75rem', marginBottom: '.75rem',
      }} className="hide-scroll">
        {messages.length === 0 ? (
          <div className="f-crimson" style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,245,232,.2)',  fontSize: '.85rem',
            fontStyle: 'italic',
          }}>
            No messages yet — say something!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {messages.map((m) => {
              const isOwn = m.profile_id === profileId;
              return (
                <div key={m.id} style={{
                  display: 'flex', gap: '.5rem', alignItems: 'flex-start',
                  justifyContent: isOwn ? 'flex-end' : 'flex-start',
                }}>
                  {!isOwn && (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      background: '#1E1838', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.55rem', fontWeight: 700, color: '#FFF5E8',
                    }}>
                      {(m.name || 'A').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div style={{ maxWidth: '75%' }}>
                    {!isOwn && (
                      <div className="f-cinzel" style={{
                        fontSize: '.56rem', color: 'rgba(255,245,232,.35)',
                         marginBottom: 2, letterSpacing: '.04em',
                      }}>
                        {m.name}
                      </div>
                    )}
                    <div className="f-crimson" style={{
                      padding: '6px 12px', borderRadius: 12,
                      background: isOwn
                        ? `linear-gradient(135deg, ${s.acc}30, ${s.acc}15)`
                        : 'var(--s2)',
                      border: `1px solid ${isOwn ? s.acc + '25' : 'rgba(255,255,255,.04)'}`,
                       fontSize: '.85rem',
                      color: 'rgba(255,245,232,.8)', lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}>
                      {m.content}
                    </div>
                    <div className="f-mono" style={{
                      fontSize: '.48rem', color: 'rgba(255,245,232,.18)',
                       marginTop: 2,
                      textAlign: isOwn ? 'right' : 'left',
                    }}>
                      {new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Chat input */}
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <input
          className="inp f-crimson"
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value.slice(0, 500))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
          placeholder="Type a message..."
          maxLength={500}
          style={{ flex: 1, padding: '10px 14px', fontSize: '.85rem', }}
        />
        <button
          className="btn-p"
          onClick={handleSendMessage}
          disabled={!chatInput.trim() || sending}
          style={{ padding: '10px 18px', fontSize: '.72rem' }}
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
