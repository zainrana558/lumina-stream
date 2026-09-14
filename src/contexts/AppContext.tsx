'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  is_kids?: boolean;
}

export interface PipState {
  url: string;
  title: string;
  episodeInfo: string;
  colorScheme: { bg?: string; acc?: string };
  showId: number;
}

interface AppContextValue {
  // Auth
  user: User | null;
  profile: UserProfile | null;
  authLoading: boolean;
  supabaseReady: boolean;
  handleSignOut: () => void;
  refreshProfile: () => Promise<void>;
  // PiP
  pipState: PipState | null;
  openPip: (url: string, title: string, episodeInfo: string, colorScheme: { bg?: string; acc?: string }, showId: number) => void;
  closePip: () => void;
  // Confetti
  confettiActive: boolean;
  triggerConfetti: () => void;
  // Kids Mode
  kidsMode: boolean;
  setKidsMode: (mode: boolean) => void;
  // Search
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  // True while a profile fetch is in flight for the current user. Kept
  // separate from authLoading's own setState calls — see the combined
  // `isAuthLoading` exposed below.
  const [profileFetching, setProfileFetching] = useState(false);
  const [pipState, setPipState] = useState<PipState | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [kidsMode, setKidsMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const lastFetchedUserId = useRef<string | null>(null);

  // Shared profile fetcher
  const fetchProfile = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    // Skip if already fetched for this user
    if (userId === lastFetchedUserId.current) return;
    lastFetchedUserId.current = userId;

    setProfileFetching(true);
    try {
      const res = await fetch('/api/active-profile');
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          setKidsMode(!!data.profile.is_kids);
        } else {
          setProfile(null);
        }
      }
    } catch {
      // silent
    } finally {
      setProfileFetching(false);
    }
  }, []);

  // Auth init
  const [supabaseReady, setSupabaseReady] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        const { createClient, isSupabaseConfigured } = await import('@/lib/supabase/client');

        if (!isSupabaseConfigured()) {
          if (!cancelled) {
            setSupabaseReady(false);
            setUser(null);
            setProfile(null);
            setAuthLoading(false);
          }
          return;
        }

        const supabase = createClient();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) {
            setUser(session?.user ?? null);
            if (!session?.user) {
              setProfile(null);
              setProfileFetching(false);
            } else if (session.user.id !== lastFetchedUserId.current) {
              // Only for a genuinely new/different user — onAuthStateChange
              // also fires on TOKEN_REFRESHED for an already-known user
              // whose profile is already loaded; setting this unconditionally
              // would re-arm profileFetching on every token refresh and never
              // get cleared (fetchProfile short-circuits for a userId it's
              // already fetched), leaving combinedAuthLoading stuck true.
              //
              // Flip this in the SAME batched update as setUser (not in the
              // separate fetchProfile effect below) so any component reading
              // both `user` and this combined loading flag never sees a
              // render where user is set but profile-fetch-pending isn't —
              // see combinedAuthLoading below for why that gap mattered.
              setProfileFetching(true);
            }
            // Previously cleared in the outer finally below, which ran as
            // soon as this listener was *registered* — before Supabase had
            // actually resolved the session. That left a window where
            // authLoading was already false but `user` hadn't been set yet,
            // so pages gating a redirect on `user && !profile && !authLoading`
            // (watchlist/settings/activity/collections/stats) fired the
            // redirect to /profiles the instant `user` arrived a moment
            // later, even with a profile already selected.
            setAuthLoading(false);
          }
        });

        unsubscribe = () => subscription.unsubscribe();
      } catch {
        if (!cancelled) {
          setUser(null);
          setProfile(null);
          setAuthLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // Fetch active profile when user changes
  useEffect(() => {
    let mounted = true;
    const load = async () => { if (mounted) await fetchProfile(user?.id ?? null); };
    load();
    return () => { mounted = false; };
  }, [user, fetchProfile]);

  const refreshProfile = useCallback(async () => {
    lastFetchedUserId.current = null;
    await fetchProfile(user?.id ?? null);
  }, [fetchProfile, user?.id]);

  const handleSignOut = useCallback(async () => {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      await createClient().auth.signOut();
    } catch {
      // silent
    }
    setProfile(null);
    setUser(null);
  }, []);

  const openPip = useCallback((url: string, title: string, episodeInfo: string, colorScheme: { bg?: string; acc?: string }, showId: number) => {
    setPipState({ url, title, episodeInfo, colorScheme, showId });
  }, []);

  const closePip = useCallback(() => {
    setPipState(null);
  }, []);

  const triggerConfetti = useCallback(() => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 500);
  }, []);

  // Consumers (watchlist/settings/activity/collections/stats) gate a
  // redirect-to-/profiles on authLoading being false — that must also cover
  // "we know who the user is but haven't finished checking their selected
  // profile yet", or a logged-in user with a real profile gets bounced.
  const combinedAuthLoading = authLoading || (!!user && profileFetching);

  // Previously a fresh object literal every render — every one of the many
  // useApp() consumers (header, nav, every authenticated page) re-rendered
  // on ANY AppProvider state change, including ones unrelated to what that
  // consumer actually reads (e.g. toggling pipState re-rendering the
  // watchlist page). The individual setters/callbacks below are already
  // stable (useCallback / useState setters), so memoizing just needs the
  // values that actually change in its dependency array.
  const value = useMemo(() => ({
    user, profile, authLoading: combinedAuthLoading, supabaseReady, handleSignOut, refreshProfile,
    pipState, openPip, closePip,
    confettiActive, triggerConfetti,
    kidsMode, setKidsMode,
    searchOpen, setSearchOpen,
  }), [
    user, profile, combinedAuthLoading, supabaseReady, handleSignOut, refreshProfile,
    pipState, openPip, closePip,
    confettiActive, triggerConfetti,
    kidsMode, searchOpen,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
