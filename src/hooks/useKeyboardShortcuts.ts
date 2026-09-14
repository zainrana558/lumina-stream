'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowUp, ChevronLeft, ChevronRight, CirclePlay, ClipboardList,
  Hash, Keyboard, Maximize, MessageCircle, RefreshCw, SkipBack, SkipForward,
  Tv, X, type LucideIcon,
} from 'lucide-react';

export interface ShortcutFeedback {
  icon: LucideIcon;
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

  const showFeedback = useCallback((icon: LucideIcon, label: string) => {
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
        showFeedback(Keyboard, 'Shortcuts hidden');
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          handlers.onTogglePlayPause?.();
          showFeedback(CirclePlay, e.key === ' ' ? 'Space' : 'K');
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          handlers.onToggleFullscreen?.();
          showFeedback(Maximize, 'Fullscreen');
          break;
        case 'Escape':
          e.preventDefault();
          if (shortcutsVisible) {
            toggleShortcuts();
            showFeedback(Keyboard, 'Shortcuts hidden');
          } else {
            handlers.onExit?.();
            showFeedback(X, 'Exit');
          }
          break;
        case ',':
          e.preventDefault();
          handlers.onPreviousEpisode?.();
          showFeedback(SkipBack, 'Prev Episode');
          break;
        case '.':
          e.preventDefault();
          handlers.onNextEpisode?.();
          showFeedback(SkipForward, 'Next Episode');
          break;
        case 'n':
        case 'N':
          e.preventDefault();
          handlers.onNextEpisode?.();
          showFeedback(SkipForward, 'Next Episode');
          break;
        case 'p':
        case 'P':
          if (e.shiftKey) {
            e.preventDefault();
            handlers.onPreviousEpisode?.();
            showFeedback(SkipBack, 'Prev Episode');
          } else {
            e.preventDefault();
            handlers.onPopOutPip?.();
            showFeedback(Tv, 'PiP Mode');
          }
          break;
        case 'Tab':
          e.preventDefault();
          handlers.onSwitchProvider?.();
          showFeedback(RefreshCw, 'Next Server');
          break;
        case 's':
        case 'S':
          if (e.shiftKey) {
            e.preventDefault();
            handlers.onPreviousSeason?.();
            showFeedback(SkipBack, 'Prev Season');
          } else {
            e.preventDefault();
            handlers.onNextSeason?.();
            showFeedback(SkipForward, 'Next Season');
          }
          break;
        case 'w':
        case 'W':
          e.preventDefault();
          handlers.onToggleWatchlist?.();
          showFeedback(ClipboardList, 'My List');
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          handlers.onGoBack?.();
          showFeedback(ArrowLeft, 'Back');
          break;
        case 't':
          if (e.shiftKey) {
            e.preventDefault();
            handlers.onPrevTab?.();
            showFeedback(ChevronLeft, 'Prev Tab');
          } else {
            e.preventDefault();
            handlers.onNextTab?.();
            showFeedback(ChevronRight, 'Next Tab');
          }
          break;
        case 'g':
        case 'G':
          e.preventDefault();
          handlers.onScrollToTop?.();
          showFeedback(ArrowUp, 'Top');
          break;
        case '1': case '2': case '3': case '4': case '5':
        case '6': case '7': case '8': case '9':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            const epNum = parseInt(e.key, 10);
            handlers.onJumpToEpisode?.(epNum);
            showFeedback(Hash, `Episode ${epNum}`);
          }
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          handlers.onToggleSubtitles?.();
          showFeedback(MessageCircle, 'Subtitles');
          break;
        case '?':
          e.preventDefault();
          toggleShortcuts();
          showFeedback(Keyboard, 'Shortcuts');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handlers, shortcutsVisible, toggleShortcuts, showFeedback]);

  return { feedback, shortcutsVisible, setShortcutsVisible: toggleShortcuts };
}