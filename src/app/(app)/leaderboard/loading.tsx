export default function LeaderboardLoading() {
  return (
    <div className="f-cinzel" style={{ textAlign: 'center', padding: '10rem 0', color: 'rgba(255,245,232,.3)',  letterSpacing: '.1em' }}>
      <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: '2rem', marginBottom: '1rem' }}>✦</div>
      <div>Loading leaderboard...</div>
    </div>
  );
}
