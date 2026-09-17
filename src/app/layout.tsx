import type { Metadata } from "next";
import { safeJsonLd } from '@/lib/jsonld';
import { Cinzel_Decorative, Cinzel, Crimson_Pro } from "next/font/google";
import "@/styles/global.css";
import { CANONICAL_BASE } from '@/lib/seo/constants';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import CsrfProvider from '@/components/common/CsrfProvider';

const cinzelDec = Cinzel_Decorative({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-cinzel-dec",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cinzel",
  display: "swap",
});

const crimson = Crimson_Pro({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-crimson",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lumovia — Free Movies, TV Shows & Anime",
    template: "%s | Lumovia",
  },
  description: "Stream thousands of free movies, TV shows, anime, and cartoons on Lumovia. Discover trending, top-rated, and new releases updated daily.",
  metadataBase: new URL(CANONICAL_BASE),
  alternates: { languages: { 'x-default': CANONICAL_BASE, 'en-US': CANONICAL_BASE } },
  manifest: '/manifest.json',
  openGraph: {
    title: "Lumovia",
    description: "Free movies, TV shows, anime & cartoons on Lumovia.",
    type: "website",
    url: CANONICAL_BASE,
    siteName: "Lumovia",
    locale: "en_US",
    images: [{ url: `${CANONICAL_BASE}/og/og-movies.png`, width: 1344, height: 768, alt: "Lumovia - Dream, Discover, Stream" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumovia",
    description: "Free movies, TV shows, anime & cartoons on Lumovia.",
    images: [`${CANONICAL_BASE}/og/og-movies.png`],
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: "/logo.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lumovia',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US" suppressHydrationWarning className={`${cinzelDec.variable} ${cinzel.variable} ${crimson.variable}`}>
      <head>
        {/* Applies the saved light/dark choice before first paint — runs
            synchronously in <head>, ahead of hydration, so a light-mode
            visitor never sees a flash of the default dark theme first.
            suppressHydrationWarning on <html> above is required for this:
            React would otherwise flag the attribute this script adds as a
            server/client mismatch. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('lumina-color-scheme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="dns-prefetch" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://api-cache.zainrana553.workers.dev" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Lumovia" />
        <meta name="theme-color" content="#FFB347" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="google-site-verification" content="IZ_kgkZCobezDHfENC4rcTL_eNcV1i71jvcEVmTRrlc" />
        <meta name="google-site-verification" content="7GLDADu8cHgC3DgA2pmUpHQoXEgehwnk3dLXtedP-F4" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'Lumovia',
              url: CANONICAL_BASE,
              logo: `${CANONICAL_BASE}/logo.svg`,
              sameAs: ['https://github.com/zainrana558'],
              description: 'Lumovia is a free streaming catalog and content discovery platform for movies, TV shows, anime, and cartoons, powered by TMDB and AniList.',
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Lumovia',
              url: CANONICAL_BASE,
              description: 'Free streaming catalog — discover movies, TV shows, anime, and cartoons. Browse thousands of titles with ratings, trailers, cast info, and episode guides.',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${CANONICAL_BASE}/browse?search={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        {children}
        <CsrfProvider />
        {/* Vercel Analytics/Speed-Insights inject scripts that only exist on
            Vercel's edge — off-platform they 404 on every page load. */}
        {process.env.VERCEL && (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        )}
      </body>
    </html>
  );
}
