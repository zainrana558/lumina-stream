'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { MediaItem } from '@/types';
import { CS } from '@/styles/themes';

import { getPosterUrl, getBlurPlaceholder } from '@/lib/images';

interface ExtendedMediaItem extends MediaItem {
  _anilistCover?: string;
  _anilistBanner?: string;
  _malId?: number;
  _anilistUrl?: string;
}

interface SeasonalClientProps {
  airingToday: MediaItem[];
  trendingThisWeek: MediaItem[];
  returningSeries: MediaItem[];
}

const TABS = [
  { key: 'airing', label: '📺 This Season', emoji: '📺' },
  { key: 'trending', label: '🔥 Trending Anime', emoji: '🔥' },
  { key: 'returning', label: '🌸 Upcoming Next', emoji: '🌸' },
] as const;

function getPosterSrc(item: MediaItem): string | null {
  return getPosterUrl(item);
}

function SeasonCard({ item, index }: { item: MediaItem; index: number }) {
  const router = useRouter();
  const s = CS[item.cs];
  const ext = item as ExtendedMediaItem;
  const posterSrc = getPosterSrc(item);
  const formatLabel = ext._anilistUrl ? 'ANIME' : 'TV';

  return (
    <div
      className="neo-card"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/details/${item.id}`); }}
      onClick={() => router.push(`/details/${item.id}`)}
      style={{
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        animation: `card-in .5s ${index * 0.05}s both`,
        transition: 'transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'scale(1.03)';
        el.style.boxShadow = `0 8px 28px rgba(0,0,0,.5), 0 0 16px ${s.acc}15`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '';
      }}
    >
      {/* Poster */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', background: s.bg }}>
        {posterSrc ? (
          <Image src={posterSrc} alt={item.title} fill sizes="(max-width: 768px) 33vw, 20vw" loading="lazy" placeholder="blur" blurDataURL={getBlurPlaceholder(item.cs)} style={{ objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', opacity: .15 }}>{s.em}</div>
        )}
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 50%)', pointerEvents: 'none' }} />
        {/* Rating badge */}
        <div className="badge-r" style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>⭐ {item.r}</div>
        {/* Format badge */}
        <div className="f-cinzel" style={{
          position: 'absolute', top: 8, left: 8, zIndex: 2,
          padding: '2px 8px', borderRadius: 6, fontSize: '.55rem',
           color: s.acc, letterSpacing: '.04em',
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(4px)',
          border: `1px solid ${s.acc}40`,
        }}>{formatLabel}</div>
      </div>
      {/* Info */}
      <div style={{ padding: '10px 12px 12px' }}>
        <div className="f-cinzel" style={{
           fontWeight: 700, fontSize: '.8rem', color: '#FFF5E8',
          marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          textShadow: '0 1px 4px rgba(0,0,0,.5)',
        }}>{item.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {item.genre.slice(0, 2).map(g => (
            <span key={g} className="gtag" style={{ fontSize: '.5rem', padding: '1px 6px' }}>{g}</span>
          ))}
          {item.eps > 0 && (
            <span className="f-mono" style={{ fontSize: '.56rem', color: 'rgba(255,245,232,.3)', }}>
              {item.eps} eps
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="neo-card" style={{ borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ width: '100%', aspectRatio: '2/3', background: 'linear-gradient(110deg, #0C091A 30%, #1a1635 50%, #0C091A 70%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
      <div style={{ padding: '10px 12px' }}>
        <div style={{ height: 12, width: '70%', borderRadius: 4, background: 'rgba(255,255,255,.05)', marginBottom: 6 }} />
        <div style={{ height: 8, width: '40%', borderRadius: 4, background: 'rgba(255,255,255,.03)' }} />
      </div>
    </div>
  );
}

export default function SeasonalClient({ airingToday, trendingThisWeek, returningSeries }: SeasonalClientProps) {
  const [activeTab, setActiveTab] = useState<string>('airing');

  const getItems = () => {
    switch (activeTab) {
      case 'trending': return trendingThisWeek;
      case 'returning': return returningSeries;
      default: return airingToday;
    }
  };

  const items = getItems();
  const P = 'clamp(1rem,5vw,3rem)';

  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      <div style={{ padding: `2.2rem ${P} 0`, position: 'relative', zIndex: 3 }}>
        <h1 className="sec" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', marginBottom: 4 }}>🌸 Anime Seasonal Tracker</h1>
        <p className="f-crimson" style={{  color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>Powered by AniList — seasonal anime, trending, and upcoming</p>
      </div>

      <div style={{ padding: `0 ${P} 5.5rem`, position: 'relative', zIndex: 3 }}>
        {/* Tab selector */}
        <div style={{ display: 'flex', gap: 0, marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,.06)', overflowX: 'auto' }}>
          {TABS.map(tab => (
            <button className="f-cinzel"
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 24px', background: 'none', border: 'none', outline: 'none',
                color: activeTab === tab.key ? 'var(--gold)' : 'rgba(255,245,232,.35)',
                 fontSize: '.82rem', letterSpacing: '.06em',
                cursor: 'pointer', transition: 'color .22s', whiteSpace: 'nowrap',
                borderBottom: activeTab === tab.key ? '2px solid var(--gold)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="f-cinzel" style={{ fontSize: '.6rem', color: 'rgba(255,245,232,.25)',  letterSpacing: '.1em', marginBottom: '1.2rem' }}>
          {items.length} {items.length === 1 ? 'title' : 'titles'}
        </div>

        {/* Grid */}
        {items.length === 0 ? (
          <div className="neo-raised" style={{ padding: '3rem 2rem', borderRadius: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: .3 }}>🌸</div>
            <h3 className="f-cinzel" style={{  fontSize: '1rem', color: 'rgba(255,245,232,.5)', marginBottom: '.5rem' }}>No titles found</h3>
            <p className="f-crimson" style={{  color: 'rgba(255,245,232,.3)', fontSize: '.9rem' }}>
              Check back later for seasonal updates
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(clamp(140px,16vw,185px), 1fr))',
            gap: '1rem',
          }}>
            {items.map((item, i) => (
              <SeasonCard key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
