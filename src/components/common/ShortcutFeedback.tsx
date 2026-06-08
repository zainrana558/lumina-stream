'use client';

import type { ShortcutFeedback } from '@/hooks/useKeyboardShortcuts';

export default function ShortcutFeedback({ feedback }: { feedback: ShortcutFeedback | null }) {
  if (!feedback) return null;

  return (
    <div
      key={feedback.timestamp}
      style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 10002, pointerEvents: 'none',
        animation: 'feedback-pop .8s ease both',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 24px', borderRadius: 12,
        background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,.1)',
        boxShadow: '4px 4px 20px rgba(0,0,0,.6)',
      }}>
        <span style={{ fontSize: '1.4rem' }}>{feedback.icon}</span>
        <span style={{
          fontFamily: "'Cinzel',serif", fontSize: '.82rem',
          color: '#FFF5E8', fontWeight: 600, letterSpacing: '.06em',
        }}>{feedback.label}</span>
      </div>
    </div>
  );
}
