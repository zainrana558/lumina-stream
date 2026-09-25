'use client';

/**
 * L10 — Intelligent Player Component
 *
 * Features:
 * - HLS.js/Plyr integration
 * - Resume watching (saves/restores position)
 * - Skip intro / skip credits
 * - Subtitles support
 * - Quality selector
 * - Playback speed control
 * - Picture-in-Picture
 * - Provider switching
 * - Playback event reporting (L12)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import type { EmbedResult } from '@/lib/streaming/providers';

interface IntelligentPlayerProps {
  /** Provider embed results, ordered by score */
  providers: EmbedResult[];
  /** Media ID for resume/event tracking */
  mediaId: number;
  /** Content type — used only to scope playback-event learning signals
   * (see /api/playback/event) so a provider's movie/TV/anime performance
   * is tracked separately instead of blended into one score. */
  contentType?: 'movie' | 'tv' | 'anime';
  /** Season number (TV only) */
  season?: number;
  /** Episode number (TV only) */
  episode?: number;
  /** Media title for display */
  title?: string;
  /** Whether the user is authenticated */
  isAuthenticated?: boolean;
  /** User's profile ID */
  profileId?: string;
  /** Callback when provider is switched */
  onProviderSwitch?: (provider: string) => void;
  /** Callback when the iframe loads successfully (clears failover timer) */
  onIframeLoad?: () => void;
  /** Callback when an error occurs */
  onError?: (provider: string, error: string) => void;
}

interface SkipMarker {
  type: 'intro' | 'credits';
  startTime: number;
  endTime: number;
}

