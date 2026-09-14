import { type NextRequest, NextResponse } from "next/server";
import { localUserIdFromCookies } from "@/lib/supabase/cookie-session";

// ── Middleware (Next.js middleware — must be named middleware.ts) ──────────
// Auth, security headers, rate limiting.

/**
 * Decode the Supabase access-token JWT from the request cookies without a
 * network call. Signature is NOT verified here (Postgres RLS does that on
 * every query); we only need the user id + expiry for the routing decision.
 * Returns null when the token is missing, malformed, or expired — the caller
 * then falls back to supabase.auth.getUser() (which also refreshes it).
 */
function localUserIdFromRequest(request: NextRequest): string | null {
  return localUserIdFromCookies(request.cookies.getAll());
}

// ── Protected paths — the ONLY routes an unauthenticated visitor should be
// bounced to /login for. Everything else that reaches the auth-check branch
// (i.e. isn't on the public allowlist below) is either a legitimate page whose
// own UI handles "not signed in", or doesn't exist — either way it should fall
// through to Next's normal routing (a real 404 for the latter), not get
// redirected to a login wall. Audit finding F-06: `/anime` and even
// deliberately-bogus URLs like `/totally-fake-path` were both landing on the
// Sign In screen because this used to be unconditional.
const PROTECTED_PREFIXES = ["/watchlist", "/stats", "/settings", "/activity", "/collections", "/year-in-review", "/profiles"];
function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// ── Public paths — no auth required ────────────────────────────────────────
// ONLY truly public pages. Protected pages (/watchlist, /settings, /stats,
// /activity, /collections) are intentionally absent — unauthenticated users
// get redirected to /login.
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/browse") ||
    pathname.startsWith("/genre/") ||
    pathname.startsWith("/details/") ||
    pathname.startsWith("/person/") ||
    pathname.startsWith("/movie/") ||
    pathname.startsWith("/tv/") ||
    pathname === "/anime" ||
    pathname.startsWith("/anime/") ||
    pathname.startsWith("/actor/") ||
    pathname.startsWith("/country/") ||
    pathname.startsWith("/language/") ||
    pathname.startsWith("/studio/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/movies") ||
    pathname.startsWith("/tv-shows") ||
    pathname.startsWith("/top-rated") ||
    pathname.startsWith("/new-releases") ||
    pathname.startsWith("/genres") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/dmca") ||
    pathname.startsWith("/cookies") ||
    pathname.startsWith("/disclaimer") ||
    pathname.startsWith("/decade/") ||
    pathname.startsWith("/year/") ||
    pathname.startsWith("/blog") ||
    pathname.startsWith("/seasonal") ||
    pathname.startsWith("/leaderboard") ||
    pathname.startsWith("/release-calendar") ||
    pathname.startsWith("/trending") ||
    pathname.startsWith("/actors") ||
    pathname.startsWith("/directors") ||
    pathname.startsWith("/studios") ||
    pathname.startsWith("/countries") ||
    pathname.startsWith("/languages") ||
    pathname.startsWith("/reviews") ||
    pathname.startsWith("/news") ||
    pathname.startsWith("/guides") ||
    pathname.startsWith("/guide/") ||
    pathname.startsWith("/coming-soon") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/contact") ||
    pathname === "/sitemap.xml" ||
    pathname.endsWith(".xml") ||
    pathname === "/robots.txt" ||
    pathname === "/google08ae0ae380a50693.html"
  );
}

/**
 * Force a response to never be stored by a shared cache. Used for every
 * protected-path response (auth redirects AND authenticated page HTML) — those
 * depend on the caller's auth state / carry per-user data, and the blanket
 * `public, s-maxage=300` rule in next.config.ts would otherwise let the CF
 * cache-proxy serve one user's redirect or private page to everyone.
 */
function noStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  response.headers.set("CDN-Cache-Control", "no-store");
  response.headers.set("Vary", "Cookie");
  return response;
}

