'use client';

/**
 * Shown when Supabase env vars are missing/placeholder.
 * Prevents infinite redirects and confusing "Sign in" prompts.
 */
export default function SupabaseNotConfigured() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1.2rem',
        padding: '2rem',
        paddingTop: 'clamp(60px, 7vw, 80px)',
      }}
    >
      <div style={{ fontSize: '3rem', opacity: 0.4 }}>&#9888;&#65039;</div>
      <h2 className="f-cinzel"
        style={{
          
          fontSize: '1.15rem',
          color: 'rgba(255,245,232,.75)',
          letterSpacing: '.08em',
          textAlign: 'center',
        }}
      >
        Supabase Not Configured
      </h2>
      <p className="f-crimson"
        style={{
          
          color: 'rgba(255,245,232,.4)',
          textAlign: 'center',
          maxWidth: 440,
          lineHeight: 1.6,
          fontSize: '.9rem',
        }}
      >
        This feature requires Supabase authentication.
        Please add your credentials to the{' '}
        <code
          style={{
            background: 'rgba(255,179,71,.1)',
            padding: '2px 7px',
            borderRadius: 4,
            fontSize: '.8rem',
            color: '#FFB347',
          }}
        >
          .env.local
        </code>{' '}
        file in the project root, then restart the dev server.
      </p>
      <div className="f-mono"
        style={{
          background: '#0C091A',
          border: '1px solid rgba(255,179,71,.15)',
          borderRadius: 12,
          padding: '1rem 1.3rem',
          maxWidth: 460,
          width: '100%',
          
          fontSize: '.7rem',
          color: 'rgba(255,245,232,.5)',
          lineHeight: 1.7,
        }}
      >
        <div>NEXT_PUBLIC_SUPABASE_URL=https://...</div>
        <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</div>
      </div>
    </div>
  );
}