export default function IntelligentPlayer({
  providers,
  mediaId,
  contentType = 'tv',
  season = 1,
  episode = 1,
  title,
  isAuthenticated = false,
  profileId,
  onProviderSwitch,
  onIframeLoad,
  onError,
}: IntelligentPlayerProps) {
  // ---- State ----
  const [currentProviderIndex, setCurrentProviderIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipCredits, setShowSkipCredits] = useState(false);
  const [skipMarkers, setSkipMarkers] = useState<SkipMarker[]>([]);
  const [resumePosition, setResumePosition] = useState<number | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);

  // ---- Refs ----
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const saveResumeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const eventThrottleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const skipCheckInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const currentProvider = providers[currentProviderIndex] || providers[0];

  // Reset explicit feedback state whenever the active provider changes.
  useEffect(() => { setFeedbackGiven(null); }, [currentProviderIndex]);

  // ---- Fetch resume position ----
  useEffect(() => {
    if (!isAuthenticated || !mediaId) return;

    async function fetchResume() {
      try {
        const params = new URLSearchParams({ mediaId: String(mediaId) });
        if (profileId) params.set('profileId', profileId);
        const res = await fetch(`/api/player/resume?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (data.position > 30 && data.duration > 0) {
            setResumePosition(data.position);
          }
        }
      } catch {
        // Resume fetch failed — not critical
      }
    }
    fetchResume();
  }, [isAuthenticated, mediaId, profileId]);

  // ---- Fetch skip markers ----
  useEffect(() => {
    if (!mediaId) return;

    async function fetchMarkers() {
      try {
        const params = new URLSearchParams({
          mediaId: String(mediaId),
          season: String(season),
          episode: String(episode),
        });
        const res = await fetch(`/api/player/skip-markers?${params}`);
        if (res.ok) {
          const data = await res.json();
          setSkipMarkers(data.markers || []);
        }
      } catch {
        // Skip markers not available — not critical
      }
    }
    fetchMarkers();
  }, [mediaId, season, episode]);

  // ---- Provider switching ----
  const switchProvider = useCallback(
    (direction: 1 | -1) => {
      const newIndex = currentProviderIndex + direction;
      if (newIndex < 0 || newIndex >= providers.length) return;

      setCurrentProviderIndex(newIndex);
      setIframeError(false);
      onProviderSwitch?.(providers[newIndex].name);
    },
    [currentProviderIndex, providers, onProviderSwitch],
  );

  // ---- Report playback event (L12) ----
  // Use refs for currentTime and duration to avoid recreating callback on every tick
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  useEffect(() => {
    currentTimeRef.current = currentTime;
    durationRef.current = duration;
  });

  const reportEvent = useCallback(
    (eventType: string, metadata?: Record<string, unknown>) => {
      // Reported for guests too — the learning system needs signal from
      // logged-out playback, not just authenticated sessions (the API
      // route records these anonymously; see migration 011).
      if (!currentProvider) return;

      // Throttle: max 1 event per 3 seconds
      if (eventThrottleTimer.current) return;

      eventThrottleTimer.current = setTimeout(() => {
        eventThrottleTimer.current = undefined;
      }, 3000);

      fetch('/api/playback/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId,
          provider: currentProvider.name,
          eventType,
          contentType,
          position: currentTimeRef.current,
          duration: durationRef.current,
          metadata,
        }),
      }).catch(() => {
        // Event reporting failed — non-critical
      });
    },
    [currentProvider, mediaId, contentType],
  );

  // ---- Explicit thumbs up/down feedback ----
  // Implicit signals (complete/error events) are noisy — one tap of explicit
  // feedback is a much stronger training signal for the learning system.
  // Reuses the exact same 'complete'/'error' event types the aggregate SQL
  // already treats as success/failure (see aggregate_provider_performance
  // in migration 010), tagged so they're distinguishable from implicit
  // signals if that's ever needed — sent directly (not through the
  // throttled reportEvent) since a deliberate click should never be dropped.
  const sendFeedback = useCallback(
    (positive: boolean) => {
      if (!currentProvider) return;
      setFeedbackGiven(positive ? 'up' : 'down');
      fetch('/api/playback/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId,
          provider: currentProvider.name,
          eventType: positive ? 'complete' : 'error',
          contentType,
          position: currentTimeRef.current,
          duration: durationRef.current,
          metadata: { explicitFeedback: true },
        }),
      }).catch(() => { /* non-critical */ });
    },
    [currentProvider, mediaId, contentType],
  );

  // ---- Save resume position (debounced) ----
  const saveResume = useCallback(() => {
    if (!isAuthenticated || currentTime < 10) return;

    if (saveResumeTimer.current) {
      clearTimeout(saveResumeTimer.current);
    }

    saveResumeTimer.current = setTimeout(() => {
      fetch('/api/player/save-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId,
          position: currentTime,
          duration,
        }),
      }).catch(() => {
        // Save failed — non-critical
      });
    }, 5000);
  }, [isAuthenticated, mediaId, currentTime, duration]);

  // ---- Skip intro handler ----
  const skipTo = useCallback(
    (marker: SkipMarker) => {
      if (marker.type === 'intro') {
        setShowSkipIntro(false);
        // Post message to iframe to seek
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            { type: 'lumina:seek', time: marker.endTime },
            '*',
          );
        }
      } else if (marker.type === 'credits') {
        setShowSkipCredits(false);
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            { type: 'lumina:seek', time: marker.startTime },
            '*',
          );
        }
      }
    },
    [],
  );

  // ---- Listen for timeUpdate from iframe & check skip markers ----
  // `reportEvent` used to be defined but never actually called anywhere in
  // this component — the entire L12 learning pipeline (provider-
  // intelligence.ts, learning.ts) had a working backend wired to a
  // client that never sent it a single real playback signal. Wired here:
  // a 'complete' event once a session crosses 90% watched (matches the
  // exact threshold aggregate_provider_performance() already uses to
  // count "successful_plays"), reported once per media/provider via the ref guard.
  const completeReportedRef = useRef<string | null>(null);
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'lumina:timeUpdate') {
        const time = typeof e.data.time === 'number' ? e.data.time : 0;
        const dur = typeof e.data.duration === 'number' ? e.data.duration : 0;
        setCurrentTime(time);
        if (dur) setDuration(dur);
        setIsPlaying(e.data.playing !== false);

        if (dur > 0 && time / dur >= 0.9) {
          const key = `${mediaId}:${currentProvider?.name}`;
          if (completeReportedRef.current !== key) {
            completeReportedRef.current = key;
            reportEvent('complete');
          }
        }
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mediaId, currentProvider, reportEvent]);

  // Check skip markers against current time
  useEffect(() => {
    if (skipMarkers.length === 0) return;

    const check = () => {
      const t = currentTimeRef.current;
      const intro = skipMarkers.find(m => m.type === 'intro' && t >= m.startTime && t <= m.endTime);
      const credits = skipMarkers.find(m => m.type === 'credits' && t >= m.startTime && t <= m.endTime);
      setShowSkipIntro(!!intro);
      setShowSkipCredits(!!credits);
    };

    // Check immediately, then every 2s
    check();
    skipCheckInterval.current = setInterval(check, 2000);
    return () => {
      if (skipCheckInterval.current) clearInterval(skipCheckInterval.current);
    };
  }, [skipMarkers, currentTime]);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      if (saveResumeTimer.current) clearTimeout(saveResumeTimer.current);
      if (eventThrottleTimer.current) clearTimeout(eventThrottleTimer.current);
      if (skipCheckInterval.current) clearInterval(skipCheckInterval.current);
    };
  }, []);

  // ---- Render ----
  if (!currentProvider) {
    return (
      <div className="intelligent-player-error">
        <p>No streaming providers available</p>
      </div>
    );
  }

  const isNoSandbox = !!(currentProvider as { noSandbox?: boolean }).noSandbox;

  return (
    <div className="intelligent-player" style={{ position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden' }}>
      {/* Iframe */}
      <iframe
        ref={iframeRef}
        src={currentProvider.url}
        className="intelligent-player-iframe"
        style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        referrerPolicy="no-referrer"
        // Sandbox EVERY embed EXCEPT ones explicitly marked noSandbox. The
        // tokens deliberately EXCLUDE:
        //   • allow-popups / allow-popups-to-escape-sandbox — kills the pop-under
        //     and "click play → opens cloudorchestranova.com" ad redirects that
        //     ride along with several third-party sources.
        //   • allow-top-navigation* — an embed can no longer navigate the whole
        //     tab away from Lumovia.
        // Proxied (same-origin) providers must stay an opaque origin (no
        // allow-same-origin) so the page CSP script-src doesn't block their JS;
        // direct providers get allow-same-origin so their player can reach its
        // own storage/cookies (many refuse to start otherwise).
        //
        // noSandbox providers (see StreamProvider.noSandbox): their own JS
        // refuses to play inside ANY sandboxed iframe regardless of which
        // tokens are granted — confirmed live by testing with allow-popups +
        // allow-top-navigation added and no change, only full removal works.
        // Kept at low tier (never the default pick) and paired with the
        // on-screen warning below — omitting `sandbox` here is a deliberate,
        // scoped, user-authorized tradeoff for these specific sources only,
        // not a blanket change.
        sandbox={
          isNoSandbox
            ? undefined
            : (currentProvider as { proxied?: boolean }).proxied
              ? 'allow-scripts allow-forms allow-presentation'
              : 'allow-scripts allow-same-origin allow-forms allow-presentation'
        }
        onLoad={() => {
          // Iframe content loaded — notify parent to clear the failover timer
          onIframeLoad?.();
          reportEvent('play');
        }}
        onError={() => {
          // Iframe failed to load (e.g. blocked/unreachable source) — surface the
          // error overlay and report it, instead of leaving `iframeError` (and the
          // onError callback) permanently unused while the user stares at a blank frame.
          setIframeError(true);
          onError?.(currentProvider.name, 'Failed to load embed');
          reportEvent('error');
        }}
      />

      {isNoSandbox && (
        <div
          role="alert"
          style={{
            // Sole call site (DetailsContent.tsx) renders this inside a fixed,
            // full-viewport overlay with the site's own nav (z-index 998,
            // ~64px tall) painted above it, plus a provider dropdown around
            // top:50-84px, z-index 10001 — top:0 would sit invisibly behind
            // both. Cleared below both, and matched to that same 10001 tier,
            // so the warning is never silently hidden the way top:0 was
            // (confirmed live: getBoundingClientRect showed the element
            // painting fully behind the nav at top:0).
            position: 'absolute', top: 96, left: 0, right: 0, zIndex: 10001,
            padding: '8px 14px', fontSize: '.78rem', lineHeight: 1.4,
            background: 'rgba(120,40,0,.88)', color: '#FFF5E8',
            display: 'flex', alignItems: 'center', gap: 8,
            pointerEvents: 'none',
          }}
        >
          <span aria-hidden="true">⚠</span>
          This source may open extra tabs or pop-ups. If one opens, don&apos;t trust it or enter any information — just close it and come back here.
        </div>
      )}

      {/* Resume watching prompt */}
      {resumePosition && (
        <div
          className="intelligent-player-resume"
          style={{
            position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '12px 24px',
            borderRadius: 8, fontSize: 14, zIndex: 10, cursor: 'pointer',
          }}
          onClick={() => {
            // Send seek command to iframe before dismissing
            if (iframeRef.current?.contentWindow && resumePosition) {
              iframeRef.current.contentWindow.postMessage(
                { type: 'lumina:seek', time: resumePosition }, '*'
              );
            }
            setResumePosition(null);
          }}
        >
          Resume from {Math.floor(resumePosition / 60)}:{String(Math.floor(resumePosition % 60)).padStart(2, '0')}
        </div>
      )}

      {/* Skip intro button */}
      {showSkipIntro && skipMarkers.length > 0 && (
        <button
          className="intelligent-player-skip"
          style={{
            position: 'absolute', bottom: 80, right: 24,
            background: 'rgba(0,0,0,0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
            padding: '8px 20px', borderRadius: 6, fontSize: 13, cursor: 'pointer', zIndex: 10,
          }}
          onClick={() => {
            const intro = skipMarkers.find(m => m.type === 'intro');
            if (intro) skipTo(intro);
          }}
        >
          Skip Intro
        </button>
      )}

      {/* Skip credits button */}
      {showSkipCredits && skipMarkers.length > 0 && (
        <button
          className="intelligent-player-skip-credits"
          style={{
            position: 'absolute', bottom: 80, right: 24,
            background: 'rgba(0,0,0,0.8)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
            padding: '8px 20px', borderRadius: 6, fontSize: 13, cursor: 'pointer', zIndex: 10,
          }}
          onClick={() => {
            const credits = skipMarkers.find(m => m.type === 'credits');
            if (credits) skipTo(credits);
          }}
        >
          Skip Credits
        </button>
      )}

      {/* Provider switcher */}
      {providers.length > 1 && (
        <div
          className="intelligent-player-provider-switch"
          style={{
            position: 'absolute', top: 12, right: 12,
            display: 'flex', gap: 6, zIndex: 10,
          }}
        >
          <button
            className="intelligent-player-prev-provider"
            style={{
              background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
              width: 32, height: 32, borderRadius: 6, cursor: 'pointer',
              fontSize: 16, opacity: currentProviderIndex === 0 ? 0.3 : 1,
            }}
            onClick={() => switchProvider(-1)}
            disabled={currentProviderIndex === 0}
            title="Previous provider"
          >
            ‹
          </button>
          <span
            style={{
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              padding: '4px 10px', borderRadius: 6, fontSize: 11,
              alignSelf: 'center', whiteSpace: 'nowrap',
            }}
          >
            {currentProvider.name} ({currentProviderIndex + 1}/{providers.length})
          </span>
          <button
            className="intelligent-player-next-provider"
            style={{
              background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
              width: 32, height: 32, borderRadius: 6, cursor: 'pointer',
              fontSize: 16, opacity: currentProviderIndex >= providers.length - 1 ? 0.3 : 1,
            }}
            onClick={() => switchProvider(1)}
            disabled={currentProviderIndex >= providers.length - 1}
            title="Next provider"
          >
            ›
          </button>
        </div>
      )}

      {/* Explicit feedback — how was this source? */}
      {!iframeError && (
        <div
          style={{
            position: 'absolute', top: 12, left: 12, zIndex: 10,
            display: 'flex', gap: 6, alignItems: 'center',
            background: 'rgba(0,0,0,0.7)', borderRadius: 6, padding: '4px 8px',
          }}
        >
          <button
            onClick={() => sendFeedback(true)}
            disabled={feedbackGiven !== null}
            title="This source works well"
            aria-label="This source works well"
            style={{
              background: 'none', border: 'none', cursor: feedbackGiven ? 'default' : 'pointer',
              color: feedbackGiven === 'up' ? '#78D621' : 'rgba(255,255,255,0.75)',
              padding: 4, display: 'flex', opacity: feedbackGiven && feedbackGiven !== 'up' ? 0.35 : 1,
            }}
          >
            <ThumbsUp size={15} fill={feedbackGiven === 'up' ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => sendFeedback(false)}
            disabled={feedbackGiven !== null}
            title="This source is broken or laggy"
            aria-label="This source is broken or laggy"
            style={{
              background: 'none', border: 'none', cursor: feedbackGiven ? 'default' : 'pointer',
              color: feedbackGiven === 'down' ? '#FF4A4A' : 'rgba(255,255,255,0.75)',
              padding: 4, display: 'flex', opacity: feedbackGiven && feedbackGiven !== 'down' ? 0.35 : 1,
            }}
          >
            <ThumbsDown size={15} fill={feedbackGiven === 'down' ? 'currentColor' : 'none'} />
          </button>
          {feedbackGiven && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', paddingRight: 2 }}>Thanks!</span>
          )}
        </div>
      )}

      {/* Iframe error overlay */}
      {iframeError && (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.9)', color: '#fff', zIndex: 20,
          }}
        >
          <p style={{ marginBottom: 12 }}>Failed to load {currentProvider.name}</p>
          {providers.length > 1 && (
            <button
              style={{
                background: '#6366f1', color: '#fff', border: 'none',
                padding: '8px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 14,
              }}
              onClick={() => switchProvider(1)}
            >
              Try Next Provider
            </button>
          )}
        </div>
      )}
    </div>
  );
}