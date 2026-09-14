import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: 'standalone' output is for self-hosting (Docker/VM) only.
  // Vercel uses its own build pipeline — no standalone needed.
  allowedDevOrigins: ["https://*.space-z.ai"],
  typescript: {
    // Type correctness is verified at build time.
  },
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Use custom loader to bypass Vercel Image Optimization
    // (free tier = 1,000/month, streaming app needs thousands)
    // TMDB/AniList/YouTube already serve optimized images at multiple sizes
    loader: 'custom',
    loaderFile: './src/lib/imageLoader.ts',
  },
  experimental: {
    scrollRestoration: true,
    optimizePackageImports: ['lucide-react', 'clsx', 'tailwind-merge'],
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async rewrites() {
    return [
      // ── Clean slug routes → internal ID-based routes ──────────────────
      // The slug contains a trailing numeric ID (e.g., inception-2010-27205).
      // Next.js rewrites extract it and map to /details/[id].
      //
      // /movie/inception-2010-27205 → /details/27205
      { source: '/movie/:slug', destination: '/details/:slug?mt=movie' },
      // /tv/breaking-bad-2008-1396 → /details/1396?mt=tv
      { source: '/tv/:slug', destination: '/details/:slug?mt=tv' },
      // /anime/one-piece-1999-100000164 → /details/100000164?mt=anime
      { source: '/anime/:slug', destination: '/details/:slug?mt=anime' },
      // /anime (bare hub, sitemap-submitted at the same priority as /movies
      // and /tv-shows) had no route at all and fell through to a login wall
      // for guests (audit finding F-06) — serve the same portal /genre/anime
      // does, at the URL siblings /movies and /tv-shows use.
      { source: '/anime', destination: '/genre/anime' },
      // /actor/leonardo-dicaprio-287 → /person/287
      { source: '/actor/:slug', destination: '/person/:slug' },
      // /country/japan → /browse?country=JP
      { source: '/country/:slug', destination: '/browse?country=:slug' },
      // /language/japanese → /browse?language=ja
      { source: '/language/:slug', destination: '/browse?language=:slug' },
      // /country/japan/1 → /browse?country=JP&page=1 (pagination)
      { source: '/country/:slug/:page', destination: '/browse?country=:slug&page=:page' },
      // /language/japanese/1 → /browse?language=ja&page=1 (pagination)
      { source: '/language/:slug/:page', destination: '/browse?language=:slug&page=:page' },
      // /studio/warner-bros → /browse?q=Warner+Bros
      { source: '/studio/:slug', destination: '/browse?q=:slug' },
    ];
  },
  async headers() {
    return [
      {
        // Public HTML pages: CDN/browser cache with stale-while-revalidate.
        // ISR revalidate controls Next.js edge cache; this header tells
        // Cloudflare/proxy and browsers to also cache the response.
        // Note: CSP and security headers are set by src/proxy.ts (auth/security layer).
        // Do NOT duplicate CSP here — the browser intersects both policies,
        // which can break scripts, iframes, and ad network integrations.
        // The excluded segments include the auth-gated / per-user routes
        // (watchlist, stats, settings, activity, collections, year-in-review,
        // profiles): those must never get a `public` cache policy — the proxy
        // marks them `private, no-store` instead. See src/proxy.ts::noStore.
        source: '/((?!api|auth|_next/static|_next/image|favicon|logo|og|manifest|robots|sitemap|watchlist|stats|settings|activity|collections|year-in-review|profiles).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600, max-age=60',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