// ── Security headers ────────────────────────────────────────────────────────
// Note: X-Frame-Options is set here but intentionally stripped by the
// Cloudflare Worker (workers/cache-proxy.js) so that video embed iframes
// inside detail pages work. CSP frame-src already whitelists those domains.
// Do NOT strip CSP — it provides XSS / script-src protection.
function setSecurityHeaders(response: NextResponse, pathname: string, request: NextRequest) {
  const isApi    = pathname.startsWith("/api/");
  const isStatic = pathname.startsWith("/_next") || /\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/.test(pathname);

  if (!isStatic) {
    // X-Frame-Options / frame-ancestors: previously omitted on the theory that
    // it would block the site's own video embeds — that's a mix-up between two
    // different directives. frame-src (set below, unaffected by this) governs
    // iframes Lumovia embeds; frame-ancestors / X-Frame-Options govern whether
    // Lumovia's OWN pages can be framed BY another site. SAMEORIGIN here stops
    // a third party from framing Lumovia for clickjacking without touching the
    // embed players at all (audit findings: original report's F-09/security
    // notes, and the Round-9 GitHub audit's F-08).
    response.headers.set("X-Frame-Options", "SAMEORIGIN");
    response.headers.set("X-Content-Type-Options",   "nosniff");
    response.headers.set("X-XSS-Protection",          "1; mode=block");
    response.headers.set("Referrer-Policy",           "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy",        "camera=(), microphone=(), geolocation=()");
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

    // CSP — frame-src restricted to known embed provider + CDN domains.
    // Providers may redirect to CDN subdomains, so wildcards are used sparingly.
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://www.intelligenceadx.com https://d2klx87bgzngce.cloudfront.net https://www.highperformancedformats.com https://www.highperformancecpm.com https://*.popads.net https://go.propellerads.com https://propellerads.com https://www.propellerads.com https://vidsrcme.ru https://vidsrcme.su https://vidsrc-me.ru https://vidsrc-me.su https://vidsrc.win https://player.cinezo.live https://vidcore.org",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data: https://fonts.gstatic.com",
        // media.kitsu.app: added when Kitsu became the anime-fallback image
        // source (Round 6) — this was missed then, silently blocking every
        // Kitsu-sourced anime poster/backdrop (CSP violations don't throw,
        // they just drop the image), audit finding F-04.
        "img-src 'self' https://image.tmdb.org https://s4.anilist.co https://media.kitsu.app https://img.youtube.com https://via.placeholder.com https://flagcdn.com data: blob:",
        "media-src 'self' https: blob:",
        // Embed players are third-party and rotate domains/CDNs constantly, so
        // `https:` (any secure origin) is the only workable allowance. An
        // explicit per-domain list here was both redundant (— `https:` already
        // covers it) and, worse, contained invalid tokens (`https://cf.*.site`,
        // `https://*.vidsrc.*` — a `*` may only lead a host) that the browser
        // rejected and logged as a CSP error on every page load.
        "frame-src 'self' https: data: blob:",
        // wss: explicitly required for Supabase Realtime's websocket — `https:`
        // does NOT cover the `wss:` scheme, so this was silently blocking the
        // Realtime subscriptions added for NotificationBell/WatchPartyPanel
        // (confirmed via a real browser: connection blocked, no console error
        // shown to the user, badge/chat just never updated).
        "connect-src 'self' https: wss://*.supabase.co wss://*.supabase.com https://*.supabase.co https://*.supabase.com https://*.popads.net https://*.propellerads.com https://*.highperformancedformats.com",
        "worker-src 'self' blob:",
        // Defense-in-depth alongside X-Frame-Options: SAMEORIGIN below —
        // doesn't affect the embed iframes Lumovia itself loads (that's
        // frame-src, above); this only governs who may frame Lumovia's pages.
        "frame-ancestors 'self'",
      ].join("; ")
    );
  }

  if (isApi) {
    // Allow requests from both the Cloudflare Worker domain and the Vercel domain.
    // NEXT_PUBLIC_SITE_URL must be set to the Cloudflare Worker URL in production
    // (e.g. https://cache-proxy.zainrana553.workers.dev or custom domain).
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lumovia-stream-omega.vercel.app";
    const origin  = request.headers.get("Origin") || "";
    const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "https://lumovia-stream-omega.vercel.app";
    const allowedOrigins = new Set([siteUrl, vercelUrl]);
    const reflected = origin && allowedOrigins.has(origin) ? origin : siteUrl;
    response.headers.set("Access-Control-Allow-Origin",  reflected);
    response.headers.set("Vary",                          "Origin");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Max-Age",        "86400");
    // Do NOT set Cache-Control here — let API routes set their own caching
    // headers (s-maxage, X-Cache-Category). The CF cache-proxy reads these
    // to determine edge TTL. Overwriting with no-store breaks all edge caching.
    // Per-user routes (stats, reminders, progress) already set "private" in
    // their own handlers.
  }
}

