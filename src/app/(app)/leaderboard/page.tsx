'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import Image from 'next/image';
import { getPosterUrl } from '@/lib/images';

interface LeaderboardEntry {
  media_id: number;
  media_type: string;
  avg_rating: number;
  rating_count: number;
}

interface TMDBBasic {
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const duration = 1000;
    const startTime = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target * 10) / 10);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target]);
  return <span>{Number.isInteger(target) ? Math.round(count) : count}{suffix}</span>;
}

function StatCard({ icon, label, value, suffix, color, delay }: {
  icon: string; label: string; value: number; suffix?: string; color: string; delay: number;
}) {
  return (
    <div className="neo-card s1" style={{
      padding: '1.3rem 1.5rem', borderRadius: 16,
      animation: `card-in .5s ${delay}s both`,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -10, right: -10, fontSize: '3.5rem', opacity: .06, pointerEvents: 'none' }}>{icon}</div>
      <div className="f-cinzel" style={{ fontSize: '.72rem', color,  letterSpacing: '.08em', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span> {label}
      </div>
      <div className="f-cinzel-dec" style={{  fontSize: 'clamp(1.6rem,3vw,2.4rem)', color: '#FFF5E8', lineHeight: 1.2 }}>
        <AnimatedCounter target={value} suffix={suffix || ''} />
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useApp();
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [tmdbCache, setTmdbCache] = useState<Record<string, TMDBBasic>>({});
  const [loading, setLoading] = useState(true);
  const [totalRatings, setTotalRatings] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/leaderboard');
        const data = await res.json();
        if (data.entries) {
          setEntries(data.entries);
          setTotalRatings(data.totalRatings || 0);

          // Fetch TMDB details for top entries
          const fetchPromises = data.entries.slice(0, 20).map(async (entry: LeaderboardEntry) => {
            try {
              const tmdbRes = await fetch(`/api/tmdb?endpoint=/${entry.media_type}/${entry.media_id}`);
              const tmdbData = await tmdbRes.json();
              return {
                key: `${entry.media_type}-${entry.media_id}`,
                data: {
                  title: tmdbData.title || tmdbData.name || 'Unknown',
                  poster_path: tmdbData.poster_path || null,
                  vote_average: tmdbData.vote_average || 0,
                },
              };
            } catch {
              return null;
            }
          });

          const results = await Promise.allSettled(fetchPromises);
          const cache: Record<string, TMDBBasic> = {};
          results.forEach(r => {
            if (r.status === 'fulfilled' && r.value) {
              cache[r.value.key] = r.value.data;
            }
          });
          setTmdbCache(cache);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const P = 'clamp(1rem,5vw,3rem)';

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { color: '#FFD700', bg: 'rgba(255,215,0,.12)', border: 'rgba(255,215,0,.3)' };
    if (rank === 2) return { color: '#C0C0C0', bg: 'rgba(192,192,192,.1)', border: 'rgba(192,192,192,.25)' };
    if (rank === 3) return { color: '#CD7F32', bg: 'rgba(205,127,50,.1)', border: 'rgba(205,127,50,.25)' };
    return { color: 'rgba(255,245,232,.5)', bg: 'rgba(255,255,255,.03)', border: 'rgba(255,255,255,.08)' };
  };

  if (loading) {
    return (
      <div className="f-cinzel" style={{ textAlign: 'center', padding: '10rem 0', color: 'rgba(255,245,232,.3)',  letterSpacing: '.1em' }}>
        <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: '2rem', marginBottom: '1rem' }}>✦</div>
        <div>Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      <div style={{ padding: `2.2rem ${P} 0`, position: 'relative', zIndex: 3 }}>
        <h1 className="sec" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', marginBottom: 4 }}>🏆 Community Leaderboard</h1>
        <p className="f-crimson" style={{  color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>Top rated by Lumina viewers</p>
      </div>

      <div style={{ padding: `0 ${P} 5.5rem`, position: 'relative', zIndex: 3 }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(clamp(140px,22vw,200px),1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <StatCard icon="📝" label="Total Ratings" value={totalRatings} color="#FFB347" delay={0} />
          <StatCard icon="🎬" label="Rated Titles" value={entries.length} color="#8B78FF" delay={0.08} />
          {entries.length > 0 && (
            <StatCard icon="⭐" label="Highest Rated" value={entries[0].avg_rating} suffix="/10" color="#4ECDC4" delay={0.16} />
          )}
        </div>

        {entries.length === 0 ? (
          <div className="neo-raised" style={{ padding: '3rem 2rem', borderRadius: 16, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: .3 }}>🏆</div>
            <h3 className="f-cinzel" style={{  fontSize: '1.1rem', color: 'rgba(255,245,232,.5)', marginBottom: '.5rem' }}>No ratings yet</h3>
            <p className="f-crimson" style={{  color: 'rgba(255,245,232,.3)', marginBottom: '1.5rem', fontSize: '.95rem' }}>
              Be the first to rate shows and build the community leaderboard!
            </p>
            <button className="btn-p" onClick={() => router.push('/browse')}>Browse Shows</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {entries.map((entry, i) => {
              const rank = i + 1;
              const rs = getRankStyle(rank);
              const cacheKey = `${entry.media_type}-${entry.media_id}`;
              const tmdb = tmdbCache[cacheKey];
              const title = tmdb?.title || tmdb?.name || `Title #${entry.media_id}`;

              return (
                <div
                  key={cacheKey}
                  className="neo-card"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/details/${entry.media_id}`); }}
                  onClick={() => router.push(`/details/${entry.media_id}`)}
                  style={{
                    padding: '.85rem 1rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '1rem',
                    cursor: 'pointer', animation: `el .4s ${i * 0.04}s both`, transition: 'all .2s',
                    border: rank <= 3 ? `1px solid ${rs.border}` : 'none',
                  }}
                >
                  {/* Rank */}
                  <div className="f-cinzel-dec" style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                     fontWeight: 900,
                    fontSize: rank <= 3 ? '1.1rem' : '.82rem',
                    background: rs.bg, color: rs.color,
                    boxShadow: rank <= 3 ? `0 0 12px ${rs.color}30` : 'none',
                  }}>
                    {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
                  </div>

                  {/* Poster */}
                  <div style={{
                    width: 40, height: 60, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
                    background: 'linear-gradient(135deg,#14052E,#2D1B5E)',
                    boxShadow: '3px 3px 8px rgba(0,0,0,.6)',
                  }}>
                    {tmdb?.poster_path ? (
                      <Image src={getPosterUrl({ poster_path: tmdb.poster_path }, 'w92') || ''} alt={title} width={40} height={60} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', opacity: .3 }}>🎬</div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="f-cinzel" style={{  fontSize: '.82rem', color: '#FFF5E8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                      {title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="gtag" style={{ fontSize: '.52rem', padding: '2px 8px' }}>
                        {entry.media_type === 'movie' ? 'Movie' : 'Series'}
                      </span>
                      <span className="f-mono" style={{ fontSize: '.56rem', color: 'rgba(255,245,232,.3)', }}>
                        {entry.rating_count} {entry.rating_count === 1 ? 'rating' : 'ratings'}
                      </span>
                    </div>
                  </div>

                  {/* Average rating */}
                  <div className="f-cinzel" style={{
                    padding: '6px 14px', borderRadius: 20,
                    background: entry.avg_rating >= 8 ? 'rgba(78,205,196,.12)' : entry.avg_rating >= 6 ? 'rgba(255,179,71,.12)' : 'rgba(255,107,138,.12)',
                     fontSize: '.78rem', fontWeight: 700,
                    color: entry.avg_rating >= 8 ? '#4ECDC4' : entry.avg_rating >= 6 ? '#FFB347' : '#FF6B8A',
                    boxShadow: '3px 3px 8px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22),inset 0 1px 0 rgba(255,255,255,.05)',
                    flexShrink: 0,
                  }}>
                    ⭐ {entry.avg_rating}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
