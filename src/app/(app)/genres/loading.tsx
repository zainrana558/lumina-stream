export default function GenresLoading() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 60px' }}>
      <div style={{
        width: 240, height: 36, borderRadius: 8,
        background: 'linear-gradient(90deg, rgba(255,179,71,.08) 25%, rgba(255,179,71,.15) 50%, rgba(255,179,71,.08) 75%)',
        backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite',
        marginBottom: 12,
      }} />
      <div style={{
        width: '60%', height: 18, borderRadius: 6,
        background: 'linear-gradient(90deg, rgba(255,245,232,.04) 25%, rgba(255,245,232,.08) 50%, rgba(255,245,232,.04) 75%)',
        backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite',
        marginBottom: 32,
      }} />
      <div style={{
        width: 200, height: 28, borderRadius: 6,
        background: 'linear-gradient(90deg, rgba(255,179,71,.08) 25%, rgba(255,179,71,.15) 50%, rgba(255,179,71,.08) 75%)',
        backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite',
        marginBottom: 20,
      }} />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 48,
      }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{
            borderRadius: 12, padding: '24px 20px',
            background: 'linear-gradient(90deg, rgba(255,245,232,.04) 25%, rgba(255,245,232,.08) 50%, rgba(255,245,232,.04) 75%)',
            backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite',
            animationDelay: `${i * 0.06}s`,
          }} />
        ))}
      </div>
    </div>
  );
}