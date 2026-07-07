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
  async headers() {
    return [
      {
        // Public HTML pages: CDN/browser cache with stale-while-revalidate.
        // ISR revalidate controls Next.js edge cache; this header tells
        // Cloudflare/proxy and browsers to also cache the response.
        // Note: CSP and security headers are set by src/proxy.ts (auth/security layer).
        // Do NOT duplicate CSP here — the browser intersects both policies,
        // which can break scripts, iframes, and ad network integrations.
        source: '/((?!api|auth|_next/static|_next/image|favicon|logo|og|manifest|robots|sitemap).*)',
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
