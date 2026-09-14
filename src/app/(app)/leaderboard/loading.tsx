import { Loader2 } from 'lucide-react';

export default function LeaderboardLoading() {
  return (
    <div className="f-cinzel" style={{ textAlign: 'center', padding: '10rem 0', color: 'rgba(255,245,232,.5)',  letterSpacing: '.1em' }}>
      <div style={{ display: 'flex', justifyContent: 'center', animation: 'spin 1.5s linear infinite', marginBottom: '1rem' }}><Loader2 size={32} /></div>
      <div>Loading leaderboard...</div>
    </div>
  );
}
