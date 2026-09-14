/**
 * Decode the Supabase session from cookies WITHOUT a network call.
 *
 * `@supabase/ssr` (v0.10) stores the whole session in a cookie named
 * `sb-<projectRef>-auth-token`. When the value is large it is split into
 * numbered chunks `sb-<ref>-auth-token.0`, `.1`, … The (reassembled) value is
 * JSON, usually prefixed with `base64-` and base64url-encoded. Modern versions
 * store an object `{ access_token, refresh_token, expires_at, user, … }`;
 * older ones stored an array `[access_token, refresh_token, …]`.
 *
 * The signature is NOT verified here — Postgres RLS verifies it on every query.
 * We only need `user.id` + expiry to make a routing / fast-path decision. Any
 * failure returns null so the caller falls back to `supabase.auth.getUser()`.
 */

export interface CookieLike {
  name: string;
  value: string;
}

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  // atob is available in the Edge runtime, Node 16+, and browsers.
  return atob(b64);
}

// Treat a token as expired this many ms early, so a token that dies mid-request
// forces the network path (which refreshes it) instead of failing RLS queries.
const EXPIRY_SKEW_MS = 30_000;

function decodeJwtSub(token: string): { sub: string; exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const data = JSON.parse(base64UrlDecode(parts[1]));
    if (typeof data.sub !== 'string' || !data.sub) return null;
    if (data.exp && Date.now() >= data.exp * 1000 - EXPIRY_SKEW_MS) return null;
    return { sub: data.sub, exp: data.exp };
  } catch {
    return null;
  }
}

function parseSessionValue(raw: string): unknown {
  let str = raw;
  if (str.startsWith('base64-')) {
    str = base64UrlDecode(str.slice('base64-'.length));
  }
  return JSON.parse(str);
}

/**
 * @param cookies every request/response cookie (name + value)
 * @returns the authenticated user id, or null if it can't be determined locally
 */
export function localUserIdFromCookies(cookies: CookieLike[]): string | null {
  // 1. Preferred: the supabase-ssr auth-token cookie (+ its numbered chunks)
  const authParts = cookies.filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));
  if (authParts.length > 0) {
    const baseName =
      authParts.find((c) => !/\.\d+$/.test(c.name))?.name ??
      authParts[0].name.replace(/\.\d+$/, '');

    const joined = authParts
      .filter((c) => c.name === baseName || c.name.startsWith(`${baseName}.`))
      .sort((a, b) => {
        const ai = a.name === baseName ? -1 : parseInt(a.name.slice(baseName.length + 1), 10);
        const bi = b.name === baseName ? -1 : parseInt(b.name.slice(baseName.length + 1), 10);
        return ai - bi;
      })
      .map((c) => c.value)
      .join('');

    try {
      const session = parseSessionValue(joined) as
        | { access_token?: string; expires_at?: number; user?: { id?: string } }
        | unknown[];

      if (Array.isArray(session)) {
        return typeof session[0] === 'string' ? decodeJwtSub(session[0])?.sub ?? null : null;
      }
      if (session.expires_at && Date.now() >= session.expires_at * 1000 - EXPIRY_SKEW_MS) return null;
      if (session.user?.id) return session.user.id;
      if (session.access_token) return decodeJwtSub(session.access_token)?.sub ?? null;
    } catch {
      return null;
    }
    return null;
  }

  // 2. Legacy fallback: a bare access-token cookie holding a raw JWT
  const legacy = cookies.find(
    (c) => c.name.includes('-access-token') || c.name === 'sb-access-token',
  );
  if (legacy?.value) return decodeJwtSub(legacy.value)?.sub ?? null;

  return null;
}
