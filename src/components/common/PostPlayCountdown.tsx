'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const COUNTDOWN_SECONDS = 10;

interface PostPlayCountdownProps {
  showTitle: string;
  showPoster: string | null;
  nextEpInfo: string;
  onNextEpisode: () => void;
  onCancel: () => void;
}

export default function PostPlayCountdown({ showTitle, showPoster, nextEpInfo, onNextEpisode, onCancel }: PostPlayCountdownProps) {
  const [count, setCount] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (count <= 0) { onNextEpisode(); return; }
    const t = setInterval(() => setCount(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [count, onNextEpisode]);

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 6,
        background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fi .35s ease both',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: '2rem',
        padding: '2.5rem', borderRadius: 20,
        background: 'rgba(12,9,26,.9)', border: '1px solid rgba(255,255,255,.06)',
        boxShadow: '8px 8px 32px rgba(0,0,0,.8), 0 0 60px rgba(139,120,255,.08)',
        maxWidth: 600, width: '90%',
      }}>
        {/* Next episode card */}
        {showPoster && (
          <div style={{
            width: 120, height: 170, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
            boxShadow: '4px 4px 16px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.06)',
            position: 'relative',
          }}>
            <Image src={showPoster} alt={showTitle} fill style={{ objectFit: 'cover' }} sizes="120px" />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(255,179,71,.15), transparent)',
            }} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.65rem', color: 'rgba(255,179,71,.7)', letterSpacing: '.14em', marginBottom: '.5rem' }}>UP NEXT</div>
          <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: '1.15rem', color: '#FFF5E8', marginBottom: '.3rem' }}>{showTitle}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'rgba(255,245,232,.5)', marginBottom: '1.2rem' }}>{nextEpInfo}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <div onClick={onNextEpisode} style={{
              width: 56, height: 56, borderRadius: '50%',
              border: `3px solid rgba(255,179,71,.4)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', cursor: 'pointer',
            }}>
              <svg width="56" height="56" style={{ position: 'absolute', top: -3, left: -3, transform: 'rotate(-90deg)' }}>
                <circle cx="28" cy="28" r="25" fill="none" stroke="rgba(255,179,71,.15)" strokeWidth="3" />
                <circle cx="28" cy="28" r="25" fill="none" stroke="rgba(255,179,71,.7)" strokeWidth="3"
                  strokeDasharray={`${2 * Math.PI * 25}`}
                  strokeDashoffset={`${2 * Math.PI * 25 * (1 - count / COUNTDOWN_SECONDS)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <span style={{ fontFamily: "'Cinzel',serif", fontSize: '1.1rem', fontWeight: 700, color: '#FFF5E8', zIndex: 1 }}>{count}</span>
            </div>
            <button onClick={onNextEpisode} className="btn-p" style={{ padding: '10px 24px', fontSize: '.78rem' }}>
              Play Now
            </button>
          </div>
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', color: 'rgba(255,245,232,.4)',
            cursor: 'pointer', fontFamily: "'Cinzel',serif", fontSize: '.72rem',
            letterSpacing: '.06em',
          }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
