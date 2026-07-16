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
import { personUrl } from '@/lib/slug';
import type { AniListMedia } from '@/lib/anilist/client';
import TrailerModal from '@/components/common/TrailerModal';
import IntelligentPlayer from '@/components/common/IntelligentPlayer';
import LegalDisclaimerBanner from '@/components/common/LegalDisclaimerBanner';

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
  credits?: { 
    cast: TMDBCastMember[]; 
    crew?: Array<{ id: number; name: string; job: string; department: string; profile_path: string | null }> 
  };
  similar?: { results: TMDBShow[] };
  videos?: { results: Array<{ id: string; key: string; name: string; type: string; site: string }> };
  number_of_seasons?: number;
  production_companies?: Array<{ id: number; name: string; logo_path: string | null; origin_country: string }>;
  content_ratings?: { results: Array<{ iso_3166_1: string; rating: string }> };
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  spoken_languages?: Array<{ iso_639_1: string; english_name: string; name: string }>;
  original_title?: string;
  original_name?: string;
  original_language?: string;
  tagline?: string;
  keywords?: { keywords: Array<{ id: number; name: string }> };
  images?: { backdrops: Array<{ file_path: string; iso_639_1?: string | null; aspect_ratio: number; vote_average: number }>; posters: Array<{ file_path: string; aspect_ratio: number }> };
  reviews?: { results: Array<{ id: string; author: string; author_details: { name: string; username: string; avatar_path: string | null; rating: number | null }; content: string; created_at: string; url: string }>; total_results: number };
  budget?: number;
  revenue?: number;
  homepage?: string;
  imdb_id?: string;
  watch_providers?: { results: Record<string, Array<{ provider_id: number; provider_name: string; logo_path: string | null }>> };
}

interface DetailsContentProps {
  showId: number;
  initialShow: MediaItem | null;
  initialCredits?: TMDBCastMember[];
  initialSimilar?: MediaItem[];
  initialVideos?: Array<{ id?: string; key: string; name: string; site: string; type: string }>;
  initialCrew?: Array<{ id: number; name: string; job: string; department: string; profile_path: string | null }>;
  initialKeywords?: string[];
  initialImages?: { backdrops: Array<{ file_path: string; iso_639_1?: string | null; aspect_ratio: number; vote_average: number }>; posters: Array<{ file_path: string; aspect_ratio: number }> } | null;
  initialReviews?: Array<{ id: string; author: string; author_details: { name: string; username: string; avatar_path: string | null; rating: number | null }; content: string; created_at: string; url: string }>;
  /** Pre-selected season (from episode URL route) */
  defaultSeason?: number;
  /** Pre-selected episode (from episode URL route) */
  defaultEpisode?: number;
  initialAnilistDetail?: AniListMedia | null;
}

