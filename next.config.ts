import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: ["https://*.space-z.ai"],
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "s4.anilist.co" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
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
