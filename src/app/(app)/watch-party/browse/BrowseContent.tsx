'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Users, PartyPopper, Loader2 } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { getPosterUrl } from '@/lib/images';
import { mediaUrl } from '@/lib/slug';
import { useToast } from '@/components/common/ToastProvider';

interface PublicRoom {
  id: string;
  code: string;
  show_id: number;
  media_type: 'movie' | 'tv';
  season: number;
  episode: number;
  title: string;
  poster_path: string | null;
  created_at: string;
  participant_count: number;
}

export default function BrowseContent() {
  const { profile } = useApp();
  const router = useRouter();
  const { addToast } = useToast();
  const [rooms, setRooms] = useState<PublicRoom[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    fetch('/api/watch-party/public')
      .then(res => res.json())
      .then(data => { if (!cancelled) setRooms(data.rooms || []); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [profile]);

  const openRoom = (room: PublicRoom) => {
    navigator.clipboard?.writeText(room.code).catch(() => {});
    addToast('info', `Code ${room.code} copied — paste it into Watch Party to join`);
    router.push(mediaUrl(room.show_id, room.title, room.media_type));
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(1rem,5vw,2rem)', paddingTop: 96, paddingBottom: 120 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <PartyPopper size={22} color="#FFB347" />
        <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, color: '#FFF5E8' }}>
          Public Watch Parties
        </h1>
      </div>
      <p className="f-crimson" style={{ color: 'rgba(255,245,232,.5)', fontSize: '.9rem', marginBottom: 32 }}>
        Rooms hosts have opted to make discoverable. Join instantly — no code needed from a friend.
      </p>

      {!profile && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,245,232,.4)' }}>
          Sign in to browse and join public watch parties.
        </div>
      )}

      {profile && !rooms && !error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,245,232,.4)', justifyContent: 'center', padding: '3rem 0' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading rooms…
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,245,232,.4)' }}>
          Couldn&apos;t load public rooms right now.
        </div>
      )}

      {profile && rooms && rooms.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,245,232,.4)' }}>
          No public rooms open right now. Start one from any show&apos;s Watch Party panel and check &quot;List this room publicly&quot;.
        </div>
      )}

      {profile && rooms && rooms.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 16 }}>
          {rooms.map(room => {
            const poster = getPosterUrl({ poster_path: room.poster_path }, 'w342');
            return (
              <button
                key={room.id}
                onClick={() => openRoom(room)}
                style={{
                  display: 'flex', flexDirection: 'column', textAlign: 'left', cursor: 'pointer',
                  background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)',
                  borderRadius: 12, overflow: 'hidden', padding: 0,
                }}
              >
                <div style={{ position: 'relative', aspectRatio: '2/3', background: '#1a1030' }}>
                  {poster && (
                    <Image src={poster} alt={room.title} fill sizes="180px" style={{ objectFit: 'cover' }} />
                  )}
                  <div style={{
                    position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 4,
                    background: 'rgba(0,0,0,.7)', borderRadius: 20, padding: '3px 8px', fontSize: '.68rem', color: '#FFF5E8',
                  }}>
                    <Users size={11} /> {room.participant_count}
                  </div>
                </div>
                <div style={{ padding: 10 }}>
                  <div style={{ color: '#FFF5E8', fontSize: '.8rem', fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {room.title}
                  </div>
                  {room.media_type === 'tv' && (
                    <div style={{ color: 'rgba(255,245,232,.4)', fontSize: '.68rem' }}>S{room.season} E{room.episode}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
