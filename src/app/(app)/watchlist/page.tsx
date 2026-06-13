'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { MediaItem } from '@/types';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/components/common/ToastProvider';
import SupabaseNotConfigured from '@/components/common/SupabaseNotConfigured';
import Image from 'next/image';
import { getPosterUrl } from '@/lib/images';

interface WatchlistItem {
  id: string;
  profile_id: string;
  media_id: number;
  media_type: string;
  title: string;
  poster_path: string | null;
  status: string;
  added_at: string;
}

interface ReminderItem {
  id?: string;
  mediaId: number;
  mediaType: string;
  title: string;
  releaseDate?: string;
  poster_path?: string | null;
  addedAt: number;
}

const STATUS_CYCLE = ['plan_to_watch', 'watching', 'completed'] as const;
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  plan_to_watch: { label: 'Plan to Watch', color: '#8B78FF' },
  watching: { label: 'Watching', color: '#FFB347' },
  completed: { label: 'Completed', color: '#4ECDC4' },
};

export default function WatchlistPage() {
  const { user, profile, authLoading, supabaseReady } = useApp();
  const { addToast } = useToast();
  const router = useRouter();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'reminders'>('watchlist');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/watchlist');
      const data = await res.json();
      setItems(data.items || []);
    } catch { setItems([]); }
    setLoading(false);
  };

  const fetchReminders = useCallback(async () => {
    setRemindersLoading(true);
    try {
      // Try Supabase API first
      if (profile) {
        const res = await fetch('/api/reminders');
        if (res.ok) {
          const data = await res.json();
          setReminders(data.reminders || []);
          setRemindersLoading(false);
          return;
        }
      }
      // Fallback to localStorage
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('lumina_reminders');
        if (stored) {
          setReminders(JSON.parse(stored));
        }
      }
    } catch {}
    setRemindersLoading(false);
  }, [profile]);

  useEffect(() => { queueMicrotask(fetchWatchlist); queueMicrotask(fetchReminders); }, [fetchReminders]);

  const handleRemove = async (item: WatchlistItem) => {
    try {
      await fetch('/api/watchlist', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: item.profile_id, mediaId: item.media_id, mediaType: item.media_type }),
      });
      setItems(prev => prev.filter(i => i.id !== item.id));
    } catch {}
  };

  const handleStatusCycle = async (item: WatchlistItem) => {
    const currentIdx = STATUS_CYCLE.indexOf(item.status as any);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];
    try {
      await fetch('/api/watchlist', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: item.profile_id, mediaId: item.media_id, mediaType: item.media_type, status: nextStatus }),
      });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: nextStatus } : i));
    } catch {}
  };

  // Share watchlist
  const handleShare = async () => {
    const shareData = {
      title: `${profile?.name || 'My'} Lumina Watchlist`,
      text: `Check out my watchlist on Lumina Stream! I have ${items.length} ${items.length === 1 ? 'title' : 'titles'} saved.`,
      url: typeof window !== 'undefined' ? window.location.href : '',
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled share - do nothing
        if ((err as Error).name !== 'AbortError') {
          fallbackCopy(shareData.text + ' ' + shareData.url);
        }
      }
    } else {
      fallbackCopy(shareData.text + ' ' + shareData.url);
    }
  };

  const fallbackCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('success', 'Watchlist link copied to clipboard!');
    } catch {
      // Fallback: select a temporary text area
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      addToast('success', 'Watchlist link copied to clipboard!');
    }
  };

  // Remove a reminder
  const removeReminder = async (reminder: ReminderItem) => {
    try {
      // Try Supabase removal
      if (profile) {
        await fetch('/api/reminders', {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaId: reminder.mediaId, mediaType: reminder.mediaType }),
        });
      }
      // Also clear localStorage
      if (typeof window !== 'undefined') {
        const key = `remind_${reminder.mediaType}_${reminder.mediaId}`;
        localStorage.removeItem(key);
        const stored: ReminderItem[] = JSON.parse(localStorage.getItem('lumina_reminders') || '[]');
        localStorage.setItem('lumina_reminders', JSON.stringify(
          stored.filter(r => !(r.mediaId === reminder.mediaId && r.mediaType === reminder.mediaType))
        ));
      }
      setReminders(prev => prev.filter(r => !(r.mediaId === reminder.mediaId && r.mediaType === reminder.mediaType)));
      addToast('info', `Removed reminder for "${reminder.title}"`);
    } catch {}
  };

  const getDaysUntil = (releaseDate?: string): number | null => {
    if (!releaseDate) return null;
    const target = new Date(releaseDate);
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

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
        <div style={{ fontSize: '3rem', opacity: .3 }}>🔒</div>
        <h2 className="f-cinzel" style={{  fontSize: '1.2rem', color: 'rgba(255,245,232,.6)', letterSpacing: '.08em' }}>Sign in to view your watchlist</h2>
        <button className="btn-p" onClick={() => router.push('/login')}>Sign In</button>
      </div>
    );
  }

  // Wait for profile to load (redirect handled by useEffect above)
  if (!profile) return null;

  return (
    <div className="page" style={{ minHeight: '100vh', paddingTop: 'clamp(60px,7vw,80px)' }}>
      <div style={{ padding: `2.2rem ${P} 0`, position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h1 className="sec" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', marginBottom: 4 }}>📋 My Watchlist</h1>
            <p className="f-crimson" style={{  color: 'rgba(255,245,232,.4)', fontStyle: 'italic' }}>{items.length} {items.length === 1 ? 'title' : 'titles'} saved</p>
          </div>
          <button className="btn-g" onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem' }}>
            <span>📤</span> Share Watchlist
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem' }}>
          <button
            className={`tab-btn${activeTab === 'watchlist' ? ' on' : ''}`}
            onClick={() => setActiveTab('watchlist')}
          >
            📋 Watchlist
          </button>
          <button
            className={`tab-btn${activeTab === 'reminders' ? ' on' : ''}`}
            onClick={() => setActiveTab('reminders')}
          >
            🔔 Reminders {reminders.length > 0 && `(${reminders.length})`}
          </button>
        </div>
      </div>

      <div style={{ padding: `0 ${P} 5.5rem`, position: 'relative', zIndex: 3 }}>
        {/* Watchlist Tab */}
        {activeTab === 'watchlist' && (
          loading ? (
            <div className="f-cinzel" style={{ textAlign: 'center', padding: '5rem 0', color: 'rgba(255,245,232,.3)',  letterSpacing: '.1em' }}>
              <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: '2rem', marginBottom: '1rem' }}>✦</div>
              <div>Loading watchlist...</div>
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1.2rem', opacity: .4 }}>🌙</div>
              <h3 className="f-cinzel" style={{  fontSize: '1.1rem', color: 'rgba(255,245,232,.5)', marginBottom: '.5rem' }}>Your watchlist is empty</h3>
              <p className="f-crimson" style={{  color: 'rgba(255,245,232,.3)', marginBottom: '1.5rem', fontSize: '.95rem' }}>Start adding shows you want to watch later</p>
              <button className="btn-p" onClick={() => router.push('/browse')}>Browse Shows</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
              {items.map((item, i) => {
                const st = STATUS_LABELS[item.status] || STATUS_LABELS.plan_to_watch;
                return (
                  <div key={item.id} className="neo-card" onClick={() => router.push(`/details/${item.media_id}`)} style={{
                    padding: '.85rem 1.1rem', borderRadius: 14, display: 'flex', alignItems: 'center', gap: '1rem',
                    cursor: 'pointer', animation: `el .4s ease ${i * 0.04}s both`,
                    transition: 'all .25s',
                  }}>
                    <div style={{
                      width: 48, height: 72, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                      background: 'linear-gradient(135deg,#14052E,#2D1B5E)',
                      boxShadow: '3px 3px 8px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.2)',
                    }}>
                      {item.poster_path ? (
                        <Image src={getPosterUrl({ poster_path: item.poster_path }, 'w185') || ''} alt={item.title} width={48} height={72} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', opacity: .4 }}>🎬</div>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="f-cinzel" style={{  fontSize: '.85rem', color: '#FFF5E8', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                        <span className="gtag" style={{ fontSize: '.58rem', padding: '3px 8px' }}>{item.media_type === 'movie' ? 'Movie' : 'Series'}</span>
                        <button className="f-cinzel"
                          onClick={(e) => { e.stopPropagation(); handleStatusCycle(item); }}
                          style={{ fontSize: '.58rem', padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',  fontWeight: 600, letterSpacing: '.05em', background: `${st.color}18`, color: st.color, boxShadow: `0 0 0 1px ${st.color}40`, transition: 'all .2s' }}
                        >{st.label}</button>
                      </div>
                      <div className="f-mono" style={{ fontSize: '.62rem', color: 'rgba(255,245,232,.25)',  marginTop: 4 }}>
                        Added {new Date(item.added_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>

                    <button onClick={(e) => { e.stopPropagation(); handleRemove(item); }} className="btn-icon remove-btn" style={{ width: 32, height: 32, fontSize: '.7rem', flexShrink: 0 }}>✕</button>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* Reminders Tab */}
        {activeTab === 'reminders' && (
          remindersLoading ? (
            <div className="f-cinzel" style={{ textAlign: 'center', padding: '5rem 0', color: 'rgba(255,245,232,.3)',  letterSpacing: '.1em' }}>
              <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: '2rem', marginBottom: '1rem' }}>✦</div>
              <div>Loading reminders...</div>
            </div>
          ) : reminders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '5rem 0' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1.2rem', opacity: .4 }}>🔔</div>
              <h3 className="f-cinzel" style={{  fontSize: '1.1rem', color: 'rgba(255,245,232,.5)', marginBottom: '.5rem' }}>No reminders set</h3>
              <p className="f-crimson" style={{  color: 'rgba(255,245,232,.3)', marginBottom: '1.5rem', fontSize: '.95rem' }}>Click the bell icon on any title to get a reminder</p>
              <button className="btn-p" onClick={() => router.push('/browse')}>Browse Shows</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
              {reminders.map((reminder, i) => {
                const daysLeft = getDaysUntil(reminder.releaseDate);
                const isAvailable = daysLeft !== null && daysLeft <= 0;

                return (
                  <div key={`${reminder.mediaType}-${reminder.mediaId}`} className="neo-card" onClick={() => isAvailable ? router.push(`/details/${reminder.mediaId}`) : undefined} style={{
                    padding: '.85rem 1.1rem', borderRadius: 14, display: 'flex', alignItems: 'center', gap: '1rem',
                    cursor: isAvailable ? 'pointer' : 'default', animation: `el .4s ease ${i * 0.04}s both`,
                    transition: 'all .25s', border: isAvailable ? '1px solid rgba(78,214,196,.3)' : undefined,
                  }}>
                    <div style={{
                      width: 48, height: 72, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                      background: isAvailable ? 'linear-gradient(135deg,#0B2922,#1A6050)' : 'linear-gradient(135deg,#14052E,#2D1B5E)',
                      boxShadow: '3px 3px 8px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {reminder.poster_path ? (
                        <Image src={getPosterUrl({ poster_path: reminder.poster_path }, 'w185') || ''} alt={reminder.title} width={48} height={72} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '1.4rem', opacity: .5 }}>🔔</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="f-cinzel" style={{  fontSize: '.85rem', color: '#FFF5E8', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reminder.title}</div>
                      {isAvailable ? (
                        <span className="f-cinzel" style={{
                          fontSize: '.58rem', padding: '3px 10px', borderRadius: 20,
                          background: 'rgba(78,214,196,.15)', color: '#4ECDC4',
                          border: '1px solid rgba(78,214,196,.3)',
                           fontWeight: 600, letterSpacing: '.05em',
                        }}>✨ Available Now!</span>
                      ) : daysLeft !== null ? (
                        <span className="f-mono" style={{
                          fontSize: '.62rem', 
                          color: daysLeft <= 3 ? '#FFB347' : 'rgba(255,245,232,.4)',
                        }}>
                          {daysLeft === 1 ? 'Releases tomorrow' : `${daysLeft} days until release`}
                        </span>
                      ) : (
                        <span className="f-cinzel" style={{
                          fontSize: '.58rem', padding: '3px 10px', borderRadius: 20,
                          background: 'rgba(139,120,255,.15)', color: '#8B78FF',
                           fontWeight: 600,
                        }}>🔔 Reminded</span>
                      )}
                      {reminder.releaseDate && (
                        <div className="f-mono" style={{ fontSize: '.62rem', color: 'rgba(255,245,232,.25)',  marginTop: 4 }}>
                          {new Date(reminder.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); removeReminder(reminder); }}
                      className="btn-icon remove-btn"
                      style={{ width: 32, height: 32, fontSize: '.7rem', flexShrink: 0 }}
                    >✕</button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
