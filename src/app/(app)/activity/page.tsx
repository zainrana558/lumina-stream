'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import SupabaseNotConfigured from '@/components/common/SupabaseNotConfigured';
import ActivityFeed from '@/components/common/ActivityFeed';

export default function ActivityPage() {
  const { user, profile, authLoading, supabaseReady } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<'feed' | 'my'>('feed');

  useEffect(() => {
    // Default to 'my' tab if user doesn't follow anyone
    if (tab === 'feed' && profile) {
      fetch('/api/follows?profileId=' + profile.id)
        .then(r => r.json())
        .then(data => {
          if ((data.followingCount || 0) === 0) setTab('my');
        })
        .catch(() => {});
    }
  }, [tab, profile]);

  const P = 'clamp(1rem,5vw,3rem)';

  // Redirect to profile selection if logged in but no profile selected
  useEffect(() => {
    if (user && !profile && !authLoading) {
      router.replace('/profiles');
    }
  }, [user, profile, authLoading, router]);

  if (!supabaseReady) return <SupabaseNotConfigured />;

  if (!user) {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div style={{ fontSize: '3rem', opacity: .3 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,245,232,.2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Cinzel',serif", fontSize: '1.2rem', color: 'rgba(255,245,232,.6)', letterSpacing: '.08em' }}>Sign in to see activity</h2>
        <button className="btn-p" onClick={() => router.push('/login')}>Sign In</button>
      </div>
    );
  }

  // Wait for profile to load (redirect handled by useEffect above)
  if (!profile) return null;

  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      <div style={{ padding: `2.2rem ${P} 0`, position: 'relative', zIndex: 3 }}>
        <h1 className="sec" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', marginBottom: 4 }}>Activity Feed</h1>
        <p style={{ fontFamily: "'Crimson Pro',serif", color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>
          See what you and people you follow have been watching
        </p>
      </div>

      <div style={{ padding: `1.5rem ${P} 5.5rem`, position: 'relative', zIndex: 3 }}>
        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem' }}>
          {([
            { key: 'feed' as const, label: 'Following', icon: '👥' },
            { key: 'my' as const, label: 'My Activity', icon: '📋' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '9px 20px', borderRadius: 10,
                background: tab === t.key
                  ? 'linear-gradient(135deg,rgba(139,120,255,.2),rgba(255,107,138,.15))'
                  : 'rgba(255,255,255,.04)',
                border: `1px solid ${tab === t.key ? 'rgba(139,120,255,.3)' : 'rgba(255,255,255,.06)'}`,
                color: tab === t.key ? '#FFF5E8' : 'rgba(255,245,232,.4)',
                fontFamily: "'Cinzel',serif", fontSize: '.72rem', fontWeight: tab === t.key ? 700 : 400,
                cursor: 'pointer', transition: 'all .2s', letterSpacing: '.04em',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <ActivityFeed feedMode={tab === 'feed'} />
      </div>
    </div>
  );
}
