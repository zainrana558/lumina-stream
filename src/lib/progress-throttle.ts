/**
 * Throttled progress saver for video playback.
 *
 * During video playback, progress updates fire every few seconds.
 * This debounces/throttles saves to avoid hammering Supabase.
 *
 * Usage in player component:
 *   import { throttledSaveProgress } from '@/lib/progress-throttle';
 *   throttledSaveProgress(profileId, mediaId, mediaType, title, poster, progress, duration, season, episode);
 */

import { saveProgress } from '@/actions/progress';

type ProgressPayload = {
  profile_id: string;
  media_id: number;
  media_type: 'movie' | 'tv';
  title: string;
  poster_path: string | null;
  progress: number;
  duration: number;
  season_number?: number;
  episode_number?: number;
};

let lastSaveTime = 0;
const SAVE_INTERVAL = 15_000; // Save at most every 15 seconds
let pendingSave: ProgressPayload | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

export async function throttledSaveProgress(payload: ProgressPayload): Promise<void> {
  // Stop retrying after too many consecutive failures
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return;

  const now = Date.now();

  // Always store the latest payload
  pendingSave = payload;

  // If enough time has passed since last save, save immediately
  if (now - lastSaveTime >= SAVE_INTERVAL) {
    await flushProgress();
    return;
  }

  // Otherwise schedule a delayed save
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    flushProgress();
  }, SAVE_INTERVAL);

  return;
}

/**
 * Force-flush any pending progress save (call on unmount/page leave)
 */
export async function flushProgress(): Promise<void> {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }

  if (!pendingSave) return;

  const payload = pendingSave;
  pendingSave = null;
  lastSaveTime = Date.now();

  try {
    await saveProgress(payload);
    consecutiveFailures = 0; // Reset on success
  } catch {
    // Silent fail — progress save is non-critical
    consecutiveFailures++;
    // Don't put payload back if max failures reached — stop retrying
    if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      pendingSave = payload;
    }
  }
}
