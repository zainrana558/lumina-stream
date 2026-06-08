'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface EpisodeTimerState {
  /** Seconds elapsed since play started */
  elapsed: number;
  /** Whether skip intro button should show */
  showSkipIntro: boolean;
  /** Whether skip credits button should show */
  showSkipCredits: boolean;
  /** Whether post-play countdown should show */
  showPostPlay: boolean;
  /** Current playback speed */
  playbackSpeed: number;
  /** Whether currently muted */
  muted: boolean;
  /** Volume level 0-100 */
  volume: number;
  /** Whether subtitles are on */
  subtitlesOn: boolean;
}

export interface EpisodeTimerActions {
  skipIntro: () => void;
  skipCredits: () => void;
  setPlaybackSpeed: (speed: number) => void;
  toggleMute: () => void;
  setVolume: (vol: number) => void;
  volumeUp: () => void;
  volumeDown: () => void;
  toggleSubtitles: () => void;
  resetTimer: () => void;
  markWatched: () => void;
}

const DEFAULT_EPISODE_DURATION = 1380; // 23 minutes in seconds
const INTRO_THRESHOLD = 90; // Skip intro button visible for first 90s
const CREDITS_THRESHOLD = 90; // Skip credits visible for last 90s
const STILL_WATCHING_THRESHOLD = 3; // Prompt after 3 episodes
const STILL_WATCHING_TIMEOUT = 30000; // 30 seconds to respond
const POST_PLAY_COUNTDOWN = 10; // 10 seconds

export function useEpisodeTimer(
  playing: boolean,
  seasonEpisodes: Array<{ episode_number: number; runtime?: number }>,
  currentEpIdx: number,
  season: number
): [EpisodeTimerState, EpisodeTimerActions] {
  const [elapsed, setElapsed] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
  const [muted, setMuted] = useState(false);
  const [volume, setVolumeState] = useState(100);
  const [subtitlesOn, setSubtitlesOn] = useState(false);
  const [showPostPlay, setShowPostPlay] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const episodesWatchedRef = useRef<number>(0);

  // Get estimated episode duration from TMDB data or default
  const currentEp = seasonEpisodes.find(e => e.episode_number === currentEpIdx);
  const episodeDuration = (currentEp?.runtime || DEFAULT_EPISODE_DURATION / 60) * 60;

  // Start/stop timer
  useEffect(() => {
    if (playing && !showPostPlay) {
      intervalRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, showPostPlay]);

  // Reset timer when episode changes
  useEffect(() => {
    requestAnimationFrame(() => { setElapsed(0); setShowPostPlay(false); });
    episodesWatchedRef.current += 1;
  }, [currentEpIdx, season]);

  const showSkipIntro = elapsed > 5 && elapsed < INTRO_THRESHOLD;
  const showSkipCredits = elapsed > episodeDuration - CREDITS_THRESHOLD && elapsed < episodeDuration;

  // Detect end of episode
  useEffect(() => {
    if (elapsed >= episodeDuration && playing) {
      requestAnimationFrame(() => setShowPostPlay(true));
    }
  }, [elapsed, episodeDuration, playing]);

  const skipIntro = useCallback(() => {
    setElapsed(INTRO_THRESHOLD);
  }, []);

  const skipCredits = useCallback(() => {
    setShowPostPlay(true);
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(Math.max(0, Math.min(100, vol)));
    if (vol > 0) setMuted(false);
  }, []);

  const volumeUp = useCallback(() => {
    setVolumeState(prev => Math.min(100, prev + 10));
  }, []);

  const volumeDown = useCallback(() => {
    setVolumeState(prev => Math.max(0, prev - 10));
  }, []);

  const toggleSubtitles = useCallback(() => {
    setSubtitlesOn(prev => !prev);
  }, []);

  const resetTimer = useCallback(() => {
    setElapsed(0);
    setShowPostPlay(false);
  }, []);

  const markWatched = useCallback(() => {
    setShowPostPlay(true);
  }, []);

  return [
    {
      elapsed,
      showSkipIntro,
      showSkipCredits,
      showPostPlay,
      playbackSpeed,
      muted,
      volume,
      subtitlesOn,
    },
    {
      skipIntro,
      skipCredits,
      setPlaybackSpeed,
      toggleMute,
      setVolume,
      volumeUp,
      volumeDown,
      toggleSubtitles,
      resetTimer,
      markWatched,
    },
  ];
}

export { STILL_WATCHING_THRESHOLD, STILL_WATCHING_TIMEOUT, POST_PLAY_COUNTDOWN };
