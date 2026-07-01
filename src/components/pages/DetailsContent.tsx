'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { MediaItem, TMDBCastMember, TMDBShow } from '@/types';
import { tmdbToMedia, isAnilistId, toAnilistId } from '@/types';
import { CS } from '@/styles/themes';
import Card from '@/components/common/Card';
import ShareButton from '@/components/common/ShareButton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useApp } from '@/contexts/AppContext';
import { useWakeLock } from '@/hooks/useWakeLock';
import { vibrateMedium, vibrateLong } from '@/lib/haptics';
import { getTmdbImageUrl, getBackdropUrl, getYoutubeThumbnail } from '@/lib/images';
import TrailerModal from '@/components/common/TrailerModal';

interface TMDBSeasonEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  runtime?: number;
  still_path: string | null;
  air_date: string;
  vote_average: number;
  season_number: number;
}

interface Comment {
  id: string;
  profile_id: string;
  content: string;
  created_at: string;
  profile_name: string;
  profile_avatar: string | null;
  rating?: number;
}

interface FullDetails {
  id?: number;
  credits?: { cast: TMDBCastMember[] };
  similar?: { results: TMDBShow[] };
  videos?: { results: Array<{ id: string; key: string; name: string; type: string; site: string }> };
  number_of_seasons?: number;
  production_companies?: Array<{ name: string }>;
  content_ratings?: { results: Array<{ iso_3166_1: string; rating: string }> };
}

interface DetailsContentProps {
  showId: number;
  initialShow: MediaItem | null;
  initialCredits?: TMDBCastMember[];
  initialSimilar?: MediaItem[];
  /** Pre-selected season (from episode URL route) */
  defaultSeason?: number;
  /** Pre-selected episode (from episode URL route) */
  defaultEpisode?: number;
}

