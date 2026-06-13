'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { MediaItem } from '@/types';
import { CS } from '@/styles/themes';
import { vibrateTap } from '@/lib/haptics';
import { getPosterUrl, getBlurPlaceholder } from '@/lib/images';

interface ContinueWatchingCardProps {
  show: MediaItem;
}

const ContinueWatchingCard = memo(function ContinueWatchingCard({ show }: ContinueWatchingCardProps) {
  const router = useRouter();
  const s = CS[show.cs];
  const hasPoster = !!show.poster_path;
  const progress = show.progress || 0;

  return (
    <div
      onClick={() => { vibrateTap(); router.push(`/details/${show.id}`); }}
      style={{
        flexShrink: 0, width: 'clamp(155px,17vw,215px)',
        height: 296, borderRadius: 14, overflow: 'hidden',
        cursor: 'pointer', position: 'relative',
        transition: 'transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,.6), 0 0 20px ${s.acc}20`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ position: 'relative', height: '100%', borderRadius: 'inherit', overflow: 'hidden', background: s.bg }}>
        {hasPoster && (
          <>
            <Image src={getPosterUrl(show) || ''} alt={show.title} fill sizes="(max-width: 768px) 50vw, 20vw" loading="lazy" placeholder="blur" blurDataURL={getBlurPlaceholder(show.cs)} style={{ objectFit: 'cover', zIndex: 0 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.3) 50%, rgba(0,0,0,.1) 100%)', zIndex: 1 }} />
          </>
        )}

        {/* Progress bar */}
        {progress > 0 && progress < 100 && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 6, height: 3 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg, ${s.acc}, ${s.acc}88)`, boxShadow: `0 0 8px ${s.acc}` }} />
          </div>
        )}

        {/* Progress percentage badge */}
        {progress > 0 && (
          <div className="f-mono" style={{
            position: 'absolute', bottom: 8, right: 8, zIndex: 6,
            padding: '2px 8px', borderRadius: 6,
            background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(4px)',
            fontSize: '.58rem', 
            color: '#FFB347', fontWeight: 600,
          }}>
            {Math.round(progress)}%
          </div>
        )}

        {/* Play overlay on hover */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          zIndex: 5, width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', opacity: 0, transition: 'opacity .25s',
          boxShadow: '0 4px 16px rgba(0,0,0,.5)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0'; }}
        >
          ▶
        </div>

        {/* Title at bottom */}
        <div style={{ position: 'absolute', bottom: 12, left: 10, right: 40, zIndex: 5 }}>
          <div className="f-cinzel" style={{  fontWeight: 700, fontSize: '.82rem', color: '#FFF5E8', marginBottom: 2, textShadow: '0 2px 8px rgba(0,0,0,.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{show.title}</div>
          <div className="f-mono" style={{ fontSize: '.6rem', color: 'rgba(255,245,232,.4)', }}>Continue watching</div>
        </div>
      </div>
    </div>
  );
});

export default ContinueWatchingCard;
