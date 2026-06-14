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
  onToggleSubtitles?: () => void;
  onSwitchProvider?: () => void;
  onPopOutPip?: () => void;
  onNextSeason?: () => void;
  onPreviousSeason?: () => void;
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