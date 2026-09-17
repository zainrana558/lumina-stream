'use client';

import { useState, type FormEvent } from 'react';
import { Mail, Check, Loader2 } from 'lucide-react';

/**
 * CSRF header is attached automatically by CsrfProvider's window.fetch
 * patch (src/components/common/CsrfProvider.tsx) — no manual header needed.
 */
export default function NewsletterSignup({ source = 'footer' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (status === 'loading' || status === 'done') return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong.');
        setStatus('error');
        return;
      }
      setStatus('done');
    } catch {
      setErrorMsg('Network error — try again.');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="f-crimson" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.85rem', color: '#4ADE80' }}>
        <Check size={16} /> You&apos;re on the list — thanks!
      </div>
    );
  }

  return (
    <div>
      <div className="f-cinzel" style={{ fontSize: '.65rem', letterSpacing: '.14em', color: 'rgba(255,179,71,.6)', marginBottom: '.7rem' }}>
        NEWSLETTER
      </div>
      <p className="f-crimson" style={{ fontSize: '.82rem', color: 'rgba(255,245,232,.4)', lineHeight: 1.6, marginBottom: '.8rem', maxWidth: 260 }}>
        New releases and picks, occasionally. No spam.
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, maxWidth: 320 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Mail size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,245,232,.3)' }} />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            disabled={status === 'loading'}
            aria-label="Email address"
            className="f-crimson"
            style={{
              width: '100%', padding: '9px 12px 9px 32px', borderRadius: 8,
              background: 'rgba(255,245,232,.04)', border: '1px solid rgba(255,245,232,.1)',
              color: '#FFF5E8', fontSize: '.8rem', outline: 'none',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="f-cinzel"
          style={{
            padding: '0 16px', borderRadius: 8, border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            background: 'rgba(255,179,71,.15)', color: '#FFB347', fontSize: '.76rem',
            display: 'flex', alignItems: 'center', gap: 6, opacity: status === 'loading' ? 0.6 : 1,
          }}
        >
          {status === 'loading' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : 'Subscribe'}
        </button>
      </form>
      {status === 'error' && (
        <p style={{ fontSize: '.72rem', color: '#FF6B8A', marginTop: 6 }}>{errorMsg}</p>
      )}
    </div>
  );
}
