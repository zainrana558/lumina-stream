'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';

interface ActivityItem {
  id: string;
  type: string;
  media_id: number | null;
  media_type: string | null;
  title: string;
  poster_path: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  profile: { id: string; name: string; avatar_url: string | null };
}

const ACTIVITY_CONFIG: Record<string, { verb: string; icon: string; color: string }> = {
  watched: { verb: 'watched', icon: '▶', color: '#4ECDC4' },
  completed: { verb: 'finished watching', icon: '✓', color: '#78D621' },
  added_to_watchlist: { verb: 'added to watchlist', icon: '★', color: '#FFB347' },
  commented: { verb: 'commented on', icon: '💬', color: '#8B78FF' },
  rated: { verb: 'rated', icon: '⭐', color: '#FFE566' },
  created_list: { verb: 'created list', icon: '📋', color: '#FF6B8A' },
  updated_list: { verb: 'updated list', icon: '✏', color: '#FF6B8A' },
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

export default function ActivityFeed({ feedMode = false }: { feedMode?: boolean }) {
  const { user, profile } = useApp();
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchActivities = async (pageNum: number, append = false) => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        profileId: profile.id,
        feed: String(feedMode),
        page: String(pageNum),
        limit: '15',
      });
      const res = await fetch(`/api/activity?${params}`);
      const data = await res.json();
      const newItems = data.activities || [];
      setActivities(prev => append ? [...prev, ...newItems] : newItems);
      setHasMore(newItems.length >= 15);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities(1);
  }, [user, profile, feedMode]);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchActivities(nextPage, true);
        }
      },
      { threshold: 0.5 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page]);

  if (!user || !profile) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
        <div className="f-cinzel" style={{  fontSize: '1.1rem', color: 'rgba(255,245,232,.5)', letterSpacing: '.06em' }}>Sign in to see activity</div>
        <button className="btn-p" onClick={() => router.push('/login')} style={{ marginTop: '1.2rem' }}>Sign In</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        {activities.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div className="f-cinzel" style={{  fontSize: '1rem', color: 'rgba(255,245,232,.4)', marginBottom: '.5rem' }}>
              {feedMode ? 'No activity from people you follow yet' : 'No activity recorded yet'}
            </div>
            <div className="f-crimson" style={{  fontSize: '.85rem', color: 'rgba(255,245,232,.25)' }}>
              {feedMode ? 'Follow people to see their activity here' : 'Start watching shows to see your activity here'}
            </div>
            {feedMode && (
              <button className="btn-p" onClick={() => router.push('/browse')} style={{ marginTop: '1.2rem' }}>Find People</button>
            )}
          </div>
        )}

        {activities.map((activity, i) => {
          const config = ACTIVITY_CONFIG[activity.type] || ACTIVITY_CONFIG.watched;
          const meta = activity.metadata || {};
          const epInfo = meta.episode
            ? `S${meta.season || 1}E${meta.episode}`
            : '';
          const ratingVal = meta.rating ? `${meta.rating}/5` : '';

          return (
            <div
              key={activity.id}
              className="neo-card"
              onClick={() => {
                if (activity.media_id) router.push(`/details/${activity.media_id}`);
              }}
              style={{
                padding: '.75rem 1rem', borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: '.75rem',
                cursor: activity.media_id ? 'pointer' : 'default',
                animation: `el .3s ${i * 0.03}s both`,
                transition: 'all .2s',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: activity.profile.avatar_url
                  ? `url(${activity.profile.avatar_url}) center/cover no-repeat`
                  : `linear-gradient(135deg,${config.color}30,${config.color}15)`,
                border: `1px solid ${config.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {!activity.profile.avatar_url && (
                  <span style={{ fontSize: '.7rem', fontWeight: 700, color: config.color }}>
                    {activity.profile.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="f-cinzel" style={{ fontSize: '.72rem', color: '#FFF5E8',  lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700, color: config.color }}>{activity.profile.name}</span>
                  {' '}
                  <span style={{ color: 'rgba(255,245,232,.55)' }}>{config.verb}</span>
                  {activity.title && (
                    <span style={{ fontWeight: 600, color: '#FFF5E8' }}> {activity.title}</span>
                  )}
                  {epInfo && (
                    <span className="f-mono" style={{ fontSize: '.58rem', color: 'rgba(255,245,232,.35)',  marginLeft: 4 }}>
                      {epInfo}
                    </span>
                  )}
                  {ratingVal && (
                    <span className="f-mono" style={{ fontSize: '.58rem', color: '#FFE566',  marginLeft: 4 }}>
                      {ratingVal}
                    </span>
                  )}
                </div>
                <div className="f-mono" style={{ fontSize: '.5rem', color: 'rgba(255,245,232,.22)',  marginTop: 2 }}>
                  {timeAgo(activity.created_at)}
                </div>
              </div>

              {/* Poster thumbnail */}
              {activity.poster_path && (
                <div style={{
                  width: 36, height: 54, borderRadius: 6, flexShrink: 0,
                  overflow: 'hidden', background: 'linear-gradient(135deg,#14052E,#2D1B5E)',
                  boxShadow: '2px 2px 6px rgba(0,0,0,.5)',
                }}>
                  <img src={`https://image.tmdb.org/t/p/w92${activity.poster_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Infinite scroll loader */}
      {hasMore && <div ref={loaderRef} style={{ height: 60 }} />}
      {loading && page > 1 && (
        <div className="f-cinzel" style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255,245,232,.3)',  fontSize: '.72rem' }}>
          <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite' }}>✦</div>
        </div>
      )}
    </div>
  );
}
