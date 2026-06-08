'use client';

import { useEffect, useState } from 'react';

export default function SkipButton({ type, onSkip }: { type: 'intro' | 'credits'; onSkip: () => void }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    // Staggered appearance: show after a brief delay for visual polish
    const showTimer = setTimeout(() => setVisible(true), type === 'intro' ? 1500 : 500);
    const hideTimer = setTimeout(() => setVisible(false), type === 'intro' ? 8000 : 12000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [type, dismissed]);

  if (!visible || dismissed) return null;

  return (
    <button
      onClick={() => { setDismissed(true); onSkip(); }}
      style={{
        position: 'absolute', bottom: 90, right: 24, zIndex: 5,
        padding: '10px 22px', borderRadius: 8,
        background: 'rgba(0,0,0,.75)', border: '1px solid rgba(255,255,255,.2)',
        backdropFilter: 'blur(8px)',
        color: '#FFF5E8', fontFamily: "'Cinzel',serif",
        fontSize: '.82rem', fontWeight: 600, letterSpacing: '.04em',
        cursor: 'pointer', transition: 'all .25s',
        boxShadow: '2px 2px 12px rgba(0,0,0,.5)',
        animation: 'skip-slide-in .3s ease both',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,179,71,.25)'; e.currentTarget.style.borderColor = 'rgba(255,179,71,.5)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,.75)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)'; }}
    >
      {type === 'intro' ? 'Skip Intro  →' : 'Skip Credits  →'}
    </button>
  );
}
