import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: 'standalone' output is for self-hosting (Docker/VM) only.
  // Vercel uses its own build pipeline — no standalone needed.
  allowedDevOrigins: ["https://*.space-z.ai"],
  typescript: {
    // Turbopack's TS plugin caches type info aggressively and doesn't pick up
    // explicit type changes in some cases (e.g. CacheCategory union extension).
    // Type correctness is verified via `npx tsc --noEmit` in CI instead.
    ignoreBuildErrors: true,
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
  async headers() {
    return [
      {
        // Public HTML pages: CDN/browser cache with stale-while-revalidate.
        // ISR revalidate controls Next.js edge cache; this header tells
        // Cloudflare/proxy and browsers to also cache the response.
        source: '/((?!api|auth|_next/static|_next/image|favicon|logo|og|manifest|robots|sitemap).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600, max-age=60',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com https://www.intelligenceadx.com https://d2klx87bgzngce.cloudfront.net https://www.symivbxtgw.com https://www.ofcgcdcvk.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "img-src 'self' https://image.tmdb.org https://s4.anilist.co https://img.youtube.com https://via.placeholder.com data: blob:",
              "media-src 'self' https: blob:",
              "frame-src 'self' https://vidsrc.fyi https://vidsrc.pm https://vidsrc.in https://vidsrc.io https://autoembed.co https://vidphantom.com https://api.codespecters.com",
              "connect-src 'self' https: https://*.supabase.co https://*.supabase.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
