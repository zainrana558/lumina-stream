'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import Image from 'next/image';
import { getPosterUrl } from '@/lib/images';

interface YearStats {
  totalHours: number;
  totalTitles: number;
  monthlyData: Record<string, number>;
  topShows: { title: string; poster_path: string | null; media_id: number; media_type: string; count: number; rating?: number }[];
  recentWatches: { title: string; poster_path: string | null; media_id: number; media_type: string; watched_at: string }[];
  streak: number;
  year: number;
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) { requestAnimationFrame(() => setCount(0)); return; }
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target * 10) / 10;
      setCount(current);
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [target]);

  return <span>{Number.isInteger(target) ? Math.round(count) : count}{suffix}</span>;
}

function ConfettiPiece({ delay }: { delay: number }) {
  const colors = ['#FFB347', '#FF6B8A', '#8B78FF', '#4ECDC4', '#FF9020', '#78D621'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100;
  const size = Math.random() * 6 + 4;
  const duration = Math.random() * 2 + 2;

  return (
    <div style={{
      position: 'fixed', top: -20, left: `${left}%`, zIndex: 99999,
      width: size, height: size, borderRadius: Math.random() > 0.5 ? '50%' : 1,
      background: color, opacity: 0,
      animation: `confetti-fall ${duration}s ${delay}s ease-in forwards`,
      pointerEvents: 'none',
    }} />
  );
}

export default function YearInReviewPage() {
  const { user, profile } = useApp();
  const router = useRouter();
  const [stats, setStats] = useState<YearStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.stats) {
          setStats({ ...data.stats, year });
        }
      } catch {}
      setLoading(false);
    };
    fetchStats();
    // Stop confetti after a few seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleShare = async () => {
    const shareText = `🎬 My ${year} on Lumina Stream!\n⏱ ${stats?.totalHours || 0} hours watched\n🎬 ${stats?.totalTitles || 0} titles\n🔥 Come join me!`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `My ${year} Lumina Year in Review`,
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard?.writeText(shareText);
        }
      }
    } else {
      await navigator.clipboard?.writeText(shareText);
      alert('Year in Review copied to clipboard!');
    }
  };

  const P = 'clamp(1rem,5vw,3rem)';

  if (!user || !profile) {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div style={{ fontSize: '3rem', opacity: .3 }}>🌟</div>
        <h2 className="f-cinzel" style={{  fontSize: '1.2rem', color: 'rgba(255,245,232,.6)', letterSpacing: '.08em' }}>Sign in to see your year in review</h2>
        <button className="btn-p" onClick={() => router.push('/login')}>Sign In</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="f-cinzel" style={{ textAlign: 'center', padding: '10rem 0', color: 'rgba(255,245,232,.3)',  letterSpacing: '.1em' }}>
        <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: '2rem', marginBottom: '1rem' }}>✦</div>
        <div>Compiling your {year}...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div style={{ padding: '2.2rem ' + P + ' 0', position: 'relative', zIndex: 3 }}>
          <h1 className="sec" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)' }}>🌟 Your {year} in Review</h1>
        </div>
        <div style={{ padding: '0 ' + P + ' 5.5rem', position: 'relative', zIndex: 3, textAlign: 'center', paddingTop: '4rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1.2rem', opacity: .4 }}>🌟</div>
          <h3 className="f-cinzel" style={{  fontSize: '1.1rem', color: 'rgba(255,245,232,.5)', marginBottom: '.5rem' }}>Not enough data for {year} yet</h3>
          <p className="f-crimson" style={{  color: 'rgba(255,245,232,.3)', marginBottom: '1.5rem', fontSize: '.95rem' }}>Start watching to build your year-in-review</p>
          <button className="btn-p" onClick={() => router.push('/browse')}>Browse Shows</button>
        </div>
      </div>
    );
  }

  // Genre pie chart (conic-gradient)
  const months = Object.entries(stats.monthlyData)
    .filter(([m]) => m.startsWith(String(year)))
    .sort(([a], [b]) => a.localeCompare(b));
  const maxMonth = Math.max(...months.map(([, c]) => c), 1);

  // All 12 months for bar chart
  const allMonths: { label: string; count: number }[] = [];
  for (let m = 0; m < 12; m++) {
    const key = `${year}-${String(m + 1).padStart(2, '0')}`;
    const label = new Date(year, m).toLocaleDateString('en-US', { month: 'short' });
    allMonths.push({ label, count: stats.monthlyData[key] || 0 });
  }

  // Simple genre distribution for pie (derived from monthly data counts)
  const totalMonthViews = allMonths.reduce((s, m) => s + m.count, 0);
  const genreSegments = [
    { name: 'Anime', pct: totalMonthViews > 0 ? Math.round((allMonths[0].count + allMonths[1].count) / totalMonthViews * 100) : 33, color: '#FF0096' },
    { name: 'Drama', pct: totalMonthViews > 0 ? Math.round((allMonths[2].count + allMonths[3].count) / totalMonthViews * 100) : 25, color: '#8B78FF' },
    { name: 'Action', pct: totalMonthViews > 0 ? Math.round((allMonths[4].count + allMonths[5].count) / totalMonthViews * 100) : 20, color: '#FFB347' },
    { name: 'Comedy', pct: totalMonthViews > 0 ? Math.round((allMonths[6].count + allMonths[7].count) / totalMonthViews * 100) : 12, color: '#4ECDC4' },
    { name: 'Other', pct: totalMonthViews > 0 ? Math.max(100 - Math.round((allMonths.slice(0, 8).reduce((s, m) => s + m.count, 0)) / totalMonthViews * 100), 10) : 10, color: '#FF6B8A' },
  ];

  // Build conic-gradient
  let cumulative = 0;
  const conicStops = genreSegments.map(g => {
    const start = cumulative;
    cumulative += g.pct;
    return `${g.color} ${start}% ${cumulative}%`;
  }).join(', ');

  const topShows = stats.topShows.slice(0, 5);

  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      {/* Confetti */}
      {showConfetti && (
        <>
          {Array.from({ length: 50 }, (_, i) => (
            <ConfettiPiece key={i} delay={Math.random() * 2} />
          ))}
        </>
      )}

      {/* Confetti CSS animation */}
      {showConfetti && (
        <style>{`
          @keyframes confetti-fall {
            0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}</style>
      )}

      {/* Hero Section */}
      <section style={{
        textAlign: 'center', padding: '3rem ' + P + ' 2.5rem',
        position: 'relative', zIndex: 3,
      }}>
        <div className="s1 f-cinzel" style={{
          fontSize: '.65rem', 
          letterSpacing: '.2em', color: '#FFB347', marginBottom: '.6rem',
        }}>YEAR IN REVIEW</div>
        <h1 className="h1 s2" style={{
          fontSize: 'clamp(2rem,5vw,3.5rem)',
          background: 'linear-gradient(135deg, #FFB347, #FF6B8A, #8B78FF)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          marginBottom: '.4rem',
        }}>Your {year} at a Glance</h1>
        <p className="s3 f-crimson" style={{  color: 'rgba(255,245,232,.4)', fontSize: '1.05rem' }}>
          A look back at {profile.name}&apos;s streaming journey
        </p>
      </section>

      <div style={{ padding: `0 ${P} 5.5rem`, position: 'relative', zIndex: 3 }}>
        {/* Big stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(clamp(180px,24vw,260px),1fr))', gap: '1.2rem', marginBottom: '3rem' }}>
          <div className="neo-raised s1" style={{
            padding: '2rem 1.5rem', borderRadius: 20, textAlign: 'center',
            animation: `card-in .5s .2s both`,
            border: '1px solid rgba(255,179,71,.15)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>⏱</div>
            <div className="f-cinzel-dec" style={{  fontSize: 'clamp(2rem,4vw,3.2rem)', color: '#FFB347' }}>
              <AnimatedCounter target={stats.totalHours} suffix="h" />
            </div>
            <div className="f-cinzel" style={{ fontSize: '.7rem',  color: 'rgba(255,245,232,.4)', letterSpacing: '.08em', marginTop: '.3rem' }}>Hours Watched</div>
          </div>

          <div className="neo-raised s1" style={{
            padding: '2rem 1.5rem', borderRadius: 20, textAlign: 'center',
            animation: `card-in .5s .3s both`,
            border: '1px solid rgba(139,120,255,.15)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🎬</div>
            <div className="f-cinzel-dec" style={{  fontSize: 'clamp(2rem,4vw,3.2rem)', color: '#8B78FF' }}>
              <AnimatedCounter target={stats.totalTitles} />
            </div>
            <div className="f-cinzel" style={{ fontSize: '.7rem',  color: 'rgba(255,245,232,.4)', letterSpacing: '.08em', marginTop: '.3rem' }}>Titles Watched</div>
          </div>

          <div className="neo-raised s1" style={{
            padding: '2rem 1.5rem', borderRadius: 20, textAlign: 'center',
            animation: `card-in .5s .4s both`,
            border: '1px solid rgba(255,107,138,.15)',
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🔥</div>
            <div className="f-cinzel-dec" style={{  fontSize: 'clamp(2rem,4vw,3.2rem)', color: '#FF6B8A' }}>
              <AnimatedCounter target={stats.streak} suffix="d" />
            </div>
            <div className="f-cinzel" style={{ fontSize: '.7rem',  color: 'rgba(255,245,232,.4)', letterSpacing: '.08em', marginTop: '.3rem' }}>Best Streak</div>
          </div>
        </div>

        {/* Genre Distribution Pie */}
        <div className="neo-card s1" style={{ padding: '2rem', borderRadius: 20, marginBottom: '2.5rem', animation: 'card-in .5s .5s both' }}>
          <h2 className="sec" style={{ fontSize: 'clamp(.9rem,1.4vw,1.1rem)', marginBottom: '1.5rem', textAlign: 'center' }}>🎵 Most Watched Genres</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
            {/* Pie chart */}
            <div style={{
              width: 160, height: 160, borderRadius: '50%', flexShrink: 0,
              background: totalMonthViews > 0
                ? `conic-gradient(${conicStops})`
                : 'conic-gradient(#8B78FF 0% 33%, #FFB347 33% 58%, #FF6B8A 58% 78%, #4ECDC4 78% 90%, #78D621 90% 100%)',
              boxShadow: '4px 4px 16px rgba(0,0,0,.6), inset 0 0 30px rgba(0,0,0,.2)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', inset: 30, borderRadius: '50%',
                background: '#110E24',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,.4)',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div className="f-cinzel-dec" style={{  fontSize: '1.2rem', color: '#FFF5E8' }}>
                    {stats.totalTitles}
                  </div>
                  <div className="f-cinzel" style={{ fontSize: '.5rem',  color: 'rgba(255,245,232,.35)', letterSpacing: '.08em' }}>TITLES</div>
                </div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
              {genreSegments.map(g => (
                <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: g.color, flexShrink: 0 }} />
                  <span className="f-crimson" style={{ fontSize: '.72rem',  color: 'rgba(255,245,232,.6)' }}>{g.name}</span>
                  <span className="f-mono" style={{ fontSize: '.65rem',  color: 'rgba(255,245,232,.35)', marginLeft: 'auto' }}>{g.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top 5 Shows */}
        {topShows.length > 0 && (
          <div className="neo-card s1" style={{ padding: '2rem', borderRadius: 20, marginBottom: '2.5rem', animation: 'card-in .5s .6s both' }}>
            <h2 className="sec" style={{ fontSize: 'clamp(.9rem,1.4vw,1.1rem)', marginBottom: '1.5rem', textAlign: 'center' }}>🏆 Top 5 Shows You Loved</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
              {topShows.map((show, i) => (
                <div key={`${show.media_type}-${show.media_id}`} className="neo-raised" onClick={() => router.push(`/details/${show.media_id}`)} style={{
                  padding: '.85rem 1rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '1rem',
                  cursor: 'pointer', animation: `el .4s ${0.7 + i * 0.08}s both`, transition: 'all .2s',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: i < 3 ? 'linear-gradient(135deg,#FFB347,#FF6B8A)' : 'linear-gradient(135deg,#211D3A,#19162E)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                     fontSize: '.85rem',
                    color: i < 3 ? '#05020A' : '#FFF5E8',
                    boxShadow: i < 3 ? '0 0 12px rgba(255,179,71,.3)' : '3px 3px 8px rgba(0,0,0,.5)',
                  }}>
                    {i + 1}
                  </div>
                  <div style={{
                    width: 40, height: 60, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
                    background: 'linear-gradient(135deg,#14052E,#2D1B5E)',
                  }}>
                    {show.poster_path ? (
                      <Image src={getPosterUrl({ poster_path: show.poster_path }, 'w92') || ''} alt={show.title} width={40} height={60} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem', opacity: .3 }}>🎬</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="f-cinzel" style={{  fontSize: '.82rem', color: '#FFF5E8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{show.title}</div>
                    <div className="f-mono" style={{ fontSize: '.58rem', color: 'rgba(255,245,232,.35)',  marginTop: 3 }}>
                      {show.count} {show.count === 1 ? 'view' : 'views'}
                    </div>
                  </div>
                  {show.rating && (
                    <div className="badge-r" style={{ fontSize: '.55rem' }}>⭐ {show.rating}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Activity */}
        <div className="neo-card s1" style={{ padding: '2rem', borderRadius: 20, marginBottom: '2.5rem', animation: 'card-in .5s .7s both' }}>
          <h2 className="sec" style={{ fontSize: 'clamp(.9rem,1.4vw,1.1rem)', marginBottom: '1.5rem', textAlign: 'center' }}>📅 {year} Activity</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(4px,1vw,10px)', height: 140, padding: '0 .25rem' }}>
            {allMonths.map((m, i) => {
              const height = Math.max((m.count / Math.max(maxMonth, 1)) * 110, m.count > 0 ? 6 : 2);
              return (
                <div key={m.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, animation: `el .3s ${0.8 + i * 0.04}s both` }}>
                  {m.count > 0 && (
                    <div className="f-mono" style={{ fontSize: '.48rem',  color: '#FFB347' }}>{m.count}</div>
                  )}
                  <div style={{
                    width: '100%', height, borderRadius: 4,
                    background: m.count > 0
                      ? `linear-gradient(180deg, #8B78FF 0%, #FF6B8A 100%)`
                      : 'rgba(255,255,255,.05)',
                    boxShadow: m.count > 0 ? '0 0 8px rgba(139,120,255,.2)' : 'none',
                    minWidth: 8,
                  }} />
                  <div className="f-cinzel" style={{ fontSize: '.42rem',  color: 'rgba(255,245,232,.3)', letterSpacing: '.04em' }}>{m.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Share Button */}
        <div style={{ textAlign: 'center', animation: 'card-in .5s .9s both' }}>
          <button className="btn-p" onClick={handleShare} style={{ fontSize: '.85rem', padding: '.85rem 2rem', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span>📤</span> Share Your {year}
          </button>
          <p className="f-crimson" style={{  color: 'rgba(255,245,232,.25)', fontSize: '.82rem', marginTop: '.8rem', fontStyle: 'italic' }}>
            Share your streaming year with friends
          </p>
        </div>
      </div>
    </div>
  );
}
