'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import Image from 'next/image';
import { getPosterUrl } from '@/lib/images';

interface StatsData {
  totalHours: number;
  totalTitles: number;
  monthlyData: Record<string, number>;
  streak: number;
  recentWatches: { title: string; poster_path: string | null; media_id: number; media_type: string; updated_at: string }[];
  avgRating: number;
  totalRatings: number;
  totalHistory: number;
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target * 10) / 10;
      setCount(current);
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
      <div style={{
        position: 'absolute', top: -10, right: -10,
        fontSize: '3.5rem', opacity: .06, pointerEvents: 'none',
      }}>{icon}</div>
      <div style={{ fontSize: '.72rem', color, fontFamily: "'Cinzel',serif", letterSpacing: '.08em', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span> {label}
      </div>
      <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: 'clamp(1.6rem,3vw,2.4rem)', color: '#FFF5E8', lineHeight: 1.2 }}>
        <AnimatedCounter target={value} suffix={suffix || ''} />
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { user, profile, authLoading } = useApp();
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      } catch {}
      setLoading(false);
    };
    fetchStats();
  }, []);

  const P = 'clamp(1rem,5vw,3rem)';

  // Redirect to profile selection if logged in but no profile selected
  useEffect(() => {
    if (user && !profile && !authLoading) {
      router.replace('/profiles');
    }
  }, [user, profile, authLoading, router]);

  if (!user) {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div style={{ fontSize: '3rem', opacity: .3 }}>📊</div>
        <h2 style={{ fontFamily: "'Cinzel',serif", fontSize: '1.2rem', color: 'rgba(255,245,232,.6)', letterSpacing: '.08em' }}>Sign in to view your stats</h2>
        <button className="btn-p" onClick={() => router.push('/login')}>Sign In</button>
      </div>
    );
  }

  // Wait for profile to load (redirect handled by useEffect above)
  if (!profile || loading) {
    return (
      <div style={{ textAlign: 'center', padding: '10rem 0', color: 'rgba(255,245,232,.3)', fontFamily: "'Cinzel',serif", letterSpacing: '.1em' }}>
        <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: '2rem', marginBottom: '1rem' }}>✦</div>
        <div>Loading your stats...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div style={{ padding: '2.2rem ' + P + ' 0', position: 'relative', zIndex: 3 }}>
          <h1 className="sec" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)' }}>📊 Viewing Stats</h1>
        </div>
        <div style={{ padding: '0 ' + P + ' 5.5rem', position: 'relative', zIndex: 3, textAlign: 'center', paddingTop: '4rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.2rem', opacity: .4 }}>📊</div>
          <h3 style={{ fontFamily: "'Cinzel',serif", fontSize: '1.1rem', color: 'rgba(255,245,232,.5)', marginBottom: '.5rem' }}>No viewing data yet</h3>
          <p style={{ fontFamily: "'Crimson Pro',serif", color: 'rgba(255,245,232,.3)', marginBottom: '1.5rem', fontSize: '.95rem' }}>Start watching to see your stats here</p>
          <button className="btn-p" onClick={() => router.push('/browse')}>Browse Shows</button>
        </div>
      </div>
    );
  }

  // Monthly bar chart
  const months = Object.entries(stats.monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);
  const maxMonthCount = Math.max(...months.map(([, c]) => c), 1);

  const recentList = stats.recentWatches.slice(0, 8);

  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      <div style={{ padding: `2.2rem ${P} 0`, position: 'relative', zIndex: 3 }}>
        <h1 className="sec" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', marginBottom: 4 }}>📊 Viewing Stats</h1>
        <p style={{ fontFamily: "'Crimson Pro',serif", color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>{profile.name}&apos;s streaming journey</p>
      </div>

      <div style={{ padding: `0 ${P} 5.5rem`, position: 'relative', zIndex: 3 }}>
        {/* Stat cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(clamp(160px,22vw,220px),1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <StatCard icon="⏱" label="Hours Watched" value={stats.totalHours} suffix="h" color="#FFB347" delay={0} />
          <StatCard icon="🎬" label="Titles Watched" value={stats.totalTitles} color="#8B78FF" delay={0.08} />
          <StatCard icon="🔥" label="Day Streak" value={stats.streak} suffix="d" color="#FF6B8A" delay={0.16} />
          <StatCard icon="📝" label="Total Views" value={stats.totalHistory} color="#4ECDC4" delay={0.24} />
        </div>

        {/* Average Rating */}
        {stats.totalRatings > 0 && (
          <div className="neo-card s1" style={{ padding: '1.3rem 1.5rem', borderRadius: 16, marginBottom: '2rem', animation: 'card-in .5s .32s both', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <div style={{ fontSize: '2rem' }}>⭐</div>
            <div>
              <div style={{ fontSize: '.72rem', color: '#FFB347', fontFamily: "'Cinzel',serif", letterSpacing: '.08em', marginBottom: 4 }}>Average Rating</div>
              <div style={{ fontFamily: "'Cinzel Decorative',serif", fontSize: '1.8rem', color: '#FFF5E8' }}>
                <AnimatedCounter target={stats.avgRating} /> / 5
                <span style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.3)', fontFamily: "'Crimson Pro',serif", marginLeft: 8 }}>
                  ({stats.totalRatings} {stats.totalRatings === 1 ? 'rating' : 'ratings'})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Activity Chart */}
        {months.length > 0 && (
          <div className="neo-card s1" style={{ padding: '1.5rem', borderRadius: 16, marginBottom: '2rem', animation: 'card-in .5s .4s both' }}>
            <h2 className="sec" style={{ fontSize: 'clamp(.9rem,1.4vw,1.05rem)', marginBottom: '1.2rem' }}>📅 Monthly Activity</h2>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(8px,1.5vw,16px)', height: 140, padding: '0 .5rem' }}>
              {months.map(([month, count], i) => {
                const height = Math.max((count / maxMonthCount) * 110, 4);
                const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' });
                return (
                  <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animation: `el .4s ${0.5 + i * 0.06}s both` }}>
                    <div style={{ fontSize: '.55rem', fontFamily: "'JetBrains Mono',monospace", color: '#FFB347' }}>{count}</div>
                    <div style={{
                      width: '100%', height, borderRadius: 6,
                      background: `linear-gradient(180deg, #FFB347 0%, #FF6B8A 100%)`,
                      boxShadow: '0 0 12px rgba(255,179,71,.2), 3px 3px 8px rgba(0,0,0,.5)',
                      transition: 'height .6s cubic-bezier(.34,1.56,.64,1)',
                      minWidth: 16,
                    }} />
                    <div style={{ fontSize: '.52rem', fontFamily: "'Cinzel',serif", color: 'rgba(255,245,232,.4)', letterSpacing: '.05em' }}>{monthLabel}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recently Watched */}
        {recentList.length > 0 && (
          <div style={{ animation: 'card-in .5s .5s both' }}>
            <h2 className="sec" style={{ fontSize: 'clamp(.9rem,1.4vw,1.05rem)', marginBottom: '1.2rem' }}>🎞 Recently Watched</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {recentList.map((item, i) => (
                <div key={`${item.media_type}-${item.media_id}`} className="neo-card" onClick={() => router.push(`/details/${item.media_id}`)} style={{
                  padding: '.75rem 1rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '.85rem',
                  cursor: 'pointer', animation: `el .3s ${i * 0.04}s both`, transition: 'all .2s',
                }}>
                  <div style={{
                    width: 40, height: 60, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
                    background: 'linear-gradient(135deg,#14052E,#2D1B5E)',
                    boxShadow: '3px 3px 8px rgba(0,0,0,.6)',
                  }}>
                    {item.poster_path ? (
                      <Image src={getPosterUrl({ poster_path: item.poster_path }, 'w92') || ''} alt={item.title} width={40} height={60} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', opacity: .3 }}>🎬</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.8rem', color: '#FFF5E8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: '.58rem', color: 'rgba(255,245,232,.3)', fontFamily: "'JetBrains Mono',monospace", marginTop: 3 }}>
                      {new Date(item.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <span className="gtag" style={{ fontSize: '.52rem', padding: '2px 8px', flexShrink: 0 }}>{item.media_type === 'movie' ? 'Movie' : 'Series'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
