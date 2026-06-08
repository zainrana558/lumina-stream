'use client';

import { memo, useRef, useCallback, useState } from 'react';
import type { MediaItem, TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import Card from './Card';

interface ContentRowProps {
  title: string;
  sub?: string;
  items: MediaItem[];
  onSelect?: (show: MediaItem) => void;
  ranked?: boolean;
  cardRing?: string;
  /** TMDB endpoint for loading more (e.g. '/trending/all/week') */
  loadMoreEndpoint?: string;
  /** Extra query params appended to the endpoint */
  loadMoreParams?: Record<string, string>;
}

const ContentRow = memo(function ContentRow({ title, sub, items, onSelect, ranked, cardRing = '', loadMoreEndpoint, loadMoreParams }: ContentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [allItems, setAllItems] = useState(items);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(!!loadMoreEndpoint);
  const pageRef = useRef(1);

  // Sync parent items changes
  const prevItemsRef = useRef(items);
  if (items !== prevItemsRef.current) {
    prevItemsRef.current = items;
    setAllItems(items);
    pageRef.current = 1;
    setHasMore(!!loadMoreEndpoint);
  }

  const scroll = useCallback((d: number) => rowRef.current?.scrollBy({ left: d * 300, behavior: 'smooth' }), []);

  const handleShowMore = useCallback(async () => {
    if (loadingMore || !loadMoreEndpoint || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      if (nextPage > 10) { setHasMore(false); setLoadingMore(false); return; }
      const params = new URLSearchParams(loadMoreParams || {});
      params.set('page', String(nextPage));
      const qs = params.toString() ? `&${params.toString()}` : '';
      const res = await fetch(`/api/tmdb?endpoint=${loadMoreEndpoint}${qs}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const newItems = (data.results as TMDBShow[])
          .filter((r: TMDBShow) => r.poster_path)
          .map((r: TMDBShow) => tmdbToMedia(r));
        const existingIds = new Set(allItems.map(i => i.id));
        const fresh = newItems.filter(i => !existingIds.has(i.id));
        setAllItems(prev => [...prev, ...fresh]);
        pageRef.current = nextPage;
      } else {
        setHasMore(false);
      }
    } catch { /* silent */ }
    setLoadingMore(false);
  }, [loadingMore, hasMore, loadMoreEndpoint, loadMoreParams, allItems]);

  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, paddingInline: 'clamp(1rem,5vw,3rem)' }}>
        <div>
          {sub && <div style={{ fontSize: '8.5px', color: 'rgba(255,245,232,.3)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 5, fontFamily: "'Cinzel',serif" }}>{sub}</div>}
          <div className="sec" style={{ fontSize: 'clamp(1rem,2vw,1.25rem)' }}>{title}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {([['←', -1], ['→', 1]] as const).map(([a, d]) => (
            <button key={a} className="btn-icon" onClick={() => scroll(d)} style={{ width: 30, height: 30, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a}</button>
          ))}
        </div>
      </div>
      <div ref={rowRef} className="hide-scroll" style={{ display: 'flex', gap: 14, padding: '6px clamp(1rem,5vw,3rem)', overflowX: 'auto', overflowY: 'visible' }}>
        {allItems.map((s, i) => (
          <div key={s.id} style={{ flexShrink: 0, width: 'clamp(135px,30vw,215px)', animation: i < 20 ? `card-in .45s ${i * 0.045}s both` : 'none' }}>
            <Card show={s} onClick={onSelect} rank={ranked ? i + 1 : undefined} ring={cardRing} />
          </div>
        ))}
        {/* Show More button at end of row */}
        {loadMoreEndpoint && hasMore && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'clamp(100px,15vw,150px)', cursor: 'pointer' }}>
            <button
              onClick={handleShowMore}
              disabled={loadingMore}
              style={{
                width: '100%', height: 'clamp(140px,18vw,215px)',
                borderRadius: 12, border: `1px dashed rgba(255,179,71,.25)`,
                background: 'rgba(255,179,71,.04)',
                color: loadingMore ? 'rgba(255,179,71,.4)' : 'rgba(255,179,71,.7)',
                fontFamily: "'Cinzel',serif", fontSize: '.6rem',
                letterSpacing: '.06em', cursor: loadingMore ? 'wait' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 6, transition: 'all .2s',
                boxShadow: 'none',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,179,71,.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,179,71,.04)'; }}
            >
              {loadingMore ? (
                <div style={{ animation: 'spin 1.5s linear infinite', fontSize: '1.2rem' }}>✦</div>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                  <span>Show More</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default ContentRow;
