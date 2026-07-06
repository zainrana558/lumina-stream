/**
 * Client-side embed provider health checker.
 *
 * Runs in the user's browser and pings embed providers directly —
 * so the Vercel server IP is NEVER exposed to embed providers.
 * Reports results to /api/embed-health-client for server-side state management.
 *
 * Strategy: Check 1 provider every 10 minutes (round-robin).
 * Each user's browser does its own checks, creating distributed monitoring.
 * Provider list now aligned with the Provider Intelligence Layer pools.
 */

import { useCallback, useEffect, useRef } from 'react';

const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const PING_TIMEOUT_MS = 3000; // 3 seconds

// Provider sample URLs for health pinging — aligned with Intelligence Layer pools
const PROVIDER_PING_URLS: { name: string; url: string }[] = [
  // Tier 1 providers
  { name: 'VidSrc SU',       url: 'https://vidsrc.su/embed/movie/550' },
  { name: 'VidSrc RU',       url: 'https://vidsrc.ru/embed/movie/550' },
  { name: 'VidSrc IO',       url: 'https://vidsrc.io/embed/movie/550' },
  { name: 'VidCore',          url: 'https://vidcore.org/embed/movie/550' },
  { name: 'Cinezo Anime',     url: 'https://player.cinezo.live/embed/movie/550' },
  { name: 'VidSrc WIN Anime', url: 'https://vidsrc.win/embed/movie/550' },
  // Tier 2 providers
  { name: 'VidSrcMe RU',    url: 'https://vidsrcme.ru/embed/movie/550' },
  { name: 'AutoEmbed',      url: 'https://autoembed.co/movie/tmdb/550' },
  { name: 'StreamSilk',     url: 'https://streamsilk.com/embed/movie/550' },
  { name: 'AnyEmbed',       url: 'https://anyembed.xyz/embed/tmdb-movie-550' },
  { name: 'VaPlayer',       url: 'https://vaplayer.ru/embed/movie/550' },
  { name: 'Nontongo',       url: 'https://nontongo.win/embed/movie/550' },
  { name: 'VidLink',        url: 'https://vidlink.pro/movie/550' },
  { name: 'VidSrc.pm',      url: 'https://vidsrc.pm/embed/movie/550' },
  { name: 'VidSrc MOV',     url: 'https://vidsrc.mov/embed/movie/550' },
  { name: 'FilmU',          url: 'https://embed.filmu.in/movie/550' },
  { name: 'FileMoon',       url: 'https://filemoon.sx/embed/movie/550' },
  { name: '2Embed',         url: 'https://www.2embed.cc/embed/movie/550' },
  { name: 'Series9API',     url: 'https://api.series9.io/film/550' },
  { name: 'VidSrc FYI',     url: 'https://vidsrc.fyi/embed/movie/550' },
];

async function pingProvider(url: string): Promise<{ alive: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return { alive: true, latencyMs: Date.now() - start };
  } catch {
    return { alive: false, latencyMs: Date.now() - start };
  }
}

async function reportToServer(provider: string, alive: boolean, latencyMs: number): Promise<void> {
  try {
    await fetch('/api/embed-health-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, alive, latencyMs }),
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

    const result = await pingProvider(provider.url);
    await reportToServer(provider.name, result.alive, result.latencyMs);
  }, []);

  useEffect(() => {
    // Run first check after a short random delay (2-5 min) to stagger across users
    const initialDelay = 2 * 60 * 1000 + Math.random() * 3 * 60 * 1000;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const initialTimer = setTimeout(() => {
      runCheck();
      // Then check every 10 minutes
      intervalId = setInterval(runCheck, CHECK_INTERVAL_MS);
    }, initialDelay);

    return () => {
      clearTimeout(initialTimer);
      if (intervalId) clearInterval(intervalId);
    };
  }, [runCheck]);
}