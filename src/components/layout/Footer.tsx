'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ position: 'relative', zIndex: 3, background: '#04020A', borderTop: '1px solid rgba(255,255,255,.055)', padding: '3rem clamp(1rem,5vw,3rem) 2.5rem', boxShadow: '0 -8px 0 rgba(0,0,0,.5)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        <div>
          <span className="logo" style={{ fontSize: '1.25rem', display: 'block', marginBottom: '.6rem' }}>LUMINA</span>
          <p style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.88rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.68 }}>The dreamlike world of streaming.</p>
        </div>
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.65rem', letterSpacing: '.14em', color: 'rgba(255,179,71,.6)', marginBottom: '.9rem' }}>GENRES</div>
          {['Action', 'Anime', 'Horror', 'Romance', 'Sci-Fi', 'Fantasy'].map(g => (
            <Link key={g} href={`/genre/${g.toLowerCase()}`} style={{ display: 'block', fontFamily: "'Crimson Pro',serif", fontSize: '.86rem', color: 'rgba(255,245,232,.38)', marginBottom: '.42rem', textDecoration: 'none', transition: 'color .25s' }}>{g}</Link>
          ))}
        </div>
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.65rem', letterSpacing: '.14em', color: 'rgba(255,179,71,.6)', marginBottom: '.9rem' }}>ACCOUNT</div>
          {['Sign In', 'Register', 'My List', 'History'].map(l => (
            <div key={l} style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.86rem', color: 'rgba(255,245,232,.38)', marginBottom: '.42rem', cursor: 'pointer' }}>{l}</div>
          ))}
        </div>
        <div>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: '.65rem', letterSpacing: '.14em', color: 'rgba(255,179,71,.6)', marginBottom: '.9rem' }}>SUPPORT</div>
          {['Help', 'Contact', 'Privacy', 'Terms'].map(l => (
            <div key={l} style={{ fontFamily: "'Crimson Pro',serif", fontSize: '.86rem', color: 'rgba(255,245,232,.38)', marginBottom: '.42rem', cursor: 'pointer' }}>{l}</div>
          ))}
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,.055)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.62rem', letterSpacing: '.09em', color: 'rgba(255,245,232,.22)' }}>© 2025 LUMINA STREAM · ALL RIGHTS RESERVED</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {['𝕏', '📘', '📸', '▶'].map(ic => (
            <div key={ic} style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '.78rem', background: '#0C091A', boxShadow: '3px 3px 8px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.04)', transition: 'all .25s' }}>{ic}</div>
          ))}
        </div>
      </div>
    </footer>
  );
}
