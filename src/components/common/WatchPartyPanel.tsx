'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CS } from '@/styles/themes';

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
  isHostControl: boolean; // true = host controls playback
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
  isHostControl,
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
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const s = CS[Math.abs(showId) % 8];

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (syncRef.current) clearInterval(syncRef.current);
    };
  }, []);

  // Poll for new messages when in room
  useEffect(() => {
    if (view !== 'room' || !room) return;

    const pollMessages = async () => {
      try {
        const params = new URLSearchParams({ roomId: room.id });
        if (lastMessageAt) params.set('after', lastMessageAt);
        const res = await fetch(`/api/watch-party/messages?${params}`);
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
            return [...prev, ...newMsgs];
          });
          setLastMessageAt(data.messages[data.messages.length - 1].created_at);
        }
      } catch { /* silent */ }
    };

    pollMessages(); // Initial fetch
    pollRef.current = setInterval(pollMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [view, room?.id, lastMessageAt]);

  // Poll for playback sync state (for non-host participants)
  useEffect(() => {
    if (view !== 'room' || !room || isHostControl) return;

    const pollSync = async () => {
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
        // Update participant count
        if (data.participant_count !== undefined) {
          setParticipants(prev => {
            // Just update count display - full list fetched on join
            return prev;
          });
        }
      } catch { /* silent */ }
    };

    syncRef.current = setInterval(pollSync, 5000);
    return () => { if (syncRef.current) clearInterval(syncRef.current); };
  }, [view, room?.id, isHostControl, onPlaybackSync]);

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
      setLastMessageAt(data.messages?.length > 0 ? data.messages[data.messages.length - 1].created_at : null);
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
    setLastMessageAt(null);
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

  const handleSyncPlayback = useCallback(async (state: { isPlaying: boolean; currentTime: number }) => {
    if (!profileId || !room || !isHostControl) return;
    try {
      await fetch('/api/watch-party/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: profileId,
          room_id: room.id,
          ...state,
        }),
      });
    } catch { /* silent */ }
  }, [profileId, room?.id, isHostControl]);

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
          <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🎬</div>
          <h3 className="wp-heading">Watch Party</h3>
          <p style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.88rem', color: 'rgba(255,245,232,.5)', lineHeight: 1.6, marginTop: '.5rem' }}>
            Watch together in real-time. One person hosts, everyone syncs.
          </p>
        </div>

        {!profileId ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <p style={{ fontFamily: "'Cinzel',serif", fontSize: '.82rem', color: 'rgba(255,245,232,.4)' }}>
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
                '🎉 Create a Watch Party'
              )}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: '.58rem', color: 'rgba(255,245,232,.25)', letterSpacing: '.12em' }}>OR JOIN WITH CODE</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }} />
            </div>

            {/* Join room */}
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <input
                className="inp wp-code-input"
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))}
                placeholder="ABCDEF"
                style={{
                  flex: 1, textAlign: 'center', fontSize: '1.2rem',
                  fontFamily: "'JetBrains Mono',monospace", letterSpacing: '.3em',
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
          <div style={{
            marginTop: '1rem', padding: '10px 14px', borderRadius: 10,
            background: 'rgba(255,74,74,.08)', border: '1px solid rgba(255,74,74,.2)',
            color: '#FF4A4A', fontFamily: "'Crimson Pro',serif", fontSize: '.85rem',
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
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.62rem', color: 'rgba(255,245,232,.35)', letterSpacing: '.12em', marginBottom: '.75rem' }}>HOW IT WORKS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {[
              ['1', 'Create a room to become the host'],
              ['2', 'Share the 6-character code with friends'],
              ['3', 'Host controls play/pause and episode selection'],
              ['4', 'Chat in real-time while watching together'],
            ].map(([num, text]) => (
              <div key={num} style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-start' }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: `${s.acc}18`, color: s.acc,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Cinzel',serif", fontSize: '.6rem', fontWeight: 700,
                }}>{num}</span>
                <span style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.82rem', color: 'rgba(255,245,232,.55)', lineHeight: 1.5 }}>{text}</span>
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
          <div style={{ fontSize: '1.2rem' }}>🎬</div>
          <div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.72rem', color: 'rgba(255,245,232,.45)', letterSpacing: '.06em' }}>
              WATCHING
            </div>
            <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.95rem', color: '#FFF5E8', fontWeight: 600 }}>
              {room?.title || showTitle}
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.6rem', color: 'rgba(255,245,232,.3)', marginTop: 2 }}>
              S{room?.season || season} E{room?.episode || episode}
              {isHostControl && <span style={{ color: s.acc, marginLeft: 6 }}>⬤ HOST</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          {/* Room code badge */}
          <button
            onClick={handleCopyCode}
            className="wp-code-badge"
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              borderRadius: 8, border: `1px solid ${s.acc}40`,
              background: `${s.acc}12`, color: s.acc,
              fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem',
              fontWeight: 700, letterSpacing: '.15em', cursor: 'pointer',
              transition: 'all .2s',
            }}
            title="Click to copy code"
          >
            {room?.code || '------'}
            {copied ? ' ✓' : ' ⎘'}
          </button>
          <button
            onClick={handleLeave}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,74,74,.2)',
              background: 'rgba(255,74,74,.08)', color: '#FF4A4A',
              fontFamily: "'Cinzel',serif", fontSize: '.62rem', fontWeight: 600,
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
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: '.58rem', color: 'rgba(255,245,232,.3)', letterSpacing: '.08em', alignSelf: 'center' }}>
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
            <span style={{
              fontFamily: "'Cinzel',serif", fontSize: '.58rem',
              color: p.is_host ? s.acc : 'rgba(255,245,232,.6)',
              fontWeight: p.is_host ? 700 : 400, letterSpacing: '.04em',
            }}>
              {p.name}{p.is_host ? ' ★' : ''}
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
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,245,232,.2)', fontFamily: "'Crimson Pro',serif", fontSize: '.85rem',
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
                      <div style={{
                        fontSize: '.56rem', color: 'rgba(255,245,232,.35)',
                        fontFamily: "'Cinzel',serif", marginBottom: 2, letterSpacing: '.04em',
                      }}>
                        {m.name}
                      </div>
                    )}
                    <div style={{
                      padding: '6px 12px', borderRadius: 12,
                      background: isOwn
                        ? `linear-gradient(135deg, ${s.acc}30, ${s.acc}15)`
                        : 'var(--s2)',
                      border: `1px solid ${isOwn ? s.acc + '25' : 'rgba(255,255,255,.04)'}`,
                      fontFamily: "'Crimson Pro',serif", fontSize: '.85rem',
                      color: 'rgba(255,245,232,.8)', lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}>
                      {m.content}
                    </div>
                    <div style={{
                      fontSize: '.48rem', color: 'rgba(255,245,232,.18)',
                      fontFamily: "'JetBrains Mono',monospace", marginTop: 2,
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
          className="inp"
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value.slice(0, 500))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
          placeholder="Type a message..."
          maxLength={500}
          style={{ flex: 1, padding: '10px 14px', fontSize: '.85rem', fontFamily: "'Crimson Pro',serif" }}
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
