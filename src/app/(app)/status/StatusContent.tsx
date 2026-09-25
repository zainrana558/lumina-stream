'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface StatusBody {
  status: 'ok' | 'degraded';
  timestamp: string;
  categories: { site: boolean; streaming: boolean; database: boolean };
}

const ROWS: { key: keyof StatusBody['categories']; label: string; desc: string }[] = [
  { key: 'site', label: 'Site & Catalog', desc: 'Browsing, search, and content data' },
  { key: 'streaming', label: 'Streaming Sources', desc: 'At least one playback source is reachable' },
  { key: 'database', label: 'Accounts & Watchlists', desc: 'Profiles, watchlists, and sync' },
];

export default function StatusContent() {
  const [data, setData] = useState<StatusBody | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then(res => res.json())
      .then(body => { if (!cancelled) setData(body); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(1rem,5vw,2rem)', paddingTop: 96, paddingBottom: 120 }}>
      <h1 className="f-cinzel-dec" style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)', fontWeight: 900, color: '#FFF5E8', marginBottom: 8 }}>
        System Status
      </h1>
      <p className="f-crimson" style={{ color: 'rgba(255,245,232,.5)', fontSize: '.9rem', marginBottom: 32 }}>
        Live health of Lumovia&apos;s core systems, checked every minute.
      </p>

      {error && (
        <div style={{ color: 'rgba(255,245,232,.5)', fontSize: '.85rem' }}>
          Couldn&apos;t load status right now — that alone doesn&apos;t mean anything is down.
        </div>
      )}

      {!data && !error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,245,232,.4)' }}>
          <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          Checking…
        </div>
      )}

      {data && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderRadius: 12,
            marginBottom: 24,
            background: data.status === 'ok' ? 'rgba(120,214,33,.1)' : 'rgba(255,74,74,.1)',
            border: `1px solid ${data.status === 'ok' ? 'rgba(120,214,33,.3)' : 'rgba(255,74,74,.3)'}`,
          }}>
            {data.status === 'ok'
              ? <CheckCircle2 size={20} color="#78D621" />
              : <XCircle size={20} color="#FF4A4A" />}
            <span style={{ color: '#FFF5E8', fontWeight: 600, fontSize: '.95rem' }}>
              {data.status === 'ok' ? 'All systems operational' : 'Some systems are degraded'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)' }}>
            {ROWS.map(row => {
              const ok = data.categories[row.key];
              return (
                <div key={row.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', background: 'rgba(255,255,255,.02)',
                }}>
                  <div>
                    <div style={{ color: '#FFF5E8', fontSize: '.88rem', fontWeight: 600, marginBottom: 2 }}>{row.label}</div>
                    <div style={{ color: 'rgba(255,245,232,.4)', fontSize: '.72rem' }}>{row.desc}</div>
                  </div>
                  {ok
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#78D621', fontSize: '.75rem', fontWeight: 600 }}><CheckCircle2 size={14} /> Operational</span>
                    : <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#FF4A4A', fontSize: '.75rem', fontWeight: 600 }}><XCircle size={14} /> Degraded</span>}
                </div>
              );
            })}
          </div>

          <p style={{ color: 'rgba(255,245,232,.3)', fontSize: '.7rem', marginTop: 20 }}>
            Last checked {new Date(data.timestamp).toLocaleTimeString()}. Streaming sources rotate automatically — if one
            source is briefly down, switching sources on the player usually works immediately.
          </p>
        </>
      )}
    </div>
  );
}
