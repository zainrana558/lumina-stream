'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';

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
  from_profile?: { id: string; name: string; avatar_url: string | null }[];
}

const NOTIFICATION_ICONS: Record<string, { icon: string; color: string }> = {
  new_episode: { icon: '▶', color: '#4ECDC4' },
  watchlist_update: { icon: '★', color: '#FFB347' },
  comment_reply: { icon: '💬', color: '#8B78FF' },
  follow: { icon: '👤', color: '#FF6B8A' },
  list_shared: { icon: '📋', color: '#78D621' },
  milestone: { icon: '🏆', color: '#FFE566' },
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

export default function NotificationBell() {
  const { user } = useApp();
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
    if (open && user) fetchNotifications();
  }, [open, user, fetchNotifications]);

  // Poll for unread count every 30s
  useEffect(() => {
    if (!user) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/notifications?limit=1');
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      } catch { /* silent */ }
    }, 30000);
    return () => clearInterval(poll);
  }, [user]);

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
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, markAll: false }),
      });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: '', markAll: true }),
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
          <span style={{
            position: 'absolute', top: -2, right: -2,
            minWidth: 16, height: 16, borderRadius: 8,
            background: 'linear-gradient(135deg,#FF4A4A,#FF6B8A)',
            color: '#fff', fontSize: '0.52rem', fontFamily: "'JetBrains Mono',monospace",
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
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.82rem', color: '#FFF5E8', fontWeight: 700, letterSpacing: '.04em' }}>Notifications</div>
              {unreadCount > 0 && (
                <div style={{ fontSize: '.58rem', color: '#FF6B8A', fontFamily: "'JetBrains Mono',monospace", marginTop: 2 }}>
                  {unreadCount} unread
                </div>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  padding: '4px 10px', borderRadius: 8,
                  background: 'rgba(255,179,71,.1)', border: '1px solid rgba(255,179,71,.2)',
                  color: '#FFB347', fontSize: '.6rem', fontFamily: "'Cinzel',serif",
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
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,245,232,.3)', fontFamily: "'Cinzel',serif", fontSize: '.75rem' }}>
                <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: '1.2rem', marginBottom: '.5rem' }}>✦</div>
                <div>Loading...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '.5rem', opacity: .3 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,245,232,.2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto' }}>
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <div style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.85rem', color: 'rgba(255,245,232,.35)' }}>
                  No notifications yet
                </div>
                <div style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.2)', marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                  Activity from people you follow will appear here
                </div>
              </div>
            ) : (
              notifications.map((notification, i) => {
                const ni = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.watchlist_update;
                const fromName = notification.from_profile?.[0]?.name || '';
                const fromAvatar = notification.from_profile?.[0]?.avatar_url;

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
                        <span style={{ fontSize: '.85rem' }}>{ni.icon}</span>
                      )}
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        {!notification.is_read && (
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6B8A', flexShrink: 0, boxShadow: '0 0 6px rgba(255,107,138,.4)' }} />
                        )}
                        <span style={{ fontFamily: "'Cinzel',serif", fontSize: '.7rem', color: '#FFF5E8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {notification.title}
                        </span>
                      </div>
                      {notification.body && (
                        <div style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.45)', lineHeight: 1.4, marginBottom: 3, fontFamily: "'Crimson Pro',serif" }}>
                          {notification.body}
                        </div>
                      )}
                      <div style={{ fontSize: '.5rem', color: 'rgba(255,245,232,.25)', fontFamily: "'JetBrains Mono',monospace" }}>
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
