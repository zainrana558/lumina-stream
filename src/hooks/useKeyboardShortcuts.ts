'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ShortcutFeedback {
  icon: string;
  label: string;
  timestamp: number;
}

export interface KeyboardShortcutHandlers {
  onTogglePlayPause?: () => void;
  onToggleFullscreen?: () => void;
  onExit?: () => void;
  onPreviousEpisode?: () => void;
  onNextEpisode?: () => void;
  onJumpToEpisode?: (n: number) => void;
  onToggleSubtitles?: () => void;
  onSwitchProvider?: () => void;
  onPopOutPip?: () => void;
  onNextSeason?: () => void;
  onPreviousSeason?: () => void;
  onToggleWatchlist?: () => void;
  onGoBack?: () => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
  onScrollToTop?: () => void;
  onShowShortcuts?: () => void;
}

export function useKeyboardShortcuts(
  enabled: boolean,
  handlers: KeyboardShortcutHandlers
) {
  const [feedback, setFeedback] = useState<ShortcutFeedback | null>(null);
  const [shortcutsVisible, setShortcutsVisible] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback((icon: string, label: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback({ icon, label, timestamp: Date.now() });
    feedbackTimerRef.current = setTimeout(() => setFeedback(null), 1200);
  }, []);

  const toggleShortcuts = useCallback(() => {
    setShortcutsVisible(prev => !prev);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (shortcutsVisible && e.key === '?') {
        e.preventDefault();
        toggleShortcuts();
        showFeedback('?', 'Shortcuts hidden');
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          handlers.onTogglePlayPause?.();
          showFeedback('⏯', e.key === ' ' ? 'Space' : 'K');
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          handlers.onToggleFullscreen?.();
          showFeedback('⛶', 'Fullscreen');
          break;
        case 'Escape':
          e.preventDefault();
          if (shortcutsVisible) {
            toggleShortcuts();
            showFeedback('?', 'Shortcuts hidden');
          } else {
            handlers.onExit?.();
            showFeedback('✕', 'Exit');
          }
          break;
        case ',':
          e.preventDefault();
          handlers.onPreviousEpisode?.();
          showFeedback('⏮', 'Prev Episode');
          break;
        case '.':
          e.preventDefault();
          handlers.onNextEpisode?.();
          showFeedback('⏭', 'Next Episode');
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          handlers.onNextEpisode?.();
          showFeedback('⏭', 'Next Episode');
          break;
        case 'p':
        case 'P':
          if (e.shiftKey) {
            e.preventDefault();
            handlers.onPreviousEpisode?.();
            showFeedback('⏮', 'Prev Episode');
          } else {
            e.preventDefault();
            handlers.onPopOutPip?.();
            showFeedback('📺', 'PiP Mode');
          }
          break;
        case 'Tab':
          e.preventDefault();
          handlers.onSwitchProvider?.();
          showFeedback('🔄', 'Next Server');
          break;
        case 's':
        case 'S':
          if (e.shiftKey) {
            e.preventDefault();
            handlers.onPreviousSeason?.();
            showFeedback('⏮', 'Prev Season');
          } else {
            e.preventDefault();
            handlers.onNextSeason?.();
            showFeedback('⏭', 'Next Season');
          }
          break;
        case 'w':
        case 'W':
          e.preventDefault();
          handlers.onToggleWatchlist?.();
          showFeedback('📋', 'My List');
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          handlers.onGoBack?.();
          showFeedback('←', 'Back');
          break;
        case 't':
          if (e.shiftKey) {
            e.preventDefault();
            handlers.onPrevTab?.();
            showFeedback('◂', 'Prev Tab');
          } else {
            e.preventDefault();
            handlers.onNextTab?.();
            showFeedback('▸', 'Next Tab');
          }
          break;
        case 'g':
        case 'G':
          e.preventDefault();
          handlers.onScrollToTop?.();
          showFeedback('⬆', 'Top');
          break;
        case '1': case '2': case '3': case '4': case '5':
        case '6': case '7': case '8': case '9':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            const epNum = parseInt(e.key, 10);
            handlers.onJumpToEpisode?.(epNum);
            showFeedback(`E${epNum}`, `Episode ${epNum}`);
          }
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          handlers.onToggleSubtitles?.();
          showFeedback('💬', 'Subtitles');
          break;
        case '?':
          e.preventDefault();
          toggleShortcuts();
          showFeedback('⌨', 'Shortcuts');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handlers, shortcutsVisible, toggleShortcuts, showFeedback]);

  return { feedback, shortcutsVisible, setShortcutsVisible: toggleShortcuts };
}