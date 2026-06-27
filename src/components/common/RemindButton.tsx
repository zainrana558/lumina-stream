'use client';

import { useState } from 'react';
import { useToast } from '@/components/common/ToastProvider';

export default function RemindButton({ mediaId, mediaType, title, releaseDate }: {
  mediaId: number; mediaType: string; title: string; releaseDate?: string;
}) {
  const { addToast } = useToast();
  const [active, setActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    const key = `remind_${mediaType}_${mediaId}`;
    return localStorage.getItem(key) === 'true';
  });
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    const key = `remind_${mediaType}_${mediaId}`;
    try {
      if (active) {
        localStorage.removeItem(key);
        setActive(false);
        addToast('info', `Removed reminder for "${title}"`);
      } else {
        localStorage.setItem(key, 'true');
        // Also store reminder data for later use
        const reminders = JSON.parse(localStorage.getItem('lumina_reminders') || '[]');
        reminders.push({ mediaId, mediaType, title, releaseDate, addedAt: Date.now() });
        localStorage.setItem('lumina_reminders', JSON.stringify(reminders));
        setActive(true);
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
      {active ? '🔔' : '🔕'}
    </button>
  );
}
