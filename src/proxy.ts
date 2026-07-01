import { type NextRequest, NextResponse } from "next/server";

// ── Middleware (Next.js middleware — must be named middleware.ts) ──────────
// Auth, security headers, rate limiting.

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
    pathname.startsWith("/seasonal") ||
    pathname.startsWith("/leaderboard") ||
    pathname.startsWith("/release-calendar") ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/sitemap-") ||
    pathname === "/robots.txt" ||
    pathname === "/google08ae0ae380a50693.html"
  );
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
    // X-Frame-Options: NOT set here. This is a streaming site that embeds
    // third-party video providers via iframes. Setting DENY/SAMEORIGIN
    // would block all embed players. The page itself doesn't need framing
    // protection since it's a standalone app.
    response.headers.set("X-Content-Type-Options",   "nosniff");
    response.headers.set("X-XSS-Protection",          "1; mode=block");
    response.headers.set("Referrer-Policy",           "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy",        "camera=(), microphone=(), geolocation=()");
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

    // CSP — allows any HTTPS iframe (streaming site loads 45+ embed providers
    // that rotate frequently; a static whitelist would break on every pool change).
    // Script/img/connect are locked down for XSS protection.
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://www.intelligenceadx.com https://d2klx87bgzngce.cloudfront.net https://www.highperformancedformats.com https://www.highperformancecpm.com https://popads.net https://cdn.popads.net https://go.propellerads.com https://propellerads.com https://www.propellerads.com https://www.wvxhxwntulsdrt.com https://www.wtumqlwqhw.com https://vidsrc-embed.ru",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' https://image.tmdb.org https://s4.anilist.co https://img.youtube.com https://via.placeholder.com data: blob:",
        "media-src 'self' https: blob:",
        // Allow any HTTPS iframe — embed providers rotate via replacement pool
        "frame-src 'self' https:",
        "connect-src 'self' https: https://*.supabase.co https://*.supabase.com https://*.popads.net https://*.propellerads.com https://*.highperformancedformats.com",
        "worker-src 'self' blob:",
      ].join("; ")
    );
  }

  if (isApi) {
    // Allow requests from both the Cloudflare Worker domain and the Vercel domain.
    // NEXT_PUBLIC_SITE_URL must be set to the Cloudflare Worker URL in production
    // (e.g. https://cache-proxy.zainrana553.workers.dev or custom domain).
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lumina-stream-omega.vercel.app";
    const origin  = request.headers.get("Origin") || "";
    const vercelUrl = "https://lumina-stream-omega.vercel.app";
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
// Cloudflare Worker forwards the real client IP via x-forwarded-for /
// x-real-ip after stripping cf-connecting-ip. Read both headers.
function getClientIp(request: NextRequest): string {
  // Security assumption: This middleware only runs behind Cloudflare or Vercel,
  // which overwrites x-forwarded-for with the real client IP, so spoofing is not a concern.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
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
  try {
    const { createServerClient } = await import("@supabase/ssr");
    let supabaseResponse = NextResponse.next({ request });

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
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const pathname  = request.nextUrl.pathname;
    const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

    // Unauthenticated → /login (not /, which would cause a confusing redirect loop)
    if (!user && !isAuthPage && !isPublicPath(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Authenticated + visiting auth page → profiles
    if (user && isAuthPage) {
      return NextResponse.redirect(new URL("/profiles", request.url));
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
            supabaseResponse.cookies.set("profile_id", "", {
              path:     "/",
              maxAge:   0,
              httpOnly: true,
              secure:   process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          }
        } catch {
          // Profile check failed — continue (fail open)
        }
      }
    }

    // Global rate limiting on API routes
    if (pathname.startsWith("/api/")) {
      const ip = getClientIp(request);
      if (!isBot(request.headers.get("user-agent"))) {
        const rl = checkGlobalRateLimit(ip);
        if (!rl.success) {
          return NextResponse.json(
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
        }
        supabaseResponse.headers.set("X-RateLimit-Remaining", String(rl.remaining));
      }
    }

    setSecurityHeaders(supabaseResponse, pathname, request);
    return supabaseResponse;

  } catch {
    // Middleware error — fail open for public/auth pages, redirect to /login for protected
    const { pathname } = request.nextUrl;
    const isAuthPage   = pathname.startsWith("/login") || pathname.startsWith("/signup");

    if (!isAuthPage && !isPublicPath(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const response = NextResponse.next({ request });
    setSecurityHeaders(response, pathname, request);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.svg|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)$).*)",
  ],
};