export default function DetailsContent({ 
  showId, initialShow, initialCredits = [], initialSimilar = [], initialVideos = [], 
  initialCrew = [], initialKeywords = [], initialImages = null, initialReviews = [],
  defaultSeason, defaultEpisode, initialAnilistDetail
}: DetailsContentProps) {
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
  const [anilistDetail, setAnilistDetail] = useState<AniListMedia | null>(initialAnilistDetail || null);
  const [tmdbReviews, setTmdbReviews] = useState(initialReviews);
  const [galleryImages, setGalleryImages] = useState(initialImages);
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [seasonEpisodes, setSeasonEpisodes] = useState<TMDBSeasonEpisode[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [hasMoreSimilar, setHasMoreSimilar] = useState(true);
  const [providers, setProviders] = useState<Array<{ name: string; url: string; tier?: number; category?: string; score?: number; proxied?: boolean }>>([]);
  const [selectedProvider, setSelectedProvider] = useState(0);
  const [failoverMsg, setFailoverMsg] = useState('');
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerPlaying, setTrailerPlaying] = useState(false);
  const [youtubeTrailers, setYoutubeTrailers] = useState<Array<{ key: string; name: string; site: string; type: string }>>([]);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeLoadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const iframeLoadedRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const triedProviders = useRef<Set<number>>(new Set());
  const playerRef = useRef<HTMLDivElement>(null);
  // Smart failover chain state (pre-fetched top-3 from scoring engine)
  const [failoverChain, setFailoverChain] = useState<Array<{ provider: string; url: string; score: number; tier: number }>>([]);
  const [chainIndex, setChainIndex] = useState(0);
  const [chainExhausted, setChainExhausted] = useState(false);

  // Wake Lock - keep screen awake during video playback
  useWakeLock(playing);

  // Lock body scroll when player is open to prevent background scrolling
  useEffect(() => {
    if (playing) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [playing]);

  // Keyboard shortcuts (only active when player is open) — must be before early return
  const DETAIL_TABS: [string, string][] = [['episodes', 'Episodes'], ['details', 'Details'], ['cast', 'Cast'], ['gallery', 'Gallery'], ['trailers', 'Trailers'], ['comments', 'Comments'], ['related', 'More Like This']];

  /** Update the URL to reflect the current season/episode for SEO crawlability. */
  const syncEpisodeUrl = useCallback((s: number, e: number) => {
    const epUrl = `/details/${showId}/season/${s}/episode/${e}`;
    router.replace(epUrl, { scroll: false });
  }, [showId, router]);

  useKeyboardShortcuts(true, {
    onTogglePlayPause: () => { if (playing) {
      // Bug #17: Space/K should send play/pause to iframe, not close the player
      try {
      const iframe = document.querySelector('.intelligent-player-iframe') as HTMLIFrameElement | null;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'lumina:togglePlayPause' }, '*');
      }
      } catch { /* cross-origin */ }
    } else { vibrateLong(); setPlaying(true); } },
    onToggleFullscreen: () => { if (playing) playerRef.current?.requestFullscreen?.(); },
    onExit: () => { if (playing) setPlaying(false); },
    onPreviousEpisode: () => { if (epIdx > 1) { const ne = epIdx - 1; setEpIdx(ne); setPlaying(true); syncEpisodeUrl(season, ne); } },
    onNextEpisode: () => { const maxEp = seasonEpisodes.length > 0 ? seasonEpisodes.length : (show?.eps ?? 10); if (epIdx < maxEp) { const ne = epIdx + 1; setEpIdx(ne); setPlaying(true); syncEpisodeUrl(season, ne); } },
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

  // If show came from SSR, seed fullDetails with initial credits/similar/videos
  useEffect(() => {
    if (initialShow && !fullDetails) {
      setFullDetails({
        id: initialShow.id,
        credits: initialCredits.length > 0 ? { cast: initialCredits, crew: initialCrew.length > 0 ? initialCrew : undefined } : undefined,
        similar: initialSimilar.length > 0 ? { results: initialSimilar as unknown as TMDBShow[] } : undefined,
        videos: initialVideos.length > 0 ? { results: initialVideos.map(v => ({ ...v, id: v.id || '' })) } : undefined,
      });
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
    if (show._isAnilist) return;
    const mediaType = show.media_type || 'tv';
    const id = show.id;
    // Skip if we already have videos from SSR seed (the critical trailer data)
    if (fullDetails?.videos?.results?.length) return;
    let cancelled = false;
    const controller = new AbortController();
    const load = async () => {
      // Bug #29: Respect URL-driven defaults instead of always resetting to S1E1
      setSeason(defaultSeason || 1); setEpIdx(defaultEpisode || 1); setLoadingDetails(true);
      try {
        const res = await fetch(`/api/tmdb?endpoint=/${mediaType}/${id}&append_to_response=credits,similar,videos,content_ratings,keywords,reviews,images,watch/providers`, { signal: controller.signal });
        const data = await res.json();
        if (!cancelled) {
          setFullDetails(data);
          if (data.reviews?.results) setTmdbReviews(data.reviews.results.slice(0, 5));
          if (data.images) setGalleryImages(data.images);
          if (data.keywords?.keywords) setKeywords(data.keywords.keywords.map((k: { name: string }) => k.name));
          // Fallback: if append_to_response didn't return videos, fetch separately
          if (!data.videos?.results?.length) {
            fetch(`/api/tmdb?endpoint=/${mediaType}/${id}/videos`, { signal: controller.signal })
              .then(r => r.json())
              .then(vidData => {
                if (!cancelled && vidData?.results?.length) {
                  setFullDetails(prev => prev ? { ...prev, videos: vidData } : prev);
                }
              })
              .catch(() => {});
          }
          setLoadingDetails(false);
        }
      } catch { if (!cancelled) setLoadingDetails(false); }
    };
    load();
    return () => { cancelled = true; controller.abort(); };
  }, [show?.id, show?._isAnilist]);

  // Fetch YouTube trailers for AniList items (TMDB fetch is skipped for them)
  useEffect(() => {
    if (!show) return;
    if (!show._isAnilist) return;
    // If AniList provided a trailer, use it directly — no fetch needed
    if (show._anilistTrailer) return;
    // Try TMDB videos endpoint using the show's TMDB ID if available
    const tmdbId = show.id;
    if (!tmdbId || tmdbId < 1) return;
    const mediaType = show.media_type || 'tv';
    let cancelled = false;
    const controller = new AbortController();
    fetch(`/api/tmdb?endpoint=/${mediaType}/${tmdbId}/videos`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (!cancelled && data?.results?.length) {
          setYoutubeTrailers(
            data.results
              .filter((v: { type: string; site: string }) => (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube')
              .map((v: { key: string; name: string; site: string; type: string }) => ({ key: v.key, name: v.name, site: v.site, type: v.type }))
          );
        }
      })
      .catch(() => {});
    return () => { cancelled = true; controller.abort(); };
  }, [show?.id, show?._isAnilist, show?._anilistTrailer]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag before async fetch
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
    if (show._anilistId) params.set('anilist', String(show._anilistId));
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
          // Also populate providers dropdown from chain (include category for grouping)
          setProviders(data.chain.map((c: { provider: string; url: string; score: number; tier: number; category: string }) => ({ name: c.provider, url: c.url, tier: c.tier, score: c.score, category: c.category })));
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

  // Helper: send postMessage to the IntelligentPlayer iframe for playback control
  const postToPlayerIframe = useCallback((msg: Record<string, unknown>) => {
    try {
      const iframe = document.querySelector('.intelligent-player-iframe') as HTMLIFrameElement | null;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(msg, '*');
      }
    } catch { /* cross-origin iframe — ignore */ }
  }, []);

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

  // Bug #13: Keep a ref to handleProviderFail so the timeout always calls the latest version
  const handleProviderFailRef = useRef(handleProviderFail);
  useEffect(() => {
    handleProviderFailRef.current = handleProviderFail;
  });

  // Reset chain state when episode/season/providers change.
  // These state resets must happen in an effect because they depend on
  // external state (epIdx, season, providers) and the React 19 lint rules
  // prohibit accessing refs during render. Using a key-based component reset
  // would require wrapping the entire player in a sub-component.
  useEffect(() => {
    triedProviders.current.clear();
    triedProviders.current.add(selectedProvider);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset when episode/season changes
    setChainIndex(0);
    setChainExhausted(false);
  }, [epIdx, season, providers.length]);

  // Reset iframeLoaded when the active provider URL changes
  useEffect(() => {
    iframeLoadedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset on provider switch
    setIframeLoaded(false);
  }, [activeProviderUrl]);

  // Timeout failover: if iframe doesn't fire onLoad within 15s, auto-switch
  // Reduced from 25s — most providers load in 3-5s; if they haven't
  // loaded by 15s, they're likely dead/stuck and the user should see
  // the next provider quickly rather than staring at a blank screen.
  useEffect(() => {
    const url = activeProviderUrl;
    if (!playing || !url) return;
    // loaded state is already reset in render phase above (prevUrlRef)
    if (iframeLoadTimer.current) clearTimeout(iframeLoadTimer.current);
    const timer = setTimeout(() => {
      // Only failover if iframe hasn't reported a successful load yet
      if (!iframeLoadedRef.current) {
        handleProviderFailRef.current();
      }
    }, 15000);
    iframeLoadTimer.current = timer;
    return () => { clearTimeout(timer); };
  }, [playing, activeProviderUrl]);

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
    ? (fullDetails?.number_of_seasons || (show._isAnilist ? 1 : 0))
    : 0;

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
    // Source 1: TMDB append_to_response or fallback video fetch
    const tmdbTrailers = (fullDetails?.videos?.results || [])
      .filter((v) => (v.type === 'Trailer' || v.type === 'Teaser') && v.site === 'YouTube')
      .map((v) => ({ key: v.key, name: v.name, site: v.site, type: v.type }));

    if (tmdbTrailers.length > 0) return tmdbTrailers;

    // Source 2: AniList trailer field
    if (show._isAnilist && show._anilistTrailer) {
      return [{ key: show._anilistTrailer.id, name: `${show.title} — Trailer`, site: 'YouTube', type: 'Trailer' }];
    }

    // Source 3: Fallback video fetch for AniList items with TMDB ID
    if (youtubeTrailers.length > 0) return youtubeTrailers;

    return [];
  })();

  // YouTube search URL for when no trailers are found
  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(show.title + ' official trailer')}`;

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

  const TABS: [string, string][] = [['episodes', 'Episodes'], ['details', 'Details'], ['cast', 'Cast'], ['gallery', 'Gallery'], ['trailers', 'Trailers'], ['comments', 'Comments'], ['related', 'More Like This']];

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

        {/* Inline trailer embed — click-to-play thumbnail instead of eager iframe */}
        {trailerList.length > 0 && (
          <div style={{ marginBottom: '2rem', animation: 'el .5s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.85rem' }}>
              <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc }}>TRAILER</h2>
              <span className="f-cinzel" style={{ fontSize: '.52rem', color: 'rgba(255,179,71,.5)', letterSpacing: '.08em', background: 'rgba(255,179,71,.08)', padding: '2px 8px', borderRadius: 4 }}>4K</span>
            </div>
            <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 14, overflow: 'hidden', background: '#000', boxShadow: '6px 6px 24px rgba(0,0,0,.8), -2px -2px 8px rgba(45,25,90,.15), 0 0 0 1px rgba(255,255,255,.04)', cursor: 'pointer' }} onClick={() => setTrailerPlaying(true)}>
              {trailerPlaying ? (
                <iframe
                  src={`https://www.youtube.com/embed/${trailerList[0].key}?rel=0&vq=hd2160&modestbranding=1&autoplay=1`}
                  title={`${show.title} Trailer`}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                />
              ) : (
                <>
                  <Image
                    src={getYoutubeThumbnail(trailerList[0].key, 'maxresdefault')}
                    alt={`${show.title} official trailer — click to play HD video`}
                    fill
                    sizes="(max-width: 768px) 100vw, 80vw"
                    priority={false}
                    style={{ objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.35)' }}>
                    <div style={{ width: 68, height: 48, borderRadius: 12, background: 'rgba(255,179,71,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(255,140,0,.5)' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M8 5v14l11-7z" fill="#05020A" /></svg>
                    </div>
                  </div>
                </>
              )}
            </div>
            {trailerList.length > 1 && (
              <div style={{ marginTop: '.6rem', textAlign: 'center' }}>
                <button className="btn-g" onClick={() => setShowTrailer(true)} style={{ fontSize: '.72rem', padding: '6px 16px' }}>
                  +{trailerList.length - 1} more trailer{trailerList.length > 2 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        )}
        {!trailerList.length && !loadingDetails && (
          <div style={{ marginBottom: '2rem', textAlign: 'center', padding: '1rem 0' }}>
            <a
              href={youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-g"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: '.78rem', textDecoration: 'none', color: '#FFF5E8' }}
            >
              ▶ Watch Trailer on YouTube
            </a>
          </div>
        )}

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
          {/* ANIME-SPECIFIC DETAILS */}
          {show._isAnilist && anilistDetail && (
            <>
            <section aria-label="Anime Information" style={{ marginBottom: '1.5rem' }}>
              <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>ANIME INFORMATION</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
                {(() => {
                  const d = anilistDetail;
                  const seasonNames: Record<string, string> = { WINTER: 'Winter', SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall' };
                  const sourceNames: Record<string, string> = { MANGA: 'Manga', LIGHT_NOVEL: 'Light Novel', VISUAL_NOVEL: 'Visual Novel', VIDEO_GAME: 'Video Game', ORIGINAL: 'Original', NOVEL: 'Novel', ONE_SHOT: 'One Shot', WEB_NOVEL: 'Web Novel', WEB_MANGA: 'Web Manga', MUSIC: 'Music', GAME: 'Game', MIXED_MEDIA: 'Mixed Media', OTHER: 'Other', DOUJINSHI: 'Doujinshi', PICTURE_BOOK: 'Picture Book', COMIC: 'Comic', ANIME: 'Anime' };
                  const animStudios = d.studios?.nodes?.filter(st => st.isAnimationStudio).map(st => st.name) || [];
                  const allStudios = d.studios?.nodes?.map(st => st.name) || [];
                  const startDate = d.startDate;
                  const endDate = d.endDate;
                  const formatDate = (date: { year: number | null; month: number | null; day: number | null } | null) => {
                    if (!date?.year) return 'TBA';
                    const parts = [date.year, date.month ? String(date.month).padStart(2, '0') : null, date.day ? String(date.day).padStart(2, '0') : null].filter(Boolean);
                    return parts.join('-');
                  };

                  const seasonStr = d.season ? `${seasonNames[d.season] || d.season} ${d.seasonYear || d.startDate?.year || ''}`.trim() : 'N/A';
                  const airDatesStr = (() => {
                    const start = formatDate(startDate);
                    if (endDate?.year) return start + ' → ' + formatDate(endDate);
                    if (startDate?.year) return start + ' → Present';
                    return start;
                  })();

                  const animeGrid: [string, string][] = [
                    ['Japanese Title', d.title.native || 'N/A'],
                    ['English Title', d.title.english || 'N/A'],
                    ['Romaji', d.title.romaji || 'N/A'],
                    ['Studio', animStudios.length > 0 ? animStudios.join(', ') : (allStudios.length > 0 ? allStudios.join(', ') : 'N/A')],
                    ['Season', seasonStr],
                    ['Episodes', d.episodes ? String(d.episodes) : 'N/A'],
                    ['Duration', d.duration ? `${d.duration} min/ep` : 'N/A'],
                    ['Air Dates', airDatesStr || 'N/A'],
                    ['Source', d.source ? (sourceNames[d.source] || d.source) : 'N/A'],
                    ['Status', d.status ? d.status.replace(/_/g, ' ') : 'N/A'],
                    ['Rating', d.meanScore ? `${(d.meanScore / 10).toFixed(1)} / 10` : 'N/A'],
                    ['Genres', d.genres?.join(', ') || 'N/A'],
                    ['Format', d.format ? d.format.replace(/_/g, ' ') : 'N/A'],
                    ['Popularity', d.popularity ? d.popularity.toLocaleString() : 'N/A'],
                    ['Favourites', d.favourites ? d.favourites.toLocaleString() : 'N/A'],
                  ];

                  return animeGrid.map(([k, v], i) => (
                    <div key={k} className="neo-card" style={{ padding: '14px 16px', borderRadius: 12, animation: `card-in .4s ${i * 0.04}s both` }}>
                      <div className="f-cinzel" style={{ fontSize: '.62rem', color: 'rgba(255,245,232,.32)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 7 }}>{k}</div>
                      <div className="f-crimson" style={{ fontSize: '1rem', color: 'rgba(255,245,232,.78)', fontWeight: 600 }}>{v}</div>
                    </div>
                  ));
                })()}
              </div>
            </section>

            {/* STAFF SECTION */}
            {anilistDetail.staff?.edges && anilistDetail.staff.edges.length > 0 && (
              <section aria-label="Staff" style={{ marginTop: '1.5rem' }}>
                <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>STAFF</h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {anilistDetail.staff.edges.slice(0, 12).map((edge, i) => (
                    <div key={edge.node.id} className="neo-card" style={{ padding: '13px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '1rem', animation: `card-in .42s ${i * 0.06}s both` }}>
                      {edge.node.image?.medium ? (
                        <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', boxShadow: `3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22),inset 0 1px 0 rgba(255,255,255,.1),0 0 0 1.5px ${s.acc}40` }}>
                          <Image src={edge.node.image.medium} alt={`${edge.node.name?.full || 'Staff member'} — ${edge.role || 'staff'} for ${show.title}`} width={40} height={40} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg,${s.acc}55,${s.acc}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem', boxShadow: `0 0 0 1.5px ${s.acc}40` }}>👤</div>
                      )}
                      <div>
                        <div className="f-cinzel" style={{ fontSize: '.78rem', color: '#FFF5E8', marginBottom: 2 }}>{edge.node.name?.full || 'Unknown'}</div>
                        <div style={{ fontSize: '.68rem', color: 'rgba(255,245,232,.38)' }}>{edge.role || 'Staff'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* CHARACTERS & VOICE ACTORS SECTION */}
            {anilistDetail.characters?.edges && anilistDetail.characters.edges.length > 0 && (
              <section aria-label="Characters" style={{ marginTop: '1.5rem' }}>
                <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>CHARACTERS &amp; VOICE ACTORS</h2>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {anilistDetail.characters.edges.slice(0, 15).map((edge, i) => {
                    const va = edge.voiceActors?.[0];
                    return (
                      <div key={edge.node.id} className="neo-card" style={{ padding: '13px 16px', borderRadius: 12, minWidth: 180, maxWidth: 240, animation: `card-in .42s ${i * 0.05}s both` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginBottom: 6 }}>
                          {edge.node.image?.medium ? (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, boxShadow: `0 0 0 1px ${s.acc}30` }}>
                              <Image src={edge.node.image.medium} alt={`${edge.node.name?.full || 'Character'} in ${show.title}`} width={36} height={36} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg,${s.acc}55,${s.acc}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', flexShrink: 0 }}>👤</div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div className="f-cinzel" style={{ fontSize: '.78rem', color: '#FFF5E8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{edge.node.name?.full || 'Unknown'}</div>
                            <div style={{ fontSize: '.62rem', color: 'rgba(255,245,232,.35)' }}>{edge.role || 'Main'}</div>
                          </div>
                        </div>
                        {va && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', paddingLeft: '.3rem' }}>
                            {va.image?.medium ? (
                              <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, opacity: .7 }}>
                                <Image src={va.image.medium} alt={`${va.name?.full || 'Voice actor'} — Japanese voice cast for ${show.title}`} width={22} height={22} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ) : null}
                            <div style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.4)' }}>
                              <span style={{ color: s.acc }}>VA:</span> {va.name?.full || 'Unknown'}{va.languageV2 ? ` (${va.languageV2})` : ''}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* RELATED ANIME (Sequels, Prequels, Spin-offs) */}
            {anilistDetail.relations?.edges && anilistDetail.relations.edges.length > 0 && (
              <section aria-label="Related Anime" style={{ marginTop: '1.5rem' }}>
                <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>RELATED ANIME</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                  {anilistDetail.relations.edges.map((edge, i) => {
                    const rel = edge.node;
                    const title = rel.title?.english || rel.title?.romaji || rel.title?.native || 'Unknown';
                    const cover = rel.coverImage?.extraLarge || rel.coverImage?.large;
                    return (
                      <Link key={rel.id} href={`/anime/${encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120))}-${rel.id + 100000000}`} className="neo-card" style={{ display: 'flex', gap: '1rem', padding: 14, borderRadius: 12, textDecoration: 'none', color: 'inherit', animation: `card-in .42s ${i * 0.05}s both` }}>
                        {cover ? (
                          <div style={{ width: 60, height: 85, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#0C091A' }}>
                            <Image src={cover} alt={`${title} — ${edge.relationType.replace(/_/g, ' ')} of ${show.title}`} width={60} height={85} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : (
                          <div style={{ width: 60, height: 85, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg,#1E1838,#0C091A)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', opacity: .4 }}>🎬</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="f-cinzel" style={{ fontSize: '.78rem', color: '#FFF5E8', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
                          <div style={{ fontSize: '.62rem', color: 'rgba(255,245,232,.35)', marginBottom: 2 }}>{edge.relationType.replace(/_/g, ' ')}</div>
                          {rel.format && <div style={{ fontSize: '.58rem', color: 'rgba(255,245,232,.25)' }}>{rel.format.replace(/_/g, ' ')}</div>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* EXTERNAL LINKS (streaming services, etc.) */}
            {anilistDetail.externalLinks && anilistDetail.externalLinks.length > 0 && (
              <section aria-label="External Links" style={{ marginTop: '1.5rem' }}>
                <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>EXTERNAL LINKS</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <a href={anilistDetail.siteUrl} target="_blank" rel="noopener noreferrer" className="neo-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, textDecoration: 'none', color: '#FFB347', fontSize: '.78rem' }}>
                    <span style={{ fontSize: '1rem' }}>🎌</span> AniList
                  </a>
                  {anilistDetail.externalLinks.slice(0, 10).map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="neo-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, textDecoration: 'none', color: '#FFB347', fontSize: '.78rem' }}>
                      {link.iconUrl ? <img src={link.iconUrl} alt={`${link.site} icon`} width={16} height={16} style={{ width: 16, height: 16, borderRadius: 2 }} loading="lazy" /> : <span style={{ fontSize: '1rem' }}>🔗</span>}
                      {link.site}
                    </a>
                  ))}
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(show.title + ' anime')}`} target="_blank" rel="noopener noreferrer" className="neo-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, textDecoration: 'none', color: '#FFB347', fontSize: '.78rem' }}>
                    <span style={{ fontSize: '1rem' }}>🔍</span> Google
                  </a>
                </div>
              </section>
            )}
            </>
          )}

          {/* GENERIC (NON-ANIME) DETAILS */}
          {!show._isAnilist && (
          <section aria-label="Details">
            <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>DETAILS</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 14 }}>
            {(() => {
              const crew = fullDetails?.credits?.crew || [];
              const directors = crew.filter(c => c.job === 'Director').map(c => c.name);
              const writers = crew.filter(c => c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Novel' || c.job === 'Story').map(c => c.name);
              const companies = fullDetails?.production_companies?.map(pc => pc.name).filter(Boolean) || [];
              const countries = fullDetails?.production_countries?.map(c => c.name) || [];
              const langs = fullDetails?.spoken_languages?.map(l => l.english_name || l.name) || [];
              const oTitle = fullDetails?.original_title || fullDetails?.original_name || '';
              const oLang = fullDetails?.original_language;

              const formatCurrency = (n?: number) => {
                if (!n) return 'N/A';
                if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
                if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
                if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
                return `$${n}`;
              };

              const langNames: Record<string, string> = { en: 'English', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', hi: 'Hindi', th: 'Thai', ar: 'Arabic', tr: 'Turkish', ru: 'Russian', pl: 'Polish', sv: 'Swedish', da: 'Danish', no: 'Norwegian', nl: 'Dutch', cs: 'Czech', ta: 'Tamil', te: 'Telugu', bn: 'Bengali', id: 'Indonesian', ms: 'Malay', vi: 'Vietnamese', uk: 'Ukrainian' };

              const detailsGrid: [string, string][] = [
                ['Director', directors.length > 0 ? directors.join(', ') : 'N/A'],
                ['Writers', writers.length > 0 ? writers.join(', ') : 'N/A'],
                ['Studio', companies.length > 0 ? companies.join(', ') : 'N/A'],
                ['Release', String(show.yr)],
                ['Status', show.st],
                ['Rating', `${show.r} / 10`],
                ['Genres', show.genre.join(', ')],
                ...(show.media_type === 'tv' ? ([['Seasons', String(fullDetails?.number_of_seasons || '...')]] as [string, string][]) : []),
                ...(show.media_type === 'movie' ? ([['Runtime', `${show.eps} min`]] as [string, string][]) : ([['Runtime', `${epData[0]?.dur || '23m'} / ep`]] as [string, string][])),
                ['Country', countries.length > 0 ? countries.join(', ') : 'N/A'],
                ['Language', langs.length > 0 ? langs.join(', ') : (oLang ? (langNames[oLang] || oLang.toUpperCase()) : 'N/A')],
                ...(oTitle && oTitle !== show.title ? ([['Original Title', oTitle]] as [string, string][]) : []),
                ...(oLang && oLang !== 'en' ? ([['Original Language', langNames[oLang] || oLang.toUpperCase()]] as [string, string][]) : []),
                ...(show.media_type === 'movie' ? ([['Budget', formatCurrency(fullDetails?.budget)]] as [string, string][]) : []),
                ...(show.media_type === 'movie' ? ([['Revenue', formatCurrency(fullDetails?.revenue)]] as [string, string][]) : []),
              ];

              return detailsGrid.map(([k, v], i) => (
                <div key={k} className="neo-card" style={{ padding: '14px 16px', borderRadius: 12, animation: `card-in .4s ${i * 0.045}s both` }}>
                  <div className="f-cinzel" style={{ fontSize: '.62rem', color: 'rgba(255,245,232,.32)', letterSpacing: '.16em', textTransform: 'uppercase', marginBottom: 7 }}>{k}</div>
                  <div className="f-crimson" style={{ fontSize: '1rem', color: 'rgba(255,245,232,.78)', fontWeight: 600 }}>{v}</div>
                </div>
              ));
            })()}
          </div>
          </section>
          )}

          {/* STREAMING PLATFORMS (TV shows only, non-anime) */}
          {!show._isAnilist && show.media_type === 'tv' && fullDetails?.watch_providers?.results?.US && (
            <section aria-label="Streaming Platforms" style={{ marginTop: '1.5rem' }}>
              <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>STREAMING PLATFORMS</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {fullDetails.watch_providers.results.US.map((prov) => (
                  <div key={prov.provider_id} className="neo-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: 12 }}>
                    {prov.logo_path ? (
                      <img src={`https://image.tmdb.org/t/p/w45${prov.logo_path}`} alt={`${prov.provider_name} streaming service logo`} width={28} height={28} style={{ width: 28, height: 28, borderRadius: 4 }} loading="lazy" />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: 4, background: `linear-gradient(135deg,${s.acc}55,${s.acc}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>📺</div>
                    )}
                    <span className="f-cinzel" style={{ fontSize: '.78rem', color: '#FFF5E8' }}>{prov.provider_name}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Keywords section */}
          {keywords.length > 0 && (
            <section aria-label="Keywords" style={{ marginTop: '1.5rem' }}>
              <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>KEYWORDS</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {keywords.slice(0, 15).map(kw => (
                  <Link key={kw} href={`/browse?genre=${encodeURIComponent(kw)}`} style={{
                    display: 'inline-block', padding: '5px 12px', borderRadius: 8,
                    fontSize: '.78rem', color: '#FFF5E8', textDecoration: 'none',
                    background: 'rgba(255,245,232,.04)', border: '1px solid rgba(255,245,232,.08)',
                    transition: 'all .22s',
                  }}>{kw}</Link>
                ))}
              </div>
            </section>
          )}

          {/* TMDB User Reviews section */}
          {tmdbReviews.length > 0 && (
            <section aria-label="TMDB Reviews" style={{ marginTop: '1.5rem' }}>
              <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>TMDB REVIEWS</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {tmdbReviews.slice(0, 3).map(rev => (
                  <div key={rev.id} className="neo-card" style={{ padding: '1.2rem 1.4rem', borderRadius: 12, animation: 'card-in .4s ease both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.6rem' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: rev.author_details?.avatar_path ? `url(https://image.tmdb.org/t/p/w185${rev.author_details.avatar_path}) center/cover no-repeat` : `linear-gradient(135deg,${s.acc}55,${s.acc}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.85rem', boxShadow: `0 0 0 1.5px ${s.acc}40`, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div className="f-cinzel" style={{ fontSize: '.82rem', color: '#FFF5E8' }}>{rev.author_details?.name || rev.author}</div>
                        <div style={{ fontSize: '.65rem', color: 'rgba(255,245,232,.35)' }}>
                          {rev.author_details?.rating ? <span style={{ color: s.acc }}>{rev.author_details.rating}/10</span> : ''}
                          {' '}{new Date(rev.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: '.85rem', color: 'rgba(255,245,232,.6)', lineHeight: 1.7, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{rev.content.replace(/<[^>]*>/g, '')}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section aria-label="Cast" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
            <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.25rem' }}>CAST</h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {castList.map((c, i) => (
              <Link key={c.id || c.name || i} href={c.id ? personUrl(c.id, c.name) : '#'} className="neo-card" style={{ padding: '13px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: '1rem', animation: `card-in .42s ${i * 0.08}s both`, textDecoration: 'none', color: 'inherit' }}>
                {c.profile_path ? (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', boxShadow: `3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22),inset 0 1px 0 rgba(255,255,255,.1),0 0 0 1.5px ${s.acc}40` }}>
                    <Image src={getTmdbImageUrl(c.profile_path, 'w185')!} alt={c.name} width={40} height={40} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg,${s.acc}55,${s.acc}22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.9rem', boxShadow: `3px 3px 10px rgba(0,0,0,.7),-1px -1px 4px rgba(45,25,90,.22),inset 0 1px 0 rgba(255,255,255,.1),0 0 0 1.5px ${s.acc}40` }}>🌸</div>
                )}
                <div>
                  <div className="f-cinzel" style={{ fontSize: '.78rem', color: '#FFF5E8', marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: '.68rem', color: 'rgba(255,245,232,.38)' }}>{c.character || 'Actor'}</div>
                </div>
              </Link>
            ))}
            </div>
          </section>
          <section aria-label="External Links" style={{ marginTop: '1.2rem' }}>
            <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>EXTERNAL LINKS</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {!show._isAnilist && (
                <a href={`https://www.themoviedb.org/${show.media_type === 'movie' ? 'movie' : 'tv'}/${show.id}`} target="_blank" rel="noopener noreferrer" className="neo-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, textDecoration: 'none', color: '#FFB347', fontSize: '.78rem' }}>
                  <span style={{ fontSize: '1rem' }}>🎬</span> TMDB
                </a>
              )}
              {!show._isAnilist && fullDetails?.imdb_id && (
                <a href={`https://www.imdb.com/title/${fullDetails.imdb_id}/`} target="_blank" rel="noopener noreferrer" className="neo-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, textDecoration: 'none', color: '#FFB347', fontSize: '.78rem' }}>
                  <span style={{ fontSize: '1rem' }}>📍</span> IMDb
                </a>
              )}
              {!show._isAnilist && !fullDetails?.imdb_id && (
                <a href={`https://www.imdb.com/find/?q=${encodeURIComponent(show.title)}`} target="_blank" rel="noopener noreferrer" className="neo-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, textDecoration: 'none', color: '#FFB347', fontSize: '.78rem' }}>
                  <span style={{ fontSize: '1rem' }}>📍</span> IMDb
                </a>
              )}
              {show._isAnilist && (
                <a href={`https://anilist.co/anime/${toAnilistId(show.id)}/`} target="_blank" rel="noopener noreferrer" className="neo-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, textDecoration: 'none', color: '#FFB347', fontSize: '.78rem' }}>
                  <span style={{ fontSize: '1rem' }}>🎌</span> AniList
                </a>
              )}
              {fullDetails?.homepage && (
                <a href={fullDetails.homepage} target="_blank" rel="noopener noreferrer" className="neo-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, textDecoration: 'none', color: '#FFB347', fontSize: '.78rem' }}>
                  <span style={{ fontSize: '1rem' }}>🌐</span> Official
                </a>
              )}
              <a href={`https://www.google.com/search?q=${encodeURIComponent(show.title + (show.yr ? ` ${show.yr}` : ''))}`} target="_blank" rel="noopener noreferrer" className="neo-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, textDecoration: 'none', color: '#FFB347', fontSize: '.78rem' }}>
                <span style={{ fontSize: '1rem' }}>🔍</span> Google
              </a>
              <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(show.title.replace(/ /g, '_'))}`} target="_blank" rel="noopener noreferrer" className="neo-card" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, textDecoration: 'none', color: '#FFB347', fontSize: '.78rem' }}>
                <span style={{ fontSize: '1rem' }}>📖</span> Wikipedia
              </a>
            </div>
          </section>
          </>
        )}

        {tab === 'gallery' && (
          <section aria-label="Gallery">
            <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc, marginBottom: '.75rem' }}>GALLERY</h2>
            {galleryImages?.backdrops && galleryImages.backdrops.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '.75rem' }}>
                {galleryImages.backdrops.slice(0, 12).map((img, i) => (
                  <div key={img.file_path} style={{ position: 'relative', paddingTop: `${(100 / (img.aspect_ratio || 1.78)).toFixed(1)}%`, borderRadius: 12, overflow: 'hidden', background: '#0C091A', boxShadow: '4px 4px 12px rgba(0,0,0,.7),-2px -2px 6px rgba(45,25,90,.2)', animation: `card-in .42s ${i * 0.05}s both` }}>
                    <Image
                      src={`https://image.tmdb.org/t/p/w780${img.file_path}`}
                      alt={`${show.title} behind-the-scenes scene ${i + 1} — ${img.iso_639_1 ? `language: ${img.iso_639_1}` : 'production still'}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      loading="lazy"
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="f-cinzel" style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,245,232,.3)', fontSize: '.82rem', letterSpacing: '.1em' }}>
                <div style={{ fontSize: '2rem', marginBottom: '.8rem', opacity: .4 }}>🖼️</div>
                No gallery images available
              </div>
            )}
          </section>
        )}

        {tab === 'trailers' && (
          <section aria-label="Trailers">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '1rem' }}>
              <h2 className="f-cinzel" style={{ fontSize: '.72rem', letterSpacing: '.14em', color: s.acc }}>TRAILERS</h2>
              <span className="f-cinzel" style={{ fontSize: '.52rem', color: 'rgba(255,179,71,.5)', letterSpacing: '.08em', background: 'rgba(255,179,71,.08)', padding: '2px 8px', borderRadius: 4 }}>4K</span>
            </div>
          <div>
            {trailerList.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '1rem' }}>
                {trailerList.slice(0, 8).map((v, i) => (
                  <div key={v.key} style={{ animation: `card-in .42s ${i * 0.06}s both` }}>
                    <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 12, overflow: 'hidden', background: '#0C091A', boxShadow: '4px 4px 12px rgba(0,0,0,.7),-2px -2px 6px rgba(45,25,90,.2)' }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${v.key}?rel=0&vq=hd2160&modestbranding=1`}
                        title={v.name}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
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
                <div style={{ marginTop: '1rem' }}>
                  <a
                    href={youtubeSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-g"
                    style={{ display: 'inline-block', padding: '10px 24px', fontSize: '.78rem', textDecoration: 'none', color: '#FFF5E8' }}
                  >
                    ▶ Search on YouTube
                  </a>
                </div>
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

      {/* Player overlay — IntelligentPlayer + PlayerControls */}
      {playing && (
        <div ref={playerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: '#000', zIndex: 9999, animation: 'fi .28s ease both' }}>
          {activeProviderUrl ? (
            <>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
                <IntelligentPlayer
                  key={`player-${activeProviderName}-${epIdx}`}
                  providers={[{ name: activeProviderName, url: activeProviderUrl, tier: (providers[failoverChain.length > 0 ? chainIndex : selectedProvider]?.tier as 1 | 2 | 3) || 2, category: (providers[failoverChain.length > 0 ? chainIndex : selectedProvider]?.category as 'all' | 'anime') || 'all', proxied: (providers[failoverChain.length > 0 ? chainIndex : selectedProvider]?.proxied as boolean) || false }]}
                  mediaId={show.id}
                  season={season}
                  episode={epIdx}
                  title={show.title}
                  isAuthenticated={!!user}
                  profileId={profile?.id}
                  onIframeLoad={() => {
                    // Iframe loaded successfully — clear the failover timer so it doesn't
                    // auto-switch providers while the movie is playing fine
                    iframeLoadedRef.current = true;
                    if (iframeLoadTimer.current) {
                      clearTimeout(iframeLoadTimer.current);
                      iframeLoadTimer.current = undefined;
                    }
                    setIframeLoaded(true);
                  }}
                />
              </div>

              {/* Legal disclaimer banner below player */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', zIndex: 10001 }}>
                <LegalDisclaimerBanner />
              </div>

              {/* Exit button — always visible during active playback */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10001, padding: '10px 16px calc(6px + env(safe-area-inset-top, 0px))', background: 'linear-gradient(to bottom,rgba(0,0,0,.6) 0%,transparent 100%)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pointerEvents: 'none' }}>
                <div className="f-cinzel" style={{ fontSize: '.82rem', color: 'rgba(255,245,232,.85)', textShadow: '0 1px 6px rgba(0,0,0,.6)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {show.title}{show.media_type === 'tv' ? ` · S${season} E${epIdx}` : ''}
                </div>
                <button
                  onClick={() => setPlaying(false)}
                  className="btn-g"
                  style={{ padding: '8px 18px', fontSize: '.78rem', pointerEvents: 'auto', flexShrink: 0 }}
                  aria-label="Exit player"
                >
                  ✕ Exit
                </button>
              </div>

              {/* Failover toast */}
              {failoverMsg && (
                <div className="f-cinzel" style={{ position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)', zIndex: 10001, padding: '8px 20px', borderRadius: 10, background: 'rgba(255,107,138,.18)', border: '1px solid rgba(255,107,138,.4)', color: '#FF6B8A',  fontSize: '.72rem', fontWeight: 600, letterSpacing: '.04em', animation: 'fi .3s ease both', whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(255,107,138,.15)' }}>
                  {failoverMsg}
                </div>
              )}
              {providers.length > 1 && (
                <div style={{ position: 'absolute', top: 50, right: 16, zIndex: 10001 }}>
                  <select className="f-cinzel" value={failoverChain.length > 0 ? chainIndex : selectedProvider} onChange={(e) => {
                    const idx = Number(e.target.value);
                    if (failoverChain.length > 0) {
                      setChainIndex(idx); setSelectedProvider(idx);
                    } else {
                      setSelectedProvider(idx); triedProviders.current.add(idx);
                    }
                  }} style={{ padding: '8px 14px', background: 'rgba(0,0,0,.85)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10, color: '#FFF5E8', fontSize: '.72rem', cursor: 'pointer', outline: 'none', maxWidth: 'min(320px, 60vw)' }}>
                    {(() => {
                      const hasAnime = providers.some(p => p.category === 'anime');
                      const hasGeneral = providers.some(p => p.category !== 'anime');
                      const groups: Array<{ label: string; items: typeof providers }> = [];
                      if (hasAnime) groups.push({ label: '· Anime Providers', items: providers.filter(p => p.category === 'anime') });
                      if (hasGeneral) groups.push({ label: '· Streaming Servers', items: providers.filter(p => p.category !== 'anime') });
                      let optIdx = 0;
                      return groups.map((g, gi) => (
                        <optgroup key={gi} label={g.label} style={{ color: gi === 0 && hasAnime ? '#FFB347' : 'rgba(255,245,232,.7)', fontWeight: 600 }}>
                          {g.items.map((p) => {
                            const i = providers.indexOf(p);
                            return (
                              <option key={i} value={i} style={{ background: '#0C091A' }}>
                                {p.name}{p.tier === 1 ? ' (T1)' : p.tier === 2 ? ' (T2)' : ''}{failoverChain.length > 0 && p.score != null ? ` [${p.score.toFixed(0)}%]` : ''}{failoverChain.length > 0 && i === chainIndex ? ' ✓' : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      ));
                    })()}
                  </select>
                </div>
              )}
            </>
          ) : loadingProviders ? (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(255,255,255,.1)', borderTopColor: 'rgba(255,179,71,.8)', animation: 'spin 1s linear infinite' }} />
              <div className="f-cinzel" style={{ fontSize: '.82rem', color: 'rgba(255,245,232,.5)', letterSpacing: '.08em' }}>Finding best provider...</div>
            </div>
          ) : chainExhausted ? (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,107,138,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>!</div>
              <div className="f-cinzel" style={{ fontSize: '.9rem', color: 'rgba(255,245,232,.7)', letterSpacing: '.06em', textAlign: 'center', maxWidth: 300 }}>All providers unavailable</div>
              <button className="btn-p" onClick={() => { setChainExhausted(false); setChainIndex(0); triedProviders.current.clear(); setProviders([]); setFailoverChain([]); setLoadingProviders(true); setPlaying(false); setTimeout(() => setPlaying(true), 50); }} style={{ padding: '10px 28px', fontSize: '.82rem', marginTop: 8 }}>Retry</button>
            </div>
          ) : (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <div className="f-cinzel" style={{ fontSize: '.9rem', color: 'rgba(255,245,232,.5)', letterSpacing: '.06em' }}>No sources found</div>
              <button className="btn-g" onClick={() => setPlaying(false)} style={{ padding: '10px 28px', fontSize: '.82rem' }}>Go Back</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
