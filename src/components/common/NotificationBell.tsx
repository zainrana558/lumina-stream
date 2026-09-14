'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Star, MessageCircle, User, ClipboardList, Trophy, Loader2, type LucideIcon } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { createClient, ensureRealtimeAuth } from '@/lib/supabase/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  media_id: number | null;
  media_type: string | null;
  link: string;
  is_read: boolean;
  created_at: string;
  from_profile?:
    | { id: string; name: string; avatar_url: string | null }[]
    | { id: string; name: string; avatar_url: string | null }
    | null;
}

const NOTIFICATION_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  new_episode: { icon: Play, color: '#4ECDC4' },
  watchlist_update: { icon: Star, color: '#FFB347' },
  comment_reply: { icon: MessageCircle, color: '#8B78FF' },
  follow: { icon: User, color: '#FF6B8A' },
  list_shared: { icon: ClipboardList, color: '#78D621' },
  milestone: { icon: Trophy, color: '#FFE566' },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NotificationBell() {
  const { user, profile } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=15');
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch { /* silent */ }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    const load = async () => { if (!cancelled) await fetchNotifications(); };
    load();
    return () => { cancelled = true; };
  }, [open, user, fetchNotifications]);

  // Push-based unread updates via Supabase Realtime — replaces a 60s poll
  // that cost one Redis rate-limit command + 2 Supabase queries per tick per
  // open tab (≈100k Redis commands/day at 10k DAU, see the caching audit).
  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      await ensureRealtimeAuth(supabase);
      if (cancelled) return;
      channel = supabase
        .channel(`notifications:${profile.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profile.id}` },
          () => { setUnreadCount(c => c + 1); },
        )
        .subscribe();
    })();

    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [profile]);

  // Close on outside click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [open]);

  const markRead = async (notificationId: string) => {
    if (!profile?.id) return;
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, profileId: profile.id }),
      });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    if (!profile?.id) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, markAll: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch { /* silent */ }
  };

  const handleClick = (notification: Notification) => {
    if (!notification.is_read) markRead(notification.id);
    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    } else if (notification.media_id) {
      router.push(`/details/${notification.media_id}`);
    }
  };

  if (!user) return null;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        className="btn-icon"
        style={{ position: 'relative' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="f-mono" style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 16, height: 16, borderRadius: 8,
            background: 'linear-gradient(135deg,#FF4A4A,#FF6B8A)',
            color: '#fff', fontSize: '0.52rem', 
            fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', boxShadow: '0 2px 8px rgba(255,74,74,.4)',
            animation: unreadCount > 0 ? 'eu .4s cubic-bezier(.34,1.56,.64,1) both' : 'none',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 380, maxWidth: 'calc(100vw - 2rem)', zIndex: 997,
          background: '#0C091A', borderRadius: 16,
          border: '1px solid rgba(255,255,255,.06)',
          boxShadow: '8px 8px 32px rgba(0,0,0,.9),-3px -3px 12px rgba(45,25,90,.18),inset 0 1px 0 rgba(255,255,255,.04)',
          animation: 'fi .2s ease both', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem 1.1rem', borderBottom: '1px solid rgba(255,255,255,.05)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div className="f-cinzel" style={{  fontSize: '.82rem', color: '#FFF5E8', fontWeight: 700, letterSpacing: '.04em' }}>Notifications</div>
              {unreadCount > 0 && (
                <div className="f-mono" style={{ fontSize: '.58rem', color: '#FF6B8A',  marginTop: 2 }}>
                  {unreadCount} unread
                </div>
              )}
            </div>
            {unreadCount > 0 && (
              <button className="f-cinzel"
                onClick={markAllRead}
                style={{
                  padding: '4px 10px', borderRadius: 8,
                  background: 'rgba(255,179,71,.1)', border: '1px solid rgba(255,179,71,.2)',
                  color: '#FFB347', fontSize: '.6rem', 
                  cursor: 'pointer', letterSpacing: '.04em', transition: 'all .2s',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {loading ? (
              <div className="f-cinzel" style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,245,232,.5)',  fontSize: '.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', animation: 'spin 1.5s linear infinite', marginBottom: '.5rem' }}><Loader2 size={19} /></div>
                <div>Loading...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '.5rem', opacity: .3 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,245,232,.4)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto' }}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div className="f-crimson" style={{  fontSize: '.85rem', color: 'rgba(255,245,232,.35)' }}>
                  No notifications yet
                </div>
                <div className="f-mono" style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.4)', marginTop: 4, }}>
                  Activity from people you follow will appear here
                </div>
              </div>
            ) : (
              notifications.map((notification, i) => {
                const ni = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.watchlist_update;
                const NIcon = ni.icon;
                // PostgREST returns the to-one `from_profile` embed as an object
                // (older shapes: a 1-element array) — handle both.
                const fromProfile = Array.isArray(notification.from_profile)
                  ? notification.from_profile[0]
                  : notification.from_profile;
                const fromName = fromProfile?.name || '';
                const fromAvatar = fromProfile?.avatar_url;

                return (
                  <div
                    key={notification.id}
                    className="dd-item"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleClick(notification)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleClick(notification); }}
                    style={{
                      padding: '.75rem 1.1rem',
                      display: 'flex', gap: '.75rem', alignItems: 'flex-start',
                      borderBottom: '1px solid rgba(255,255,255,.03)',
                      background: notification.is_read ? 'transparent' : 'rgba(139,120,255,.04)',
                      animation: `el .3s ${i * 0.03}s both`,
                      cursor: 'pointer',
                    }}
                  >
                    {/* Icon or avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: fromAvatar
                        ? `url(${fromAvatar}) center/cover no-repeat`
                        : `linear-gradient(135deg,${ni.color}20,${ni.color}08)`,
                      border: `1px solid ${ni.color}30`,
                      overflow: 'hidden',
                    }}>
                      {!fromAvatar && (
                        <NIcon size={14} color={ni.color} />
                      )}
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        {!notification.is_read && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6B8A', flexShrink: 0, boxShadow: '0 0 6px rgba(255,107,138,.4)' }} />
                        )}
                        <span className="f-cinzel" style={{  fontSize: '.7rem', color: '#FFF5E8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {notification.title}
                        </span>
                      </div>
                      {notification.body && (
                        <div className="f-crimson" style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.45)', lineHeight: 1.4, marginBottom: 3, }}>
                          {notification.body}
                        </div>
                      )}
                      <div className="f-mono" style={{ fontSize: '.5rem', color: 'rgba(255,245,232,.25)', }}>
                        {timeAgo(notification.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(NotificationBell);
