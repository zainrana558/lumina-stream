'use client';

/**
 * BlogPost — Client component for rendering blog post pages.
 */

import Link from 'next/link';

interface Show {
  id: number;
  title: string;
  year?: string;
  overview: string;
  genres?: string;
  rating: string;
  type: 'movie' | 'tv';
  poster?: string | null;
  backdrop?: string | null;
}

export default function BlogPost({ show, content }: { show: Show; content: string }) {
  return (
    <div style={{
      maxWidth: 800,
      margin: '0 auto',
      padding: 'clamp(1rem, 5vw, 2rem)',
      paddingTop: 80,
      paddingBottom: 120,
    }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: '.75rem', color: 'rgba(255,245,232,.4)', marginBottom: 24 }}>
        <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>Home</Link>
        {' › '}
        <Link href="/blog" style={{ color: 'inherit', textDecoration: 'none' }}>Blog</Link>
        {' › '}
        <span style={{ color: 'rgba(255,245,232,.6)' }}>{show.title}</span>
      </div>

      {/* Hero */}
      <div style={{
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 32,
        height: 300,
        background: show.backdrop
          ? `url(https://image.tmdb.org/t/p/w1280${show.backdrop}) center/cover`
          : 'linear-gradient(135deg, #1a1030, #0d0a1a)',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,.85) 0%, rgba(0,0,0,.4) 60%, rgba(0,0,0,.2) 100%)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '32px clamp(1rem, 5vw, 2rem)',
        }}>
          <div style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: 20,
            background: 'rgba(255,179,71,.15)',
            color: '#FFB347',
            fontSize: '.65rem',
            fontWeight: 600,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            {show.type === 'tv' ? 'TV Series' : 'Movie'} · ⭐ {show.rating}
          </div>
          <h1 style={{
            fontSize: 'clamp(1.4rem, 3vw, 2rem)',
            color: '#FFF5E8',
            margin: '4px 0',
            fontWeight: 700,
          }}>
            Watch {show.title}{show.year ? ` (${show.year})` : ''} Online Free
          </h1>
          {show.genres && (
            <p style={{ color: 'rgba(255,245,232,.5)', fontSize: '.8rem', margin: 0 }}>
              {show.genres}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          color: 'rgba(255,245,232,.75)',
          fontSize: '1rem',
          lineHeight: 1.8,
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* Footer */}
      <div style={{
        marginTop: 48,
        paddingTop: 24,
        borderTop: '1px solid rgba(255,255,255,.06)',
        textAlign: 'center',
        color: 'rgba(255,245,232,.3)',
        fontSize: '.75rem',
      }}>
        <p>Part of the <Link href="/" style={{ color: '#FFB347', textDecoration: 'none' }}>Lumina Stream</Link> catalog · thousands of free movies, TV shows & anime</p>
      </div>
    </div>
  );
}
