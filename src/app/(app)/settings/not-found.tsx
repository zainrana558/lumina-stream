export default function NotFound() {
  return (
    <div style={{ paddingTop: 'clamp(60px,7vw,80px)', minHeight: '100vh', background: '#07040F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '3rem', opacity: 0.3 }}>&#128269;</div>
      <p style={{ fontFamily: "'Cinzel',serif", color: 'rgba(255,245,232,.5)', letterSpacing: '.08em' }}>Page not found</p>
    </div>
  );
}
