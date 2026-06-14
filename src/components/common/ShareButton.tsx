'use client';

import { useState } from 'react';
import { useToast } from '@/components/common/ToastProvider';

export default function ShareButton({ title, id }: { title: string; id: number }) {
  const { addToast } = useToast();
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/details/${id}` : '';
    const text = `Check out ${title} on Lumina Stream!`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setShared(true);
        addToast('success', 'Shared successfully!');
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShared(true);
        addToast('success', 'Link copied to clipboard!');
      }
    } catch {
      addToast('error', 'Could not share');
    }
  };

  return (
    <button className="f-cinzel"
      onClick={handleShare}
      title="Share"
      style={{
        padding: '10px 18px', borderRadius: 10,
        background: shared ? 'rgba(16,185,129,.15)' : 'rgba(255,255,255,.06)',
        border: `1px solid ${shared ? 'rgba(16,185,129,.4)' : 'rgba(255,255,255,.1)'}`,
        color: shared ? 'rgba(16,185,129,.8)' : '#FFF5E8',
         fontSize: '.78rem',
        cursor: 'pointer', transition: 'all .2s',
        display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      {shared ? '✓ Shared' : '↗ Share'}
    </button>
  );
}
