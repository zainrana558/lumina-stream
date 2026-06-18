'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Traps keyboard focus within a container element (for modals/dialogs).
 * Returns a ref to attach to the modal container.
 * Focuses the first focusable element on mount, returns focus on unmount.
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(active: boolean) {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    const container = containerRef.current;
    if (!container) return [];
    return Array.from<HTMLElement>(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  }, []);

  useEffect(() => {
    if (!active) return;

    // Save the element that had focus before the trap activated
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element after a tick (allows animation to start)
    const timer = setTimeout(() => {
      const focusable = getFocusableElements();
      if (focusable.length > 0) focusable[0].focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that had it before
      previousFocusRef.current?.focus();
    };
  }, [active, getFocusableElements]);

  return containerRef;
}