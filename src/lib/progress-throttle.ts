/**
 * Throttled progress saver for video playback.
 *
 * During video playback, progress updates fire every few seconds.
 * This debounces/throttles saves to avoid hammering Supabase.
 *
 * State is keyed by profile_id so that multiple users on the same
 * serverless instance don't collide (Vercel serverless can serve
 * concurrent users from a single isolate).
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

const SAVE_INTERVAL = 15_000; // Save at most every 15 seconds
const MAX_CONSECUTIVE_FAILURES = 3;

interface ThrottleState {
  lastSaveTime: number;
  pendingSave: ProgressPayload | null;
  saveTimer: ReturnType<typeof setTimeout> | null;
  consecutiveFailures: number;
}

const stateMap = new Map<string, ThrottleState>();

function getState(profileId: string): ThrottleState {
  if (!stateMap.has(profileId)) {
    stateMap.set(profileId, { lastSaveTime: 0, pendingSave: null, saveTimer: null, consecutiveFailures: 0 });
  }
  return stateMap.get(profileId)!;
}

export async function throttledSaveProgress(payload: ProgressPayload): Promise<void> {
  const state = getState(payload.profile_id);

  // Stop retrying after too many consecutive failures
  if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return;

  const now = Date.now();

  // Always store the latest payload
  state.pendingSave = payload;

  // If enough time has passed since last save, save immediately
  if (now - state.lastSaveTime >= SAVE_INTERVAL) {
    await flushProgress(payload.profile_id);
    return;
  }

  // Otherwise schedule a delayed save
  if (state.saveTimer) clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    flushProgress(payload.profile_id);
  }, SAVE_INTERVAL);

  return;
}

/**
 * Force-flush any pending progress save (call on unmount/page leave)
 */
export async function flushProgress(profileId?: string): Promise<void> {
  // When called without an explicit profileId (legacy / unmount path),
  // flush every profile that has pending state.
  if (profileId === undefined) {
    const ids = Array.from(stateMap.keys());
    await Promise.all(ids.map((id) => flushProgress(id)));
    return;
  }

  const state = getState(profileId);

  if (state.saveTimer) {
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
  }

  if (!state.pendingSave) return;

  const payload = state.pendingSave;
  state.pendingSave = null;
  state.lastSaveTime = Date.now();

  try {
    await saveProgress(payload);
    state.consecutiveFailures = 0; // Reset on success
  } catch {
    // Silent fail — progress save is non-critical
    state.consecutiveFailures++;
    // Don't put payload back if max failures reached — stop retrying
    if (state.consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
      state.pendingSave = payload;
    }
  }
}