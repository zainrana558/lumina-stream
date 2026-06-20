import Link from 'next/link';
import { GCARDS } from '@/config/genres';

const FOOTER_SECTIONS = [
  ['Browse', [
    { label: 'Movies', href: '/movies' },
    { label: 'TV Shows', href: '/tv-shows' },
    { label: 'Top Rated', href: '/top-rated' },
    { label: 'New Releases', href: '/new-releases' },
    { label: 'Browse All', href: '/browse' },
    { label: 'Genres', href: '/genres' },
    { label: 'Seasonal Anime', href: '/seasonal' },
    { label: 'Release Calendar', href: '/release-calendar' },
  ]],
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
] as const;

const SOCIAL_LINKS = [
  { label: '𝕏', href: 'https://x.com/luminastream' },
  { label: '📘', href: 'https://facebook.com/luminastream' },
  { label: '📸', href: 'https://instagram.com/luminastream' },
  { label: '▶', href: 'https://youtube.com/@luminastream' },
] as const;

export default function Footer() {
  return (
    <footer style={{
      position: 'relative', zIndex: 3, background: '#05030C',
      borderTop: '1px solid rgba(255,255,255,.055)',
      padding: '3rem clamp(1rem,5vw,3rem) 2.5rem',
      boxShadow: '0 -6px 0 rgba(0,0,0,.7),0 -10px 38px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.04)',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
        <div>
          <Link href="/" className="logo" style={{ fontSize: '1.25rem', display: 'block', marginBottom: '.6rem', textDecoration: 'none', color: 'inherit' }}>LUMINA</Link>
          <p className="f-crimson" style={{ fontSize: '.88rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.68 }}>The dreamlike world of anime streaming.</p>
        </div>
        {FOOTER_SECTIONS.map(([t, links]) => (
          <div key={String(t)}>
            <div className="f-cinzel" style={{ fontSize: '.65rem', letterSpacing: '.14em', color: 'rgba(255,179,71,.6)', marginBottom: '.9rem' }}>{String(t).toUpperCase()}</div>
            {links.map(l => (
              <Link
                className="f-crimson"
                key={l.label}
                href={l.href}
                style={{ fontSize: '.86rem', color: 'rgba(255,245,232,.38)', marginBottom: '.42rem', display: 'block', transition: 'color .25s', textDecoration: 'none' }}
              >
                {l.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,.055)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="f-mono" style={{ fontSize: '.62rem', letterSpacing: '.09em', color: 'rgba(255,245,232,.22)' }}>&copy; 2025 LUMINA STREAM &middot; ALL RIGHTS RESERVED</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {SOCIAL_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="footer-icon"
              style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem', background: '#0C091A', boxShadow: '3px 3px 8px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.2),inset 0 1px 0 rgba(255,255,255,.04)', transition: 'all .25s', color: 'rgba(255,245,232,.18)', textDecoration: 'none' }}
            >{label}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}