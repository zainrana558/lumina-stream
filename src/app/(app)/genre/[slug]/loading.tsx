export default function GenreLoading() {
  return (
    <div style={{
      minHeight: '100vh', background: '#07040F',
      padding: 'clamp(60px,7vw,80px) 1.5rem 2rem',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Skeleton title */}
        <div style={{
          width: 200, height: 32, borderRadius: 8,
          background: 'linear-gradient(90deg, rgba(255,179,71,.08) 25%, rgba(255,179,71,.15) 50%, rgba(255,179,71,.08) 75%)',
          backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite',
          marginBottom: '2rem',
        }} />
        {/* Skeleton grid */}
        <div style={{
          display: 'grid', gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              aspectRatio: '2/3', borderRadius: 12,
              background: 'linear-gradient(90deg, rgba(255,245,232,.04) 25%, rgba(255,245,232,.08) 50%, rgba(255,245,232,.04) 75%)',
              backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.5s infinite',
              animationDelay: `${i * 0.05}s`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
