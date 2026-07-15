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
    pathname.startsWith("/movie/") ||
    pathname.startsWith("/tv/") ||
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

    // CSP — frame-src restricted to known embed provider + CDN domains.
    // Providers may redirect to CDN subdomains, so wildcards are used sparingly.
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://www.intelligenceadx.com https://d2klx87bgzngce.cloudfront.net https://www.highperformancedformats.com https://www.highperformancecpm.com https://*.popads.net https://go.propellerads.com https://propellerads.com https://www.propellerads.com https://www.wvxhxwntulsdrt.com https://www.wvxhxwntusldrt.com https://www.wtumqlwqhw.com https://vidsrcme.ru https://vidsrcme.su https://vidsrc-me.ru https://vidsrc-me.su https://vidsrc.win https://player.cinezo.live https://vidcore.org",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' https://image.tmdb.org https://s4.anilist.co https://img.youtube.com https://via.placeholder.com data: blob:",
        "media-src 'self' https: blob:",
        // Known embed providers + CDN subdomains they redirect to
        "frame-src 'self' https: http: data: blob:"
          + " https://vidsrc.su https://vidsrc.ru https://vidsrc.io https://vidsrc.me"
          + " https://vidsrc.cc https://vidsrc.to https://vidsrc.rip https://vidsrc.xyz"
          + " https://vidsrc.in https://vidsrc.net https://vidsrc.mn https://vidsrc.dev"
          + " https://vidsrc.vip https://vidsrc.pro https://vidsrc.pm https://vidsrc.mov"
          + " https://vidsrc.link https://vidsrc.fyi https://vidsrc.win"
          + " https://vidsrcme.ru https://vidsrcme.su https://vidsrc-me.ru https://vidsrc-me.su"
          + " https://embed.su https://2embed.cc https://autoembed.co"
          + " https://streamsilk.com https://streamlare.com https://nontongo.win"
          + " https://filemoon.sx https://series9.io https://api.series9.io"
          + " https://vaplayer.ru https://anyembed.xyz https://vidlink.pro"
          + " https://embed.filmu.in https://pstream.org https://iframe.pstream.org"
          + " https://player.cinezo.live https://vidcore.org"
          + " https://vidbinge.com https://vidsrc.in https://embed.smashystream.com"
          // Broad CDN patterns providers commonly redirect to
          + " https://cf.*.site https://*.cloudfront.net https://*.fastly.net"
          + " https://*.m3u8.click https://*.vidplay.site https://*.vidsrc.*",
        "connect-src 'self' https: https://*.supabase.co https://*.supabase.com https://*.popads.net https://*.propellerads.com https://*.highperformancedformats.com",
        "worker-src 'self' blob:",
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
    const response = NextResponse.next({ request });

    // Still rate-limit API routes even on public paths
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

    const { data: { user } } = await supabase.auth.getUser();
    const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

    // Unauthenticated → /login
    if (!user && !isAuthPage) {
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
            return NextResponse.redirect(new URL("/profiles", request.url));
          }
        } catch {
          supabaseResponse.cookies.set("profile_id", "", {
            path:     "/",
            maxAge:   0,
            httpOnly: true,
            secure:   process.env.NODE_ENV === "production",
            sameSite: "lax",
          });
          return NextResponse.redirect(new URL("/profiles", request.url));
        }
      }
    }

    setSecurityHeaders(supabaseResponse, pathname, request);

    // ── Restore public caching for SSG/ISR pages ─────────────────────────
    // NextResponse.next({ request }) sets "private, no-cache, no-store"
    // whenever the request object is passed (cookie mutation detection).
    // This kills CDN caching for all pages. For public HTML pages, we
    // restore a public cache policy so Vercel Edge + Cloudflare can cache.
    // API routes set their own Cache-Control in their handlers.
    if (!pathname.startsWith("/api/")) {
      supabaseResponse.headers.set(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600, max-age=60"
      );
      supabaseResponse.headers.set("X-MW-Cache", "set");
    }

    return supabaseResponse;

  } catch {
    const { pathname: pn } = request.nextUrl;
    const isAuthPage   = pn.startsWith("/login") || pn.startsWith("/signup");

    if (!isAuthPage && !isPublicPath(pn)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const response = NextResponse.next({ request });
    setSecurityHeaders(response, pn, request);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.svg|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)$).*)",
  ],
};
