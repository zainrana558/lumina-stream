import { type NextRequest, NextResponse } from "next/server";

// ---- Path helpers ----
function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/browse") ||
    pathname.startsWith("/genre/") ||
    pathname.startsWith("/details/") ||
    pathname.startsWith("/profiles")
  );
}

// ---- Security headers (Cloudflare + Vercel compatible) ----
function setSecurityHeaders(response: NextResponse, pathname: string) {
  // Skip static assets and _next internals for most headers
  const isApi = pathname.startsWith("/api/");
  const isStatic = pathname.startsWith("/_next") || pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/);

  if (!isStatic) {
    // Prevent clickjacking
    response.headers.set("X-Frame-Options", "DENY");

    // Prevent MIME type sniffing
    response.headers.set("X-Content-Type-Options", "nosniff");

    // XSS protection (legacy browsers)
    response.headers.set("X-XSS-Protection", "1; mode=block");

    // Referrer policy — no referrer leakage
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Permissions policy — restrict browser features
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    // HSTS — enforce HTTPS (1 year, include subdomains)
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );

    // Content Security Policy (restrictive frame-src for streaming app)
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' https://image.tmdb.org https://s4.anilist.co https://img.youtube.com https://via.placeholder.com data: blob:",
        "media-src 'self' https: blob:",
        "frame-src 'self' https://vidsrc.fyi https://vidsrc.cc https://vidsrc.xyz https://vidsrc.to https://vidsrc.net https://vidsrc.pro https://vidsrc.app https://vidsrc.ic https://www.2embed.online https://autoembed.co https://vidphantom.com https://api.codespecters.com https://embed.su https://embedvip.com https://multiembed.mov https://moviesapi.club https://animekaizoku.com https://animixplay.to https://yugenanime.tv https://gogoanime.cl https://zoro.to",
        "connect-src 'self' https://*.supabase.co https://*.supabase.com https://api.themoviedb.org https://upstash.io https://*.upstash.io https://graphql.anilist.co https://accounts.google.com https://github.com",
        "worker-src 'self' blob:",
      ].join("; ")
    );
  }

  // API-specific headers
  if (isApi) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://luminaa2-vum6.vercel.app";
    response.headers.set("Access-Control-Allow-Origin", siteUrl);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers.set("Access-Control-Max-Age", "86400");

    // No caching for API responses by default (individual routes override)
    response.headers.set("Cache-Control", "no-store");
  }
}

// ---- IP extraction ----
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

// ---- Global in-memory rate limiter (fallback for API routes) ----
const globalRateMap = new Map<string, { count: number; resetAt: number }>();
const GLOBAL_LIMIT = 120; // requests per window
const GLOBAL_WINDOW_MS = 10_000; // 10 seconds

function checkGlobalRateLimit(ip: string): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = globalRateMap.get(ip);

  if (!entry || now > entry.resetAt) {
    globalRateMap.set(ip, { count: 1, resetAt: now + GLOBAL_WINDOW_MS });
    return { success: true, remaining: GLOBAL_LIMIT - 1 };
  }

  if (entry.count >= GLOBAL_LIMIT) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: GLOBAL_LIMIT - entry.count };
}

// Cleanup stale entries every 60s to prevent memory leak
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of globalRateMap.entries()) {
      if (now > val.resetAt) globalRateMap.delete(key);
    }
  }, 60_000);
}

// ---- Known bot/user-agent patterns to exempt from rate limiting ----
const BOT_PATTERNS = [
  /googlebot/i, /bingbot/i, /slurp/i, /duckduckbot/i,
  /baiduspider/i, /yandexbot/i, /facebookexternalhit/i,
  /twitterbot/i, /discordbot/i, /telegrambot/i,
];

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return BOT_PATTERNS.some(p => p.test(userAgent));
}

export async function proxy(request: NextRequest) {
  try {
    const { createServerClient } = await import("@supabase/ssr");

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;
    const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

    if (!user && !isAuthPage && !isPublicPath(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (user && isAuthPage) {
      return NextResponse.redirect(new URL("/profiles", request.url));
    }

    // Profile cookie validation
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
            // Clear cookie matching original attributes to ensure browser removes it
            supabaseResponse.cookies.set("profile_id", "", {
              path: "/",
              maxAge: 0,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          }
        } catch {
          // Profile check failed — continue anyway
        }
      }
    }

    // ---- Global rate limiting on API routes ----
    if (pathname.startsWith("/api/")) {
      const ip = getClientIp(request);
      const userAgent = request.headers.get("user-agent");

      // Skip rate limiting for bots (SEO, social previews)
      if (!isBot(userAgent)) {
        const result = checkGlobalRateLimit(ip);
        if (!result.success) {
          return NextResponse.json(
            { error: "Too many requests. Please slow down." },
            {
              status: 429,
              headers: {
                "Retry-After": "10",
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": String(Math.ceil((Date.now() + GLOBAL_WINDOW_MS) / 1000)),
              },
            }
          );
        }
        supabaseResponse.headers.set("X-RateLimit-Remaining", String(result.remaining));
      }
    }

    // ---- Security headers ----
    setSecurityHeaders(supabaseResponse, pathname);

    return supabaseResponse;
  } catch {
    // Proxy error — fail open for public/auth, fail closed for protected
    const { pathname } = request.nextUrl;
    const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");

    if (!isAuthPage && !isPublicPath(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const response = NextResponse.next({ request });
    setSecurityHeaders(response, pathname);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|logo.svg|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ico)$).*)",
  ],
};
