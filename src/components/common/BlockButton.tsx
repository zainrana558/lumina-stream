'use client';

import { useState, useEffect } from 'react';
import { Ban } from 'lucide-react';
import { useToast } from '@/components/common/ToastProvider';

export default function BlockButton({ mediaId, mediaType, title }: {
  mediaId: number; mediaType: string; title: string;
}) {
  const { addToast } = useToast();
  // Read after mount — see RemindButton.tsx for why (avoids a hydration mismatch).
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    try {
      const blockedList: string[] = JSON.parse(localStorage.getItem('lumina_blocked') || '[]');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: localStorage read after mount to avoid a hydration mismatch
      setBlocked(blockedList.includes(`${mediaType}_${mediaId}`));
    } catch { /* ignore */ }
  }, [mediaId, mediaType]);

  const toggleBlock = () => {
    const blockedList: string[] = JSON.parse(localStorage.getItem('lumina_blocked') || '[]');
    const key = `${mediaType}_${mediaId}`;

    if (blocked) {
      const filtered = blockedList.filter(b => b !== key);
      localStorage.setItem('lumina_blocked', JSON.stringify(filtered));
      setBlocked(false);
      addToast('info', `"${title}" unblocked`);
    } else {
      blockedList.push(key);
      localStorage.setItem('lumina_blocked', JSON.stringify(blockedList));
      setBlocked(true);
      addToast('warning', `"${title}" blocked`);
    }
  };

  return (
    <button className="f-cinzel"
      onClick={toggleBlock}
      title={blocked ? 'Unblock' : 'Block this title'}
      style={{
        padding: '10px 18px', borderRadius: 10,
        background: blocked ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.06)',
        border: `1px solid ${blocked ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.1)'}`,
        color: blocked ? 'rgba(239,68,68,.8)' : '#FFF5E8',
         fontSize: '.78rem',
        cursor: 'pointer', transition: 'all .2s',
        display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      {blocked ? <><Ban size={14} /> Blocked</> : <><Ban size={14} /> Block</>}
    </button>
  );
}

// Utility to check if a title is blocked
export function isTitleBlocked(mediaId: number, mediaType: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const blockedList: string[] = JSON.parse(localStorage.getItem('lumina_blocked') || '[]');
    return blockedList.includes(`${mediaType}_${mediaId}`);
  } catch { return false; }
}
