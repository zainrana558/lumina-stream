'use client';

/**
 * Client half of the double-submit-cookie CSRF scheme (src/lib/csrf.ts).
 *
 * The server enforces `csrfGuard` on ~18 mutating API routes but nothing was
 * ever sending the token back. This:
 *   1. ensures a `lumina_csrf` cookie exists (generates one client-side if the
 *      server hasn't set it yet — server `ensureCsrfCookie` keeps a valid
 *      pre-existing 64-hex cookie, so the two agree),
 *   2. patches window.fetch to attach `X-CSRF-Token` on same-origin `/api/`
 *      POST/PUT/PATCH/DELETE requests that don't already carry it.
 *
 * Mounted once at the top of ClientShell — no per-component changes needed.
 */

const COOKIE = 'lumina_csrf';
const HEADER = 'x-csrf-token';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function readCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function ensureToken(): string {
  let tok = readCookie();
  if (tok && /^[0-9a-f]{64}$/.test(tok)) return tok;
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  tok = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE}=${tok}; Path=/; Max-Age=86400; SameSite=Lax${secure}`;
  return tok;
}

function isSameOriginApi(url: string): boolean {
  try {
    const u = new URL(url, location.href);
    return u.origin === location.origin && u.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

let patched = false;

function installFetchPatch() {
  if (patched || typeof window === 'undefined') return;
  patched = true;
  const orig = window.fetch;

  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    try {
      const url =
        typeof input === 'string' ? input :
        input instanceof URL ? input.href :
        (input as Request).url;
      const method = (
        init?.method ||
        (input instanceof Request ? input.method : 'GET')
      ).toUpperCase();

      if (MUTATING.has(method) && isSameOriginApi(url)) {
        const token = ensureToken();
        const headers = new Headers(
          init?.headers || (input instanceof Request ? input.headers : undefined),
        );
        if (!headers.has(HEADER)) {
          headers.set(HEADER, token);
          if (input instanceof Request && !init) {
            return orig(new Request(input, { headers }));
          }
          return orig(input as RequestInfo, { ...init, headers });
        }
      }
    } catch {
      /* fall through to the original fetch */
    }
    return orig(input as RequestInfo, init);
  };
}

export default function CsrfProvider() {
  if (typeof window !== 'undefined') {
    installFetchPatch();
    ensureToken();
  }
  return null;
}