// ── IP extraction ───────────────────────────────────────────────────────────
// Cloudflare Worker forwards the real client IP via cf-connecting-ip.
// Prefer cf-connecting-ip (set by Cloudflare, cannot be spoofed by client),
// then x-forwarded-for (set by Vercel/Cloudflare), then x-real-ip.
function getClientIp(request: NextRequest): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.split(',')[0].trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// ── Global in-memory rate limiter (fallback when Redis is unavailable) ──────
const globalRateMap = new Map<string, { count: number; resetAt: number }>();
const GLOBAL_LIMIT     = 120;
const GLOBAL_WINDOW_MS = 10_000; // 10 s

function checkGlobalRateLimit(ip: string): { success: boolean; remaining: number } {
  const now   = Date.now();
  const entry = globalRateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    globalRateMap.set(ip, { count: 1, resetAt: now + GLOBAL_WINDOW_MS });
    return { success: true, remaining: GLOBAL_LIMIT - 1 };
  }
  if (entry.count >= GLOBAL_LIMIT) return { success: false, remaining: 0 };

  entry.count++;
  return { success: true, remaining: GLOBAL_LIMIT - entry.count };
}

// Purge stale entries every 60s to prevent unbounded memory growth
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of globalRateMap.entries()) {
      if (now > val.resetAt) globalRateMap.delete(key);
    }
  }, 60_000);
}

// ── Known bot UA patterns — exempt from rate limiting ──────────────────────
const BOT_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /baiduspider/i, /yandexbot/i, /facebookexternalhit/i,
  /twitterbot/i, /discordbot/i, /telegrambot/i,
];
function isBot(ua: string | null): boolean {
  if (!ua) return false;
  return BOT_PATTERNS.some(p => p.test(ua));
}

