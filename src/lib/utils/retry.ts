/**
 * Retry with Exponential Backoff + Circuit Breaker
 *
 * Generic retry utility used by:
 *   - Health checks (pingProvider)
 *   - Provider validation (selectProvider)
 *   - Stream URL resolution
 *
 * Features:
 *   - Configurable max retries, base/max delay, jitter
 *   - Circuit breaker: after N consecutive failures to same host → open for cooldown
 *   - Retryable error classification
 */

// ── Types ──

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;      // ms
  maxDelay?: number;       // ms
  jitter?: boolean;
  retryableErrors?: string[];
  /** AbortSignal to cancel all retries */
  signal?: AbortSignal;
}

export interface RetryResult<T> {
  value: T | null;
  success: boolean;
  attempts: number;
  totalDelayMs: number;
  lastError: Error | null;
}

// ── Circuit Breaker ──

interface CircuitState {
  failures: number;
  openSince: number | null; // timestamp when circuit opened
}

const RETRYABLE_ERRORS = ['ECONNREFUSED', 'ETIMEDOUT', 'HPE_INVALID_CONSTANT', 'ERR_NETWORK', 'FETCH_ERROR'];
const CIRCUIT_BREAKER_THRESHOLD = 5;   // 5 consecutive failures → open
const CIRCUIT_BREAKER_COOLDOWN = 60_000; // 60s cooldown

const circuitStore = new Map<string, CircuitState>();

// Cleanup stale circuit states every 5 minutes
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [host, state] of circuitStore) {
      if (state.openSince && (now - state.openSince) > CIRCUIT_BREAKER_COOLDOWN * 2) {
        circuitStore.delete(host);
      }
    }
  }, 300_000);
}

export function isCircuitOpen(host: string): boolean {
  const state = circuitStore.get(host);
  if (!state || !state.openSince) return false;

  // Check if cooldown has elapsed
  if (Date.now() - state.openSince > CIRCUIT_BREAKER_COOLDOWN) {
    // Half-open: allow one attempt
    state.openSince = null;
    state.failures = Math.floor(state.failures / 2); // Reduce failure count
    return false;
  }

  return true;
}

export function recordCircuitSuccess(host: string): void {
  const state = circuitStore.get(host);
  if (state) {
    state.failures = 0;
    state.openSince = null;
  }
}

export function recordCircuitFailure(host: string): void {
  let state = circuitStore.get(host);
  if (!state) {
    state = { failures: 0, openSince: null };
    circuitStore.set(host, state);
  }
  state.failures++;
  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.openSince = Date.now();
  }
}

export function getCircuitState(host: string): { open: boolean; failures: number; cooldownRemainingMs: number } {
  const state = circuitStore.get(host);
  if (!state) return { open: false, failures: 0, cooldownRemainingMs: 0 };

  const open = isCircuitOpen(host);
  const cooldownRemainingMs = state.openSince
    ? Math.max(0, CIRCUIT_BREAKER_COOLDOWN - (Date.now() - state.openSince))
    : 0;

  return { open, failures: state.failures, cooldownRemainingMs };
}

// ── Error Classification ──

function isRetryable(error: unknown, retryableErrors: string[]): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return false;
  if (error instanceof TypeError && error.message.includes('fetch')) return true;

  const msg = error instanceof Error ? error.message : String(error);
  return retryableErrors.some(pattern => msg.includes(pattern));
}

// ── Delay with Jitter ──

function computeDelay(attempt: number, baseDelay: number, maxDelay: number, jitter: boolean): number {
  const exponential = baseDelay * Math.pow(2, attempt);
  const clamped = Math.min(exponential, maxDelay);

  if (!jitter) return clamped;

  // Full jitter: random between 0 and clamped
  return Math.floor(Math.random() * clamped);
}

// ── Main Retry Function ──

/**
 * Retry an async operation with exponential backoff and circuit breaker.
 *
 * @param fn - The async function to retry
 * @param host - Host identifier for circuit breaker tracking
 * @param options - Retry configuration
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  host: string,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = 3,
    baseDelay = 500,
    maxDelay = 5000,
    jitter = true,
    retryableErrors = RETRYABLE_ERRORS,
    signal,
  } = options;

  // Check circuit breaker
  if (isCircuitOpen(host)) {
    return {
      value: null,
      success: false,
      attempts: 0,
      totalDelayMs: 0,
      lastError: new Error(`Circuit breaker open for ${host}`),
    };
  }

  let lastError: Error | null = null;
  let totalDelayMs = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // Check abort signal
    if (signal?.aborted) {
      return {
        value: null,
        success: false,
        attempts: attempt + 1,
        totalDelayMs,
        lastError: new Error('Aborted'),
      };
    }

    try {
      const value = await fn();
      recordCircuitSuccess(host);
      return {
        value,
        success: true,
        attempts: attempt + 1,
        totalDelayMs,
        lastError: null,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry non-retryable errors
      if (!isRetryable(err, retryableErrors)) {
        recordCircuitFailure(host);
        break;
      }

      // Don't retry after last attempt
      if (attempt >= maxRetries) {
        recordCircuitFailure(host);
        break;
      }

      // Wait before retry
      const delay = computeDelay(attempt, baseDelay, maxDelay, jitter);
      totalDelayMs += delay;

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    value: null,
    success: false,
    attempts: maxRetries + 1,
    totalDelayMs,
    lastError,
  };
}

// ── Convenience: Semaphore for concurrency limiting ──

export class Semaphore {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.max) {
      this.running++;
      return;
    }
    return new Promise<void>(resolve => {
      this.queue.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) next();
  }

  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}