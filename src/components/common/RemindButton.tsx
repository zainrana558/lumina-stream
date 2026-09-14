'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useToast } from '@/components/common/ToastProvider';
import { useApp } from '@/contexts/AppContext';
import type { MediaType } from '@/types';

interface StoredReminder {
  mediaId: number; mediaType: MediaType; title: string;
  releaseDate?: string; poster_path?: string | null; addedAt: number;
}

export default function RemindButton({ mediaId, mediaType, title, posterPath, releaseDate }: {
  mediaId: number; mediaType: MediaType; title: string; posterPath?: string | null; releaseDate?: string;
}) {
  const { addToast } = useToast();
  const { profile } = useApp();
  // Read after mount — a localStorage-derived initial state makes the first
  // client render (for anyone who already set this reminder) differ from SSR,
  // which always sees false → hydration mismatch (visible icon/color differs).
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const key = `remind_${mediaType}_${mediaId}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: localStorage read after mount to avoid a hydration mismatch
    setActive(localStorage.getItem(key) === 'true');
  }, [mediaId, mediaType]);

  const toggle = async () => {
    setLoading(true);
    const key = `remind_${mediaType}_${mediaId}`;
    try {
      if (active) {
        // Optimistic local update first — works offline/for guests, and keeps
        // the toggle responsive even if the server call below is slow/fails.
        localStorage.removeItem(key);
        const stored: StoredReminder[] = JSON.parse(localStorage.getItem('lumina_reminders') || '[]');
        localStorage.setItem('lumina_reminders', JSON.stringify(
          stored.filter(r => !(r.mediaId === mediaId && r.mediaType === mediaType))
        ));
        setActive(false);
        // Signed-in users get a real server-backed reminder (read by the
        // watchlist page's Reminders tab and by the /api/reminders-check cron).
        if (profile) {
          try {
            await fetch('/api/reminders', {
              method: 'DELETE', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ profileId: profile.id, mediaId, mediaType }),
            });
          } catch { /* local removal already applied; server sync can lag */ }
        }
        addToast('info', `Removed reminder for "${title}"`);
      } else {
        localStorage.setItem(key, 'true');
        const stored: StoredReminder[] = JSON.parse(localStorage.getItem('lumina_reminders') || '[]');
        stored.push({ mediaId, mediaType, title, releaseDate, poster_path: posterPath ?? null, addedAt: Date.now() });
        localStorage.setItem('lumina_reminders', JSON.stringify(stored));
        setActive(true);
        if (profile) {
          try {
            await fetch('/api/reminders', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ profileId: profile.id, mediaId, mediaType, title, posterPath: posterPath ?? null, releaseDate: releaseDate ?? null }),
            });
          } catch { /* local reminder already applied; server sync can lag */ }
        }
        addToast('success', `Reminder set for "${title}"`);
      }
    } catch {
      addToast('error', 'Could not save reminder');
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={active ? 'Remove reminder' : 'Remind me'}
      style={{
        width: 40, height: 40, borderRadius: '50%',
        background: active ? 'rgba(255,179,71,.2)' : 'rgba(255,255,255,.06)',
        border: `1.5px solid ${active ? 'rgba(255,179,71,.5)' : 'rgba(255,255,255,.1)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: loading ? 'wait' : 'pointer',
        fontSize: active ? '1rem' : '.85rem', color: active ? 'rgba(255,179,71,.9)' : '#FFF5E8',
        transition: 'all .2s', position: 'relative',
        boxShadow: active ? '0 0 12px rgba(255,179,71,.2)' : 'none',
      }}
    >
      {active ? <Bell size={16} /> : <BellOff size={14} />}
    </button>
  );
}
