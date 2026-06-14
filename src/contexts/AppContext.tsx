'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
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
            if (!session?.user) setProfile(null);
          }
        });

        unsubscribe = () => subscription.unsubscribe();
      } catch {
        if (!cancelled) {
          setUser(null);
          setProfile(null);
          setAuthLoading(false);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
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

  const value = {
    user, profile, authLoading, supabaseReady, handleSignOut, refreshProfile,
    pipState, openPip, closePip,
    confettiActive, triggerConfetti,
    kidsMode, setKidsMode,
    searchOpen, setSearchOpen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
