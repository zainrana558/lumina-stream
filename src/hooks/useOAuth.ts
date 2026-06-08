'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type OAuthProvider = 'google' | 'github';

/**
 * Shared OAuth sign-in handler for LoginForm and SignupForm.
 * Avoids duplicating identical OAuth logic across auth components.
 */
export function useOAuth() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOAuth = useCallback(async (provider: OAuthProvider) => {
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  return { handleOAuth, error, loading, setError };
}
