import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ["https://*.space-z.ai"],
  typescript: {
    ignoreBuildErrors: false,
  },
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
};

export default nextConfig;
