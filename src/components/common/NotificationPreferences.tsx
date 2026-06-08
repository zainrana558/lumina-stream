'use client';

import { useState } from 'react';

interface NotifPrefs {
  newEpisodes: boolean;
  trendingUpdates: boolean;
  watchlistReminders: boolean;
  emailDigest: 'off' | 'daily' | 'weekly';
}

const DEFAULT_PREFS: NotifPrefs = {
  newEpisodes: true,
  trendingUpdates: false,
  watchlistReminders: true,
  emailDigest: 'weekly',
};

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotifPrefs>(() => {
    try {
      const saved = localStorage.getItem('lumina_notif_prefs');
      if (saved) return JSON.parse(saved) as NotifPrefs;
    } catch {}
    return DEFAULT_PREFS;
  });

  const updatePref = <K extends keyof NotifPrefs>(key: K, value: NotifPrefs[K]) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem('lumina_notif_prefs', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const togglePref = (key: 'newEpisodes' | 'trendingUpdates' | 'watchlistReminders') => {
    updatePref(key, !prefs[key]);
  };

  return (
    <div className="neo-raised" style={{ padding: '1.5rem 1.6rem', borderRadius: 16 }}>
      <h3 style={{ fontFamily: "'Cinzel',serif", fontSize: '.72rem', letterSpacing: '.14em', color: '#FFB347', marginBottom: '1.2rem' }}>NOTIFICATION PREFERENCES</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {([
          { key: 'newEpisodes' as const, icon: '📺', label: 'New Episode Alerts', desc: 'Get notified when new episodes of your watchlist shows air' },
          { key: 'trendingUpdates' as const, icon: '🔥', label: 'Trending Updates', desc: 'Weekly digest of trending shows and movies' },
          { key: 'watchlistReminders' as const, icon: '⏰', label: 'Watchlist Reminders', desc: 'Reminders to continue watching items in your watchlist' },
        ]).map((item) => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.75rem 1rem', borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.1rem', width: 32, textAlign: 'center' }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.78rem', color: '#FFF5E8', marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: '.64rem', color: 'rgba(255,245,232,.35)', fontFamily: "'Crimson Pro',serif" }}>{item.desc}</div>
              </div>
            </div>
            <button
              onClick={() => togglePref(item.key)}
              style={{
                width: 44, height: 24, borderRadius: 12,
                background: prefs[item.key] ? 'linear-gradient(135deg,#FFB347,#FF8C00)' : '#090716',
                border: 'none', cursor: 'pointer',
                position: 'relative', transition: 'background .3s',
                boxShadow: prefs[item.key] ? '0 0 12px rgba(255,140,0,.3)' : 'inset 2px 2px 5px rgba(0,0,0,.6)',
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: '#FFF5E8',
                position: 'absolute', top: 3,
                left: prefs[item.key] ? 23 : 3,
                transition: 'left .3s cubic-bezier(.34,1.56,.64,1)',
                boxShadow: '0 2px 4px rgba(0,0,0,.3)',
              }} />
            </button>
          </div>
        ))}

        {/* Email digest frequency */}
        <div style={{ padding: '.75rem 1rem', borderRadius: 12, background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '.75rem' }}>
            <span style={{ fontSize: '1.1rem', width: 32, textAlign: 'center' }}>📧</span>
            <div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.78rem', color: '#FFF5E8', marginBottom: 2 }}>Email Digest</div>
              <div style={{ fontSize: '.64rem', color: 'rgba(255,245,232,.35)', fontFamily: "'Crimson Pro',serif" }}>Receive a summary of your activity and updates</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#090716', borderRadius: 10, padding: 3, boxShadow: 'inset 2px 2px 6px rgba(0,0,0,.6),inset -1px -1px 3px rgba(35,20,75,.15)', marginLeft: 52 }}>
            {(['off', 'daily', 'weekly'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => updatePref('emailDigest', opt)}
                style={{
                  flex: 1, padding: '6px 12px', borderRadius: 8, border: 'none',
                  fontFamily: "'Cinzel',serif", fontSize: '.62rem', fontWeight: 600,
                  cursor: 'pointer', textTransform: 'capitalize',
                  background: prefs.emailDigest === opt ? '#FFB347' : 'transparent',
                  color: prefs.emailDigest === opt ? '#05020A' : 'rgba(255,245,232,.4)',
                  transition: 'all .22s',
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
