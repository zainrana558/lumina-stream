'use client';

import { useState } from 'react';
import Image from 'next/image';
import { CS } from '@/styles/themes';
import { getYoutubeThumbnail } from '@/lib/images';

interface Trailer {
  key: string;
  name: string;
  site: string;
  type: string;
}

export default function TrailerModal({ trailers, showTitle, onClose }: {
  trailers: Trailer[];
  showTitle: string;
  onClose: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);

  if (trailers.length === 0) return null;
  const trailer = trailers[activeIdx];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,.85)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fi .25s ease both',
      }}
      onClick={onClose}
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
      role="dialog"
      aria-label="Trailer for ${showTitle}"
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '90%', maxWidth: 900,
          background: '#0C091A', borderRadius: 16, overflow: 'hidden',
          boxShadow: '8px 8px 40px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.05)',
          animation: 'el .35s ease both',
        }}
      >
        {/* YouTube embed */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
          <iframe
            src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
            allowFullScreen allow="autoplay; encrypted-media"
          />
        </div>
        {/* Trailer info */}
        <div style={{ padding: '1.2rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: '1rem', color: '#FFF5E8' }}>{showTitle}</div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.72rem', color: 'rgba(255,245,232,.5)', marginTop: 2 }}>{trailer.name}</div>
            </div>
            <button onClick={onClose} className="btn-g" style={{ padding: '8px 16px', fontSize: '.72rem' }}>✕ Close</button>
          </div>
          {/* Trailer thumbnails */}
          {trailers.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {trailers.map((t, i) => (
                <button
                  key={t.key}
                  onClick={() => setActiveIdx(i)}
                  style={{
                    flexShrink: 0, width: 120, height: 68, borderRadius: 8, overflow: 'hidden',
                    border: `2px solid ${i === activeIdx ? 'rgba(255,179,71,.6)' : 'rgba(255,255,255,.1)'}`,
                    cursor: 'pointer', position: 'relative', transition: 'all .2s',
                    opacity: i === activeIdx ? 1 : 0.5,
                  }}
                >
                  <Image
                    src={getYoutubeThumbnail(t.key)}
                    alt={t.name}
                    fill style={{ objectFit: 'cover' }}
                    sizes="120px"
                  />
                  {i === activeIdx && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'rgba(255,179,71,.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>▶</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
