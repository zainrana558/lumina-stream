import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware — overrides Next.js default Cache-Control for public pages.
 *
 * Problem: Next.js marks pages as "dynamic" when they use async server
 * components that call external APIs (TMDB, AniList). Even with
 * `revalidate = 300`, the runtime sets `private, no-cache, no-store`
 * which prevents Vercel CDN caching. Googlebot gets a full SSR on
 * every request, wasting crawl budget and increasing TTFB.
 *
 * This middleware lets Next.js render the page normally, then overrides
 * the Cache-Control to allow CDN caching with ISR-style revalidation.
 */

// Pages that should NOT be cached (personalized, auth-required)
const NO_CACHE_PATTERNS = [
  '/api/',
  '/auth/',
  '/login',
  '/signup',
  '/settings',
  '/watchlist',
  '/profiles',
  '/select-profile',
  '/activity',
  '/collections',
  '/stats',
  '/year-in-review',
  '/embed/',
];

function shouldSkipCache(pathname: string): boolean {
  return NO_CACHE_PATTERNS.some(p => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip non-page routes and private pages
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/og/') ||
    pathname.includes('.') || // static files
    shouldSkipCache(pathname)
  ) {
    return NextResponse.next();
  }

  // Override Cache-Control for all public pages
  const response = NextResponse.next();
  response.headers.delete('Cache-Control');
  response.headers.set(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=600, max-age=60'
  );
  return response;
}

export const config = {
  // Match all paths except _next/static and _next/image (handled by Next.js)
  matcher: ['/((?!_next/static|_next/image).*)'],
};