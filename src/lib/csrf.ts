/**
 * Double-submit cookie CSRF protection for state-mutating API routes.
 *
 * How it works:
 *   1. On first GET to any API route, a CSRF token is set as a non-HttpOnly cookie.
 *   2. The client reads this cookie via JS and sends it back in a custom header
 *      (X-CSRF-Token) on POST/PUT/PATCH/DELETE requests.
 *   3. The server compares the cookie value with the header value.
 *      If they don't match, the request is rejected.
 *
 * This is safe because:
 *   - An attacker's site can't read the cookie (SameSite=Lax)
 *   - An attacker's form submission can't set custom headers (browser enforces this)
 *
 * Reference: https://security.stackexchange.com/a/63540
 */

import { cookies } from 'next/headers';

const CSRF_COOKIE_NAME = 'lumina_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically random CSRF token.
 */
function generateToken(): string {
  const bytes = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get the existing CSRF token from cookies, or generate and set a new one.
 * Called on read requests to ensure the cookie exists.
 *
 * Returns the current CSRF token string.
 */
export async function ensureCsrfCookie(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (existing && existing.length === CSRF_TOKEN_LENGTH * 2) {
    return existing;
  }

  const token = generateToken();
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    path: '/',
    httpOnly: false,        // Must be readable by client JS
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,   // 24 hours
  });

  return token;
}

/**
 * Validate a CSRF token on a state-mutating request.
 * Compares the X-CSRF-Token header with the lumina_csrf cookie.
 *
 * Returns true if valid, false if missing or mismatched.
 */
export async function validateCsrfToken(request: Request): Promise<boolean> {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) return false;

  // Constant-time comparison to prevent timing attacks.
  // Pad both to fixed length (CSRF_TOKEN_LENGTH * 2) to avoid length-based timing leaks.
  const encoder = new TextEncoder();
  const fixedLen = CSRF_TOKEN_LENGTH * 2;
  const a = encoder.encode(cookieToken.padEnd(fixedLen, '0'));
  const b = encoder.encode(headerToken.padEnd(fixedLen, '0'));

  let result = 0;
  for (let i = 0; i < a.byteLength; i++) {
    result |= a[i]! ^ b[i]!;
  }
  return result === 0;
}

/**
 * Middleware helper: returns a 403 response if CSRF validation fails.
 * Use in POST/PUT/PATCH/DELETE handlers.
 *
 * @returns null if valid, or a NextResponse(403) if invalid
 */
export async function csrfGuard(request: Request): Promise<null | { error: string; status: 403 }> {
  const valid = await validateCsrfToken(request);
  if (!valid) {
    return { error: 'CSRF validation failed. Refresh the page and try again.', status: 403 };
  }
  return null;
}