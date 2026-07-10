'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

const QUICK_LINKS = [
  { label: 'Movies', href: '/movies' },
  { label: 'TV Shows', href: '/tv-shows' },
  { label: 'Top Rated', href: '/top-rated' },
  { label: 'New Releases', href: '/new-releases' },
  { label: 'Anime', href: '/genre/anime' },
  { label: 'Browse All', href: '/browse' },
];

export default function NotFound() {
  const router = useRouter();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07040F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1.5rem',
        paddingTop: 'clamp(60px,7vw,80px)',
        animation: 'page-in .55s cubic-bezier(.22,1,.36,1) both',
      }}
    >
      <div
        className="f-cinzel-dec"
        style={{
          fontSize: 'clamp(6rem,14vw,10rem)',
          fontWeight: 900,
          background: 'linear-gradient(135deg, rgba(255,245,232,.18) 0%, rgba(255,179,71,.32) 50%, rgba(255,245,232,.18) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1,
          animation: 'breathe 4s ease-in-out infinite',
          userSelect: 'none',
        }}
      >
        404
      </div>

      <h2
        className="f-cinzel"
        style={{
          fontSize: 'clamp(1.1rem,2.5vw,1.6rem)',
          color: 'rgba(255,245,232,.7)',
          letterSpacing: '.1em',
          textAlign: 'center',
        }}
      >
        Page Not Found
      </h2>

      <p
        className="f-crimson"
        style={{
          color: 'rgba(255,245,232,.35)',
          fontSize: 'clamp(.9rem,1.2vw,1.05rem)',
          fontStyle: 'italic',
          textAlign: 'center',
          maxWidth: 420,
          lineHeight: 1.7,
          marginBottom: '0.5rem',
        }}
      >
        The page you are looking for does not exist or has been moved.
        Try one of the popular sections below, or head back to the homepage.
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '.6rem',
          justifyContent: 'center',
          maxWidth: 500,
          marginBottom: '1rem',
        }}
      >
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              padding: '8px 18px',
              borderRadius: '50px',
              border: '1px solid rgba(255,179,71,.2)',
              background: 'rgba(255,179,71,.06)',
              color: 'rgba(255,245,232,.6)',
              fontSize: '.82rem',
              fontFamily: "'Cinzel', serif",
              letterSpacing: '.06em',
              textDecoration: 'none',
              transition: 'all .25s',
            }}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '.8rem' }}>
        <button className="btn-p" onClick={() => router.push('/')} style={{ marginTop: '0.5rem' }}>
          Go Home
        </button>
        <button
          className="btn-s"
          onClick={() => router.back()}
          style={{ marginTop: '0.5rem' }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}