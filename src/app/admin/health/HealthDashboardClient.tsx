'use client';

import { useState, useEffect, useCallback } from 'react';

interface ProviderRow {
  name: string;
  tier: number;
  category: string;
  status: 'alive' | 'degraded' | 'dead' | 'unknown';
  latencyMs: number;
  failCount: number;
  consecutiveSuccesses: number;
  lastCheck: string | null;
  lastError: string | null;
  clientReported: boolean;
  selectionCount: number;
  avgSelectionScore: number;
  avgSelectionLatency: number;
  healthChecks: number;
  healthPassRate: number;
}

interface DashboardData {
  providers: ProviderRow[];
  redisAvailable: boolean | null;
  poolStatus: {
    poolSize: number;
    available: number;
    swappedIn: string[];
    swappedOut: string[];
    originals: number;
  } | null;
  recentFailovers: Array<{ from: string; to: string; timestamp: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  alive: '#4ECDC4',
  degraded: '#FFB347',
  dead: '#FF4A4A',
  unknown: 'rgba(255,245,232,.3)',
};

const STATUS_BG: Record<string, string> = {
  alive: 'rgba(78,205,196,.12)',
  degraded: 'rgba(255,179,71,.12)',
  dead: 'rgba(255,74,74,.12)',
  unknown: 'rgba(255,245,232,.05)',
};

export default function HealthDashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/embed-health');
      if (!res.ok) throw new Error('Failed to fetch');
      // The embed-health endpoint returns a different shape, so we merge
      const healthData = await res.json();
      setData(prev => ({
        ...prev,
        providers: prev.providers.map(p => {
          const hd = healthData.health?.[p.name];
          if (hd !== undefined) {
            return { ...p, status: hd ? (p.status === 'unknown' ? 'alive' : p.status) : 'dead' };
          }
          return p;
        }),
      }));
      setLastRefresh(new Date());
    } catch {
      // Keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const aliveCount = data.providers.filter(p => p.status === 'alive').length;
  const degradedCount = data.providers.filter(p => p.status === 'degraded').length;
  const deadCount = data.providers.filter(p => p.status === 'dead').length;
  const totalSelections = data.providers.reduce((sum, p) => sum + p.selectionCount, 0);

  return (
    <div style={{ minHeight: '100vh', background: '#07040F', color: '#FFF5E8', fontFamily: "'Inter', system-ui, sans-serif", padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Provider Health Dashboard</h1>
          <p style={{ fontSize: '.75rem', color: 'rgba(255,245,232,.4)', margin: '4px 0 0' }}>
            Last refresh: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 30s
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,.15)',
              background: loading ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.1)',
              color: '#FFF5E8', fontSize: '.8rem', cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>
      </div>

      {/* Status Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Alive', value: aliveCount, color: '#4ECDC4' },
          { label: 'Degraded', value: degradedCount, color: '#FFB347' },
          { label: 'Dead', value: deadCount, color: '#FF4A4A' },
          { label: 'Total Selections', value: totalSelections, color: '#FFF5E8' },
          { label: 'Redis', value: data.redisAvailable === true ? 'Connected' : data.redisAvailable === false ? 'Down' : 'Unknown', color: data.redisAvailable ? '#4ECDC4' : '#FF4A4A' },
          { label: 'Pool Available', value: data.poolStatus?.available ?? '-', color: '#FFF5E8' },
        ].map(item => (
          <div key={item.label} style={{
            padding: '16px', borderRadius: 12, border: '1px solid rgba(255,255,255,.08)',
            background: 'rgba(255,255,255,.03)',
          }}>
            <div style={{ fontSize: '.7rem', color: 'rgba(255,245,232,.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{item.label}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Provider Status Grid */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Provider Status</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,.1)', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', color: 'rgba(255,245,232,.5)', fontWeight: 500 }}>Provider</th>
                <th style={{ padding: '8px 12px', color: 'rgba(255,245,232,.5)', fontWeight: 500 }}>Tier</th>
                <th style={{ padding: '8px 12px', color: 'rgba(255,245,232,.5)', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '8px 12px', color: 'rgba(255,245,232,.5)', fontWeight: 500 }}>Latency</th>
                <th style={{ padding: '8px 12px', color: 'rgba(255,245,232,.5)', fontWeight: 500 }}>Fail/Success</th>
                <th style={{ padding: '8px 12px', color: 'rgba(255,245,232,.5)', fontWeight: 500 }}>Last Check</th>
                <th style={{ padding: '8px 12px', color: 'rgba(255,245,232,.5)', fontWeight: 500 }}>Selections</th>
                <th style={{ padding: '8px 12px', color: 'rgba(255,245,232,.5)', fontWeight: 500 }}>Pass Rate</th>
                <th style={{ padding: '8px 12px', color: 'rgba(255,245,232,.5)', fontWeight: 500 }}>Error</th>
              </tr>
            </thead>
            <tbody>
              {data.providers.map(p => (
                <tr key={p.name} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                    {p.name}
                    {p.clientReported && <span style={{ marginLeft: 6, fontSize: '.65rem', color: 'rgba(255,179,71,.7)' }}>(client)</span>}
                  </td>
                  <td style={{ padding: '8px 12px' }}>T{p.tier}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 20, fontSize: '.7rem', fontWeight: 600,
                      color: STATUS_COLORS[p.status], background: STATUS_BG[p.status],
                    }}>{p.status.toUpperCase()}</span>
                  </td>
                  <td style={{ padding: '8px 12px', fontVariantNumeric: 'tabular-nums' }}>{p.latencyMs > 0 ? `${p.latencyMs}ms` : '-'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color: p.failCount > 0 ? '#FF4A4A' : '#4ECDC4' }}>{p.failCount}</span>
                    {'/'}
                    <span style={{ color: '#4ECDC4' }}>{p.consecutiveSuccesses}</span>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: '.7rem', color: 'rgba(255,245,232,.5)' }}>
                    {p.lastCheck ? new Date(p.lastCheck).toLocaleTimeString() : 'Never'}
                  </td>
                  <td style={{ padding: '8px 12px', fontVariantNumeric: 'tabular-nums' }}>
                    {p.selectionCount > 0 ? (
                      <div>
                        <div>{p.selectionCount}</div>
                        {p.avgSelectionLatency > 0 && (
                          <div style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.4)' }}>
                            avg {p.avgSelectionLatency}ms · score {p.avgSelectionScore.toFixed(1)}
                          </div>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {p.healthChecks > 0 ? (
                      <span style={{ color: p.healthPassRate >= 90 ? '#4ECDC4' : p.healthPassRate >= 70 ? '#FFB347' : '#FF4A4A' }}>
                        {p.healthPassRate}%
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: '.7rem', color: '#FF4A4A', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.lastError || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Failovers */}
      {data.recentFailovers.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Recent Failovers</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.recentFailovers.map((f, i) => (
              <div key={i} style={{
                padding: '8px 14px', borderRadius: 8, background: 'rgba(255,74,74,.06)',
                border: '1px solid rgba(255,74,74,.15)', fontSize: '.78rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span>
                  <span style={{ color: '#FF4A4A' }}>{f.from}</span>
                  <span style={{ color: 'rgba(255,245,232,.3)', margin: '0 8px' }}>&rarr;</span>
                  <span style={{ color: '#4ECDC4' }}>{f.to}</span>
                </span>
                <span style={{ fontSize: '.7rem', color: 'rgba(255,245,232,.4)' }}>
                  {f.timestamp ? new Date(f.timestamp).toLocaleString() : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pool Status */}
      {data.poolStatus && (
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Replacement Pool</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' }}>
              <div style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.4)' }}>Pool Size</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{data.poolStatus.poolSize}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' }}>
              <div style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.4)' }}>Available</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4ECDC4' }}>{data.poolStatus.available}</div>
            </div>
            <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)' }}>
              <div style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.4)' }}>Originals</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{data.poolStatus.originals}</div>
            </div>
          </div>
          {data.poolStatus.swappedIn.length > 0 && (
            <div style={{ marginTop: 8, fontSize: '.78rem' }}>
              <span style={{ color: 'rgba(255,245,232,.4)' }}>Swapped in:</span>{' '}
              {data.poolStatus.swappedIn.map(s => (
                <span key={s} style={{ color: '#4ECDC4', marginRight: 8 }}>{s}</span>
              ))}
            </div>
          )}
          {data.poolStatus.swappedOut.length > 0 && (
            <div style={{ marginTop: 4, fontSize: '.78rem' }}>
              <span style={{ color: 'rgba(255,245,232,.4)' }}>Swapped out:</span>{' '}
              {data.poolStatus.swappedOut.map(s => (
                <span key={s} style={{ color: '#FF4A4A', marginRight: 8 }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}