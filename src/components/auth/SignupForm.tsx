'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowRight, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOAuth } from '@/hooks/useOAuth';
import { GoogleLogo, GithubLogo } from '@/components/common/BrandIcons';

export default function SignupForm() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { handleOAuth, error: oauthError, loading: oauthLoading } = useOAuth();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Server-side gate — checked before the Supabase call so automated
      // mass account-creation against this form is rate-limited by the app
      // itself, not only by Supabase Auth's own backend limits.
      const gate = await fetch('/api/auth/attempt-check', { method: 'POST' });
      if (!gate.ok) {
        const data = await gate.json().catch(() => null);
        setError(data?.error || 'Too many attempts. Please wait a minute before trying again.');
        return;
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      // Use session from signup response directly — no extra getSession() call
      if (data.session) {
        router.push('/profiles');
      } else {
        setEmailSent(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <>
        <div className="auth-form-container" style={{ textAlign: 'center' }}>
          <h2>LUMOVIA</h2>
          <div className="auth-email-sent-icon"><Mail size={40} strokeWidth={1.5} /></div>
          <p className="auth-email-sent-text">
            Check your email at <span className="auth-email-sent-addr">{email}</span>
            <br />
            We&apos;ve sent you a confirmation link to begin your journey.
          </p>
          <p className="auth-footer">
            Already a dreamer?{' '}
            <a onClick={() => router.push('/login')}>Sign in</a>
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="auth-form-container">
        <h2>LUMOVIA</h2>
        <p className="auth-subtitle">Begin your journey tonight</p>

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

        <form onSubmit={handleSignup}>
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
                minLength={6}
                autoComplete="new-password"
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

          <div className="auth-field">
            <label className="auth-label">CONFIRM PASSWORD</label>
            <input
              className="auth-input"
              type="password"
              placeholder="••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          <button
            className="auth-btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? <div className="auth-spinner" /> : <>Begin Dreaming <ArrowRight size={16} /></>}
          </button>
        </form>

        <p className="auth-footer">
          Already a dreamer?{' '}
          <a onClick={() => router.push('/login')}>Sign in</a>
        </p>
      </div>
    </>
  );
}
