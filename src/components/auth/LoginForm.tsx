'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOAuth } from '@/hooks/useOAuth';

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
        <h2>LUMINA</h2>
        <p className="auth-subtitle">Welcome back, dreamer</p>

        <div className="auth-error">{error || oauthError}</div>

        <div className="auth-oauth-row">
          <button
            className="auth-btn-oauth"
            onClick={() => handleOAuth('google')}
            disabled={loading || oauthLoading}
          >
            G
          </button>
          <button
            className="auth-btn-oauth"
            onClick={() => handleOAuth('github')}
            disabled={loading || oauthLoading}
          >
            ⚡
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
              placeholder="you@lumina.stream"
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
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            className="auth-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? <div className="auth-spinner" /> : 'Enter the Dream ✦'}
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
