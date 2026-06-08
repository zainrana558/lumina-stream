'use client';

export default function AmbientOrbs() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: '-22%', left: '-14%', width: '65vw', height: '65vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(139,120,255,.09) 0%,transparent 70%)',
        animation: 'aurora 20s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', top: '38%', right: '-18%', width: '55vw', height: '55vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(255,107,138,.07) 0%,transparent 70%)',
        animation: 'aurora 24s ease-in-out infinite reverse', animationDelay: '-7s',
      }} />
      <div style={{
        position: 'absolute', bottom: '-22%', left: '28%', width: '48vw', height: '48vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle,rgba(255,179,71,.055) 0%,transparent 70%)',
        animation: 'aurora 28s ease-in-out infinite', animationDelay: '-13s',
      }} />
    </div>
  );
}
