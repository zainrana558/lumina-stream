'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOAuth } from '@/hooks/useOAuth';
import { GoogleLogo, GithubLogo } from '@/components/common/BrandIcons';

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { handleOAuth, error: oauthError, loading: oauthLoading } = useOAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Server-side brute-force gate — checked before the Supabase call so
      // repeated failed attempts against this form are rate-limited by the
      // app itself, not only by Supabase Auth's own backend limits.
      const gate = await fetch('/api/auth/attempt-check', { method: 'POST' });
      if (!gate.ok) {
        const data = await gate.json().catch(() => null);
        setError(data?.error || 'Too many attempts. Please wait a minute before trying again.');
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      router.push('/profiles');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    router.push('/');
  };

  return (
    <>
      <div className="auth-form-container">
        <h2>LUMOVIA</h2>
        <p className="auth-subtitle">Welcome back, dreamer</p>

        <div className="auth-error">{error || oauthError}</div>

        <div className="auth-oauth-row">
          <button
            className="auth-btn-oauth"
            onClick={() => handleOAuth('google')}
            disabled={loading || oauthLoading}
            aria-label="Continue with Google"
          >
            <GoogleLogo size={17} /> Google
          </button>
          <button
            className="auth-btn-oauth"
            onClick={() => handleOAuth('github')}
            disabled={loading || oauthLoading}
            aria-label="Continue with GitHub"
          >
            <GithubLogo size={17} /> GitHub
          </button>
        </div>

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">OR</span>
          <div className="auth-divider-line" />
        </div>

        <form onSubmit={handleLogin}>
          <div className="auth-field">
            <label className="auth-label">EMAIL</label>
            <input
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">PASSWORD</label>
            <div className="auth-input-wrapper">
              <input
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                className="auth-toggle-pw"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button
            className="auth-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? <div className="auth-spinner" /> : <>Enter the Dream <ArrowRight size={16} /></>}
          </button>
        </form>

        <button className="auth-btn-guest" onClick={handleGuest}>
          Continue as Guest
        </button>

        <p className="auth-footer">
          New here?{' '}
          <a onClick={() => router.push('/signup')}>Create account</a>
        </p>
      </div>
    </>
  );
}