export default function DetailsContent({ showId, initialShow, initialCredits = [], initialSimilar = [], defaultSeason, defaultEpisode }: DetailsContentProps) {
  const router = useRouter();
  const { user, profile, openPip, triggerConfetti } = useApp();

  const [show, setShow] = useState<MediaItem | null>(initialShow);
  const [tab, setTab] = useState('episodes');
  const [epIdx, setEpIdx] = useState(defaultEpisode || 1);
  const [season, setSeason] = useState(defaultSeason || 1);
  const [playing, setPlaying] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSending, setCommentSending] = useState(false);

  const [fullDetails, setFullDetails] = useState<FullDetails | null>(null);
  const [seasonEpisodes, setSeasonEpisodes] = useState<TMDBSeasonEpisode[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [hasMoreSimilar, setHasMoreSimilar] = useState(true);
  const [providers, setProviders] = useState<Array<{ name: string; url: string; tier?: number; category?: string; score?: number }>>([]);
  const [selectedProvider, setSelectedProvider] = useState(0);
  const [failoverMsg, setFailoverMsg] = useState('');
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeLoadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const triedProviders = useRef<Set<number>>(new Set());
  const playerRef = useRef<HTMLDivElement>(null);
  // Smart failover chain state (pre-fetched top-3 from scoring engine)
  const [failoverChain, setFailoverChain] = useState<Array<{ provider: string; url: string; score: number; tier: number }>>([]);
  const [chainIndex, setChainIndex] = useState(0);
  const [chainExhausted, setChainExhausted] = useState(false);

  // Wake Lock - keep screen awake during video playback
  useWakeLock(playing);

  // Keyboard shortcuts (only active when player is open) — must be before early return
  const DETAIL_TABS: [string, string][] = [['episodes', 'Episodes'], ['details', 'Details'], ['cast', 'Cast'], ['trailers', 'Trailers'], ['comments', 'Comments'], ['related', 'More Like This']];

  /** Update the URL to reflect the current season/episode for SEO crawlability. */
  const syncEpisodeUrl = useCallback((s: number, e: number) => {
    const epUrl = `/details/${showId}/season/${s}/episode/${e}`;
    router.replace(epUrl, { scroll: false });
  }, [showId, router]);

  useKeyboardShortcuts(true, {
    onTogglePlayPause: () => { if (playing) setPlaying(p => !p); else { vibrateLong(); setPlaying(true); } },
    onToggleFullscreen: () => { if (playing) playerRef.current?.requestFullscreen?.(); },
    onExit: () => { if (playing) setPlaying(false); },
    onPreviousEpisode: () => { if (epIdx > 1) { const ne = epIdx - 1; setEpIdx(ne); setPlaying(true); syncEpisodeUrl(season, ne); } },
    onNextEpisode: () => { const maxEp = seasonEpisodes.length > 0 ? seasonEpisodes.length : show.eps; if (epIdx < maxEp) { const ne = epIdx + 1; setEpIdx(ne); setPlaying(true); syncEpisodeUrl(season, ne); } },
    onJumpToEpisode: (n) => { if (n <= seasonEpisodes.length) { setEpIdx(n); setPlaying(true); syncEpisodeUrl(season, n); } },
    onToggleSubtitles: () => {},
    onSwitchProvider: () => { if (!playing) return; if (failoverChain.length > 1 && chainIndex < failoverChain.length - 1) { const next = chainIndex + 1; setChainIndex(next); setSelectedProvider(next); setFailoverMsg(`Switching to ${failoverChain[next]?.provider}...`); setTimeout(() => setFailoverMsg(''), 3000); } else if (providers.length > 1) { const next = (selectedProvider + 1) % providers.length; setSelectedProvider(next); triedProviders.current.add(next); } },
    onPopOutPip: () => { if (playing && show && activeProviderUrl) { setPlaying(false); openPip(activeProviderUrl, show.title, show.media_type === 'tv' ? `S${season} E${epIdx}` : '', { bg: CS[show.cs].bg, acc: CS[show.cs].acc }, show.id); } },
    onNextSeason: () => { const maxSeason = show?.media_type === 'tv' ? Math.ceil((show?.eps || 12) / 12) : 1; if (season < maxSeason) { const ns = season + 1; setSeason(ns); setEpIdx(1); syncEpisodeUrl(ns, 1); } },
    onPreviousSeason: () => { if (season > 1) { const ns = season - 1; setSeason(ns); setEpIdx(1); syncEpisodeUrl(ns, 1); } },
    onToggleWatchlist: () => toggleWatchlist(),
    onGoBack: () => router.back(),
    onNextTab: () => { const tabs = DETAIL_TABS.map(t => t[0]); const ci = tabs.indexOf(tab); if (ci < tabs.length - 1) setTab(tabs[ci + 1]); },
    onPrevTab: () => { const tabs = DETAIL_TABS.map(t => t[0]); const ci = tabs.indexOf(tab); if (ci > 0) setTab(tabs[ci - 1]); },
    onScrollToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
  });

  // If show came from SSR, seed fullDetails with initial credits/similar
  useEffect(() => {
    if (initialShow && !fullDetails) {
      /* eslint-disable react-hooks/set-state-in-effect -- seed SSR data into state */
      setFullDetails({
        id: initialShow.id,
        credits: initialCredits.length > 0 ? { cast: initialCredits } : undefined,
        similar: initialSimilar.length > 0 ? { results: initialSimilar as unknown as TMDBShow[] } : undefined,
      });
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [initialShow?.id]);

  // Check watchlist + rating state
  useEffect(() => {
    if (!show || !user || !profile) {
      /* eslint-disable react-hooks/set-state-in-effect -- clear state when user/show unavailable */
      setInWatchlist(false); setUserRating(null);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    let cancelled = false;
    const mediaType = show.media_type || 'tv';
    (async () => {
      try {
        const { isInWatchlist } = await import('@/actions/watchlist');
        const { getRating } = await import('@/actions/ratings');
        const [wl, rt] = await Promise.all([
          isInWatchlist(profile.id, show.id, mediaType as 'movie' | 'tv').catch(() => false),
          getRating(profile.id, show.id, mediaType as 'movie' | 'tv').catch(() => null),
        ]);
        if (!cancelled) { setInWatchlist(wl); setUserRating(rt); }
      } catch { setInWatchlist(false); setUserRating(null); }
    })();
    return () => { cancelled = true; };
  }, [show?.id, user, profile]);

  // Fetch full details (only if not already seeded from SSR, and not AniList)
  useEffect(() => {
    if (!show) return;
    // AniList items already have all data from SSR — skip TMDB fetch
    if (show._isAnilist) return;    const mediaType = show.media_type || 'tv';
    const id = show.id;
    if (fullDetails?.id === id) return;
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      setSeason(1); setEpIdx(1); setLoadingDetails(true);
      try {
        const res = await fetch(`/api/tmdb?endpoint=/${mediaType}/${id}&append_to_response=credits,similar,videos,content_ratings`, { signal: controller.signal });
        const data = await res.json();
        if (!cancelled) { setFullDetails(data); setLoadingDetails(false); }
      } catch { if (!cancelled) setLoadingDetails(false); }
    };
    load();
    return () => { cancelled = true; controller.abort(); };
  }, [show?.id, show?._isAnilist]);

  // Fetch season episodes (TMDB only — AniList items don't have TMDB season data)
  useEffect(() => {
    if (!show || show.media_type !== 'tv' || show._isAnilist) return;    const id = show.id;
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      setLoadingSeason(true);
      try {
        const res = await fetch(`/api/tmdb?endpoint=/tv/${id}/season/${season}`, { signal: controller.signal });
        const data = await res.json();
        if (!cancelled) { setSeasonEpisodes(data.episodes || []); setLoadingSeason(false); }
      } catch { if (!cancelled) { setSeasonEpisodes([]); setLoadingSeason(false); } }
    };
    load();
    return () => { cancelled = true; controller.abort(); };
  }, [show?.id, season, show?._isAnilist]);
  // Fetch embed providers — smart mode (returns chain for auto-failover)
  useEffect(() => {
    if (!playing || !show) return;
    setLoadingProviders(true);
    const mediaType = show.media_type || 'tv';
    const malId = show._malId;
    const isAnime = !!show._isAnilist || !!malId || show.genre.some(g => g.toLowerCase() === 'anime');
    // For TMDB lookup, use original ID (not namespaced AniList ID)
    const tmdbLookupId = show._isAnilist ? 0 : showId;
    const params = new URLSearchParams({
      tmdb: String(tmdbLookupId),
      type: mediaType,
      season: String(season),
      episode: String(epIdx),
      mode: 'smart',
    });
    if (malId) params.set('mal', String(malId));
    if (isAnime) params.set('isAnime', 'true');
    fetch(`/api/embed?${params}`)
      .then(r => r.json())
      .then(data => {
        setLoadingProviders(false);
        // Smart mode: use chain for failover, populate providers for dropdown
        if (data.chain && data.chain.length > 0) {
          setFailoverChain(data.chain);
          setChainIndex(0);
          setChainExhausted(false);
          // Also populate providers dropdown from chain
          setProviders(data.chain.map((c: { provider: string; url: string; score: number; tier: number }) => ({ name: c.provider, url: c.url, tier: c.tier, score: c.score })));
          setSelectedProvider(0);
        } else if (data.providers) {
          // Legacy mode fallback
          setProviders(data.providers);
          setFailoverChain([]);
          setChainIndex(0);
          setSelectedProvider(0);
        }
      })
      .catch(() => { setLoadingProviders(false); setProviders([]); setFailoverChain([]); });
  }, [playing, showId, season, epIdx, show]);

  // Fetch comments
  useEffect(() => {
    if (tab !== 'comments' || !show) return;
    let cancelled = false;
    const mediaType = show.media_type || 'tv';
    const loadComments = async () => {
      if (cancelled) return;
      setCommentLoading(true);
      try {
        const res = await fetch(`/api/comments?mediaId=${show.id}&mediaType=${mediaType}`);
        const data = await res.json();
        if (!cancelled) { setComments(data.comments || []); }
      } catch { if (!cancelled) { setComments([]); } }
      if (!cancelled) setCommentLoading(false);
    };
    loadComments();
    return () => { cancelled = true; };
  }, [tab, show?.id]);

  // --- All hooks must be before any early return (React rules of hooks) ---

  // Load more similar shows (TMDB only — AniList items don't have TMDB recommendations)
  const loadMoreSimilar = useCallback(async () => {
    if (!show || show._isAnilist || loadingSimilar || !hasMoreSimilar) return;    setLoadingSimilar(true);
    try {
      const mediaType = show.media_type || 'tv';
      const res = await fetch(`/api/tmdb?endpoint=/${mediaType}/${show.id}/recommendations`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const existingIds = new Set((fullDetails?.similar?.results || []).map((r: TMDBShow) => r.id));
        const fresh = (data.results as TMDBShow[])
          .filter((r: TMDBShow) => r.poster_path && !existingIds.has(r.id))
          .map((r: TMDBShow) => tmdbToMedia({ ...r, media_type: mediaType as 'movie' | 'tv' }));
        if (fresh.length === 0) setHasMoreSimilar(false);
        if (fullDetails) {
          setFullDetails(prev => prev ? ({
            ...prev,
            similar: { results: [...(prev.similar?.results || []), ...fresh.map(f => ({
              id: f.id, poster_path: f.poster_path ?? null, backdrop_path: f.backdrop_path ?? null,
              title: f.title, name: f.title, overview: f.desc || '',
              genre_ids: [] as number[], popularity: 0,
              vote_average: f.r, vote_count: 0,
              first_air_date: f.yr?.toString() || '', release_date: f.yr?.toString() || '',
              media_type: f.media_type,
            }) as TMDBShow)] }
          }) : null);
        }
      } else {
        setHasMoreSimilar(false);
      }
    } catch { /* silent */ }
    setLoadingSimilar(false);
  }, [show?.id, show?.media_type, show?._isAnilist, loadingSimilar, hasMoreSimilar, fullDetails?.similar?.results]);

  // Computed active provider (must be before handleProviderFail which references these)
  const activeProviderUrl = failoverChain.length > 0
    ? (failoverChain[chainIndex]?.url || '')
    : (providers[selectedProvider]?.url || '');
  const activeProviderName = failoverChain.length > 0
    ? (failoverChain[chainIndex]?.provider || '')
    : (providers[selectedProvider]?.name || '');

  // Auto-failover: try next in chain (smart mode) or next provider (legacy mode)
  const handleProviderFail = useCallback(() => {
    if (!show) return;

    // Report client-side failure to server for health tracking
    if (activeProviderName) {
      fetch('/api/embed-health-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: activeProviderName, alive: false }),
      }).catch(() => {});
    }

    // Smart mode: advance along the pre-fetched failover chain
    if (failoverChain.length > 0 && !chainExhausted) {
      const nextIdx = chainIndex + 1;
      if (nextIdx < failoverChain.length) {
        setChainIndex(nextIdx);
        setSelectedProvider(nextIdx);
        const oldName = failoverChain[chainIndex]?.provider;
        const newName = failoverChain[nextIdx]?.provider;
        setFailoverMsg(`Switching from ${oldName} to ${newName}...`);
        setTimeout(() => setFailoverMsg(''), 3000);
        // Emit failover metric
        if (oldName && newName) {
          fetch('/api/embed-health-client', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: newName, alive: true }),
          }).catch(() => {});
        }
      } else {
        // Chain exhausted
        setChainExhausted(true);
        setFailoverMsg('All optimized providers unavailable. Trying fallback...');
        setTimeout(() => setFailoverMsg(''), 4000);
      }
      return;
    }

    // Legacy mode: try next provider in list
    if (providers.length > 1) {
      triedProviders.current.add(selectedProvider);
      let nextIdx = -1;
      for (let i = 1; i < providers.length; i++) {
        const candidate = (selectedProvider + i) % providers.length;
        if (!triedProviders.current.has(candidate)) {
          nextIdx = candidate;
          break;
        }
      }
      if (nextIdx >= 0) {
        const oldName = providers[selectedProvider]?.name;
        const newName = providers[nextIdx]?.name;
        setSelectedProvider(nextIdx);
        triedProviders.current.add(nextIdx);
        setFailoverMsg(`Switching from ${oldName} to ${newName}...`);
        setTimeout(() => setFailoverMsg(''), 3000);
      } else {
        setFailoverMsg('All providers unavailable. Try again later.');
        setTimeout(() => setFailoverMsg(''), 4000);
      }
    }
  }, [show?.id, providers, selectedProvider, failoverChain, chainIndex, chainExhausted, activeProviderName]);

  // Reset tried providers and chain when episode/season changes
  useEffect(() => {
    triedProviders.current.clear();
    triedProviders.current.add(selectedProvider);
    setChainIndex(0);
    setChainExhausted(false);
    setIframeLoaded(false);
  }, [epIdx, season, providers]);

  // Timeout failover: if iframe doesn't fire onLoad within 25s, auto-switch
  useEffect(() => {
    const url = activeProviderUrl;
    if (!playing || !url) return;
    if (iframeLoadTimer.current) clearTimeout(iframeLoadTimer.current);
    const timer = setTimeout(() => {
      handleProviderFail();
    }, 25000);
    iframeLoadTimer.current = timer;
    return () => { clearTimeout(timer); };
  }, [playing, activeProviderUrl, handleProviderFail]);

  if (!show) {
    return (
      <div className="page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'clamp(60px,7vw,80px)' }}>
        <div className="f-cinzel" style={{  fontSize: '1.2rem', color: 'rgba(255,245,232,.4)' }}>
          <div style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite', fontSize: '2rem', marginBottom: '1rem' }}>✦</div>
          <div>Loading show details...</div>
        </div>
      </div>
    );
  }

  const s = CS[show.cs];
  const seasons = show.media_type === 'tv'
    ? (fullDetails?.number_of_seasons || Math.ceil(show.eps / 12))
    : 1;

  const epData = seasonEpisodes.length > 0
    ? seasonEpisodes.map(e => ({ ep: e.episode_number, title: e.name, dur: e.runtime ? `${e.runtime}m` : '23m', done: false }))
    : show.epList.length > 0
    ? show.epList
    : Array.from({ length: Math.min(show.eps, 10) }, (_, i) => ({
        ep: i + 1, title: `Ep ${i + 1}: ${['Awakening', 'Hidden Path', 'The First Step', 'Into the Deep', 'Revelations', 'The Turn', 'Convergence', 'New Dawn', 'Eclipse', 'Final Light'][i] || 'Journey'}`,
        dur: `${22 + (i * 5) % 8}m`, done: i < epIdx - 1,
      }));

  // Unified trailer list — works for both TMDB and AniList items
  const trailerList: Array<{ key: string; name: string; site: string; type: string }> = (() => {
    const tmdbTrailers = (fullDetails?.videos?.results || [])
      .filter((v) => (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube')
      .map((v) => ({ key: v.key, name: v.name, site: v.site, type: v.type }));

    if (tmdbTrailers.length > 0) return tmdbTrailers;

    // AniList fallback: use the _anilistTrailer field if present
    if (show._isAnilist && show._anilistTrailer) {
      return [{ key: show._anilistTrailer.id, name: `${show.title} — Trailer`, site: 'YouTube', type: 'Trailer' }];
    }

    return [];
  })();

  const similar: MediaItem[] = fullDetails?.similar?.results && fullDetails.similar.results.length > 0
    ? fullDetails.similar.results.slice(0, 6).map((r) => tmdbToMedia(r))
    : initialSimilar.length > 0
    ? initialSimilar
    : [];

  const castList = fullDetails?.credits?.cast && fullDetails.credits.cast.length > 0
    ? fullDetails.credits.cast.slice(0, 8)
    : initialCredits.length > 0
    ? initialCredits
    : show.cast.map(name => ({ name, character: '', profile_path: null, id: 0 }));

  // Real maturity rating from TMDB
  const contentRating = fullDetails?.content_ratings?.results?.find(r => r.iso_3166_1 === 'US')?.rating
    || fullDetails?.content_ratings?.results?.[0]?.rating
    || null;

  const TABS: [string, string][] = [['episodes', 'Episodes'], ['details', 'Details'], ['cast', 'Cast'], ['trailers', 'Trailers'], ['comments', 'Comments'], ['related', 'More Like This']];

  const handlePostComment = async () => {
    if (!user || !profile || !commentText.trim() || !show) return;
    const mediaType = show.media_type || 'tv';
    setCommentSending(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, mediaId: show.id, mediaType, content: commentText.trim(), rating: reviewRating > 0 ? reviewRating * 2 : 0 }),
      });
      if (res.ok) {
        setCommentText('');
        const postedRating = reviewRating > 0 ? reviewRating * 2 : undefined;
        setReviewRating(0);
        setComments(prev => [{
          id: 'new-' + Date.now(), profile_id: profile.id, content: commentText.trim(),
          created_at: new Date().toISOString(), profile_name: profile.name || 'You', profile_avatar: profile.avatar_url,
          rating: postedRating,
        }, ...prev].sort((a, b) => {
          if (a.rating && !b.rating) return -1;
          if (!a.rating && b.rating) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }));
        triggerConfetti?.();
      }
    } catch { }
    setCommentSending(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!profile) return;
    try {
      await fetch('/api/comments', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, profileId: profile.id }),
      });
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { }
  };



  const toggleWatchlist = async () => {
    if (!user || !profile) { router.push('/login'); return; }
    const mediaType = show.media_type || 'tv';
    if (inWatchlist) {
      const { removeFromWatchlist } = await import('@/actions/watchlist');
      await removeFromWatchlist(profile.id, show.id, mediaType);
      setInWatchlist(false);
    } else {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, mediaId: show.id, mediaType, title: show.title, poster_path: show.poster_path || null, status: 'plan_to_watch' }),
      });
      setInWatchlist(true);
      triggerConfetti?.();
    }
  };

  const handleRate = async (rating: number) => {
    if (!user || !profile) { router.push('/login'); return; }
    const mediaType = show.media_type || 'tv';
    const { setRating } = await import('@/actions/ratings');
    await setRating({ profile_id: profile.id, media_id: show.id, media_type: mediaType as 'movie' | 'tv', rating });
    setUserRating(rating);
    triggerConfetti?.();
  };

  return (
    <div className="page" style={{ minHeight: '100vh' }}>
      {/* Hero backdrop */}
      <div style={{ position: 'relative', height: 'clamp(35vh,42vh,50vh)', overflow: 'hidden' }}>
        <div key={show.id} role="img" aria-label={`${show.title} backdrop`} style={{ position: 'absolute', inset: 0, background: show._isAnilist && show._anilistBanner
          ? `url(${show._anilistBanner}) center/cover no-repeat`
          : show.backdrop_path
          ? `url(${getBackdropUrl(show.backdrop_path, 'w1280')}) center/cover no-repeat`
          : `linear-gradient(135deg,${s.base} 0%,#18063A 40%,#2D1B5E 100%)`, animation: 'hero-swap .6s ease both' }}>
          {(show.backdrop_path || (show._isAnilist && show._anilistBanner)) && (            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(7,4,15,.8) 0%,rgba(7,4,15,.5) 40%,rgba(7,4,15,.7) 100%)' }} />
          )}
          <div style={{ position: 'absolute', top: '10%', left: '45%', width: 480, height: 480, borderRadius: '50%', background: `radial-gradient(circle,${s.acc}30 0%,transparent 68%)`, filter: 'blur(62px)', animation: 'aurora 12s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', fontSize: 'clamp(9rem,15vw,17rem)', opacity: .04, filter: 'blur(5px)', animation: 'float 8s ease-in-out infinite', userSelect: 'none' }}>{s.em}</div>
        </div>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130, background: 'linear-gradient(to bottom,#07040F,transparent)', zIndex: 2 }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', background: 'linear-gradient(to top,#07040F 0%,rgba(7,4,15,.82) 46%,transparent 100%)', zIndex: 2 }} />
        <button className="btn-g" onClick={() => router.back()} style={{ position: 'absolute', top: 'clamp(70px,8vw,88px)', left: 'clamp(1rem,5vw,2.5rem)', zIndex: 10, padding: '9px 18px', fontSize: '.73rem' }}>← Back</button>
        <div style={{ position: 'absolute', bottom: '6%', left: 'clamp(1rem,5vw,2.5rem)', right: 'clamp(1rem,5vw,2.5rem)', zIndex: 3, maxWidth: 'clamp(300px,60vw,1040px)' }}>
          <div className="s1" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '.65rem', alignItems: 'center' }}>
            <div className="badge-r">⭐ {show.r}</div>
            {/* Maturity rating from TMDB */}
            {contentRating && (
              <div className="f-cinzel" style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
                background: ['TV-MA','R','NC-17'].includes(contentRating) ? 'rgba(255,74,74,.12)' : ['TV-Y','TV-Y7','G','PG'].includes(contentRating) ? 'rgba(78,205,196,.12)' : 'rgba(255,179,71,.12)',
                color: ['TV-MA','R','NC-17'].includes(contentRating) ? '#FF4A4A' : ['TV-Y','TV-Y7','G','PG'].includes(contentRating) ? '#4ECDC4' : '#FFB347',
                 fontSize: '.68rem', fontWeight: 600,
                boxShadow: '3px 3px 8px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22),inset 0 1px 0 rgba(255,255,255,.05),0 0 0 1px rgba(255,255,255,.08)',
              }}>{contentRating}</div>
            )}
            {show.genre.slice(0, 3).map(g => <span key={g} className="gtag">{g}</span>)}
            <span className="f-cinzel" style={{ fontSize: '.68rem', color: 'rgba(255,245,232,.38)', alignSelf: 'center', }}>{show.yr} · {show.media_type === 'tv' ? `${show.eps} eps` : `${show.eps} min`} · {show.st}</span>
          </div>
          <h1 className="s2 f-cinzel-dec" style={{  fontWeight: 900, fontSize: 'clamp(1.4rem,3.5vw,2.8rem)', background: `linear-gradient(135deg,#FFF 0%,${s.acc} 65%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 4, lineHeight: 1.1 }}>{show.title}</h1>
          <p className="s3 f-cinzel" style={{  fontSize: '.82rem', color: 'rgba(255,245,232,.48)', letterSpacing: '.05em' }}>{show.sub}</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '1.2rem clamp(1rem,5vw,2.5rem)', position: 'relative', zIndex: 3, maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '.85rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button className="btn-p" onClick={() => { vibrateLong(); setPlaying(true); }}>▶ Play {show.media_type === 'tv' ? `Episode ${epIdx}` : 'Now'}</button>
          {trailerList.length > 0 && (
            <button className="btn-g" onClick={() => setShowTrailer(true)} style={{ opacity: 0.9 }}>
              ▶ Trailer
            </button>
          )}
          <button className="btn-g" onClick={toggleWatchlist} style={{ opacity: inWatchlist ? 1 : 0.85 }}>
            {inWatchlist ? '✓ In My List' : '+ My List'}
          </button>
          <ShareButton title={show.title} id={show.id} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button className="f-cinzel" key={n} onClick={() => handleRate(n)} aria-label={'Rate ' + n + ' out of 10'} style={{
                width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
                 fontSize: '.6rem', fontWeight: 600,
                background: userRating === n ? 'linear-gradient(135deg,#FFE566,#FFB347)' : '#090716',
                color: userRating === n ? '#05020A' : 'rgba(255,245,232,.45)',
                boxShadow: userRating === n ? '0 0 0 2px rgba(255,179,71,.35),0 3px 12px rgba(255,140,0,.35),inset 0 1.5px 0 rgba(255,255,255,.3)' : '5px 5px 12px rgba(0,0,0,.65),-2px -2px 6px rgba(45,25,90,.2),inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(0,0,0,.12),0 0 0 1px rgba(255,255,255,.04)',
                transition: 'all .22s cubic-bezier(.34,1.56,.64,1)',
              }}>{n}</button>
            ))}
            {userRating && <span className="f-cinzel" style={{ fontSize: '.68rem', color: 'rgba(255,179,71,.6)',  marginLeft: 6 }}>Your rating: {userRating}</span>}
          </div>
        </div>

        <section aria-label="Synopsis" className="neo-raised" style={{ padding: '1.4rem 1.6rem', borderRadius: 16, marginBottom: '2rem' }}>
          <h2 className="f-cinzel" style={{  fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>SYNOPSIS</h2>
          <p className="f-crimson" style={{  lineHeight: 1.85, color: 'rgba(255,245,232,.8)', fontSize: 'clamp(.95rem,1.2vw,1.05rem)' }}>{show.desc}</p>
        </section>

        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.06)', marginBottom: '1.8rem', gap: 0 }}>
          {TABS.map(([tabId, lbl]) => (
            <button key={tabId} className={`tab-btn${tab === tabId ? ' on' : ''}`} onClick={() => setTab(tabId)} style={{ padding: '11px 20px', background: 'none', border: 'none', outline: 'none', color: tab === tabId ? 'var(--gold)' : 'rgba(255,245,232,.35)', transition: 'color .22s' }}>{lbl}</button>
          ))}
        </div>

        {tab === 'episodes' && (
          <div>
            {show.media_type === 'tv' && seasons > 1 && (
              <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.2rem' }}>
                {Array.from({ length: Math.min(seasons, 10) }, (_, i) => (
                  <button className="f-cinzel" key={i} onClick={() => { const ns = i + 1; setSeason(ns); setEpIdx(1); syncEpisodeUrl(ns, 1); }} style={{ padding: '6px 14px', borderRadius: 20, border: 'none',  fontSize: '.7rem', fontWeight: 600, cursor: 'pointer', background: season === i + 1 ? s.acc : '#090716', color: season === i + 1 ? '#05020A' : 'rgba(255,245,232,.45)', boxShadow: season === i + 1 ? `3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22),inset 0 1.5px 0 rgba(255,255,255,.35)` : 'inset 4px 4px 10px rgba(0,0,0,.7),inset -2px -2px 5px rgba(35,20,75,.18)', transition: 'all .25s' }}>S{i + 1}</button>
                ))}
              </div>
            )}
            {loadingSeason ? (
              <div className="f-cinzel" style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,245,232,.3)',  fontSize: '.82rem', letterSpacing: '.1em' }}>Loading episodes…</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {epData.map((e, i) => {
                  const ac = epIdx === e.ep;
                  const epStill = seasonEpisodes.find(se => se.episode_number === e.ep)?.still_path;
                  return (
                    <button key={e.ep} type="button" role="button" aria-label={`Episode ${e.ep}: ${e.title}`} tabIndex={0} onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); vibrateMedium(); setEpIdx(e.ep); setPlaying(true); syncEpisodeUrl(season, e.ep); } }} className={`ep-row${ac ? ' playing' : ''}`} onClick={() => { vibrateMedium(); setEpIdx(e.ep); setPlaying(true); syncEpisodeUrl(season, e.ep); }} style={{ padding: '.9rem 1.1rem', display: 'flex', alignItems: 'center', gap: '1rem', animation: `el .4s ease ${i * 0.038}s both` }}>
                      <div style={{ width: 100, height: 60, borderRadius: 9, flexShrink: 0, background: s.bg, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '4px 4px 12px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.2)' }}>
                        {epStill && (
                          <Image src={getTmdbImageUrl(epStill, 'w300')!} alt={`${show.title} — Episode ${e.ep}${e.title ? `: ${e.title}` : ''} still`} fill style={{ objectFit: 'cover', zIndex: 0 }} sizes="100px" loading="lazy" />
                        )}
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: ac ? s.acc : 'rgba(7,4,15,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', color: ac ? '#05020A' : '#FFF5E8', position: 'relative', zIndex: 1, boxShadow: ac ? `0 0 14px ${s.acc}80,3px 3px 8px rgba(0,0,0,.6)` : '' }}>{ac ? '▶' : e.ep}</div>
                        {e.done && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${s.acc},${s.acc}88)`, boxShadow: `0 0 8px ${s.acc}` }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="f-cinzel" style={{  fontSize: '.8rem', color: ac ? '#FFF5E8' : 'rgba(255,245,232,.75)', marginBottom: 3 }}>{e.title}</div>
                        <div className="f-mono" style={{ fontSize: '.68rem', color: 'rgba(255,245,232,.35)', }}>{e.dur}{e.done ? ' · ✓' : ''}</div>
                      </div>
                      {e.done && <span style={{ fontSize: '.68rem', color: s.acc }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'details' && (
          <>
          <section aria-label="Details">
            <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>DETAILS</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
            {([
              ['Studio', fullDetails?.production_companies?.[0]?.name || 'Dream Weaver Studio'],
              ['Release', show.yr],
              ['Status', show.st],
              ['Rating', `${show.r} / 10`],
              ['Genres', show.genre.join(', ')],
              ['Seasons', show.media_type === 'tv' ? (fullDetails?.number_of_seasons || Math.ceil(show.eps / 12)) : 'N/A'],
              ['Runtime', show.media_type === 'movie' ? `${show.eps} min` : `${epData[0]?.dur || '23m'} / ep`],
            ] as const).map(([k, v], i) => (
              <div key={k} className="neo-card" style={{ padding: '14px 16px', borderRadius: 12, animation: `card-in .4s ${i * 0.045}s both` }}>
                <div className="f-cinzel" style={{  fontSize: '.62rem', color: 'rgba(255,245,232,.32)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 7 }}>{k}</div>
                <div className="f-crimson" style={{  fontSize: '1rem', color: 'rgba(255,245,232,.78)', fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
          </section>
          <section aria-label="Cast" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.25rem' }}>CAST</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {castList.map((c, i) => (
              <Link key={c.id || c.name || i} href={c.id ? `/person/${c.id}` : '#'} className="neo-card" style={{ padding: '13px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '1rem', animation: `card-in .42s ${i * 0.08}s both`, textDecoration: 'none', color: 'inherit' }}>
                {c.profile_path ? (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', boxShadow: `3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22),inset 0 1px 0 rgba(255,255,255,.1),0 0 0 1.5px ${s.acc}40` }}>
                    <Image src={getTmdbImageUrl(c.profile_path, 'w185')!} alt={c.name} width={40} height={40} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg,${s.acc}55,${s.acc}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem', boxShadow: `3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22),inset 0 1px 0 rgba(255,255,255,.1),0 0 0 1.5px ${s.acc}40` }}>🌸</div>
                )}
                <div>
                  <div className="f-cinzel" style={{  fontSize: '.78rem', color: '#FFF5E8', marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: '.68rem', color: 'rgba(255,245,232,.38)' }}>{c.character || 'Actor'}</div>
                </div>
              </Link>
            ))}
            </div>
          </section>
          </>
        )}

        {tab === 'trailers' && (
          <section aria-label="Trailers">
            <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '1rem' }}>TRAILERS</h2>
          <div>
            {trailerList.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}>
                {trailerList.slice(0, 8).map((v, i) => (
                  <div key={v.key} style={{ animation: `card-in .42s ${i * 0.06}s both` }}>
                    <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#0C091A', boxShadow: '4px 4px 12px rgba(0,0,0,.7),-2px -2px 6px rgba(45,25,90,.2)' }}>
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${v.key}?rel=0`}
                        title={v.name}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                    <div style={{ padding: '.6rem 0' }}>
                      <div className="f-cinzel" style={{  fontSize: '.72rem', color: '#FFF5E8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                      <span className="f-cinzel" style={{ fontSize: '.58rem', color: 'rgba(255,245,232,.3)', }}>{v.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="f-cinzel" style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,245,232,.3)',  fontSize: '.82rem', letterSpacing: '.1em' }}>
                <div style={{ fontSize: '2rem', marginBottom: '.8rem', opacity: .4 }}>🎬</div>
                No trailers available
              </div>
            )}
          </div>
          </section>
        )}

        {tab === 'comments' && (
          <section aria-label="Comments" className="neo-raised" style={{ padding: '1.4rem 1.6rem', borderRadius: 16 }}>
            <h2 className="f-cinzel" style={{  fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '1rem' }}>COMMENTS ({comments.length})</h2>
            {!user || !profile ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255,245,232,.35)' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '.5rem', opacity: .4 }}>🔒</div>
                <span className="f-cinzel" style={{  fontSize: '.82rem' }}>Sign in to leave a comment</span>
              </div>
            ) : (
              <div style={{ marginBottom: '1.2rem' }}>
                {/* Star rating selector */}
                <div style={{ marginBottom: '.75rem' }}>
                  <div className="f-cinzel" style={{ fontSize: '.62rem', color: 'rgba(255,245,232,.35)',  letterSpacing: '.08em', marginBottom: '.4rem' }}>YOUR RATING</div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setReviewRating(reviewRating === n ? 0 : n)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                        fontSize: '1.2rem', transition: 'transform .2s',
                        filter: n <= reviewRating ? 'none' : 'grayscale(1) opacity(.3)',
                        transform: n <= reviewRating ? 'scale(1.1)' : 'scale(1)',
                      }}>⭐</button>
                    ))}
                    {reviewRating > 0 && (
                      <span className="f-mono" style={{ fontSize: '.62rem', color: '#FFB347',  alignSelf: 'center', marginLeft: 6 }}>{reviewRating}/5</span>
                    )}
                  </div>
                </div>
                <textarea className="inp f-crimson" value={commentText} onChange={(e) => setCommentText(e.target.value.slice(0, 2000))} placeholder="Share your thoughts..." rows={3} style={{ width: '100%', resize: 'vertical',  fontSize: '.92rem', marginBottom: '.5rem', minHeight: 72 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '.6rem', color: commentText.length > 1800 ? '#FF6B8A' : 'rgba(255,245,232,.22)' }}>{commentText.length}/2000</span>
                  <button className="btn-p" onClick={handlePostComment} disabled={!commentText.trim() || commentSending} style={{ padding: '8px 20px', fontSize: '.72rem', opacity: !commentText.trim() || commentSending ? .5 : 1 }}>{commentSending ? '...' : 'Post'}</button>
                </div>
              </div>
            )}
            {commentLoading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'rgba(255,245,232,.3)' }}>Loading comments...</div>
            ) : comments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'rgba(255,245,232,.25)', fontStyle: 'italic' }}>No comments yet. Be the first to share your thoughts!</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
                {comments.map((c, i) => {
                  const isOwn = c.profile_id === profile?.id;
                  const bdr = i < comments.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none';
                  return (
                    <div key={c.id} style={{ display: 'flex', gap: '.85rem', padding: '.85rem 0', borderBottom: bdr }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: isOwn ? s.acc : '#1E1838', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.7rem', fontWeight: 700, color: isOwn ? '#05020A' : '#FFF5E8' }}>
                        {(c.profile_name || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: 4 }}>
                          <span style={{ fontSize: '.72rem', color: '#FFF5E8', fontWeight: 600 }}>{c.profile_name || 'Anonymous'}</span>
                          {c.rating && c.rating > 0 && (
                            <span className="f-mono" style={{ fontSize: '.62rem', color: '#FFB347', }}>
                              {'★'.repeat(Math.round(c.rating / 2))}{'☆'.repeat(5 - Math.round(c.rating / 2))} {(c.rating / 2).toFixed(1)}
                            </span>
                          )}
                          <span style={{ fontSize: '.58rem', color: 'rgba(255,245,232,.22)' }}>{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <p className="f-crimson" style={{  fontSize: '.88rem', color: 'rgba(255,245,232,.7)', lineHeight: 1.65, wordBreak: 'break-word' }}>{c.content}</p>
                      </div>
                      {isOwn && <button onClick={() => handleDeleteComment(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,245,232,.25)', fontSize: '.7rem', padding: 4 }}>x</button>}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'related' && (
          <section aria-label="Related shows">
            <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '1rem' }}>MORE LIKE THIS</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: '1.2rem' }}>
              {similar.map((x, i) => (
                <div key={x.id} style={{ animation: i < 12 ? `card-in .42s ${i * 0.06}s both` : 'none' }}>
                  <Card show={x} />
                </div>
              ))}
            </div>
            {hasMoreSimilar && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0 0' }}>
                <button
                  onClick={loadMoreSimilar}
                  disabled={loadingSimilar}
                  className="btn-g f-cinzel"
                  style={{ padding: '10px 28px', fontSize: '.78rem',  letterSpacing: '.06em', opacity: loadingSimilar ? 0.6 : 1, cursor: loadingSimilar ? 'wait' : 'pointer' }}
                >
                  {loadingSimilar ? '✦ Loading...' : 'Show More Similar'}
                </button>
              </div>
            )}
          </section>
        )}
        <div style={{ height: 64 }} />
      </div>

      {/* Trailer modal */}
      {showTrailer && trailerList.length > 0 && (
        <TrailerModal
          trailers={trailerList}
          showTitle={show.title}
          onClose={() => setShowTrailer(false)}
        />
      )}

      {/* Player overlay */}
{/* Player overlay — responsive 16:9 */}
      {playing && (
        <div ref={playerRef} style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fi .28s ease both' }}>
          <div style={{ position: 'absolute', inset: 0, background: s.bg, opacity: .12 }} />

          {activeProviderUrl ? (
            <>
              <div style={{ position: 'relative', width: '100vw', height: '100vh', flexShrink: 0, overflow: 'hidden' }}>
                <iframe ref={iframeRef} key={`provider-${activeProviderName}-${epIdx}`} src={activeProviderUrl} onLoad={() => {
                // Detect frame-blocking: XFO/CSP-blocked iframes load about:blank (same-origin accessible)
                try {
                  const doc = iframeRef.current?.contentDocument;
                  if (doc) {
                    // contentDocument accessible → same-origin → about:blank → BLOCKED
                    if (iframeLoadTimer.current) clearTimeout(iframeLoadTimer.current);
                    setIframeLoaded(true);
                    handleProviderFail();
                    return;
                  }
                } catch { /* cross-origin → real content loaded → success */ }
                if (iframeLoadTimer.current) clearTimeout(iframeLoadTimer.current);
                setIframeLoaded(true);
              }} onError={() => { if (iframeLoadTimer.current) clearTimeout(iframeLoadTimer.current); setIframeLoaded(true); handleProviderFail(); }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} allowFullScreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" />
                {/* Loading overlay while iframe loads */}
                {!iframeLoaded && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.85)', zIndex: 5, pointerEvents: 'none', animation: 'fi .3s ease both' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(255,255,255,.1)', borderTopColor: 'rgba(255,179,71,.8)', animation: 'spin 1s linear infinite' }} />
                    <div className="f-cinzel" style={{ marginTop: 14, fontSize: '.72rem', color: 'rgba(255,245,232,.5)', letterSpacing: '.08em' }}>Loading {activeProviderName}...</div>
                  </div>
                )}
              </div>
              {/* Failover toast */}
              {failoverMsg && (
                <div className="f-cinzel" style={{ position: 'fixed', top: 50, left: '50%', transform: 'translateX(-50%)', zIndex: 10001, padding: '8px 20px', borderRadius: 10, background: 'rgba(255,107,138,.18)', border: '1px solid rgba(255,107,138,.4)', color: '#FF6B8A',  fontSize: '.72rem', fontWeight: 600, letterSpacing: '.04em', animation: 'fi .3s ease both', whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(255,107,138,.15)' }}>
                  {failoverMsg}
                </div>
              )}
              {providers.length > 1 && (
                <div style={{ position: 'fixed', top: 60, right: 16, zIndex: 10001 }}>
                  <select className="f-cinzel" value={failoverChain.length > 0 ? chainIndex : selectedProvider} onChange={(e) => {
                    const idx = Number(e.target.value);
                    if (failoverChain.length > 0) {
                      setChainIndex(idx); setSelectedProvider(idx);
                    } else {
                      setSelectedProvider(idx); triedProviders.current.add(idx);
                    }
                  }} style={{ padding: '8px 14px', background: 'rgba(0,0,0,.8)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, color: '#FFF5E8', fontSize: '.72rem', cursor: 'pointer', outline: 'none' }}>
                    {providers.map((p, i) => (
                      <option key={i} value={i} style={{ background: '#0C091A' }}>
                        {p.name}{p.tier === 1 ? ' (T1)' : p.tier === 2 ? ' (T2)' : p.tier === 3 ? ' (T3)' : ''}{p.category === 'anime' ? ' Anime' : ''}{failoverChain.length > 0 && p.score != null ? ` [${p.score.toFixed(0)}%]` : ''}{failoverChain.length > 0 && i === chainIndex ? ' ✓' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10001, padding: '16px 24px calc(16px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(to top,rgba(0,0,0,.92) 0%,transparent 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="f-cinzel" style={{ fontSize: '.78rem', color: '#FFF5E8', marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>{show.title} {show.media_type === 'tv' ? `· S${season} E${epIdx}` : ''}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {show.media_type === 'tv' && (
                      <>
                        <button className="btn-icon" style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0 }} onClick={() => { if (epIdx > 1) { const ne = epIdx - 1; setEpIdx(ne); syncEpisodeUrl(season, ne); } }} title="Previous Episode">⏮</button>
                        <button className="btn-icon" style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0 }} onClick={() => { const maxEp = seasonEpisodes.length > 0 ? seasonEpisodes.length : show.eps; if (epIdx < maxEp) { const ne = epIdx + 1; setEpIdx(ne); syncEpisodeUrl(season, ne); } }} title="Next Episode">⏭</button>
                      </>
                    )}
                    <button className="btn-g" onClick={() => { setPlaying(false); openPip(activeProviderUrl, show.title, show.media_type === 'tv' ? `S${season} E${epIdx}` : '', { bg: s.bg, acc: s.acc }, show.id); }} style={{ padding: '8px 14px', fontSize: '.72rem' }} title="Picture in Picture">PiP</button>
                    <button className="btn-g" onClick={() => setPlaying(false)} style={{ padding: '8px 14px', fontSize: '.72rem' }}>✕ Exit</button>
                  </div>
                </div>
              </div>
            </>
          ) : loadingProviders ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(255,255,255,.1)', borderTopColor: 'rgba(255,179,71,.8)', animation: 'spin 1s linear infinite' }} />
                <div className="f-cinzel" style={{ fontSize: '.82rem', color: 'rgba(255,245,232,.5)', letterSpacing: '.08em' }}>Finding best provider...</div>
              </div>
              <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10001, padding: '20px 24px calc(20px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(to top,rgba(0,0,0,.92) 0%,transparent 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="f-cinzel" style={{ fontSize: '.82rem', color: '#FFF5E8' }}>{show.title} · {show.media_type === 'tv' ? `Ep ${epIdx}` : 'Loading'}</div>
                  <button className="btn-g" onClick={() => setPlaying(false)} style={{ padding: '8px 18px', fontSize: '.78rem' }}>✕ Exit</button>
                </div>
              </div>
            </>
          ) : chainExhausted ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,107,138,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>!</div>
                <div className="f-cinzel" style={{ fontSize: '.9rem', color: 'rgba(255,245,232,.7)', letterSpacing: '.06em', textAlign: 'center', maxWidth: 300 }}>All providers unavailable</div>
                <button className="btn-p" onClick={() => { setChainExhausted(false); setChainIndex(0); triedProviders.current.clear(); setProviders([]); setFailoverChain([]); setLoadingProviders(true); setPlaying(false); setTimeout(() => setPlaying(true), 50); }} style={{ padding: '10px 28px', fontSize: '.82rem', marginTop: 8 }}>Retry</button>
              </div>
              <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10001, padding: '20px 24px calc(20px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(to top,rgba(0,0,0,.92) 0%,transparent 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="f-cinzel" style={{ fontSize: '.82rem', color: '#FFF5E8' }}>{show.title} · {show.media_type === 'tv' ? `Ep ${epIdx}` : 'Error'}</div>
                  <button className="btn-g" onClick={() => setPlaying(false)} style={{ padding: '8px 18px', fontSize: '.78rem' }}>✕ Exit</button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div className="f-cinzel" style={{ fontSize: '.9rem', color: 'rgba(255,245,232,.5)', letterSpacing: '.06em' }}>No sources found</div>
                <button className="btn-g" onClick={() => setPlaying(false)} style={{ padding: '10px 28px', fontSize: '.82rem' }}>Go Back</button>
              </div>
              <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10001, padding: '20px 24px calc(20px + env(safe-area-inset-bottom, 0px))', background: 'linear-gradient(to top,rgba(0,0,0,.92) 0%,transparent 100%)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="f-cinzel" style={{ fontSize: '.82rem', color: '#FFF5E8' }}>No sources found</div>
                  <button className="btn-g" onClick={() => setPlaying(false)} style={{ padding: '8px 18px', fontSize: '.78rem' }}>Exit</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
