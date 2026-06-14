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
  onToggleMute?: () => void;
  onSeekBack10?: () => void;
  onSeekForward10?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onSeekBack30?: () => void;
  onSeekForward30?: () => void;
  onExit?: () => void;
  onPreviousEpisode?: () => void;
  onNextEpisode?: () => void;
  onToggleSubtitles?: () => void;
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
      // Don't intercept if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Don't intercept if shortcuts overlay is visible and Escape is pressed (close overlay)
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
        case 'm':
        case 'M':
          e.preventDefault();
          handlers.onToggleMute?.();
          showFeedback('🔇', 'Mute');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlers.onSeekBack10?.();
          showFeedback('⏪', '-10s');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlers.onSeekForward10?.();
          showFeedback('⏩', '+10s');
          break;
        case 'ArrowUp':
          e.preventDefault();
          handlers.onVolumeUp?.();
          showFeedback('🔊', 'Vol Up');
          break;
        case 'ArrowDown':
          e.preventDefault();
          handlers.onVolumeDown?.();
          showFeedback('🔉', 'Vol Down');
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          handlers.onSeekBack30?.();
          showFeedback('⏪', '-30s');
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          handlers.onSeekForward30?.();
          showFeedback('⏩', '+30s');
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
