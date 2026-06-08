/**
 * Client-side embed provider health checker.
 *
 * Runs in the user's browser and pings embed providers directly —
 * so the Vercel server IP is NEVER exposed to embed providers.
 * Reports results to /api/embed-health-client for server-side state management.
 *
 * Strategy: Check 1 provider every 2 minutes (round-robin).
 * Each user's browser does its own checks, creating distributed monitoring.
 */

import { useCallback, useEffect, useRef } from 'react';

const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const PING_TIMEOUT_MS = 6000; // 6 seconds

// Provider sample URLs for health pinging
const PROVIDER_PING_URLS: { name: string; url: string }[] = [
  { name: '2Embed',     url: 'https://www.2embed.online/embed/movie/550' },
  { name: 'AutoEmbed',  url: 'https://autoembed.co/movie/tmdb/550' },
  { name: 'VidPhantom', url: 'https://vidphantom.com/movie/550' },
  { name: 'VidSrc',     url: 'https://vidsrc.fyi/embed/movie/550' },
  { name: 'NexStream',   url: 'https://api.codespecters.com/embed/movie/550' },
  { name: 'VidSrc CC',  url: 'https://vidsrc.cc/embed/movie/550' },
  { name: 'VidSrc XYZ', url: 'https://vidsrc.xyz/embed/movie/550' },
  { name: 'Embed.su',   url: 'https://embed.su/embed/movie/550' },
  { name: 'VidSrc To',  url: 'https://vidsrc.to/embed/movie/550' },
  { name: 'AnimeKaizoku', url: 'https://animekaizoku.com/watch/1/1' },
  { name: 'AniMixPlay', url: 'https://animixplay.to/v1/1' },
  { name: 'YugenAnime', url: 'https://yugenanime.tv/watch/1/1' },
];

async function pingProvider(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return true;
  } catch {
    return false;
  }
}

async function reportToServer(provider: string, alive: boolean): Promise<void> {
  try {
    await fetch('/api/embed-health-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, alive }),
    });
  } catch {
    // Silent fail — health reporting is non-critical
  }
}

export function useClientHealthCheck() {
  const checkIndexRef = useRef(Math.floor(Math.random() * PROVIDER_PING_URLS.length)); // Random start to distribute load

  const runCheck = useCallback(async () => {
    const provider = PROVIDER_PING_URLS[checkIndexRef.current % PROVIDER_PING_URLS.length];
    checkIndexRef.current++;

    const alive = await pingProvider(provider.url);
    await reportToServer(provider.name, alive);
  }, []);

  useEffect(() => {
    // Run first check after a short random delay (1-5 min) to stagger across users
    const initialDelay = 60 * 1000 + Math.random() * 4 * 60 * 1000;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const initialTimer = setTimeout(() => {
      runCheck();
      // Then check every 2 minutes
      intervalId = setInterval(runCheck, CHECK_INTERVAL_MS);
    }, initialDelay);

    return () => {
      clearTimeout(initialTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [runCheck]);
}
