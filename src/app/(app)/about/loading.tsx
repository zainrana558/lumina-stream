export default function AboutLoading() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 'clamp(60px,7vw,80px) 20px 60px' }}>
      <div style={{
        width: 300, height: 40, borderRadius: 8,
        background: 'linear-gradient(90deg, rgba(255,179,71,.08) 25%, rgba(255,179,71,.15) 50%, rgba(255,179,71,.08) 75%)',
        backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite',
        marginBottom: 16,
      }} />
      <div style={{
        width: '100%', height: 20, borderRadius: 6,
        background: 'linear-gradient(90deg, rgba(255,245,232,.04) 25%, rgba(255,245,232,.08) 50%, rgba(255,245,232,.04) 75%)',
        backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite',
        marginBottom: 12,
      }} />
      <div style={{
        width: '80%', height: 20, borderRadius: 6,
        background: 'linear-gradient(90deg, rgba(255,245,232,.04) 25%, rgba(255,245,232,.08) 50%, rgba(255,245,232,.04) 75%)',
        backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite',
        marginBottom: 48,
      }} />
      <div style={{
        width: 200, height: 28, borderRadius: 6,
        background: 'linear-gradient(90deg, rgba(255,179,71,.08) 25%, rgba(255,179,71,.15) 50%, rgba(255,179,71,.08) 75%)',
        backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite',
        marginBottom: 20,
      }} />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20,
      }}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} style={{
            borderRadius: 12, padding: '20px 16px',
            background: 'linear-gradient(90deg, rgba(255,245,232,.04) 25%, rgba(255,245,232,.08) 50%, rgba(255,245,232,.04) 75%)',
            backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite',
            animationDelay: `${i * 0.05}s`,
          }}>
            <div style={{
              width: '60%', height: 16, borderRadius: 4, marginBottom: 10,
              background: 'rgba(255,179,71,.12)',
            }} />
            <div style={{
              width: '100%', height: 12, borderRadius: 4,
              background: 'rgba(255,245,232,.05)',
            }} />
            <div style={{
              width: '70%', height: 12, borderRadius: 4, marginTop: 6,
              background: 'rgba(255,245,232,.05)',
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}