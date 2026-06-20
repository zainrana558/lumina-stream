'use client';

import { useRouter } from 'next/navigation';
import { GCARDS } from '@/config/genres';

export default function Footer() {
  const router = useRouter();

  return (
    <footer style={{
      position: 'relative', zIndex: 3, background: '#05030C',
      borderTop: '1px solid rgba(255,255,255,.055)',
      padding: '3rem clamp(1rem,5vw,3rem) 2.5rem',
      boxShadow: '0 -6px 0 rgba(0,0,0,.7),0 -10px 38px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.04)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        <div>
          <span className="logo" style={{ fontSize: '1.25rem', display: 'block', marginBottom: '.6rem' }}>LUMINA</span>
          <p className="f-crimson" style={{ fontSize: '.88rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.68 }}>The dreamlike world of anime streaming.</p>
        </div>
        {([
          ['Genres', GCARDS.map(g => ({ label: g.name, href: `/genre/${g.key}` }))],
          ['Account', [
            { label: 'Sign In', href: '/login' },
            { label: 'Register', href: '/signup' },
            { label: 'My List', href: '/watchlist' },
            { label: 'History', href: '/activity' },
          ]],
          ['Legal', [
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
            { label: 'Cookie Policy', href: '/cookies' },
            { label: 'DMCA', href: '/dmca' },
            { label: 'Disclaimer', href: '/disclaimer' },
          ]],
          ['Support', [
            { label: 'Help', href: '/settings' },
            { label: 'Contact', href: '/settings' },
            { label: 'About', href: '/about' },
          ]],
        ] as const).map(([t, links]) => (
          <div key={String(t)}>
            <div className="f-cinzel" style={{ fontSize: '.65rem', letterSpacing: '.14em', color: 'rgba(255,179,71,.6)', marginBottom: '.9rem' }}>{String(t).toUpperCase()}</div>
            {links.map(l => (
              <div className="f-crimson"
                key={l.label}
                onClick={() => router.push(l.href)}
                onKeyDown={(e) => { if (e.key === 'Enter') router.push(l.href); }}
                role="link"
                tabIndex={0}
                style={{ fontSize: '.86rem', color: 'rgba(255,245,232,.38)', marginBottom: '.42rem', cursor: 'pointer', transition: 'color .25s' }}
              >
                {l.label}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,.055)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="f-mono" style={{ fontSize: '.62rem', letterSpacing: '.09em', color: 'rgba(255,245,232,.22)' }}>© 2025 LUMINA STREAM · ALL RIGHTS RESERVED</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {['𝕏', '📘', '📸', '▶'].map(ic => (
            <div key={ic} className="footer-icon" style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem', background: '#0C091A', boxShadow: '3px 3px 8px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.2),inset 0 1px 0 rgba(255,255,255,.04)', transition: 'all .25s', color: 'rgba(255,245,232,.18)' }}>{ic}</div>
          ))}
        </div>
      </div>
    </footer>
  );
}