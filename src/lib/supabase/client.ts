import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'https://your-project-id.supabase.co');
}

/**
 * Read the CSRF token from the lumina_csrf cookie (set by the server).
 * Returns the token string or null if not set.
 *
 * Pass this as the X-CSRF-Token header on all POST/PUT/PATCH/DELETE requests.
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)lumina_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Wrapper around fetch() that automatically attaches the CSRF token
 * to state-mutating requests. Use this for all API calls.
 */
export async function fetchWithCsrf(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const options: RequestInit = { ...init };

  const method = (init?.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      options.headers = {
        ...(options.headers as Record<string, string> | undefined),
        'X-CSRF-Token': csrfToken,
      };
    }
  }

  return fetch(input, options);
}

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}
