'use client';

import { memo, useRef, useState, useCallback } from 'react';
import type { MediaItem, TMDBShow } from '@/types';
import { tmdbToMedia } from '@/types';
import MediaCard from './MediaCard';

const ContentRow = memo(function ContentRow({ title, sub, items: initialItems, endpoint, params }: {
  title: string; sub?: string; items: MediaItem[]; endpoint?: string; params?: Record<string, string>;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [allItems, setAllItems] = useState<MediaItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(!!endpoint);
  const pageRef = useRef(1);

  const scroll = useCallback((d: number) => rowRef.current?.scrollBy({ left: d * 300, behavior: 'smooth' }), []);

  const loadMore = useCallback(async () => {
    if (loading || !endpoint || !hasMore) return;
    setLoading(true);
    try {
      const next = pageRef.current + 1;
      if (next > 10) { setHasMore(false); setLoading(false); return; }
      const p = new URLSearchParams(params || {});
      p.set('page', String(next));
      const qs = p.toString() ? `&${p.toString()}` : '';
      const res = await fetch(`/api/tmdb?endpoint=${endpoint}${qs}`);
      const data = await res.json();
      if (data.results?.length > 0) {
        const fresh = data.results.filter((r: TMDBShow) => r.poster_path).map((r: TMDBShow) => tmdbToMedia(r));
        const ids = new Set(allItems.map(i => i.id));
        setAllItems(prev => [...prev, ...fresh.filter(i => !ids.has(i.id))]);
        pageRef.current = next;
      } else setHasMore(false);
    } catch { /* silent */ }
    setLoading(false);
  }, [loading, hasMore, endpoint, params, allItems]);

  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16, paddingInline: 'clamp(1rem,5vw,3rem)' }}>
        <div>
          {sub && <div style={{ fontSize: '8.5px', color: 'rgba(255,245,232,.3)', letterSpacing: '.2em', textTransform: 'uppercase', marginBottom: 5, fontFamily: "'Cinzel',serif" }}>{sub}</div>}
          <div className="sec" style={{ fontSize: 'clamp(1rem,2vw,1.25rem)' }}>{title}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-icon" onClick={() => scroll(-1)} style={{ width: 30, height: 30, fontSize: 12 }} aria-label="Scroll left">←</button>
          <button className="btn-icon" onClick={() => scroll(1)} style={{ width: 30, height: 30, fontSize: 12 }} aria-label="Scroll right">→</button>
        </div>
      </div>
      <div ref={rowRef} className="hide-scroll" style={{ display: 'flex', gap: 14, padding: '6px clamp(1rem,5vw,3rem)', overflowX: 'auto', overflowY: 'visible' }}>
        {allItems.map((item, i) => (
          <div key={item.id} style={{ flexShrink: 0, width: 'clamp(135px,18vw,200px)', animation: i < 15 ? `card-in .45s ${i * 0.04}s both` : 'none' }}>
            <MediaCard item={item} />
          </div>
        ))}
        {endpoint && hasMore && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 'clamp(100px,14vw,150px)', cursor: 'pointer' }}>
            <button onClick={loadMore} disabled={loading} style={{ width: '100%', height: 280, borderRadius: 14, border: '1px dashed rgba(255,179,71,.25)', background: 'rgba(255,179,71,.04)', color: loading ? 'rgba(255,179,71,.4)' : 'rgba(255,179,71,.7)', fontFamily: "'Cinzel',serif", fontSize: '.6rem', cursor: loading ? 'wait' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all .2s' }}>
              {loading ? <div style={{ animation: 'spin 1.5s linear infinite', fontSize: '1.2rem' }}>✦</div> : <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="6 9 12 15 18 9"/></svg><span>Show More</span></>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default ContentRow;
