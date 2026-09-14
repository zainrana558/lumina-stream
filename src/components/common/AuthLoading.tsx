import { Loader2 } from 'lucide-react';

/**
 * Shown on account-gated pages while the auth session is still resolving.
 *
 * Without this, a logged-in user briefly sees the "Sign in" prompt on first
 * paint (auth starts as `authLoading: true` with `user: null`) before their
 * session hydrates — a jarring flash. Render this whenever `authLoading` is
 * true, and only fall through to the sign-in prompt once it settles to false.
 */
export default function AuthLoading() {
  return (
    <div
      className="page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        paddingTop: 'clamp(60px,7vw,80px)',
      }}
    >
      <div
        className="f-cinzel"
        style={{ textAlign: 'center', color: 'rgba(255,245,232,.5)', letterSpacing: '.1em' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', animation: 'spin 1.5s linear infinite', marginBottom: '1rem' }}><Loader2 size={32} /></div>
        <div>Loading…</div>
      </div>
    </div>
  );
}
