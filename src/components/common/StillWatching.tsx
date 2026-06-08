'use client';

import { useState, useEffect } from 'react';

interface StillWatchingProps {
  showName: string;
  onContinue: () => void;
  onBreak: () => void;
}

export default function StillWatching({ showName, onContinue, onBreak }: StillWatchingProps) {
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown <= 0) { onBreak(); return; }
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown, onBreak]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fi .3s ease both',
      }}
    >
      <div style={{
        textAlign: 'center', padding: '3rem', borderRadius: 20,
        background: 'rgba(12,9,26,.92)', border: '1px solid rgba(255,255,255,.06)',
        boxShadow: '8px 8px 32px rgba(0,0,0,.8), 0 0 80px rgba(139,120,255,.06)',
        maxWidth: 420, width: '90%',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🌙</div>
        <h2 style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: '1.4rem', color: '#FFF5E8', marginBottom: '.5rem' }}>Still Watching?</h2>
        <p style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.92rem', color: 'rgba(255,245,232,.6)', lineHeight: 1.6, marginBottom: '.3rem' }}>
          Are you still watching <span style={{ color: 'rgba(255,179,71,.8)', fontWeight: 600 }}>{showName}</span>?
        </p>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.65rem', color: 'rgba(255,245,232,.3)', marginBottom: '2rem' }}>
          Auto-dismissing in {countdown}s
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={onContinue} className="btn-p" style={{ padding: '12px 28px', fontSize: '.82rem' }}>
            Continue Watching
          </button>
          <button onClick={onBreak} className="btn-g" style={{ padding: '12px 28px', fontSize: '.82rem' }}>
            Take a Break
          </button>
        </div>
      </div>
    </div>
  );
}
