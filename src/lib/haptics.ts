'use client';

/**
 * Haptic vibration utility with feature detection.
 * Only vibrates on mobile devices that support the Vibration API.
 */
export function vibrate(duration: number = 10): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  } catch {
    // Silently fail - vibration not available
  }
}

/** Short tap feedback for card clicks */
export function vibrateTap(): void {
  vibrate(10);
}

/** Medium tap feedback for episode/option selection */
export function vibrateMedium(): void {
  vibrate(15);
}

/** Longer tap feedback for primary actions (play, confirm) */
export function vibrateLong(): void {
  vibrate(25);
}