// ── Middleware ──────────────────────────────────────────────────────────────
export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Fast path: public pages skip Supabase entirely ──────────────────────
  // Calling supabase.auth.getUser() reads cookies, which makes Next.js mark
  // the response as dynamic (private, no-store). This kills CDN caching and
  // forces full SSR + TMDB API calls on EVERY page view (~66k Worker
  // invocations/day). Public pages don't need auth — skip it.
  if (isPublicPath(pathname)) {
    // Bare next() — passing `{ request }` (for header rewrites we don't do here)
    // makes middleware emit a concrete 200 response that pins the final status,
    // so a page's notFound() renders the 404 body but can't set a 404 status.
    const response = NextResponse.next();

    // Still rate-limit API routes even on public paths
    if (pathname.startsWith("/api/")) {
      const ip = getClientIp(request);
      if (!isBot(request.headers.get("user-agent"))) {
        const rl = checkGlobalRateLimit(ip);
        if (!rl.success) {
          const limited = NextResponse.json(
            { error: "Too many requests. Please slow down." },
            {
              status: 429,
              headers: {
                "Retry-After":          "10",
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset":     String(Math.ceil((Date.now() + GLOBAL_WINDOW_MS) / 1000)),
              },
            }
          );
          setSecurityHeaders(limited, pathname, request);
          return limited;
        }
        response.headers.set("X-RateLimit-Remaining", String(rl.remaining));
      }
    }

    setSecurityHeaders(response, pathname, request);
    return response;
  }

  // ── Protected paths: full auth check ────────────────────────────────────
  try {
    const { createServerClient } = await import("@supabase/ssr");
    let supabaseResponse = NextResponse.next();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!supabaseUrl && !supabaseAnonKey) return NextResponse.next({ request });

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            // DO NOT pass { request } here — it forces Next.js to set
            // "private, no-cache, no-store" which kills CDN caching.
            // We create a plain next() and copy cookies manually.
            const fresh = NextResponse.next();
            cookiesToSet.forEach(({ name, value, options }) =>
              fresh.cookies.set(name, value, options as { name: string; value: string; path: string; maxAge?: number; domain?: string; httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" | "none" })
            );
            supabaseResponse = fresh;
          },
        },
      }
    );

    // Fast path: valid unexpired JWT in cookies → no Supabase Auth round-trip
    // (saves ~150-450ms on every protected-path request). Only call getUser()
    // — which also refreshes the token — when the local decode fails.
    let user: { id: string } | null = null;
    const fastId = localUserIdFromRequest(request);
    if (fastId) {
      user = { id: fastId };
    } else {
      const { data } = await supabase.auth.getUser();
      user = data.user ? { id: data.user.id } : null;
    }
    const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

    // Unauthenticated → /login, but only for actually-protected routes. Anything
    // else that isn't on the public allowlist falls through to Next's normal
    // routing (a real 404 for a route that doesn't exist) instead of a login
    // wall — see the isProtectedPath comment above (audit finding F-06).
    if (!user && !isAuthPage) {
      if (!isProtectedPath(pathname)) {
        const response = NextResponse.next();
        setSecurityHeaders(response, pathname, request);
        return response;
      }
      return noStore(NextResponse.redirect(new URL("/login", request.url)));
    }

    // Authenticated + visiting auth page → profiles
    if (user && isAuthPage) {
      return noStore(NextResponse.redirect(new URL("/profiles", request.url)));
    }

    // Validate profile_id cookie ownership (prevent cookie-stuffing)
    if (user) {
      const profileIdCookie = request.cookies.get("profile_id")?.value;
      if (profileIdCookie) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", profileIdCookie)
            .eq("account_id", user.id)
            .maybeSingle();

          if (!profile) {
            // Bug: the clear-cookie header was previously set on
            // `supabaseResponse`, but the function returned a *different*,
            // freshly-constructed NextResponse.redirect() — the clearing
            // header never reached the browser, so the stale cookie
            // persisted and every subsequent request re-triggered this same
            // redirect, an infinite loop (confirmed live: net::ERR_TOO_MANY_REDIRECTS
            // whenever a selected profile is deleted, e.g. from another
            // device/tab, while this browser still holds its cookie).
            const redirect = noStore(NextResponse.redirect(new URL("/profiles", request.url)));
            redirect.cookies.set("profile_id", "", {
              path:     "/",
              maxAge:   0,
              httpOnly: true,
              secure:   process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
            return redirect;
          }
        } catch {
          const redirect = NextResponse.redirect(new URL("/profiles", request.url));
          redirect.cookies.set("profile_id", "", {
            path:     "/",
            maxAge:   0,
            httpOnly: true,
            secure:   process.env.NODE_ENV === "production",
            sameSite: "lax",
          });
          return redirect;
        }
      }
    }

    setSecurityHeaders(supabaseResponse, pathname, request);

    // ── Caching for protected paths ──────────────────────────────────────
    // We only reach here for paths NOT on the public allowlist — i.e. routes
    // whose response depends on the caller's auth state or carries per-user
    // data (/watchlist, /stats, /settings, /activity, /collections,
    // /year-in-review, /profiles …). These must NEVER be stored by a shared
    // cache: the CF cache-proxy keys purely on URL, so a public entry would
    // leak one user's page (or their post-login redirect) to everyone.
    // The blanket `public, s-maxage=300` rule in next.config.ts would do
    // exactly that, so override it here.
    if (!pathname.startsWith("/api/")) {
      noStore(supabaseResponse);
      supabaseResponse.headers.set("X-MW-Cache", "no-store");
    }

    return supabaseResponse;

  } catch {
    const { pathname: pn } = request.nextUrl;
    const isAuthPage   = pn.startsWith("/login") || pn.startsWith("/signup");

    if (!isAuthPage && !isPublicPath(pn)) {
      return noStore(NextResponse.redirect(new URL("/login", request.url)));
    }

    const response = NextResponse.next();
    setSecurityHeaders(response, pn, request);
    if (!isPublicPath(pn) && !pn.startsWith("/api/")) noStore(response);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.svg|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)$).*)",
  ],
};
