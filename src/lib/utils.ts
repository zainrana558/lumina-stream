import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitize a user-provided profile name.
 * Strips HTML tags, removes non-word characters, trims to 20 chars.
 * Falls back to "Anonymous" if empty after sanitization.
 */
export function sanitizeName(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s]/g, '')
    .trim()
    .slice(0, 20) || 'Anonymous';
}

/**
 * Validate a redirect target is a same-origin relative path before passing it
 * to router.push()/NextResponse.redirect(). Rejects anything that could
 * resolve to a different origin once a URL parser normalizes it — not just
 * `//host` or `scheme://host`, but also a leading backslash or whitespace
 * (`"/\\evil.com"`, `"  //evil.com"`), which WHATWG URL parsing collapses
 * into `//evil.com` *after* those simpler checks would have already passed.
 * Falls back to `/` for anything that doesn't match.
 */
export function safeRedirectPath(raw: string | null | undefined): string {
  if (raw && /^\/(?!\/)[^\s\\]*$/.test(raw)) return raw;
  return '/';
}
